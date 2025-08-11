import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

export interface UserMetrics {
  totalSessions: number;
  totalRecordingTime: number;
  totalRecordings: number;
  averageSessionDuration: number;
  skillsCreated: number;
  skillsPurchased: number;
  robotsConnected: number;
  mapsCreated: number;
  lastActiveDate: Date;
  firstActiveDate: Date;
}

export interface PerformanceMetrics {
  appLaunchTime: number;
  averageFrameRate: number;
  memoryUsage: number;
  storageUsage: number;
  networkLatency: number;
  errorCount: number;
  crashCount: number;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  screenViews: string[];
  actions: string[];
  errors: string[];
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  screenSize: { width: number; height: number };
  isTablet: boolean;
  hasLidar: boolean;
  hasDepthCamera: boolean;
}

export class AnalyticsService {
  private isEnabled: boolean = false;
  private currentSessionId: string | null = null;
  private sessionStartTime: Date | null = null;
  private userId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionData: SessionData | null = null;
  
  private readonly STORAGE_KEYS = {
    USER_METRICS: 'analytics_user_metrics',
    SESSIONS: 'analytics_sessions',
    PERFORMANCE: 'analytics_performance',
    SETTINGS: 'analytics_settings',
  };

  private performanceMonitor: {
    frameRateMonitor?: NodeJS.Timeout;
    memoryMonitor?: NodeJS.Timeout;
    startTime?: number;
  } = {};

  async initialize(userId?: string, enableAnalytics: boolean = true): Promise<void> {
    try {
      this.userId = userId || null;
      this.isEnabled = enableAnalytics;
      
      if (!this.isEnabled) {
        console.log('Analytics disabled by user preference');
        return;
      }

      // Load settings
      const settings = await this.loadAnalyticsSettings();
      this.isEnabled = settings.enabled ?? true;

      if (this.isEnabled) {
        await this.startSession();
        this.startPerformanceMonitoring();
        this.setupAppStateHandling();
      }

      console.log('Analytics service initialized');
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  async startSession(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = new Date();

      const deviceInfo = await this.getDeviceInfo();
      
      this.sessionData = {
        sessionId: this.currentSessionId,
        userId: this.userId,
        startTime: this.sessionStartTime,
        screenViews: [],
        actions: [],
        errors: [],
        deviceInfo,
      };

      await this.trackEvent('session_start', {
        sessionId: this.currentSessionId,
        platform: deviceInfo.platform,
        appVersion: deviceInfo.appVersion,
      });

      console.log(`Analytics session started: ${this.currentSessionId}`);
    } catch (error) {
      console.error('Session start error:', error);
    }
  }

  async endSession(): Promise<void> {
    if (!this.isEnabled || !this.sessionData || !this.sessionStartTime) return;

    try {
      const endTime = new Date();
      const duration = endTime.getTime() - this.sessionStartTime.getTime();

      this.sessionData.endTime = endTime;
      this.sessionData.duration = duration;

      await this.trackEvent('session_end', {
        sessionId: this.currentSessionId,
        duration,
        screenViews: this.sessionData.screenViews.length,
        actions: this.sessionData.actions.length,
        errors: this.sessionData.errors.length,
      });

      // Save session data
      await this.saveSessionData(this.sessionData);
      
      // Update user metrics
      await this.updateUserMetrics({
        totalSessions: 1,
        averageSessionDuration: duration,
        lastActiveDate: endTime,
      });

      // Flush event queue
      await this.flushEventQueue();

      this.sessionData = null;
      this.currentSessionId = null;
      this.sessionStartTime = null;

      console.log('Analytics session ended');
    } catch (error) {
      console.error('Session end error:', error);
    }
  }

  async trackEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
    if (!this.isEnabled || !this.currentSessionId) return;

    try {
      const event: AnalyticsEvent = {
        name: eventName,
        properties: {
          ...properties,
          timestamp: Date.now(),
          platform: Platform.OS,
          appVersion: '1.0.0', // Should come from app config
        },
        timestamp: new Date(),
        sessionId: this.currentSessionId,
        userId: this.userId,
      };

      this.eventQueue.push(event);

      // Add to session data
      if (this.sessionData) {
        this.sessionData.actions.push(eventName);
      }

      // Auto-flush if queue gets too large
      if (this.eventQueue.length >= 50) {
        await this.flushEventQueue();
      }

      console.log(`Event tracked: ${eventName}`, properties);
    } catch (error) {
      console.error('Event tracking error:', error);
    }
  }

  async trackScreenView(screenName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });

    // Add to session data
    if (this.sessionData) {
      this.sessionData.screenViews.push(screenName);
    }
  }

  async trackRecording(duration: number, handGestures: number, robotCommands: number): Promise<void> {
    await this.trackEvent('recording_completed', {
      duration,
      hand_gestures: handGestures,
      robot_commands: robotCommands,
      quality: this.calculateRecordingQuality(duration, handGestures),
    });

    // Update user metrics
    await this.updateUserMetrics({
      totalRecordings: 1,
      totalRecordingTime: duration,
    });
  }

  async trackRobotConnection(robotType: string, connectionTime: number, success: boolean): Promise<void> {
    await this.trackEvent('robot_connection', {
      robot_type: robotType,
      connection_time: connectionTime,
      success,
    });

    if (success) {
      await this.updateUserMetrics({ robotsConnected: 1 });
    }
  }

  async trackSkillCreation(skillName: string, category: string, trainingTime: number): Promise<void> {
    await this.trackEvent('skill_created', {
      skill_name: skillName,
      category,
      training_time: trainingTime,
    });

    await this.updateUserMetrics({ skillsCreated: 1 });
  }

  async trackSkillPurchase(skillId: string, price: number, currency: string): Promise<void> {
    await this.trackEvent('skill_purchased', {
      skill_id: skillId,
      price,
      currency,
    });

    await this.updateUserMetrics({ skillsPurchased: 1 });
  }

  async trackError(error: Error, context: string): Promise<void> {
    await this.trackEvent('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      context,
    });

    // Add to session data
    if (this.sessionData) {
      this.sessionData.errors.push(error.message);
    }

    // Update performance metrics
    await this.updatePerformanceMetrics({ errorCount: 1 });
  }

  async trackPerformance(metricName: string, value: number, unit: string): Promise<void> {
    await this.trackEvent('performance_metric', {
      metric_name: metricName,
      value,
      unit,
    });
  }

  async getUserMetrics(): Promise<UserMetrics> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_METRICS);
    
    if (stored) {
      return JSON.parse(stored);
    }

    const defaultMetrics: UserMetrics = {
      totalSessions: 0,
      totalRecordingTime: 0,
      totalRecordings: 0,
      averageSessionDuration: 0,
      skillsCreated: 0,
      skillsPurchased: 0,
      robotsConnected: 0,
      mapsCreated: 0,
      lastActiveDate: new Date(),
      firstActiveDate: new Date(),
    };

    return defaultMetrics;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE);
    
    if (stored) {
      return JSON.parse(stored);
    }

    return {
      appLaunchTime: 0,
      averageFrameRate: 60,
      memoryUsage: 0,
      storageUsage: 0,
      networkLatency: 0,
      errorCount: 0,
      crashCount: 0,
    };
  }

  async getSessionHistory(limit: number = 50): Promise<SessionData[]> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SESSIONS);
    
    if (stored) {
      const sessions: SessionData[] = JSON.parse(stored);
      return sessions.slice(-limit);
    }

    return [];
  }

  async exportAnalyticsData(): Promise<string> {
    const [userMetrics, performanceMetrics, sessions] = await Promise.all([
      this.getUserMetrics(),
      this.getPerformanceMetrics(),
      this.getSessionHistory(100),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      userMetrics,
      performanceMetrics,
      sessions,
      eventQueue: this.eventQueue,
    };

    return JSON.stringify(exportData, null, 2);
  }

  async clearAnalyticsData(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.STORAGE_KEYS.USER_METRICS,
      this.STORAGE_KEYS.SESSIONS,
      this.STORAGE_KEYS.PERFORMANCE,
    ]);

    this.eventQueue = [];
    console.log('Analytics data cleared');
  }

  async setAnalyticsEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    
    await AsyncStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify({
      enabled,
      updatedAt: new Date().toISOString(),
    }));

    if (!enabled) {
      await this.endSession();
      this.stopPerformanceMonitoring();
    } else {
      await this.startSession();
      this.startPerformanceMonitoring();
    }
  }

  private async updateUserMetrics(updates: Partial<UserMetrics>): Promise<void> {
    const current = await this.getUserMetrics();
    
    const updated: UserMetrics = {
      ...current,
      totalSessions: current.totalSessions + (updates.totalSessions || 0),
      totalRecordingTime: current.totalRecordingTime + (updates.totalRecordingTime || 0),
      totalRecordings: current.totalRecordings + (updates.totalRecordings || 0),
      skillsCreated: current.skillsCreated + (updates.skillsCreated || 0),
      skillsPurchased: current.skillsPurchased + (updates.skillsPurchased || 0),
      robotsConnected: current.robotsConnected + (updates.robotsConnected || 0),
      mapsCreated: current.mapsCreated + (updates.mapsCreated || 0),
      lastActiveDate: updates.lastActiveDate || current.lastActiveDate,
      firstActiveDate: current.firstActiveDate.getTime() === 0 ? 
        (updates.lastActiveDate || new Date()) : current.firstActiveDate,
      averageSessionDuration: updates.averageSessionDuration || current.averageSessionDuration,
    };

    await AsyncStorage.setItem(this.STORAGE_KEYS.USER_METRICS, JSON.stringify(updated));
  }

  private async updatePerformanceMetrics(updates: Partial<PerformanceMetrics>): Promise<void> {
    const current = await this.getPerformanceMetrics();
    
    const updated: PerformanceMetrics = {
      ...current,
      errorCount: current.errorCount + (updates.errorCount || 0),
      crashCount: current.crashCount + (updates.crashCount || 0),
      appLaunchTime: updates.appLaunchTime || current.appLaunchTime,
      averageFrameRate: updates.averageFrameRate || current.averageFrameRate,
      memoryUsage: updates.memoryUsage || current.memoryUsage,
      storageUsage: updates.storageUsage || current.storageUsage,
      networkLatency: updates.networkLatency || current.networkLatency,
    };

    await AsyncStorage.setItem(this.STORAGE_KEYS.PERFORMANCE, JSON.stringify(updated));
  }

  private async saveSessionData(session: SessionData): Promise<void> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SESSIONS);
    const sessions: SessionData[] = stored ? JSON.parse(stored) : [];
    
    sessions.push(session);
    
    // Keep only last 100 sessions
    if (sessions.length > 100) {
      sessions.splice(0, sessions.length - 100);
    }

    await AsyncStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // In a real implementation, send events to analytics service
      console.log(`Flushing ${this.eventQueue.length} analytics events`);
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.eventQueue = [];
    } catch (error) {
      console.error('Event flush error:', error);
      // Keep events in queue for retry
    }
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0', // Should come from app config
      deviceModel: 'Unknown', // Would use device-info library
      screenSize: { width: 0, height: 0 }, // Would get from Dimensions
      isTablet: false,
      hasLidar: Math.random() > 0.7,
      hasDepthCamera: Math.random() > 0.5,
    };
  }

  private calculateRecordingQuality(duration: number, gestures: number): string {
    const gesturesPerMinute = gestures / (duration / 60000);
    
    if (gesturesPerMinute > 10) return 'high';
    if (gesturesPerMinute > 5) return 'medium';
    return 'low';
  }

  private startPerformanceMonitoring(): void {
    if (!this.isEnabled) return;

    // Monitor frame rate
    this.performanceMonitor.frameRateMonitor = setInterval(() => {
      // In a real implementation, measure actual frame rate
      const frameRate = 60 - Math.random() * 5; // Simulate
      this.trackPerformance('frame_rate', frameRate, 'fps');
    }, 10000);

    // Monitor memory usage
    this.performanceMonitor.memoryMonitor = setInterval(() => {
      // In a real implementation, get actual memory usage
      const memoryUsage = Math.random() * 100; // Simulate MB
      this.trackPerformance('memory_usage', memoryUsage, 'mb');
    }, 30000);
  }

  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitor.frameRateMonitor) {
      clearInterval(this.performanceMonitor.frameRateMonitor);
    }
    if (this.performanceMonitor.memoryMonitor) {
      clearInterval(this.performanceMonitor.memoryMonitor);
    }
  }

  private setupAppStateHandling(): void {
    // In React Native, you'd use AppState to handle background/foreground
    // This would automatically end session when app goes to background
  }

  private async loadAnalyticsSettings(): Promise<{ enabled: boolean }> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SETTINGS);
    
    if (stored) {
      return JSON.parse(stored);
    }

    return { enabled: true };
  }

  isEnabled(): boolean {
    return this.isEnabled;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

export const analyticsService = new AnalyticsService();