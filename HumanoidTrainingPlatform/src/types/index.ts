// Hand tracking and gesture recognition types
export interface HandKeypoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface HandPose {
  landmarks: HandKeypoint[];
  gesture: string;
  confidence: number;
  timestamp: Date;
}

// Camera frame data
export interface CameraFrame {
  width: number;
  height: number;
  format: 'rgb' | 'rgba' | 'gray';
  data: ArrayBuffer;
}

// LeRobot compatible data structures
export interface LerobotAction {
  action_type: 'pick' | 'place' | 'move' | 'rotate' | 'open' | 'close' | 'idle' | 'grasp' | 'release' | 'gesture' | 'navigate' | 'speak' | 'wait' | 'complex';
  action_parameters: Record<string, any>;
  timestamp: number;
  confidence: number;
}

export interface LerobotObservation {
  image: any; // Camera frame data
  hand_poses: HandPose[];
  environment_state?: any;
  timestamp: number;
}

export interface LerobotDataPoint {
  observation: LerobotObservation;
  action: LerobotAction;
  reward: number;
  done: boolean;
  info: {
    frame_id: number;
    confidence: number;
    num_hands: number;
  };
  timestamp: number;
  metadata: {
    device_info: {
      platform: string;
      model: string;
    };
    recording_session: string;
    hand_tracking_version: string;
  };
}

// Robot connectivity types
export type RobotType = 'unitree_g1' | 'boston_dynamics' | 'tesla_bot' | 'custom';

export interface RobotConnection {
  id: string;
  name: string;
  type: RobotType;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  ipAddress: string;
  port: number;
  isConnected: boolean;
  batteryLevel: number;
  lastSeen: Date;
  signalStrength: number;
  metadata?: Record<string, any>;
  connectionTime?: number;
  disconnectionTime?: number;
}

export interface RobotCommand {
  type: 'move' | 'rotate' | 'pick' | 'place' | 'open' | 'close' | 'emergency_stop' | 'grasp' | 'release' | 'gesture' | 'navigate' | 'speak';
  parameters?: Record<string, any>;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  retries?: number;
  maxRetries?: number;
}

export interface RobotState {
  id: string;
  name: string;
  type: RobotType;
  status: 'connected' | 'disconnected' | 'error';
  battery: number;
  position: { x: number; y: number; z: number };
  orientation: { roll: number; pitch: number; yaw: number };
  jointStates: { [key: string]: { position: number; velocity: number; effort: number } };
  sensorData: { [key: string]: any };
  lastUpdate: Date;
  capabilities: string[];
  firmware?: string;
  ip?: string;
}

// User and session management
export interface User {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  level: number;
  xp: number;
  totalRecordings: number;
  totalEarnings: number;
  joinedDate: Date;
}

export interface RecordingSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  frameCount: number;
  lerobotData: LerobotDataPoint[];
  videoPath?: string;
  metadata: {
    device: string;
    resolution: string;
    fps: number;
    quality: 'low' | 'medium' | 'high';
  };
}

// Marketplace types
export interface SkillListing {
  id: string;
  title: string;
  description: string;
  robotTypes: RobotType[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  price: number;
  currency: 'USD' | 'credits';
  createdBy: string;
  createdAt: Date;
  datasetSize: number;
  downloads: number;
  rating: number;
  tags: string[];
  thumbnailUrl?: string;
  videoPreviewUrl?: string;
}

export interface Purchase {
  id: string;
  userId: string;
  skillId: string;
  amount: number;
  currency: string;
  purchaseDate: Date;
  downloadUrl: string;
}

// 3D Mapping types
export interface Point3D {
  x: number;
  y: number;
  z: number;
  color?: [number, number, number];
}

export interface EnvironmentMap {
  id: string;
  name: string;
  points: Point3D[];
  bounds: {
    min: Point3D;
    max: Point3D;
  };
  createdAt: Date;
  lastUpdated: Date;
}
