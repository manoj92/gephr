import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../../src/screens/HomeScreen';
import { gamificationService } from '../../src/services/GamificationService';
import { authService } from '../../src/services/AuthService';

// Mock services
jest.mock('../../src/services/GamificationService');
jest.mock('../../src/services/AuthService');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock the logo require
jest.mock('../../gephr-logo.png', () => 'mocked-logo');

const MockNavigationWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

describe('HomeScreen', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    profileImage: undefined,
    level: 5,
    xp: 1500,
    totalRecordings: 25,
    totalEarnings: 150,
    joinedDate: new Date(),
    balance: 75,
    achievements: [],
    lastLogin: new Date(),
    isEmailVerified: true,
    preferences: {
      notifications: true,
      biometricAuth: false,
      dataSharing: true,
      language: 'en',
      theme: 'dark'
    }
  };

  const mockGamificationStats = {
    level: {
      level: 5,
      currentXP: 500,
      xpToNextLevel: 250,
      totalXP: 1500,
      title: 'Specialist',
      perks: ['Unlock Pro Recording Features']
    },
    totalXP: 1500,
    achievements: [
      {
        id: 'first_recording',
        name: 'First Steps',
        description: 'Complete your first recording',
        category: 'recording' as const,
        icon: 'play',
        rarity: 'common' as const,
        xpReward: 50,
        requirements: [],
        unlockedAt: new Date(),
        progress: 1,
        maxProgress: 1
      }
    ],
    badges: [],
    activeChallenges: [
      {
        id: 'daily-1',
        name: 'Daily Training',
        description: 'Complete 3 recording sessions',
        type: 'daily' as const,
        category: 'recording' as const,
        requirements: [{ type: 'complete_recording', target: 3, description: 'Record 3 sessions' }],
        rewards: [
          { type: 'xp' as const, value: 100, description: '100 XP' },
          { type: 'coins' as const, value: 50, description: '50 coins' }
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        progress: 1,
        maxProgress: 3,
        completed: false
      }
    ],
    completedChallenges: [],
    streaks: {
      current: 5,
      longest: 10,
      lastActiveDate: new Date()
    },
    coins: 100,
    reputation: 75
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (gamificationService.initialize as jest.Mock).mockResolvedValue(undefined);
    (gamificationService.getStats as jest.Mock).mockReturnValue(mockGamificationStats);
    (gamificationService.getActiveChallenges as jest.Mock).mockReturnValue(mockGamificationStats.activeChallenges);
  });

  it('should render loading state initially', () => {
    const { getByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    expect(getByText('Loading your progress...')).toBeDefined();
  });

  it('should render home screen with user data after loading', async () => {
    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    // Check if main elements are rendered
    expect(getByText('Gephr Labs')).toBeDefined();
    expect(getByText('Transform your smartphone into a robot training powerhouse')).toBeDefined();
    expect(getByText('🔥 Test User')).toBeDefined(); // Profile button with user display name
  });

  it('should display level progress correctly', async () => {
    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('Specialist')).toBeDefined();
    expect(getByText('Level 5')).toBeDefined();
    expect(getByText('500 / 750 XP')).toBeDefined();
    expect(getByText('🎯 Unlock Pro Recording Features')).toBeDefined();
  });

  it('should display statistics correctly', async () => {
    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('2.3 GB')).toBeDefined(); // Data recorded
    expect(getByText('$75')).toBeDefined(); // Earnings from user balance
    expect(getByText('100')).toBeDefined(); // Coins from gamification stats
    expect(getByText('1')).toBeDefined(); // Achievements count
  });

  it('should display active streak', async () => {
    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('🔥 5 Day Streak!')).toBeDefined();
    expect(getByText('Keep it up! Longest streak: 10 days')).toBeDefined();
  });

  it('should display active challenges', async () => {
    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('Active Challenges')).toBeDefined();
    expect(getByText('Daily Training')).toBeDefined();
    expect(getByText('Complete 3 recording sessions')).toBeDefined();
    expect(getByText('1/3')).toBeDefined(); // Progress
    expect(getByText('100 XP + 50 coins')).toBeDefined(); // Rewards
  });

  it('should render action buttons', async () => {
    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('Start Recording')).toBeDefined();
    expect(getByText('Connect Robot')).toBeDefined();
    expect(getByText('Browse Marketplace')).toBeDefined();
    expect(getByText('Map Environment')).toBeDefined();
  });

  it('should handle challenge press', async () => {
    const mockNavigate = jest.fn();
    jest.doMock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({
        navigate: mockNavigate,
      }),
    }));

    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    // Press on challenge card
    const challengeCard = getByText('Daily Training').closest('View');
    if (challengeCard) {
      fireEvent.press(challengeCard);
    }

    // Should show alert (mocked in setup)
  });

  it('should handle service initialization errors', async () => {
    (authService.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

    const { queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    // Should render without user data
    expect(queryByText('🔥 Test User')).toBeNull();
  });

  it('should handle missing user data gracefully', async () => {
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);

    const { queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    // Should still render basic elements
    expect(queryByText('Gephr Labs')).toBeDefined();
    expect(queryByText('🔥 Test User')).toBeNull(); // No profile button
  });

  it('should not display streak if current streak is 0', async () => {
    const statsWithoutStreak = {
      ...mockGamificationStats,
      streaks: { current: 0, longest: 5, lastActiveDate: new Date() }
    };

    (gamificationService.getStats as jest.Mock).mockReturnValue(statsWithoutStreak);

    const { queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(queryByText('🔥 0 Day Streak!')).toBeNull();
  });

  it('should display "View all challenges" link when there are more than 3 challenges', async () => {
    const manyActiveChallenges = Array.from({ length: 5 }, (_, i) => ({
      ...mockGamificationStats.activeChallenges[0],
      id: `challenge-${i}`,
      name: `Challenge ${i + 1}`,
    }));

    (gamificationService.getActiveChallenges as jest.Mock).mockReturnValue(manyActiveChallenges);

    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('View all 5 challenges →')).toBeDefined();
  });

  it('should calculate XP progress correctly', async () => {
    const customStats = {
      ...mockGamificationStats,
      level: {
        level: 3,
        currentXP: 200,
        xpToNextLevel: 300,
        totalXP: 700,
        title: 'Trainee',
        perks: []
      }
    };

    (gamificationService.getStats as jest.Mock).mockReturnValue(customStats);

    const { getByText, queryByText } = render(
      <MockNavigationWrapper>
        <HomeScreen />
      </MockNavigationWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading your progress...')).toBeNull();
    });

    expect(getByText('200 / 500 XP')).toBeDefined(); // currentXP / (currentXP + xpToNextLevel)
    expect(getByText('Trainee')).toBeDefined();
    expect(getByText('Level 3')).toBeDefined();
  });
});