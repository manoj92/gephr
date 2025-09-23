import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RobotConnection, RobotCommand, RobotState, RobotType } from '../../types';

export interface RobotSliceState {
  connectedRobots: RobotConnection[];
  selectedRobot: RobotConnection | null;
  availableRobots: RobotConnection[];
  isScanning: boolean;
  isConnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  commandQueue: RobotCommand[];
  isExecutingCommand: boolean;
  lastRobotState: RobotState | null;
  error: string | null;
}

const initialState: RobotSliceState = {
  connectedRobots: [],
  selectedRobot: null,
  availableRobots: [],
  isScanning: false,
  isConnecting: false,
  connectionStatus: 'disconnected',
  commandQueue: [],
  isExecutingCommand: false,
  lastRobotState: null,
  error: null,
};

export const scanForRobots = createAsyncThunk(
  'robot/scanForRobots',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate robot discovery
      const mockRobots: RobotConnection[] = [
        {
          id: 'unitree-g1-001',
          name: 'Unitree G1 #001',
          type: 'unitree_g1' as RobotType,
          status: 'disconnected' as const,
          ipAddress: '192.168.1.100',
          port: 8080,
          isConnected: false,
          batteryLevel: 85,
          lastSeen: new Date(),
          capabilities: ['navigation', 'manipulation', 'balance'],
          lastHeartbeat: Date.now(),
          signalStrength: 85,
        },
        {
          id: 'custom-robot-001',
          name: 'Custom Robot #001',
          type: 'custom' as RobotType,
          status: 'disconnected' as const,
          ipAddress: '192.168.1.101',
          port: 8081,
          isConnected: false,
          batteryLevel: 72,
          lastSeen: new Date(),
          capabilities: ['navigation', 'manipulation'],
          lastHeartbeat: Date.now(),
          signalStrength: 72,
        },
      ];

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return mockRobots;
    } catch (error) {
      return rejectWithValue('Failed to scan for robots');
    }
  }
);

export const connectToRobot = createAsyncThunk(
  'robot/connectToRobot',
  async (robot: RobotConnection, { rejectWithValue }) => {
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        ...robot,
        isConnected: true,
        lastSeen: new Date(),
      };
    } catch (error) {
      return rejectWithValue(`Failed to connect to ${robot.name}`);
    }
  }
);

export const sendRobotCommand = createAsyncThunk(
  'robot/sendRobotCommand',
  async (command: RobotCommand, { rejectWithValue }) => {
    try {
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate mock robot state response
      const mockState: RobotState = {
        timestamp: Date.now(),
        position: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 2 },
        rotation: { 
          x: Math.random() * 0.1, 
          y: Math.random() * 0.1, 
          z: Math.random() * 0.1, 
          w: 1 - Math.random() * 0.01 
        },
        joint_positions: Array.from({ length: 12 }, () => Math.random() * Math.PI - Math.PI/2),
        joint_velocities: Array.from({ length: 12 }, () => 0),
        battery_level: 85 - Math.random() * 5,
        error_state: false,
        connection_quality: 0.95,
      };
      
      return { command, state: mockState };
    } catch (error) {
      return rejectWithValue('Failed to execute command');
    }
  }
);

const robotSlice = createSlice({
  name: 'robot',
  initialState,
  reducers: {
    setSelectedRobot: (state, action: PayloadAction<RobotConnection | null>) => {
      state.selectedRobot = action.payload;
    },
    addCommandToQueue: (state, action: PayloadAction<RobotCommand>) => {
      state.commandQueue.push(action.payload);
    },
    removeCommandFromQueue: (state, action: PayloadAction<string>) => {
      state.commandQueue = state.commandQueue.filter(cmd => cmd.id !== action.payload);
    },
    clearCommandQueue: (state) => {
      state.commandQueue = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    disconnectRobot: (state, action: PayloadAction<string>) => {
      state.connectedRobots = state.connectedRobots.filter(robot => robot.id !== action.payload);
      if (state.selectedRobot?.id === action.payload) {
        state.selectedRobot = null;
      }
      state.connectionStatus = 'disconnected';
    },
  },
  extraReducers: (builder) => {
    builder
      // Scan for robots
      .addCase(scanForRobots.pending, (state) => {
        state.isScanning = true;
        state.error = null;
      })
      .addCase(scanForRobots.fulfilled, (state, action) => {
        state.isScanning = false;
        state.availableRobots = action.payload;
      })
      .addCase(scanForRobots.rejected, (state, action) => {
        state.isScanning = false;
        state.error = action.payload as string;
      })
      
      // Connect to robot
      .addCase(connectToRobot.pending, (state) => {
        state.isConnecting = true;
        state.connectionStatus = 'connecting';
        state.error = null;
      })
      .addCase(connectToRobot.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.connectionStatus = 'connected';
        const connectedRobot = action.payload;
        state.connectedRobots.push(connectedRobot);
        state.selectedRobot = connectedRobot;
        
        // Remove from available robots
        state.availableRobots = state.availableRobots.filter(
          robot => robot.id !== connectedRobot.id
        );
      })
      .addCase(connectToRobot.rejected, (state, action) => {
        state.isConnecting = false;
        state.connectionStatus = 'error';
        state.error = action.payload as string;
      })
      
      // Send robot command
      .addCase(sendRobotCommand.pending, (state) => {
        state.isExecutingCommand = true;
        state.error = null;
      })
      .addCase(sendRobotCommand.fulfilled, (state, action) => {
        state.isExecutingCommand = false;
        state.lastRobotState = action.payload.state;
        
        // Remove executed command from queue
        state.commandQueue = state.commandQueue.filter(
          cmd => cmd.id !== action.payload.command.id
        );
      })
      .addCase(sendRobotCommand.rejected, (state, action) => {
        state.isExecutingCommand = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedRobot,
  addCommandToQueue,
  removeCommandFromQueue,
  clearCommandQueue,
  clearError,
  disconnectRobot,
} = robotSlice.actions;

export default robotSlice.reducer;