// Hand tracking and gesture recognition types
export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name?: string;
  score?: number;
}

export interface HandPose {
  landmarks?: HandKeypoint[];
  keypoints?: HandKeypoint[];
  handedness: 'left' | 'right';
  confidence: number;
  timestamp: number;
  score?: number;
}

export interface GestureData {
  id: string;
  type: 'pick' | 'place' | 'move' | 'grasp' | 'release';
  confidence: number;
  timestamp: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  handPoses: HandPose[];
  poses: HandPose[];
  environment?: any;
  taskType?: string;
}

// LeRobot compatible data structures
export interface LerobotAction {
  joint_positions?: number[];
  joint_velocities?: number[];
  gripper_position?: number;
  action_type: 'pick' | 'place' | 'move' | 'rotate' | 'open' | 'close' | 'custom';
  confidence: number;
}

export interface LerobotObservation {
  image: string; // base64 encoded image
  depth_image?: string; // LIDAR/depth data
  hand_poses: HandPose[];
  environment_state: any;
  timestamp: number;
}

export interface LerobotDataPoint {
  observation: LerobotObservation;
  action: LerobotAction;
  reward?: number;
  done: boolean;
  info?: any;
  timestamp: number;
  metadata: {
    task_id: string;
    user_id: string;
    robot_type: string;
    difficulty: number;
  };
}

// Camera and sensor types
export interface CameraFrame {
  uri: string;
  width: number;
  height: number;
  timestamp: number;
}

// Robot connectivity types
export interface RobotConnection {
  id: string;
  name: string;
  type: 'unitree_g1' | 'boston_dynamics' | 'tesla_bot' | 'custom';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  ipAddress?: string;
  port?: number;
  isConnected?: boolean;
  bluetoothId?: string;
  capabilities: RobotCapability[];
  currentTask?: string;
  batteryLevel?: number;
  lastSeen?: Date;
  lastHeartbeat: number;
  signalStrength: number;
}

export type RobotType = 'unitree_g1' | 'boston_dynamics' | 'tesla_bot' | 'custom';

export type RobotCapability = 
  | 'navigation'
  | 'manipulation'
  | 'vision'
  | 'speech'
  | 'balance'
  | 'climbing'
  | 'lifting'
  | 'fine_motor';

export interface RobotCommand {
  id: string;
  type: 'move' | 'pick' | 'place' | 'rotate' | 'stop' | 'navigate' | 'custom' | 'grasp_object';
  parameters: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    velocity?: number;
    force?: number;
    target?: string;
    action_type?: string;
    immediate?: boolean;
    joint_positions?: number[];
    custom_data?: any;
  };
  priority: 'low' | 'medium' | 'high' | 'emergency' | 'critical';
  timestamp: number;
  timeout?: number;
  estimatedDuration?: number;
}

export interface RobotState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  joint_positions: number[];
  jointPositions?: number[]; // Alternative naming for compatibility
  joint_velocities: number[];
  battery_level: number;
  error_state: boolean;
  current_task?: string;
  connection_quality: number;
  timestamp: number;
  gripperState?: 'open' | 'grasping' | 'closed';
}
