import * as SecureStore from 'expo-secure-store';
import { dataStorageService } from './DataStorageService';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  skillLevel: number;
  reputation: number;
  totalContributions: number;
  totalDownloads: number;
  earnings: number;
  badges: string[];
  isVerified: boolean;
  isPremium: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  profile: {
    bio?: string;
    location?: string;
    specialties: string[];
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      github?: string;
    };
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
    privacy: {
      publicProfile: boolean;
      shareData: boolean;
      analyticsOptOut: boolean;
    };
    app: {
      theme: 'light' | 'dark' | 'auto';
      language: string;
      defaultRobotType?: string;
    };
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  displayName: string;
  agreeToTerms: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export class AuthService {
  private currentUser: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    USER_DATA: 'auth_user_data',
    EXPIRES_AT: 'auth_expires_at',
  };

  private readonly API_ENDPOINT = 'https://api.humanoidtraining.com/auth'; // Mock endpoint

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Try to restore authentication state from secure storage
      await this.restoreAuthState();
      
      if (this.accessToken && this.tokenExpiresAt) {
        // Check if token is still valid
        if (Date.now() < this.tokenExpiresAt) {
          this.scheduleTokenRefresh();
        } else {
          // Try to refresh token
          await this.refreshAccessToken();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      await this.logout();
    }
  }

  private async restoreAuthState(): Promise<void> {
    const [accessToken, refreshToken, userData, expiresAt] = await Promise.all([
      dataStorageService.getSecureData(this.STORAGE_KEYS.ACCESS_TOKEN),
      dataStorageService.getSecureData(this.STORAGE_KEYS.REFRESH_TOKEN),
      dataStorageService.getSecureData(this.STORAGE_KEYS.USER_DATA),
      dataStorageService.getSecureData(this.STORAGE_KEYS.EXPIRES_AT),
    ]);

    if (accessToken && refreshToken && userData) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.currentUser = JSON.parse(userData);
      this.tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;
    }
  }

  private async saveAuthState(): Promise<void> {
    if (!this.accessToken || !this.refreshToken || !this.currentUser) return;

    await Promise.all([
      dataStorageService.storeSecureData(this.STORAGE_KEYS.ACCESS_TOKEN, this.accessToken),
      dataStorageService.storeSecureData(this.STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken),
      dataStorageService.storeSecureData(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser)),
      dataStorageService.storeSecureData(this.STORAGE_KEYS.EXPIRES_AT, this.tokenExpiresAt?.toString() || ''),
    ]);
  }

  private async clearAuthState(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.USER_DATA),
      SecureStore.deleteItemAsync(this.STORAGE_KEYS.EXPIRES_AT),
    ]);
  }

  /**
   * Login with email and password
   */
  public async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication logic
      if (credentials.email === 'demo@example.com' && credentials.password === 'demo123') {
        const mockUser: User = {
          id: 'user_demo',
          email: credentials.email,
          username: 'demo_user',
          displayName: 'Demo User',
          avatar: undefined,
          skillLevel: 3,
          reputation: 4.2,
          totalContributions: 12,
          totalDownloads: 245,
          earnings: 89.50,
          badges: ['early_adopter', 'contributor', 'verified'],
          isVerified: true,
          isPremium: false,
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date(),
          profile: {
            bio: 'Demo user for testing the Humanoid Training Platform',
            location: 'San Francisco, CA',
            specialties: ['manipulation', 'navigation'],
            socialLinks: {
              github: 'https://github.com/demo_user'
            }
          },
          preferences: {
            notifications: {
              email: true,
              push: true,
              marketing: false
            },
            privacy: {
              publicProfile: true,
              shareData: true,
              analyticsOptOut: false
            },
            app: {
              theme: 'dark',
              language: 'en',
              defaultRobotType: 'unitree_g1'
            }
          }
        };

        // Set tokens with 1 hour expiry
        this.accessToken = `mock_access_token_${Date.now()}`;
        this.refreshToken = `mock_refresh_token_${Date.now()}`;
        this.tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
        this.currentUser = mockUser;

        await this.saveAuthState();
        this.scheduleTokenRefresh();

        return { success: true, user: mockUser };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Register a new user
   */
  public async register(data: RegisterData): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Mock validation
      if (data.email.includes('@') && data.password.length >= 6 && data.agreeToTerms) {
        const newUser: User = {
          id: `user_${Date.now()}`,
          email: data.email,
          username: data.username,
          displayName: data.displayName,
          skillLevel: 1,
          reputation: 0,
          totalContributions: 0,
          totalDownloads: 0,
          earnings: 0,
          badges: ['newcomer'],
          isVerified: false,
          isPremium: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          profile: {
            specialties: []
          },
          preferences: {
            notifications: {
              email: true,
              push: true,
              marketing: false
            },
            privacy: {
              publicProfile: false,
              shareData: false,
              analyticsOptOut: false
            },
            app: {
              theme: 'auto',
              language: 'en'
            }
          }
        };

        // Auto-login after registration
        this.accessToken = `mock_access_token_${Date.now()}`;
        this.refreshToken = `mock_refresh_token_${Date.now()}`;
        this.tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
        this.currentUser = newUser;

        await this.saveAuthState();
        this.scheduleTokenRefresh();

        return { success: true, user: newUser };
      } else {
        return { success: false, error: 'Invalid registration data' };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  /**
   * Logout and clear all auth data
   */
  public async logout(): Promise<void> {
    try {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Clear in-memory state
      this.currentUser = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = null;

      // Clear stored state
      await this.clearAuthState();

      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock refresh logic
      this.accessToken = `mock_access_token_${Date.now()}`;
      this.tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

      await this.saveAuthState();
      this.scheduleTokenRefresh();

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      return false;
    }
  }

  private scheduleTokenRefresh(): void {
    if (!this.tokenExpiresAt) return;

    // Refresh token 5 minutes before expiry
    const refreshTime = this.tokenExpiresAt - Date.now() - (5 * 60 * 1000);

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, refreshTime);
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(updates: Partial<User['profile']>): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      this.currentUser.profile = { ...this.currentUser.profile, ...updates };
      await this.saveAuthState();

      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(updates: Partial<User['preferences']>): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      this.currentUser.preferences = { 
        ...this.currentUser.preferences, 
        ...updates 
      } as User['preferences'];

      await this.saveAuthState();

      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Preferences update failed:', error);
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  /**
   * Change password
   */
  public async changePassword(currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock password validation
      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      return { success: true };
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  /**
   * Request password reset
   */
  public async requestPasswordReset(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      return { success: true };
    } catch (error) {
      console.error('Password reset request failed:', error);
      return { success: false, error: 'Failed to request password reset' };
    }
  }

  /**
   * Get current authentication state
   */
  public getAuthState(): AuthState {
    return {
      isAuthenticated: !!this.currentUser && !!this.accessToken,
      user: this.currentUser,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.tokenExpiresAt,
    };
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.currentUser && !!this.accessToken && 
           !!this.tokenExpiresAt && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Get access token for API calls
   */
  public getAccessToken(): string | null {
    if (this.isAuthenticated()) {
      return this.accessToken;
    }
    return null;
  }

  /**
   * Anonymous login for guest users
   */
  public async loginAsGuest(): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      const guestUser: User = {
        id: `guest_${Date.now()}`,
        email: '',
        username: 'guest',
        displayName: 'Guest User',
        skillLevel: 1,
        reputation: 0,
        totalContributions: 0,
        totalDownloads: 0,
        earnings: 0,
        badges: [],
        isVerified: false,
        isPremium: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        profile: {
          specialties: []
        },
        preferences: {
          notifications: {
            email: false,
            push: false,
            marketing: false
          },
          privacy: {
            publicProfile: false,
            shareData: false,
            analyticsOptOut: true
          },
          app: {
            theme: 'auto',
            language: 'en'
          }
        }
      };

      this.currentUser = guestUser;
      // No tokens for guest users - local only

      return { success: true, user: guestUser };
    } catch (error) {
      console.error('Guest login failed:', error);
      return { success: false, error: 'Failed to login as guest' };
    }
  }
}

export const authService = new AuthService();