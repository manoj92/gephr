import { HandPose } from '../types';
import RNFS from 'react-native-fs';
import { Alert, Platform } from 'react-native';

interface LeRobotDataset {
  version: string;
  metadata: {
    task_name: string;
    robot_type: string;
    recording_device: string;
    recording_mode: string;
    fps: number;
    resolution: [number, number];
    duration_seconds: number;
    total_episodes: number;
    total_frames: number;
    creation_date: string;
    hand_tracking_config: {
      detection_confidence: number;
      tracking_confidence: number;
      max_hands: number;
      shirt_pocket_mode: boolean;
    };
  };
  episodes: LeRobotEpisode[];
}

interface LeRobotEpisode {
  episode_id: string;
  skill_label: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_ms: number;
  frames: LeRobotFrame[];
  statistics: {
    total_frames: number;
    detected_hands: number;
    action_distribution: { [action: string]: number };
    average_confidence: number;
  };
}

interface LeRobotFrame {
  frame_id: number;
  timestamp: number;
  relative_timestamp: number;
  observations: {
    image_path?: string;
    hands: {
      left: HandObservation | null;
      right: HandObservation | null;
    };
    robot_state?: any;
  };
  actions: LeRobotActionData;
}

interface HandObservation {
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }>;
  world_landmarks?: Array<{
    x: number;
    y: number;
    z: number;
  }>;
  handedness: 'Left' | 'Right';
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface LeRobotActionData {
  action_type: string;
  action_parameters: {
    position?: [number, number, number];
    orientation?: [number, number, number, number];
    gripper_state?: 'open' | 'closed' | 'closing' | 'opening';
    velocity?: [number, number, number];
    force?: number;
  };
  confidence: number;
  predicted_next_action?: string;
}

export class LeRobotExportService {
  private exportPath: string;

  constructor() {
    this.exportPath = Platform.OS === 'ios'
      ? RNFS.DocumentDirectoryPath
      : RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;
  }

  async exportToLeRobotFormat(
    episodes: any[],
    taskName: string,
    robotType: string = 'humanoid'
  ): Promise<string> {
    try {
      console.log('Starting LeRobot export...');

      const dataset = this.createLeRobotDataset(episodes, taskName, robotType);
      const fileName = `lerobot_${taskName}_${Date.now()}.json`;
      const filePath = `${this.exportPath}/${fileName}`;

      // Write to file
      await RNFS.writeFile(filePath, JSON.stringify(dataset, null, 2), 'utf8');

      // Also create a compressed version
      const compressedData = this.compressDataset(dataset);
      const compressedFileName = `lerobot_${taskName}_${Date.now()}_compressed.json`;
      const compressedPath = `${this.exportPath}/${compressedFileName}`;
      await RNFS.writeFile(compressedPath, JSON.stringify(compressedData), 'utf8');

      console.log(`LeRobot dataset exported to: ${filePath}`);
      console.log(`Compressed version at: ${compressedPath}`);

      // Generate training-ready format
      const trainingData = await this.generateTrainingFormat(dataset);
      const trainingFileName = `lerobot_training_${taskName}_${Date.now()}.json`;
      const trainingPath = `${this.exportPath}/${trainingFileName}`;
      await RNFS.writeFile(trainingPath, JSON.stringify(trainingData, null, 2), 'utf8');

      Alert.alert(
        'Export Successful',
        `LeRobot dataset exported successfully!\n\nFiles created:\n- ${fileName}\n- ${compressedFileName}\n- ${trainingFileName}`,
        [{ text: 'OK' }]
      );

      return filePath;
    } catch (error) {
      console.error('LeRobot export failed:', error);
      Alert.alert('Export Failed', error.message || 'Unknown error occurred');
      throw error;
    }
  }

  private createLeRobotDataset(
    episodes: any[],
    taskName: string,
    robotType: string
  ): LeRobotDataset {
    const processedEpisodes: LeRobotEpisode[] = [];
    let totalFrames = 0;
    let totalDuration = 0;

    for (const episode of episodes) {
      const lerobotEpisode = this.processEpisode(episode);
      processedEpisodes.push(lerobotEpisode);
      totalFrames += lerobotEpisode.frames.length;
      totalDuration += lerobotEpisode.duration_ms;
    }

    return {
      version: '2.0',
      metadata: {
        task_name: taskName,
        robot_type: robotType,
        recording_device: `${Platform.OS} - React Native Camera`,
        recording_mode: 'shirt_pocket',
        fps: 15,
        resolution: [1920, 1080],
        duration_seconds: totalDuration / 1000,
        total_episodes: episodes.length,
        total_frames: totalFrames,
        creation_date: new Date().toISOString(),
        hand_tracking_config: {
          detection_confidence: 0.7,
          tracking_confidence: 0.5,
          max_hands: 2,
          shirt_pocket_mode: true,
        },
      },
      episodes: processedEpisodes,
    };
  }

  private processEpisode(episode: any): LeRobotEpisode {
    const frames: LeRobotFrame[] = [];
    const actionDistribution: { [action: string]: number } = {};
    let totalConfidence = 0;
    let detectedHands = 0;

    for (let i = 0; i < episode.dataPoints.length; i++) {
      const dataPoint = episode.dataPoints[i];
      const frame = this.createLeRobotFrame(dataPoint, i, episode.startTime);
      frames.push(frame);

      // Update statistics
      if (dataPoint.action?.type) {
        actionDistribution[dataPoint.action.type] =
          (actionDistribution[dataPoint.action.type] || 0) + 1;
      }

      if (dataPoint.hands?.left || dataPoint.hands?.right) {
        detectedHands++;
      }

      totalConfidence += dataPoint.action?.confidence || 0;
    }

    const duration = episode.endTime - episode.startTime;

    return {
      episode_id: episode.id,
      skill_label: episode.skillLabel,
      start_timestamp: episode.startTime,
      end_timestamp: episode.endTime || episode.startTime + duration,
      duration_ms: duration,
      frames: frames,
      statistics: {
        total_frames: frames.length,
        detected_hands: detectedHands,
        action_distribution: actionDistribution,
        average_confidence: totalConfidence / frames.length,
      },
    };
  }

  private createLeRobotFrame(dataPoint: any, frameIndex: number, episodeStart: number): LeRobotFrame {
    const relativeTime = dataPoint.timestamp - episodeStart;

    return {
      frame_id: frameIndex,
      timestamp: dataPoint.timestamp,
      relative_timestamp: relativeTime,
      observations: {
        image_path: dataPoint.imagePath,
        hands: {
          left: dataPoint.hands?.left ? this.convertHandToObservation(dataPoint.hands.left) : null,
          right: dataPoint.hands?.right ? this.convertHandToObservation(dataPoint.hands.right) : null,
        },
      },
      actions: this.convertToLeRobotAction(dataPoint.action, dataPoint.hands),
    };
  }

  private convertHandToObservation(hand: HandPose): HandObservation {
    // Calculate bounding box from landmarks
    const xs = hand.landmarks.map(l => l.x);
    const ys = hand.landmarks.map(l => l.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      landmarks: hand.landmarks.map(l => ({
        x: l.x,
        y: l.y,
        z: l.z || 0,
        visibility: l.confidence,
      })),
      handedness: hand.handedness,
      confidence: hand.confidence,
      bbox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  }

  private convertToLeRobotAction(action: any, hands: any): LeRobotActionData {
    const actionData: LeRobotActionData = {
      action_type: action?.type || 'idle',
      action_parameters: {},
      confidence: action?.confidence || 0,
    };

    // Map hand gestures to robot actions
    switch (action?.type) {
      case 'pick':
      case 'pinch_close':
        actionData.action_parameters = {
          gripper_state: 'closing',
          force: 0.7,
        };
        break;

      case 'place':
        actionData.action_parameters = {
          gripper_state: 'opening',
          velocity: [0, 0, -0.1],
        };
        break;

      case 'grasp':
        actionData.action_parameters = {
          gripper_state: 'closed',
          force: 0.9,
        };
        break;

      case 'move':
        // Calculate movement direction from hand position
        if (hands?.right) {
          const wrist = hands.right.landmarks[0];
          actionData.action_parameters = {
            position: [wrist.x - 0.5, wrist.y - 0.5, wrist.z || 0],
            velocity: [0.1, 0.1, 0],
          };
        }
        break;

      case 'rotate':
        actionData.action_parameters = {
          orientation: [0, 0, 0.1, 1],
        };
        break;

      case 'open_palm':
      case 'open':
        actionData.action_parameters = {
          gripper_state: 'open',
        };
        break;

      case 'point':
        // Calculate pointing direction
        if (hands?.right) {
          const wrist = hands.right.landmarks[0];
          const indexTip = hands.right.landmarks[8];
          const direction = [
            indexTip.x - wrist.x,
            indexTip.y - wrist.y,
            (indexTip.z || 0) - (wrist.z || 0),
          ];
          actionData.action_parameters = {
            position: direction,
          };
        }
        break;
    }

    // Add predicted next action based on action sequences
    actionData.predicted_next_action = this.predictNextAction(action?.type);

    return actionData;
  }

  private predictNextAction(currentAction: string): string {
    // Simple action sequence prediction
    const actionSequences: { [key: string]: string } = {
      'pinch_close': 'move',
      'move': 'place',
      'place': 'open',
      'grasp': 'move',
      'rotate': 'place',
      'point': 'move',
    };

    return actionSequences[currentAction] || 'idle';
  }

  private compressDataset(dataset: LeRobotDataset): any {
    // Create a compressed version with reduced precision
    const compressed = {
      v: dataset.version,
      m: {
        t: dataset.metadata.task_name,
        r: dataset.metadata.robot_type,
        f: dataset.metadata.fps,
        e: dataset.metadata.total_episodes,
        d: Math.round(dataset.metadata.duration_seconds),
      },
      e: dataset.episodes.map(ep => ({
        i: ep.episode_id.substring(0, 8),
        s: ep.skill_label,
        f: ep.frames.map(f => ({
          t: f.relative_timestamp,
          a: f.actions.action_type,
          c: Math.round(f.actions.confidence * 100) / 100,
          h: {
            l: f.observations.hands.left ? 1 : 0,
            r: f.observations.hands.right ? 1 : 0,
          },
        })),
      })),
    };

    return compressed;
  }

  private async generateTrainingFormat(dataset: LeRobotDataset): Promise<any> {
    // Generate format optimized for training
    const trainingData = {
      task: dataset.metadata.task_name,
      version: '1.0',
      data: [],
    };

    for (const episode of dataset.episodes) {
      for (const frame of episode.frames) {
        // Flatten data for easier training
        const trainingFrame = {
          episode_id: episode.episode_id,
          skill: episode.skill_label,
          timestamp: frame.relative_timestamp,
          action: frame.actions.action_type,
          confidence: frame.actions.confidence,
          left_hand: frame.observations.hands.left ? 1 : 0,
          right_hand: frame.observations.hands.right ? 1 : 0,
          gripper: frame.actions.action_parameters.gripper_state || 'unknown',
        };

        // Add landmark features if hands detected
        if (frame.observations.hands.left) {
          trainingFrame.left_wrist_x = frame.observations.hands.left.landmarks[0].x;
          trainingFrame.left_wrist_y = frame.observations.hands.left.landmarks[0].y;
        }
        if (frame.observations.hands.right) {
          trainingFrame.right_wrist_x = frame.observations.hands.right.landmarks[0].x;
          trainingFrame.right_wrist_y = frame.observations.hands.right.landmarks[0].y;
        }

        trainingData.data.push(trainingFrame);
      }
    }

    return trainingData;
  }

  async validateDataset(filePath: string): Promise<boolean> {
    try {
      const content = await RNFS.readFile(filePath, 'utf8');
      const dataset = JSON.parse(content);

      // Validate structure
      if (!dataset.version || !dataset.metadata || !dataset.episodes) {
        throw new Error('Invalid dataset structure');
      }

      // Validate episodes
      for (const episode of dataset.episodes) {
        if (!episode.episode_id || !episode.frames || episode.frames.length === 0) {
          throw new Error(`Invalid episode: ${episode.episode_id}`);
        }
      }

      console.log('Dataset validation successful');
      return true;
    } catch (error) {
      console.error('Dataset validation failed:', error);
      return false;
    }
  }
}

export default new LeRobotExportService();
