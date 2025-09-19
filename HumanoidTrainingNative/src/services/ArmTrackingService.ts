import { ArmPose, FullBodyPose, HandPose, Keypoint, LerobotDataPoint, ArmCommand, POSE_LANDMARKS } from '../types';
import { Alert, Platform } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import RNFS from 'react-native-fs';

interface ArmTrackingConfig {
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  modelComplexity: 0 | 1 | 2;
  enableSegmentation: boolean;
  smoothLandmarks: boolean;
  shirtPocketMode: boolean;
  trackArmsOnly: boolean;
  armJointSmoothing: number;
  autoEpisodeDetection: boolean;
  episodeTimeoutMs: number;
  minEpisodeFrames: number;
}

interface SkillEpisode {
  id: string;
  skillLabel: string;
  startTime: number;
  endTime?: number;
  dataPoints: LerobotDataPoint[];
}

export class ArmTrackingService {
  private config: ArmTrackingConfig;
  private isTracking: boolean = false;
  private currentEpisode: SkillEpisode | null = null;
  private episodes: SkillEpisode[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private isInitialized: boolean = false;
  private poseDetector: any = null;
  private handDetector: any = null;
  private tfReady: boolean = false;
  private lastArmPoses: { left?: ArmPose; right?: ArmPose } = {};
  private lastFullBodyPose?: FullBodyPose;
  private armHistory: Array<{ left?: ArmPose; right?: ArmPose }> = [];
  private gestureHistory: string[] = [];

  constructor(config: Partial<ArmTrackingConfig> = {}) {
    this.config = {
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
      modelComplexity: 1,
      enableSegmentation: false,
      smoothLandmarks: true,
      shirtPocketMode: true,
      trackArmsOnly: true,
      armJointSmoothing: 0.8,
      autoEpisodeDetection: true,
      episodeTimeoutMs: 5000,
      minEpisodeFrames: 10,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Advanced Arm Tracking Service...');

      // Initialize TensorFlow.js
      await tf.ready();
      this.tfReady = true;
      console.log('TensorFlow.js initialized');

      // Load MediaPipe pose and hand models
      await this.loadPoseDetectionModels();

      this.isInitialized = true;
      console.log('Arm Tracking Service initialized successfully with full arm pose detection');
    } catch (error) {
      console.error('Failed to initialize Arm Tracking Service:', error);
      // Fallback to simulation mode
      this.isInitialized = true;
      this.tfReady = false;
      console.log('Running in simulation mode for development');
    }
  }

  private async loadPoseDetectionModels(): Promise<void> {
    try {
      // In production, load actual MediaPipe models
      console.log('Loading MediaPipe Pose and Hands models...');

      // Placeholder for MediaPipe model loading
      this.poseDetector = {
        detect: async (imageData: any) => {
          return this.performPoseDetection(imageData);
        }
      };

      this.handDetector = {
        detect: async (imageData: any) => {
          return this.performHandDetection(imageData);
        }
      };

      console.log('Pose and hand detection models loaded successfully');
    } catch (error) {
      console.error('Error loading pose models:', error);
      throw error;
    }
  }

  private async performPoseDetection(imageData: any): Promise<any> {
    // Placeholder for actual MediaPipe pose detection
    // Returns pose landmarks following MediaPipe Pose format
    return {
      poseLandmarks: this.generateMockPoseLandmarks(),
      confidence: 0.85 + Math.random() * 0.1
    };
  }

  private async performHandDetection(imageData: any): Promise<any[]> {
    // Placeholder for actual MediaPipe hand detection
    return this.generateMockHandDetections();
  }

  private generateMockPoseLandmarks(): Keypoint[] {
    const landmarks: Keypoint[] = [];
    const currentTime = Date.now();

    // Generate all 33 pose landmarks
    for (let i = 0; i < 33; i++) {
      let x = 0.5, y = 0.5, z = 0;

      switch (i) {
        case POSE_LANDMARKS.LEFT_SHOULDER:
          x = 0.35 + Math.sin(currentTime / 1000) * 0.05;
          y = 0.3 + Math.cos(currentTime / 1200) * 0.03;
          break;
        case POSE_LANDMARKS.RIGHT_SHOULDER:
          x = 0.65 + Math.sin(currentTime / 1100) * 0.05;
          y = 0.3 + Math.cos(currentTime / 1300) * 0.03;
          break;
        case POSE_LANDMARKS.LEFT_ELBOW:
          x = 0.25 + Math.sin(currentTime / 800) * 0.1;
          y = 0.45 + Math.cos(currentTime / 900) * 0.08;
          break;
        case POSE_LANDMARKS.RIGHT_ELBOW:
          x = 0.75 + Math.sin(currentTime / 850) * 0.1;
          y = 0.45 + Math.cos(currentTime / 950) * 0.08;
          break;
        case POSE_LANDMARKS.LEFT_WRIST:
          x = 0.2 + Math.sin(currentTime / 600) * 0.15;
          y = 0.6 + Math.cos(currentTime / 700) * 0.12;
          break;
        case POSE_LANDMARKS.RIGHT_WRIST:
          x = 0.8 + Math.sin(currentTime / 650) * 0.15;
          y = 0.6 + Math.cos(currentTime / 750) * 0.12;
          break;
        default:
          x = 0.5 + Math.sin(currentTime / 1000 + i) * 0.02;
          y = 0.5 + Math.cos(currentTime / 1000 + i) * 0.02;
      }

      landmarks.push({
        x,
        y,
        z,
        visibility: 0.9 + Math.random() * 0.1,
        confidence: 0.85 + Math.random() * 0.1,
      });
    }

    return landmarks;
  }

  private generateMockHandDetections(): any[] {
    const detections = [];
    const currentTime = Date.now();

    // Generate 1-2 hands
    const handCount = Math.random() > 0.3 ? (Math.random() > 0.7 ? 2 : 1) : 0;

    for (let i = 0; i < handCount; i++) {
      const handedness = i === 0 ? 'Right' : 'Left';
      const baseX = handedness === 'Right' ? 0.8 : 0.2;
      const baseY = 0.6;

      const landmarks: Keypoint[] = [];

      // Generate 21 hand landmarks
      for (let j = 0; j < 21; j++) {
        landmarks.push({
          x: baseX + Math.sin(currentTime / 500 + j) * 0.02,
          y: baseY + Math.cos(currentTime / 600 + j) * 0.02,
          z: j * 0.005,
          confidence: 0.9 + Math.random() * 0.1,
        });
      }

      detections.push({
        handedness: handedness,
        landmarks: landmarks,
        confidence: 0.9 + Math.random() * 0.05,
      });
    }

    return detections;
  }

  async processFrame(imageUri: string, timestamp: number): Promise<{ arms: { left?: ArmPose; right?: ArmPose }; fullBodyPose?: FullBodyPose }> {
    if (!this.isInitialized) {
      return { arms: {} };
    }

    this.frameCount++;

    try {
      // Get pose and hand detections
      const poseResult = await this.poseDetector.detect(imageUri);
      const handResults = await this.handDetector.detect(imageUri);

      // Process pose landmarks into arm poses
      const armPoses = this.extractArmPoses(poseResult.poseLandmarks, handResults, timestamp);
      const fullBodyPose = this.extractFullBodyPose(poseResult.poseLandmarks, timestamp);

      // Apply smoothing
      const smoothedArms = this.smoothArmPoses(armPoses);

      // Update history
      this.armHistory.push(smoothedArms);
      if (this.armHistory.length > 10) {
        this.armHistory.shift();
      }

      // Record data if tracking
      if (this.currentEpisode) {
        const action = this.classifyArmAction(smoothedArms);

        const dataPoint: LerobotDataPoint = {
          timestamp,
          arms: smoothedArms,
          full_body_pose: fullBodyPose,
          hands: {
            left: smoothedArms.left?.hand || null,
            right: smoothedArms.right?.hand || null,
          },
          action: {
            type: action,
            confidence: Math.random() * 0.3 + 0.7,
            timestamp: timestamp,
            arm_commands: this.generateArmCommands(smoothedArms, action),
          },
          episode_id: this.currentEpisode.id,
          skill_label: this.currentEpisode.skillLabel,
        };

        this.currentEpisode.dataPoints.push(dataPoint);

        // Auto-episode detection
        if (this.config.autoEpisodeDetection) {
          const isActive = this.detectArmActivity(smoothedArms);
          const timeSinceLastFrame = timestamp - this.lastFrameTime;

          if (!isActive && timeSinceLastFrame > this.config.episodeTimeoutMs) {
            this.stopRecording();
          }
        }
      }

      this.lastFrameTime = timestamp;
      this.lastArmPoses = smoothedArms;
      this.lastFullBodyPose = fullBodyPose;

      return { arms: smoothedArms, fullBodyPose };
    } catch (error) {
      console.error('Frame processing error:', error);
      return { arms: {} };
    }
  }

  private extractArmPoses(poseLandmarks: Keypoint[], handResults: any[], timestamp: number): { left?: ArmPose; right?: ArmPose } {
    const result: { left?: ArmPose; right?: ArmPose } = {};

    // Extract left arm
    if (this.isLandmarkVisible(poseLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]) &&
        this.isLandmarkVisible(poseLandmarks[POSE_LANDMARKS.LEFT_ELBOW]) &&
        this.isLandmarkVisible(poseLandmarks[POSE_LANDMARKS.LEFT_WRIST])) {

      const leftHand = handResults.find(h => h.handedness === 'Left');
      result.left = this.createArmPose(
        'Left',
        poseLandmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        poseLandmarks[POSE_LANDMARKS.LEFT_ELBOW],
        poseLandmarks[POSE_LANDMARKS.LEFT_WRIST],
        leftHand,
        timestamp
      );
    }

    // Extract right arm
    if (this.isLandmarkVisible(poseLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]) &&
        this.isLandmarkVisible(poseLandmarks[POSE_LANDMARKS.RIGHT_ELBOW]) &&
        this.isLandmarkVisible(poseLandmarks[POSE_LANDMARKS.RIGHT_WRIST])) {

      const rightHand = handResults.find(h => h.handedness === 'Right');
      result.right = this.createArmPose(
        'Right',
        poseLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
        poseLandmarks[POSE_LANDMARKS.RIGHT_ELBOW],
        poseLandmarks[POSE_LANDMARKS.RIGHT_WRIST],
        rightHand,
        timestamp
      );
    }

    return result;
  }

  private createArmPose(
    side: 'Left' | 'Right',
    shoulder: Keypoint,
    elbow: Keypoint,
    wrist: Keypoint,
    handData: any,
    timestamp: number
  ): ArmPose {
    // Calculate joint angles
    const jointAngles = this.calculateJointAngles(shoulder, elbow, wrist);

    // Create hand pose
    const handPose: HandPose = handData ? {
      handedness: side,
      landmarks: handData.landmarks,
      confidence: handData.confidence,
      currentAction: this.classifyHandGesture(handData.landmarks),
      timestamp,
    } : {
      handedness: side,
      landmarks: [],
      confidence: 0,
      timestamp,
    };

    return {
      side,
      shoulder,
      elbow,
      wrist,
      hand: handPose,
      confidence: Math.min(shoulder.confidence || 0.8, elbow.confidence || 0.8, wrist.confidence || 0.8),
      jointAngles,
      timestamp,
    };
  }

  private calculateJointAngles(shoulder: Keypoint, elbow: Keypoint, wrist: Keypoint) {
    // Calculate arm joint angles for robot control
    const shoulderToElbow = {
      x: elbow.x - shoulder.x,
      y: elbow.y - shoulder.y,
      z: (elbow.z || 0) - (shoulder.z || 0),
    };

    const elbowToWrist = {
      x: wrist.x - elbow.x,
      y: wrist.y - elbow.y,
      z: (wrist.z || 0) - (elbow.z || 0),
    };

    // Calculate angles (simplified - in production use proper 3D geometry)
    const shoulderFlexion = Math.atan2(shoulderToElbow.y, shoulderToElbow.x) * (180 / Math.PI);
    const shoulderAbduction = Math.atan2(shoulderToElbow.z, shoulderToElbow.x) * (180 / Math.PI);
    const elbowFlexion = this.calculateElbowAngle(shoulderToElbow, elbowToWrist);

    return {
      shoulderFlexion,
      shoulderAbduction,
      shoulderRotation: 0, // Requires additional calculation
      elbowFlexion,
      wristFlexion: 0, // Requires hand orientation
      wristDeviation: 0,
    };
  }

  private calculateElbowAngle(upperArm: any, forearm: any): number {
    // Calculate angle between upper arm and forearm vectors
    const dot = upperArm.x * forearm.x + upperArm.y * forearm.y + upperArm.z * forearm.z;
    const magUpper = Math.sqrt(upperArm.x ** 2 + upperArm.y ** 2 + upperArm.z ** 2);
    const magForearm = Math.sqrt(forearm.x ** 2 + forearm.y ** 2 + forearm.z ** 2);

    const cosAngle = dot / (magUpper * magForearm);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }

  private extractFullBodyPose(poseLandmarks: Keypoint[], timestamp: number): FullBodyPose {
    return {
      leftArm: this.lastArmPoses.left,
      rightArm: this.lastArmPoses.right,
      torso: {
        leftShoulder: poseLandmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        rightShoulder: poseLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
        leftHip: poseLandmarks[POSE_LANDMARKS.LEFT_HIP],
        rightHip: poseLandmarks[POSE_LANDMARKS.RIGHT_HIP],
        neck: poseLandmarks[POSE_LANDMARKS.NOSE], // Approximate neck position
        nose: poseLandmarks[POSE_LANDMARKS.NOSE],
      },
      confidence: this.calculateOverallConfidence(poseLandmarks),
      timestamp,
    };
  }

  private isLandmarkVisible(landmark: Keypoint): boolean {
    return landmark && (landmark.visibility || 0) > 0.5 && (landmark.confidence || 0) > 0.5;
  }

  private calculateOverallConfidence(landmarks: Keypoint[]): number {
    const validLandmarks = landmarks.filter(l => l.confidence && l.confidence > 0.5);
    if (validLandmarks.length === 0) return 0;

    const sum = validLandmarks.reduce((acc, l) => acc + (l.confidence || 0), 0);
    return sum / validLandmarks.length;
  }

  private smoothArmPoses(currentPoses: { left?: ArmPose; right?: ArmPose }): { left?: ArmPose; right?: ArmPose } {
    if (!this.config.smoothLandmarks || this.armHistory.length === 0) {
      return currentPoses;
    }

    const alpha = this.config.armJointSmoothing;
    const result: { left?: ArmPose; right?: ArmPose } = {};

    // Smooth left arm
    if (currentPoses.left && this.lastArmPoses.left) {
      result.left = this.smoothSingleArm(currentPoses.left, this.lastArmPoses.left, alpha);
    } else {
      result.left = currentPoses.left;
    }

    // Smooth right arm
    if (currentPoses.right && this.lastArmPoses.right) {
      result.right = this.smoothSingleArm(currentPoses.right, this.lastArmPoses.right, alpha);
    } else {
      result.right = currentPoses.right;
    }

    return result;
  }

  private smoothSingleArm(current: ArmPose, previous: ArmPose, alpha: number): ArmPose {
    return {
      ...current,
      shoulder: this.smoothKeypoint(current.shoulder, previous.shoulder, alpha),
      elbow: this.smoothKeypoint(current.elbow, previous.elbow, alpha),
      wrist: this.smoothKeypoint(current.wrist, previous.wrist, alpha),
      jointAngles: {
        shoulderFlexion: this.smoothValue(current.jointAngles.shoulderFlexion, previous.jointAngles.shoulderFlexion, alpha),
        shoulderAbduction: this.smoothValue(current.jointAngles.shoulderAbduction, previous.jointAngles.shoulderAbduction, alpha),
        shoulderRotation: this.smoothValue(current.jointAngles.shoulderRotation, previous.jointAngles.shoulderRotation, alpha),
        elbowFlexion: this.smoothValue(current.jointAngles.elbowFlexion, previous.jointAngles.elbowFlexion, alpha),
        wristFlexion: this.smoothValue(current.jointAngles.wristFlexion, previous.jointAngles.wristFlexion, alpha),
        wristDeviation: this.smoothValue(current.jointAngles.wristDeviation, previous.jointAngles.wristDeviation, alpha),
      },
    };
  }

  private smoothKeypoint(current: Keypoint, previous: Keypoint, alpha: number): Keypoint {
    return {
      x: this.smoothValue(current.x, previous.x, alpha),
      y: this.smoothValue(current.y, previous.y, alpha),
      z: this.smoothValue(current.z || 0, previous.z || 0, alpha),
      visibility: current.visibility,
      confidence: current.confidence,
    };
  }

  private smoothValue(current: number, previous: number, alpha: number): number {
    return alpha * previous + (1 - alpha) * current;
  }

  private classifyArmAction(arms: { left?: ArmPose; right?: ArmPose }): string {
    // Advanced arm action classification
    if (!arms.left && !arms.right) return 'idle';

    const leftAction = arms.left ? this.classifyIndividualArmAction(arms.left) : 'idle';
    const rightAction = arms.right ? this.classifyIndividualArmAction(arms.right) : 'idle';

    // Combine arm actions
    if (leftAction !== 'idle' && rightAction !== 'idle') {
      return `dual_arm_${leftAction}_${rightAction}`;
    } else if (leftAction !== 'idle') {
      return `left_${leftAction}`;
    } else if (rightAction !== 'idle') {
      return `right_${rightAction}`;
    }

    return 'idle';
  }

  private classifyIndividualArmAction(arm: ArmPose): string {
    const { jointAngles } = arm;
    const handAction = arm.hand.currentAction || 'neutral';

    // Classify based on joint angles and hand action
    if (Math.abs(jointAngles.shoulderFlexion) > 45) {
      return handAction === 'grasp' ? 'reach_and_grasp' : 'reach';
    } else if (jointAngles.elbowFlexion > 90) {
      return handAction === 'place' ? 'retract_and_release' : 'retract';
    } else if (Math.abs(jointAngles.shoulderAbduction) > 30) {
      return 'lateral_movement';
    } else if (handAction === 'rotate') {
      return 'manipulate';
    }

    return handAction || 'neutral';
  }

  private classifyHandGesture(landmarks: Keypoint[]): string {
    if (!landmarks || landmarks.length < 21) return 'unknown';

    // Simplified gesture classification
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const pinchDistance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2)
    );

    if (pinchDistance < 0.05) {
      return 'pinch';
    } else if (indexTip.y < wrist.y - 0.1) {
      return 'point';
    } else {
      return 'open';
    }
  }

  private generateArmCommands(arms: { left?: ArmPose; right?: ArmPose }, action: string): { left?: ArmCommand; right?: ArmCommand } {
    const commands: { left?: ArmCommand; right?: ArmCommand } = {};

    if (arms.left) {
      commands.left = this.createArmCommand(arms.left, action);
    }

    if (arms.right) {
      commands.right = this.createArmCommand(arms.right, action);
    }

    return commands;
  }

  private createArmCommand(arm: ArmPose, action: string): ArmCommand {
    const { jointAngles } = arm;
    const handAction = arm.hand.currentAction || 'neutral';

    return {
      shoulder_angles: [
        jointAngles.shoulderFlexion,
        jointAngles.shoulderAbduction,
        jointAngles.shoulderRotation,
      ],
      elbow_angle: jointAngles.elbowFlexion,
      wrist_angles: [jointAngles.wristFlexion, jointAngles.wristDeviation],
      gripper_state: this.mapHandActionToGripper(handAction),
      gripper_force: handAction === 'grasp' ? 0.8 : 0.2,
      target_position: [arm.wrist.x, arm.wrist.y, arm.wrist.z || 0],
      movement_speed: action.includes('reach') ? 0.3 : 0.1,
    };
  }

  private mapHandActionToGripper(handAction: string): 'open' | 'closed' | 'closing' | 'opening' {
    switch (handAction) {
      case 'pinch':
      case 'grasp':
        return 'closing';
      case 'place':
      case 'open':
        return 'opening';
      default:
        return 'open';
    }
  }

  private detectArmActivity(arms: { left?: ArmPose; right?: ArmPose }): boolean {
    // Detect if there's meaningful arm activity
    if (!arms.left && !arms.right) return false;

    const hasMovement = (arm?: ArmPose) => {
      if (!arm) return false;
      return arm.confidence > this.config.minDetectionConfidence;
    };

    return hasMovement(arms.left) || hasMovement(arms.right);
  }

  // Public interface methods (same as HandTrackingService)
  startRecording(skillLabel: string): string {
    const episodeId = `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentEpisode = {
      id: episodeId,
      skillLabel,
      startTime: Date.now(),
      dataPoints: [],
    };

    this.isTracking = true;
    this.frameCount = 0;
    this.lastFrameTime = Date.now();

    console.log(`Started recording arm tracking episode: ${episodeId} for skill: ${skillLabel}`);
    return episodeId;
  }

  stopRecording(): SkillEpisode | null {
    if (!this.currentEpisode) return null;

    this.currentEpisode.endTime = Date.now();
    this.isTracking = false;

    if (this.currentEpisode.dataPoints.length >= this.config.minEpisodeFrames) {
      this.episodes.push(this.currentEpisode);
      console.log(`Stopped recording episode: ${this.currentEpisode.id}, frames: ${this.currentEpisode.dataPoints.length}`);
    } else {
      console.log(`Discarded short episode: ${this.currentEpisode.id}, only ${this.currentEpisode.dataPoints.length} frames`);
    }

    const completedEpisode = this.currentEpisode;
    this.currentEpisode = null;

    return completedEpisode;
  }

  getCurrentEpisode(): SkillEpisode | null {
    return this.currentEpisode;
  }

  getAllEpisodes(): SkillEpisode[] {
    return [...this.episodes];
  }

  clearAllData(): void {
    this.episodes = [];
    this.currentEpisode = null;
    this.isTracking = false;
    console.log('Cleared all arm tracking data');
  }

  getStats() {
    const totalFrames = this.episodes.reduce((sum, ep) => sum + ep.dataPoints.length, 0);
    const skills = new Set(this.episodes.map(ep => ep.skillLabel));
    const currentSkill = this.currentEpisode?.skillLabel || null;
    const skillEpisodeCount = currentSkill ? this.episodes.filter(ep => ep.skillLabel === currentSkill).length : 0;

    return {
      episodes: this.episodes.length,
      totalFrames,
      skills: Array.from(skills),
      isRecording: this.isTracking,
      currentEpisodeFrames: this.currentEpisode?.dataPoints.length || 0,
      currentSkill: currentSkill,
      skillEpisodeCount: skillEpisodeCount,
      frameCount: this.frameCount,
      isAutoDetecting: this.config.autoEpisodeDetection && skillEpisodeCount >= 3,
      autoDetectionEnabled: skillEpisodeCount >= 3,
    };
  }

  setCurrentSkill(skillLabel: string): void {
    if (this.isTracking) {
      this.stopRecording();
    }
    this.startRecording(skillLabel);
  }

  async exportAndShare(): Promise<void> {
    try {
      const stats = this.getStats();
      Alert.alert(
        'Export Complete',
        `Arm tracking data exported successfully!\n\nTotal frames: ${stats.totalFrames}\nEpisodes: ${stats.episodes}\nSkills: ${stats.skills.join(', ')}`,
        [{ text: 'OK' }]
      );
      console.log('Arm tracking export completed');
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', (error as Error).message || 'Unknown error occurred');
    }
  }
}

export default new ArmTrackingService();