import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserState, 
  User, 
  UserProfile, 
  Achievement,
  LoginPayload, 
  RegisterPayload, 
  UpdateProfilePayload 
} from '../types';

// Initial state
const initialState: UserState = {
  user: null,
  profile: null,
  xp: 0,
  level: 1,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  authToken: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'user/login',
  async (credentials: LoginPayload, { rejectWithValue }) => {
    try {
      // Mock authentication - replace with real API call
      const response = await mockApiCall('/auth/login', credentials);
      
      if (response.success) {
        await AsyncStorage.setItem('authToken', response.token);
        return {
          user: response.user,
          profile: response.profile,
          xp: response.xp || 0,
          level: response.level || 1,
          authToken: response.token,
        };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const registerUser = createAsyncThunk(
  'user/register',
  async (userData: RegisterPayload, { rejectWithValue }) => {
    try {
      // Mock registration - replace with real API call
      const response = await mockApiCall('/auth/register', userData);
      
      if (response.success) {
        await AsyncStorage.setItem('authToken', response.token);
        return {
          user: response.user,
          profile: response.profile,
          xp: 0,
          level: 1,
          authToken: response.token,
        };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const loadUserFromStorage = createAsyncThunk(
  'user/loadFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        return null;
      }

      // Validate token and load user data
      const response = await mockApiCall('/auth/me', {}, token);
      
      if (response.success) {
        return {
          user: response.user,
          profile: response.profile,
          xp: response.xp || 0,
          level: response.level || 1,
          authToken: token,
        };
      } else {
        await AsyncStorage.removeItem('authToken');
        throw new Error('Invalid token');
      }
    } catch (error: any) {
      await AsyncStorage.removeItem('authToken');
      return rejectWithValue(error.message || 'Failed to load user');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (profileData: UpdateProfilePayload, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { user: UserState };
      const token = state.user.authToken;
      
      if (!token) {
        throw new Error('No auth token');
      }

      const response = await mockApiCall('/user/profile', profileData, token);
      
      if (response.success) {
        return response.profile;
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const addXP = createAsyncThunk(
  'user/addXP',
  async (amount: number, { getState, dispatch }) => {
    const state = getState() as { user: UserState };
    const currentXP = state.user.xp;
    const currentLevel = state.user.level;
    
    const newXP = currentXP + amount;
    const newLevel = calculateLevel(newXP);
    
    if (newLevel > currentLevel) {
      // Level up! Check for achievements
      dispatch(checkLevelAchievements(newLevel));
    }
    
    return { xp: newXP, level: newLevel };
  }
);

export const unlockAchievement = createAsyncThunk(
  'user/unlockAchievement',
  async (achievementId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { user: UserState };
      const token = state.user.authToken;
      
      if (!token) {
        throw new Error('No auth token');
      }

      const response = await mockApiCall(`/achievements/${achievementId}/unlock`, {}, token);
      
      if (response.success) {
        return response.achievement;
      } else {
        throw new Error(response.message || 'Failed to unlock achievement');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('authToken');
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// Helper functions
const calculateLevel = (xp: number): number => {
  // XP curve: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const checkLevelAchievements = (level: number) => (dispatch: any) => {
  const levelAchievements = [
    { level: 5, id: 'first_five' },
    { level: 10, id: 'double_digits' },
    { level: 25, id: 'quarter_century' },
    { level: 50, id: 'halfway_to_hundred' },
    { level: 100, id: 'centurion' },
  ];

  const achievement = levelAchievements.find(a => a.level === level);
  if (achievement) {
    dispatch(unlockAchievement(achievement.id));
  }
};

// Mock API function - replace with real API integration
const mockApiCall = async (endpoint: string, data: any = {}, token?: string): Promise<any> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Mock responses based on endpoint
  switch (endpoint) {
    case '/auth/login':
      if (data.email === 'test@example.com' && data.password === 'password') {
        return {
          success: true,
          token: 'mock-jwt-token',
          user: {
            id: '1',
            email: data.email,
            username: 'testuser',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
          profile: {
            firstName: 'Test',
            lastName: 'User',
            skills: [],
            achievements: [],
          },
          xp: 1250,
          level: 4,
        };
      } else {
        return { success: false, message: 'Invalid credentials' };
      }

    case '/auth/register':
      return {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: '2',
          email: data.email,
          username: data.username,
          createdAt: new Date().toISOString(),
        },
        profile: {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          skills: [],
          achievements: [],
        },
      };

    case '/auth/me':
      if (token) {
        return {
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            username: 'testuser',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastLogin: new Date().toISOString(),
          },
          profile: {
            firstName: 'Test',
            lastName: 'User',
            skills: ['hand_tracking', 'robot_control'],
            achievements: [
              {
                id: 'first_recording',
                title: 'First Steps',
                description: 'Complete your first recording session',
                iconName: 'play-circle',
                unlockedAt: '2024-01-02T00:00:00.000Z',
                rarity: 'common' as const,
              },
            ],
          },
          xp: 1250,
          level: 4,
        };
      } else {
        return { success: false, message: 'Invalid token' };
      }

    case '/user/profile':
      return {
        success: true,
        profile: {
          ...data,
          skills: data.skills || [],
          achievements: [],
        },
      };

    default:
      if (endpoint.startsWith('/achievements/') && endpoint.endsWith('/unlock')) {
        const achievementId = endpoint.split('/')[2];
        return {
          success: true,
          achievement: {
            id: achievementId,
            title: 'Achievement Unlocked',
            description: 'You unlocked a new achievement!',
            iconName: 'trophy',
            unlockedAt: new Date().toISOString(),
            rarity: 'rare' as const,
          },
        };
      }
      return { success: false, message: 'Endpoint not found' };
  }
};

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateXP: (state, action: PayloadAction<number>) => {
      state.xp = Math.max(0, state.xp + action.payload);
      state.level = calculateLevel(state.xp);
    },
    setLevel: (state, action: PayloadAction<number>) => {
      state.level = Math.max(1, action.payload);
    },
    addSkillToProfile: (state, action: PayloadAction<string>) => {
      if (state.profile && !state.profile.skills.includes(action.payload)) {
        state.profile.skills.push(action.payload);
      }
    },
    removeSkillFromProfile: (state, action: PayloadAction<string>) => {
      if (state.profile) {
        state.profile.skills = state.profile.skills.filter(
          skill => skill !== action.payload
        );
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.xp = action.payload.xp;
        state.level = action.payload.level;
        state.authToken = action.payload.authToken;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.xp = action.payload.xp;
        state.level = action.payload.level;
        state.authToken = action.payload.authToken;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load from storage
    builder
      .addCase(loadUserFromStorage.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.profile = action.payload.profile;
          state.xp = action.payload.xp;
          state.level = action.payload.level;
          state.authToken = action.payload.authToken;
        }
      })
      .addCase(loadUserFromStorage.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });

    // Update profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = { ...state.profile, ...action.payload };
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add XP
    builder
      .addCase(addXP.fulfilled, (state, action) => {
        state.xp = action.payload.xp;
        state.level = action.payload.level;
      });

    // Unlock achievement
    builder
      .addCase(unlockAchievement.fulfilled, (state, action) => {
        if (state.profile) {
          const existingIndex = state.profile.achievements.findIndex(
            a => a.id === action.payload.id
          );
          if (existingIndex === -1) {
            state.profile.achievements.push(action.payload);
          }
        }
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        return initialState;
      });
  },
});

export const {
  clearError,
  updateXP,
  setLevel,
  addSkillToProfile,
  removeSkillFromProfile,
} = userSlice.actions;

export default userSlice.reducer;