import { HandPose, LerobotDataPoint, RobotConnection } from '../types';

// User State Types
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  skills: string[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserState {
  user: User | null;
  profile: UserProfile | null;
  xp: number;
  level: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authToken: string | null;
}

// Recording State Types
export interface RecordingSession {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  duration: number;
  frameCount: number;
  dataPoints: LerobotDataPoint[];
  status: 'recording' | 'completed' | 'processing' | 'error';
  tags: string[];
  difficulty: number;
  robotType?: string;
}

export interface RecordingState {
  sessions: RecordingSession[];
  currentSession: RecordingSession | null;
  isRecording: boolean;
  isProcessing: boolean;
  recordingStartTime: number | null;
  error: string | null;
  settings: {
    autoSave: boolean;
    frameRate: number;
    compressionLevel: number;
    includeDepthData: boolean;
  };
}

// Robot State Types
export interface RobotCommand {
  id: string;
  robotId: string;
  command: string;
  parameters: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: number;
  executedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface RobotState {
  connectedRobots: RobotConnection[];
  activeRobot: RobotConnection | null;
  commandQueue: RobotCommand[];
  isDiscovering: boolean;
  discoveredRobots: RobotConnection[];
  connectionHistory: RobotConnection[];
  error: string | null;
  settings: {
    autoConnect: boolean;
    heartbeatInterval: number;
    commandTimeout: number;
    maxRetries: number;
  };
}

// Marketplace State Types
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: number;
  price: number;
  currency: 'XP' | 'USD';
  creatorId: string;
  creatorName: string;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  datasetSize: number;
  createdAt: string;
  updatedAt: string;
  compatibility: string[];
  requirements: SkillRequirement[];
}

export interface SkillRequirement {
  type: 'robot_type' | 'sensor' | 'capability' | 'level';
  value: string | number;
  description: string;
}

export interface Purchase {
  id: string;
  skillId: string;
  userId: string;
  price: number;
  currency: 'XP' | 'USD';
  purchasedAt: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
}

export interface SkillListing {
  id: string;
  skillId: string;
  sellerId: string;
  price: number;
  currency: 'XP' | 'USD';
  status: 'active' | 'sold' | 'removed';
  createdAt: string;
}

export interface MarketplaceState {
  skills: Skill[];
  userSkills: Skill[];
  userPurchases: Purchase[];
  userListings: SkillListing[];
  featuredSkills: Skill[];
  categories: string[];
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: 'price' | 'rating' | 'downloads' | 'newest';
  isLoading: boolean;
  error: string | null;
  cart: CartItem[];
}

export interface CartItem {
  skillId: string;
  price: number;
  currency: 'XP' | 'USD';
}

// Settings State Types
export interface NotificationSettings {
  pushNotifications: boolean;
  robotStatusUpdates: boolean;
  marketplaceUpdates: boolean;
  recordingReminders: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface CameraSettings {
  resolution: '720p' | '1080p' | '4K';
  frameRate: 30 | 60 | 120;
  enableDepthData: boolean;
  autoFocus: boolean;
  exposureCompensation: number;
}

export interface RecordingPreferences {
  defaultSessionName: string;
  autoSaveInterval: number;
  compressionLevel: number;
  maxSessionDuration: number;
  includeEnvironmentData: boolean;
}

export interface AppPreferences {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  units: 'metric' | 'imperial';
  debugMode: boolean;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
}

export interface SettingsState {
  notifications: NotificationSettings;
  camera: CameraSettings;
  recording: RecordingPreferences;
  app: AppPreferences;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

// Root State Type
export interface RootState {
  user: UserState;
  recording: RecordingState;
  robot: RobotState;
  marketplace: MarketplaceState;
  settings: SettingsState;
}

// Action Payload Types
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  skills?: string[];
}

export interface StartRecordingPayload {
  name: string;
  description?: string;
  robotType?: string;
  tags?: string[];
}

export interface AddDataPointPayload {
  sessionId: string;
  dataPoint: LerobotDataPoint;
}

export interface ConnectRobotPayload {
  robotId: string;
  connectionParams?: {
    ipAddress?: string;
    bluetoothId?: string;
    password?: string;
  };
}

export interface SendRobotCommandPayload {
  robotId: string;
  command: string;
  parameters?: any;
  priority?: RobotCommand['priority'];
}

export interface SearchSkillsPayload {
  query?: string;
  category?: string;
  sortBy?: MarketplaceState['sortBy'];
  filters?: {
    priceRange?: [number, number];
    difficulty?: [number, number];
    rating?: number;
  };
}

export interface PurchaseSkillPayload {
  skillId: string;
  currency: 'XP' | 'USD';
}

export interface ListSkillPayload {
  skillId: string;
  price: number;
  currency: 'XP' | 'USD';
}