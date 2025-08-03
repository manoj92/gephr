// Hand tracking and gesture recognition types
export interface HandKeypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface HandPose {
  landmarks: HandKeypoint[];
  handedness: 'left' | 'right';
  confidence: number;
  timestamp: number;
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
  bluetoothId?: string;
  capabilities: RobotCapability[];
  currentTask?: string;
  batteryLevel?: number;
  lastHeartbeat: number;
}

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
  type: 'move' | 'pick' | 'place' | 'navigate' | 'stop' | 'custom';
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  estimatedDuration?: number;
}

export interface RobotState {
  jointPositions: number[];
  jointVelocities: number[];
  endEffectorPosition: { x: number; y: number; z: number };
  endEffectorOrientation: { x: number; y: number; z: number; w: number };
  gripperState: 'open' | 'closed' | 'grasping';
  isMoving: boolean;
  currentTask?: string;
  error?: string;
  timestamp: number;
} 