import AsyncStorage from '@react-native-async-storage/async-storage';
import { HapticFeedback } from 'expo-haptics';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'recording' | 'training' | 'social' | 'expertise' | 'collection' | 'milestone';
  type: 'progress' | 'milestone' | 'rare' | 'hidden';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: {
    type: string;
    target: number;
    current?: number;
  };
  rewards: {
    xp: number;
    credits: number;
    tokens?: number;
    title?: string;
    badge?: string;
  };
  unlockedAt?: Date;
  progress: number; // 0-100
  isUnlocked: boolean;
  isSecret: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserLevel {
  level: number;
  currentXP: number;
  requiredXP: number;
  title: string;
  perks: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  objectives: Array<{
    id: string;
    description: string;
    target: number;
    current: number;
    type: string;
  }>;
  rewards: {
    xp: number;
    credits: number;
    items?: string[];
  };
  timeLimit?: number; // in hours
  expiresAt?: Date;
  status: 'active' | 'completed' | 'expired' | 'locked';
  progress: number;
}

export interface Leaderboard {
  type: 'weekly' | 'monthly' | 'allTime';
  category: 'xp' | 'recordings' | 'earnings' | 'achievements';
  entries: Array<{
    rank: number;
    userId: string;
    userName: string;
    avatar?: string;
    score: number;
    change: number; // position change from previous period
  }>;
  userRank?: number;
  totalParticipants: number;
}

export interface Streak {
  type: 'daily' | 'weekly';
  current: number;
  best: number;
  lastUpdate: Date;
  isActive: boolean;
  multiplier: number;
}

export class EnhancedGamificationService {
  private achievements: Map<string, Achievement>;
  private userBadges: Map<string, Badge>;
  private userLevel: UserLevel;
  private activeQuests: Map<string, Quest>;
  private streaks: Map<string, Streak>;
  private leaderboards: Map<string, Leaderboard>;
  private notificationCallbacks: Array<(notification: any) => void> = [];

  constructor() {
    this.achievements = new Map();
    this.userBadges = new Map();
    this.activeQuests = new Map();
    this.streaks = new Map();
    this.leaderboards = new Map();

    this.userLevel = {
      level: 1,
      currentXP: 0,
      requiredXP: 1000,
      title: 'Apprentice Trainer',
      perks: []
    };

    this.initializeGamification();
  }

  private async initializeGamification(): Promise<void> {
    await this.loadUserProgress();
    this.initializeAchievements();
    this.initializeQuests();
    this.initializeStreaks();
    this.initializeLeaderboards();
  }

  private async loadUserProgress(): Promise<void> {
    try {
      const userLevelData = await AsyncStorage.getItem('userLevel');
      const userBadgesData = await AsyncStorage.getItem('userBadges');
      const achievementsData = await AsyncStorage.getItem('achievements');
      const streaksData = await AsyncStorage.getItem('streaks');

      if (userLevelData) {
        this.userLevel = JSON.parse(userLevelData);
      }

      if (userBadgesData) {
        const badges = JSON.parse(userBadgesData);
        badges.forEach((badge: Badge) => {
          this.userBadges.set(badge.id, badge);
        });
      }

      if (achievementsData) {
        const achievements = JSON.parse(achievementsData);
        achievements.forEach((achievement: Achievement) => {
          this.achievements.set(achievement.id, achievement);
        });
      }

      if (streaksData) {
        const streaks = JSON.parse(streaksData);
        streaks.forEach((streak: Streak, key: string) => {
          this.streaks.set(key, streak);
        });
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  }

  private initializeAchievements(): void {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_recording',
        title: 'First Steps',
        description: 'Complete your first hand tracking recording',
        icon: 'play-circle',
        category: 'recording',
        type: 'milestone',
        rarity: 'common',
        requirements: { type: 'recordings', target: 1 },
        rewards: { xp: 100, credits: 50 },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      },
      {
        id: 'recording_streak_7',
        title: 'Consistent Trainer',
        description: 'Record hand movements for 7 consecutive days',
        icon: 'calendar',
        category: 'recording',
        type: 'progress',
        rarity: 'rare',
        requirements: { type: 'daily_streak', target: 7 },
        rewards: { xp: 500, credits: 200, title: 'Dedicated Trainer' },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      },
      {
        id: 'robot_master',
        title: 'Robot Master',
        description: 'Successfully connect and control 5 different robots',
        icon: 'robot',
        category: 'expertise',
        type: 'progress',
        rarity: 'epic',
        requirements: { type: 'robots_connected', target: 5 },
        rewards: { xp: 1000, credits: 500, tokens: 10, badge: 'robot_master' },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      },
      {
        id: 'marketplace_seller',
        title: 'Skill Merchant',
        description: 'Sell your first skill on the marketplace',
        icon: 'storefront',
        category: 'social',
        type: 'milestone',
        rarity: 'rare',
        requirements: { type: 'skills_sold', target: 1 },
        rewards: { xp: 750, credits: 300, title: 'Skill Merchant' },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      },
      {
        id: 'millionaire',
        title: 'Credits Millionaire',
        description: 'Accumulate 1,000,000 credits',
        icon: 'diamond',
        category: 'milestone',
        type: 'milestone',
        rarity: 'legendary',
        requirements: { type: 'total_credits', target: 1000000 },
        rewards: { xp: 5000, credits: 100000, tokens: 50, title: 'Millionaire' },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      },
      {
        id: 'secret_perfectionist',
        title: 'Perfectionist',
        description: 'Complete 100 recordings with 95%+ accuracy',
        icon: 'star',
        category: 'expertise',
        type: 'hidden',
        rarity: 'legendary',
        requirements: { type: 'perfect_recordings', target: 100 },
        rewards: { xp: 2500, credits: 1000, tokens: 25, title: 'Perfectionist' },
        progress: 0,
        isUnlocked: false,
        isSecret: true
      },
      {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Make 50 friends in the community',
        icon: 'people',
        category: 'social',
        type: 'progress',
        rarity: 'rare',
        requirements: { type: 'friends', target: 50 },
        rewards: { xp: 800, credits: 400, badge: 'social_butterfly' },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      },
      {
        id: 'training_hours_100',
        title: 'Centurion',
        description: 'Complete 100 hours of robot training',
        icon: 'time',
        category: 'training',
        type: 'progress',
        rarity: 'epic',
        requirements: { type: 'training_hours', target: 100 },
        rewards: { xp: 1500, credits: 750, title: 'Training Centurion' },
        progress: 0,
        isUnlocked: false,
        isSecret: false
      }
    ];

    defaultAchievements.forEach(achievement => {
      if (!this.achievements.has(achievement.id)) {
        this.achievements.set(achievement.id, achievement);
      }
    });
  }

  private initializeQuests(): void {
    const dailyQuests: Quest[] = [
      {
        id: 'daily_recording',
        title: 'Daily Practice',
        description: 'Complete 3 hand tracking recordings today',
        category: 'daily',
        difficulty: 'easy',
        objectives: [{
          id: 'recordings',
          description: 'Complete recordings',
          target: 3,
          current: 0,
          type: 'recordings'
        }],
        rewards: { xp: 200, credits: 100 },
        timeLimit: 24,
        status: 'active',
        progress: 0
      },
      {
        id: 'weekly_trainer',
        title: 'Weekly Trainer',
        description: 'Train robots for 10 hours this week',
        category: 'weekly',
        difficulty: 'medium',
        objectives: [{
          id: 'training_time',
          description: 'Train for hours',
          target: 10,
          current: 0,
          type: 'training_hours'
        }],
        rewards: { xp: 1000, credits: 500 },
        timeLimit: 168,
        status: 'active',
        progress: 0
      },
      {
        id: 'marketplace_explorer',
        title: 'Marketplace Explorer',
        description: 'Browse and rate 5 skills in the marketplace',
        category: 'social',
        difficulty: 'easy',
        objectives: [{
          id: 'rate_skills',
          description: 'Rate skills',
          target: 5,
          current: 0,
          type: 'skill_ratings'
        }],
        rewards: { xp: 300, credits: 150 },
        timeLimit: 72,
        status: 'active',
        progress: 0
      }
    ];

    dailyQuests.forEach(quest => {
      this.activeQuests.set(quest.id, quest);
    });
  }

  private initializeStreaks(): void {
    if (!this.streaks.has('daily_login')) {
      this.streaks.set('daily_login', {
        type: 'daily',
        current: 0,
        best: 0,
        lastUpdate: new Date(),
        isActive: false,
        multiplier: 1.0
      });
    }

    if (!this.streaks.has('daily_recording')) {
      this.streaks.set('daily_recording', {
        type: 'daily',
        current: 0,
        best: 0,
        lastUpdate: new Date(),
        isActive: false,
        multiplier: 1.0
      });
    }
  }

  private initializeLeaderboards(): void {
    // Sample leaderboard data
    const weeklyXPLeaderboard: Leaderboard = {
      type: 'weekly',
      category: 'xp',
      entries: [
        { rank: 1, userId: 'user_001', userName: 'RoboMaster', score: 15420, change: 2 },
        { rank: 2, userId: 'user_002', userName: 'TechWiz', score: 14870, change: -1 },
        { rank: 3, userId: 'user_003', userName: 'AITrainer', score: 13950, change: 1 },
        { rank: 4, userId: 'user_004', userName: 'CodeNinja', score: 12340, change: 0 },
        { rank: 5, userId: 'current_user', userName: 'You', score: 11890, change: 3 }
      ],
      userRank: 5,
      totalParticipants: 1547
    };

    this.leaderboards.set('weekly_xp', weeklyXPLeaderboard);
  }

  async addXP(amount: number, reason: string = 'General activity'): Promise<boolean> {
    const oldLevel = this.userLevel.level;
    this.userLevel.currentXP += amount;

    let leveledUp = false;
    while (this.userLevel.currentXP >= this.userLevel.requiredXP) {
      this.userLevel.currentXP -= this.userLevel.requiredXP;
      this.userLevel.level++;
      this.userLevel.requiredXP = this.calculateRequiredXP(this.userLevel.level);
      this.userLevel.title = this.getLevelTitle(this.userLevel.level);
      this.userLevel.perks = this.getLevelPerks(this.userLevel.level);
      leveledUp = true;
    }

    if (leveledUp) {
      await this.triggerLevelUpNotification(oldLevel, this.userLevel.level);
      HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Heavy);
    }

    await this.saveUserProgress();
    this.checkAchievements('xp_gained', amount);

    return leveledUp;
  }

  private calculateRequiredXP(level: number): number {
    return Math.floor(1000 * Math.pow(1.15, level - 1));
  }

  private getLevelTitle(level: number): string {
    if (level < 5) return 'Apprentice Trainer';
    if (level < 10) return 'Skilled Trainer';
    if (level < 15) return 'Expert Trainer';
    if (level < 20) return 'Master Trainer';
    if (level < 30) return 'Robot Whisperer';
    if (level < 40) return 'AI Specialist';
    if (level < 50) return 'Automation Legend';
    return 'Grandmaster';
  }

  private getLevelPerks(level: number): string[] {
    const perks: string[] = [];

    if (level >= 5) perks.push('+10% XP Bonus');
    if (level >= 10) perks.push('Exclusive Marketplace Access');
    if (level >= 15) perks.push('+20% Credit Earnings');
    if (level >= 20) perks.push('Beta Features Access');
    if (level >= 25) perks.push('Custom Robot Skins');
    if (level >= 30) perks.push('Priority Support');
    if (level >= 40) perks.push('Advanced Analytics');
    if (level >= 50) perks.push('VIP Status');

    return perks;
  }

  async recordActivity(type: string, value: number = 1, metadata?: any): Promise<void> {
    // Update streaks
    await this.updateStreaks(type);

    // Update quest progress
    this.updateQuestProgress(type, value);

    // Check achievements
    this.checkAchievements(type, value, metadata);

    // Award XP based on activity
    const xpReward = this.calculateActivityXP(type, value);
    if (xpReward > 0) {
      await this.addXP(xpReward, `${type} activity`);
    }

    await this.saveUserProgress();
  }

  private async updateStreaks(activityType: string): Promise<void> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (activityType === 'login' || activityType === 'app_open') {
      const loginStreak = this.streaks.get('daily_login');
      if (loginStreak) {
        const lastUpdate = new Date(loginStreak.lastUpdate);
        const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
        const daysDiff = Math.floor((today.getTime() - lastUpdateDay.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day
          loginStreak.current++;
          loginStreak.best = Math.max(loginStreak.best, loginStreak.current);
          loginStreak.isActive = true;
        } else if (daysDiff > 1) {
          // Streak broken
          loginStreak.current = 1;
          loginStreak.isActive = false;
        }
        // Same day - no change

        loginStreak.lastUpdate = now;
        loginStreak.multiplier = Math.min(2.0, 1.0 + (loginStreak.current * 0.1));
      }
    }

    if (activityType === 'recording') {
      const recordingStreak = this.streaks.get('daily_recording');
      if (recordingStreak) {
        const lastUpdate = new Date(recordingStreak.lastUpdate);
        const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
        const daysDiff = Math.floor((today.getTime() - lastUpdateDay.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 1) {
          if (daysDiff === 1) {
            recordingStreak.current++;
            recordingStreak.best = Math.max(recordingStreak.best, recordingStreak.current);
          } else {
            recordingStreak.current = 1;
          }
          recordingStreak.lastUpdate = now;
          recordingStreak.isActive = true;
          recordingStreak.multiplier = Math.min(2.0, 1.0 + (recordingStreak.current * 0.05));
        }
      }
    }
  }

  private updateQuestProgress(activityType: string, value: number): void {
    this.activeQuests.forEach(quest => {
      quest.objectives.forEach(objective => {
        if (objective.type === activityType) {
          objective.current = Math.min(objective.target, objective.current + value);

          // Update quest progress
          const totalProgress = quest.objectives.reduce((sum, obj) => {
            return sum + (obj.current / obj.target);
          }, 0);
          quest.progress = Math.min(100, (totalProgress / quest.objectives.length) * 100);

          // Check if quest is completed
          if (quest.progress >= 100 && quest.status === 'active') {
            quest.status = 'completed';
            this.completeQuest(quest.id);
          }
        }
      });
    });
  }

  private async completeQuest(questId: string): Promise<void> {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;

    // Award rewards
    await this.addXP(quest.rewards.xp, `Quest: ${quest.title}`);

    // Add credits (would normally update wallet)
    console.log(`Quest completed: ${quest.title} - Awarded ${quest.rewards.xp} XP and ${quest.rewards.credits} credits`);

    // Trigger notification
    this.triggerNotification({
      type: 'quest_completed',
      title: 'Quest Completed!',
      message: `You completed "${quest.title}"`,
      rewards: quest.rewards,
      questId
    });

    HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Medium);
  }

  private checkAchievements(activityType: string, value: number, metadata?: any): void {
    this.achievements.forEach(achievement => {
      if (achievement.isUnlocked) return;

      let shouldUpdate = false;
      let currentProgress = achievement.requirements.current || 0;

      // Update progress based on activity type
      switch (achievement.requirements.type) {
        case 'recordings':
          if (activityType === 'recording') {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
        case 'daily_streak':
          if (activityType === 'recording') {
            const streak = this.streaks.get('daily_recording');
            currentProgress = streak?.current || 0;
            shouldUpdate = true;
          }
          break;
        case 'robots_connected':
          if (activityType === 'robot_connected') {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
        case 'skills_sold':
          if (activityType === 'skill_sold') {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
        case 'total_credits':
          if (activityType === 'credits_earned') {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
        case 'perfect_recordings':
          if (activityType === 'recording' && metadata?.accuracy >= 95) {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
        case 'friends':
          if (activityType === 'friend_added') {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
        case 'training_hours':
          if (activityType === 'training_session') {
            currentProgress += value;
            shouldUpdate = true;
          }
          break;
      }

      if (shouldUpdate) {
        achievement.requirements.current = currentProgress;
        achievement.progress = Math.min(100, (currentProgress / achievement.requirements.target) * 100);

        // Check if achievement is unlocked
        if (currentProgress >= achievement.requirements.target && !achievement.isUnlocked) {
          this.unlockAchievement(achievement.id);
        }
      }
    });
  }

  private async unlockAchievement(achievementId: string): Promise<void> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.isUnlocked) return;

    achievement.isUnlocked = true;
    achievement.unlockedAt = new Date();
    achievement.progress = 100;

    // Award rewards
    await this.addXP(achievement.rewards.xp, `Achievement: ${achievement.title}`);

    // Add badge if specified
    if (achievement.rewards.badge) {
      await this.awardBadge(achievement.rewards.badge, achievement.title);
    }

    // Trigger notification
    this.triggerNotification({
      type: 'achievement_unlocked',
      title: 'Achievement Unlocked!',
      message: achievement.title,
      description: achievement.description,
      achievement: achievement,
      rarity: achievement.rarity
    });

    console.log(`Achievement unlocked: ${achievement.title}`);
    HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Heavy);

    await this.saveUserProgress();
  }

  private async awardBadge(badgeId: string, achievementTitle: string): Promise<void> {
    const badge: Badge = {
      id: badgeId,
      name: achievementTitle,
      description: `Earned for: ${achievementTitle}`,
      icon: 'award',
      color: '#FFD700',
      unlockedAt: new Date(),
      rarity: 'rare'
    };

    this.userBadges.set(badgeId, badge);
  }

  private calculateActivityXP(activityType: string, value: number): number {
    const baseXP: { [key: string]: number } = {
      'recording': 50,
      'training_session': 100,
      'skill_purchased': 25,
      'skill_sold': 200,
      'robot_connected': 150,
      'friend_added': 75,
      'quest_completed': 0, // XP handled separately
      'achievement_unlocked': 0, // XP handled separately
      'login': 10
    };

    const multiplier = this.getStreakMultiplier(activityType);
    return Math.floor((baseXP[activityType] || 0) * value * multiplier);
  }

  private getStreakMultiplier(activityType: string): number {
    if (activityType === 'recording') {
      const streak = this.streaks.get('daily_recording');
      return streak?.multiplier || 1.0;
    }

    const loginStreak = this.streaks.get('daily_login');
    return loginStreak?.multiplier || 1.0;
  }

  private async triggerLevelUpNotification(oldLevel: number, newLevel: number): Promise<void> {
    this.triggerNotification({
      type: 'level_up',
      title: 'Level Up!',
      message: `You reached level ${newLevel}!`,
      oldLevel,
      newLevel,
      newTitle: this.userLevel.title,
      newPerks: this.userLevel.perks
    });
  }

  private triggerNotification(notification: any): void {
    this.notificationCallbacks.forEach(callback => callback(notification));
  }

  public onNotification(callback: (notification: any) => void): () => void {
    this.notificationCallbacks.push(callback);
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  private async saveUserProgress(): Promise<void> {
    try {
      await AsyncStorage.setItem('userLevel', JSON.stringify(this.userLevel));
      await AsyncStorage.setItem('userBadges', JSON.stringify(Array.from(this.userBadges.values())));
      await AsyncStorage.setItem('achievements', JSON.stringify(Array.from(this.achievements.values())));
      await AsyncStorage.setItem('streaks', JSON.stringify(Array.from(this.streaks.entries())));
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  // Public API methods
  getUserLevel(): UserLevel {
    return { ...this.userLevel };
  }

  getAchievements(filter?: { category?: string; unlocked?: boolean }): Achievement[] {
    let achievements = Array.from(this.achievements.values());

    if (filter) {
      if (filter.category) {
        achievements = achievements.filter(a => a.category === filter.category);
      }
      if (filter.unlocked !== undefined) {
        achievements = achievements.filter(a => a.isUnlocked === filter.unlocked);
      }
    }

    // Hide secret achievements that aren't unlocked
    achievements = achievements.filter(a => !a.isSecret || a.isUnlocked);

    return achievements;
  }

  getBadges(): Badge[] {
    return Array.from(this.userBadges.values());
  }

  getActiveQuests(): Quest[] {
    return Array.from(this.activeQuests.values()).filter(q => q.status === 'active');
  }

  getCompletedQuests(): Quest[] {
    return Array.from(this.activeQuests.values()).filter(q => q.status === 'completed');
  }

  getStreaks(): { [key: string]: Streak } {
    return Object.fromEntries(this.streaks.entries());
  }

  getLeaderboard(type: string): Leaderboard | undefined {
    return this.leaderboards.get(type);
  }

  getAchievementProgress(achievementId: string): number {
    const achievement = this.achievements.get(achievementId);
    return achievement?.progress || 0;
  }

  getUnlockedAchievements(): Achievement[] {
    return this.getAchievements({ unlocked: true });
  }

  getTotalAchievements(): number {
    return this.achievements.size;
  }

  getUnlockedCount(): number {
    return Array.from(this.achievements.values()).filter(a => a.isUnlocked).length;
  }

  async simulateActivity(type: string, count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.recordActivity(type, 1, { accuracy: 90 + Math.random() * 10 });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
  }

  async cleanup(): Promise<void> {
    await this.saveUserProgress();
    this.notificationCallbacks = [];
  }
}

export const enhancedGamificationService = new EnhancedGamificationService();
export default enhancedGamificationService;