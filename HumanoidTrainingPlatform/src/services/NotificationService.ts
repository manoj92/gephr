// import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  categoryId?: string;
  sound?: boolean;
  badge?: number;
  timestamp: Date;
  read: boolean;
}

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface NotificationSettings {
  enabled: boolean;
  categories: NotificationCategory[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  allowCritical: boolean;
  groupSimilar: boolean;
}

export class NotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;
  private notificationHistory: NotificationData[] = [];
  private settings: NotificationSettings;

  private readonly STORAGE_KEYS = {
    SETTINGS: 'notification_settings',
    HISTORY: 'notification_history',
    PUSH_TOKEN: 'push_token',
  };

  private readonly DEFAULT_CATEGORIES: NotificationCategory[] = [
    {
      id: 'recording',
      name: 'Recording Alerts',
      description: 'Notifications about recording sessions',
      enabled: true,
      sound: true,
      vibration: true,
      priority: 'normal',
    },
    {
      id: 'robot_status',
      name: 'Robot Status',
      description: 'Robot connection and status updates',
      enabled: true,
      sound: true,
      vibration: true,
      priority: 'high',
    },
    {
      id: 'marketplace',
      name: 'Marketplace',
      description: 'New skills and marketplace updates',
      enabled: false,
      sound: false,
      vibration: false,
      priority: 'low',
    },
    {
      id: 'system',
      name: 'System Alerts',
      description: 'Important system notifications',
      enabled: true,
      sound: true,
      vibration: true,
      priority: 'critical',
    },
    {
      id: 'training',
      name: 'Training Progress',
      description: 'Updates on training sessions and progress',
      enabled: true,
      sound: false,
      vibration: true,
      priority: 'normal',
    },
  ];

  constructor() {
    this.settings = {
      enabled: true,
      categories: this.DEFAULT_CATEGORIES,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      allowCritical: true,
      groupSimilar: true,
    };
  }

  async initialize(): Promise<void> {
    try {
      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Load settings and history
      await this.loadSettings();
      await this.loadNotificationHistory();

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        await this.registerForPushNotifications();
      }

      // Setup notification categories
      await this.setupNotificationCategories();

      // Setup listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Notification service initialization error:', error);
      throw error;
    }
  }

  async sendLocalNotification(
    title: string,
    body: string,
    categoryId: string,
    data?: any,
    delay: number = 0
  ): Promise<string> {
    if (!this.isInitialized || !this.settings.enabled) {
      return '';
    }

    const category = this.settings.categories.find(c => c.id === categoryId);
    if (!category || !category.enabled) {
      return '';
    }

    // Check quiet hours
    if (this.isQuietHours() && category.priority !== 'critical') {
      return '';
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: category.sound,
          categoryIdentifier: categoryId,
          badge: await this.getNextBadgeCount(),
        },
        trigger: delay > 0 ? { seconds: delay } : null,
      });

      // Add to history
      const notification: NotificationData = {
        id: notificationId,
        title,
        body,
        data,
        categoryId,
        sound: category.sound,
        timestamp: new Date(),
        read: false,
      };

      this.notificationHistory.unshift(notification);
      await this.saveNotificationHistory();

      console.log(`Local notification sent: ${title}`);
      return notificationId;
    } catch (error) {
      console.error('Send local notification error:', error);
      throw error;
    }
  }

  async sendRecordingNotification(type: 'started' | 'stopped' | 'paused' | 'error', details?: any): Promise<void> {
    const messages = {
      started: {
        title: 'Recording Started',
        body: 'Hand tracking recording is now active',
      },
      stopped: {
        title: 'Recording Completed',
        body: `Recording saved with ${details?.duration || 0}s of data`,
      },
      paused: {
        title: 'Recording Paused',
        body: 'Recording has been paused. Tap to resume.',
      },
      error: {
        title: 'Recording Error',
        body: details?.error || 'An error occurred during recording',
      },
    };

    const message = messages[type];
    await this.sendLocalNotification(
      message.title,
      message.body,
      'recording',
      { type, ...details }
    );
  }

  async sendRobotNotification(type: 'connected' | 'disconnected' | 'error' | 'battery_low', robotName: string, details?: any): Promise<void> {
    const messages = {
      connected: {
        title: 'Robot Connected',
        body: `Successfully connected to ${robotName}`,
      },
      disconnected: {
        title: 'Robot Disconnected',
        body: `Lost connection to ${robotName}`,
      },
      error: {
        title: 'Robot Error',
        body: `${robotName}: ${details?.error || 'Unknown error'}`,
      },
      battery_low: {
        title: 'Low Battery Warning',
        body: `${robotName} battery is at ${details?.batteryLevel || 0}%`,
      },
    };

    const message = messages[type];
    await this.sendLocalNotification(
      message.title,
      message.body,
      'robot_status',
      { type, robotName, ...details }
    );
  }

  async sendMarketplaceNotification(type: 'new_skill' | 'purchase_complete' | 'skill_approved', details: any): Promise<void> {
    const messages = {
      new_skill: {
        title: 'New Skill Available',
        body: `Check out "${details.skillName}" in the marketplace`,
      },
      purchase_complete: {
        title: 'Purchase Complete',
        body: `You now own "${details.skillName}"`,
      },
      skill_approved: {
        title: 'Skill Approved',
        body: `Your skill "${details.skillName}" is now live in the marketplace`,
      },
    };

    const message = messages[type];
    await this.sendLocalNotification(
      message.title,
      message.body,
      'marketplace',
      { type, ...details }
    );
  }

  async sendSystemNotification(type: 'update' | 'maintenance' | 'security' | 'storage_full', details?: any): Promise<void> {
    const messages = {
      update: {
        title: 'App Update Available',
        body: 'A new version with improvements is ready to install',
      },
      maintenance: {
        title: 'Scheduled Maintenance',
        body: 'Services will be temporarily unavailable for maintenance',
      },
      security: {
        title: 'Security Alert',
        body: details?.message || 'Please review your security settings',
      },
      storage_full: {
        title: 'Storage Almost Full',
        body: `Only ${details?.freeSpace || 0}MB remaining. Clean up recordings to free space.`,
      },
    };

    const message = messages[type];
    await this.sendLocalNotification(
      message.title,
      message.body,
      'system',
      { type, ...details }
    );
  }

  async sendTrainingNotification(type: 'milestone' | 'session_complete' | 'reminder', details: any): Promise<void> {
    const messages = {
      milestone: {
        title: 'Training Milestone Reached!',
        body: `You've reached level ${details.level} with ${details.xp} XP!`,
      },
      session_complete: {
        title: 'Training Session Complete',
        body: `Great work! You earned ${details.xpGained} XP in this session.`,
      },
      reminder: {
        title: 'Training Reminder',
        body: "Haven't trained in a while? Your robots are waiting for new skills!",
      },
    };

    const message = messages[type];
    await this.sendLocalNotification(
      message.title,
      message.body,
      'training',
      { type, ...details }
    );
  }

  async scheduleRecordingReminder(delayMinutes: number): Promise<string> {
    return await this.sendLocalNotification(
      'Recording Reminder',
      'Remember to continue your robot training session',
      'training',
      { type: 'reminder' },
      delayMinutes * 60
    );
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getNotificationHistory(limit: number = 50): Promise<NotificationData[]> {
    return this.notificationHistory.slice(0, limit);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotificationHistory();
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    this.notificationHistory.forEach(n => n.read = true);
    await this.saveNotificationHistory();
  }

  async clearNotificationHistory(): Promise<void> {
    this.notificationHistory = [];
    await this.saveNotificationHistory();
  }

  getUnreadCount(): number {
    return this.notificationHistory.filter(n => !n.read).length;
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.saveSettings();

    // Re-setup categories if they changed
    if (settings.categories) {
      await this.setupNotificationCategories();
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  async updateCategorySettings(categoryId: string, updates: Partial<NotificationCategory>): Promise<void> {
    const categoryIndex = this.settings.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex >= 0) {
      this.settings.categories[categoryIndex] = {
        ...this.settings.categories[categoryIndex],
        ...updates,
      };
      await this.saveSettings();
    }
  }

  private async registerForPushNotifications(): Promise<void> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      this.pushToken = token.data;
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.PUSH_TOKEN, this.pushToken);
      
      console.log('Push token registered:', this.pushToken);
    } catch (error) {
      console.error('Push token registration error:', error);
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    // This would setup notification categories for iOS
    // Android uses channels instead
    console.log('Setting up notification categories');
  }

  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    // Mark as read
    if (notification.request.identifier) {
      this.markNotificationAsRead(notification.request.identifier);
    }

    // Handle different notification types
    switch (data?.type) {
      case 'recording_paused':
        // Navigate to recording screen
        break;
      case 'robot_disconnected':
        // Navigate to robot screen
        break;
      case 'new_skill':
        // Navigate to marketplace
        break;
      default:
        console.log('Unhandled notification response:', data);
    }
  }

  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.settings.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  private async getNextBadgeCount(): Promise<number> {
    const currentBadge = await Notifications.getBadgeCountAsync();
    return currentBadge + 1;
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (error) {
      console.error('Load notification settings error:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Save notification settings error:', error);
    }
  }

  private async loadNotificationHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.HISTORY);
      if (stored) {
        this.notificationHistory = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      console.error('Load notification history error:', error);
    }
  }

  private async saveNotificationHistory(): Promise<void> {
    try {
      // Keep only last 100 notifications
      const historyToSave = this.notificationHistory.slice(0, 100);
      await AsyncStorage.setItem(this.STORAGE_KEYS.HISTORY, JSON.stringify(historyToSave));
    } catch (error) {
      console.error('Save notification history error:', error);
    }
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  dispose(): void {
    this.isInitialized = false;
    this.pushToken = null;
    this.notificationHistory = [];
  }
}

export const notificationService = new NotificationService();