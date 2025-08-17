import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioService } from './AudioService';
import HapticFeedback from 'react-native-haptic-feedback';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'recording' | 'marketplace' | 'robot' | 'social' | 'milestone' | 'special';
  xpReward: number;
  coinReward: number;
  requirements: AchievementRequirement[];
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  hidden: boolean;
}

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'quality' | 'time' | 'condition';
  metric: string;
  value: number;
  operator: '==' | '>=' | '<=' | '>' | '<';
}

export interface UserStats {
  totalRecordings: number;
  totalRecordingTime: number;
  averageAccuracy: number;
  robotsConnected: number;
  skillsUploadedCoins: number;
  skillsPurchased: number;
  achievementsUnlocked: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  currentLevel: number;
  joinDate: Date;
  lastActiveDate: Date;
}

class AchievementService {
  private achievements: Map<string, Achievement> = new Map();
  private userStats: UserStats = {
    totalRecordings: 0,
    totalRecordingTime: 0,
    averageAccuracy: 0,
    robotsConnected: 0,
    skillsUploadedCoins: 0,
    skillsPurchased: 0,
    achievementsUnlocked: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalXP: 0,
    currentLevel: 1,
    joinDate: new Date(),
    lastActiveDate: new Date(),
  };

  private observers: Array<(achievement: Achievement) => void> = [];

  constructor() {
    this.initializeAchievements();
    this.loadUserData();
  }

  private initializeAchievements(): void {
    const achievementData: Omit<Achievement, 'unlocked' | 'progress' | 'unlockedAt'>[] = [
      // Recording Achievements
      {
        id: 'first_recording',
        title: 'First Steps',
        description: 'Complete your first hand tracking recording',
        icon: 'play-circle',
        color: '#10B981',
        rarity: 'common',
        category: 'recording',
        xpReward: 100,
        coinReward: 10,
        requirements: [{ type: 'count', metric: 'totalRecordings', value: 1, operator: '>=' }],
        maxProgress: 1,
        hidden: false,
      },
      {
        id: 'recording_streak_7',
        title: 'Week Warrior',
        description: 'Record hand movements for 7 consecutive days',
        icon: 'flame',
        color: '#F59E0B',
        rarity: 'rare',
        category: 'recording',
        xpReward: 500,
        coinReward: 50,
        requirements: [{ type: 'streak', metric: 'currentStreak', value: 7, operator: '>=' }],
        maxProgress: 7,
        hidden: false,
      },
      {
        id: 'precision_master',
        title: 'Precision Master',
        description: 'Achieve 95% accuracy in hand tracking',
        icon: 'target',
        color: '#EF4444',
        rarity: 'epic',
        category: 'recording',
        xpReward: 1000,
        coinReward: 100,
        requirements: [{ type: 'quality', metric: 'averageAccuracy', value: 95, operator: '>=' }],
        maxProgress: 100,
        hidden: false,
      },
      {
        id: 'marathon_recorder',
        title: 'Marathon Recorder',
        description: 'Record for 10 hours total',
        icon: 'timer',
        color: '#8B5CF6',
        rarity: 'epic',
        category: 'recording',
        xpReward: 1500,
        coinReward: 150,
        requirements: [{ type: 'time', metric: 'totalRecordingTime', value: 36000000, operator: '>=' }], // 10 hours in ms
        maxProgress: 36000000,
        hidden: false,
      },

      // Robot Achievements
      {
        id: 'robot_whisperer',
        title: 'Robot Whisperer',
        description: 'Connect to your first robot',
        icon: 'hardware-chip',
        color: '#06B6D4',
        rarity: 'common',
        category: 'robot',
        xpReward: 200,
        coinReward: 20,
        requirements: [{ type: 'count', metric: 'robotsConnected', value: 1, operator: '>=' }],
        maxProgress: 1,
        hidden: false,
      },
      {
        id: 'robot_collector',
        title: 'Robot Collector',
        description: 'Connect to 5 different robots',
        icon: 'infinite',
        color: '#F97316',
        rarity: 'rare',
        category: 'robot',
        xpReward: 800,
        coinReward: 80,
        requirements: [{ type: 'count', metric: 'robotsConnected', value: 5, operator: '>=' }],
        maxProgress: 5,
        hidden: false,
      },

      // Marketplace Achievements
      {
        id: 'entrepreneur',
        title: 'Entrepreneur',
        description: 'Upload your first skill to the marketplace',
        icon: 'storefront',
        color: '#84CC16',
        rarity: 'common',
        category: 'marketplace',
        xpReward: 300,
        coinReward: 30,
        requirements: [{ type: 'count', metric: 'skillsUploaded', value: 1, operator: '>=' }],
        maxProgress: 1,
        hidden: false,
      },
      {
        id: 'big_spender',
        title: 'Big Spender',
        description: 'Purchase 10 skills from the marketplace',
        icon: 'card',
        color: '#EC4899',
        rarity: 'rare',
        category: 'marketplace',
        xpReward: 600,
        coinReward: 60,
        requirements: [{ type: 'count', metric: 'skillsPurchased', value: 10, operator: '>=' }],
        maxProgress: 10,
        hidden: false,
      },

      // Milestone Achievements
      {
        id: 'level_10',
        title: 'Rising Star',
        description: 'Reach level 10',
        icon: 'star',
        color: '#FFD700',
        rarity: 'rare',
        category: 'milestone',
        xpReward: 1000,
        coinReward: 100,
        requirements: [{ type: 'count', metric: 'currentLevel', value: 10, operator: '>=' }],
        maxProgress: 10,
        hidden: false,
      },
      {
        id: 'level_25',
        title: 'Expert Trainer',
        description: 'Reach level 25',
        icon: 'trophy',
        color: '#FF6B35',
        rarity: 'epic',
        category: 'milestone',
        xpReward: 2500,
        coinReward: 250,
        requirements: [{ type: 'count', metric: 'currentLevel', value: 25, operator: '>=' }],
        maxProgress: 25,
        hidden: false,
      },
      {
        id: 'legend',
        title: 'Legend',
        description: 'Reach level 50',
        icon: 'medal',
        color: '#9333EA',
        rarity: 'legendary',
        category: 'milestone',
        xpReward: 5000,
        coinReward: 500,
        requirements: [{ type: 'count', metric: 'currentLevel', value: 50, operator: '>=' }],
        maxProgress: 50,
        hidden: false,
      },

      // Special Achievements
      {
        id: 'early_adopter',
        title: 'Early Adopter',
        description: 'Be among the first 1000 users',
        icon: 'rocket',
        color: '#DC2626',
        rarity: 'legendary',
        category: 'special',
        xpReward: 10000,
        coinReward: 1000,
        requirements: [{ type: 'condition', metric: 'userId', value: 1000, operator: '<=' }],
        maxProgress: 1,
        hidden: true,
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Complete 100 recordings with 100% accuracy',
        icon: 'checkmark-circle',
        color: '#059669',
        rarity: 'legendary',
        category: 'recording',
        xpReward: 15000,
        coinReward: 1500,
        requirements: [
          { type: 'count', metric: 'perfectRecordings', value: 100, operator: '>=' }
        ],
        maxProgress: 100,
        hidden: true,
      },
    ];

    // Initialize achievements
    achievementData.forEach(data => {
      this.achievements.set(data.id, {
        ...data,
        unlocked: false,
        progress: 0,
      });
    });
  }

  private async loadUserData(): Promise<void> {
    try {
      const [statsData, achievementsData] = await Promise.all([
        AsyncStorage.getItem('userStats'),
        AsyncStorage.getItem('userAchievements'),
      ]);

      if (statsData) {
        const parsed = JSON.parse(statsData);
        this.userStats = {
          ...this.userStats,
          ...parsed,
          joinDate: new Date(parsed.joinDate),
          lastActiveDate: new Date(parsed.lastActiveDate),
        };
      }

      if (achievementsData) {
        const parsed = JSON.parse(achievementsData);
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          const achievement = this.achievements.get(id);
          if (achievement) {
            achievement.unlocked = data.unlocked;
            achievement.progress = data.progress;
            if (data.unlockedAt) {
              achievement.unlockedAt = new Date(data.unlockedAt);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  private async saveUserData(): Promise<void> {
    try {
      const achievementsData: any = {};
      this.achievements.forEach((achievement, id) => {
        achievementsData[id] = {
          unlocked: achievement.unlocked,
          progress: achievement.progress,
          unlockedAt: achievement.unlockedAt?.toISOString(),
        };
      });

      await Promise.all([
        AsyncStorage.setItem('userStats', JSON.stringify(this.userStats)),
        AsyncStorage.setItem('userAchievements', JSON.stringify(achievementsData)),
      ]);
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  }

  async updateStat(metric: keyof UserStats, value: number): Promise<Achievement[]> {
    const oldValue = this.userStats[metric] as number;
    (this.userStats as any)[metric] = value;
    this.userStats.lastActiveDate = new Date();

    // Check for level ups
    if (metric === 'totalXP') {
      const newLevel = this.calculateLevel(value);
      if (newLevel > this.userStats.currentLevel) {
        this.userStats.currentLevel = newLevel;
        await audioService.playLevelUp();
        HapticFeedback.trigger('notificationSuccess');
      }
    }

    const newAchievements = await this.checkAchievements();
    await this.saveUserData();

    return newAchievements;
  }

  async incrementStat(metric: keyof UserStats, increment: number = 1): Promise<Achievement[]> {
    const currentValue = this.userStats[metric] as number;
    return this.updateStat(metric, currentValue + increment);
  }

  private calculateLevel(xp: number): number {
    // Level progression: level = sqrt(xp / 1000) + 1
    return Math.floor(Math.sqrt(xp / 1000)) + 1;
  }

  private async checkAchievements(): Promise<Achievement[]> {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements.values()) {
      if (achievement.unlocked) continue;

      // Calculate progress
      let currentProgress = 0;
      let allRequirementsMet = true;

      for (const requirement of achievement.requirements) {
        const statValue = this.getStatValue(requirement.metric);
        const requirementMet = this.evaluateRequirement(statValue, requirement);

        if (!requirementMet) {
          allRequirementsMet = false;
        }

        // Update progress based on the primary requirement
        if (achievement.requirements.length === 1 || requirement.type === 'count') {
          currentProgress = Math.min(statValue, requirement.value);
        }
      }

      achievement.progress = currentProgress;

      // Unlock achievement if all requirements are met
      if (allRequirementsMet && !achievement.unlocked) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        
        // Award XP and coins
        await this.updateStat('totalXP', this.userStats.totalXP + achievement.xpReward);
        await this.incrementStat('achievementsUnlocked');

        // Play unlock effects
        await audioService.playAchievementUnlock();
        HapticFeedback.trigger('notificationSuccess');

        newlyUnlocked.push(achievement);

        // Notify observers
        this.notifyObservers(achievement);
      }
    }

    return newlyUnlocked;
  }

  private getStatValue(metric: string): number {
    return (this.userStats as any)[metric] || 0;
  }

  private evaluateRequirement(value: number, requirement: AchievementRequirement): boolean {
    switch (requirement.operator) {
      case '==':
        return value === requirement.value;
      case '>=':
        return value >= requirement.value;
      case '<=':
        return value <= requirement.value;
      case '>':
        return value > requirement.value;
      case '<':
        return value < requirement.value;
      default:
        return false;
    }
  }

  getAchievements(category?: Achievement['category']): Achievement[] {
    const achievements = Array.from(this.achievements.values());
    
    if (category) {
      return achievements.filter(a => a.category === category);
    }
    
    return achievements.filter(a => !a.hidden || a.unlocked);
  }

  getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  getUserStats(): UserStats {
    return { ...this.userStats };
  }

  getProgressToNextLevel(): { current: number; required: number; percentage: number } {
    const currentLevelXP = Math.pow(this.userStats.currentLevel - 1, 2) * 1000;
    const nextLevelXP = Math.pow(this.userStats.currentLevel, 2) * 1000;
    const currentProgress = this.userStats.totalXP - currentLevelXP;
    const requiredProgress = nextLevelXP - currentLevelXP;

    return {
      current: currentProgress,
      required: requiredProgress,
      percentage: (currentProgress / requiredProgress) * 100,
    };
  }

  subscribeToAchievements(callback: (achievement: Achievement) => void): () => void {
    this.observers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(achievement: Achievement): void {
    this.observers.forEach(callback => {
      try {
        callback(achievement);
      } catch (error) {
        console.error('Achievement observer error:', error);
      }
    });
  }

  // Convenience methods for common stat updates
  async recordingCompleted(duration: number, accuracy: number): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    
    achievements.push(...await this.incrementStat('totalRecordings'));
    achievements.push(...await this.incrementStat('totalRecordingTime', duration));
    
    // Update accuracy (rolling average)
    const newAccuracy = (this.userStats.averageAccuracy * (this.userStats.totalRecordings - 1) + accuracy) / this.userStats.totalRecordings;
    achievements.push(...await this.updateStat('averageAccuracy', newAccuracy));
    
    // Award base XP for recording
    const xpGain = Math.floor(50 + (accuracy / 100) * 50 + (duration / 60000) * 10);
    achievements.push(...await this.incrementStat('totalXP', xpGain));

    return [...new Set(achievements)]; // Remove duplicates
  }

  async robotConnected(): Promise<Achievement[]> {
    return this.incrementStat('robotsConnected');
  }

  async skillUploaded(): Promise<Achievement[]> {
    const achievements = await this.incrementStat('skillsUploaded');
    achievements.push(...await this.incrementStat('totalXP', 100));
    return achievements;
  }

  async skillPurchased(): Promise<Achievement[]> {
    return this.incrementStat('skillsPurchased');
  }

  async updateStreak(newStreak: number): Promise<Achievement[]> {
    const achievements = await this.updateStat('currentStreak', newStreak);
    
    if (newStreak > this.userStats.longestStreak) {
      achievements.push(...await this.updateStat('longestStreak', newStreak));
    }
    
    return achievements;
  }

  getRarityColor(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'common':
        return '#10B981';
      case 'rare':
        return '#3B82F6';
      case 'epic':
        return '#8B5CF6';
      case 'legendary':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  }
}

export const achievementService = new AchievementService();