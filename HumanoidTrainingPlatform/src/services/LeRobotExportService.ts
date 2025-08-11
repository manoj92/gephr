import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { LerobotDataPoint, LerobotAction, LerobotObservation } from '../types';

export interface LeRobotDataset {
  version: string;
  format: 'lerobot_v1' | 'lerobot_v2';
  metadata: {
    created_at: string;
    device_info: {
      model: string;
      os: string;
      app_version: string;
    };
    recording_info: {
      duration_seconds: number;
      fps: number;
      resolution: {
        width: number;
        height: number;
      };
    };
    dataset_stats: {
      total_frames: number;
      total_actions: number;
      unique_actions: string[];
      action_distribution: Record<string, number>;
    };
  };
  episodes: LeRobotEpisode[];
}

export interface LeRobotEpisode {
  episode_id: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_ms: number;
  data_points: LerobotDataPoint[];
  summary: {
    num_actions: number;
    action_sequence: string[];
    success: boolean;
    task_description?: string;
  };
}

export class LeRobotExportService {
  private exportQueue: LeRobotDataset[] = [];
  private isExporting = false;

  async exportDataset(
    dataPoints: LerobotDataPoint[],
    metadata: {
      sessionId: string;
      duration: number;
      fps: number;
      resolution: { width: number; height: number };
    }
  ): Promise<string> {
    try {
      // Group data points into episodes
      const episodes = this.groupIntoEpisodes(dataPoints, metadata.sessionId);
      
      // Calculate dataset statistics
      const stats = this.calculateStatistics(episodes);
      
      // Create LeRobot dataset
      const dataset: LeRobotDataset = {
        version: '1.0.0',
        format: 'lerobot_v1',
        metadata: {
          created_at: new Date().toISOString(),
          device_info: {
            model: 'iPhone',
            os: 'iOS',
            app_version: '1.0.0'
          },
          recording_info: {
            duration_seconds: metadata.duration,
            fps: metadata.fps,
            resolution: metadata.resolution
          },
          dataset_stats: stats
        },
        episodes
      };

      // Save dataset to file
      const filePath = await this.saveDatasetToFile(dataset, metadata.sessionId);
      
      return filePath;
    } catch (error) {
      console.error('Failed to export LeRobot dataset:', error);
      throw error;
    }
  }

  private groupIntoEpisodes(
    dataPoints: LerobotDataPoint[],
    sessionId: string
  ): LeRobotEpisode[] {
    const episodes: LeRobotEpisode[] = [];
    let currentEpisode: LerobotDataPoint[] = [];
    let episodeStart = 0;
    let episodeIndex = 0;

    // Group data points by action sequences
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i];
      currentEpisode.push(point);

      // Check if this is the end of an episode (idle action or last point)
      const isIdle = point.action.type === 'idle';
      const isLast = i === dataPoints.length - 1;
      
      if ((isIdle && currentEpisode.length > 1) || isLast) {
        const episode: LeRobotEpisode = {
          episode_id: `${sessionId}_ep${episodeIndex}`,
          start_timestamp: currentEpisode[0].observation.timestamp,
          end_timestamp: point.observation.timestamp,
          duration_ms: point.observation.timestamp - currentEpisode[0].observation.timestamp,
          data_points: currentEpisode,
          summary: {
            num_actions: currentEpisode.filter(p => p.action.type !== 'idle').length,
            action_sequence: currentEpisode.map(p => p.action.type),
            success: true,
            task_description: this.inferTaskDescription(currentEpisode)
          }
        };
        
        episodes.push(episode);
        currentEpisode = [];
        episodeIndex++;
      }
    }

    return episodes;
  }

  private inferTaskDescription(dataPoints: LerobotDataPoint[]): string {
    const actions = dataPoints.map(p => p.action.type);
    
    // Infer task based on action sequence
    if (actions.includes('pick') && actions.includes('place')) {
      return 'Pick and place object';
    } else if (actions.includes('pick') && actions.includes('move')) {
      return 'Pick and move object';
    } else if (actions.includes('rotate')) {
      return 'Object manipulation with rotation';
    } else if (actions.includes('open') || actions.includes('close')) {
      return 'Gripper control task';
    } else if (actions.filter(a => a === 'move').length > 3) {
      return 'Navigation task';
    }
    
    return 'General manipulation task';
  }

  private calculateStatistics(episodes: LeRobotEpisode[]): {
    total_frames: number;
    total_actions: number;
    unique_actions: string[];
    action_distribution: Record<string, number>;
  } {
    let totalFrames = 0;
    let totalActions = 0;
    const actionCounts: Record<string, number> = {};
    const uniqueActions = new Set<string>();

    for (const episode of episodes) {
      totalFrames += episode.data_points.length;
      
      for (const point of episode.data_points) {
        if (point.action.type !== 'idle') {
          totalActions++;
          uniqueActions.add(point.action.type);
          actionCounts[point.action.type] = (actionCounts[point.action.type] || 0) + 1;
        }
      }
    }

    return {
      total_frames: totalFrames,
      total_actions: totalActions,
      unique_actions: Array.from(uniqueActions),
      action_distribution: actionCounts
    };
  }

  private async saveDatasetToFile(
    dataset: LeRobotDataset,
    sessionId: string
  ): Promise<string> {
    const exportDir = `${FileSystem.documentDirectory}lerobot_exports/`;
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });

    const fileName = `lerobot_${sessionId}_${Date.now()}.json`;
    const filePath = `${exportDir}${fileName}`;

    // Save main dataset file
    await FileSystem.writeAsStringAsync(
      filePath,
      JSON.stringify(dataset, null, 2)
    );

    // Also save in HDF5-compatible format (as JSON for now)
    await this.saveHDF5Format(dataset, sessionId);

    return filePath;
  }

  private async saveHDF5Format(dataset: LeRobotDataset, sessionId: string): Promise<void> {
    const hdf5Dir = `${FileSystem.documentDirectory}lerobot_hdf5/`;
    await FileSystem.makeDirectoryAsync(hdf5Dir, { intermediates: true });

    // Create HDF5-like structure
    const hdf5Data = {
      observations: {
        images: [],
        hand_poses: [],
        timestamps: []
      },
      actions: {
        types: [],
        parameters: [],
        confidences: []
      },
      metadata: dataset.metadata
    };

    // Flatten episodes into arrays
    for (const episode of dataset.episodes) {
      for (const point of episode.data_points) {
        hdf5Data.observations.hand_poses.push(point.observation.hand_poses);
        hdf5Data.observations.timestamps.push(point.observation.timestamp);
        hdf5Data.actions.types.push(point.action.type);
        hdf5Data.actions.parameters.push(point.action.parameters);
        hdf5Data.actions.confidences.push(point.action.confidence);
      }
    }

    const hdf5Path = `${hdf5Dir}${sessionId}_hdf5.json`;
    await FileSystem.writeAsStringAsync(hdf5Path, JSON.stringify(hdf5Data, null, 2));
  }

  async exportToCloud(filePath: string, cloudProvider: 'gdrive' | 's3' | 'huggingface'): Promise<string> {
    // Implementation would depend on the cloud provider
    switch (cloudProvider) {
      case 'huggingface':
        return await this.uploadToHuggingFace(filePath);
      case 's3':
        return await this.uploadToS3(filePath);
      case 'gdrive':
        return await this.uploadToGoogleDrive(filePath);
      default:
        throw new Error(`Unsupported cloud provider: ${cloudProvider}`);
    }
  }

  private async uploadToHuggingFace(filePath: string): Promise<string> {
    // Mock implementation - would use HuggingFace API
    const fileContent = await FileSystem.readAsStringAsync(filePath);
    const dataset = JSON.parse(fileContent);
    
    // In production, this would use the HuggingFace datasets API
    console.log('Uploading to HuggingFace...', dataset.metadata.created_at);
    
    // Return mock URL
    return `https://huggingface.co/datasets/humanoid-training/${dataset.metadata.created_at}`;
  }

  private async uploadToS3(filePath: string): Promise<string> {
    // Mock implementation - would use AWS SDK
    const fileContent = await FileSystem.readAsStringAsync(filePath);
    
    // In production, this would use AWS S3 SDK
    console.log('Uploading to S3...', filePath);
    
    // Return mock URL
    return `https://s3.amazonaws.com/humanoid-datasets/${filePath.split('/').pop()}`;
  }

  private async uploadToGoogleDrive(filePath: string): Promise<string> {
    // Mock implementation - would use Google Drive API
    const fileContent = await FileSystem.readAsStringAsync(filePath);
    
    // In production, this would use Google Drive API
    console.log('Uploading to Google Drive...', filePath);
    
    // Return mock URL
    return `https://drive.google.com/file/d/mock_file_id/view`;
  }

  async shareDataset(filePath: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share LeRobot Dataset',
        UTI: 'public.json'
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }

  async importDataset(): Promise<LeRobotDataset | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        const content = await FileSystem.readAsStringAsync(result.uri);
        const dataset = JSON.parse(content) as LeRobotDataset;
        
        // Validate dataset format
        if (this.validateDataset(dataset)) {
          return dataset;
        } else {
          throw new Error('Invalid LeRobot dataset format');
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to import dataset:', error);
      throw error;
    }
  }

  private validateDataset(dataset: any): dataset is LeRobotDataset {
    return (
      dataset &&
      typeof dataset.version === 'string' &&
      dataset.format &&
      dataset.metadata &&
      Array.isArray(dataset.episodes) &&
      dataset.episodes.every((ep: any) => 
        ep.episode_id &&
        Array.isArray(ep.data_points)
      )
    );
  }

  async convertToTensorFormat(dataset: LeRobotDataset): Promise<{
    observations: Float32Array[];
    actions: Float32Array[];
    rewards: Float32Array;
  }> {
    const observations: Float32Array[] = [];
    const actions: Float32Array[] = [];
    const rewards: number[] = [];

    for (const episode of dataset.episodes) {
      for (const point of episode.data_points) {
        // Convert hand poses to tensor format
        const handTensor = this.handPosesToTensor(point.observation.hand_poses);
        observations.push(handTensor);

        // Convert actions to tensor format
        const actionTensor = this.actionToTensor(point.action);
        actions.push(actionTensor);

        // Simple reward: 1 for successful actions, 0 for idle
        rewards.push(point.action.type !== 'idle' ? 1 : 0);
      }
    }

    return {
      observations,
      actions,
      rewards: new Float32Array(rewards)
    };
  }

  private handPosesToTensor(handPoses: any[]): Float32Array {
    // Flatten hand poses into a single array
    const tensorData: number[] = [];
    
    for (const hand of handPoses) {
      for (const keypoint of hand.keypoints) {
        tensorData.push(keypoint.x, keypoint.y, keypoint.z, keypoint.confidence);
      }
    }

    // Pad to fixed size (2 hands * 21 keypoints * 4 values = 168)
    while (tensorData.length < 168) {
      tensorData.push(0);
    }

    return new Float32Array(tensorData.slice(0, 168));
  }

  private actionToTensor(action: LerobotAction): Float32Array {
    // One-hot encode action type
    const actionTypes = ['idle', 'pick', 'place', 'move', 'rotate', 'open', 'close'];
    const actionIndex = actionTypes.indexOf(action.type);
    const oneHot = new Array(actionTypes.length).fill(0);
    if (actionIndex >= 0) {
      oneHot[actionIndex] = 1;
    }

    // Add action parameters (normalized)
    const params = [
      action.parameters.grip_force || 0,
      action.parameters.approach_speed || 0,
      action.parameters.release_speed || 0,
      action.parameters.placement_precision || 0,
      action.parameters.speed || 0,
      action.parameters.grip_strength || 0
    ];

    return new Float32Array([...oneHot, ...params, action.confidence]);
  }

  async generateTrainingScript(dataset: LeRobotDataset): Promise<string> {
    const script = `
#!/usr/bin/env python3
"""
LeRobot Training Script
Generated for dataset: ${dataset.metadata.created_at}
"""

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from lerobot.common.datasets.lerobot_dataset import LeRobotDataset
from lerobot.common.policies.diffusion.modeling_diffusion import DiffusionPolicy

class HumanoidDataset(Dataset):
    def __init__(self, data_path):
        # Load the exported dataset
        self.data = load_json(data_path)
        self.episodes = self.data['episodes']
        
    def __len__(self):
        return sum(len(ep['data_points']) for ep in self.episodes)
    
    def __getitem__(self, idx):
        # Get data point at index
        point = self.get_point(idx)
        
        # Convert to tensors
        observation = self.process_observation(point['observation'])
        action = self.process_action(point['action'])
        
        return observation, action

def train_policy(dataset_path, output_dir):
    # Initialize dataset
    dataset = HumanoidDataset(dataset_path)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    # Initialize policy
    policy = DiffusionPolicy(
        observation_dim=168,  # 2 hands * 21 keypoints * 4 values
        action_dim=14,  # 7 action types + 6 params + 1 confidence
        horizon=16
    )
    
    # Training loop
    optimizer = torch.optim.Adam(policy.parameters(), lr=1e-4)
    
    for epoch in range(100):
        for batch in dataloader:
            observations, actions = batch
            
            # Forward pass
            predicted_actions = policy(observations)
            loss = nn.MSELoss()(predicted_actions, actions)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
        print(f"Epoch {epoch}: Loss = {loss.item()}")
    
    # Save trained policy
    torch.save(policy.state_dict(), f"{output_dir}/policy.pt")
    
if __name__ == "__main__":
    train_policy("${dataset.metadata.created_at}.json", "./output")
`;

    // Save training script
    const scriptPath = `${FileSystem.documentDirectory}training_scripts/train_${Date.now()}.py`;
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}training_scripts/`,
      { intermediates: true }
    );
    await FileSystem.writeAsStringAsync(scriptPath, script);
    
    return scriptPath;
  }
}

export const leRobotExportService = new LeRobotExportService();