import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  RecordingState, 
  RecordingSession, 
  StartRecordingPayload, 
  AddDataPointPayload 
} from '../types';
import { LerobotDataPoint } from '../../types';

// Initial state
const initialState: RecordingState = {
  sessions: [],
  currentSession: null,
  isRecording: false,
  isProcessing: false,
  recordingStartTime: null,
  error: null,
  settings: {
    autoSave: true,
    frameRate: 30,
    compressionLevel: 0.8,
    includeDepthData: false,
  },
};

// Async thunks
export const startRecording = createAsyncThunk(
  'recording/startRecording',
  async (payload: StartRecordingPayload, { rejectWithValue }) => {
    try {
      const sessionId = generateSessionId();
      const newSession: RecordingSession = {
        id: sessionId,
        name: payload.name,
        description: payload.description,
        createdAt: new Date().toISOString(),
        duration: 0,
        frameCount: 0,
        dataPoints: [],
        status: 'recording',
        tags: payload.tags || [],
        difficulty: 1,
        robotType: payload.robotType,
      };

      // Save session to storage
      await saveSessionToStorage(newSession);

      return {
        session: newSession,
        startTime: Date.now(),
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to start recording');
    }
  }
);

export const stopRecording = createAsyncThunk(
  'recording/stopRecording',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { recording: RecordingState };
      const currentSession = state.recording.currentSession;
      const startTime = state.recording.recordingStartTime;

      if (!currentSession || !startTime) {
        throw new Error('No active recording session');
      }

      const duration = Date.now() - startTime;
      const updatedSession: RecordingSession = {
        ...currentSession,
        status: 'completed',
        duration,
      };

      // Save updated session to storage
      await saveSessionToStorage(updatedSession);

      return updatedSession;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to stop recording');
    }
  }
);

export const pauseRecording = createAsyncThunk(
  'recording/pauseRecording',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { recording: RecordingState };
      const currentSession = state.recording.currentSession;

      if (!currentSession) {
        throw new Error('No active recording session');
      }

      // In a real implementation, you might want to handle pause differently
      // For now, we'll just mark it as processing
      return currentSession;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to pause recording');
    }
  }
);

export const addDataPoint = createAsyncThunk(
  'recording/addDataPoint',
  async (payload: AddDataPointPayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { recording: RecordingState };
      const currentSession = state.recording.currentSession;

      if (!currentSession) {
        throw new Error('No active recording session');
      }

      if (payload.sessionId !== currentSession.id) {
        throw new Error('Session ID mismatch');
      }

      const updatedSession: RecordingSession = {
        ...currentSession,
        dataPoints: [...currentSession.dataPoints, payload.dataPoint],
        frameCount: currentSession.frameCount + 1,
      };

      // Auto-save if enabled
      const settings = state.recording.settings;
      if (settings.autoSave && updatedSession.frameCount % 10 === 0) {
        await saveSessionToStorage(updatedSession);
      }

      return updatedSession;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add data point');
    }
  }
);

export const loadSessions = createAsyncThunk(
  'recording/loadSessions',
  async (_, { rejectWithValue }) => {
    try {
      const sessionsJson = await AsyncStorage.getItem('recording_sessions');
      const sessions: RecordingSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];
      return sessions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load sessions');
    }
  }
);

export const deleteSession = createAsyncThunk(
  'recording/deleteSession',
  async (sessionId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { recording: RecordingState };
      const sessions = state.recording.sessions.filter(s => s.id !== sessionId);
      
      // Update storage
      await AsyncStorage.setItem('recording_sessions', JSON.stringify(sessions));
      
      // Delete session data files if they exist
      await deleteSessionFiles(sessionId);
      
      return sessionId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete session');
    }
  }
);

export const exportSession = createAsyncThunk(
  'recording/exportSession',
  async (sessionId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { recording: RecordingState };
      const session = state.recording.sessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Convert to LeRobot format and export
      const exportData = await convertToLeRobotFormat(session);
      const exportPath = await saveExportFile(sessionId, exportData);
      
      return {
        sessionId,
        exportPath,
        dataSize: exportData.length,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to export session');
    }
  }
);

export const processSession = createAsyncThunk(
  'recording/processSession',
  async (sessionId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { recording: RecordingState };
      const session = state.recording.sessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Simulate processing (filtering, enhancement, validation)
      await simulateProcessing();
      
      const processedSession: RecordingSession = {
        ...session,
        status: 'completed',
      };

      await saveSessionToStorage(processedSession);
      
      return processedSession;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to process session');
    }
  }
);

export const updateRecordingSettings = createAsyncThunk(
  'recording/updateSettings',
  async (settings: Partial<RecordingState['settings']>, { rejectWithValue }) => {
    try {
      await AsyncStorage.setItem('recording_settings', JSON.stringify(settings));
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update settings');
    }
  }
);

export const loadRecordingSettings = createAsyncThunk(
  'recording/loadSettings',
  async (_, { rejectWithValue }) => {
    try {
      const settingsJson = await AsyncStorage.getItem('recording_settings');
      return settingsJson ? JSON.parse(settingsJson) : null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load settings');
    }
  }
);

// Helper functions
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const saveSessionToStorage = async (session: RecordingSession): Promise<void> => {
  const sessionsJson = await AsyncStorage.getItem('recording_sessions');
  const sessions: RecordingSession[] = sessionsJson ? JSON.parse(sessionsJson) : [];
  
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  
  await AsyncStorage.setItem('recording_sessions', JSON.stringify(sessions));
};

const deleteSessionFiles = async (sessionId: string): Promise<void> => {
  // In a real implementation, this would delete associated files
  // For now, we'll just simulate the deletion
  console.log(`Deleting files for session: ${sessionId}`);
};

const convertToLeRobotFormat = async (session: RecordingSession): Promise<any[]> => {
  // Convert session data to LeRobot compatible format
  return session.dataPoints.map(dataPoint => ({
    episode_index: 0,
    frame_index: session.dataPoints.indexOf(dataPoint),
    timestamp: dataPoint.observation.timestamp,
    observation: {
      image: dataPoint.observation.image,
      hand_poses: dataPoint.observation.hand_poses,
      environment_state: dataPoint.observation.environment_state,
    },
    action: dataPoint.action,
    reward: dataPoint.reward || 0,
    done: dataPoint.done,
  }));
};

const saveExportFile = async (sessionId: string, data: any[]): Promise<string> => {
  // In a real implementation, this would save to file system
  // For now, we'll just return a mock path
  const exportPath = `/exports/${sessionId}_lerobot.json`;
  console.log(`Exporting to: ${exportPath}`);
  return exportPath;
};

const simulateProcessing = async (): Promise<void> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
};

// Recording slice
const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateSessionName: (state, action: PayloadAction<{ sessionId: string; name: string }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.name = action.payload.name;
      }
      if (state.currentSession && state.currentSession.id === action.payload.sessionId) {
        state.currentSession.name = action.payload.name;
      }
    },
    updateSessionDescription: (state, action: PayloadAction<{ sessionId: string; description: string }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.description = action.payload.description;
      }
      if (state.currentSession && state.currentSession.id === action.payload.sessionId) {
        state.currentSession.description = action.payload.description;
      }
    },
    addSessionTag: (state, action: PayloadAction<{ sessionId: string; tag: string }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session && !session.tags.includes(action.payload.tag)) {
        session.tags.push(action.payload.tag);
      }
      if (state.currentSession && state.currentSession.id === action.payload.sessionId && 
          !state.currentSession.tags.includes(action.payload.tag)) {
        state.currentSession.tags.push(action.payload.tag);
      }
    },
    removeSessionTag: (state, action: PayloadAction<{ sessionId: string; tag: string }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.tags = session.tags.filter(tag => tag !== action.payload.tag);
      }
      if (state.currentSession && state.currentSession.id === action.payload.sessionId) {
        state.currentSession.tags = state.currentSession.tags.filter(tag => tag !== action.payload.tag);
      }
    },
    setSessionDifficulty: (state, action: PayloadAction<{ sessionId: string; difficulty: number }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.difficulty = Math.max(1, Math.min(5, action.payload.difficulty));
      }
      if (state.currentSession && state.currentSession.id === action.payload.sessionId) {
        state.currentSession.difficulty = Math.max(1, Math.min(5, action.payload.difficulty));
      }
    },
  },
  extraReducers: (builder) => {
    // Start recording
    builder
      .addCase(startRecording.pending, (state) => {
        state.error = null;
      })
      .addCase(startRecording.fulfilled, (state, action) => {
        state.currentSession = action.payload.session;
        state.isRecording = true;
        state.recordingStartTime = action.payload.startTime;
        state.error = null;
        
        // Add to sessions list
        const existingIndex = state.sessions.findIndex(s => s.id === action.payload.session.id);
        if (existingIndex >= 0) {
          state.sessions[existingIndex] = action.payload.session;
        } else {
          state.sessions.push(action.payload.session);
        }
      })
      .addCase(startRecording.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Stop recording
    builder
      .addCase(stopRecording.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(stopRecording.fulfilled, (state, action) => {
        state.isRecording = false;
        state.isProcessing = false;
        state.currentSession = null;
        state.recordingStartTime = null;
        
        // Update session in list
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.id);
        if (sessionIndex >= 0) {
          state.sessions[sessionIndex] = action.payload;
        }
      })
      .addCase(stopRecording.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });

    // Pause recording
    builder
      .addCase(pauseRecording.fulfilled, (state) => {
        state.isRecording = false;
      });

    // Add data point
    builder
      .addCase(addDataPoint.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        
        // Update session in list
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.id);
        if (sessionIndex >= 0) {
          state.sessions[sessionIndex] = action.payload;
        }
      })
      .addCase(addDataPoint.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Load sessions
    builder
      .addCase(loadSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
      })
      .addCase(loadSessions.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete session
    builder
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter(s => s.id !== action.payload);
        if (state.currentSession && state.currentSession.id === action.payload) {
          state.currentSession = null;
          state.isRecording = false;
          state.recordingStartTime = null;
        }
      })
      .addCase(deleteSession.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Process session
    builder
      .addCase(processSession.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(processSession.fulfilled, (state, action) => {
        state.isProcessing = false;
        const sessionIndex = state.sessions.findIndex(s => s.id === action.payload.id);
        if (sessionIndex >= 0) {
          state.sessions[sessionIndex] = action.payload;
        }
      })
      .addCase(processSession.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });

    // Update settings
    builder
      .addCase(updateRecordingSettings.fulfilled, (state, action) => {
        state.settings = { ...state.settings, ...action.payload };
      });

    // Load settings
    builder
      .addCase(loadRecordingSettings.fulfilled, (state, action) => {
        if (action.payload) {
          state.settings = { ...state.settings, ...action.payload };
        }
      });
  },
});

export const {
  clearError,
  updateSessionName,
  updateSessionDescription,
  addSessionTag,
  removeSessionTag,
  setSessionDifficulty,
} = recordingSlice.actions;

export default recordingSlice.reducer;