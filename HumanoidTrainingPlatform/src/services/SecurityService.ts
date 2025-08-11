import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface SecurityConfig {
  enableEncryption: boolean;
  encryptionAlgorithm: 'AES-256' | 'AES-128';
  enableBiometrics: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireStrongPasswords: boolean;
  enableDataMasking: boolean;
  auditLogging: boolean;
  networkSecurityChecks: boolean;
}

export interface SecurityAuditLog {
  timestamp: number;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
}

export interface SecurityThreat {
  id: string;
  type: 'network' | 'data' | 'authentication' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  detected: Date;
  resolved?: Date;
}

export class SecurityService {
  private config: SecurityConfig = {
    enableEncryption: true,
    encryptionAlgorithm: 'AES-256',
    enableBiometrics: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    requireStrongPasswords: true,
    enableDataMasking: true,
    auditLogging: true,
    networkSecurityChecks: true,
  };

  private auditLogs: SecurityAuditLog[] = [];
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private activeSessions: Map<string, { userId: string; lastActivity: number }> = new Map();
  private detectedThreats: SecurityThreat[] = [];
  private encryptionKey: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
      await this.loadEncryptionKey();
      await this.setupSecurityMonitoring();
      
      this.log('security_service_initialized', 'low', 'Security service initialized successfully');
      console.log('Security service initialized');
    } catch (error) {
      this.log('security_initialization_failed', 'critical', `Failed to initialize security service: ${error}`);
      console.error('Security service initialization failed:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('security_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load security configuration:', error);
    }
  }

  private async loadEncryptionKey(): Promise<void> {
    try {
      let key = await SecureStore.getItemAsync('encryption_master_key');
      
      if (!key) {
        // Generate new encryption key
        key = await this.generateEncryptionKey();
        await SecureStore.setItemAsync('encryption_master_key', key);
        this.log('encryption_key_generated', 'medium', 'New encryption key generated');
      }
      
      this.encryptionKey = key;
    } catch (error) {
      console.error('Failed to load/generate encryption key:', error);
      throw new Error('Encryption setup failed');
    }
  }

  private async generateEncryptionKey(): Promise<string> {
    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}_${Math.random()}_${await Crypto.getRandomBytesAsync(32)}`
    );
    return key;
  }

  private async setupSecurityMonitoring(): Promise<void> {
    if (!this.config.networkSecurityChecks) return;

    // Monitor network changes for potential security issues
    NetInfo.addEventListener(state => {
      if (!state.isConnected) return;
      
      if (state.type === 'cellular') {
        this.log('network_change_cellular', 'medium', 'Switched to cellular network');
      } else if (state.type === 'wifi') {
        this.checkWifiSecurity(state.details?.ssid);
      }
    });

    // Start periodic security scans
    setInterval(() => {
      this.performSecurityScan();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private checkWifiSecurity(ssid?: string): void {
    if (!ssid) return;
    
    // Check for potentially unsafe WiFi networks
    const unsafePatterns = ['free', 'public', 'guest', 'open'];
    const isUnsafeNetwork = unsafePatterns.some(pattern => 
      ssid.toLowerCase().includes(pattern)
    );
    
    if (isUnsafeNetwork) {
      const threat: SecurityThreat = {
        id: `wifi_${Date.now()}`,
        type: 'network',
        severity: 'medium',
        description: `Connected to potentially unsafe WiFi network: ${ssid}`,
        recommendation: 'Avoid transmitting sensitive data over public networks',
        detected: new Date(),
      };
      
      this.detectedThreats.push(threat);
      this.log('unsafe_wifi_detected', 'medium', `Unsafe WiFi detected: ${ssid}`);
    }
  }

  /**
   * Data encryption and decryption
   */
  public async encryptData(data: string, customKey?: string): Promise<EncryptionResult> {
    if (!this.config.enableEncryption) {
      return {
        encryptedData: data,
        iv: '',
        salt: '',
      };
    }

    try {
      const key = customKey || this.encryptionKey;
      if (!key) throw new Error('Encryption key not available');

      // Generate random IV and salt
      const iv = await Crypto.getRandomBytesAsync(16);
      const salt = await Crypto.getRandomBytesAsync(32);
      
      // For demo purposes, we'll use a simplified encryption
      // In production, use proper AES encryption
      const encryptedData = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key + data + iv.toString() + salt.toString()
      );

      return {
        encryptedData,
        iv: Array.from(iv).join(','),
        salt: Array.from(salt).join(','),
      };
    } catch (error) {
      this.log('encryption_failed', 'high', `Data encryption failed: ${error}`);
      throw new Error('Encryption failed');
    }
  }

  public async decryptData(encryptionResult: EncryptionResult, customKey?: string): Promise<string> {
    if (!this.config.enableEncryption) {
      return encryptionResult.encryptedData;
    }

    try {
      const key = customKey || this.encryptionKey;
      if (!key) throw new Error('Decryption key not available');

      // For demo purposes, this is a simplified implementation
      // In production, implement proper AES decryption
      // For now, we'll return a placeholder
      return 'decrypted_data_placeholder';
    } catch (error) {
      this.log('decryption_failed', 'high', `Data decryption failed: ${error}`);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Secure data storage
   */
  public async storeSecureData(key: string, data: any): Promise<boolean> {
    try {
      const serializedData = JSON.stringify(data);
      
      if (this.config.enableEncryption) {
        const encryptionResult = await this.encryptData(serializedData);
        await SecureStore.setItemAsync(key, JSON.stringify(encryptionResult));
      } else {
        await SecureStore.setItemAsync(key, serializedData);
      }
      
      this.log('secure_data_stored', 'low', `Secure data stored for key: ${this.maskSensitiveData(key)}`);
      return true;
    } catch (error) {
      this.log('secure_storage_failed', 'medium', `Failed to store secure data: ${error}`);
      return false;
    }
  }

  public async getSecureData<T>(key: string): Promise<T | null> {
    try {
      const storedData = await SecureStore.getItemAsync(key);
      if (!storedData) return null;
      
      if (this.config.enableEncryption) {
        const encryptionResult: EncryptionResult = JSON.parse(storedData);
        const decryptedData = await this.decryptData(encryptionResult);
        return JSON.parse(decryptedData) as T;
      } else {
        return JSON.parse(storedData) as T;
      }
    } catch (error) {
      this.log('secure_retrieval_failed', 'medium', `Failed to retrieve secure data: ${error}`);
      return null;
    }
  }

  /**
   * Authentication security
   */
  public validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    if (!this.config.requireStrongPasswords) {
      return { isValid: true, score: 100, feedback: [] };
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push('Password should be at least 8 characters long');

    // Uppercase letter check
    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('Include at least one uppercase letter');

    // Lowercase letter check
    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('Include at least one lowercase letter');

    // Number check
    if (/\d/.test(password)) score += 15;
    else feedback.push('Include at least one number');

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
    else feedback.push('Include at least one special character');

    const isValid = score >= 85;

    if (!isValid) {
      this.log('weak_password_attempt', 'medium', 'Weak password validation failed');
    }

    return { isValid, score, feedback };
  }

  public async recordLoginAttempt(identifier: string, success: boolean): Promise<boolean> {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

    if (success) {
      // Reset attempts on successful login
      this.loginAttempts.delete(identifier);
      this.log('login_success', 'low', `Successful login for ${this.maskSensitiveData(identifier)}`);
      return true;
    } else {
      // Increment failed attempts
      attempts.count++;
      attempts.lastAttempt = now;
      this.loginAttempts.set(identifier, attempts);

      this.log('login_failed', 'medium', `Failed login attempt for ${this.maskSensitiveData(identifier)} (${attempts.count}/${this.config.maxLoginAttempts})`);

      if (attempts.count >= this.config.maxLoginAttempts) {
        this.log('account_locked', 'high', `Account locked for ${this.maskSensitiveData(identifier)} due to too many failed attempts`);
        
        const threat: SecurityThreat = {
          id: `brute_force_${Date.now()}`,
          type: 'authentication',
          severity: 'high',
          description: `Multiple failed login attempts for ${this.maskSensitiveData(identifier)}`,
          recommendation: 'Account temporarily locked. Consider investigating potential brute force attack.',
          detected: new Date(),
        };
        
        this.detectedThreats.push(threat);
        return false;
      }
    }

    return true;
  }

  public isAccountLocked(identifier: string): boolean {
    const attempts = this.loginAttempts.get(identifier);
    return attempts ? attempts.count >= this.config.maxLoginAttempts : false;
  }

  /**
   * Session management
   */
  public createSecureSession(userId: string): string {
    const sessionId = Crypto.randomUUID();
    
    this.activeSessions.set(sessionId, {
      userId,
      lastActivity: Date.now(),
    });

    this.log('session_created', 'low', `Secure session created for user ${this.maskSensitiveData(userId)}`);
    return sessionId;
  }

  public validateSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    const now = Date.now();
    if (now - session.lastActivity > this.config.sessionTimeout) {
      this.activeSessions.delete(sessionId);
      this.log('session_expired', 'medium', 'Session expired due to inactivity');
      return false;
    }

    // Update last activity
    session.lastActivity = now;
    return true;
  }

  public destroySession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.activeSessions.delete(sessionId);
      this.log('session_destroyed', 'low', `Session destroyed for user ${this.maskSensitiveData(session.userId)}`);
    }
  }

  /**
   * Data masking for privacy
   */
  public maskSensitiveData(data: string): string {
    if (!this.config.enableDataMasking) return data;

    // Email masking
    if (data.includes('@')) {
      const [localPart, domain] = data.split('@');
      const maskedLocal = localPart.slice(0, 2) + '*'.repeat(Math.max(0, localPart.length - 2));
      return `${maskedLocal}@${domain}`;
    }

    // General data masking
    if (data.length <= 4) return '*'.repeat(data.length);
    return data.slice(0, 2) + '*'.repeat(data.length - 4) + data.slice(-2);
  }

  /**
   * Input sanitization
   */
  public sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"]/g, '') // Remove quotes
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  public validateInput(input: string, type: 'email' | 'username' | 'general'): boolean {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      username: /^[a-zA-Z0-9_-]{3,20}$/,
      general: /^[a-zA-Z0-9\s._-]{1,100}$/,
    };

    const pattern = patterns[type];
    return pattern.test(input);
  }

  /**
   * Security monitoring and threat detection
   */
  private async performSecurityScan(): Promise<void> {
    try {
      // Check for suspicious session activity
      this.detectSuspiciousSessions();
      
      // Check for unusual data access patterns
      this.detectUnusualDataAccess();
      
      // Clean up expired sessions
      this.cleanupExpiredSessions();
      
      // Rotate logs if needed
      await this.rotateAuditLogs();
      
      this.log('security_scan_completed', 'low', 'Periodic security scan completed');
    } catch (error) {
      this.log('security_scan_failed', 'medium', `Security scan failed: ${error}`);
    }
  }

  private detectSuspiciousSessions(): void {
    const now = Date.now();
    const suspiciousThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    this.activeSessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > suspiciousThreshold) {
        const threat: SecurityThreat = {
          id: `suspicious_session_${Date.now()}`,
          type: 'authentication',
          severity: 'medium',
          description: `Long-running session detected for user ${this.maskSensitiveData(session.userId)}`,
          recommendation: 'Monitor for potential session hijacking',
          detected: new Date(),
        };
        
        this.detectedThreats.push(threat);
      }
    });
  }

  private detectUnusualDataAccess(): void {
    // Mock implementation - in real app, analyze actual access patterns
    if (Math.random() < 0.1) { // 10% chance for demo
      const threat: SecurityThreat = {
        id: `unusual_access_${Date.now()}`,
        type: 'data',
        severity: 'medium',
        description: 'Unusual data access pattern detected',
        recommendation: 'Review recent data access logs for anomalies',
        detected: new Date(),
      };
      
      this.detectedThreats.push(threat);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    this.activeSessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.config.sessionTimeout) {
        expired.push(sessionId);
      }
    });
    
    expired.forEach(sessionId => {
      this.activeSessions.delete(sessionId);
    });
    
    if (expired.length > 0) {
      this.log('expired_sessions_cleaned', 'low', `Cleaned up ${expired.length} expired sessions`);
    }
  }

  /**
   * Audit logging
   */
  private log(event: string, severity: SecurityAuditLog['severity'], details: string, userId?: string): void {
    if (!this.config.auditLogging) return;

    const logEntry: SecurityAuditLog = {
      timestamp: Date.now(),
      event,
      severity,
      details,
      userId,
    };

    this.auditLogs.push(logEntry);
    
    // Keep only recent logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-500);
    }

    // Log to console for development
    if (severity === 'high' || severity === 'critical') {
      console.warn(`[SECURITY ${severity.toUpperCase()}] ${event}: ${details}`);
    }
  }

  private async rotateAuditLogs(): Promise<void> {
    if (this.auditLogs.length < 500) return;

    try {
      // Save logs to persistent storage
      const existingLogs = await AsyncStorage.getItem('security_audit_logs');
      const allLogs = existingLogs ? JSON.parse(existingLogs) : [];
      
      allLogs.push(...this.auditLogs);
      
      // Keep only last 10000 logs
      const recentLogs = allLogs.slice(-10000);
      
      await AsyncStorage.setItem('security_audit_logs', JSON.stringify(recentLogs));
      
      // Clear in-memory logs
      this.auditLogs = [];
      
      this.log('audit_logs_rotated', 'low', `Rotated ${allLogs.length} audit logs to storage`);
    } catch (error) {
      console.error('Failed to rotate audit logs:', error);
    }
  }

  /**
   * Public API methods
   */
  public updateConfiguration(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfiguration();
    this.log('config_updated', 'medium', 'Security configuration updated');
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('security_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save security configuration:', error);
    }
  }

  public getConfiguration(): SecurityConfig {
    return { ...this.config };
  }

  public getAuditLogs(limit: number = 100): SecurityAuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  public getDetectedThreats(): SecurityThreat[] {
    return [...this.detectedThreats];
  }

  public resolvesThreat(threatId: string): void {
    const threat = this.detectedThreats.find(t => t.id === threatId);
    if (threat) {
      threat.resolved = new Date();
      this.log('threat_resolved', 'medium', `Security threat resolved: ${threatId}`);
    }
  }

  public getSecurityStatus(): {
    overallStatus: 'secure' | 'warning' | 'critical';
    activeThreats: number;
    activeSessions: number;
    recentFailedLogins: number;
  } {
    const unresolvedThreats = this.detectedThreats.filter(t => !t.resolved);
    const criticalThreats = unresolvedThreats.filter(t => t.severity === 'critical');
    const recentFailedLogins = Array.from(this.loginAttempts.values())
      .reduce((sum, attempts) => sum + attempts.count, 0);

    let overallStatus: 'secure' | 'warning' | 'critical' = 'secure';
    
    if (criticalThreats.length > 0) {
      overallStatus = 'critical';
    } else if (unresolvedThreats.length > 0 || recentFailedLogins > 10) {
      overallStatus = 'warning';
    }

    return {
      overallStatus,
      activeThreats: unresolvedThreats.length,
      activeSessions: this.activeSessions.size,
      recentFailedLogins,
    };
  }

  public cleanup(): void {
    // Clear all active sessions
    this.activeSessions.clear();
    
    // Clear login attempts
    this.loginAttempts.clear();
    
    // Save final audit logs
    this.rotateAuditLogs().catch(console.error);
    
    this.log('security_service_cleanup', 'low', 'Security service cleaned up');
    console.log('Security service cleaned up');
  }
}

export const securityService = new SecurityService();