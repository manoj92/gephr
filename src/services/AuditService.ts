import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { encryptionService } from './EncryptionService';

export interface AuditEvent {
  action: string;
  userId: string;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: number;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StoredAuditEvent extends AuditEvent {
  id: number;
  timestamp: number;
  signature: string;
  encrypted: boolean;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface SecurityAlert {
  id: string;
  type: 'authentication_failure' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  userId?: string;
  metadata?: any;
  resolved: boolean;
}

export class AuditService {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'security_audit.db';
  private isInitialized = false;
  private alertThresholds = new Map<string, number>();
  private alertCounters = new Map<string, { count: number; resetTime: number }>();

  // Security event patterns that trigger alerts
  private readonly SECURITY_PATTERNS = {
    FAILED_LOGIN_THRESHOLD: 5,
    RATE_LIMIT_WINDOW: 300000, // 5 minutes
    SUSPICIOUS_COMMANDS: ['rm', 'delete', 'drop', 'exec', 'eval'],
    CRITICAL_ACTIONS: ['user_deleted', 'data_exported', 'robot_emergency_stop'],
    IP_LOCKOUT_THRESHOLD: 10,
  };

  constructor() {
    this.initializeDatabase();
    this.setupSecurityMonitoring();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.createAuditTables();
      this.isInitialized = true;
      console.log('Audit database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audit database:', error);
    }
  }

  private async createAuditTables(): Promise<void> {
    if (!this.db) return;

    const createTablesSQL = `
      -- Audit events table
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        severity TEXT DEFAULT 'low',
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT, -- JSON encoded
        signature TEXT NOT NULL,
        encrypted BOOLEAN DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      -- Security alerts table
      CREATE TABLE IF NOT EXISTS security_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        user_id TEXT,
        metadata TEXT, -- JSON encoded
        resolved BOOLEAN DEFAULT 0,
        resolved_at INTEGER,
        resolved_by TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      -- Failed authentication attempts
      CREATE TABLE IF NOT EXISTS auth_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        ip_address TEXT,
        timestamp INTEGER NOT NULL,
        failure_reason TEXT,
        user_agent TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      -- Session tracking
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        terminated_at INTEGER,
        termination_reason TEXT
      );

      -- Data access log
      CREATE TABLE IF NOT EXISTS data_access_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        action TEXT NOT NULL, -- read, write, delete, export
        timestamp INTEGER NOT NULL,
        ip_address TEXT,
        success BOOLEAN NOT NULL,
        error_message TEXT
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
      CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON audit_events(severity);
      CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_auth_failures_ip ON auth_failures(ip_address);
      CREATE INDEX IF NOT EXISTS idx_auth_failures_timestamp ON auth_failures(timestamp);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_user_id ON data_access_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_timestamp ON data_access_log(timestamp);
    `;

    await this.db.execAsync(createTablesSQL);
    console.log('Audit tables created successfully');
  }

  /**
   * Log a security audit event
   */
  public async logEvent(event: AuditEvent): Promise<boolean> {
    if (!this.db || !this.isInitialized) {
      console.error('Audit database not initialized');
      return false;
    }

    try {
      const timestamp = event.timestamp || Date.now();
      const eventData = {
        ...event,
        timestamp,
        severity: event.severity || 'low'
      };

      // Generate signature for integrity
      const signature = encryptionService.generateHash(JSON.stringify(eventData));

      // Encrypt sensitive events
      let metadata = event.metadata;
      let encrypted = false;
      
      if (event.severity === 'critical' || event.severity === 'high') {
        if (metadata) {
          const encryptedData = await encryptionService.encryptData(JSON.stringify(metadata));
          metadata = encryptedData;
          encrypted = true;
        }
      }

      await this.db.runAsync(`
        INSERT INTO audit_events (action, user_id, timestamp, severity, session_id, ip_address, user_agent, metadata, signature, encrypted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.action,
        event.userId,
        timestamp,
        eventData.severity,
        event.sessionId || null,
        event.ipAddress || null,
        event.userAgent || null,
        metadata ? (encrypted ? JSON.stringify(metadata) : JSON.stringify(metadata)) : null,
        signature,
        encrypted
      ]);

      // Check for security patterns
      await this.analyzeSecurityPatterns(eventData);

      // Trigger alerts for critical events
      if (eventData.severity === 'critical') {
        await this.createSecurityAlert({
          type: 'unauthorized_access',
          severity: 'critical',
          message: `Critical security event: ${event.action}`,
          timestamp,
          userId: event.userId,
          metadata: event.metadata
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      return false;
    }
  }

  /**
   * Log authentication failure
   */
  public async logAuthFailure(
    userId: string | null,
    ipAddress: string,
    reason: string,
    userAgent?: string
  ): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        INSERT INTO auth_failures (user_id, ip_address, timestamp, failure_reason, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, ipAddress, Date.now(), reason, userAgent || null]);

      // Check for brute force attacks
      const recentFailures = await this.db.getAllAsync(`
        SELECT COUNT(*) as count FROM auth_failures 
        WHERE ip_address = ? AND timestamp > ?
      `, [ipAddress, Date.now() - 300000]); // Last 5 minutes

      const failureCount = (recentFailures[0] as any)?.count || 0;
      
      if (failureCount >= this.SECURITY_PATTERNS.FAILED_LOGIN_THRESHOLD) {
        await this.createSecurityAlert({
          type: 'authentication_failure',
          severity: 'high',
          message: `Potential brute force attack from ${ipAddress}: ${failureCount} failed attempts`,
          timestamp: Date.now(),
          metadata: { ipAddress, failureCount }
        });
      }

      await this.logEvent({
        action: 'authentication_failed',
        userId: userId || 'unknown',
        metadata: { ipAddress, reason, failureCount },
        severity: failureCount >= 3 ? 'medium' : 'low',
        ipAddress
      });

    } catch (error) {
      console.error('Failed to log auth failure:', error);
    }
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string | null,
    action: 'read' | 'write' | 'delete' | 'export',
    success: boolean,
    ipAddress?: string,
    errorMessage?: string
  ): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(`
        INSERT INTO data_access_log (user_id, resource_type, resource_id, action, timestamp, ip_address, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, resourceType, resourceId, action, Date.now(), ipAddress || null, success, errorMessage || null]);

      // Log as audit event
      await this.logEvent({
        action: `data_${action}`,
        userId,
        metadata: {
          resourceType,
          resourceId,
          success,
          errorMessage
        },
        severity: action === 'delete' || action === 'export' ? 'medium' : 'low',
        ipAddress
      });

    } catch (error) {
      console.error('Failed to log data access:', error);
    }
  }

  /**
   * Create security alert
   */
  public async createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'resolved'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await this.db.runAsync(`
        INSERT INTO security_alerts (id, type, severity, message, timestamp, user_id, metadata, resolved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alertId,
        alert.type,
        alert.severity,
        alert.message,
        alert.timestamp,
        alert.userId || null,
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        false
      ]);

      // Log alert creation
      await this.logEvent({
        action: 'security_alert_created',
        userId: 'system',
        metadata: {
          alertId,
          alertType: alert.type,
          severity: alert.severity
        },
        severity: alert.severity
      });

      console.log(`Security alert created: ${alertId} - ${alert.message}`);
      return alertId;

    } catch (error) {
      console.error('Failed to create security alert:', error);
      throw error;
    }
  }

  /**
   * Resolve security alert
   */
  public async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.runAsync(`
        UPDATE security_alerts 
        SET resolved = 1, resolved_at = ?, resolved_by = ?
        WHERE id = ?
      `, [Date.now(), resolvedBy, alertId]);

      await this.logEvent({
        action: 'security_alert_resolved',
        userId: resolvedBy,
        metadata: { alertId },
        severity: 'low'
      });

      return true;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }

  /**
   * Query audit events
   */
  public async queryEvents(query: AuditQuery): Promise<StoredAuditEvent[]> {
    if (!this.db) return [];

    try {
      let sql = 'SELECT * FROM audit_events WHERE 1=1';
      const params: any[] = [];

      if (query.userId) {
        sql += ' AND user_id = ?';
        params.push(query.userId);
      }

      if (query.action) {
        sql += ' AND action = ?';
        params.push(query.action);
      }

      if (query.severity) {
        sql += ' AND severity = ?';
        params.push(query.severity);
      }

      if (query.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(query.startDate.getTime());
      }

      if (query.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(query.endDate.getTime());
      }

      sql += ' ORDER BY timestamp DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const results = await this.db.getAllAsync(sql, params);
      
      // Decrypt encrypted events
      const events: StoredAuditEvent[] = [];
      for (const row of results as any[]) {
        let metadata = row.metadata;
        
        if (row.encrypted && metadata) {
          try {
            const encryptedData = JSON.parse(metadata);
            const decrypted = await encryptionService.decryptData(encryptedData);
            metadata = JSON.parse(decrypted);
          } catch (error) {
            console.error('Failed to decrypt audit event metadata:', error);
            metadata = null;
          }
        } else if (metadata) {
          metadata = JSON.parse(metadata);
        }

        events.push({
          id: row.id,
          action: row.action,
          userId: row.user_id,
          timestamp: row.timestamp,
          severity: row.severity,
          sessionId: row.session_id,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          metadata,
          signature: row.signature,
          encrypted: row.encrypted
        });
      }

      return events;
    } catch (error) {
      console.error('Failed to query audit events:', error);
      return [];
    }
  }

  /**
   * Get security alerts
   */
  public async getSecurityAlerts(resolved?: boolean, severity?: string): Promise<SecurityAlert[]> {
    if (!this.db) return [];

    try {
      let sql = 'SELECT * FROM security_alerts WHERE 1=1';
      const params: any[] = [];

      if (resolved !== undefined) {
        sql += ' AND resolved = ?';
        params.push(resolved);
      }

      if (severity) {
        sql += ' AND severity = ?';
        params.push(severity);
      }

      sql += ' ORDER BY timestamp DESC';

      const results = await this.db.getAllAsync(sql, params);
      
      return results.map((row: any) => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        message: row.message,
        timestamp: row.timestamp,
        userId: row.user_id,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        resolved: Boolean(row.resolved)
      }));

    } catch (error) {
      console.error('Failed to get security alerts:', error);
      return [];
    }
  }

  /**
   * Analyze security patterns and trigger alerts
   */
  private async analyzeSecurityPatterns(event: AuditEvent): Promise<void> {
    // Check for suspicious commands
    if (event.action === 'robot_command_executed' && event.metadata?.commandType) {
      const command = event.metadata.commandType.toLowerCase();
      const hasSuspiciousCommand = this.SECURITY_PATTERNS.SUSPICIOUS_COMMANDS.some(
        suspicious => command.includes(suspicious)
      );

      if (hasSuspiciousCommand) {
        await this.createSecurityAlert({
          type: 'suspicious_activity',
          severity: 'medium',
          message: `Suspicious robot command detected: ${command}`,
          timestamp: event.timestamp || Date.now(),
          userId: event.userId,
          metadata: { command, originalEvent: event }
        });
      }
    }

    // Check for critical actions
    if (this.SECURITY_PATTERNS.CRITICAL_ACTIONS.includes(event.action)) {
      await this.createSecurityAlert({
        type: 'unauthorized_access',
        severity: 'high',
        message: `Critical action performed: ${event.action}`,
        timestamp: event.timestamp || Date.now(),
        userId: event.userId,
        metadata: event.metadata
      });
    }

    // Rate limiting checks
    if (event.ipAddress) {
      await this.checkRateLimiting(event);
    }
  }

  private async checkRateLimiting(event: AuditEvent): Promise<void> {
    if (!event.ipAddress) return;

    const key = `${event.ipAddress}:${event.action}`;
    const now = Date.now();
    const window = this.SECURITY_PATTERNS.RATE_LIMIT_WINDOW;

    let counter = this.alertCounters.get(key);
    if (!counter || now > counter.resetTime) {
      counter = { count: 0, resetTime: now + window };
    }

    counter.count++;
    this.alertCounters.set(key, counter);

    // Check thresholds
    const threshold = this.alertThresholds.get(event.action) || 50; // Default threshold
    
    if (counter.count > threshold) {
      await this.createSecurityAlert({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        message: `Rate limit exceeded for ${event.action} from ${event.ipAddress}: ${counter.count} requests`,
        timestamp: now,
        userId: event.userId,
        metadata: { ipAddress: event.ipAddress, action: event.action, count: counter.count }
      });
    }
  }

  /**
   * Export audit log for compliance
   */
  public async exportAuditLog(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string | null> {
    try {
      const events = await this.queryEvents({ startDate, endDate, limit: 10000 });
      
      let filename: string;
      let content: string;

      if (format === 'json') {
        filename = `audit_log_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.json`;
        content = JSON.stringify({
          exportDate: new Date().toISOString(),
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
          totalEvents: events.length,
          events
        }, null, 2);
      } else {
        filename = `audit_log_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`;
        const headers = ['ID', 'Action', 'User ID', 'Timestamp', 'Severity', 'IP Address', 'Metadata'];
        const rows = [headers.join(',')];
        
        events.forEach(event => {
          rows.push([
            event.id,
            event.action,
            event.userId,
            new Date(event.timestamp).toISOString(),
            event.severity,
            event.ipAddress || '',
            event.metadata ? JSON.stringify(event.metadata).replace(/"/g, '""') : ''
          ].join(','));
        });
        
        content = rows.join('\n');
      }

      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      // Log the export
      await this.logEvent({
        action: 'audit_log_exported',
        userId: 'system',
        metadata: {
          filename,
          eventCount: events.length,
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
        },
        severity: 'medium'
      });

      return fileUri;
    } catch (error) {
      console.error('Failed to export audit log:', error);
      return null;
    }
  }

  /**
   * Get audit statistics
   */
  public async getAuditStatistics(days: number = 30): Promise<{
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByAction: Record<string, number>;
    activeAlerts: number;
    recentFailures: number;
  }> {
    if (!this.db) {
      return {
        totalEvents: 0,
        eventsBySeverity: {},
        eventsByAction: {},
        activeAlerts: 0,
        recentFailures: 0
      };
    }

    try {
      const since = Date.now() - (days * 24 * 60 * 60 * 1000);

      const [totalEvents, severityStats, actionStats, alerts, failures] = await Promise.all([
        this.db.getFirstAsync('SELECT COUNT(*) as count FROM audit_events WHERE timestamp > ?', [since]),
        this.db.getAllAsync('SELECT severity, COUNT(*) as count FROM audit_events WHERE timestamp > ? GROUP BY severity', [since]),
        this.db.getAllAsync('SELECT action, COUNT(*) as count FROM audit_events WHERE timestamp > ? GROUP BY action ORDER BY count DESC LIMIT 10', [since]),
        this.db.getFirstAsync('SELECT COUNT(*) as count FROM security_alerts WHERE resolved = 0'),
        this.db.getFirstAsync('SELECT COUNT(*) as count FROM auth_failures WHERE timestamp > ?', [since])
      ]);

      const eventsBySeverity: Record<string, number> = {};
      (severityStats as any[]).forEach(row => {
        eventsBySeverity[row.severity] = row.count;
      });

      const eventsByAction: Record<string, number> = {};
      (actionStats as any[]).forEach(row => {
        eventsByAction[row.action] = row.count;
      });

      return {
        totalEvents: (totalEvents as any)?.count || 0,
        eventsBySeverity,
        eventsByAction,
        activeAlerts: (alerts as any)?.count || 0,
        recentFailures: (failures as any)?.count || 0
      };

    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      return {
        totalEvents: 0,
        eventsBySeverity: {},
        eventsByAction: {},
        activeAlerts: 0,
        recentFailures: 0
      };
    }
  }

  private setupSecurityMonitoring(): void {
    // Set up rate limit thresholds for different actions
    this.alertThresholds.set('user_login', 20); // 20 login attempts per 5 minutes
    this.alertThresholds.set('robot_command_executed', 100); // 100 commands per 5 minutes
    this.alertThresholds.set('data_export', 5); // 5 exports per 5 minutes
    this.alertThresholds.set('password_change', 3); // 3 password changes per 5 minutes

    // Clean up old counters every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, counter] of this.alertCounters.entries()) {
        if (now > counter.resetTime) {
          this.alertCounters.delete(key);
        }
      }
    }, 3600000); // 1 hour
  }

  /**
   * Verify audit log integrity
   */
  public async verifyIntegrity(): Promise<{
    valid: boolean;
    corruptedEvents: number[];
    totalChecked: number;
  }> {
    if (!this.db) {
      return { valid: false, corruptedEvents: [], totalChecked: 0 };
    }

    try {
      const events = await this.db.getAllAsync('SELECT id, action, user_id, timestamp, severity, metadata, signature FROM audit_events');
      const corruptedEvents: number[] = [];

      for (const event of events as any[]) {
        const eventData = {
          action: event.action,
          userId: event.user_id,
          timestamp: event.timestamp,
          severity: event.severity,
          metadata: event.metadata ? JSON.parse(event.metadata) : undefined
        };

        const expectedSignature = encryptionService.generateHash(JSON.stringify(eventData));
        
        if (expectedSignature !== event.signature) {
          corruptedEvents.push(event.id);
        }
      }

      const valid = corruptedEvents.length === 0;
      
      if (!valid) {
        await this.createSecurityAlert({
          type: 'data_breach',
          severity: 'critical',
          message: `Audit log integrity violation detected: ${corruptedEvents.length} corrupted events`,
          timestamp: Date.now(),
          metadata: { corruptedEventIds: corruptedEvents }
        });
      }

      return {
        valid,
        corruptedEvents,
        totalChecked: events.length
      };

    } catch (error) {
      console.error('Failed to verify audit integrity:', error);
      return { valid: false, corruptedEvents: [], totalChecked: 0 };
    }
  }
}

export const auditService = new AuditService();