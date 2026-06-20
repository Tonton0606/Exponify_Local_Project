/**
 * Secure AI Router - Smart Data Classification and Routing
 * Protects client data while maintaining AI capabilities
 */

import groqAI from './groqAI';

class SecureAIRouter {
  constructor() {
    this.sensitiveFields = [
      'email', 'phone', 'address', 'ssn', 'creditCard', 'bankAccount',
      'clientName', 'companyName', 'contactInfo', 'personalData',
      'financialData', 'confidential', 'proprietary', 'secret'
    ];
    
    this.clientDataPatterns = [
      /client/i, /customer/i, /prospect/i, /lead/i, /account/i,
      /contact/i, /deal/i, /contract/i, /agreement/i
    ];
    
    this.piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit Card
      /\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/, // Phone
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ // Email
    ];
  }

  /**
   * Classify data sensitivity level
   */
  classifyDataSensitivity(data, context = {}) {
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Check for PII patterns
    const hasPII = this.piiPatterns.some(pattern => pattern.test(dataString));
    
    // Check for sensitive field names
    const hasSensitiveFields = this.sensitiveFields.some(field => 
      dataString.includes(field.toLowerCase())
    );
    
    // Check for client data context
    const isClientData = this.clientDataPatterns.some(pattern => 
      pattern.test(context.module || '') || pattern.test(context.operation || '')
    );
    
    // Check for explicit client data indicators
    const hasClientIndicators = dataString.includes('client') || 
                               dataString.includes('customer') ||
                               dataString.includes('prospect');
    
    // Determine sensitivity level
    if (hasPII || hasSensitiveFields) {
      return {
        level: 'high',
        reason: hasPII ? 'Contains PII' : 'Contains sensitive fields',
        canUseExternalAI: false,
        requiresMasking: true
      };
    }
    
    if (isClientData || hasClientIndicators) {
      return {
        level: 'medium',
        reason: 'Client-related data',
        canUseExternalAI: false,
        requiresMasking: true
      };
    }
    
    return {
      level: 'low',
      reason: 'Internal operational data',
      canUseExternalAI: true,
      requiresMasking: false
    };
  }

  /**
   * Mask sensitive data for external processing
   */
  maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) {
      return this.maskString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }
    
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      
      if (this.sensitiveFields.some(field => keyLower.includes(field))) {
        masked[key] = '[MASKED]';
      } else if (typeof value === 'string') {
        masked[key] = this.maskString(value);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  /**
   * Mask PII in strings
   */
  maskString(str) {
    if (typeof str !== 'string') return str;
    
    let masked = str;
    
    // Mask email addresses
    masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 
      email => email.replace(/(.{2}).*@/, '$1***@'));
    
    // Mask phone numbers
    masked = masked.replace(/\b(\d{3})\d{3}(\d{4})\b/g, '$1***$2');
    
    // Mask credit cards
    masked = masked.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '****-****-****-****');
    
    // Mask SSN
    masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
    
    return masked;
  }

  /**
   * Route AI request based on data sensitivity
   */
  async routeAIRequest(data, context = {}) {
    const sensitivity = this.classifyDataSensitivity(data, context);
    
    // Log the request for audit
    this.logAIRequest(data, context, sensitivity);
    
    if (sensitivity.level === 'high') {
      // High sensitivity - use local AI only
      return await this.processWithLocalAI(data, context, sensitivity);
    } else if (sensitivity.level === 'medium') {
      // Medium sensitivity - mask data and use local AI
      const maskedData = this.maskSensitiveData(data);
      return await this.processWithLocalAI(maskedData, context, sensitivity);
    } else {
      // Low sensitivity - can use Groq
      try {
        return await this.processWithGroq(data, context, sensitivity);
      } catch (error) {
        console.warn('Groq failed, falling back to local AI:', error);
        return await this.processWithLocalAI(data, context, sensitivity);
      }
    }
  }

  /**
   * Process with Groq (for low sensitivity data only)
   */
  async processWithGroq(data, context, sensitivity) {
    const methodName = context.method || 'generateQuickInsights';
    
    if (!groqAI[methodName]) {
      throw new Error(`Method ${methodName} not found in GroqAI`);
    }
    
    const result = await groqAI[methodName](data, context.module);
    
    return {
      ...result,
      _metadata: {
        aiProvider: 'groq',
        sensitivityLevel: sensitivity.level,
        processingTime: Date.now(),
        compliance: 'external'
      }
    };
  }

  /**
   * Process with local AI (for sensitive data)
   */
  async processWithLocalAI(data, context, sensitivity) {
    // For now, return a safe fallback
    // In production, this would integrate with Ollama or local models
    
    const fallbackResponse = this.generateSafeFallback(data, context);
    
    return {
      ...fallbackResponse,
      _metadata: {
        aiProvider: 'local',
        sensitivityLevel: sensitivity.level,
        processingTime: Date.now(),
        compliance: 'internal',
        reason: sensitivity.reason
      }
    };
  }

  /**
   * Generate safe fallback responses for sensitive data
   */
  generateSafeFallback(data, context) {
    const module = context.module || 'general';
    
    const fallbacks = {
      deals: {
        insights: [
          'Deal pipeline analysis requires secure processing',
          'Client data protection mode activated',
          'Use internal analytics for detailed insights'
        ],
        recommendations: [
          'Review deal pipeline manually',
          'Contact sales team for detailed analysis',
          'Use secure reporting tools'
        ],
        score: 75,
        trend: 'stable'
      },
      contacts: {
        insights: [
          'Contact data requires secure processing',
          'PII protection mode enabled',
          'Use CRM for detailed analysis'
        ],
        recommendations: [
          'Review contact relationships manually',
          'Use secure contact management tools',
          'Follow data protection protocols'
        ],
        score: 80,
        trend: 'stable'
      },
      revenue: {
        insights: [
          'Financial data requires secure processing',
          'Use internal financial analytics',
          'Contact finance team for detailed reports'
        ],
        recommendations: [
          'Review financial reports manually',
          'Use secure accounting systems',
          'Follow financial compliance protocols'
        ],
        forecast: { nextMonth: 0, nextQuarter: 0, confidence: 0 }
      },
      general: {
        insights: [
          'Data requires secure processing',
          'AI analysis restricted for data protection',
          'Use internal tools for detailed analysis'
        ],
        recommendations: [
          'Review data manually',
          'Use secure internal systems',
          'Follow data protection guidelines'
        ]
      }
    };
    
    return fallbacks[module] || fallbacks.general;
  }

  /**
   * Log AI requests for audit and compliance
   */
  logAIRequest(data, context, sensitivity) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      module: context.module,
      operation: context.operation,
      sensitivityLevel: sensitivity.level,
      reason: sensitivity.reason,
      aiProvider: sensitivity.canUseExternalAI ? 'groq' : 'local',
      dataSize: JSON.stringify(data).length,
      userId: context.userId || 'anonymous',
      sessionId: context.sessionId || 'unknown'
    };
    
    // In production, this would be sent to a secure logging service
    console.log('AI Request Audit:', logEntry);
    
    // Store in localStorage for development (in production, use secure database)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('aiAuditLogs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 1000 entries
      if (existingLogs.length > 1000) {
        existingLogs.splice(0, existingLogs.length - 1000);
      }
      
      localStorage.setItem('aiAuditLogs', JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('Failed to store audit log:', error);
    }
  }

  /**
   * Get audit logs for compliance
   */
  getAuditLogs(limit = 100) {
    try {
      const logs = JSON.parse(localStorage.getItem('aiAuditLogs') || '[]');
      return logs.slice(-limit);
    } catch (error) {
      console.warn('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  /**
   * Clear audit logs (for testing only)
   */
  clearAuditLogs() {
    localStorage.removeItem('aiAuditLogs');
  }

  /**
   * Check if specific operation is allowed with given data
   */
  isOperationAllowed(data, operation, module) {
    const sensitivity = this.classifyDataSensitivity(data, { module, operation });
    
    const restrictedOperations = [
      'generateContent', 'summarize', 'translate', 'analyze'
    ];
    
    if (sensitivity.level === 'high' && restrictedOperations.includes(operation)) {
      return {
        allowed: false,
        reason: 'Operation not allowed for high-sensitivity data',
        alternative: 'Use internal secure tools'
      };
    }
    
    return {
      allowed: true,
      aiProvider: sensitivity.canUseExternalAI ? 'groq' : 'local',
      sensitivityLevel: sensitivity.level
    };
  }
}

export default new SecureAIRouter();
