import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    screen?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
  };
  deviceInfo: {
    platform: string;
    osVersion: string;
    appVersion: string;
    deviceModel?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isWifiEnabled: boolean | null;
}

export class ErrorHandlingService {
  private errorQueue: ErrorReport[] = [];
  private offlineQueue: OfflineAction[] = [];
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
    isWifiEnabled: null,
  };
  
  private isOnline: boolean = true;
  private retryTimer: NodeJS.Timeout | null = null;
  private errorHandlers: Map<string, Function[]> = new Map();
  
  private readonly STORAGE_KEYS = {
    ERROR_QUEUE: 'error_queue',
    OFFLINE_QUEUE: 'offline_queue',
    ERROR_SETTINGS: 'error_settings',
  };

  private readonly MAX_ERROR_QUEUE_SIZE = 100;
  private readonly MAX_OFFLINE_QUEUE_SIZE = 200;
  private readonly RETRY_INTERVAL = 30000; // 30 seconds

  private settings = {
    enableErrorReporting: true,
    enableOfflineSupport: true,
    enableCrashReporting: true,
    maxRetryAttempts: 3,
    enableAutoRetry: true,
  };

  async initialize(): Promise<void> {
    try {
      // Setup global error handling
      this.setupGlobalErrorHandlers();
      
      // Load stored data
      await this.loadStoredData();
      await this.loadSettings();
      
      // Setup network monitoring
      await this.setupNetworkMonitoring();
      
      // Start retry mechanism
      this.startRetryTimer();
      
      console.log('Error handling service initialized');
    } catch (error) {
      console.error('Error handling service initialization failed:', error);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    const originalHandler = global.ErrorUtils?.getGlobalHandler();
    
    global.ErrorUtils?.setGlobalHandler((error: Error, isFatal: boolean) => {
      this.reportError(error, {
        screen: 'global',
        action: 'uncaught_exception',
      }, isFatal ? 'critical' : 'high');
      
      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Handle promise rejections
    const originalRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: any) => {
      this.reportError(new Error(event.reason), {
        screen: 'global',
        action: 'unhandled_promise_rejection',
      }, 'high');
      
      if (originalRejectionHandler) {
        originalRejectionHandler(event);
      }
    };
  }

  async reportError(
    error: Error,
    context: ErrorReport['context'] = {},
    severity: ErrorReport['severity'] = 'medium',
    handled: boolean = true,
    tags: string[] = [],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const errorReport: ErrorReport = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
        deviceInfo: await this.getDeviceInfo(),
        severity,
        handled,
        tags,
        metadata,
      };

      // Add to queue
      this.errorQueue.push(errorReport);
      
      // Trim queue if too large
      if (this.errorQueue.length > this.MAX_ERROR_QUEUE_SIZE) {
        this.errorQueue.splice(0, this.errorQueue.length - this.MAX_ERROR_QUEUE_SIZE);
      }

      // Save to storage
      await this.saveErrorQueue();

      // Try to send immediately if online
      if (this.isOnline && this.settings.enableErrorReporting) {
        await this.sendErrorReports();
      }

      // Notify error handlers
      this.notifyErrorHandlers('error_reported', errorReport);

      console.error(`Error reported (${severity}):`, error.message);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  async addOfflineAction(
    type: string,
    data: any,
    priority: OfflineAction['priority'] = 'normal',
    maxRetries: number = 3
  ): Promise<string> {
    const action: OfflineAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
      priority,
    };

    // Add to queue based on priority
    if (priority === 'high') {
      this.offlineQueue.unshift(action);
    } else {
      this.offlineQueue.push(action);
    }

    // Trim queue if too large
    if (this.offlineQueue.length > this.MAX_OFFLINE_QUEUE_SIZE) {
      // Remove lowest priority items first
      this.offlineQueue.sort((a, b) => {
        const priorityOrder = { low: 0, normal: 1, high: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      this.offlineQueue.splice(0, this.offlineQueue.length - this.MAX_OFFLINE_QUEUE_SIZE);
    }

    await this.saveOfflineQueue();

    // Try to process immediately if online
    if (this.isOnline) {
      await this.processOfflineQueue();
    }

    console.log(`Offline action queued: ${type}`);
    return action.id;
  }

  async handleNetworkError(error: Error, action: string, data?: any): Promise<void> {
    if (!this.isOnline) {
      // Add to offline queue for retry when connection is restored
      await this.addOfflineAction(action, data, 'normal');
    } else {
      // Report network error
      await this.reportError(error, {
        action: 'network_error',
        screen: action,
      }, 'medium', true, ['network']);
    }
  }

  private async setupNetworkMonitoring(): Promise<void> {
    // Get initial network state
    const netInfo = await NetInfo.fetch();
    this.updateNetworkState(netInfo);

    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.updateNetworkState(state);

      if (!wasOnline && this.isOnline) {
        // Connection restored - process offline queue
        console.log('Connection restored, processing offline queue');
        this.processOfflineQueue();
        this.sendErrorReports();
      } else if (wasOnline && !this.isOnline) {
        console.log('Connection lost, entering offline mode');
      }
    });
  }

  private updateNetworkState(state: any): void {
    this.networkState = {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isWifiEnabled: state.isWifiEnabled,
    };

    this.isOnline = state.isConnected && state.isInternetReachable;
    
    // Notify network state change handlers
    this.notifyErrorHandlers('network_state_changed', this.networkState);
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) return;

    const toProcess = [...this.offlineQueue];
    const processed: string[] = [];
    const failed: OfflineAction[] = [];

    for (const action of toProcess) {
      try {
        const success = await this.executeOfflineAction(action);
        
        if (success) {
          processed.push(action.id);
        } else {
          action.retryCount++;
          if (action.retryCount < action.maxRetries) {
            failed.push(action);
          } else {
            console.log(`Offline action failed after ${action.maxRetries} attempts:`, action.type);
          }
        }
      } catch (error) {
        await this.reportError(error as Error, {
          action: 'offline_queue_processing',
          screen: 'error_handler',
        }, 'medium');
        
        action.retryCount++;
        if (action.retryCount < action.maxRetries) {
          failed.push(action);
        }
      }
    }

    // Update queue - remove processed, keep failed for retry
    this.offlineQueue = failed;
    await this.saveOfflineQueue();

    if (processed.length > 0) {
      console.log(`Processed ${processed.length} offline actions`);
    }
  }

  private async executeOfflineAction(action: OfflineAction): Promise<boolean> {
    // This would contain logic to execute different types of offline actions
    switch (action.type) {
      case 'save_recording':
        return await this.handleSaveRecording(action.data);
      case 'sync_user_data':
        return await this.handleSyncUserData(action.data);
      case 'upload_training_data':
        return await this.handleUploadTrainingData(action.data);
      case 'update_robot_config':
        return await this.handleUpdateRobotConfig(action.data);
      default:
        console.log(`Unknown offline action type: ${action.type}`);
        return false;
    }
  }

  private async handleSaveRecording(data: any): Promise<boolean> {
    // Simulate saving recording data
    console.log('Executing offline save recording action');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Math.random() > 0.1; // 90% success rate
  }

  private async handleSyncUserData(data: any): Promise<boolean> {
    // Simulate syncing user data
    console.log('Executing offline sync user data action');
    await new Promise(resolve => setTimeout(resolve, 800));
    return Math.random() > 0.05; // 95% success rate
  }

  private async handleUploadTrainingData(data: any): Promise<boolean> {
    // Simulate uploading training data
    console.log('Executing offline upload training data action');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.2; // 80% success rate
  }

  private async handleUpdateRobotConfig(data: any): Promise<boolean> {
    // Simulate updating robot configuration
    console.log('Executing offline update robot config action');
    await new Promise(resolve => setTimeout(resolve, 500));
    return Math.random() > 0.15; // 85% success rate
  }

  private async sendErrorReports(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    try {
      // Simulate sending error reports to server
      console.log(`Sending ${this.errorQueue.length} error reports`);
      
      // In a real app, this would send to error reporting service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear sent reports
      this.errorQueue = [];
      await this.saveErrorQueue();
      
      console.log('Error reports sent successfully');
    } catch (error) {
      console.error('Failed to send error reports:', error);
    }
  }

  private startRetryTimer(): void {
    this.retryTimer = setInterval(() => {
      if (this.isOnline && this.settings.enableAutoRetry) {
        this.processOfflineQueue();
        this.sendErrorReports();
      }
    }, this.RETRY_INTERVAL);
  }

  private stopRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private async getDeviceInfo(): Promise<ErrorReport['deviceInfo']> {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0', // Should come from app config
      deviceModel: 'Unknown', // Would get from device info library
    };
  }

  // Event handling
  addEventListener(event: string, handler: Function): void {
    if (!this.errorHandlers.has(event)) {
      this.errorHandlers.set(event, []);
    }
    this.errorHandlers.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    const handlers = this.errorHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private notifyErrorHandlers(event: string, data: any): void {
    const handlers = this.errorHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error handler callback failed:', error);
        }
      });
    }
  }

  // Storage methods
  private async loadStoredData(): Promise<void> {
    try {
      const [errorQueue, offlineQueue] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.ERROR_QUEUE),
        AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_QUEUE),
      ]);

      if (errorQueue) {
        this.errorQueue = JSON.parse(errorQueue).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
      }

      if (offlineQueue) {
        this.offlineQueue = JSON.parse(offlineQueue).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load stored error handling data:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.ERROR_SETTINGS);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load error handling settings:', error);
    }
  }

  private async saveErrorQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.ERROR_QUEUE, JSON.stringify(this.errorQueue));
    } catch (error) {
      console.error('Failed to save error queue:', error);
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  // Public API
  getErrorQueue(): ErrorReport[] {
    return [...this.errorQueue];
  }

  getOfflineQueue(): OfflineAction[] {
    return [...this.offlineQueue];
  }

  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  async clearErrorQueue(): Promise<void> {
    this.errorQueue = [];
    await this.saveErrorQueue();
  }

  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
  }

  async updateSettings(settings: Partial<typeof this.settings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await AsyncStorage.setItem(this.STORAGE_KEYS.ERROR_SETTINGS, JSON.stringify(this.settings));
  }

  getSettings(): typeof this.settings {
    return { ...this.settings };
  }

  async exportDiagnosticData(): Promise<string> {
    const diagnosticData = {
      networkState: this.networkState,
      errorQueue: this.errorQueue,
      offlineQueue: this.offlineQueue,
      settings: this.settings,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(diagnosticData, null, 2);
  }

  dispose(): void {
    this.stopRetryTimer();
    this.errorHandlers.clear();
    this.errorQueue = [];
    this.offlineQueue = [];
  }
}

export const errorHandlingService = new ErrorHandlingService();