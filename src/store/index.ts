import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { HandPose, GestureData, RobotConnection, LerobotDataPoint } from '../types';

export interface AppState {
  // Hand tracking state
  isHandTrackingActive: boolean;
  currentHandPoses: HandPose[];
  currentGesture: GestureData | null;
  recordedGestures: GestureData[];
  
  // Robot state
  availableRobots: RobotConnection[];
  activeRobot: RobotConnection | null;
  isRobotConnected: boolean;
  robotConnectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  
  // Training data
  trainingDataPoints: LerobotDataPoint[];
  totalDataPoints: number;
  
  // UI state
  currentScreen: string;
  isRecording: boolean;
  showSettings: boolean;
  
  // User state
  userId: string;
  userSkillLevel: number;
  totalRecordingTime: number;
  achievements: string[];
  
  // App settings
  settings: {
    handTrackingSettings: {
      minConfidence: number;
      maxHands: number;
      modelComplexity: number;
    };
    robotSettings: {
      autoConnect: boolean;
      heartbeatInterval: number;
      commandTimeout: number;
    };
    dataSettings: {
      autoExport: boolean;
      exportFormat: 'lerobot' | 'json' | 'csv';
      maxStorageSize: number;
    };
  };
}

export interface AppActions {
  // Hand tracking actions
  setHandTrackingActive: (active: boolean) => void;
  updateHandPoses: (poses: HandPose[]) => void;
  startGesture: (gesture: GestureData) => void;
  stopGesture: () => void;
  addRecordedGesture: (gesture: GestureData) => void;
  clearRecordedGestures: () => void;
  
  // Robot actions
  setAvailableRobots: (robots: RobotConnection[]) => void;
  setActiveRobot: (robot: RobotConnection | null) => void;
  updateRobotConnectionStatus: (status: AppState['robotConnectionStatus']) => void;
  updateRobotState: (robotId: string, updates: Partial<RobotConnection>) => void;
  
  // Training data actions
  addTrainingDataPoint: (dataPoint: LerobotDataPoint) => void;
  clearTrainingData: () => void;
  setTotalDataPoints: (count: number) => void;
  
  // UI actions
  setCurrentScreen: (screen: string) => void;
  setIsRecording: (recording: boolean) => void;
  setShowSettings: (show: boolean) => void;
  
  // User actions
  updateUserSkillLevel: (level: number) => void;
  addRecordingTime: (time: number) => void;
  addAchievement: (achievement: string) => void;
  
  // Settings actions
  updateHandTrackingSettings: (settings: Partial<AppState['settings']['handTrackingSettings']>) => void;
  updateRobotSettings: (settings: Partial<AppState['settings']['robotSettings']>) => void;
  updateDataSettings: (settings: Partial<AppState['settings']['dataSettings']>) => void;
  
  // Reset actions
  resetApp: () => void;
}

const initialState: AppState = {
  // Hand tracking state
  isHandTrackingActive: false,
  currentHandPoses: [],
  currentGesture: null,
  recordedGestures: [],
  
  // Robot state
  availableRobots: [],
  activeRobot: null,
  isRobotConnected: false,
  robotConnectionStatus: 'idle',
  
  // Training data
  trainingDataPoints: [],
  totalDataPoints: 0,
  
  // UI state
  currentScreen: 'Home',
  isRecording: false,
  showSettings: false,
  
  // User state
  userId: 'anonymous',
  userSkillLevel: 1,
  totalRecordingTime: 0,
  achievements: [],
  
  // App settings
  settings: {
    handTrackingSettings: {
      minConfidence: 0.5,
      maxHands: 2,
      modelComplexity: 1,
    },
    robotSettings: {
      autoConnect: false,
      heartbeatInterval: 1000,
      commandTimeout: 5000,
    },
    dataSettings: {
      autoExport: false,
      exportFormat: 'lerobot',
      maxStorageSize: 1024 * 1024 * 100, // 100MB
    },
  },
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Hand tracking actions
        setHandTrackingActive: (active) => set({ isHandTrackingActive: active }),
        
        updateHandPoses: (poses) => set({ currentHandPoses: poses }),
        
        startGesture: (gesture) => set({ 
          currentGesture: gesture,
          isRecording: true 
        }),
        
        stopGesture: () => {
          const { currentGesture, recordedGestures } = get();
          if (currentGesture) {
            const finalizedGesture: GestureData = {
              ...currentGesture,
              endTime: Date.now(),
              duration: Date.now() - currentGesture.startTime
            };
            set({ 
              currentGesture: null,
              isRecording: false,
              recordedGestures: [...recordedGestures, finalizedGesture]
            });
          } else {
            set({ isRecording: false });
          }
        },
        
        addRecordedGesture: (gesture) => set((state) => ({
          recordedGestures: [...state.recordedGestures, gesture]
        })),
        
        clearRecordedGestures: () => set({ recordedGestures: [] }),
        
        // Robot actions
        setAvailableRobots: (robots) => set({ availableRobots: robots }),
        
        setActiveRobot: (robot) => set({ 
          activeRobot: robot,
          isRobotConnected: robot?.status === 'connected',
          robotConnectionStatus: robot ? 'connected' : 'idle'
        }),
        
        updateRobotConnectionStatus: (status) => set({ 
          robotConnectionStatus: status,
          isRobotConnected: status === 'connected'
        }),
        
        updateRobotState: (robotId, updates) => set((state) => ({
          availableRobots: state.availableRobots.map(robot =>
            robot.id === robotId ? { ...robot, ...updates } : robot
          ),
          activeRobot: state.activeRobot?.id === robotId 
            ? { ...state.activeRobot, ...updates }
            : state.activeRobot
        })),
        
        // Training data actions
        addTrainingDataPoint: (dataPoint) => set((state) => ({
          trainingDataPoints: [...state.trainingDataPoints, dataPoint],
          totalDataPoints: state.totalDataPoints + 1
        })),
        
        clearTrainingData: () => set({ 
          trainingDataPoints: [],
          totalDataPoints: 0 
        }),
        
        setTotalDataPoints: (count) => set({ totalDataPoints: count }),
        
        // UI actions
        setCurrentScreen: (screen) => set({ currentScreen: screen }),
        
        setIsRecording: (recording) => set({ isRecording: recording }),
        
        setShowSettings: (show) => set({ showSettings: show }),
        
        // User actions
        updateUserSkillLevel: (level) => set({ userSkillLevel: level }),
        
        addRecordingTime: (time) => set((state) => ({
          totalRecordingTime: state.totalRecordingTime + time
        })),
        
        addAchievement: (achievement) => set((state) => ({
          achievements: [...state.achievements, achievement]
        })),
        
        // Settings actions
        updateHandTrackingSettings: (newSettings) => set((state) => ({
          settings: {
            ...state.settings,
            handTrackingSettings: {
              ...state.settings.handTrackingSettings,
              ...newSettings
            }
          }
        })),
        
        updateRobotSettings: (newSettings) => set((state) => ({
          settings: {
            ...state.settings,
            robotSettings: {
              ...state.settings.robotSettings,
              ...newSettings
            }
          }
        })),
        
        updateDataSettings: (newSettings) => set((state) => ({
          settings: {
            ...state.settings,
            dataSettings: {
              ...state.settings.dataSettings,
              ...newSettings
            }
          }
        })),
        
        // Reset actions
        resetApp: () => set(initialState),
      }),
      {
        name: 'humanoid-training-storage',
        partialize: (state) => ({
          // Only persist certain parts of the state
          recordedGestures: state.recordedGestures,
          userId: state.userId,
          userSkillLevel: state.userSkillLevel,
          totalRecordingTime: state.totalRecordingTime,
          achievements: state.achievements,
          settings: state.settings,
          totalDataPoints: state.totalDataPoints,
        }),
      }
    ),
    {
      name: 'humanoid-training-store',
    }
  )
);

// Selectors for commonly used state combinations
export const useHandTrackingState = () => useAppStore((state) => ({
  isActive: state.isHandTrackingActive,
  currentPoses: state.currentHandPoses,
  currentGesture: state.currentGesture,
  isRecording: state.isRecording,
  recordedGestures: state.recordedGestures,
}));

export const useRobotState = () => useAppStore((state) => ({
  availableRobots: state.availableRobots,
  activeRobot: state.activeRobot,
  isConnected: state.isRobotConnected,
  connectionStatus: state.robotConnectionStatus,
}));

export const useTrainingState = () => useAppStore((state) => ({
  dataPoints: state.trainingDataPoints,
  totalDataPoints: state.totalDataPoints,
  recordedGestures: state.recordedGestures,
}));

export const useUserState = () => useAppStore((state) => ({
  userId: state.userId,
  skillLevel: state.userSkillLevel,
  recordingTime: state.totalRecordingTime,
  achievements: state.achievements,
}));

export const useAppSettings = () => useAppStore((state) => state.settings);