import { GamificationService } from '../../src/services/GamificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('GamificationService', () => {
  let gamificationService: GamificationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    gamificationService = new GamificationService();
  });

  describe('Initialization', () => {
    it('should initialize with default stats', () => {
      const stats = gamificationService.getStats();
      
      expect(stats.level.level).toBe(1);
      expect(stats.level.title).toBe('Novice');
      expect(stats.totalXP).toBe(0);
      expect(stats.coins).toBe(0);
      expect(stats.achievements).toHaveLength(0);
    });

    it('should load saved data on initialization', async () => {
      const mockStats = {
        level: { level: 5, currentXP: 500, totalXP: 1500, title: 'Expert', xpToNextLevel: 250, perks: [] },
        totalXP: 1500,
        coins: 150,
        achievements: [{ id: 'first_recording', unlockedAt: new Date().toISOString() }],
        streaks: { current: 5, longest: 10, lastActiveDate: new Date().toISOString() }
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockStats))
        .mockResolvedValueOnce('[]')
        .mockResolvedValueOnce('[]')
        .mockResolvedValueOnce('[]');

      await gamificationService.initialize('test-user');
      
      const stats = gamificationService.getStats();
      expect(stats.level.level).toBe(5);
      expect(stats.totalXP).toBe(1500);
      expect(stats.coins).toBe(150);
    });
  });

  describe('XP System', () => {
    beforeEach(async () => {
      await gamificationService.initialize('test-user');
    });

    it('should award XP correctly', async () => {
      const result = await gamificationService.awardXP(50, 'recording');
      
      expect(result.levelUp).toBe(false);
      
      const stats = gamificationService.getStats();
      expect(stats.totalXP).toBe(50);
      expect(stats.level.currentXP).toBe(50);
      expect(stats.level.xpToNextLevel).toBe(50);
    });

    it('should handle level up correctly', async () => {
      const result = await gamificationService.awardXP(150, 'recording');
      
      expect(result.levelUp).toBe(true);
      expect(result.newLevel?.level).toBe(2);
      
      const stats = gamificationService.getStats();
      expect(stats.level.level).toBe(2);
      expect(stats.level.title).toBe('Apprentice');
      expect(stats.coins).toBe(20); // Level 2 * 10 coins
    });

    it('should calculate level correctly for high XP', async () => {
      await gamificationService.awardXP(5000, 'recording');
      
      const stats = gamificationService.getStats();
      expect(stats.level.level).toBeGreaterThan(1);
      expect(stats.totalXP).toBe(5000);
    });
  });

  describe('Activity Tracking', () => {
    beforeEach(async () => {
      await gamificationService.initialize('test-user');
    });

    it('should complete recording and award XP', async () => {
      await gamificationService.completeRecording(30000, 10, 'high'); // 30 seconds, 10 gestures, high quality
      
      const stats = gamificationService.getStats();
      expect(stats.totalXP).toBeGreaterThan(0);
      
      const challenges = gamificationService.getActiveChallenges();
      const recordingChallenge = challenges.find(c => c.name === 'Daily Training');
      expect(recordingChallenge?.progress).toBe(1);
    });

    it('should connect robot and award XP', async () => {
      await gamificationService.connectRobot('unitree_g1', 5000); // 5 second connection time
      
      const stats = gamificationService.getStats();
      expect(stats.totalXP).toBeGreaterThan(0);
      
      const challenges = gamificationService.getActiveChallenges();
      const robotChallenge = challenges.find(c => c.name === 'Robot Master');
      expect(robotChallenge?.progress).toBe(1);
    });

    it('should create skill and award XP', async () => {
      await gamificationService.createSkill('Test Skill', 'manipulation', 120000); // 2 minutes training time
      
      const stats = gamificationService.getStats();
      expect(stats.totalXP).toBeGreaterThan(200); // Base reward + time bonus
    });

    it('should purchase skill and update coins', async () => {
      // First, give some coins
      await gamificationService.awardXP(1000, 'test'); // This will level up and give coins
      
      const initialStats = gamificationService.getStats();
      const initialCoins = initialStats.coins;
      
      await gamificationService.purchaseSkill(50);
      
      const finalStats = gamificationService.getStats();
      expect(finalStats.coins).toBe(initialCoins - 50);
      expect(finalStats.totalXP).toBeGreaterThan(initialStats.totalXP); // Should get some XP too
    });
  });

  describe('Achievements', () => {
    beforeEach(async () => {
      await gamificationService.initialize('test-user');
    });

    it('should unlock achievements', async () => {
      // Complete first recording to unlock achievement
      await gamificationService.completeRecording(10000, 5, 'medium');
      
      const achievements = gamificationService.getUnlockedAchievements();
      const firstRecording = achievements.find(a => a.id === 'first_recording');
      expect(firstRecording).toBeDefined();
      expect(firstRecording?.unlockedAt).toBeDefined();
    });

    it('should not unlock the same achievement twice', async () => {
      await gamificationService.completeRecording(10000, 5, 'medium');
      await gamificationService.completeRecording(10000, 5, 'medium');
      
      const achievements = gamificationService.getUnlockedAchievements();
      const firstRecordingAchievements = achievements.filter(a => a.id === 'first_recording');
      expect(firstRecordingAchievements).toHaveLength(1);
    });

    it('should get all available achievements', () => {
      const allAchievements = gamificationService.getAchievements();
      expect(allAchievements.length).toBeGreaterThan(0);
      expect(allAchievements.some(a => a.id === 'first_recording')).toBe(true);
      expect(allAchievements.some(a => a.id === 'recording_master')).toBe(true);
    });
  });

  describe('Challenges', () => {
    beforeEach(async () => {
      await gamificationService.initialize('test-user');
    });

    it('should have daily challenges', async () => {
      const challenges = gamificationService.getActiveChallenges();
      
      const dailyChallenges = challenges.filter(c => c.type === 'daily');
      expect(dailyChallenges.length).toBeGreaterThan(0);
      
      const dailyTraining = dailyChallenges.find(c => c.name === 'Daily Training');
      expect(dailyTraining).toBeDefined();
      expect(dailyTraining?.maxProgress).toBe(3);
    });

    it('should complete challenges and award rewards', async () => {
      // Complete 3 recordings to finish daily challenge
      for (let i = 0; i < 3; i++) {
        await gamificationService.completeRecording(10000, 5, 'medium');
      }
      
      const challenges = gamificationService.getActiveChallenges();
      const dailyTraining = challenges.find(c => c.name === 'Daily Training');
      
      if (dailyTraining) {
        expect(dailyTraining.completed).toBe(true);
        expect(dailyTraining.completedAt).toBeDefined();
      }
      
      const stats = gamificationService.getStats();
      expect(stats.coins).toBeGreaterThan(0); // Should have challenge reward coins
    });

    it('should update challenge progress correctly', async () => {
      await gamificationService.completeRecording(10000, 5, 'medium');
      
      const challenges = gamificationService.getActiveChallenges();
      const dailyTraining = challenges.find(c => c.name === 'Daily Training');
      
      expect(dailyTraining?.progress).toBe(1);
      expect(dailyTraining?.completed).toBe(false);
    });
  });

  describe('Streaks', () => {
    beforeEach(async () => {
      await gamificationService.initialize('test-user');
    });

    it('should maintain streak for consecutive days', async () => {
      const stats = gamificationService.getStats();
      expect(stats.streaks.current).toBe(1); // Should start streak on initialization
    });

    it('should track longest streak', async () => {
      const stats = gamificationService.getStats();
      expect(stats.streaks.longest).toBeGreaterThanOrEqual(stats.streaks.current);
    });
  });

  describe('Leaderboards', () => {
    it('should generate leaderboard data', async () => {
      const leaderboard = await gamificationService.getLeaderboard('global', 'xp');
      
      expect(leaderboard.type).toBe('global');
      expect(leaderboard.metric).toBe('xp');
      expect(leaderboard.entries.length).toBeGreaterThan(0);
      expect(leaderboard.entries[0].rank).toBe(1);
      expect(leaderboard.lastUpdated).toBeDefined();
    });

    it('should sort leaderboard entries correctly', async () => {
      const leaderboard = await gamificationService.getLeaderboard('friends', 'recordings');
      
      for (let i = 0; i < leaderboard.entries.length - 1; i++) {
        expect(leaderboard.entries[i].value).toBeGreaterThanOrEqual(
          leaderboard.entries[i + 1].value
        );
        expect(leaderboard.entries[i].rank).toBe(i + 1);
      }
    });
  });

  describe('Data Persistence', () => {
    it('should save data to AsyncStorage', async () => {
      await gamificationService.awardXP(100, 'test');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'gamification_stats',
        expect.stringContaining('100')
      );
    });

    it('should reset progress correctly', async () => {
      // Award some XP and unlock achievements
      await gamificationService.awardXP(1000, 'test');
      await gamificationService.completeRecording(10000, 5, 'high');
      
      // Reset progress
      await gamificationService.resetProgress();
      
      const stats = gamificationService.getStats();
      expect(stats.level.level).toBe(1);
      expect(stats.totalXP).toBe(0);
      expect(stats.coins).toBe(0);
      expect(stats.achievements).toHaveLength(0);
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'gamification_stats',
        'gamification_achievements', 
        'gamification_challenges',
        'gamification_badges'
      ]);
    });
  });

  describe('Level System', () => {
    beforeEach(async () => {
      await gamificationService.initialize('test-user');
    });

    it('should assign correct level titles', async () => {
      const levelTests = [
        { xp: 0, level: 1, title: 'Novice' },
        { xp: 100, level: 2, title: 'Apprentice' },
        { xp: 1000, level: 5, title: 'Specialist' },
        { xp: 10000, level: 11, title: 'Elite' },
      ];

      for (const test of levelTests) {
        // Reset and award specific XP
        await gamificationService.resetProgress();
        await gamificationService.initialize('test-user');
        
        if (test.xp > 0) {
          await gamificationService.awardXP(test.xp, 'test');
        }
        
        const stats = gamificationService.getStats();
        expect(stats.level.level).toBe(test.level);
        expect(stats.level.title).toBe(test.title);
      }
    });

    it('should unlock perks at appropriate levels', async () => {
      // Level 5 should unlock first perk
      await gamificationService.awardXP(1000, 'test');
      
      const stats = gamificationService.getStats();
      if (stats.level.level >= 5) {
        expect(stats.level.perks).toContain('Unlock Pro Recording Features');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw error
      await expect(gamificationService.initialize('test-user')).resolves.not.toThrow();
    });

    it('should handle invalid achievement data', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('{}')
        .mockResolvedValueOnce('invalid json');
      
      await gamificationService.initialize('test-user');
      
      // Should still work with default achievements
      const achievements = gamificationService.getAchievements();
      expect(achievements.length).toBeGreaterThan(0);
    });
  });
});