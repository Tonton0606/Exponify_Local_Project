const logger = require('../config/logger');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// In-memory store for failed attempts (use Redis in production)
const failedAttempts = new Map();
const blockedIPs = new Map();
const suspiciousIPs = new Map();
const userLockouts = new Map();

// Device fingerprinting helper
function generateFingerprint(req) {
  const data = [
    req.ip,
    req.headers['user-agent'],
    req.headers['accept-language'],
    req.headers['accept-encoding'],
    req.headers['dnt'],
    req.headers['upgrade-insecure-requests']
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Check if IP is blocked
function isIPBlocked(ip) {
  const blockData = blockedIPs.get(ip);
  if (!blockData) return false;
  
  if (Date.now() > blockData.expiresAt) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
}

// Block IP for specified duration
function blockIP(ip, durationMs = 3600000) { // Default 1 hour
  blockedIPs.set(ip, {
    blockedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    reason: 'Too many failed attempts'
  });
}

// Record failed attempt
function recordFailedAttempt(identifier, type = 'ip') {
  const key = `${type}:${identifier}`;
  const existing = failedAttempts.get(key) || { count: 0, firstAttempt: Date.now(), attempts: [] };
  
  existing.count++;
  existing.attempts.push({
    timestamp: Date.now(),
    count: existing.count
  });
  
  // Keep only last 30 minutes of attempts
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  existing.attempts = existing.attempts.filter(a => a.timestamp > thirtyMinutesAgo);
  
  failedAttempts.set(key, existing);
  return existing.count;
}

// Check for distributed attack (same email, different IPs)
function checkDistributedAttack(email) {
  const key = `email:${email}`;
  const attempts = failedAttempts.get(key);
  if (!attempts) return false;
  
  // If more than 5 different IPs attempting same email in 10 minutes
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  const recentIPs = new Set(attempts.attempts.filter(a => a.timestamp > tenMinutesAgo).map(a => a.ip));
  
  return recentIPs.size > 5;
}

// Progressive delay calculation (exponential backoff)
function getProgressiveDelay(attemptCount) {
  if (attemptCount <= 3) return 0;
  if (attemptCount <= 5) return 2000; // 2 seconds
  if (attemptCount <= 7) return 5000; // 5 seconds
  if (attemptCount <= 10) return 10000; // 10 seconds
  return 30000; // 30 seconds max
}

// Honeypot check - detect automated tools
function checkHoneypot(req) {
  // Check for honeypot fields that should be empty
  const honeypotFields = ['website', 'phone_confirm', 'address_2'];
  for (const field of honeypotFields) {
    if (req.body[field] && req.body[field].length > 0) {
      return { isBot: true, reason: 'Honeypot triggered' };
    }
  }
  
  // Check for unrealistic typing speed (automated tools submit instantly)
  const formStartTime = req.body._form_start_time;
  if (formStartTime) {
    const timeTaken = Date.now() - parseInt(formStartTime);
    if (timeTaken < 2000) { // Less than 2 seconds - likely automated
      return { isBot: true, reason: 'Form submitted too quickly' };
    }
  }
  
  return { isBot: false };
}

// Detect suspicious patterns (Burp Suite, automated tools)
function detectSuspiciousPatterns(req) {
  const patterns = [];
  const userAgent = req.headers['user-agent'] || '';
  
  // Check for missing or generic user agents (common in automated tools)
  if (!userAgent || userAgent.length < 20) {
    patterns.push('suspicious_user_agent');
  }
  
  // Check for common tool signatures
  const toolSignatures = [
    'burp', 'hydra', 'medusa', 'nikto', 'sqlmap', 'nmap', 'metasploit',
    'nessus', 'openvas', 'acunetix', 'wapiti'
  ];
  
  const lowerUA = userAgent.toLowerCase();
  for (const sig of toolSignatures) {
    if (lowerUA.includes(sig)) {
      patterns.push(`tool_detected:${sig}`);
    }
  }
  
  // Check for requests without proper headers (curl, wget, etc.)
  if (!req.headers['accept'] || !req.headers['accept-language']) {
    patterns.push('missing_browser_headers');
  }
  
  // Check for parallel request pattern (same fingerprint, rapid requests)
  const fingerprint = generateFingerprint(req);
  const lastRequest = suspiciousIPs.get(fingerprint);
  if (lastRequest) {
    const timeDiff = Date.now() - lastRequest;
    if (timeDiff < 100) { // Less than 100ms between requests
      patterns.push('rapid_requests');
    }
  }
  suspiciousIPs.set(fingerprint, Date.now());
  
  return patterns;
}

// Advanced rate limiting with progressive delays
const advancedAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Stricter: 5 attempts per window
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Combine IP and fingerprint for better tracking
    const fingerprint = generateFingerprint(req);
    return `${req.ip}_${fingerprint}`;
  },
  handler: (req, res, next) => {
    const identifier = `${req.ip}_${generateFingerprint(req)}`;
    const attempts = failedAttempts.get(`ip:${identifier}`);
    const attemptCount = attempts ? attempts.count : 0;
    
    // Block IP after excessive failures
    if (attemptCount >= 10) {
      blockIP(req.ip, 24 * 60 * 60 * 1000); // Block for 24 hours
      return res.status(403).json({
        error: 'Account temporarily suspended due to suspicious activity.',
        retryAfter: 24 * 60 * 60,
        action: 'contact_support'
      });
    }
    
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 15 * 60,
      attemptsRemaining: 0
    });
  }
});

// Account lockout middleware
function accountLockoutMiddleware(req, res, next) {
  const { email } = req.body;
  if (!email) return next();
  
  // Check if account is locked
  const lockout = userLockouts.get(email.toLowerCase());
  if (lockout && Date.now() < lockout.expiresAt) {
    const remainingMinutes = Math.ceil((lockout.expiresAt - Date.now()) / 60000);
    return res.status(423).json({
      error: `Account temporarily locked due to ${lockout.reason}. Try again in ${remainingMinutes} minutes.`,
      locked: true,
      retryAfter: Math.ceil((lockout.expiresAt - Date.now()) / 1000)
    });
  }
  
  // Clean up expired lockout
  if (lockout && Date.now() >= lockout.expiresAt) {
    userLockouts.delete(email.toLowerCase());
  }
  
  next();
}

// Lock account after failures
function lockAccount(email, durationMinutes = 30, reason = 'too_many_attempts') {
  userLockouts.set(email.toLowerCase(), {
    lockedAt: Date.now(),
    expiresAt: Date.now() + (durationMinutes * 60 * 1000),
    reason: reason,
    attempts: (userLockouts.get(email.toLowerCase())?.attempts || 0) + 1
  });
}

// Security middleware chain
function securityMiddleware(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // 1. Check if IP is blocked
  if (isIPBlocked(clientIP)) {
    return res.status(403).json({
      error: 'Access denied due to suspicious activity.',
      action: 'contact_support'
    });
  }
  
  // 2. Honeypot detection
  const honeypot = checkHoneypot(req);
  if (honeypot.isBot) {
    blockIP(clientIP, 24 * 60 * 60 * 1000); // 24 hour block
    return res.status(403).json({
      error: 'Security check failed.',
      action: 'contact_support'
    });
  }
  
  // 3. Detect suspicious patterns
  const patterns = detectSuspiciousPatterns(req);
  if (patterns.length > 0) {
    logger.warn(`[SECURITY] Suspicious patterns detected from ${clientIP}:`, patterns);
    
    // If tool signature detected, immediate block
    if (patterns.some(p => p.includes('tool_detected'))) {
      blockIP(clientIP, 7 * 24 * 60 * 60 * 1000); // 7 day block
      return res.status(403).json({
        error: 'Security violation detected.',
        action: 'contact_support'
      });
    }
  }
  
  // Attach security helpers to request
  req.security = {
    fingerprint: generateFingerprint(req),
    recordFailed: () => recordFailedAttempt(clientIP, 'ip'),
    recordFailedForEmail: (email) => {
      recordFailedAttempt(email, 'email');
      if (checkDistributedAttack(email)) {
        logger.warn(`[SECURITY] Distributed attack detected on email: ${email}`);
      }
    },
    lockAccount: (email) => lockAccount(email),
    isIPBlocked: () => isIPBlocked(clientIP),
    getProgressiveDelay: (count) => getProgressiveDelay(count),
    patterns: patterns
  };
  
  next();
}

// Password strength validation
function validatePasswordStrength(password) {
  const minLength = 12;
  const maxLength = 128;
  
  if (!password || password.length < minLength) {
    return { valid: false, reason: `Password must be at least ${minLength} characters` };
  }
  
  if (password.length > maxLength) {
    return { valid: false, reason: `Password must not exceed ${maxLength} characters` };
  }
  
  const checks = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommon: !isCommonPassword(password)
  };
  
  const failedChecks = Object.entries(checks)
    .filter(([_, passed]) => !passed)
    .map(([name, _]) => name);
  
  if (failedChecks.length > 0) {
    const reasons = {
      uppercase: 'one uppercase letter',
      lowercase: 'one lowercase letter',
      numbers: 'one number',
      special: 'one special character',
      noCommon: 'not be a commonly used password'
    };
    return { 
      valid: false, 
      reason: `Password must contain ${failedChecks.map(f => reasons[f]).join(', ')}` 
    };
  }
  
  return { valid: true, strength: calculatePasswordStrength(password) };
}

// Check against common passwords
function isCommonPassword(password) {
  const commonPasswords = [
    'password123', '123456789', 'qwerty123', 'admin123', 'letmein123',
    'welcome123', 'monkey123', 'dragon123', 'master123', 'shadow123'
  ];
  return commonPasswords.includes(password.toLowerCase());
}

// Calculate password entropy/strength
function calculatePasswordStrength(password) {
  let entropy = 0;
  const poolSizes = {
    lowercase: 26,
    uppercase: 26,
    numbers: 10,
    special: 32
  };
  
  if (/[a-z]/.test(password)) entropy += poolSizes.lowercase;
  if (/[A-Z]/.test(password)) entropy += poolSizes.uppercase;
  if (/[0-9]/.test(password)) entropy += poolSizes.numbers;
  if (/[^a-zA-Z0-9]/.test(password)) entropy += poolSizes.special;
  
  const bits = Math.log2(Math.pow(entropy, password.length));
  
  if (bits < 40) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 80) return 'good';
  return 'strong';
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean blocked IPs
  for (const [ip, data] of blockedIPs.entries()) {
    if (now > data.expiresAt) blockedIPs.delete(ip);
  }
  
  // Clean failed attempts
  const thirtyMinutesAgo = now - (30 * 60 * 1000);
  for (const [key, data] of failedAttempts.entries()) {
    if (data.firstAttempt < thirtyMinutesAgo) failedAttempts.delete(key);
  }
  
  // Clean expired lockouts
  for (const [email, data] of userLockouts.entries()) {
    if (now > data.expiresAt) userLockouts.delete(email);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

module.exports = {
  securityMiddleware,
  advancedAuthLimiter,
  accountLockoutMiddleware,
  validatePasswordStrength,
  generateFingerprint,
  blockIP,
  isIPBlocked
};
