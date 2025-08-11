import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { LerobotDataPoint, LerobotObservation, LerobotAction, HandPose, CameraFrame } from '../types';

export interface GestureData {
  id: string;
  type: string;
  confidence: number;
  timestamp: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  taskType?: string;
  environment?: any;
  poses: HandPose[];
  handPoses: HandPose[]; // Legacy compatibility
}

export interface DataExportOptions {
  format: 'lerobot' | 'json' | 'csv' | 'hdf5';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  compression?: boolean;
  batchSize?: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface TrainingSession {
  id: string;
  name: string;
  description: string;
  robotType: string;
  startTime: Date;
  endTime?: Date;
  totalGestures: number;
  totalDataPoints: number;
  quality: 'low' | 'medium' | 'high';
  environment: string;
  userId: string;
  metadata: Record<string, any>;
}

export interface DatasetMetadata {
  version: string;
  created_at: string;
  updated_at: string;
  total_episodes: number;
  total_frames: number;
  fps: number;
  image_keys: string[];
  state_keys: string[];
  action_keys: string[];
  robot_type: string;
  environment: string;
  dataset_type: 'hand_tracking' | 'full_robot' | 'simulation';
}

export class DataStorageService {
  private isInitialized = false;
  private readonly STORAGE_KEYS = {
    GESTURES: 'stored_gestures',
    SESSIONS: 'training_sessions',
    LEROBOT_DATA: 'lerobot_data_points',
    METADATA: 'dataset_metadata',
    EXPORT_HISTORY: 'export_history',
    CACHE: 'data_cache',
  };

  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private cache: Map<string, { data: any; timestamp: number; size: number }> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await this.ensureDirectoriesExist();
      
      // Load cache from storage
      await this.loadCache();
      
      this.isInitialized = true;
      console.log('DataStorageService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DataStorageService:', error);
    }
  }

  private async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      `${FileSystem.documentDirectory}datasets/`,
      `${FileSystem.documentDirectory}exports/`,
      `${FileSystem.documentDirectory}cache/`,
      `${FileSystem.documentDirectory}backups/`,
    ];

    for (const dir of directories) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(this.STORAGE_KEYS.CACHE);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (Date.now() - value.timestamp < this.CACHE_DURATION) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheObject: Record<string, any> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      await AsyncStorage.setItem(this.STORAGE_KEYS.CACHE, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private getCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private setCache(key: string, data: any): void {
    const size = JSON.stringify(data).length;
    
    // Check cache size limit
    let totalSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
    
    while (totalSize + size > this.MAX_CACHE_SIZE && this.cache.size > 0) {
      // Remove oldest cache entry
      const oldestKey = Array.from(this.cache.keys())[0];
      const removed = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      totalSize -= removed?.size || 0;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
    
    // Save cache asynchronously
    this.saveCache().catch(console.error);
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Store a gesture with its hand poses
   */
  public async storeGesture(gesture: GestureData, userId: string = 'anonymous'): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('DataStorageService not initialized');
      return false;
    }

    try {
      const gestureWithUser = { ...gesture, userId, createdAt: Date.now() };
      
      // Get existing gestures
      const existingGestures = await this.getStoredData<GestureData[]>(this.STORAGE_KEYS.GESTURES, []);
      
      // Add new gesture
      existingGestures.push(gestureWithUser);
      
      // Store updated gestures
      await this.storeData(this.STORAGE_KEYS.GESTURES, existingGestures);
      
      // Clear cache for gesture-related operations
      this.clearCacheByPrefix('getGestures');
      
      console.log(`Gesture ${gesture.id} stored successfully`);
      return true;
    } catch (error) {
      console.error('Failed to store gesture:', error);
      return false;
    }
  }

  /**
   * Store LeRobot data point with optimization for batch operations
   */
  public async storeLerobotDataPoint(dataPoint: LerobotDataPoint, gestureId: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('DataStorageService not initialized');
      return false;
    }

    try {
      const dataPointWithMeta = {
        ...dataPoint,
        gestureId,
        createdAt: Date.now(),
        id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      
      // Get existing data points
      const existingDataPoints = await this.getStoredData<any[]>(this.STORAGE_KEYS.LEROBOT_DATA, []);
      
      // Add new data point
      existingDataPoints.push(dataPointWithMeta);
      
      // Store updated data points
      await this.storeData(this.STORAGE_KEYS.LEROBOT_DATA, existingDataPoints);
      
      // Clear relevant cache
      this.clearCacheByPrefix('getLerobotData');
      
      console.log('LeRobot data point stored successfully');
      return true;
    } catch (error) {
      console.error('Failed to store LeRobot data point:', error);
      return false;
    }
  }

  /**
   * Store multiple LeRobot data points in batch for better performance
   */
  public async storeLerobotDataPointsBatch(dataPoints: LerobotDataPoint[], gestureId: string): Promise<boolean> {
    if (!this.isInitialized || dataPoints.length === 0) {
      return false;
    }

    try {
      const dataPointsWithMeta = dataPoints.map((dp, index) => ({
        ...dp,
        gestureId,
        createdAt: Date.now(),
        id: `dp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      // Get existing data points
      const existingDataPoints = await this.getStoredData<any[]>(this.STORAGE_KEYS.LEROBOT_DATA, []);
      
      // Add new data points
      existingDataPoints.push(...dataPointsWithMeta);
      
      // Store updated data points
      await this.storeData(this.STORAGE_KEYS.LEROBOT_DATA, existingDataPoints);
      
      // Clear relevant cache
      this.clearCacheByPrefix('getLerobotData');
      
      console.log(`${dataPoints.length} LeRobot data points stored successfully`);
      return true;
    } catch (error) {
      console.error('Failed to store LeRobot data points batch:', error);
      return false;
    }
  }

  /**
   * Create and manage training sessions
   */
  public async createTrainingSession(session: Omit<TrainingSession, 'id' | 'totalGestures' | 'totalDataPoints'>): Promise<TrainingSession> {
    const fullSession: TrainingSession = {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalGestures: 0,
      totalDataPoints: 0,
    };

    const existingSessions = await this.getStoredData<TrainingSession[]>(this.STORAGE_KEYS.SESSIONS, []);
    existingSessions.push(fullSession);
    await this.storeData(this.STORAGE_KEYS.SESSIONS, existingSessions);

    return fullSession;
  }

  public async updateTrainingSession(sessionId: string, updates: Partial<TrainingSession>): Promise<boolean> {
    try {
      const sessions = await this.getStoredData<TrainingSession[]>(this.STORAGE_KEYS.SESSIONS, []);
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        return false;
      }

      sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
      await this.storeData(this.STORAGE_KEYS.SESSIONS, sessions);
      
      return true;
    } catch (error) {
      console.error('Failed to update training session:', error);
      return false;
    }
  }

  /**
   * Retrieve gestures with caching and filtering
   */
  public async getGestures(options: {
    userId?: string;
    gestureType?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<GestureData[]> {
    const cacheKey = this.getCacheKey('getGestures', options);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let gestures = await this.getStoredData<GestureData[]>(this.STORAGE_KEYS.GESTURES, []);

      // Apply filters
      if (options.userId) {
        gestures = gestures.filter(g => (g as any).userId === options.userId);
      }

      if (options.gestureType) {
        gestures = gestures.filter(g => g.type === options.gestureType);
      }

      if (options.startDate) {
        gestures = gestures.filter(g => g.timestamp >= options.startDate!.getTime());
      }

      if (options.endDate) {
        gestures = gestures.filter(g => g.timestamp <= options.endDate!.getTime());
      }

      // Sort by timestamp (newest first)
      gestures.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      if (options.offset) {
        gestures = gestures.slice(options.offset);
      }

      if (options.limit) {
        gestures = gestures.slice(0, options.limit);
      }

      this.setCache(cacheKey, gestures);
      return gestures;
    } catch (error) {
      console.error('Failed to retrieve gestures:', error);
      return [];
    }
  }

  /**
   * Export data in various formats with streaming for large datasets
   */
  public async exportData(options: DataExportOptions): Promise<string | null> {
    if (!this.isInitialized) {
      console.error('DataStorageService not initialized');
      return null;
    }

    try {
      const timestamp = Date.now();
      const exportId = `export_${timestamp}`;
      
      let filename: string;
      let exportPath: string;

      switch (options.format) {
        case 'lerobot':
          filename = `lerobot_dataset_${timestamp}.json`;
          exportPath = await this.exportLerobotFormat(options, filename);
          break;

        case 'json':
          filename = `gestures_export_${timestamp}.json`;
          exportPath = await this.exportJsonFormat(options, filename);
          break;

        case 'csv':
          filename = `gestures_export_${timestamp}.csv`;
          exportPath = await this.exportCsvFormat(options, filename);
          break;

        case 'hdf5':
          filename = `dataset_${timestamp}.h5`;
          exportPath = await this.exportHdf5Format(options, filename);
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Save export history
      await this.saveExportHistory({
        id: exportId,
        format: options.format,
        filename,
        path: exportPath,
        timestamp,
        options,
      });

      console.log(`Data exported successfully: ${exportPath}`);
      return exportPath;
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  private async exportLerobotFormat(options: DataExportOptions, filename: string): Promise<string> {
    const gestures = await this.getGestures({
      startDate: options.dateRange?.start,
      endDate: options.dateRange?.end,
    });

    const dataPoints = await this.getStoredData<any[]>(this.STORAGE_KEYS.LEROBOT_DATA, []);
    
    // Filter data points by gesture IDs if date range is specified
    const gestureIds = new Set(gestures.map(g => g.id));
    const relevantDataPoints = dataPoints.filter(dp => gestureIds.has(dp.gestureId));

    const metadata: DatasetMetadata = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_episodes: gestures.length,
      total_frames: relevantDataPoints.length,
      fps: 30,
      image_keys: ['camera_frame'],
      state_keys: ['hand_poses'],
      action_keys: ['robot_action'],
      robot_type: 'humanoid',
      environment: 'real_world',
      dataset_type: 'hand_tracking',
    };

    const lerobotDataset = {
      info: metadata,
      data: relevantDataPoints.map(dp => ({
        observation: dp.observation,
        action: dp.action,
        reward: dp.reward || 0.0,
        done: dp.done || false,
        metadata: dp.metadata,
      })),
    };

    const exportPath = `${FileSystem.documentDirectory}exports/${filename}`;
    await FileSystem.writeAsStringAsync(exportPath, JSON.stringify(lerobotDataset, null, 2));
    
    return exportPath;
  }

  private async exportJsonFormat(options: DataExportOptions, filename: string): Promise<string> {
    const gestures = await this.getGestures({
      startDate: options.dateRange?.start,
      endDate: options.dateRange?.end,
    });

    const exportData = {
      meta: {
        exportDate: new Date().toISOString(),
        totalGestures: gestures.length,
        includeMetadata: options.includeMetadata || false,
        quality: options.quality || 'medium',
      },
      gestures: options.includeMetadata ? gestures : gestures.map(g => ({
        id: g.id,
        type: g.type,
        confidence: g.confidence,
        timestamp: g.timestamp,
        poses: g.poses,
      })),
    };

    const exportPath = `${FileSystem.documentDirectory}exports/${filename}`;
    await FileSystem.writeAsStringAsync(exportPath, JSON.stringify(exportData, null, 2));
    
    return exportPath;
  }

  private async exportCsvFormat(options: DataExportOptions, filename: string): Promise<string> {
    const gestures = await this.getGestures({
      startDate: options.dateRange?.start,
      endDate: options.dateRange?.end,
    });

    const headers = ['id', 'type', 'confidence', 'timestamp', 'duration', 'handedness', 'num_landmarks', 'pose_confidence'];
    const rows = [headers.join(',')];

    for (const gesture of gestures) {
      for (const pose of gesture.poses) {
        rows.push([
          gesture.id,
          gesture.type,
          gesture.confidence,
          gesture.timestamp,
          gesture.duration || 0,
          pose.handedness,
          pose.keypoints.length,
          pose.confidence,
        ].join(','));
      }
    }

    const csvContent = rows.join('\\n');
    const exportPath = `${FileSystem.documentDirectory}exports/${filename}`;
    await FileSystem.writeAsStringAsync(exportPath, csvContent);
    
    return exportPath;
  }

  private async exportHdf5Format(options: DataExportOptions, filename: string): Promise<string> {
    // For now, export as a structured JSON that can be converted to HDF5
    // In a full implementation, you'd use a proper HDF5 library
    const gestures = await this.getGestures({
      startDate: options.dateRange?.start,
      endDate: options.dateRange?.end,
    });

    const dataPoints = await this.getStoredData<any[]>(this.STORAGE_KEYS.LEROBOT_DATA, []);
    const gestureIds = new Set(gestures.map(g => g.id));
    const relevantDataPoints = dataPoints.filter(dp => gestureIds.has(dp.gestureId));

    const hdf5Structure = {
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        format: 'HDF5-compatible JSON',
      },
      observations: {
        hand_poses: relevantDataPoints.map(dp => dp.observation.hand_poses),
        camera_frames: relevantDataPoints.map(dp => dp.observation.camera_frame),
        timestamps: relevantDataPoints.map(dp => dp.observation.timestamp),
      },
      actions: {
        robot_actions: relevantDataPoints.map(dp => dp.action),
        timestamps: relevantDataPoints.map(dp => dp.action.timestamp),
      },
      rewards: relevantDataPoints.map(dp => dp.reward || 0.0),
      dones: relevantDataPoints.map(dp => dp.done || false),
    };

    const exportPath = `${FileSystem.documentDirectory}exports/${filename}`;
    await FileSystem.writeAsStringAsync(exportPath, JSON.stringify(hdf5Structure, null, 2));
    
    return exportPath;
  }

  /**
   * Share exported data
   */
  public async shareExportedData(filePath: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
        return true;
      } else {
        console.warn('Sharing is not available on this device');
        return false;
      }
    } catch (error) {
      console.error('Failed to share exported data:', error);
      return false;
    }
  }

  /**
   * Get storage statistics with caching
   */
  public async getStorageStats(): Promise<{
    totalGestures: number;
    totalDataPoints: number;
    totalSessions: number;
    storageUsed: number;
    cacheSize: number;
    lastExport?: Date;
  }> {
    const cacheKey = this.getCacheKey('getStorageStats', {});
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const gestures = await this.getStoredData<GestureData[]>(this.STORAGE_KEYS.GESTURES, []);
      const dataPoints = await this.getStoredData<any[]>(this.STORAGE_KEYS.LEROBOT_DATA, []);
      const sessions = await this.getStoredData<TrainingSession[]>(this.STORAGE_KEYS.SESSIONS, []);
      const exportHistory = await this.getStoredData<any[]>(this.STORAGE_KEYS.EXPORT_HISTORY, []);

      // Calculate storage usage
      let storageUsed = 0;
      try {
        const documentsInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
        storageUsed = documentsInfo.size || 0;
      } catch (error) {
        console.warn('Could not calculate storage usage:', error);
      }

      // Calculate cache size
      const cacheSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);

      const lastExportTimestamp = exportHistory.length > 0 
        ? Math.max(...exportHistory.map(e => e.timestamp))
        : null;

      const stats = {
        totalGestures: gestures.length,
        totalDataPoints: dataPoints.length,
        totalSessions: sessions.length,
        storageUsed,
        cacheSize,
        lastExport: lastExportTimestamp ? new Date(lastExportTimestamp) : undefined,
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalGestures: 0,
        totalDataPoints: 0,
        totalSessions: 0,
        storageUsed: 0,
        cacheSize: 0,
      };
    }
  }

  /**
   * Clear cache by prefix
   */
  private clearCacheByPrefix(prefix: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem(this.STORAGE_KEYS.CACHE);
  }

  /**
   * Backup data to file
   */
  public async createBackup(): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const backupData = {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        gestures: await this.getStoredData(this.STORAGE_KEYS.GESTURES, []),
        sessions: await this.getStoredData(this.STORAGE_KEYS.SESSIONS, []),
        lerobotData: await this.getStoredData(this.STORAGE_KEYS.LEROBOT_DATA, []),
        metadata: await this.getStoredData(this.STORAGE_KEYS.METADATA, {}),
      };

      const backupPath = `${FileSystem.documentDirectory}backups/backup_${timestamp}.json`;
      await FileSystem.writeAsStringAsync(backupPath, JSON.stringify(backupData, null, 2));
      
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }

  /**
   * Restore data from backup
   */
  public async restoreFromBackup(backupPath: string): Promise<boolean> {
    try {
      const backupContent = await FileSystem.readAsStringAsync(backupPath);
      const backupData = JSON.parse(backupContent);

      await this.storeData(this.STORAGE_KEYS.GESTURES, backupData.gestures || []);
      await this.storeData(this.STORAGE_KEYS.SESSIONS, backupData.sessions || []);
      await this.storeData(this.STORAGE_KEYS.LEROBOT_DATA, backupData.lerobotData || []);
      await this.storeData(this.STORAGE_KEYS.METADATA, backupData.metadata || {});

      // Clear cache to force reload
      await this.clearCache();

      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  // Helper methods
  private async storeData<T>(key: string, data: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  }

  private async getStoredData<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error(`Failed to get stored data for key ${key}:`, error);
      return defaultValue;
    }
  }

  private async saveExportHistory(exportRecord: any): Promise<void> {
    const history = await this.getStoredData<any[]>(this.STORAGE_KEYS.EXPORT_HISTORY, []);
    history.push(exportRecord);
    
    // Keep only last 50 export records
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    await this.storeData(this.STORAGE_KEYS.EXPORT_HISTORY, history);
  }

  public async getExportHistory(): Promise<any[]> {
    return this.getStoredData<any[]>(this.STORAGE_KEYS.EXPORT_HISTORY, []);
  }

  public async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.GESTURES,
        this.STORAGE_KEYS.SESSIONS,
        this.STORAGE_KEYS.LEROBOT_DATA,
        this.STORAGE_KEYS.METADATA,
        this.STORAGE_KEYS.EXPORT_HISTORY,
      ]);

      await this.clearCache();

      // Clear export files
      try {
        const exportDir = `${FileSystem.documentDirectory}exports/`;
        const exportFiles = await FileSystem.readDirectoryAsync(exportDir);
        
        for (const file of exportFiles) {
          await FileSystem.deleteAsync(`${exportDir}${file}`, { idempotent: true });
        }
      } catch (error) {
        console.warn('Failed to clear export files:', error);
      }

      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Store sensitive data securely
   */
  public async storeSecureData(key: string, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error('Failed to store secure data:', error);
      return false;
    }
  }

  /**
   * Get sensitive data securely
   */
  public async getSecureData(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }
}

export const dataStorageService = new DataStorageService();