import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isVerified: boolean;
  subscription: {
    type: 'free' | 'pro' | 'enterprise';
    expiresAt?: Date;
    features: string[];
  };
  stats: {
    totalRecordings: number;
    totalTrainingTime: number;
    skillsCreated: number;
    skillsPurchased: number;
    reputation: number;
    level: number;
    xp: number;
  };
  preferences: {
    theme: 'dark' | 'light' | 'auto';
    notifications: boolean;
    dataSharing: boolean;
    language: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  biometricEnabled: boolean;
  sessionExpiry: Date | null;
}

export class AuthService {
  private readonly STORAGE_KEYS = {
    USER: 'auth_user',
    TOKEN: 'auth_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    BIOMETRIC_ENABLED: 'auth_biometric_enabled',
    SESSION_DATA: 'auth_session_data',
  };

  private currentUser: User | null = null;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;

  async initialize(): Promise<AuthState> {
    try {
      // Load stored authentication data
      const [storedUser, storedToken, storedRefreshToken, biometricEnabled] = await Promise.all([
        this.getStoredData(this.STORAGE_KEYS.USER),
        this.getStoredData(this.STORAGE_KEYS.TOKEN),
        this.getStoredData(this.STORAGE_KEYS.REFRESH_TOKEN),
        this.getStoredData(this.STORAGE_KEYS.BIOMETRIC_ENABLED),
      ]);

      if (storedUser && storedToken) {
        this.currentUser = JSON.parse(storedUser);
        this.authToken = storedToken;
        this.refreshToken = storedRefreshToken || null;

        // Verify token validity
        const isValid = await this.verifyToken(storedToken);
        if (isValid) {
          this.setupSessionTimer();
          return {
            isAuthenticated: true,
            user: this.currentUser,
            token: this.authToken,
            refreshToken: this.refreshToken,
            biometricEnabled: biometricEnabled === 'true',
            sessionExpiry: this.getSessionExpiry(),
          };
        }
      }

      return {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        biometricEnabled: biometricEnabled === 'true',
        sessionExpiry: null,
      };
    } catch (error) {
      console.error('Auth initialization error:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        biometricEnabled: false,
        sessionExpiry: null,
      };
    }
  }

  async signUp(email: string, password: string, username: string): Promise<AuthState> {
    try {
      // Validate input
      this.validateEmail(email);
      this.validatePassword(password);
      this.validateUsername(username);

      // Hash password
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'salt_12345'
      );

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create user
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        username,
        displayName: username,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isVerified: false,
        subscription: {
          type: 'free',
          features: ['basic_recording', 'marketplace_browse'],
        },
        stats: {
          totalRecordings: 0,
          totalTrainingTime: 0,
          skillsCreated: 0,
          skillsPurchased: 0,
          reputation: 0,
          level: 1,
          xp: 0,
        },
        preferences: {
          theme: 'dark',
          notifications: true,
          dataSharing: false,
          language: 'en',
        },
      };

      // Generate tokens
      const token = await this.generateToken(newUser.id);
      const refreshToken = await this.generateRefreshToken(newUser.id);

      // Store authentication data
      await this.storeAuthData(newUser, token, refreshToken);

      this.currentUser = newUser;
      this.authToken = token;
      this.refreshToken = refreshToken;
      this.setupSessionTimer();

      return {
        isAuthenticated: true,
        user: newUser,
        token,
        refreshToken,
        biometricEnabled: false,
        sessionExpiry: this.getSessionExpiry(),
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<AuthState> {
    try {
      this.validateEmail(email);
      this.validatePassword(password);

      // Hash password for comparison
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'salt_12345'
      );

      // Simulate API authentication
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock user data (in real app, this comes from server)
      const user: User = {
        id: `user_${email.replace(/[@.]/g, '_')}`,
        email,
        username: email.split('@')[0],
        displayName: email.split('@')[0],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(),
        isVerified: true,
        subscription: {
          type: 'pro',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          features: ['unlimited_recording', 'marketplace_sell', 'advanced_analytics'],
        },
        stats: {
          totalRecordings: 47,
          totalTrainingTime: 3600000,
          skillsCreated: 12,
          skillsPurchased: 8,
          reputation: 850,
          level: 15,
          xp: 12400,
        },
        preferences: {
          theme: 'dark',
          notifications: true,
          dataSharing: true,
          language: 'en',
        },
      };

      const token = await this.generateToken(user.id);
      const refreshToken = await this.generateRefreshToken(user.id);

      await this.storeAuthData(user, token, refreshToken);

      this.currentUser = user;
      this.authToken = token;
      this.refreshToken = refreshToken;
      this.setupSessionTimer();

      return {
        isAuthenticated: true,
        user,
        token,
        refreshToken,
        biometricEnabled: await this.isBiometricEnabled(),
        sessionExpiry: this.getSessionExpiry(),
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signInWithBiometric(): Promise<AuthState> {
    try {
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use password instead',
      });

      if (!biometricResult.success) {
        throw new Error('Biometric authentication failed');
      }

      // Load stored user data
      const storedUser = await this.getStoredData(this.STORAGE_KEYS.USER);
      if (!storedUser) {
        throw new Error('No stored user data found');
      }

      const user: User = JSON.parse(storedUser);
      const token = await this.generateToken(user.id);
      const refreshToken = await this.generateRefreshToken(user.id);

      await this.storeAuthData(user, token, refreshToken);

      this.currentUser = user;
      this.authToken = token;
      this.refreshToken = refreshToken;
      this.setupSessionTimer();

      return {
        isAuthenticated: true,
        user,
        token,
        refreshToken,
        biometricEnabled: true,
        sessionExpiry: this.getSessionExpiry(),
      };
    } catch (error) {
      console.error('Biometric sign in error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // Clear session timer
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
        this.sessionTimer = null;
      }

      // Clear stored data
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.USER),
        AsyncStorage.removeItem(this.STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(this.STORAGE_KEYS.SESSION_DATA),
      ]);

      // Clear in-memory data
      this.currentUser = null;
      this.authToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedUser: User = {
        ...this.currentUser,
        ...updates,
      };

      await AsyncStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      this.currentUser = updatedUser;

      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      this.validatePassword(newPassword);

      // Hash passwords
      const currentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        currentPassword + 'salt_12345'
      );

      const newHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        newPassword + 'salt_12345'
      );

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In real implementation, verify current password and update
      console.log('Password changed successfully');
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  async enableBiometric(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometric authentication not available');
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      return true;
    } catch (error) {
      console.error('Enable biometric error:', error);
      throw error;
    }
  }

  async disableBiometric(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
  }

  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await this.getStoredData(this.STORAGE_KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  }

  async isBiometricAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  async refreshAuthToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // Simulate API call to refresh token
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newToken = await this.generateToken(this.currentUser!.id);
      const newRefreshToken = await this.generateRefreshToken(this.currentUser!.id);

      await AsyncStorage.setItem(this.STORAGE_KEYS.TOKEN, newToken);
      await AsyncStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      this.authToken = newToken;
      this.refreshToken = newRefreshToken;
      this.setupSessionTimer();

      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.authToken;
  }

  private async generateToken(userId: string): Promise<string> {
    const payload = {
      userId,
      timestamp: Date.now(),
      random: Math.random().toString(36),
    };

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(payload)
    );
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const payload = {
      userId,
      type: 'refresh',
      timestamp: Date.now(),
      random: Math.random().toString(36),
    };

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(payload)
    );
  }

  private async verifyToken(token: string): Promise<boolean> {
    // In real implementation, verify with server
    // For now, just check if token exists and is not empty
    return !!token && token.length > 0;
  }

  private async storeAuthData(user: User, token: string, refreshToken: string): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user)),
      AsyncStorage.setItem(this.STORAGE_KEYS.TOKEN, token),
      AsyncStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      AsyncStorage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify({
        loginTime: Date.now(),
        expiryTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      })),
    ]);
  }

  private async getStoredData(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }

  private setupSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    // Auto-refresh token every 23 hours
    this.sessionTimer = setTimeout(() => {
      if (this.refreshToken) {
        this.refreshAuthToken().catch(error => {
          console.error('Auto token refresh failed:', error);
          // Could trigger re-authentication here
        });
      }
    }, 23 * 60 * 60 * 1000);
  }

  private getSessionExpiry(): Date | null {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email address');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter, one uppercase letter, and one digit');
    }
  }

  private validateUsername(username: string): void {
    if (username.length < 3 || username.length > 20) {
      throw new Error('Username must be between 3 and 20 characters');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
  }
}

export const authService = new AuthService();