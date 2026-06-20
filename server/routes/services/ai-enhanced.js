const logger = require('../../config/logger');
/**
 * Enhanced AI Routes - Full AI Integration for All Hermes Modules
 * Provides server-side AI orchestration with data aggregation and analysis
 */

const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1';

// Helper: call Groq API
async function callGroq(prompt, options = {}) {
  if (!GROQ_API_KEY) {
    return { error: 'GROQ_API_KEY not configured' };
  }

  const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.3,
      response_format: options.jsonResponse ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * POST /api/ai-enhanced/analyze/:module
 * Run AI analysis on any module's data
 */
router.post('/analyze/:module', async (req, res) => {
  const { module } = req.params;
  const { data, action } = req.body;

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'Groq API not configured' });
  }

  try {
    let prompt = '';
    let model = 'llama-3.1-8b-instant';
    let maxTokens = 800;

    switch (module) {
      case 'deals':
        if (action === 'predict') {
          prompt = `Predict deal outcomes based on this data. Return JSON with probability, estimatedCloseDate, riskFactors, and recommendedActions.\n\nData: ${JSON.stringify(data, null, 2)}`;
          model = 'llama-3.1-70b-versatile';
        } else {
          prompt = `Analyze this deal pipeline. Return JSON with pipelineHealth, totalValue, winRate, avgDealSize, bottlenecks, and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        }
        break;

      case 'revenue':
        prompt = `Analyze this revenue data. Return JSON with totalRevenue, trends, anomalies, forecast (nextMonth, nextQuarter, confidence), and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        model = 'llama-3.1-70b-versatile';
        maxTokens = 1200;
        break;

      case 'contacts':
        prompt = `Analyze these contacts. Return JSON with totalContacts, activeContacts, churnRisk (array of {name, risk, reason}), engagementScore, and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        break;

      case 'inbox':
        if (action === 'classify') {
          prompt = `Classify this message. Return JSON with category (technical|billing|feature_request|bug|general), priority (critical|high|medium|low), sentiment, and suggestedResponse.\n\nData: ${JSON.stringify(data, null, 2)}`;
        } else {
          prompt = `Analyze inbox trends. Return JSON with volume, avgResponseTime, satisfactionScore, bottlenecks, and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        }
        break;

      case 'projects':
        prompt = `Analyze these projects. Return JSON with overallHealth (onTrack|atRisk|critical), completionRate, avgDelay, riskFactors, and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        break;

      case 'tasks':
        prompt = `Analyze these tasks. Return JSON with totalTasks, completionRate, avgCompletionTime, overdueCount, productivityScore, and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        break;

      case 'marketing':
        prompt = `Analyze marketing data. Return JSON with campaignPerformance, topPerformingChannels, roas, recommendations, and optimizations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        model = 'llama-3.1-70b-versatile';
        break;

      case 'inventory':
        prompt = `Analyze inventory data. Return JSON with totalItems, lowStockItems, deadStockItems, restockRecommendations, and costOptimizations.\n\nData: ${JSON.stringify(data, null, 2)}`;
        break;

      case 'knowledge':
        prompt = `Analyze knowledge base. Return JSON with totalArticles, popularCategories, contentGaps, avgHelpfulness, and improvementSuggestions.\n\nData: ${JSON.stringify(data, null, 2)}`;
        break;

      default:
        prompt = `Analyze this business data and provide insights. Return JSON with insights, trends, and recommendations.\n\nData: ${JSON.stringify(data, null, 2)}`;
    }

    prompt += '\n\nRespond ONLY with valid JSON.';

    const result = await callGroq(prompt, { model, maxTokens, jsonResponse: true });

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { rawResponse: result };
    }

    res.json({
      module,
      action: action || 'analyze',
      result: parsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`AI analysis error for ${module}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-enhanced/generate
 * Generate content (reports, emails, docs) with AI
 */
router.post('/generate', async (req, res) => {
  const { type, context, instructions } = req.body;

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'Groq API not configured' });
  }

  try {
    let prompt = '';

    switch (type) {
      case 'report':
        prompt = `Generate a professional business report based on this context. Include executive summary, key findings, data analysis, and recommendations.\n\nContext: ${JSON.stringify(context, null, 2)}\n\nInstructions: ${instructions || 'Generate a comprehensive report'}`;
        break;
      case 'email':
        prompt = `Write a professional email. Include appropriate subject line.\n\nContext: ${JSON.stringify(context, null, 2)}\n\nInstructions: ${instructions || 'Write a professional email'}`;
        break;
      case 'documentation':
        prompt = `Generate detailed documentation.\n\nContext: ${JSON.stringify(context, null, 2)}\n\nInstructions: ${instructions || 'Generate comprehensive documentation'}`;
        break;
      case 'insights':
        prompt = `Generate actionable business insights.\n\nContext: ${JSON.stringify(context, null, 2)}\n\nReturn JSON with insights (array), recommendations (array), confidence (number).`;
        break;
      default:
        prompt = `Generate content.\n\nContext: ${JSON.stringify(context, null, 2)}\n\nInstructions: ${instructions || 'Generate content'}`;
    }

    const result = await callGroq(prompt, { 
      model: 'llama-3.1-70b-versatile', 
      maxTokens: 2048,
      jsonResponse: type === 'insights',
    });

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { content: result };
    }

    res.json({
      type,
      result: parsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('AI generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-enhanced/schedule
 * Create a scheduled AI task
 */
router.post('/schedule', async (req, res) => {
  const { module, frequency, actions } = req.body;

  // This would integrate with a job scheduler in production
  // For now, return confirmation
  res.json({
    scheduled: true,
    module,
    frequency,
    actions,
    nextRun: new Date(Date.now() + (frequency === 'hourly' ? 3600000 : 86400000)).toISOString(),
  });
});

/**
 * GET /api/ai-enhanced/health
 * Check AI service health
 */
router.get('/health', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ status: 'unconfigured', message: 'GROQ_API_KEY not set' });
  }

  try {
    const start = Date.now();
    await callGroq('Respond with: healthy', { maxTokens: 10 });
    const latency = Date.now() - start;

    res.json({
      status: 'healthy',
      latency: `${latency}ms`,
      model: 'llama-3.1-8b-instant',
      availableModels: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

module.exports = router;