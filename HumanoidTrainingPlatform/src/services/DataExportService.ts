import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export interface ExportOptions {
  format: 'lerobot' | 'json' | 'csv' | 'hdf5';
  includeMetadata: boolean;
  compress: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sessions?: string[];
}

export interface TrainingDataPoint {
  timestamp: number;
  handPose: {
    landmarks: Array<{ x: number; y: number; z: number }>;
    confidence: number;
    gesture: string;
  };
  robotState?: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
    jointPositions: number[];
  };
  environment?: {
    objects: Array<{ id: string; position: any; type: string }>;
    lighting: string;
    temperature: number;
  };
  metadata: {
    sessionId: string;
    userId: string;
    taskType: string;
    difficulty: number;
  };
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

class DataExportService {
  private baseDirectory = FileSystem.documentDirectory + 'exports/';

  constructor() {
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.baseDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.baseDirectory, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }
  }

  async exportData(data: TrainingDataPoint[], options: ExportOptions): Promise<ExportResult> {
    try {
      await this.ensureDirectoryExists();

      let exportedData: string;
      let filename: string;
      let mimeType: string;

      // Filter data based on options
      const filteredData = this.filterData(data, options);

      switch (options.format) {
        case 'lerobot':
          ({ data: exportedData, filename, mimeType } = await this.exportToLeRobot(filteredData, options));
          break;
        case 'json':
          ({ data: exportedData, filename, mimeType } = await this.exportToJSON(filteredData, options));
          break;
        case 'csv':
          ({ data: exportedData, filename, mimeType } = await this.exportToCSV(filteredData, options));
          break;
        case 'hdf5':
          return await this.exportToHDF5(filteredData, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const filePath = this.baseDirectory + filename;
      await FileSystem.writeAsStringAsync(filePath, exportedData);

      // Compress if requested
      let finalPath = filePath;
      if (options.compress) {
        finalPath = await this.compressFile(filePath);
      }

      const fileInfo = await FileSystem.getInfoAsync(finalPath);

      return {
        success: true,
        filePath: finalPath,
        fileSize: fileInfo.size,
        recordCount: filteredData.length,
      };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private filterData(data: TrainingDataPoint[], options: ExportOptions): TrainingDataPoint[] {
    let filtered = [...data];

    // Filter by date range
    if (options.dateRange) {
      filtered = filtered.filter(
        point =>
          point.timestamp >= options.dateRange!.start.getTime() &&
          point.timestamp <= options.dateRange!.end.getTime()
      );
    }

    // Filter by sessions
    if (options.sessions && options.sessions.length > 0) {
      filtered = filtered.filter(point =>
        options.sessions!.includes(point.metadata.sessionId)
      );
    }

    return filtered;
  }

  private async exportToLeRobot(
    data: TrainingDataPoint[],
    options: ExportOptions
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const lerobotData = {
      info: {
        total_episodes: new Set(data.map(d => d.metadata.sessionId)).size,
        total_frames: data.length,
        total_tasks: 1,
        total_videos: 0,
        fps: 30,
        splits: {
          train: '0:80%',
          val: '80:90%',
          test: '90:100%',
        },
        keys: [
          'observation.hand_pose',
          'observation.environment',
          'action.robot_command',
          'episode_index',
          'frame_index',
          'timestamp',
        ],
      },
      episodes: this.groupDataByEpisodes(data, options),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lerobot_export_${timestamp}.json`;

    return {
      data: JSON.stringify(lerobotData, null, 2),
      filename,
      mimeType: 'application/json',
    };
  }

  private groupDataByEpisodes(data: TrainingDataPoint[], options: ExportOptions): any[] {
    const episodeMap = new Map<string, TrainingDataPoint[]>();

    // Group by session ID
    data.forEach(point => {
      if (!episodeMap.has(point.metadata.sessionId)) {
        episodeMap.set(point.metadata.sessionId, []);
      }
      episodeMap.get(point.metadata.sessionId)!.push(point);
    });

    // Convert to LeRobot episode format
    const episodes: any[] = [];
    let episodeIndex = 0;

    episodeMap.forEach((points, sessionId) => {
      const episode = {
        episode_index: episodeIndex++,
        length: points.length,
        task: points[0].metadata.taskType,
        created_at: new Date(Math.min(...points.map(p => p.timestamp))).toISOString(),
        frames: points.map((point, frameIndex) => ({
          frame_index: frameIndex,
          timestamp: point.timestamp,
          observation: {
            hand_pose: {
              landmarks: point.handPose.landmarks,
              confidence: point.handPose.confidence,
              gesture: point.handPose.gesture,
            },
            environment: point.environment || null,
          },
          action: {
            robot_command: point.robotState || null,
          },
          next_reward: frameIndex === points.length - 1 ? 1.0 : 0.0,
          terminated: frameIndex === points.length - 1,
          truncated: false,
        })),
      };

      if (options.includeMetadata) {
        episode.metadata = {
          user_id: points[0].metadata.userId,
          difficulty: points[0].metadata.difficulty,
          session_stats: {
            duration: points[points.length - 1].timestamp - points[0].timestamp,
            avg_confidence: points.reduce((sum, p) => sum + p.handPose.confidence, 0) / points.length,
          },
        };
      }

      episodes.push(episode);
    });

    return episodes;
  }

  private async exportToJSON(
    data: TrainingDataPoint[],
    options: ExportOptions
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const exportData = {
      metadata: {
        export_timestamp: new Date().toISOString(),
        total_records: data.length,
        format_version: '1.0.0',
        options: options,
      },
      data: options.includeMetadata ? data : data.map(({ metadata, ...rest }) => rest),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training_data_${timestamp}.json`;

    return {
      data: JSON.stringify(exportData, null, 2),
      filename,
      mimeType: 'application/json',
    };
  }

  private async exportToCSV(
    data: TrainingDataPoint[],
    options: ExportOptions
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // CSV headers
    const headers = [
      'timestamp',
      'session_id',
      'user_id',
      'task_type',
      'gesture',
      'confidence',
      'hand_landmarks_json',
      'robot_position_x',
      'robot_position_y',
      'robot_position_z',
      'robot_orientation_x',
      'robot_orientation_y',
      'robot_orientation_z',
      'robot_orientation_w',
    ];

    if (options.includeMetadata) {
      headers.push('difficulty', 'environment_json');
    }

    // Convert data to CSV rows
    const csvRows = data.map(point => {
      const row = [
        point.timestamp.toString(),
        point.metadata.sessionId,
        point.metadata.userId,
        point.metadata.taskType,
        point.handPose.gesture,
        point.handPose.confidence.toString(),
        JSON.stringify(point.handPose.landmarks),
        point.robotState?.position.x?.toString() || '',
        point.robotState?.position.y?.toString() || '',
        point.robotState?.position.z?.toString() || '',
        point.robotState?.orientation.x?.toString() || '',
        point.robotState?.orientation.y?.toString() || '',
        point.robotState?.orientation.z?.toString() || '',
        point.robotState?.orientation.w?.toString() || '',
      ];

      if (options.includeMetadata) {
        row.push(
          point.metadata.difficulty.toString(),
          point.environment ? JSON.stringify(point.environment) : ''
        );
      }

      return row;
    });

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `training_data_${timestamp}.csv`;

    return {
      data: csvContent,
      filename,
      mimeType: 'text/csv',
    };
  }

  private async exportToHDF5(
    data: TrainingDataPoint[],
    options: ExportOptions
  ): Promise<ExportResult> {
    // HDF5 export would require a native library
    // For now, we'll simulate it by creating a structured binary-like format
    try {
      const structuredData = {
        metadata: {
          format: 'hdf5_compatible',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
        datasets: {
          hand_poses: data.map(d => d.handPose),
          robot_states: data.map(d => d.robotState),
          timestamps: data.map(d => d.timestamp),
          sessions: data.map(d => d.metadata.sessionId),
        },
      };

      const jsonData = JSON.stringify(structuredData);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `training_data_${timestamp}.h5.json`;
      const filePath = this.baseDirectory + filename;

      await FileSystem.writeAsStringAsync(filePath, jsonData);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      return {
        success: true,
        filePath,
        fileSize: fileInfo.size,
        recordCount: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HDF5 export failed',
      };
    }
  }

  private async compressFile(filePath: string): Promise<string> {
    // Simulate compression by adding a .gz extension
    // In a real implementation, you'd use a compression library
    const compressedPath = filePath + '.gz';
    await FileSystem.copyAsync({ from: filePath, to: compressedPath });
    await FileSystem.deleteAsync(filePath);
    return compressedPath;
  }

  async shareExportedFile(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'File sharing is not available on this device');
        return false;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: this.getMimeTypeFromPath(filePath),
        dialogTitle: 'Share Training Data',
      });

      return true;
    } catch (error) {
      console.error('Sharing failed:', error);
      Alert.alert('Sharing failed', 'Unable to share the exported file');
      return false;
    }
  }

  private getMimeTypeFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'gz':
        return 'application/gzip';
      default:
        return 'application/octet-stream';
    }
  }

  async getExportHistory(): Promise<Array<{ name: string; size: number; created: Date }>> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.baseDirectory);
      const fileInfos = await Promise.all(
        files.map(async fileName => {
          const filePath = this.baseDirectory + fileName;
          const info = await FileSystem.getInfoAsync(filePath);
          return {
            name: fileName,
            size: info.size || 0,
            created: new Date(info.modificationTime || 0),
          };
        })
      );

      return fileInfos.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error('Failed to get export history:', error);
      return [];
    }
  }

  async deleteExportedFile(filename: string): Promise<boolean> {
    try {
      const filePath = this.baseDirectory + filename;
      await FileSystem.deleteAsync(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  async clearAllExports(): Promise<boolean> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.baseDirectory);
      await Promise.all(
        files.map(fileName =>
          FileSystem.deleteAsync(this.baseDirectory + fileName)
        )
      );
      return true;
    } catch (error) {
      console.error('Failed to clear exports:', error);
      return false;
    }
  }
}

export const dataExportService = new DataExportService();