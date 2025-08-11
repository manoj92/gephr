import { HandTrackingService } from '../../src/services/HandTrackingService';
import { DataStorageService } from '../../src/services/DataStorageService';
import { LeRobotDatasetService } from '../../src/services/LeRobotDatasetService';
import { RobotService } from '../../src/services/RobotService';
import { GamificationService } from '../../src/services/GamificationService';

// Mock external dependencies
jest.mock('@mediapipe/hands');
jest.mock('@tensorflow/tfjs-react-native');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('@react-native-community/netinfo');

describe('Data Flow Integration Tests', () => {
  let handTrackingService: HandTrackingService;
  let dataStorageService: DataStorageService;
  let leRobotDatasetService: LeRobotDatasetService;
  let robotService: RobotService;
  let gamificationService: GamificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handTrackingService = new HandTrackingService();
    dataStorageService = new DataStorageService();
    leRobotDatasetService = new LeRobotDatasetService();
    robotService = new RobotService();
    gamificationService = new GamificationService();
  });

  afterEach(() => {
    robotService.dispose();
  });

  describe('Hand Tracking to Dataset Flow', () => {
    it('should process hand tracking data through the complete pipeline', async () => {
      // 1. Mock hand tracking detection
      const mockHandPoses = [{
        keypoints: Array.from({ length: 21 }, (_, i) => ({
          x: 0.5 + i * 0.01,
          y: 0.5 + i * 0.01,
          z: 0,
          confidence: 0.8 + Math.random() * 0.2,
          name: `keypoint_${i}`
        })),
        handedness: 'right' as const,
        confidence: 0.85,
        timestamp: Date.now()
      }];

      // Mock the hand tracking service to return detected poses
      const mockResults = {
        multiHandedness: [{ categoryName: 'Right', score: 0.85 }],
        multiHandLandmarks: [Array.from({ length: 21 }, (_, i) => ({
          x: 0.5 + i * 0.01,
          y: 0.5 + i * 0.01,
          z: 0
        }))],
        multiHandWorldLandmarks: [Array.from({ length: 21 }, () => ({
          x: 0, y: 0, z: 0
        }))]
      };

      // Simulate hand tracking processing
      const processedPoses = (handTrackingService as any).processHandResults(mockResults);
      expect(processedPoses).toHaveLength(1);
      expect(processedPoses[0].handedness).toBe('right');

      // 2. Classify gesture from hand pose
      const gestureType = await handTrackingService.classifyGesture(processedPoses[0]);
      expect(['pick', 'place', 'move', 'rotate', 'open', 'close', 'idle']).toContain(gestureType);

      // 3. Create gesture data
      const gestureData = {
        id: 'test-gesture-1',
        type: gestureType,
        confidence: 0.85,
        timestamp: Date.now(),
        startTime: Date.now() - 1000,
        poses: processedPoses,
        handPoses: processedPoses // Legacy compatibility
      };

      // 4. Store gesture data
      const storageResult = await dataStorageService.storeGesture(gestureData, 'test-user');
      expect(storageResult).toBe(true);

      // 5. Generate LeRobot data point
      const leRobotAction = {
        type: gestureType as any,
        parameters: { position: [0.5, 0.5, 0.5] },
        timestamp: Date.now(),
        confidence: 0.85
      };

      const leRobotDataPoint = {
        observation: {
          timestamp: Date.now(),
          hand_poses: processedPoses,
          camera_frame: {
            width: 640,
            height: 480,
            format: 'rgb' as const,
            data: new ArrayBuffer(0)
          }
        },
        action: leRobotAction,
        reward: 0.8,
        done: false,
        metadata: {
          session_id: gestureData.id,
          device_type: 'mobile',
          recording_quality: 'high',
          environment: 'test_lab'
        }
      };

      const leRobotStorageResult = await dataStorageService.storeLerobotDataPoint(
        leRobotDataPoint, 
        gestureData.id
      );
      expect(leRobotStorageResult).toBe(true);

      // 6. Generate dataset
      const mockGestures = [gestureData];
      (dataStorageService.getGestures as jest.Mock).mockResolvedValue(mockGestures);

      const dataset = await leRobotDatasetService.generateDataset();
      expect(dataset.length).toBeGreaterThan(0);
      expect(dataset[0].action.type).toBe(gestureType);

      // 7. Validate dataset
      const validation = leRobotDatasetService.validateDataset(dataset);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 8. Generate statistics
      const stats = leRobotDatasetService.generateStatistics(dataset);
      expect(stats.totalFrames).toBe(dataset.length);
      expect(stats.totalEpisodes).toBeGreaterThan(0);
    });

    it('should handle recording session with gamification', async () => {
      // Initialize gamification
      await gamificationService.initialize('test-user');
      const initialStats = gamificationService.getStats();
      const initialXP = initialStats.totalXP;

      // Simulate recording completion
      await gamificationService.completeRecording(30000, 15, 'high'); // 30 seconds, 15 gestures, high quality

      // Check XP awarded
      const updatedStats = gamificationService.getStats();
      expect(updatedStats.totalXP).toBeGreaterThan(initialXP);

      // Check challenge progress
      const challenges = gamificationService.getActiveChallenges();
      const dailyChallenge = challenges.find(c => c.name === 'Daily Training');
      expect(dailyChallenge?.progress).toBe(1);
    });
  });

  describe('Robot Control Flow', () => {
    it('should convert LeRobot actions to robot commands', async () => {
      // 1. Create LeRobot action
      const leRobotAction = {
        type: 'pick' as const,
        parameters: { position: [0.5, 0.5, 0.5], force: 0.3 },
        timestamp: Date.now(),
        confidence: 0.9
      };

      // 2. Convert to robot command
      const robotCommand = robotService.convertLeRobotActionToCommand(leRobotAction);
      
      expect(robotCommand.type).toBe('pick');
      expect(robotCommand.priority).toBe('high');
      expect(robotCommand.parameters).toEqual(leRobotAction.parameters);
      expect(robotCommand.id).toBeDefined();

      // 3. Mock robot connection
      const mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1' as const,
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90
      };

      // Mock WebSocket connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global as any).WebSocket = jest.fn().mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      // Connect to robot
      const connectedRobot = await robotService.connectToRobot(mockRobot);
      expect(connectedRobot.isConnected).toBe(true);

      // Send command
      await robotService.sendCommand(connectedRobot.id, robotCommand);
      
      // Verify command was queued
      const commandQueue = robotService.getCommandQueue(connectedRobot.id);
      expect(commandQueue).toContainEqual(expect.objectContaining({
        type: 'pick',
        priority: 'high'
      }));
    });

    it('should handle robot connection with gamification rewards', async () => {
      await gamificationService.initialize('test-user');
      const initialXP = gamificationService.getStats().totalXP;

      // Simulate robot connection
      await gamificationService.connectRobot('unitree_g1', 3000); // 3 second connection time

      // Check XP reward
      const updatedStats = gamificationService.getStats();
      expect(updatedStats.totalXP).toBeGreaterThan(initialXP);

      // Check challenge progress
      const challenges = gamificationService.getActiveChallenges();
      const robotChallenge = challenges.find(c => c.name === 'Robot Master');
      expect(robotChallenge?.progress).toBe(1);
    });
  });

  describe('Data Export Flow', () => {
    it('should export complete dataset for robot training', async () => {
      // 1. Create mock training data
      const mockGestures = Array.from({ length: 10 }, (_, i) => ({
        id: `gesture-${i}`,
        type: ['pick', 'place', 'move'][i % 3],
        confidence: 0.8 + Math.random() * 0.2,
        timestamp: Date.now() + i * 1000,
        poses: [{
          keypoints: Array.from({ length: 21 }, (_, j) => ({
            x: 0.5 + j * 0.01 + Math.random() * 0.1,
            y: 0.5 + j * 0.01 + Math.random() * 0.1,
            z: Math.random() * 0.1,
            confidence: 0.8 + Math.random() * 0.2,
            name: `keypoint_${j}`
          })),
          handedness: 'right' as const,
          confidence: 0.8 + Math.random() * 0.2,
          timestamp: Date.now() + i * 1000
        }],
        environment: 'lab'
      }));

      // Mock data storage
      (dataStorageService.getGestures as jest.Mock).mockResolvedValue(mockGestures);
      (dataStorageService.exportData as jest.Mock).mockResolvedValue('/path/to/export.json');

      // 2. Generate dataset
      const dataset = await leRobotDatasetService.generateDataset({
        qualityFilter: 'medium',
        augmentData: false,
        normalizeActions: true
      });

      expect(dataset.length).toBeGreaterThan(0);

      // 3. Split dataset
      const split = leRobotDatasetService.splitDataset(dataset, {
        splitRatio: { train: 0.7, val: 0.2, test: 0.1 }
      });

      expect(split.train.length + split.val.length + split.test.length).toBe(dataset.length);
      expect(split.train.length).toBeGreaterThan(split.val.length);
      expect(split.train.length).toBeGreaterThan(split.test.length);

      // 4. Validate training split
      const trainValidation = leRobotDatasetService.validateDataset(split.train);
      expect(trainValidation.isValid).toBe(true);

      // 5. Export dataset
      const exportPath = await leRobotDatasetService.exportLeRobotDataset(split.train, {
        description: 'Humanoid training dataset',
        version: '1.0.0'
      });

      expect(exportPath).toBeDefined();
      expect(dataStorageService.exportData).toHaveBeenCalledWith({
        format: 'lerobot',
        includeMetadata: true
      });

      // 6. Generate final statistics
      const finalStats = leRobotDatasetService.generateStatistics(dataset);
      expect(finalStats.totalFrames).toBe(dataset.length);
      expect(finalStats.actionDistribution).toBeDefined();
      expect(Object.keys(finalStats.actionDistribution).length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully', async () => {
      // Test storage failure
      (dataStorageService.getGestures as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(leRobotDatasetService.generateDataset()).rejects.toThrow('Storage error');

      // Test network failure for robot discovery
      const NetInfo = require('@react-native-community/netinfo');
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        type: 'none'
      });

      await expect(robotService.scanForRobots()).rejects.toThrow('Network connection required');

      // Test gamification service resilience
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));

      // Should not throw error, should use defaults
      await expect(gamificationService.initialize('test-user')).resolves.not.toThrow();
      
      const stats = gamificationService.getStats();
      expect(stats.level.level).toBe(1); // Should use default values
    });

    it('should maintain data consistency during failures', async () => {
      // Start a gesture recording
      const gestureData = {
        id: 'test-gesture',
        type: 'pick',
        confidence: 0.9,
        timestamp: Date.now(),
        startTime: Date.now() - 1000,
        poses: [{
          keypoints: [{ x: 0.5, y: 0.5, z: 0, confidence: 0.9, name: 'wrist' }],
          handedness: 'right' as const,
          confidence: 0.9,
          timestamp: Date.now()
        }],
        handPoses: []
      };

      // Mock storage failure on first attempt, success on second
      let attemptCount = 0;
      (dataStorageService.storeGesture as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve(false); // First attempt fails
        }
        return Promise.resolve(true); // Second attempt succeeds
      });

      // First attempt should return false
      const firstResult = await dataStorageService.storeGesture(gestureData);
      expect(firstResult).toBe(false);

      // Second attempt should succeed
      const secondResult = await dataStorageService.storeGesture(gestureData);
      expect(secondResult).toBe(true);

      expect(attemptCount).toBe(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large mock dataset
      const largeGestureSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `gesture-${i}`,
        type: ['pick', 'place', 'move', 'rotate', 'open', 'close'][i % 6],
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: Date.now() + i * 100,
        poses: [{
          keypoints: Array.from({ length: 21 }, (_, j) => ({
            x: Math.random(),
            y: Math.random(),
            z: Math.random() * 0.1,
            confidence: 0.7 + Math.random() * 0.3,
            name: `keypoint_${j}`
          })),
          handedness: ['left', 'right'][i % 2] as 'left' | 'right',
          confidence: 0.7 + Math.random() * 0.3,
          timestamp: Date.now() + i * 100
        }],
        environment: 'performance_test'
      }));

      (dataStorageService.getGestures as jest.Mock).mockResolvedValue(largeGestureSet);

      const startTime = Date.now();
      
      // Generate dataset from large gesture set
      const dataset = await leRobotDatasetService.generateDataset({
        augmentData: false // Disable augmentation for performance test
      });

      const processingTime = Date.now() - startTime;

      // Should complete within reasonable time (10 seconds for 1000 gestures)
      expect(processingTime).toBeLessThan(10000);
      expect(dataset.length).toBeGreaterThan(0);

      // Test statistics generation performance
      const statsStartTime = Date.now();
      const stats = leRobotDatasetService.generateStatistics(dataset);
      const statsTime = Date.now() - statsStartTime;

      expect(statsTime).toBeLessThan(1000); // Should complete within 1 second
      expect(stats.totalFrames).toBe(dataset.length);
    });

    it('should handle concurrent operations', async () => {
      await gamificationService.initialize('test-user');

      // Simulate concurrent XP awards (multiple recording sessions)
      const xpPromises = Array.from({ length: 10 }, (_, i) => 
        gamificationService.awardXP(50 * (i + 1), `concurrent_test_${i}`)
      );

      const results = await Promise.all(xpPromises);

      // All operations should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Final XP should be sum of all awards
      const finalStats = gamificationService.getStats();
      expect(finalStats.totalXP).toBe(50 + 100 + 150 + 200 + 250 + 300 + 350 + 400 + 450 + 500); // Sum of 50*(1+2+...+10)
    });
  });
});