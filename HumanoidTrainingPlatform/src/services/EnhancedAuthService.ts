import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  level: number;
  xp: number;
  credits: number;
  tokens: number;
  verified: boolean;
  premium: boolean;
  joinedAt: Date;
  lastLoginAt: Date;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      achievements: boolean;
      marketplace: boolean;
      social: boolean;
      system: boolean;
    };
    privacy: {
      showOnlineStatus: boolean;
      shareStats: boolean;
      allowFriendRequests: boolean;
    };
    recording: {
      autoSave: boolean;
      quality: 'low' | 'medium' | 'high';
      hapticFeedback: boolean;
    };
  };
  stats: {
    totalRecordings: number;
    totalTrainingHours: number;
    robotsConnected: number;
    skillsPurchased: number;
    skillsSold: number;
    friendsCount: number;
  };
  achievements: string[];
  badges: string[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupData extends AuthCredentials {
  username: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface BiometricConfig {
  enabled: boolean;
  type: 'fingerprint' | 'face' | 'iris' | 'none';
  fallbackToPin: boolean;
}

export class EnhancedAuthService {
  private currentSession: AuthSession | null = null;
  private biometricConfig: BiometricConfig | null = null;
  private authListeners: Array<(user: User | null) => void> = [];

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Check for existing session
      await this.loadStoredSession();

      // Initialize biometric authentication
      await this.initializeBiometrics();

      // Validate session if exists
      if (this.currentSession) {
        await this.validateSession();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  private async loadStoredSession(): Promise<void> {
    try {
      const sessionData = await SecureStore.getItemAsync('auth_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.expiresAt = new Date(session.expiresAt);
        this.currentSession = session;
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
    }
  }

  private async initializeBiometrics(): Promise<void> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (isAvailable && isEnrolled) {
        let biometricType: BiometricConfig['type'] = 'none';

        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          biometricType = 'face';
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          biometricType = 'fingerprint';
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          biometricType = 'iris';
        }

        this.biometricConfig = {
          enabled: true,
          type: biometricType,
          fallbackToPin: true
        };

        // Load user's biometric preference
        const userPreference = await AsyncStorage.getItem('biometric_enabled');
        if (userPreference === 'false') {
          this.biometricConfig.enabled = false;
        }
      } else {
        this.biometricConfig = {
          enabled: false,
          type: 'none',
          fallbackToPin: false
        };
      }
    } catch (error) {
      console.error('Error initializing biometrics:', error);
      this.biometricConfig = {
        enabled: false,
        type: 'none',
        fallbackToPin: false
      };
    }
  }

  private async validateSession(): Promise<boolean> {
    if (!this.currentSession) return false;

    const now = new Date();
    if (now >= this.currentSession.expiresAt) {
      // Session expired, try to refresh
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        await this.logout();
        return false;
      }
    }

    return true;
  }

  async login(credentials: AuthCredentials, rememberMe: boolean = true): Promise<User> {
    try {
      // Simulate API call
      const response = await this.simulateLoginAPI(credentials);

      if (!response.success) {
        throw new Error(response.error);
      }

      const session: AuthSession = {
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      this.currentSession = session;

      if (rememberMe) {
        await this.storeSession(session);
      }

      // Update last login
      session.user.lastLoginAt = new Date();
      await this.updateUserProfile({ lastLoginAt: new Date() });

      this.notifyAuthListeners(session.user);

      return session.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async signup(signupData: SignupData): Promise<User> {
    try {
      if (!signupData.acceptTerms) {
        throw new Error('You must accept the terms and conditions');
      }

      // Validate input
      this.validateSignupData(signupData);

      // Simulate API call
      const response = await this.simulateSignupAPI(signupData);

      if (!response.success) {
        throw new Error(response.error);
      }

      // Automatically log in after signup
      return await this.login({
        email: signupData.email,
        password: signupData.password
      });
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }

  async biometricLogin(): Promise<User | null> {
    if (!this.biometricConfig?.enabled) {
      throw new Error('Biometric authentication is not enabled');
    }

    if (!this.currentSession) {
      throw new Error('No stored session for biometric login');
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: !this.biometricConfig.fallbackToPin,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        // Validate and refresh session if needed
        const isValid = await this.validateSession();
        if (isValid && this.currentSession) {
          this.notifyAuthListeners(this.currentSession.user);
          return this.currentSession.user;
        }
      } else {
        console.log('Biometric authentication failed:', result.error);
      }

      return null;
    } catch (error) {
      console.error('Biometric login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.currentSession) {
        // Simulate API call to invalidate token
        await this.simulateLogoutAPI(this.currentSession.token);
      }

      // Clear stored session
      await SecureStore.deleteItemAsync('auth_session');
      await AsyncStorage.removeItem('user_preferences');

      this.currentSession = null;
      this.notifyAuthListeners(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local session even if API call fails
      this.currentSession = null;
      this.notifyAuthListeners(null);
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.currentSession?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.simulateRefreshTokenAPI(this.currentSession.refreshToken);

      if (response.success) {
        this.currentSession.token = response.token;
        this.currentSession.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.storeSession(this.currentSession);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentSession) {
      throw new Error('Not authenticated');
    }

    try {
      // Simulate API call
      const response = await this.simulateUpdateProfileAPI(this.currentSession.user.id, updates);

      if (response.success) {
        this.currentSession.user = { ...this.currentSession.user, ...response.user };
        await this.storeSession(this.currentSession);
        this.notifyAuthListeners(this.currentSession.user);
        return this.currentSession.user;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.simulateChangePasswordAPI(
        this.currentSession.user.id,
        currentPassword,
        newPassword
      );

      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const response = await this.simulateResetPasswordAPI(email);

      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }

  async enableBiometricAuth(): Promise<void> {
    if (!this.biometricConfig) {
      throw new Error('Biometric hardware not available');
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use PIN'
      });

      if (result.success) {
        this.biometricConfig.enabled = true;
        await AsyncStorage.setItem('biometric_enabled', 'true');
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Enable biometric auth failed:', error);
      throw error;
    }
  }

  async disableBiometricAuth(): Promise<void> {
    if (this.biometricConfig) {
      this.biometricConfig.enabled = false;
      await AsyncStorage.setItem('biometric_enabled', 'false');
    }
  }

  async deleteAccount(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.simulateDeleteAccountAPI(this.currentSession.user.id);

      if (response.success) {
        await this.logout();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  }

  // Validation methods
  private validateSignupData(data: SignupData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Invalid email address');
    }

    if (!data.password || data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!data.username || data.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!data.firstName || data.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Storage methods
  private async storeSession(session: AuthSession): Promise<void> {
    try {
      await SecureStore.setItemAsync('auth_session', JSON.stringify(session));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  // Simulation methods (replace with real API calls)
  private async simulateLoginAPI(credentials: AuthCredentials): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock user data
    if (credentials.email === 'demo@example.com' && credentials.password === 'password123') {
      return {
        success: true,
        user: this.createMockUser(),
        token: await this.generateToken(),
        refreshToken: await this.generateToken()
      };
    }

    return {
      success: false,
      error: 'Invalid email or password'
    };
  }

  private async simulateSignupAPI(signupData: SignupData): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if email already exists (mock)
    if (signupData.email === 'existing@example.com') {
      return {
        success: false,
        error: 'Email already exists'
      };
    }

    return {
      success: true,
      user: this.createMockUser(signupData)
    };
  }

  private async simulateLogoutAPI(token: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }

  private async simulateRefreshTokenAPI(refreshToken: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      token: await this.generateToken()
    };
  }

  private async simulateUpdateProfileAPI(userId: string, updates: Partial<User>): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      user: updates
    };
  }

  private async simulateChangePasswordAPI(userId: string, currentPassword: string, newPassword: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }

  private async simulateResetPasswordAPI(email: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }

  private async simulateDeleteAccountAPI(userId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
  }

  private createMockUser(signupData?: SignupData): User {
    const now = new Date();
    return {
      id: `user_${Date.now()}`,
      username: signupData?.username || 'demo_user',
      email: signupData?.email || 'demo@example.com',
      firstName: signupData?.firstName || 'Demo',
      lastName: signupData?.lastName || 'User',
      avatar: undefined,
      bio: 'Robot training enthusiast',
      level: 12,
      xp: 2450,
      credits: 1500,
      tokens: 75,
      verified: false,
      premium: false,
      joinedAt: now,
      lastLoginAt: now,
      preferences: {
        theme: 'dark',
        notifications: {
          achievements: true,
          marketplace: true,
          social: true,
          system: true
        },
        privacy: {
          showOnlineStatus: true,
          shareStats: true,
          allowFriendRequests: true
        },
        recording: {
          autoSave: true,
          quality: 'high',
          hapticFeedback: true
        }
      },
      stats: {
        totalRecordings: 156,
        totalTrainingHours: 89,
        robotsConnected: 3,
        skillsPurchased: 12,
        skillsSold: 5,
        friendsCount: 28
      },
      achievements: ['first_recording', 'robot_master', 'social_butterfly'],
      badges: ['early_adopter', 'power_user']
    };
  }

  private async generateToken(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return randomBytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  }

  // Listener management
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);

    // Immediately call with current state
    callback(this.currentSession?.user || null);

    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  private notifyAuthListeners(user: User | null): void {
    this.authListeners.forEach(callback => callback(user));
  }

  // Getters
  getCurrentUser(): User | null {
    return this.currentSession?.user || null;
  }

  isAuthenticated(): boolean {
    return this.currentSession !== null && this.currentSession.expiresAt > new Date();
  }

  getBiometricConfig(): BiometricConfig | null {
    return this.biometricConfig;
  }

  getAuthToken(): string | null {
    return this.currentSession?.token || null;
  }

  async cleanup(): Promise<void> {
    this.authListeners = [];
  }
}

export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;