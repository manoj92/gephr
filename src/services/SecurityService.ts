import { encryptionService } from './EncryptionService';
import { validationService } from './ValidationService';
import { auditService } from './AuditService';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface CSRFToken {
  token: string;
  expiresAt: number;
  userId: string;
  sessionId: string;
}

export interface SecurityPolicy {
  rateLimiting: { [action: string]: RateLimitConfig };
  csrfProtection: boolean;
  sessionTimeout: number;
  maxConcurrentSessions: number;
  requireHTTPS: boolean;
  allowedOrigins: string[];
}

export class SecurityService {
  private rateLimitStore = new Map<string, { count: number; resetTime: number; violations: number }>();
  private csrfTokens = new Map<string, CSRFToken>();
  private sessionStore = new Map<string, { userId: string; createdAt: number; lastActivity: number; ipAddress?: string }>();
  private blockedIPs = new Map<string, { blockedUntil: number; reason: string }>();
  private failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

  private readonly DEFAULT_POLICIES: SecurityPolicy = {
    rateLimiting: {
      'user_login': { windowMs: 900000, maxRequests: 5 }, // 5 attempts per 15 minutes
      'robot_command': { windowMs: 60000, maxRequests: 100 }, // 100 commands per minute
      'data_export': { windowMs: 3600000, maxRequests: 3 }, // 3 exports per hour
      'password_change': { windowMs: 3600000, maxRequests: 2 }, // 2 changes per hour
      'file_upload': { windowMs: 300000, maxRequests: 10 }, // 10 uploads per 5 minutes
      'api_request': { windowMs: 60000, maxRequests: 1000 }, // 1000 requests per minute
    },
    csrfProtection: true,
    sessionTimeout: 3600000, // 1 hour
    maxConcurrentSessions: 3,
    requireHTTPS: true,
    allowedOrigins: [
      'http://localhost:19006',
      'https://humanoidtraining.com',
      'https://api.humanoidtraining.com'
    ]
  };

  private securityPolicy: SecurityPolicy;

  constructor(customPolicy?: Partial<SecurityPolicy>) {
    this.securityPolicy = { ...this.DEFAULT_POLICIES, ...customPolicy };
    this.startCleanupTasks();
  }

  /**
   * Check rate limit for a specific action
   */
  public checkRateLimit(
    identifier: string,
    action: string,
    ipAddress?: string
  ): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
    violated: boolean;
  } {
    // Check if IP is blocked
    if (ipAddress && this.isIPBlocked(ipAddress)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: this.blockedIPs.get(ipAddress)?.blockedUntil || Date.now(),
        violated: true
      };
    }

    const config = this.securityPolicy.rateLimiting[action];
    if (!config) {
      // No rate limit configured for this action
      return {
        allowed: true,
        remainingRequests: Infinity,
        resetTime: Date.now() + 60000,
        violated: false
      };
    }

    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    let record = this.rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
        violations: record?.violations || 0
      };
    }

    const allowed = record.count < config.maxRequests;
    if (allowed) {
      record.count++;
      this.rateLimitStore.set(key, record);
    } else {
      // Rate limit exceeded
      record.violations++;
      this.rateLimitStore.set(key, record);

      // Log security event
      auditService.logEvent({
        action: 'rate_limit_exceeded',
        userId: identifier,
        metadata: {
          action,
          currentCount: record.count,
          maxRequests: config.maxRequests,
          violations: record.violations,
          ipAddress
        },
        severity: record.violations > 3 ? 'high' : 'medium',
        ipAddress
      });

      // Block IP if too many violations
      if (ipAddress && record.violations > 5) {
        this.blockIP(ipAddress, 'excessive_rate_limit_violations', 3600000); // 1 hour
      }
    }

    return {
      allowed,
      remainingRequests: Math.max(0, config.maxRequests - record.count),
      resetTime: record.resetTime,
      violated: !allowed
    };
  }

  /**
   * Generate CSRF token
   */
  public async generateCSRFToken(userId: string, sessionId: string): Promise<string> {
    if (!this.securityPolicy.csrfProtection) {
      return '';
    }

    const tokenData = {
      userId,
      sessionId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substr(2, 16)
    };

    const token = encryptionService.generateHash(JSON.stringify(tokenData));
    const expiresAt = Date.now() + 3600000; // 1 hour

    const csrfToken: CSRFToken = {
      token,
      expiresAt,
      userId,
      sessionId
    };

    this.csrfTokens.set(token, csrfToken);

    await auditService.logEvent({
      action: 'csrf_token_generated',
      userId,
      metadata: { sessionId, tokenHash: token.substring(0, 8) }
    });

    return token;
  }

  /**
   * Validate CSRF token
   */
  public async validateCSRFToken(
    token: string,
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    if (!this.securityPolicy.csrfProtection) {
      return true;
    }

    if (!token) {
      await auditService.logEvent({
        action: 'csrf_token_missing',
        userId,
        metadata: { sessionId },
        severity: 'medium'
      });
      return false;
    }

    const csrfToken = this.csrfTokens.get(token);
    if (!csrfToken) {
      await auditService.logEvent({
        action: 'csrf_token_invalid',
        userId,
        metadata: { sessionId, providedToken: token.substring(0, 8) },
        severity: 'medium'
      });
      return false;
    }

    // Check expiration
    if (Date.now() > csrfToken.expiresAt) {
      this.csrfTokens.delete(token);
      await auditService.logEvent({
        action: 'csrf_token_expired',
        userId,
        metadata: { sessionId },
        severity: 'low'
      });
      return false;
    }

    // Check ownership
    if (csrfToken.userId !== userId || csrfToken.sessionId !== sessionId) {
      await auditService.logEvent({
        action: 'csrf_token_mismatch',
        userId,
        metadata: { 
          sessionId,
          expectedUserId: csrfToken.userId,
          expectedSessionId: csrfToken.sessionId 
        },
        severity: 'high'
      });
      return false;
    }

    await auditService.logEvent({
      action: 'csrf_token_validated',
      userId,
      metadata: { sessionId }
    });

    return true;
  }

  /**
   * Create secure session
   */
  public async createSession(userId: string, ipAddress?: string): Promise<string> {
    // Check concurrent session limit
    const userSessions = Array.from(this.sessionStore.entries())
      .filter(([_, session]) => session.userId === userId);

    if (userSessions.length >= this.securityPolicy.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = userSessions.sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      this.sessionStore.delete(oldestSession[0]);
      
      await auditService.logEvent({
        action: 'session_limit_exceeded',
        userId,
        metadata: { 
          maxSessions: this.securityPolicy.maxConcurrentSessions,
          removedSession: oldestSession[0]
        },
        severity: 'medium',
        ipAddress
      });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    const session = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress
    };

    this.sessionStore.set(sessionId, session);

    await auditService.logEvent({
      action: 'session_created',
      userId,
      metadata: { sessionId },
      ipAddress
    });

    return sessionId;
  }

  /**
   * Validate session
   */
  public async validateSession(sessionId: string, userId: string): Promise<boolean> {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      await auditService.logEvent({
        action: 'session_not_found',
        userId,
        metadata: { sessionId },
        severity: 'medium'
      });
      return false;
    }

    if (session.userId !== userId) {
      await auditService.logEvent({
        action: 'session_user_mismatch',
        userId,
        metadata: { sessionId, expectedUserId: session.userId },
        severity: 'high'
      });
      return false;
    }

    // Check session timeout
    const age = Date.now() - session.lastActivity;
    if (age > this.securityPolicy.sessionTimeout) {
      this.sessionStore.delete(sessionId);
      await auditService.logEvent({
        action: 'session_expired',
        userId,
        metadata: { sessionId, age },
        severity: 'low'
      });
      return false;
    }

    // Update last activity
    session.lastActivity = Date.now();
    this.sessionStore.set(sessionId, session);

    return true;
  }

  /**
   * Destroy session
   */
  public async destroySession(sessionId: string): Promise<void> {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      this.sessionStore.delete(sessionId);
      
      // Remove associated CSRF tokens
      for (const [token, csrfToken] of this.csrfTokens.entries()) {
        if (csrfToken.sessionId === sessionId) {
          this.csrfTokens.delete(token);
        }
      }

      await auditService.logEvent({
        action: 'session_destroyed',
        userId: session.userId,
        metadata: { sessionId }
      });
    }
  }

  /**
   * Block IP address
   */
  public blockIP(ipAddress: string, reason: string, duration: number = 3600000): void {
    const blockedUntil = Date.now() + duration;
    this.blockedIPs.set(ipAddress, { blockedUntil, reason });

    auditService.logEvent({
      action: 'ip_blocked',
      userId: 'system',
      metadata: { ipAddress, reason, duration, blockedUntil },
      severity: 'high',
      ipAddress
    });
  }

  /**
   * Check if IP is blocked
   */
  public isIPBlocked(ipAddress: string): boolean {
    const blocked = this.blockedIPs.get(ipAddress);
    if (!blocked) return false;

    if (Date.now() > blocked.blockedUntil) {
      this.blockedIPs.delete(ipAddress);
      return false;
    }

    return true;
  }

  /**
   * Unblock IP address
   */
  public unblockIP(ipAddress: string): void {
    const blocked = this.blockedIPs.get(ipAddress);
    if (blocked) {
      this.blockedIPs.delete(ipAddress);
      
      auditService.logEvent({
        action: 'ip_unblocked',
        userId: 'system',
        metadata: { ipAddress, originalReason: blocked.reason },
        ipAddress
      });
    }
  }

  /**
   * Record failed authentication attempt
   */
  public async recordFailedAttempt(identifier: string, ipAddress?: string): Promise<void> {
    const key = `${identifier}:${ipAddress || 'unknown'}`;
    const now = Date.now();
    
    let attempts = this.failedAttempts.get(key);
    if (!attempts || (now - attempts.firstAttempt) > 900000) { // 15 minutes window
      attempts = { count: 0, firstAttempt: now };
    }

    attempts.count++;
    this.failedAttempts.set(key, attempts);

    await auditService.logEvent({
      action: 'authentication_failure_recorded',
      userId: identifier,
      metadata: {
        attemptCount: attempts.count,
        windowStart: attempts.firstAttempt,
        ipAddress
      },
      severity: attempts.count > 3 ? 'high' : 'medium',
      ipAddress
    });

    // Block IP after multiple failures
    if (ipAddress && attempts.count >= 10) {
      this.blockIP(ipAddress, 'multiple_authentication_failures', 1800000); // 30 minutes
    }
  }

  /**
   * Clear failed attempts after successful login
   */
  public clearFailedAttempts(identifier: string, ipAddress?: string): void {
    const key = `${identifier}:${ipAddress || 'unknown'}`;
    this.failedAttempts.delete(key);
  }

  /**
   * Validate request origin
   */
  public validateOrigin(origin: string): boolean {
    if (!origin) return false;
    
    return this.securityPolicy.allowedOrigins.some(allowedOrigin => {
      // Support wildcard matching
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });
  }

  /**
   * Validate HTTPS requirement
   */
  public validateHTTPS(protocol: string): boolean {
    if (!this.securityPolicy.requireHTTPS) return true;
    return protocol === 'https:';
  }

  /**
   * Detect suspicious patterns
   */
  public async detectSuspiciousActivity(
    userId: string,
    action: string,
    metadata: any,
    ipAddress?: string
  ): Promise<{
    suspicious: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for rapid successive actions
    const recentActions = await auditService.queryEvents({
      userId,
      action,
      startDate: new Date(Date.now() - 300000), // Last 5 minutes
      limit: 10
    });

    if (recentActions.length > 5) {
      reasons.push('rapid_successive_actions');
      riskScore += 0.3;
    }

    // Check for unusual time patterns
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) { // 2 AM - 5 AM
      reasons.push('unusual_time_activity');
      riskScore += 0.2;
    }

    // Check for multiple IP addresses
    if (ipAddress) {
      const recentSessions = Array.from(this.sessionStore.values())
        .filter(session => session.userId === userId && session.ipAddress && session.ipAddress !== ipAddress);
      
      if (recentSessions.length > 0) {
        reasons.push('multiple_ip_addresses');
        riskScore += 0.4;
      }
    }

    // Check for high-risk actions
    const highRiskActions = ['password_change', 'data_export', 'robot_emergency_stop', 'user_deletion'];
    if (highRiskActions.includes(action)) {
      riskScore += 0.3;
    }

    // Check metadata for suspicious patterns
    if (metadata) {
      const metadataString = JSON.stringify(metadata).toLowerCase();
      const suspiciousPatterns = ['script', 'eval', 'exec', 'rm ', 'delete', 'drop'];
      
      if (suspiciousPatterns.some(pattern => metadataString.includes(pattern))) {
        reasons.push('suspicious_metadata_content');
        riskScore += 0.5;
      }
    }

    const suspicious = riskScore > 0.6;

    if (suspicious) {
      await auditService.logEvent({
        action: 'suspicious_activity_detected',
        userId,
        metadata: {
          originalAction: action,
          reasons,
          riskScore,
          ipAddress
        },
        severity: riskScore > 0.8 ? 'critical' : 'high',
        ipAddress
      });
    }

    return { suspicious, reasons, riskScore };
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    rateLimitViolations: number;
    blockedIPs: number;
    activeSessions: number;
    failedAttempts: number;
    csrfTokens: number;
  } {
    let rateLimitViolations = 0;
    for (const record of this.rateLimitStore.values()) {
      rateLimitViolations += record.violations;
    }

    return {
      rateLimitViolations,
      blockedIPs: this.blockedIPs.size,
      activeSessions: this.sessionStore.size,
      failedAttempts: this.failedAttempts.size,
      csrfTokens: this.csrfTokens.size
    };
  }

  /**
   * Clean up expired data
   */
  private startCleanupTasks(): void {
    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanupExpiredData();
    }, 300000);
  }

  private cleanupExpiredData(): void {
    const now = Date.now();

    // Clean up rate limit records
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }

    // Clean up expired CSRF tokens
    for (const [token, csrfToken] of this.csrfTokens.entries()) {
      if (now > csrfToken.expiresAt) {
        this.csrfTokens.delete(token);
      }
    }

    // Clean up expired sessions
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if ((now - session.lastActivity) > this.securityPolicy.sessionTimeout) {
        this.sessionStore.delete(sessionId);
      }
    }

    // Clean up expired IP blocks
    for (const [ip, block] of this.blockedIPs.entries()) {
      if (now > block.blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }

    // Clean up old failed attempts
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if ((now - attempts.firstAttempt) > 900000) { // 15 minutes
        this.failedAttempts.delete(key);
      }
    }
  }

  /**
   * Generate security headers
   */
  public generateSecurityHeaders(): { [key: string]: string } {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=self, microphone=self, geolocation=self'
    };
  }

  /**
   * Update security policy
   */
  public updateSecurityPolicy(updates: Partial<SecurityPolicy>): void {
    this.securityPolicy = { ...this.securityPolicy, ...updates };
    
    auditService.logEvent({
      action: 'security_policy_updated',
      userId: 'system',
      metadata: { updates },
      severity: 'medium'
    });
  }
}

export const securityService = new SecurityService();