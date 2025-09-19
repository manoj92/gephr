export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  confidence?: number;
}

export interface HandKeypoint extends Keypoint {}

export interface HandPose {
  handedness: 'Left' | 'Right';
  landmarks: HandKeypoint[];
  worldLandmarks?: HandKeypoint[];
  confidence: number;
  currentAction?: string;
  timestamp?: number;
}

// Full arm pose tracking
export interface ArmPose {
  side: 'Left' | 'Right';
  shoulder: Keypoint;
  elbow: Keypoint;
  wrist: Keypoint;
  hand: HandPose;
  confidence: number;
  jointAngles: {
    shoulderFlexion: number;    // Forward/backward arm movement
    shoulderAbduction: number;  // Side arm movement
    shoulderRotation: number;   // Internal/external rotation
    elbowFlexion: number;       // Elbow bend
    wristFlexion: number;       // Wrist up/down
    wristDeviation: number;     // Wrist side to side
  };
  timestamp: number;
}

export interface FullBodyPose {
  leftArm?: ArmPose;
  rightArm?: ArmPose;
  torso: {
    leftShoulder: Keypoint;
    rightShoulder: Keypoint;
    leftHip: Keypoint;
    rightHip: Keypoint;
    neck: Keypoint;
    nose: Keypoint;
  };
  confidence: number;
  timestamp: number;
}

export interface CameraFrame {
  uri: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface LerobotAction {
  observation: LerobotObservation;
  action: number[];
  timestamp: number;
  episode_index: number;
  frame_index: number;
}

export interface LerobotObservation {
  camera: {
    image_path: string;
    timestamp: number;
  };
  hands?: {
    left: HandPose | null;
    right: HandPose | null;
  };
  arms?: {
    left: ArmPose | null;
    right: ArmPose | null;
  };
  full_body_pose?: FullBodyPose;
  robot_state?: RobotState;
}

export interface LerobotDataPoint {
  timestamp: number;
  hands?: {
    left: HandPose | null;
    right: HandPose | null;
  };
  arms?: {
    left: ArmPose | null;
    right: ArmPose | null;
  };
  full_body_pose?: FullBodyPose;
  action: {
    type: string;
    confidence: number;
    timestamp: number;
    arm_commands?: {
      left?: ArmCommand;
      right?: ArmCommand;
    };
  };
  episode_id: string;
  skill_label: string;
}

export interface ArmCommand {
  shoulder_angles: [number, number, number]; // flexion, abduction, rotation
  elbow_angle: number;
  wrist_angles: [number, number]; // flexion, deviation
  gripper_state: 'open' | 'closed' | 'closing' | 'opening';
  gripper_force?: number;
  target_position?: [number, number, number];
  movement_speed?: number;
}

export interface RobotConnection {
  id: string;
  name: string;
  type: RobotType;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  ipAddress?: string;
  port?: number;
  lastSeen: Date;
}

export type RobotType = 'Unitree G1' | 'Boston Dynamics Spot' | 'Tesla Bot' | 'Custom';

export interface RobotState {
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  jointPositions: number[];
  velocity: {
    linear: { x: number; y: number; z: number; };
    angular: { x: number; y: number; z: number; };
  };
  battery?: number;
  temperature?: number;
}

export interface RobotCommand {
  type: 'move' | 'rotate' | 'pick' | 'place' | 'stop' | 'home' | 'arm_control' | 'dual_arm';
  parameters: any;
  arm_commands?: {
    left?: ArmCommand;
    right?: ArmCommand;
  };
  priority: number;
  timestamp: number;
  id: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  level: number;
  experience: number;
  totalRecordings: number;
  totalUploadedActions: number;
  achievements: Achievement[];
  createdAt: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  price: number;
  rating: number;
  downloads: number;
  creator: string;
  createdAt: Date;
  datasetSize: number;
  thumbnailUrl?: string;
}

export type SkillCategory = 'manipulation' | 'navigation' | 'interaction' | 'custom';

export interface Recording {
  id: string;
  name: string;
  duration: number;
  frameCount: number;
  size: number;
  createdAt: Date;
  handPoses: HandPose[];
  armPoses?: ArmPose[];
  fullBodyPoses?: FullBodyPose[];
  cameraFrames: CameraFrame[];
  lerobotData?: LerobotDataPoint[];
}

// MediaPipe Pose landmarks indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
} as const;

export interface Navigation {
  Home: undefined;
  Record: undefined;
  Marketplace: undefined;
  Map: undefined;
  Robot: undefined;
  Profile: undefined;
}
