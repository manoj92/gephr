import { dataStorageService } from './DataStorageService';
import { handTrackingService } from './HandTrackingService';
import { LerobotDataPoint, LerobotObservation, LerobotAction, HandPose, CameraFrame } from '../types';

export interface LeRobotDatasetConfig {
  fps: number;
  imageResolution: [number, number];
  actionSpace: {
    type: 'continuous' | 'discrete';
    dimensions: number;
    bounds?: [number, number][];
  };
  observationSpace: {
    hand_poses: {
      type: 'continuous';
      shape: [number, number, number]; // [hands, keypoints, coordinates]
    };
    camera_image?: {
      type: 'image';
      shape: [number, number, number]; // [height, width, channels]
    };
  };
  taskDescription: string;
  robotType: string;
  environment: string;
}

export interface DatasetGenerationOptions {
  sessionIds?: string[];
  gestureTypes?: string[];
  qualityFilter?: 'low' | 'medium' | 'high';
  includeCameraFrames?: boolean;
  augmentData?: boolean;
  normalizeActions?: boolean;
  splitRatio?: {
    train: number;
    val: number;
    test: number;
  };
}

export interface DatasetSplit {
  train: LerobotDataPoint[];
  val: LerobotDataPoint[];
  test: LerobotDataPoint[];
}

export interface DatasetStatistics {
  totalEpisodes: number;
  totalFrames: number;
  averageEpisodeLength: number;
  actionDistribution: Record<string, number>;
  qualityMetrics: {
    averageConfidence: number;
    frameRate: number;
    completionRate: number;
  };
}

export class LeRobotDatasetService {
  private config: LeRobotDatasetConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): LeRobotDatasetConfig {
    return {
      fps: 30,
      imageResolution: [640, 480],
      actionSpace: {
        type: 'continuous',
        dimensions: 6, // 3D position + 3D rotation
        bounds: [
          [-1, 1], // x position
          [-1, 1], // y position  
          [-1, 1], // z position
          [-Math.PI, Math.PI], // roll
          [-Math.PI, Math.PI], // pitch
          [-Math.PI, Math.PI], // yaw
        ],
      },
      observationSpace: {
        hand_poses: {
          type: 'continuous',
          shape: [2, 21, 3], // 2 hands, 21 keypoints, 3D coordinates
        },
        camera_image: {
          type: 'image',
          shape: [480, 640, 3], // RGB image
        },
      },
      taskDescription: 'Hand gesture to robot action mapping',
      robotType: 'humanoid',
      environment: 'real_world',
    };
  }

  public updateConfig(newConfig: Partial<LeRobotDatasetConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate LeRobot dataset from stored gesture data
   */
  public async generateDataset(options: DatasetGenerationOptions = {}): Promise<LerobotDataPoint[]> {
    try {
      console.log('Starting LeRobot dataset generation...');

      // Get gesture data with filters
      const gestures = await dataStorageService.getGestures({
        gestureType: options.gestureTypes?.[0], // For simplicity, use first type
      });

      if (gestures.length === 0) {
        throw new Error('No gesture data found for dataset generation');
      }

      console.log(`Found ${gestures.length} gestures for dataset generation`);

      const dataPoints: LerobotDataPoint[] = [];

      for (const gesture of gestures) {
        // Skip low quality gestures if filter is set
        if (options.qualityFilter && this.getGestureQuality(gesture) !== options.qualityFilter) {
          continue;
        }

        const gestureDataPoints = await this.processGestureToDataPoints(gesture, options);
        dataPoints.push(...gestureDataPoints);
      }

      console.log(`Generated ${dataPoints.length} data points from ${gestures.length} gestures`);

      // Apply data augmentation if requested
      if (options.augmentData) {
        const augmentedPoints = await this.augmentDataset(dataPoints);
        dataPoints.push(...augmentedPoints);
        console.log(`Added ${augmentedPoints.length} augmented data points`);
      }

      // Normalize actions if requested
      if (options.normalizeActions) {
        this.normalizeActions(dataPoints);
        console.log('Applied action normalization');
      }

      return dataPoints;
    } catch (error) {
      console.error('Failed to generate LeRobot dataset:', error);
      throw error;
    }
  }

  /**
   * Split dataset into train/val/test sets
   */
  public splitDataset(dataPoints: LerobotDataPoint[], options: DatasetGenerationOptions = {}): DatasetSplit {
    const splitRatio = options.splitRatio || { train: 0.7, val: 0.15, test: 0.15 };
    
    // Shuffle the data points
    const shuffled = [...dataPoints].sort(() => Math.random() - 0.5);
    
    const trainEnd = Math.floor(shuffled.length * splitRatio.train);
    const valEnd = trainEnd + Math.floor(shuffled.length * splitRatio.val);
    
    return {
      train: shuffled.slice(0, trainEnd),
      val: shuffled.slice(trainEnd, valEnd),
      test: shuffled.slice(valEnd),
    };
  }

  /**
   * Generate dataset statistics
   */
  public generateStatistics(dataPoints: LerobotDataPoint[]): DatasetStatistics {
    if (dataPoints.length === 0) {
      return {
        totalEpisodes: 0,
        totalFrames: 0,
        averageEpisodeLength: 0,
        actionDistribution: {},
        qualityMetrics: {
          averageConfidence: 0,
          frameRate: 0,
          completionRate: 0,
        },
      };
    }

    // Group data points by episode (based on metadata.session_id)
    const episodes = new Map<string, LerobotDataPoint[]>();
    for (const point of dataPoints) {
      const sessionId = point.metadata.session_id;
      if (!episodes.has(sessionId)) {
        episodes.set(sessionId, []);
      }
      episodes.get(sessionId)!.push(point);
    }

    // Calculate action distribution
    const actionDistribution: Record<string, number> = {};
    for (const point of dataPoints) {
      const actionType = point.action.type;
      actionDistribution[actionType] = (actionDistribution[actionType] || 0) + 1;
    }

    // Calculate quality metrics
    const confidences = dataPoints.map(p => p.action.confidence);
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    // Calculate frame rate based on timestamps
    const timestamps = dataPoints.map(p => p.observation.timestamp).sort((a, b) => a - b);
    const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
    const frameRate = dataPoints.length / (totalDuration / 1000); // fps

    return {
      totalEpisodes: episodes.size,
      totalFrames: dataPoints.length,
      averageEpisodeLength: dataPoints.length / episodes.size,
      actionDistribution,
      qualityMetrics: {
        averageConfidence,
        frameRate,
        completionRate: 1.0, // Assuming all data points are complete
      },
    };
  }

  /**
   * Export dataset in LeRobot format
   */
  public async exportLeRobotDataset(
    dataPoints: LerobotDataPoint[], 
    metadata: any = {}
  ): Promise<string | null> {
    try {
      const statistics = this.generateStatistics(dataPoints);
      
      const dataset = {
        info: {
          ...this.config,
          ...metadata,
          total_episodes: statistics.totalEpisodes,
          total_frames: statistics.totalFrames,
          created_at: new Date().toISOString(),
          format_version: '2.0.0',
          statistics,
        },
        data: dataPoints,
      };

      // Use the data storage service to export
      const exportPath = await dataStorageService.exportData({
        format: 'lerobot',
        includeMetadata: true,
      });

      return exportPath;
    } catch (error) {
      console.error('Failed to export LeRobot dataset:', error);
      return null;
    }
  }

  /**
   * Validate dataset quality
   */
  public validateDataset(dataPoints: LerobotDataPoint[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (dataPoints.length === 0) {
      errors.push('Dataset is empty');
      return { isValid: false, errors, warnings };
    }

    // Check for consistent action space
    const actionTypes = new Set(dataPoints.map(p => p.action.type));
    if (actionTypes.size > 10) {
      warnings.push(`Large number of unique action types: ${actionTypes.size}`);
    }

    // Check for temporal consistency
    const timestamps = dataPoints.map(p => p.observation.timestamp).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i - 1];
      if (gap > 1000) { // More than 1 second gap
        gaps.push(gap);
      }
    }

    if (gaps.length > dataPoints.length * 0.1) {
      warnings.push(`${gaps.length} temporal gaps detected in dataset`);
    }

    // Check for low confidence data points
    const lowConfidenceCount = dataPoints.filter(p => p.action.confidence < 0.5).length;
    if (lowConfidenceCount > dataPoints.length * 0.2) {
      warnings.push(`${lowConfidenceCount} low confidence data points (< 0.5)`);
    }

    // Check hand pose data quality
    for (const point of dataPoints.slice(0, 100)) { // Sample first 100 points
      if (!point.observation.hand_poses || point.observation.hand_poses.length === 0) {
        errors.push('Missing hand pose data in observations');
        break;
      }

      for (const handPose of point.observation.hand_poses) {
        if (!handPose.keypoints || handPose.keypoints.length !== 21) {
          errors.push('Invalid hand pose keypoint data');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async processGestureToDataPoints(
    gesture: any, 
    options: DatasetGenerationOptions
  ): Promise<LerobotDataPoint[]> {
    const dataPoints: LerobotDataPoint[] = [];

    // Process each hand pose in the gesture
    for (let i = 0; i < gesture.poses.length; i++) {
      const pose = gesture.poses[i];
      
      // Create observation
      const observation: LerobotObservation = {
        timestamp: pose.timestamp || gesture.timestamp + i * (1000 / this.config.fps),
        hand_poses: [pose], // Single pose for this frame
        camera_frame: this.generateMockCameraFrame(), // Mock camera frame
      };

      // Generate action from gesture type and pose
      const action: LerobotAction = this.generateActionFromGesture(gesture, pose, i);

      // Create data point
      const dataPoint: LerobotDataPoint = {
        observation,
        action,
        reward: this.calculateReward(gesture, pose),
        done: i === gesture.poses.length - 1,
        metadata: {
          session_id: gesture.id,
          device_type: 'mobile',
          recording_quality: this.getGestureQuality(gesture),
          environment: gesture.environment || 'unknown',
          gesture_type: gesture.type,
          confidence: pose.confidence,
          frame_index: i,
        },
      };

      dataPoints.push(dataPoint);
    }

    return dataPoints;
  }

  private generateActionFromGesture(gesture: any, pose: HandPose, frameIndex: number): LerobotAction {
    // Convert gesture type and hand pose to robot action
    const actionMapping: Record<string, string> = {
      'pick': 'pick',
      'place': 'place', 
      'move': 'move',
      'rotate': 'rotate',
      'open': 'open',
      'close': 'close',
      'point': 'move',
      'grasp': 'pick',
      'release': 'place',
    };

    const actionType = actionMapping[gesture.type] || 'move';

    // Generate parameters based on hand pose
    const parameters = this.generateActionParameters(pose, actionType);

    return {
      type: actionType as any,
      parameters,
      timestamp: pose.timestamp || gesture.timestamp + frameIndex * (1000 / this.config.fps),
      confidence: Math.min(pose.confidence, gesture.confidence),
    };
  }

  private generateActionParameters(pose: HandPose, actionType: string): Record<string, any> {
    // Extract key landmarks for action generation
    const landmarks = pose.keypoints;
    
    if (landmarks.length === 0) {
      return {};
    }

    // Get fingertip and palm positions
    const palmPos = landmarks[0]; // Wrist as reference
    const indexTip = landmarks[8]; // Index fingertip
    const thumbTip = landmarks[4]; // Thumb tip

    // Calculate relative positions and orientations
    const direction = {
      x: indexTip.x - palmPos.x,
      y: indexTip.y - palmPos.y,
      z: (indexTip.z || 0) - (palmPos.z || 0),
    };

    // Normalize to action space bounds
    const normalizedDirection = {
      x: Math.max(-1, Math.min(1, direction.x * 2)),
      y: Math.max(-1, Math.min(1, direction.y * 2)),
      z: Math.max(-1, Math.min(1, direction.z * 10)), // Scale z more aggressively
    };

    switch (actionType) {
      case 'move':
        return {
          position: [normalizedDirection.x, normalizedDirection.y, normalizedDirection.z],
          velocity: 0.5,
        };

      case 'pick':
      case 'place':
        const gripperState = this.calculateGripperState(pose);
        return {
          position: [normalizedDirection.x, normalizedDirection.y, normalizedDirection.z],
          gripper_action: gripperState,
          force: 0.3,
        };

      case 'rotate':
        const rotation = this.calculateHandRotation(pose);
        return {
          orientation: rotation,
          angular_velocity: 0.3,
        };

      case 'open':
      case 'close':
        return {
          gripper_action: actionType === 'open' ? 1.0 : 0.0,
        };

      default:
        return {
          position: [normalizedDirection.x, normalizedDirection.y, normalizedDirection.z],
        };
    }
  }

  private calculateGripperState(pose: HandPose): number {
    // Calculate gripper state based on thumb-finger distances
    const landmarks = pose.keypoints;
    if (landmarks.length < 9) return 0.5;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow((thumbTip.z || 0) - (indexTip.z || 0), 2)
    );

    // Normalize distance to gripper state (0 = closed, 1 = open)
    return Math.max(0, Math.min(1, distance * 10));
  }

  private calculateHandRotation(pose: HandPose): [number, number, number] {
    // Calculate hand rotation based on key landmarks
    const landmarks = pose.keypoints;
    if (landmarks.length < 9) return [0, 0, 0];

    const wrist = landmarks[0];
    const middleFinger = landmarks[12];
    
    // Calculate rotation angles (simplified)
    const dx = middleFinger.x - wrist.x;
    const dy = middleFinger.y - wrist.y;
    
    const yaw = Math.atan2(dy, dx);
    const pitch = 0; // Simplified, would need more complex calculation
    const roll = 0;

    return [roll, pitch, yaw];
  }

  private calculateReward(gesture: any, pose: HandPose): number {
    // Calculate reward based on gesture completion and quality
    const baseReward = gesture.confidence * 0.5;
    const poseReward = pose.confidence * 0.3;
    const completionBonus = 0.2; // Flat bonus for completed action
    
    return Math.min(1.0, baseReward + poseReward + completionBonus);
  }

  private getGestureQuality(gesture: any): 'low' | 'medium' | 'high' {
    const avgConfidence = gesture.poses.reduce((sum: number, pose: HandPose) => sum + pose.confidence, 0) / gesture.poses.length;
    
    if (avgConfidence >= 0.8) return 'high';
    if (avgConfidence >= 0.6) return 'medium';
    return 'low';
  }

  private generateMockCameraFrame(): CameraFrame {
    // Generate a mock camera frame for now
    // In a real implementation, this would be actual camera data
    return {
      width: this.config.imageResolution[0],
      height: this.config.imageResolution[1],
      format: 'rgb',
      data: new ArrayBuffer(this.config.imageResolution[0] * this.config.imageResolution[1] * 3),
    };
  }

  private async augmentDataset(dataPoints: LerobotDataPoint[]): Promise<LerobotDataPoint[]> {
    const augmented: LerobotDataPoint[] = [];
    
    // Apply simple augmentations
    for (const point of dataPoints.slice(0, Math.min(100, dataPoints.length))) { // Limit augmentation
      // Time shift augmentation
      const timeShifted = JSON.parse(JSON.stringify(point));
      timeShifted.observation.timestamp += Math.random() * 100 - 50; // ±50ms
      timeShifted.action.timestamp += Math.random() * 100 - 50;
      timeShifted.metadata.augmentation = 'time_shift';
      
      // Noise augmentation
      const noiseAdded = JSON.parse(JSON.stringify(point));
      for (const handPose of noiseAdded.observation.hand_poses) {
        for (const keypoint of handPose.keypoints) {
          keypoint.x += (Math.random() - 0.5) * 0.02; // ±1% noise
          keypoint.y += (Math.random() - 0.5) * 0.02;
          if (keypoint.z !== undefined) {
            keypoint.z += (Math.random() - 0.5) * 0.02;
          }
        }
      }
      noiseAdded.metadata.augmentation = 'noise';
      
      augmented.push(timeShifted, noiseAdded);
    }

    return augmented;
  }

  private normalizeActions(dataPoints: LerobotDataPoint[]): void {
    // Find action bounds
    const actionBounds: Record<string, { min: number; max: number }> = {};
    
    for (const point of dataPoints) {
      for (const [key, value] of Object.entries(point.action.parameters)) {
        if (typeof value === 'number') {
          if (!actionBounds[key]) {
            actionBounds[key] = { min: value, max: value };
          } else {
            actionBounds[key].min = Math.min(actionBounds[key].min, value);
            actionBounds[key].max = Math.max(actionBounds[key].max, value);
          }
        }
      }
    }

    // Normalize actions
    for (const point of dataPoints) {
      for (const [key, value] of Object.entries(point.action.parameters)) {
        if (typeof value === 'number' && actionBounds[key]) {
          const { min, max } = actionBounds[key];
          if (max > min) {
            point.action.parameters[key] = (value - min) / (max - min) * 2 - 1; // Normalize to [-1, 1]
          }
        }
      }
    }
  }
}

export const leRobotDatasetService = new LeRobotDatasetService();