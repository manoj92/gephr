import { HandPose, ArmPose, FullBodyPose, ArmCommand } from '../types';
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
    hands?: {
      left: HandObservation | null;
      right: HandObservation | null;
    };
    arms?: {
      left: ArmObservation | null;
      right: ArmObservation | null;
    };
    full_body_pose?: FullBodyObservation;
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

interface ArmObservation {
  side: 'Left' | 'Right';
  shoulder: { x: number; y: number; z: number; confidence: number };
  elbow: { x: number; y: number; z: number; confidence: number };
  wrist: { x: number; y: number; z: number; confidence: number };
  hand?: HandObservation;
  joint_angles: {
    shoulder_flexion: number;
    shoulder_abduction: number;
    shoulder_rotation: number;
    elbow_flexion: number;
    wrist_flexion: number;
    wrist_deviation: number;
  };
  confidence: number;
}

interface FullBodyObservation {
  left_arm?: ArmObservation;
  right_arm?: ArmObservation;
  torso: {
    left_shoulder: { x: number; y: number; z: number };
    right_shoulder: { x: number; y: number; z: number };
    left_hip: { x: number; y: number; z: number };
    right_hip: { x: number; y: number; z: number };
    neck: { x: number; y: number; z: number };
    nose: { x: number; y: number; z: number };
  };
  confidence: number;
}

interface LeRobotActionData {
  action_type: string;
  action_parameters: {
    position?: [number, number, number];
    orientation?: [number, number, number, number];
    gripper_state?: 'open' | 'closed' | 'closing' | 'opening';
    velocity?: [number, number, number];
    force?: number;
    arm_commands?: {
      left?: {
        shoulder_angles: [number, number, number];
        elbow_angle: number;
        wrist_angles: [number, number];
        gripper_state: string;
        target_position: [number, number, number];
      };
      right?: {
        shoulder_angles: [number, number, number];
        elbow_angle: number;
        wrist_angles: [number, number];
        gripper_state: string;
        target_position: [number, number, number];
      };
    };
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
        recording_mode: taskName.includes('arm') ? 'full_arm_tracking' : 'shirt_pocket',
        fps: 15,
        resolution: [1920, 1080],
        duration_seconds: totalDuration / 1000,
        total_episodes: episodes.length,
        total_frames: totalFrames,
        creation_date: new Date().toISOString(),
        tracking_config: {
          detection_confidence: 0.7,
          tracking_confidence: 0.5,
          max_hands: 2,
          enable_pose_detection: true,
          enable_arm_tracking: true,
          joint_smoothing: 0.8,
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

    const observations: any = {
      image_path: dataPoint.imagePath,
    };

    // Add hands if available
    if (dataPoint.hands) {
      observations.hands = {
        left: dataPoint.hands?.left ? this.convertHandToObservation(dataPoint.hands.left) : null,
        right: dataPoint.hands?.right ? this.convertHandToObservation(dataPoint.hands.right) : null,
      };
    }

    // Add arms if available
    if (dataPoint.arms) {
      observations.arms = {
        left: dataPoint.arms?.left ? this.convertArmToObservation(dataPoint.arms.left) : null,
        right: dataPoint.arms?.right ? this.convertArmToObservation(dataPoint.arms.right) : null,
      };
    }

    // Add full body pose if available
    if (dataPoint.full_body_pose) {
      observations.full_body_pose = this.convertFullBodyToObservation(dataPoint.full_body_pose);
    }

    return {
      frame_id: frameIndex,
      timestamp: dataPoint.timestamp,
      relative_timestamp: relativeTime,
      observations,
      actions: this.convertToLeRobotAction(dataPoint.action, dataPoint),
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

  private convertToLeRobotAction(action: any, dataPoint: any): LeRobotActionData {
    const actionData: LeRobotActionData = {
      action_type: action?.type || 'idle',
      action_parameters: {},
      confidence: action?.confidence || 0,
    };

    // Enhanced action mapping for arm tracking
    if (action?.arm_commands) {
      actionData.action_parameters.arm_commands = {};

      if (action.arm_commands.left) {
        actionData.action_parameters.arm_commands.left = {
          shoulder_angles: action.arm_commands.left.shoulder_angles,
          elbow_angle: action.arm_commands.left.elbow_angle,
          wrist_angles: action.arm_commands.left.wrist_angles,
          gripper_state: action.arm_commands.left.gripper_state,
          target_position: action.arm_commands.left.target_position,
        };
      }

      if (action.arm_commands.right) {
        actionData.action_parameters.arm_commands.right = {
          shoulder_angles: action.arm_commands.right.shoulder_angles,
          elbow_angle: action.arm_commands.right.elbow_angle,
          wrist_angles: action.arm_commands.right.wrist_angles,
          gripper_state: action.arm_commands.right.gripper_state,
          target_position: action.arm_commands.right.target_position,
        };
      }
    }

    // Map arm actions to robot commands
    switch (action?.type) {
      case 'left_reach':
      case 'right_reach':
      case 'dual_arm_reach_reach':
        actionData.action_parameters = {
          ...actionData.action_parameters,
          velocity: [0.2, 0.2, 0.1],
        };
        break;

      case 'left_reach_and_grasp':
      case 'right_reach_and_grasp':
        actionData.action_parameters = {
          ...actionData.action_parameters,
          gripper_state: 'closing',
          force: 0.8,
        };
        break;

      case 'left_retract_and_release':
      case 'right_retract_and_release':
        actionData.action_parameters = {
          ...actionData.action_parameters,
          gripper_state: 'opening',
          velocity: [-0.1, -0.1, 0],
        };
        break;

      case 'left_lateral_movement':
      case 'right_lateral_movement':
        actionData.action_parameters = {
          ...actionData.action_parameters,
          velocity: [0.1, 0, 0],
        };
        break;

      case 'left_manipulate':
      case 'right_manipulate':
        actionData.action_parameters = {
          ...actionData.action_parameters,
          orientation: [0, 0, 0.1, 1],
          force: 0.5,
        };
        break;

      // Fallback to hand-based actions
      default:
        this.mapHandBasedActions(action, dataPoint, actionData);
    }

    actionData.predicted_next_action = this.predictNextArmAction(action?.type);
    return actionData;
  }

  private mapHandBasedActions(action: any, dataPoint: any, actionData: LeRobotActionData) {
    const hands = dataPoint.hands;

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

      case 'move':
        if (hands?.right || dataPoint.arms?.right) {
          const wrist = dataPoint.arms?.right?.wrist || hands?.right?.landmarks?.[0];
          if (wrist) {
            actionData.action_parameters = {
              position: [wrist.x - 0.5, wrist.y - 0.5, wrist.z || 0],
              velocity: [0.1, 0.1, 0],
            };
          }
        }
        break;
    }
  }

  private predictNextArmAction(currentAction: string): string {
    // Enhanced action sequence prediction for arm movements
    const armActionSequences: { [key: string]: string } = {
      'left_reach': 'left_reach_and_grasp',
      'right_reach': 'right_reach_and_grasp',
      'left_reach_and_grasp': 'left_manipulate',
      'right_reach_and_grasp': 'right_manipulate',
      'left_manipulate': 'left_retract_and_release',
      'right_manipulate': 'right_retract_and_release',
      'left_retract_and_release': 'idle',
      'right_retract_and_release': 'idle',
      'dual_arm_reach_reach': 'dual_arm_grasp_grasp',
      'pinch_close': 'move',
      'move': 'place',
      'place': 'open',
      'grasp': 'move',
      'rotate': 'place',
      'point': 'move',
    };

    return armActionSequences[currentAction] || 'idle';
  }

  private convertArmToObservation(arm: ArmPose): ArmObservation {
    return {
      side: arm.side,
      shoulder: {
        x: arm.shoulder.x,
        y: arm.shoulder.y,
        z: arm.shoulder.z || 0,
        confidence: arm.shoulder.confidence || 0.8,
      },
      elbow: {
        x: arm.elbow.x,
        y: arm.elbow.y,
        z: arm.elbow.z || 0,
        confidence: arm.elbow.confidence || 0.8,
      },
      wrist: {
        x: arm.wrist.x,
        y: arm.wrist.y,
        z: arm.wrist.z || 0,
        confidence: arm.wrist.confidence || 0.8,
      },
      hand: arm.hand.landmarks.length > 0 ? this.convertHandToObservation(arm.hand) : undefined,
      joint_angles: {
        shoulder_flexion: arm.jointAngles.shoulderFlexion,
        shoulder_abduction: arm.jointAngles.shoulderAbduction,
        shoulder_rotation: arm.jointAngles.shoulderRotation,
        elbow_flexion: arm.jointAngles.elbowFlexion,
        wrist_flexion: arm.jointAngles.wristFlexion,
        wrist_deviation: arm.jointAngles.wristDeviation,
      },
      confidence: arm.confidence,
    };
  }

  private convertFullBodyToObservation(pose: FullBodyPose): FullBodyObservation {
    return {
      left_arm: pose.leftArm ? this.convertArmToObservation(pose.leftArm) : undefined,
      right_arm: pose.rightArm ? this.convertArmToObservation(pose.rightArm) : undefined,
      torso: {
        left_shoulder: {
          x: pose.torso.leftShoulder.x,
          y: pose.torso.leftShoulder.y,
          z: pose.torso.leftShoulder.z || 0,
        },
        right_shoulder: {
          x: pose.torso.rightShoulder.x,
          y: pose.torso.rightShoulder.y,
          z: pose.torso.rightShoulder.z || 0,
        },
        left_hip: {
          x: pose.torso.leftHip.x,
          y: pose.torso.leftHip.y,
          z: pose.torso.leftHip.z || 0,
        },
        right_hip: {
          x: pose.torso.rightHip.x,
          y: pose.torso.rightHip.y,
          z: pose.torso.rightHip.z || 0,
        },
        neck: {
          x: pose.torso.neck.x,
          y: pose.torso.neck.y,
          z: pose.torso.neck.z || 0,
        },
        nose: {
          x: pose.torso.nose.x,
          y: pose.torso.nose.y,
          z: pose.torso.nose.z || 0,
        },
      },
      confidence: pose.confidence,
    };
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
        if (frame.observations.hands?.left) {
          trainingFrame.left_wrist_x = frame.observations.hands.left.landmarks[0].x;
          trainingFrame.left_wrist_y = frame.observations.hands.left.landmarks[0].y;
        }
        if (frame.observations.hands?.right) {
          trainingFrame.right_wrist_x = frame.observations.hands.right.landmarks[0].x;
          trainingFrame.right_wrist_y = frame.observations.hands.right.landmarks[0].y;
        }

        // Add arm features if arms detected
        if (frame.observations.arms?.left) {
          trainingFrame.left_shoulder_x = frame.observations.arms.left.shoulder.x;
          trainingFrame.left_shoulder_y = frame.observations.arms.left.shoulder.y;
          trainingFrame.left_elbow_x = frame.observations.arms.left.elbow.x;
          trainingFrame.left_elbow_y = frame.observations.arms.left.elbow.y;
          trainingFrame.left_elbow_flexion = frame.observations.arms.left.joint_angles.elbow_flexion;
          trainingFrame.left_shoulder_flexion = frame.observations.arms.left.joint_angles.shoulder_flexion;
        }
        if (frame.observations.arms?.right) {
          trainingFrame.right_shoulder_x = frame.observations.arms.right.shoulder.x;
          trainingFrame.right_shoulder_y = frame.observations.arms.right.shoulder.y;
          trainingFrame.right_elbow_x = frame.observations.arms.right.elbow.x;
          trainingFrame.right_elbow_y = frame.observations.arms.right.elbow.y;
          trainingFrame.right_elbow_flexion = frame.observations.arms.right.joint_angles.elbow_flexion;
          trainingFrame.right_shoulder_flexion = frame.observations.arms.right.joint_angles.shoulder_flexion;
        }

        // Add full body pose features
        if (frame.observations.full_body_pose) {
          trainingFrame.body_confidence = frame.observations.full_body_pose.confidence;
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
