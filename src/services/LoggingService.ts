import * as FileSystem from 'expo-file-system';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  category: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface ErrorReport {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    userId?: string;
    sessionId: string;
    screen: string;
    action: string;
    appVersion: string;
    platform: string;
    deviceModel?: string;
  };
  metadata?: Record<string, any>;
}

export class LoggingService {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogEntries = 1000;
  private logLevel: LogLevel = 'info';
  private isInitialized = false;
  private logFilePath: string;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.logFilePath = `${FileSystem.documentDirectory}logs/app_${new Date().getFullYear()}_${new Date().getMonth() + 1}.log`;
    this.initializeLogging();
  }

  private async initializeLogging(): Promise<void> {
    try {
      // Create logs directory if it doesn't exist
      const logsDir = `${FileSystem.documentDirectory}logs/`;
      const dirInfo = await FileSystem.getInfoAsync(logsDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
      }

      // Set up global error handler
      this.setupGlobalErrorHandler();
      
      // Set up console interceptors in development
      if (__DEV__) {
        this.setupConsoleInterceptors();
      }

      this.isInitialized = true;
      this.info('LoggingService', 'Logging service initialized', { sessionId: this.sessionId });
    } catch (error) {
      console.error('Failed to initialize logging service:', error);
    }
  }

  private setupGlobalErrorHandler(): void {
    // Global error handler for unhandled promise rejections
    const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
    
    global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
      this.logError('GlobalError', 'Unhandled error', error, {
        isFatal,
        timestamp: Date.now()
      });

      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  private setupConsoleInterceptors(): void {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args) => {
      this.debug('Console', args.join(' '));
      originalConsole.log(...args);
    };

    console.info = (...args) => {
      this.info('Console', args.join(' '));
      originalConsole.info(...args);
    };

    console.warn = (...args) => {
      this.warn('Console', args.join(' '));
      originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.error('Console', args.join(' '));
      originalConsole.error(...args);
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: Date.now(),
      level,
      message,
      category,
      sessionId: this.sessionId,
      metadata,
      stackTrace: error?.stack,
    };
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // Write to file in production
    if (!__DEV__) {
      this.writeLogToFile(entry);
    }
  }

  private async writeLogToFile(entry: LogEntry): Promise<void> {
    try {
      const logLine = `${new Date(entry.timestamp).toISOString()} [${entry.level.toUpperCase()}] ${entry.category}: ${entry.message}${entry.metadata ? ' ' + JSON.stringify(entry.metadata) : ''}\n`;
      
      await FileSystem.writeAsStringAsync(this.logFilePath, logLine, {
        append: true,
      });
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Set the minimum log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('LoggingService', `Log level set to ${level}`);
  }

  /**
   * Log debug message
   */
  public debug(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      const entry = this.createLogEntry('debug', category, message, metadata);
      this.addLogEntry(entry);
    }
  }

  /**
   * Log info message
   */
  public info(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      const entry = this.createLogEntry('info', category, message, metadata);
      this.addLogEntry(entry);
    }
  }

  /**
   * Log warning message
   */
  public warn(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      const entry = this.createLogEntry('warn', category, message, metadata);
      this.addLogEntry(entry);
    }
  }

  /**
   * Log error message
   */
  public error(category: string, message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const entry = this.createLogEntry('error', category, message, metadata);
      this.addLogEntry(entry);
    }
  }

  /**
   * Log error with exception details
   */
  public logError(category: string, message: string, error: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const entry = this.createLogEntry('error', category, `${message}: ${error.message}`, metadata, error);
      this.addLogEntry(entry);
    }
  }

  /**
   * Log fatal error
   */
  public fatal(category: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('fatal', category, message, metadata, error);
    this.addLogEntry(entry);
  }

  /**
   * Create and send error report
   */
  public async reportError(
    error: Error,
    context: {
      screen: string;
      action: string;
      userId?: string;
    },
    metadata?: Record<string, any>
  ): Promise<string> {
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...context,
        sessionId: this.sessionId,
        appVersion: '1.0.0', // Should come from app config
        platform: 'mobile', // Should be detected
      },
      metadata,
    };

    // Log the error locally
    this.logError('ErrorReporting', 'Error reported', error, {
      reportId: errorReport.id,
      context: errorReport.context,
    });

    // In a real implementation, this would send to crash reporting service
    // like Sentry, Bugsnag, or custom analytics
    try {
      await this.sendErrorReport(errorReport);
    } catch (sendError) {
      this.error('ErrorReporting', 'Failed to send error report', { 
        originalError: error.message,
        sendError: sendError.message 
      });
    }

    return errorReport.id;
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    // Mock implementation - in production this would send to crash reporting service
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // For demo purposes, just log that we would send it
    this.debug('ErrorReporting', 'Error report would be sent to crash reporting service', {
      reportId: report.id,
      errorType: report.error.name,
    });
  }

  /**
   * Get recent logs
   */
  public getLogs(options: {
    level?: LogLevel;
    category?: string;
    limit?: number;
    since?: number;
  } = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }

    if (options.category) {
      filteredLogs = filteredLogs.filter(log => log.category === options.category);
    }

    if (options.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.since!);
    }

    if (options.limit) {
      filteredLogs = filteredLogs.slice(-options.limit);
    }

    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Export logs to file
   */
  public async exportLogs(): Promise<string | null> {
    try {
      const exportData = {
        sessionId: this.sessionId,
        exportTimestamp: Date.now(),
        logLevel: this.logLevel,
        totalLogs: this.logs.length,
        logs: this.logs,
      };

      const filename = `logs_export_${Date.now()}.json`;
      const filePath = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2));
      
      this.info('LoggingService', 'Logs exported successfully', { 
        filePath,
        logCount: this.logs.length 
      });
      
      return filePath;
    } catch (error) {
      this.logError('LoggingService', 'Failed to export logs', error as Error);
      return null;
    }
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    const logCount = this.logs.length;
    this.logs = [];
    this.info('LoggingService', `Cleared ${logCount} log entries`);
  }

  /**
   * Get logging statistics
   */
  public getStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    sessionId: string;
    oldestLog?: number;
    newestLog?: number;
  } {
    const logsByLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      sessionId: this.sessionId,
      oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : undefined,
      newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : undefined,
    };
  }

  /**
   * Set user context for logging
   */
  public setUserContext(userId: string): void {
    this.logs.forEach(log => {
      if (!log.userId) {
        log.userId = userId;
      }
    });
    
    this.info('LoggingService', 'User context set for logging', { userId });
  }

  /**
   * Performance timing helper
   */
  public startTiming(operation: string): () => void {
    const startTime = Date.now();
    
    this.debug('Performance', `Started operation: ${operation}`, { startTime });
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.info('Performance', `Completed operation: ${operation}`, {
        duration,
        startTime,
        endTime,
      });
    };
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

export const loggingService = new LoggingService();