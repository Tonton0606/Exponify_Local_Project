# Groq AI Integration Guide

## Overview

Hermes Admin Panel now uses **Groq** as the backbone AI service for all AI-powered features across the entire admin panel. This provides fast, affordable, and reliable AI capabilities without requiring GPU hardware.

## Setup Instructions

### 1. Get Groq API Key

1. Visit [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key for configuration

### 2. Configure Environment

Create a `.env` file in your project root:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file and add your Groq API key
VITE_GROQ_API_KEY=gsk_your_actual_api_key_here
VITE_AI_PROVIDER=groq
```

### 3. Install Dependencies

```bash
# Install OpenAI client (used for Groq API)
npm install openai

# or with yarn
yarn add openai
```

### 4. Test the Integration

```javascript
// Test in your browser console or component
import { aiModules } from './src/services/ai/modules.js';

// Test health check
const health = await aiModules.healthCheck();
console.log('AI Health:', health);

// Test quick insights
const insights = await aiModules.generateQuickInsights(
  { deals: 10, revenue: 50000 }, 
  'deals'
);
console.log('Insights:', insights);
```

## Architecture

### Core Components

1. **GroqAI Service** (`/src/services/ai/groqAI.js`)
   - Main AI service using Groq API
   - Model routing and optimization
   - Structured response handling

2. **AI Modules** (`/src/services/ai/modules.js`)
   - Module-specific AI functions
   - Delegates to GroqAI service
   - Maintains backward compatibility

3. **AI Assistant** (UI Component)
   - Context-aware help widget
   - Integrated across all admin modules

### Model Configuration

GroqAI uses intelligent model routing:

- **Fast Model** (`llama3-8b-8192`): Quick UI interactions, autocomplete
- **Balanced Model** (`llama3-70b-8192`): General analysis, insights
- **Analytical Model** (`mixtral-8x7b-32768`): Complex analysis, long content
- **Creative Model** (`llama3-70b-8192`): Content generation, brainstorming

## Available AI Functions

### Deals Module
- `analyzeDeals(data)` - Comprehensive deal analysis
- `generateDealInsights(deal)` - Individual deal insights
- `predictDealOutcome(deal, history)` - Deal outcome prediction

### Contacts Module
- `analyzeContacts(data)` - Contact relationship analysis
- `scoreLead(leadData)` - Lead quality scoring

### Team Module
- `analyzeTeamPerformance(data)` - Team performance insights

### Revenue Module
- `analyzeRevenue(data)` - Revenue analysis and forecasting

### Projects Module
- `analyzeProjects(data)` - Project management insights

### Tasks Module
- `analyzeTasks(data)` - Task productivity analysis

### Knowledge Base Module
- `generateKnowledgeContent(data)` - AI content generation

### Reports Module
- `analyzeReportingData(data)` - Report data analysis

### Security Module
- `analyzeSecurityMetrics(data)` - Security analysis
- `analyzeAuditLogs(data)` - Audit log analysis

### Settings Module
- `analyzeSettings(data)` - Settings optimization

### Universal Functions
- `generateQuickInsights(data, context)` - Quick insights for any data
- `generateSummary(content, maxLength)` - Content summarization
- `generateRecommendations(situation, options)` - Action recommendations
- `healthCheck()` - Service health check

## Usage Examples

### Basic AI Analysis

```javascript
import { aiModules } from './src/services/ai/modules.js';

// Analyze deals
const dealsAnalysis = await aiModules.analyzeDeals({
  deals: dealsData,
  pipelineStages: stages,
  metrics: metrics
});

console.log('AI Insights:', dealsAnalysis.insights);
console.log('Recommendations:', dealsAnalysis.recommendations);
```

### AI-Powered Component

```javascript
// In your React component
const [aiInsights, setAiInsights] = useState(null);
const [isLoading, setIsLoading] = useState(false);

const analyzeData = async () => {
  setIsLoading(true);
  try {
    const insights = await aiModules.analyzeDeals({
      deals: deals,
      metrics: metrics
    });
    setAiInsights(insights);
  } catch (error) {
    console.error('AI Analysis failed:', error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  analyzeData();
}, [deals]);
```

### AI Assistant Integration

```jsx
import { AIAssistant } from '../../components/admin/ui';

// In your component
<AIAssistant 
  context="deals"
  data={{ deals, metrics, aiInsights }}
/>
```

## Cost Optimization

### Model Selection Strategy

- Use **Fast Model** for simple interactions (cost: $0.05/M tokens)
- Use **Balanced Model** for standard analysis (cost: $0.59/M tokens)
- Use **Analytical Model** for complex tasks (cost: $0.24/M tokens)

### Estimated Monthly Costs

- **Light Usage**: $5-10/month
- **Moderate Usage**: $20-50/month
- **Heavy Usage**: $100-200/month

### Cost Monitoring

```javascript
// Monitor token usage (built into GroqAI service)
const response = await aiModules.analyzeDeals(data);
console.log('Tokens used:', response.usage?.total_tokens);
```

## Performance Optimization

### Response Times

- **Fast Model**: 200-300ms
- **Balanced Model**: 400-600ms
- **Analytical Model**: 600-1000ms

### Caching Strategy

```javascript
// Implement caching for repeated requests
const cache = new Map();

const getCachedInsights = async (cacheKey, analysisFunction, data) => {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await analysisFunction(data);
  cache.set(cacheKey, result);
  
  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
};
```

### Error Handling

```javascript
const safeAIAnalysis = async (data, fallbackResponse) => {
  try {
    return await aiModules.analyzeDeals(data);
  } catch (error) {
    console.warn('AI analysis failed, using fallback:', error);
    return fallbackResponse;
  }
};
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify API key is correct
   - Check if key has sufficient credits
   - Ensure environment variables are loaded

2. **Slow Responses**
   - Try using the 'fast' model for quick interactions
   - Implement caching for repeated requests
   - Check network connectivity

3. **JSON Parse Errors**
   - GroqAI handles this automatically with fallback
   - Check if the model is returning valid JSON
   - Try reducing prompt complexity

### Debug Mode

Enable debug mode in `.env`:

```bash
VITE_ENABLE_AI_DEBUG=true
```

This will log detailed AI requests and responses to the console.

### Health Check

```javascript
// Check if AI service is working
const health = await aiModules.healthCheck();
if (health.status !== 'healthy') {
  console.error('AI service unhealthy:', health.error);
}
```

## Best Practices

1. **Start with Fast Models**: Use 'fast' model for prototyping, upgrade as needed
2. **Implement Fallbacks**: Always have fallback responses for AI failures
3. **Cache Results**: Cache AI responses to improve performance and reduce costs
4. **Monitor Usage**: Track token usage and costs regularly
5. **Use Structured Prompts**: Follow the JSON response format for consistent results
6. **Handle Errors Gracefully**: Implement proper error handling and user feedback

## Migration from Other AI Services

If you're migrating from OpenAI or other services:

1. Update environment variables to use Groq API key
2. Replace AI service imports with `aiModules`
3. Test existing AI functions with new Groq backend
4. Adjust model selection if needed (Groq uses different model names)

## Support

- **Groq Documentation**: [https://console.groq.com/docs](https://console.groq.com/docs)
- **Model Documentation**: [https://groq.com/models](https://groq.com/models)
- **API Status**: [https://status.groq.com](https://status.groq.com)

## Next Steps

1. Configure your Groq API key
2. Test the AI integration with your data
3. Customize AI prompts for your specific use cases
4. Implement monitoring and cost tracking
5. Optimize model selection based on your usage patterns
