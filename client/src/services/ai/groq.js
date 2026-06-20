/**
 * Groq AI Service - Lightning-fast LLM API
 * Replaces: openClaude
 * Model: Llama 3.1 (via Groq API)
 * Cost: ~$0.0001/1K tokens (1M free tokens/day)
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

class GroqService {
  constructor() {
    this.baseUrl = GROQ_API_URL;
    this.apiKey = GROQ_API_KEY;
    this.defaultModel = 'llama-3.1-8b-instant'; // Fast & cheap
    this.premiumModel = 'llama-3.1-70b-versatile'; // Higher quality
  }

  /**
   * Generic API request handler
   */
  async request(endpoint, body) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file');
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Groq service error:', error);
      throw error;
    }
  }

  /**
   * Chat completion for Hermes Chatbot
   */
  async chatCompletion(messages, model = this.defaultModel, options = {}) {
    return this.request('/chat/completions', {
      model,
      messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stream: options.stream || false,
    });
  }

  /**
   * Simple chat - returns just the response text
   */
  async chat(message, options = {}) {
    const response = await this.chatCompletion(
      [{ role: 'user', content: message }],
      options.model || this.defaultModel,
      options
    );
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate CRM insights and recommendations
   */
  async generateCRMInsights(customerData, options = {}) {
    const prompt = `Analyze the following customer data and provide insights:
${JSON.stringify(customerData, null, 2)}

Provide:
1. Customer sentiment analysis
2. Recommended actions
3. Risk assessment
4. Opportunity identification

Format as JSON with these keys: sentiment, actions, risk, opportunities`;

    const response = await this.chat(prompt, { model: this.premiumModel });
    try {
      return JSON.parse(response);
    } catch {
      return { rawResponse: response };
    }
  }

  /**
   * Generate ERP documentation
   */
  async generateERPDocs(context, options = {}) {
    const prompt = `Generate comprehensive documentation for the following ERP context:
${JSON.stringify(context, null, 2)}

Include:
1. Process overview
2. Step-by-step procedures
3. Best practices
4. Common issues and solutions`;

    return this.chat(prompt, { model: this.premiumModel, maxTokens: 2048 });
  }

  /**
   * Generate analytics insights
   */
  async generateAnalyticsInsights(data, options = {}) {
    const prompt = `Analyze the following business data and provide actionable insights:
${JSON.stringify(data, null, 2)}

Provide:
1. Key trends
2. Performance metrics
3. Recommendations
4. Forecast predictions

Format as JSON with these keys: trends, metrics, recommendations, forecast`;

    const response = await this.chat(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return { rawResponse: response };
    }
  }

  /**
   * Generate market research templates
   */
  async generateMarketResearch(topic, options = {}) {
    const prompt = `Create a comprehensive market research template for: ${topic}

Include:
1. Research objectives
2. Target audience analysis
3. Competitor analysis framework
4. Data collection methods
5. Analysis templates`;

    return this.chat(prompt, { model: this.premiumModel, maxTokens: 2048 });
  }

  /**
   * Stream chat responses for real-time chatbot
   */
  async *streamChat(messages, model = this.defaultModel) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stream error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  /**
   * Check service health
   */
  async health() {
    if (!this.apiKey) return { status: 'unconfigured', message: 'API key not set' };
    
    try {
      const start = performance.now();
      await this.chat('Hello', { maxTokens: 10 });
      const latency = Math.round(performance.now() - start);
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        model: this.defaultModel,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}

export default new GroqService();
