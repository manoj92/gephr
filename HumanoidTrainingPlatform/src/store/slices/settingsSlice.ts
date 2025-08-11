import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationSettings {
  pushNotifications: boolean;
  recordingAlerts: boolean;
  robotStatusUpdates: boolean;
  marketplaceUpdates: boolean;
  systemAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  shareUsageData: boolean;
  allowRemoteAccess: boolean;
  encryptLocalData: boolean;
  anonymousMode: boolean;
}

export interface RecordingSettings {
  defaultResolution: '720p' | '1080p' | '4K';
  frameRate: 30 | 60 | 120;
  compressionQuality: 'low' | 'medium' | 'high' | 'lossless';
  autoStopDuration: number;
  bufferSize: number;
  enableDepthRecording: boolean;
  enableAudioRecording: boolean;
}

export interface RobotSettings {
  connectionTimeout: number;
  commandRetryAttempts: number;
  heartbeatInterval: number;
  defaultRobotType: string | null;
  emergencyStopEnabled: boolean;
  safetyLimits: {
    maxVelocity: number;
    maxAcceleration: number;
    workspaceRadius: number;
  };
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  units: 'metric' | 'imperial';
  developer: {
    debugMode: boolean;
    showPerformanceMetrics: boolean;
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'x-large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
  };
  storage: {
    maxCacheSize: number;
    autoCleanup: boolean;
    cleanupInterval: number;
  };
}

export interface SettingsSliceState {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  recording: RecordingSettings;
  robot: RobotSettings;
  app: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
}

const initialState: SettingsSliceState = {
  notifications: {
    pushNotifications: true,
    recordingAlerts: true,
    robotStatusUpdates: true,
    marketplaceUpdates: false,
    systemAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
  },
  privacy: {
    dataCollection: false,
    analytics: false,
    shareUsageData: false,
    allowRemoteAccess: false,
    encryptLocalData: true,
    anonymousMode: false,
  },
  recording: {
    defaultResolution: '1080p',
    frameRate: 30,
    compressionQuality: 'medium',
    autoStopDuration: 300,
    bufferSize: 1024,
    enableDepthRecording: true,
    enableAudioRecording: false,
  },
  robot: {
    connectionTimeout: 10000,
    commandRetryAttempts: 3,
    heartbeatInterval: 1000,
    defaultRobotType: null,
    emergencyStopEnabled: true,
    safetyLimits: {
      maxVelocity: 2.0,
      maxAcceleration: 5.0,
      workspaceRadius: 3.0,
    },
  },
  app: {
    theme: 'dark',
    language: 'en',
    units: 'metric',
    developer: {
      debugMode: false,
      showPerformanceMetrics: false,
      enableLogging: true,
      logLevel: 'info',
    },
    accessibility: {
      fontSize: 'medium',
      highContrast: false,
      reduceMotion: false,
      screenReader: false,
    },
    storage: {
      maxCacheSize: 500,
      autoCleanup: true,
      cleanupInterval: 24 * 60 * 60 * 1000,
    },
  },
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  error: null,
  hasUnsavedChanges: false,
};

export const loadSettings = createAsyncThunk(
  'settings/loadSettings',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate loading settings from storage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would load from AsyncStorage or similar
      return initialState;
    } catch (error) {
      return rejectWithValue('Failed to load settings');
    }
  }
);

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { settings: SettingsSliceState };
      
      // Simulate saving to storage
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would save to AsyncStorage or similar
      return new Date();
    } catch (error) {
      return rejectWithValue('Failed to save settings');
    }
  }
);

export const resetSettings = createAsyncThunk(
  'settings/resetSettings',
  async (category?: keyof Pick<SettingsSliceState, 'notifications' | 'privacy' | 'recording' | 'robot' | 'app'>, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (category) {
        return { category, settings: initialState[category] };
      } else {
        return { category: null, settings: initialState };
      }
    } catch (error) {
      return rejectWithValue('Failed to reset settings');
    }
  }
);

export const exportSettings = createAsyncThunk(
  'settings/exportSettings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { settings: SettingsSliceState };
      
      const exportData = {
        notifications: state.settings.notifications,
        privacy: state.settings.privacy,
        recording: state.settings.recording,
        robot: state.settings.robot,
        app: state.settings.app,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return exportData;
    } catch (error) {
      return rejectWithValue('Failed to export settings');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updatePrivacySettings: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateRecordingSettings: (state, action: PayloadAction<Partial<RecordingSettings>>) => {
      state.recording = { ...state.recording, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateRobotSettings: (state, action: PayloadAction<Partial<RobotSettings>>) => {
      state.robot = { ...state.robot, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateAppSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.app = { ...state.app, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateRobotSafetyLimits: (state, action: PayloadAction<Partial<RobotSettings['safetyLimits']>>) => {
      state.robot.safetyLimits = { ...state.robot.safetyLimits, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateDeveloperSettings: (state, action: PayloadAction<Partial<AppSettings['developer']>>) => {
      state.app.developer = { ...state.app.developer, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateAccessibilitySettings: (state, action: PayloadAction<Partial<AppSettings['accessibility']>>) => {
      state.app.accessibility = { ...state.app.accessibility, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateStorageSettings: (state, action: PayloadAction<Partial<AppSettings['storage']>>) => {
      state.app.storage = { ...state.app.storage, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearUnsavedChanges: (state) => {
      state.hasUnsavedChanges = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load settings
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.privacy = action.payload.privacy;
        state.recording = action.payload.recording;
        state.robot = action.payload.robot;
        state.app = action.payload.app;
        state.hasUnsavedChanges = false;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Save settings
      .addCase(saveSettings.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.isSaving = false;
        state.lastSaved = action.payload;
        state.hasUnsavedChanges = false;
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      
      // Reset settings
      .addCase(resetSettings.pending, (state) => {
        state.error = null;
      })
      .addCase(resetSettings.fulfilled, (state, action) => {
        if (action.payload.category) {
          state[action.payload.category] = action.payload.settings as any;
        } else {
          const newState = action.payload.settings as SettingsSliceState;
          state.notifications = newState.notifications;
          state.privacy = newState.privacy;
          state.recording = newState.recording;
          state.robot = newState.robot;
          state.app = newState.app;
        }
        state.hasUnsavedChanges = true;
      })
      .addCase(resetSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Export settings
      .addCase(exportSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  updateNotificationSettings,
  updatePrivacySettings,
  updateRecordingSettings,
  updateRobotSettings,
  updateAppSettings,
  updateRobotSafetyLimits,
  updateDeveloperSettings,
  updateAccessibilitySettings,
  updateStorageSettings,
  clearError,
  clearUnsavedChanges,
} = settingsSlice.actions;

export default settingsSlice.reducer;