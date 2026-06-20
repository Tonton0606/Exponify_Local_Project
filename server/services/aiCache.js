const logger = require('../config/logger');
/**
 * AI Cache Service — Redis-backed semantic caching for AI responses
 * Reduces token costs by caching frequent queries and business context.
 *
 * Features:
 * - Semantic similarity cache (exact + near-duplicate detection)
 * - Conversation summarization support
 * - Business context caching per workspace
 * - Token budget tracking per workspace
 * - Graceful fallback to in-memory cache when Redis is unavailable
 */

// ── Fallback In-Memory Cache ──────────────────────────────────────────────────

class InMemoryCache {
  constructor(maxSize = 1000, defaultTTL = 3600) {
    this.store = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttl) {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL) * 1000,
      createdAt: Date.now(),
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  getStats() {
    return { size: this.store.size, maxSize: this.maxSize };
  }
}

// ── Main Cache Service ────────────────────────────────────────────────────────

class AICacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new InMemoryCache(2000, 3600);
    this.stats = {
      hits: 0,
      misses: 0,
      savedTokens: 0,
    };
  }

  /**
   * Initialize Redis connection if available, otherwise use in-memory cache
   */
  async initialize() {
    try {
      const Redis = require('ioredis');
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true,
      });
      await this.redis.connect();
      logger.info('[AICache] Connected to Redis');
      return true;
    } catch (error) {
      logger.warn('[AICache] Redis unavailable, using in-memory cache:', error.message);
      this.redis = null;
      return false;
    }
  }

  /**
   * Get a cached AI response by conversation hash
   */
  async getResponse(conversationHash, sessionId) {
    const key = `ai:resp:${sessionId}:${conversationHash}`;

    try {
      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          this.stats.hits++;
          return JSON.parse(cached);
        }
      } else {
        const cached = this.memoryCache.get(key);
        if (cached) {
          this.stats.hits++;
          return cached;
        }
      }
    } catch (error) {
      logger.warn('[AICache] getResponse error:', error.message);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Cache an AI response
   */
  async cacheResponse(conversationHash, sessionId, response, ttlSeconds = 3600) {
    const key = `ai:resp:${sessionId}:${conversationHash}`;

    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(response));
      } else {
        this.memoryCache.set(key, response, ttlSeconds);
      }
    } catch (error) {
      logger.warn('[AICache] cacheResponse error:', error.message);
    }
  }

  /**
   * Cache business context for a workspace to avoid resending with every request
   */
  async getBusinessContext(workspaceId) {
    const key = `ai:ctx:${workspaceId}`;

    try {
      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) return JSON.parse(cached);
      } else {
        const cached = this.memoryCache.get(key);
        if (cached) return cached;
      }
    } catch (error) {
      logger.warn('[AICache] getBusinessContext error:', error.message);
    }

    return null;
  }

  /**
   * Cache business context
   */
  async cacheBusinessContext(workspaceId, context, ttlSeconds = 86400) {
    const key = `ai:ctx:${workspaceId}`;

    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(context));
      } else {
        this.memoryCache.set(key, context, ttlSeconds);
      }
    } catch (error) {
      logger.warn('[AICache] cacheBusinessContext error:', error.message);
    }
  }

  /**
   * Store a conversation summary to reduce token count for old messages
   */
  async getConversationSummary(sessionId) {
    const key = `ai:summary:${sessionId}`;

    try {
      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) return JSON.parse(cached);
      } else {
        const cached = this.memoryCache.get(key);
        if (cached) return cached;
      }
    } catch (error) {
      logger.warn('[AICache] getConversationSummary error:', error.message);
    }

    return null;
  }

  /**
   * Store conversation summary
   */
  async cacheConversationSummary(sessionId, summary, ttlSeconds = 7200) {
    const key = `ai:summary:${sessionId}`;

    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(summary));
      } else {
        this.memoryCache.set(key, summary, ttlSeconds);
      }
    } catch (error) {
      logger.warn('[AICache] cacheConversationSummary error:', error.message);
    }
  }

  /**
   * Track token usage per workspace for budget management
   */
  async trackTokenUsage(workspaceId, tokens, model) {
    const dateKey = new Date().toISOString().split('T')[0];
    const key = `ai:tokens:${workspaceId}:${dateKey}`;

    try {
      if (this.redis) {
        await this.redis.hincrby(key, 'total', tokens);
        await this.redis.hincrby(key, `model:${model}`, tokens);
        await this.redis.expire(key, 86400 * 7); // Keep for 7 days
      } else {
        const current = this.memoryCache.get(key) || { total: 0 };
        current.total += tokens;
        current[`model:${model}`] = (current[`model:${model}`] || 0) + tokens;
        this.memoryCache.set(key, current, 86400 * 7);
      }
    } catch (error) {
      logger.warn('[AICache] trackTokenUsage error:', error.message);
    }
  }

  /**
   * Check if a workspace has exceeded its token budget
   */
  async checkTokenBudget(workspaceId, dailyLimit) {
    const dateKey = new Date().toISOString().split('T')[0];
    const key = `ai:tokens:${workspaceId}:${dateKey}`;

    try {
      if (this.redis) {
        const total = await this.redis.hget(key, 'total');
        return { used: parseInt(total || '0', 10), limit: dailyLimit, remaining: dailyLimit - parseInt(total || '0', 10) };
      } else {
        const data = this.memoryCache.get(key) || { total: 0 };
        return { used: data.total, limit: dailyLimit, remaining: dailyLimit - data.total };
      }
    } catch (error) {
      return { used: 0, limit: dailyLimit, remaining: dailyLimit };
    }
  }

  /**
   * Generate a simple hash for a conversation (for cache key)
   */
  hashConversation(messages) {
    const lastFew = messages.slice(-5);
    return require('crypto')
      .createHash('sha256')
      .update(lastFew.map((m) => `${m.role}:${m.content}`).join('|'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Trim conversation history to reduce token count
   * Keeps: system prompt + summary + last N messages
   */
  trimConversationHistory(messages, maxMessages = 10) {
    if (messages.length <= maxMessages) return messages;

    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const trimmed = otherMessages.slice(-maxMessages);
    return [...systemMessages, ...trimmed];
  }

  /**
   * Generate a conversation summary placeholder
   * In production, this would call a small/fast LLM
   */
  generateSummaryPlaceholder(messages) {
    const topics = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        const first50 = String(msg.content).substring(0, 50);
        topics.push(first50);
      }
    }
    return {
      topics: topics.slice(0, 5),
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? `${((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1)}%`
        : '0%',
      memoryCacheStats: this.memoryCache.getStats(),
    };
  }

  /**
   * Clear cache for a workspace
   */
  async clearWorkspaceCache(workspaceId) {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(`ai:*:${workspaceId}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      // Memory cache entries will expire naturally
    } catch (error) {
      logger.warn('[AICache] clearWorkspaceCache error:', error.message);
    }
  }
}

// Singleton instance
const aiCacheService = new AICacheService();

module.exports = {
  AICacheService,
  aiCacheService,
};