// Hand tracking and gesture recognition types
export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name: string;
}

export interface HandPose {
  keypoints: HandKeypoint[];
  handedness: 'left' | 'right';
  confidence: number;
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
  type: 'pick' | 'place' | 'move' | 'rotate' | 'open' | 'close' | 'idle';
  parameters: Record<string, any>;
  timestamp: number;
  confidence: number;
}

export interface LerobotObservation {
  timestamp: number;
  hand_poses: HandPose[];
  camera_frame: CameraFrame;
}

export interface LerobotDataPoint {
  observation: LerobotObservation;
  action: LerobotAction;
  metadata: {
    session_id: string;
    device_type: string;
    recording_quality: string;
    environment: string;
  };
}

// Robot connectivity types
export type RobotType = 'unitree_g1' | 'boston_dynamics' | 'tesla_bot' | 'custom';

export interface RobotConnection {
  id: string;
  name: string;
  type: RobotType;
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
  id: string;
  type: 'move' | 'rotate' | 'pick' | 'place' | 'open' | 'close' | 'emergency_stop';
  parameters: Record<string, any>;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  retries?: number;
  maxRetries?: number;
}

export interface RobotState {
  position: [number, number, number];
  orientation: [number, number, number, number]; // quaternion
  joint_positions: number[];
  gripper_state: 'open' | 'closed' | 'moving';
  battery_level: number;
  batteryLevel?: number; // Alternative field name for compatibility
  is_moving: boolean;
  current_task?: string;
  temperature?: number;
  errors?: string[];
  warnings?: string[];
  capabilities?: string[];
  protocol_version?: string;
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
