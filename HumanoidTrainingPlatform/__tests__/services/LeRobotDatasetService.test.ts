import { LeRobotDatasetService } from '../../src/services/LeRobotDatasetService';
import { dataStorageService } from '../../src/services/DataStorageService';
import { LerobotDataPoint } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/DataStorageService');

describe('LeRobotDatasetService', () => {
  let leRobotDatasetService: LeRobotDatasetService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    leRobotDatasetService = new LeRobotDatasetService();
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = (leRobotDatasetService as any).config;
      
      expect(config.fps).toBe(30);
      expect(config.imageResolution).toEqual([640, 480]);
      expect(config.actionSpace.type).toBe('continuous');
      expect(config.actionSpace.dimensions).toBe(6);
      expect(config.robotType).toBe('humanoid');
    });

    it('should update configuration', () => {
      leRobotDatasetService.updateConfig({
        fps: 60,
        robotType: 'quadruped',
      });
      
      const config = (leRobotDatasetService as any).config;
      expect(config.fps).toBe(60);
      expect(config.robotType).toBe('quadruped');
      expect(config.imageResolution).toEqual([640, 480]); // Should keep existing values
    });
  });

  describe('Dataset Generation', () => {
    const mockGestures = [
      {
        id: 'gesture-1',
        type: 'pick',
        confidence: 0.9,
        timestamp: Date.now(),
        poses: [
          {
            keypoints: [
              { x: 0.5, y: 0.5, z: 0, confidence: 0.9, name: 'wrist' },
              { x: 0.6, y: 0.4, z: 0, confidence: 0.8, name: 'thumb_tip' },
              { x: 0.7, y: 0.3, z: 0, confidence: 0.8, name: 'index_tip' },
              { x: 0.4, y: 0.6, z: 0, confidence: 0.7, name: 'middle_tip' },
              { x: 0.3, y: 0.7, z: 0, confidence: 0.7, name: 'ring_tip' },
              { x: 0.2, y: 0.8, z: 0, confidence: 0.6, name: 'pinky_tip' },
              // Add more keypoints to reach 21
              ...Array.from({ length: 15 }, (_, i) => ({ 
                x: 0.5 + i * 0.01, 
                y: 0.5 + i * 0.01, 
                z: 0, 
                confidence: 0.8, 
                name: `keypoint_${i + 6}` 
              }))
            ],
            handedness: 'right' as const,
            confidence: 0.85,
            timestamp: Date.now(),
          }
        ],
        environment: 'test_lab',
      },
      {
        id: 'gesture-2', 
        type: 'place',
        confidence: 0.8,
        timestamp: Date.now() + 1000,
        poses: [
          {
            keypoints: Array.from({ length: 21 }, (_, i) => ({ 
              x: 0.4 + i * 0.01, 
              y: 0.4 + i * 0.01, 
              z: 0, 
              confidence: 0.7, 
              name: `keypoint_${i}` 
            })),
            handedness: 'left' as const,
            confidence: 0.8,
            timestamp: Date.now() + 1000,
          }
        ],
        environment: 'test_lab',
      }
    ];

    beforeEach(() => {
      (dataStorageService.getGestures as jest.Mock).mockResolvedValue(mockGestures);
    });

    it('should generate dataset from gestures', async () => {
      const dataPoints = await leRobotDatasetService.generateDataset();
      
      expect(dataPoints.length).toBeGreaterThan(0);
      expect(dataStorageService.getGestures).toHaveBeenCalled();
      
      // Check data point structure
      const firstPoint = dataPoints[0];
      expect(firstPoint).toHaveProperty('observation');
      expect(firstPoint).toHaveProperty('action');
      expect(firstPoint).toHaveProperty('reward');
      expect(firstPoint).toHaveProperty('done');
      expect(firstPoint).toHaveProperty('metadata');
    });

    it('should filter gestures by quality', async () => {
      const highQualityGesture = {
        ...mockGestures[0],
        confidence: 0.95,
        poses: mockGestures[0].poses.map(p => ({ ...p, confidence: 0.9 }))
      };
      
      const lowQualityGesture = {
        ...mockGestures[1],
        confidence: 0.4,
        poses: mockGestures[1].poses.map(p => ({ ...p, confidence: 0.3 }))
      };

      (dataStorageService.getGestures as jest.Mock).mockResolvedValue([
        highQualityGesture,
        lowQualityGesture
      ]);

      const dataPoints = await leRobotDatasetService.generateDataset({
        qualityFilter: 'high'
      });

      // Should only include high quality gesture
      expect(dataPoints.length).toBe(1);
      expect(dataPoints[0].metadata.gesture_type).toBe('pick');
    });

    it('should handle empty gesture data', async () => {
      (dataStorageService.getGestures as jest.Mock).mockResolvedValue([]);

      await expect(leRobotDatasetService.generateDataset())
        .rejects.toThrow('No gesture data found');
    });
  });

  describe('Action Generation', () => {
    it('should generate appropriate actions from gestures', async () => {
      const mockPose = {
        keypoints: Array.from({ length: 21 }, (_, i) => ({ 
          x: 0.5 + i * 0.01, 
          y: 0.5 + i * 0.01, 
          z: 0, 
          confidence: 0.8, 
          name: `keypoint_${i}` 
        })),
        handedness: 'right' as const,
        confidence: 0.85,
        timestamp: Date.now(),
      };

      const mockGesture = {
        id: 'test-gesture',
        type: 'pick',
        confidence: 0.9,
        poses: [mockPose],
        environment: 'test'
      };

      const action = (leRobotDatasetService as any).generateActionFromGesture(
        mockGesture, 
        mockPose, 
        0
      );

      expect(action.type).toBe('pick');
      expect(action.parameters).toHaveProperty('position');
      expect(action.parameters).toHaveProperty('gripper_action');
      expect(action.confidence).toBeLessThanOrEqual(Math.min(mockPose.confidence, mockGesture.confidence));
    });

    it('should generate different actions for different gesture types', async () => {
      const mockPose = {
        keypoints: Array.from({ length: 21 }, (_, i) => ({ 
          x: 0.5, y: 0.5, z: 0, confidence: 0.8, name: `keypoint_${i}` 
        })),
        handedness: 'right' as const,
        confidence: 0.85,
        timestamp: Date.now(),
      };

      const gestureTypes = ['pick', 'place', 'move', 'rotate', 'open', 'close'];
      const actions = gestureTypes.map(type => {
        const gesture = { id: 'test', type, confidence: 0.9, poses: [mockPose] };
        return (leRobotDatasetService as any).generateActionFromGesture(gesture, mockPose, 0);
      });

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('pick');
      expect(actionTypes).toContain('place');
      expect(actionTypes).toContain('move');
    });
  });

  describe('Dataset Splitting', () => {
    const mockDataPoints: LerobotDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
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
        type: 'move' as const,
        parameters: { position: [0, 0, 0] },
        timestamp: Date.now() + i,
        confidence: 0.8
      },
      reward: 0.5,
      done: false,
      metadata: {
        session_id: `session-${Math.floor(i / 10)}`,
        device_type: 'mobile',
        recording_quality: 'medium',
        environment: 'test'
      }
    }));

    it('should split dataset with default ratios', () => {
      const split = leRobotDatasetService.splitDataset(mockDataPoints);

      expect(split.train.length).toBe(70); // 70%
      expect(split.val.length).toBe(15);   // 15%
      expect(split.test.length).toBe(15);  // 15%
      expect(split.train.length + split.val.length + split.test.length).toBe(100);
    });

    it('should split dataset with custom ratios', () => {
      const split = leRobotDatasetService.splitDataset(mockDataPoints, {
        splitRatio: { train: 0.8, val: 0.1, test: 0.1 }
      });

      expect(split.train.length).toBe(80);
      expect(split.val.length).toBe(10);
      expect(split.test.length).toBe(10);
    });

    it('should handle empty dataset', () => {
      const split = leRobotDatasetService.splitDataset([]);

      expect(split.train.length).toBe(0);
      expect(split.val.length).toBe(0);
      expect(split.test.length).toBe(0);
    });
  });

  describe('Dataset Statistics', () => {
    const mockDataPoints: LerobotDataPoint[] = [
      {
        observation: {
          timestamp: 1000,
          hand_poses: [],
          camera_frame: { width: 640, height: 480, format: 'rgb' as const, data: new ArrayBuffer(0) }
        },
        action: {
          type: 'pick' as const,
          parameters: {},
          timestamp: 1000,
          confidence: 0.9
        },
        reward: 1.0,
        done: false,
        metadata: { session_id: 'session-1', device_type: 'mobile', recording_quality: 'high', environment: 'lab' }
      },
      {
        observation: {
          timestamp: 2000,
          hand_poses: [],
          camera_frame: { width: 640, height: 480, format: 'rgb' as const, data: new ArrayBuffer(0) }
        },
        action: {
          type: 'place' as const,
          parameters: {},
          timestamp: 2000,
          confidence: 0.8
        },
        reward: 0.8,
        done: true,
        metadata: { session_id: 'session-1', device_type: 'mobile', recording_quality: 'medium', environment: 'lab' }
      },
      {
        observation: {
          timestamp: 3000,
          hand_poses: [],
          camera_frame: { width: 640, height: 480, format: 'rgb' as const, data: new ArrayBuffer(0) }
        },
        action: {
          type: 'pick' as const,
          parameters: {},
          timestamp: 3000,
          confidence: 0.7
        },
        reward: 0.6,
        done: false,
        metadata: { session_id: 'session-2', device_type: 'mobile', recording_quality: 'low', environment: 'lab' }
      }
    ];

    it('should generate correct statistics', () => {
      const stats = leRobotDatasetService.generateStatistics(mockDataPoints);

      expect(stats.totalEpisodes).toBe(2); // 2 unique session_ids
      expect(stats.totalFrames).toBe(3);
      expect(stats.averageEpisodeLength).toBe(1.5); // 3 frames / 2 episodes
      expect(stats.actionDistribution.pick).toBe(2);
      expect(stats.actionDistribution.place).toBe(1);
      expect(stats.qualityMetrics.averageConfidence).toBeCloseTo(0.8); // (0.9 + 0.8 + 0.7) / 3
    });

    it('should handle empty dataset statistics', () => {
      const stats = leRobotDatasetService.generateStatistics([]);

      expect(stats.totalEpisodes).toBe(0);
      expect(stats.totalFrames).toBe(0);
      expect(stats.averageEpisodeLength).toBe(0);
      expect(Object.keys(stats.actionDistribution)).toHaveLength(0);
    });

    it('should calculate frame rate correctly', () => {
      const stats = leRobotDatasetService.generateStatistics(mockDataPoints);

      expect(stats.qualityMetrics.frameRate).toBeGreaterThan(0);
      expect(stats.qualityMetrics.completionRate).toBe(1.0);
    });
  });

  describe('Dataset Validation', () => {
    const validDataPoints: LerobotDataPoint[] = [
      {
        observation: {
          timestamp: Date.now(),
          hand_poses: [{
            keypoints: Array.from({ length: 21 }, (_, i) => ({ 
              x: 0.5, y: 0.5, z: 0, confidence: 0.8, name: `keypoint_${i}` 
            })),
            handedness: 'right' as const,
            confidence: 0.8,
            timestamp: Date.now()
          }],
          camera_frame: { width: 640, height: 480, format: 'rgb' as const, data: new ArrayBuffer(0) }
        },
        action: {
          type: 'pick' as const,
          parameters: { position: [0, 0, 0] },
          timestamp: Date.now(),
          confidence: 0.8
        },
        reward: 0.8,
        done: false,
        metadata: { session_id: 'test', device_type: 'mobile', recording_quality: 'high', environment: 'lab' }
      }
    ];

    it('should validate correct dataset', () => {
      const validation = leRobotDatasetService.validateDataset(validDataPoints);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect empty dataset', () => {
      const validation = leRobotDatasetService.validateDataset([]);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Dataset is empty');
    });

    it('should detect missing hand pose data', () => {
      const invalidDataPoints = [{
        ...validDataPoints[0],
        observation: {
          ...validDataPoints[0].observation,
          hand_poses: []
        }
      }];

      const validation = leRobotDatasetService.validateDataset(invalidDataPoints);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing hand pose data in observations');
    });

    it('should detect low confidence data', () => {
      const lowConfidenceDataPoints = Array.from({ length: 10 }, () => ({
        ...validDataPoints[0],
        action: {
          ...validDataPoints[0].action,
          confidence: 0.3 // Low confidence
        }
      }));

      const validation = leRobotDatasetService.validateDataset(lowConfidenceDataPoints);

      expect(validation.warnings.some(w => w.includes('low confidence'))).toBe(true);
    });

    it('should detect temporal gaps', () => {
      const gappyDataPoints = [
        {
          ...validDataPoints[0],
          observation: { ...validDataPoints[0].observation, timestamp: 1000 }
        },
        {
          ...validDataPoints[0],
          observation: { ...validDataPoints[0].observation, timestamp: 5000 } // 4 second gap
        }
      ];

      const validation = leRobotDatasetService.validateDataset(gappyDataPoints);

      expect(validation.warnings.some(w => w.includes('temporal gaps'))).toBe(true);
    });
  });

  describe('Data Augmentation', () => {
    const mockDataPoints: LerobotDataPoint[] = [{
      observation: {
        timestamp: Date.now(),
        hand_poses: [{
          keypoints: [
            { x: 0.5, y: 0.5, z: 0, confidence: 0.8, name: 'wrist' },
            { x: 0.6, y: 0.4, z: 0, confidence: 0.8, name: 'thumb' }
          ],
          handedness: 'right' as const,
          confidence: 0.8,
          timestamp: Date.now()
        }],
        camera_frame: { width: 640, height: 480, format: 'rgb' as const, data: new ArrayBuffer(0) }
      },
      action: {
        type: 'pick' as const,
        parameters: { position: [0.5, 0.5, 0.5] },
        timestamp: Date.now(),
        confidence: 0.8
      },
      reward: 0.8,
      done: false,
      metadata: { session_id: 'test', device_type: 'mobile', recording_quality: 'high', environment: 'lab' }
    }];

    it('should generate augmented data', async () => {
      const dataset = await leRobotDatasetService.generateDataset({
        augmentData: true
      });

      // Mock data storage to return our test data
      (dataStorageService.getGestures as jest.Mock).mockResolvedValue([{
        id: 'test',
        type: 'pick',
        confidence: 0.8,
        poses: [{
          keypoints: [{ x: 0.5, y: 0.5, z: 0, confidence: 0.8, name: 'wrist' }],
          handedness: 'right' as const,
          confidence: 0.8,
          timestamp: Date.now()
        }]
      }]);

      // Should have original + augmented data
      const augmentedPoints = await (leRobotDatasetService as any).augmentDataset(mockDataPoints);
      expect(augmentedPoints.length).toBeGreaterThan(0);
      
      // Check augmentation metadata
      if (augmentedPoints.length > 0) {
        expect(augmentedPoints[0].metadata.augmentation).toBeDefined();
      }
    });
  });

  describe('Export', () => {
    const mockDataPoints: LerobotDataPoint[] = [{
      observation: {
        timestamp: Date.now(),
        hand_poses: [],
        camera_frame: { width: 640, height: 480, format: 'rgb' as const, data: new ArrayBuffer(0) }
      },
      action: {
        type: 'pick' as const,
        parameters: { position: [0, 0, 0] },
        timestamp: Date.now(),
        confidence: 0.8
      },
      reward: 0.8,
      done: false,
      metadata: { session_id: 'test', device_type: 'mobile', recording_quality: 'high', environment: 'lab' }
    }];

    it('should export LeRobot dataset', async () => {
      (dataStorageService.exportData as jest.Mock).mockResolvedValue('/path/to/export.json');

      const exportPath = await leRobotDatasetService.exportLeRobotDataset(mockDataPoints);

      expect(exportPath).toBe('/path/to/export.json');
      expect(dataStorageService.exportData).toHaveBeenCalledWith({
        format: 'lerobot',
        includeMetadata: true
      });
    });

    it('should handle export errors', async () => {
      (dataStorageService.exportData as jest.Mock).mockRejectedValue(new Error('Export failed'));

      const exportPath = await leRobotDatasetService.exportLeRobotDataset(mockDataPoints);

      expect(exportPath).toBeNull();
    });
  });
});