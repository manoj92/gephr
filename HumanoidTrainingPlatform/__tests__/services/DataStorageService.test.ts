import { DataStorageService } from '../../src/services/DataStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Mock the services
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('expo-secure-store');

describe('DataStorageService', () => {
  let dataStorageService: DataStorageService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    dataStorageService = new DataStorageService();
  });

  describe('Gesture Storage', () => {
    it('should store a gesture successfully', async () => {
      const mockGesture = {
        id: 'test-gesture-1',
        type: 'pick',
        confidence: 0.9,
        timestamp: Date.now(),
        startTime: Date.now() - 1000,
        poses: [{
          keypoints: [
            { x: 0.5, y: 0.5, z: 0, confidence: 0.9, name: 'wrist' }
          ],
          handedness: 'right' as const,
          confidence: 0.9,
          timestamp: Date.now()
        }],
        handPoses: []
      };

      // Mock AsyncStorage to return empty array initially
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await dataStorageService.storeGesture(mockGesture);

      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('stored_gestures');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'stored_gestures',
        expect.stringContaining(mockGesture.id)
      );
    });

    it('should handle gesture storage errors gracefully', async () => {
      const mockGesture = {
        id: 'test-gesture-1',
        type: 'pick',
        confidence: 0.9,
        timestamp: Date.now(),
        startTime: Date.now() - 1000,
        poses: [],
        handPoses: []
      };

      // Mock AsyncStorage to throw an error
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await dataStorageService.storeGesture(mockGesture);

      expect(result).toBe(false);
    });
  });

  describe('LeRobot Data Points', () => {
    it('should store a LeRobot data point successfully', async () => {
      const mockDataPoint = {
        observation: {
          timestamp: Date.now(),
          hand_poses: [],
          camera_frame: {
            width: 640,
            height: 480,
            format: 'rgb' as const,
            data: new ArrayBuffer(0)
          }
        },
        action: {
          type: 'pick' as const,
          parameters: { position: [0.5, 0.5, 0.5] },
          timestamp: Date.now(),
          confidence: 0.9
        },
        reward: 1.0,
        done: false,
        metadata: {
          session_id: 'test-session',
          device_type: 'mobile',
          recording_quality: 'high',
          environment: 'test'
        }
      };

      // Mock AsyncStorage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await dataStorageService.storeLerobotDataPoint(mockDataPoint, 'test-gesture');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'lerobot_data_points',
        expect.stringContaining('test-gesture')
      );
    });

    it('should store multiple data points in batch', async () => {
      const mockDataPoints = Array.from({ length: 5 }, (_, i) => ({
        observation: {
          timestamp: Date.now() + i,
          hand_poses: [],
          camera_frame: {
            width: 640,
            height: 480,
            format: 'rgb' as const,
            data: new ArrayBuffer(0)
          }
        },
        action: {
          type: 'pick' as const,
          parameters: { position: [0.5, 0.5, 0.5] },
          timestamp: Date.now() + i,
          confidence: 0.9
        },
        reward: 1.0,
        done: i === 4,
        metadata: {
          session_id: 'test-session',
          device_type: 'mobile',
          recording_quality: 'high',
          environment: 'test'
        }
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await dataStorageService.storeLerobotDataPointsBatch(mockDataPoints, 'test-gesture');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Export', () => {
    it('should export data in JSON format', async () => {
      const mockGestures = [{
        id: 'test-gesture',
        type: 'pick',
        confidence: 0.9,
        timestamp: Date.now(),
        poses: []
      }];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockGestures));
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await dataStorageService.exportData({
        format: 'json',
        includeMetadata: true
      });

      expect(result).toContain('exports/');
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.stringContaining('test-gesture')
      );
    });

    it('should export data in CSV format', async () => {
      const mockGestures = [{
        id: 'test-gesture',
        type: 'pick',
        confidence: 0.9,
        timestamp: Date.now(),
        poses: [{
          keypoints: [{ x: 0.5, y: 0.5, z: 0, confidence: 0.9, name: 'wrist' }],
          handedness: 'right' as const,
          confidence: 0.9,
          timestamp: Date.now()
        }]
      }];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockGestures));
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await dataStorageService.exportData({
        format: 'csv'
      });

      expect(result).toContain('.csv');
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('.csv'),
        expect.stringContaining('id,type,confidence')
      );
    });
  });

  describe('Storage Statistics', () => {
    it('should return correct storage statistics', async () => {
      const mockGestures = Array.from({ length: 10 }, (_, i) => ({ id: `gesture-${i}` }));
      const mockDataPoints = Array.from({ length: 50 }, (_, i) => ({ id: `dp-${i}` }));
      const mockSessions = Array.from({ length: 3 }, (_, i) => ({ id: `session-${i}` }));

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockGestures))
        .mockResolvedValueOnce(JSON.stringify(mockDataPoints))
        .mockResolvedValueOnce(JSON.stringify(mockSessions))
        .mockResolvedValueOnce('[]'); // export history

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 1024 * 1024 // 1MB
      });

      const stats = await dataStorageService.getStorageStats();

      expect(stats.totalGestures).toBe(10);
      expect(stats.totalDataPoints).toBe(50);
      expect(stats.totalSessions).toBe(3);
      expect(stats.storageUsed).toBe(1024 * 1024);
    });
  });

  describe('Data Management', () => {
    it('should clear all data successfully', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValueOnce(undefined);
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValueOnce(['file1.json', 'file2.csv']);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await dataStorageService.clearAllData();

      expect(result).toBe(true);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'stored_gestures',
        'training_sessions',
        'lerobot_data_points',
        'dataset_metadata',
        'export_history'
      ]);
    });

    it('should create backup successfully', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('[]') // gestures
        .mockResolvedValueOnce('[]') // sessions
        .mockResolvedValueOnce('[]') // lerobot data
        .mockResolvedValueOnce('{}'); // metadata

      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValueOnce(undefined);

      const backupPath = await dataStorageService.createBackup();

      expect(backupPath).toContain('backups/backup_');
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('backup_'),
        expect.stringContaining('"version":"1.0.0"')
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      await dataStorageService.clearCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('data_cache');
    });
  });

  describe('Secure Data', () => {
    it('should store and retrieve secure data', async () => {
      const mockSecureStore = require('expo-secure-store');
      mockSecureStore.setItemAsync.mockResolvedValueOnce(undefined);
      mockSecureStore.getItemAsync.mockResolvedValueOnce('secure-value');

      const storeResult = await dataStorageService.storeSecureData('test-key', 'test-value');
      const retrieveResult = await dataStorageService.getSecureData('test-key');

      expect(storeResult).toBe(true);
      expect(retrieveResult).toBe('secure-value');
    });
  });
});