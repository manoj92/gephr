import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { HandPose } from '../types';

export interface LeRobotAction {
  observation: LeRobotObservation;
  action: LeRobotActionData;
  episode_index: number;
  frame_index: number;
  timestamp: number;
  next_observation?: LeRobotObservation;
}

export interface LeRobotObservation {
  hand_pose: {
    left?: HandPoseData;
    right?: HandPoseData;
  };
  robot_state?: {
    joint_positions: number[];
    joint_velocities: number[];
    joint_efforts: number[];
    end_effector_pose: {
      position: [number, number, number];
      orientation: [number, number, number, number];
    };
  };
  camera_data?: {
    front_rgb?: ImageData;
    left_rgb?: ImageData;
    right_rgb?: ImageData;
    depth?: DepthData;
  };
  environment?: {
    objects: DetectedObject[];
    scene_description: string;
  };
}

export interface HandPoseData {
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    confidence: number;
  }>;
  gesture: string;
  confidence: number;
  bounding_box: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

export interface LeRobotActionData {
  type: 'move' | 'grasp' | 'release' | 'rotate' | 'wait' | 'complex';
  parameters: {
    target_position?: [number, number, number];
    target_orientation?: [number, number, number, number];
    grip_force?: number;
    speed?: number;
    precision?: number;
    joint_targets?: number[];
  };
  predicted_outcome?: {
    success_probability: number;
    estimated_duration: number;
  };
}

export interface DetectedObject {
  id: string;
  type: string;
  position: [number, number, number];
  orientation: [number, number, number, number];
  bounding_box: {
    min: [number, number, number];
    max: [number, number, number];
  };
  confidence: number;
}

export interface ImageData {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
  encoding: 'rgb' | 'bgr' | 'rgba';
}

export interface DepthData {
  data: Float32Array;
  width: number;
  height: number;
  scale: number;
  encoding: 'depth_mm' | 'depth_m';
}

export interface DatasetMetadata {
  name: string;
  description: string;
  version: string;
  creator: string;
  created_at: string;
  total_episodes: number;
  total_frames: number;
  fps: number;
  robot_type: string;
  environment_type: string;
  tasks: string[];
  statistics: {
    duration_seconds: number;
    success_rate: number;
    quality_score: number;
  };
  license: string;
  tags: string[];
}

export interface ExportOptions {
  format: 'hdf5' | 'zarr' | 'json' | 'custom';
  compression: 'none' | 'gzip' | 'lzf' | 'szip';
  include_images: boolean;
  include_depth: boolean;
  include_audio: boolean;
  downsample_factor: number;
  quality_filter: number; // 0-1, minimum quality to include
  time_range?: {
    start: number;
    end: number;
  };
  anonymize: boolean;
}

export class EnhancedLeRobotExportService {
  private currentEpisodeData: LeRobotAction[] = [];
  private allEpisodes: Map<number, LeRobotAction[]> = new Map();
  private metadata: DatasetMetadata;
  private isRecording: boolean = false;
  private currentEpisodeIndex: number = 0;
  private frameIndex: number = 0;

  constructor() {
    this.metadata = {
      name: 'Humanoid Training Dataset',
      description: 'Hand tracking and robot training data collected from mobile app',
      version: '1.0.0',
      creator: 'Humanoid Training Platform',
      created_at: new Date().toISOString(),
      total_episodes: 0,
      total_frames: 0,
      fps: 30,
      robot_type: 'humanoid',
      environment_type: 'mixed',
      tasks: [],
      statistics: {
        duration_seconds: 0,
        success_rate: 0,
        quality_score: 0
      },
      license: 'MIT',
      tags: ['hand_tracking', 'manipulation', 'mobile_collected']
    };

    this.loadExistingData();
  }

  private async loadExistingData(): Promise<void> {
    try {
      const savedMetadata = await AsyncStorage.getItem('dataset_metadata');
      const savedEpisodes = await AsyncStorage.getItem('dataset_episodes');

      if (savedMetadata) {
        this.metadata = { ...this.metadata, ...JSON.parse(savedMetadata) };
      }

      if (savedEpisodes) {
        const episodes = JSON.parse(savedEpisodes);
        episodes.forEach((episode: any, index: number) => {
          this.allEpisodes.set(index, episode);
        });
        this.currentEpisodeIndex = this.allEpisodes.size;
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }

  async startEpisode(taskDescription: string, environmentInfo?: any): Promise<void> {
    if (this.isRecording) {
      await this.endEpisode();
    }

    this.isRecording = true;
    this.currentEpisodeData = [];
    this.frameIndex = 0;

    // Add task to metadata if not already present
    if (!this.metadata.tasks.includes(taskDescription)) {
      this.metadata.tasks.push(taskDescription);
    }

    console.log(`Started episode ${this.currentEpisodeIndex}: ${taskDescription}`);
  }

  async addFrame(
    handPoses: { left?: HandPose; right?: HandPose },
    robotState?: any,
    cameraData?: any,
    detectedObjects?: DetectedObject[],
    predictedAction?: LeRobotActionData
  ): Promise<void> {
    if (!this.isRecording) {
      console.warn('Cannot add frame: no active episode');
      return;
    }

    const observation = this.buildObservation(
      handPoses,
      robotState,
      cameraData,
      detectedObjects
    );

    const action = predictedAction || this.inferActionFromHandPoses(handPoses);

    const lerobotAction: LeRobotAction = {
      observation,
      action,
      episode_index: this.currentEpisodeIndex,
      frame_index: this.frameIndex,
      timestamp: Date.now() / 1000
    };

    this.currentEpisodeData.push(lerobotAction);
    this.frameIndex++;

    // Update previous frame's next_observation
    if (this.currentEpisodeData.length > 1) {
      this.currentEpisodeData[this.currentEpisodeData.length - 2].next_observation = observation;
    }
  }

  private buildObservation(
    handPoses: { left?: HandPose; right?: HandPose },
    robotState?: any,
    cameraData?: any,
    detectedObjects?: DetectedObject[]
  ): LeRobotObservation {
    const observation: LeRobotObservation = {
      hand_pose: {}
    };

    // Convert hand poses
    if (handPoses.left) {
      observation.hand_pose.left = this.convertHandPose(handPoses.left);
    }
    if (handPoses.right) {
      observation.hand_pose.right = this.convertHandPose(handPoses.right);
    }

    // Add robot state if available
    if (robotState) {
      observation.robot_state = {
        joint_positions: robotState.jointStates ?
          Object.values(robotState.jointStates).map((joint: any) => joint.position) : [],
        joint_velocities: robotState.jointStates ?
          Object.values(robotState.jointStates).map((joint: any) => joint.velocity) : [],
        joint_efforts: robotState.jointStates ?
          Object.values(robotState.jointStates).map((joint: any) => joint.effort) : [],
        end_effector_pose: {
          position: robotState.position ?
            [robotState.position.x, robotState.position.y, robotState.position.z] : [0, 0, 0],
          orientation: robotState.orientation ?
            [robotState.orientation.x, robotState.orientation.y, robotState.orientation.z, robotState.orientation.w] : [0, 0, 0, 1]
        }
      };
    }

    // Add camera data if available
    if (cameraData) {
      observation.camera_data = this.processCameraData(cameraData);
    }

    // Add environment data
    if (detectedObjects && detectedObjects.length > 0) {
      observation.environment = {
        objects: detectedObjects,
        scene_description: this.generateSceneDescription(detectedObjects)
      };
    }

    return observation;
  }

  private convertHandPose(handPose: HandPose): HandPoseData {
    // Calculate bounding box
    const xs = handPose.landmarks.map(l => l.x);
    const ys = handPose.landmarks.map(l => l.y);

    return {
      landmarks: handPose.landmarks.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        confidence: landmark.confidence
      })),
      gesture: handPose.gesture,
      confidence: handPose.confidence,
      bounding_box: {
        x_min: Math.min(...xs),
        y_min: Math.min(...ys),
        x_max: Math.max(...xs),
        y_max: Math.max(...ys)
      }
    };
  }

  private processCameraData(cameraData: any): any {
    // Process camera data - in real implementation, this would handle
    // image compression, format conversion, etc.
    const processed: any = {};

    if (cameraData.front_rgb) {
      processed.front_rgb = this.processImageData(cameraData.front_rgb);
    }
    if (cameraData.left_rgb) {
      processed.left_rgb = this.processImageData(cameraData.left_rgb);
    }
    if (cameraData.right_rgb) {
      processed.right_rgb = this.processImageData(cameraData.right_rgb);
    }
    if (cameraData.depth) {
      processed.depth = this.processDepthData(cameraData.depth);
    }

    return processed;
  }

  private processImageData(imageData: any): ImageData {
    // Simplified image processing
    return {
      data: new Uint8Array(imageData.width * imageData.height * 3),
      width: imageData.width || 640,
      height: imageData.height || 480,
      channels: 3,
      encoding: 'rgb'
    };
  }

  private processDepthData(depthData: any): DepthData {
    return {
      data: new Float32Array(depthData.width * depthData.height),
      width: depthData.width || 640,
      height: depthData.height || 480,
      scale: depthData.scale || 1000,
      encoding: 'depth_mm'
    };
  }

  private generateSceneDescription(objects: DetectedObject[]): string {
    if (objects.length === 0) return 'Empty scene';

    const objectTypes = objects.map(obj => obj.type);
    const uniqueTypes = [...new Set(objectTypes)];

    return `Scene contains: ${uniqueTypes.join(', ')}`;
  }

  private inferActionFromHandPoses(handPoses: { left?: HandPose; right?: HandPose }): LeRobotActionData {
    // Simple action inference based on hand gestures
    const leftGesture = handPoses.left?.gesture;
    const rightGesture = handPoses.right?.gesture;

    if (leftGesture === 'fist' || rightGesture === 'fist') {
      return {
        type: 'grasp',
        parameters: {
          grip_force: 0.8,
          speed: 0.5
        },
        predicted_outcome: {
          success_probability: 0.85,
          estimated_duration: 1.5
        }
      };
    }

    if (leftGesture === 'open_hand' || rightGesture === 'open_hand') {
      return {
        type: 'release',
        parameters: {
          speed: 0.3
        },
        predicted_outcome: {
          success_probability: 0.95,
          estimated_duration: 1.0
        }
      };
    }

    if (leftGesture === 'pointing' || rightGesture === 'pointing') {
      // Calculate target position from hand pose
      const pointingHand = leftGesture === 'pointing' ? handPoses.left : handPoses.right;
      const target = this.calculatePointingTarget(pointingHand);

      return {
        type: 'move',
        parameters: {
          target_position: target,
          speed: 0.6,
          precision: 0.7
        },
        predicted_outcome: {
          success_probability: 0.75,
          estimated_duration: 2.0
        }
      };
    }

    // Default to wait action
    return {
      type: 'wait',
      parameters: {},
      predicted_outcome: {
        success_probability: 1.0,
        estimated_duration: 0.1
      }
    };
  }

  private calculatePointingTarget(handPose?: HandPose): [number, number, number] {
    if (!handPose) return [0, 0, 0];

    // Use index finger tip and direction
    const indexTip = handPose.landmarks[8];
    const indexMcp = handPose.landmarks[5];

    const direction = {
      x: indexTip.x - indexMcp.x,
      y: indexTip.y - indexMcp.y,
      z: indexTip.z - indexMcp.z
    };

    // Project forward by 0.5 meters
    const distance = 0.5;
    return [
      indexTip.x + direction.x * distance,
      indexTip.y + direction.y * distance,
      indexTip.z + direction.z * distance
    ];
  }

  async endEpisode(success: boolean = true): Promise<void> {
    if (!this.isRecording) {
      console.warn('No active episode to end');
      return;
    }

    this.isRecording = false;

    if (this.currentEpisodeData.length > 0) {
      // Calculate episode statistics
      const episodeDuration = this.currentEpisodeData.length / this.metadata.fps;

      // Store episode
      this.allEpisodes.set(this.currentEpisodeIndex, [...this.currentEpisodeData]);

      // Update metadata
      this.metadata.total_episodes = this.allEpisodes.size;
      this.metadata.total_frames += this.currentEpisodeData.length;
      this.metadata.statistics.duration_seconds += episodeDuration;

      // Calculate success rate
      const totalEpisodes = this.allEpisodes.size;
      const successCount = success ? 1 : 0; // In real implementation, track this properly
      this.metadata.statistics.success_rate =
        (this.metadata.statistics.success_rate * (totalEpisodes - 1) + successCount) / totalEpisodes;

      console.log(`Ended episode ${this.currentEpisodeIndex}: ${this.frameIndex} frames, ${episodeDuration.toFixed(2)}s`);

      this.currentEpisodeIndex++;
      await this.saveDataset();
    }

    this.currentEpisodeData = [];
    this.frameIndex = 0;
  }

  async exportDataset(options: ExportOptions = {
    format: 'json',
    compression: 'none',
    include_images: true,
    include_depth: true,
    include_audio: false,
    downsample_factor: 1,
    quality_filter: 0,
    anonymize: false
  }): Promise<string> {
    console.log('Starting dataset export...');

    // Filter episodes based on quality
    const filteredEpisodes = this.filterEpisodesByQuality(options.quality_filter);

    // Apply downsampling if requested
    const downsampledEpisodes = this.downsampleEpisodes(filteredEpisodes, options.downsample_factor);

    // Anonymize data if requested
    const processedEpisodes = options.anonymize ?
      this.anonymizeData(downsampledEpisodes) : downsampledEpisodes;

    // Generate export data based on format
    let exportData: string;
    let filename: string;

    switch (options.format) {
      case 'hdf5':
        exportData = await this.exportToHDF5(processedEpisodes, options);
        filename = `${this.metadata.name}_${Date.now()}.h5`;
        break;
      case 'zarr':
        exportData = await this.exportToZarr(processedEpisodes, options);
        filename = `${this.metadata.name}_${Date.now()}.zarr`;
        break;
      case 'json':
        exportData = await this.exportToJSON(processedEpisodes, options);
        filename = `${this.metadata.name}_${Date.now()}.json`;
        break;
      case 'custom':
        exportData = await this.exportToCustomFormat(processedEpisodes, options);
        filename = `${this.metadata.name}_${Date.now()}.lerobot`;
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Save to file system
    const filePath = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(filePath, exportData);

    console.log(`Dataset exported to: ${filePath}`);
    return filePath;
  }

  private filterEpisodesByQuality(minQuality: number): Map<number, LeRobotAction[]> {
    const filtered = new Map<number, LeRobotAction[]>();

    this.allEpisodes.forEach((episode, index) => {
      const quality = this.calculateEpisodeQuality(episode);
      if (quality >= minQuality) {
        filtered.set(index, episode);
      }
    });

    return filtered;
  }

  private calculateEpisodeQuality(episode: LeRobotAction[]): number {
    if (episode.length === 0) return 0;

    let totalConfidence = 0;
    let frameCount = 0;

    episode.forEach(frame => {
      if (frame.observation.hand_pose.left) {
        totalConfidence += frame.observation.hand_pose.left.confidence;
        frameCount++;
      }
      if (frame.observation.hand_pose.right) {
        totalConfidence += frame.observation.hand_pose.right.confidence;
        frameCount++;
      }
    });

    return frameCount > 0 ? totalConfidence / frameCount : 0;
  }

  private downsampleEpisodes(episodes: Map<number, LeRobotAction[]>, factor: number): Map<number, LeRobotAction[]> {
    if (factor <= 1) return episodes;

    const downsampled = new Map<number, LeRobotAction[]>();

    episodes.forEach((episode, index) => {
      const downsampledEpisode: LeRobotAction[] = [];
      for (let i = 0; i < episode.length; i += factor) {
        downsampledEpisode.push(episode[i]);
      }
      downsampled.set(index, downsampledEpisode);
    });

    return downsampled;
  }

  private anonymizeData(episodes: Map<number, LeRobotAction[]>): Map<number, LeRobotAction[]> {
    // Remove or blur identifying information
    const anonymized = new Map<number, LeRobotAction[]>();

    episodes.forEach((episode, index) => {
      const anonymizedEpisode = episode.map(frame => ({
        ...frame,
        // Remove camera data for privacy
        observation: {
          ...frame.observation,
          camera_data: undefined
        }
      }));
      anonymized.set(index, anonymizedEpisode);
    });

    return anonymized;
  }

  private async exportToJSON(episodes: Map<number, LeRobotAction[]>, options: ExportOptions): Promise<string> {
    const exportData = {
      metadata: this.metadata,
      episodes: Object.fromEntries(episodes.entries()),
      export_options: options,
      exported_at: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  private async exportToHDF5(episodes: Map<number, LeRobotAction[]>, options: ExportOptions): Promise<string> {
    // HDF5 export would require a proper HDF5 library
    // For now, return a structured representation
    const hdf5Structure = {
      format: 'HDF5_PLACEHOLDER',
      metadata: this.metadata,
      episodes: Array.from(episodes.entries()),
      compression: options.compression
    };

    return JSON.stringify(hdf5Structure, null, 2);
  }

  private async exportToZarr(episodes: Map<number, LeRobotAction[]>, options: ExportOptions): Promise<string> {
    // Zarr export would require a proper Zarr library
    const zarrStructure = {
      format: 'ZARR_PLACEHOLDER',
      metadata: this.metadata,
      chunks: Array.from(episodes.entries()),
      compression: options.compression
    };

    return JSON.stringify(zarrStructure, null, 2);
  }

  private async exportToCustomFormat(episodes: Map<number, LeRobotAction[]>, options: ExportOptions): Promise<string> {
    // Custom LeRobot-compatible format
    const customFormat = {
      format_version: '1.0.0',
      dataset_type: 'humanoid_training',
      metadata: this.metadata,
      data: {
        episodes: Array.from(episodes.entries()).map(([index, episode]) => ({
          episode_id: index,
          frames: episode,
          statistics: {
            frame_count: episode.length,
            duration: episode.length / this.metadata.fps,
            quality: this.calculateEpisodeQuality(episode)
          }
        }))
      },
      export_info: {
        exported_at: new Date().toISOString(),
        options,
        total_episodes: episodes.size,
        total_frames: Array.from(episodes.values()).reduce((sum, ep) => sum + ep.length, 0)
      }
    };

    return JSON.stringify(customFormat, null, 2);
  }

  async shareDataset(filePath: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share LeRobot Dataset'
      });
    } else {
      console.warn('Sharing is not available on this platform');
    }
  }

  private async saveDataset(): Promise<void> {
    try {
      await AsyncStorage.setItem('dataset_metadata', JSON.stringify(this.metadata));

      // Save only recent episodes to avoid storage issues
      const recentEpisodes = Array.from(this.allEpisodes.entries()).slice(-10);
      await AsyncStorage.setItem('dataset_episodes', JSON.stringify(recentEpisodes));
    } catch (error) {
      console.error('Error saving dataset:', error);
    }
  }

  // Statistics and analysis methods
  getDatasetStatistics(): any {
    const totalFrames = Array.from(this.allEpisodes.values()).reduce((sum, ep) => sum + ep.length, 0);
    const avgEpisodeLength = this.allEpisodes.size > 0 ? totalFrames / this.allEpisodes.size : 0;

    const gestureStats = this.analyzeGestures();
    const qualityStats = this.analyzeQuality();

    return {
      total_episodes: this.allEpisodes.size,
      total_frames: totalFrames,
      average_episode_length: avgEpisodeLength,
      total_duration_hours: this.metadata.statistics.duration_seconds / 3600,
      gestures: gestureStats,
      quality: qualityStats,
      storage_size_mb: this.estimateStorageSize() / (1024 * 1024)
    };
  }

  private analyzeGestures(): any {
    const gestureCount: { [key: string]: number } = {};

    this.allEpisodes.forEach(episode => {
      episode.forEach(frame => {
        if (frame.observation.hand_pose.left) {
          const gesture = frame.observation.hand_pose.left.gesture;
          gestureCount[gesture] = (gestureCount[gesture] || 0) + 1;
        }
        if (frame.observation.hand_pose.right) {
          const gesture = frame.observation.hand_pose.right.gesture;
          gestureCount[gesture] = (gestureCount[gesture] || 0) + 1;
        }
      });
    });

    return gestureCount;
  }

  private analyzeQuality(): any {
    const qualities: number[] = [];

    this.allEpisodes.forEach(episode => {
      qualities.push(this.calculateEpisodeQuality(episode));
    });

    if (qualities.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0 };
    }

    qualities.sort((a, b) => a - b);

    return {
      min: qualities[0],
      max: qualities[qualities.length - 1],
      average: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
      median: qualities[Math.floor(qualities.length / 2)]
    };
  }

  private estimateStorageSize(): number {
    // Rough estimation of storage size in bytes
    let size = 0;

    this.allEpisodes.forEach(episode => {
      episode.forEach(frame => {
        // Base frame data
        size += 1000; // ~1KB per frame for pose data

        // Camera data if present
        if (frame.observation.camera_data) {
          if (frame.observation.camera_data.front_rgb) size += 640 * 480 * 3;
          if (frame.observation.camera_data.depth) size += 640 * 480 * 4;
        }
      });
    });

    return size;
  }

  getMetadata(): DatasetMetadata {
    return { ...this.metadata };
  }

  updateMetadata(updates: Partial<DatasetMetadata>): void {
    this.metadata = { ...this.metadata, ...updates };
  }

  clearDataset(): void {
    this.allEpisodes.clear();
    this.currentEpisodeData = [];
    this.currentEpisodeIndex = 0;
    this.frameIndex = 0;
    this.isRecording = false;

    this.metadata.total_episodes = 0;
    this.metadata.total_frames = 0;
    this.metadata.statistics.duration_seconds = 0;
  }

  async cleanup(): Promise<void> {
    if (this.isRecording) {
      await this.endEpisode(false);
    }
    await this.saveDataset();
  }
}

export const enhancedLeRobotExportService = new EnhancedLeRobotExportService();
export default enhancedLeRobotExportService;