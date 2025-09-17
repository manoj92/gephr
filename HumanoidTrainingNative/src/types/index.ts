export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface HandPose {
  handedness: 'Left' | 'Right';
  landmarks: HandKeypoint[];
  worldLandmarks?: HandKeypoint[];
  confidence: number;
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
  image?: string;
  hand_pose?: HandPose[];
  robot_state?: RobotState;
}

export interface LerobotDataPoint {
  observation: LerobotObservation;
  action: number[];
  next_observation?: LerobotObservation;
  reward?: number;
  done: boolean;
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
  type: 'move' | 'rotate' | 'pick' | 'place' | 'stop' | 'home';
  parameters: any;
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
  cameraFrames: CameraFrame[];
  lerobotData?: LerobotDataPoint[];
}

export interface Navigation {
  Home: undefined;
  Record: undefined;
  Marketplace: undefined;
  Map: undefined;
  Robot: undefined;
  Profile: undefined;
}
