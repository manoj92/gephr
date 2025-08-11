import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'recording' | 'robot' | 'marketplace' | 'social' | 'milestone';
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  requirements: AchievementRequirement[];
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface AchievementRequirement {
  type: 'recording_count' | 'recording_time' | 'robot_connections' | 'skills_created' | 'skills_purchased' | 'days_active' | 'level_reached';
  value: number;
  description: string;
}

export interface UserLevel {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  title: string;
  perks: string[];
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  category: 'recording' | 'robot' | 'marketplace' | 'social';
  requirements: ChallengeRequirement[];
  rewards: ChallengeReward[];
  startDate: Date;
  endDate: Date;
  progress: number;
  maxProgress: number;
  completed: boolean;
  completedAt?: Date;
}

export interface ChallengeRequirement {
  type: string;
  target: number;
  description: string;
}

export interface ChallengeReward {
  type: 'xp' | 'coins' | 'achievement' | 'badge';
  value: number | string;
  description: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: Date;
}

export interface Leaderboard {
  id: string;
  name: string;
  type: 'global' | 'friends' | 'local';
  metric: 'xp' | 'recordings' | 'skills_created' | 'robot_mastery';
  entries: LeaderboardEntry[];
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  value: number;
  rank: number;
  change?: number; // Position change from last period
}

export interface GamificationStats {
  level: UserLevel;
  totalXP: number;
  achievements: Achievement[];
  badges: Badge[];
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  streaks: {
    current: number;
    longest: number;
    lastActiveDate: Date;
  };
  coins: number;
  reputation: number;
}

export class GamificationService {
  private stats: GamificationStats;
  private achievements: Achievement[] = [];
  private challenges: Challenge[] = [];
  private badges: Badge[] = [];
  
  private readonly STORAGE_KEYS = {
    STATS: 'gamification_stats',
    ACHIEVEMENTS: 'gamification_achievements',
    CHALLENGES: 'gamification_challenges',
    BADGES: 'gamification_badges',
  };

  private readonly XP_TABLE = [
    0, 100, 250, 500, 1000, 1750, 2750, 4250, 6500, 9750, 14250,
    20250, 28000, 38000, 50000, 65000, 83000, 105000, 131000, 161000, 195000
  ];

  private readonly LEVEL_TITLES = [
    'Novice', 'Apprentice', 'Trainee', 'Operator', 'Specialist', 'Expert',
    'Advanced', 'Professional', 'Master', 'Veteran', 'Elite', 'Champion',
    'Legend', 'Grandmaster', 'Sage', 'Oracle', 'Titan', 'Mythic', 'Divine', 'Transcendent'
  ];

  constructor() {
    this.stats = {
      level: {
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
        totalXP: 0,
        title: 'Novice',
        perks: [],
      },
      totalXP: 0,
      achievements: [],
      badges: [],
      activeChallenges: [],
      completedChallenges: [],
      streaks: {
        current: 0,
        longest: 0,
        lastActiveDate: new Date(),
      },
      coins: 0,
      reputation: 0,
    };

    this.initializeAchievements();
    this.initializeChallenges();
    this.initializeBadges();
  }

  async initialize(userId: string): Promise<void> {
    try {
      await this.loadGamificationData();
      await this.updateDailyChallenges();
      await this.updateStreak();
      console.log('Gamification service initialized');
    } catch (error) {
      console.error('Gamification initialization error:', error);
      throw error;
    }
  }

  async awardXP(amount: number, source: string): Promise<{ levelUp: boolean; newLevel?: UserLevel }> {
    const oldLevel = this.stats.level.level;
    
    this.stats.totalXP += amount;
    this.stats.level.totalXP = this.stats.totalXP;
    
    // Calculate new level
    const newLevel = this.calculateLevel(this.stats.totalXP);
    const levelUp = newLevel.level > oldLevel;
    
    if (levelUp) {
      this.stats.level = newLevel;
      await this.handleLevelUp(newLevel);
    } else {
      this.stats.level.currentXP = this.stats.totalXP - this.XP_TABLE[newLevel.level - 1];
      this.stats.level.xpToNextLevel = this.XP_TABLE[newLevel.level] - this.stats.totalXP;
    }

    await this.saveGamificationData();
    
    console.log(`Awarded ${amount} XP from ${source}`);
    
    return {
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
    };
  }

  async completeRecording(duration: number, handGestures: number, quality: 'low' | 'medium' | 'high'): Promise<void> {
    // Base XP calculation
    let xp = Math.floor(duration / 1000) * 2; // 2 XP per second
    xp += handGestures * 5; // 5 XP per gesture
    
    // Quality multiplier
    const multipliers = { low: 1, medium: 1.2, high: 1.5 };
    xp = Math.floor(xp * multipliers[quality]);
    
    await this.awardXP(xp, 'recording');
    
    // Check achievements
    await this.checkAchievements('recording', {
      count: 1,
      duration,
      handGestures,
      quality,
    });
    
    // Update challenges
    await this.updateChallengeProgress('complete_recording', 1);
    await this.updateChallengeProgress('recording_time', duration);
  }

  async connectRobot(robotType: string, connectionTime: number): Promise<void> {
    const xp = Math.max(50, Math.floor(150 - connectionTime / 100)); // Faster connection = more XP
    await this.awardXP(xp, 'robot_connection');
    
    await this.checkAchievements('robot', {
      robotType,
      connectionTime,
    });
    
    await this.updateChallengeProgress('connect_robot', 1);
  }

  async createSkill(skillName: string, category: string, trainingTime: number): Promise<void> {
    const xp = 200 + Math.floor(trainingTime / 60000) * 10; // Base + time bonus
    await this.awardXP(xp, 'skill_creation');
    
    await this.checkAchievements('skill_creation', {
      skillName,
      category,
      trainingTime,
    });
    
    await this.updateChallengeProgress('create_skill', 1);
  }

  async purchaseSkill(skillPrice: number): Promise<void> {
    const xp = Math.floor(skillPrice / 10); // XP based on skill value
    await this.awardXP(xp, 'skill_purchase');
    
    this.stats.coins -= skillPrice;
    
    await this.checkAchievements('skill_purchase', {
      price: skillPrice,
    });
    
    await this.updateChallengeProgress('purchase_skill', 1);
  }

  private async handleLevelUp(newLevel: UserLevel): Promise<void> {
    // Award coins for level up
    this.stats.coins += newLevel.level * 10;
    
    // Check for level-based achievements
    await this.checkAchievements('level', {
      level: newLevel.level,
    });
    
    console.log(`Level up! New level: ${newLevel.level} (${newLevel.title})`);
  }

  private calculateLevel(totalXP: number): UserLevel {
    let level = 1;
    
    // Find the highest level achievable with current XP
    for (let i = 1; i < this.XP_TABLE.length; i++) {
      if (totalXP >= this.XP_TABLE[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    
    const currentLevelXP = this.XP_TABLE[level - 1];
    const nextLevelXP = level < this.XP_TABLE.length ? this.XP_TABLE[level] : this.XP_TABLE[this.XP_TABLE.length - 1];
    
    return {
      level,
      currentXP: totalXP - currentLevelXP,
      xpToNextLevel: nextLevelXP - totalXP,
      totalXP,
      title: this.LEVEL_TITLES[level - 1] || 'Master',
      perks: this.getLevelPerks(level),
    };
  }

  private getLevelPerks(level: number): string[] {
    const perks: string[] = [];
    
    if (level >= 5) perks.push('Unlock Pro Recording Features');
    if (level >= 10) perks.push('Access to Advanced Robot Controls');
    if (level >= 15) perks.push('Marketplace Seller Privileges');
    if (level >= 20) perks.push('Beta Feature Access');
    
    return perks;
  }

  private async checkAchievements(category: string, data: any): Promise<void> {
    const unlockedAchievements: Achievement[] = [];
    
    for (const achievement of this.achievements) {
      if (achievement.unlockedAt || achievement.category !== category) continue;
      
      let requirementsMet = true;
      
      for (const req of achievement.requirements) {
        if (!this.checkAchievementRequirement(req, data)) {
          requirementsMet = false;
          break;
        }
      }
      
      if (requirementsMet) {
        achievement.unlockedAt = new Date();
        achievement.progress = achievement.maxProgress || 1;
        
        await this.awardXP(achievement.xpReward, 'achievement');
        unlockedAchievements.push(achievement);
        
        console.log(`Achievement unlocked: ${achievement.name}`);
      }
    }
    
    if (unlockedAchievements.length > 0) {
      this.stats.achievements.push(...unlockedAchievements);
      await this.saveGamificationData();
    }
  }

  private checkAchievementRequirement(req: AchievementRequirement, data: any): boolean {
    switch (req.type) {
      case 'recording_count':
        return this.getTotalStat('recordings') >= req.value;
      case 'recording_time':
        return this.getTotalStat('recordingTime') >= req.value;
      case 'robot_connections':
        return this.getTotalStat('robotConnections') >= req.value;
      case 'skills_created':
        return this.getTotalStat('skillsCreated') >= req.value;
      case 'skills_purchased':
        return this.getTotalStat('skillsPurchased') >= req.value;
      case 'level_reached':
        return this.stats.level.level >= req.value;
      case 'days_active':
        return this.getTotalStat('daysActive') >= req.value;
      default:
        return false;
    }
  }

  private getTotalStat(statName: string): number {
    // This would integrate with analytics service to get actual stats
    // For now, return mock values
    const mockStats = {
      recordings: 50,
      recordingTime: 180000, // 3 hours
      robotConnections: 5,
      skillsCreated: 3,
      skillsPurchased: 8,
      daysActive: 15,
    };
    
    return mockStats[statName as keyof typeof mockStats] || 0;
  }

  private async updateChallengeProgress(challengeType: string, progress: number): Promise<void> {
    const updated: Challenge[] = [];
    
    for (const challenge of this.stats.activeChallenges) {
      if (challenge.completed) continue;
      
      const requirement = challenge.requirements.find(r => r.type === challengeType);
      if (requirement) {
        challenge.progress = Math.min(challenge.progress + progress, challenge.maxProgress);
        
        if (challenge.progress >= challenge.maxProgress) {
          challenge.completed = true;
          challenge.completedAt = new Date();
          
          // Award rewards
          for (const reward of challenge.rewards) {
            await this.awardChallengeReward(reward);
          }
          
          updated.push(challenge);
          console.log(`Challenge completed: ${challenge.name}`);
        }
      }
    }
    
    if (updated.length > 0) {
      // Move completed challenges
      this.stats.completedChallenges.push(...updated);
      this.stats.activeChallenges = this.stats.activeChallenges.filter(c => !c.completed);
      
      await this.saveGamificationData();
    }
  }

  private async awardChallengeReward(reward: ChallengeReward): Promise<void> {
    switch (reward.type) {
      case 'xp':
        await this.awardXP(reward.value as number, 'challenge');
        break;
      case 'coins':
        this.stats.coins += reward.value as number;
        break;
      case 'achievement':
        // Award specific achievement
        break;
      case 'badge':
        await this.awardBadge(reward.value as string);
        break;
    }
  }

  private async awardBadge(badgeId: string): Promise<void> {
    const badge = this.badges.find(b => b.id === badgeId);
    if (badge && !badge.earnedAt) {
      badge.earnedAt = new Date();
      this.stats.badges.push(badge);
      console.log(`Badge earned: ${badge.name}`);
    }
  }

  private async updateStreak(): Promise<void> {
    const today = new Date().toDateString();
    const lastActive = this.stats.streaks.lastActiveDate.toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (today === lastActive) {
      // Already counted today
      return;
    } else if (lastActive === yesterday) {
      // Continue streak
      this.stats.streaks.current++;
      this.stats.streaks.longest = Math.max(this.stats.streaks.longest, this.stats.streaks.current);
    } else {
      // Streak broken
      this.stats.streaks.current = 1;
    }
    
    this.stats.streaks.lastActiveDate = new Date();
    await this.saveGamificationData();
  }

  private async updateDailyChallenges(): Promise<void> {
    const today = new Date();
    const needsNewDailyChallenges = !this.stats.activeChallenges.some(c => 
      c.type === 'daily' && 
      c.startDate.toDateString() === today.toDateString()
    );
    
    if (needsNewDailyChallenges) {
      await this.generateDailyChallenges();
    }
  }

  private async generateDailyChallenges(): Promise<void> {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const dailyChallenges: Challenge[] = [
      {
        id: `daily_recording_${today.getTime()}`,
        name: 'Daily Training',
        description: 'Complete 3 recording sessions',
        type: 'daily',
        category: 'recording',
        requirements: [{ type: 'complete_recording', target: 3, description: 'Record 3 sessions' }],
        rewards: [
          { type: 'xp', value: 100, description: '100 XP' },
          { type: 'coins', value: 50, description: '50 coins' },
        ],
        startDate: today,
        endDate: tomorrow,
        progress: 0,
        maxProgress: 3,
        completed: false,
      },
      {
        id: `daily_robot_${today.getTime()}`,
        name: 'Robot Master',
        description: 'Connect to a robot',
        type: 'daily',
        category: 'robot',
        requirements: [{ type: 'connect_robot', target: 1, description: 'Connect to any robot' }],
        rewards: [
          { type: 'xp', value: 75, description: '75 XP' },
          { type: 'coins', value: 25, description: '25 coins' },
        ],
        startDate: today,
        endDate: tomorrow,
        progress: 0,
        maxProgress: 1,
        completed: false,
      },
    ];
    
    // Remove old daily challenges
    this.stats.activeChallenges = this.stats.activeChallenges.filter(c => c.type !== 'daily');
    
    // Add new daily challenges
    this.stats.activeChallenges.push(...dailyChallenges);
    
    await this.saveGamificationData();
    console.log('Daily challenges generated');
  }

  private initializeAchievements(): void {
    this.achievements = [
      {
        id: 'first_recording',
        name: 'First Steps',
        description: 'Complete your first recording session',
        category: 'recording',
        icon: 'play',
        rarity: 'common',
        xpReward: 50,
        requirements: [{ type: 'recording_count', value: 1, description: 'Complete 1 recording' }],
        maxProgress: 1,
      },
      {
        id: 'recording_master',
        name: 'Recording Master',
        description: 'Complete 100 recording sessions',
        category: 'recording',
        icon: 'star',
        rarity: 'rare',
        xpReward: 500,
        requirements: [{ type: 'recording_count', value: 100, description: 'Complete 100 recordings' }],
        maxProgress: 100,
      },
      {
        id: 'robot_whisperer',
        name: 'Robot Whisperer',
        description: 'Connect to 5 different robots',
        category: 'robot',
        icon: 'robot',
        rarity: 'rare',
        xpReward: 300,
        requirements: [{ type: 'robot_connections', value: 5, description: 'Connect to 5 robots' }],
        maxProgress: 5,
      },
      {
        id: 'skill_creator',
        name: 'Skill Creator',
        description: 'Create your first skill',
        category: 'marketplace',
        icon: 'create',
        rarity: 'epic',
        xpReward: 200,
        requirements: [{ type: 'skills_created', value: 1, description: 'Create 1 skill' }],
        maxProgress: 1,
      },
      {
        id: 'level_10',
        name: 'Experienced Trainer',
        description: 'Reach level 10',
        category: 'milestone',
        icon: 'trophy',
        rarity: 'epic',
        xpReward: 1000,
        requirements: [{ type: 'level_reached', value: 10, description: 'Reach level 10' }],
        maxProgress: 1,
      },
    ];
  }

  private initializeChallenges(): void {
    // Weekly and special challenges would be initialized here
    this.challenges = [];
  }

  private initializeBadges(): void {
    this.badges = [
      {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Joined during beta phase',
        icon: 'star',
        rarity: 'legendary',
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Achieved 100% accuracy in 10 recordings',
        icon: 'target',
        rarity: 'epic',
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Connected with 50 other trainers',
        icon: 'users',
        rarity: 'rare',
      },
    ];
  }

  async getLeaderboard(type: 'global' | 'friends' | 'local', metric: string): Promise<Leaderboard> {
    // Mock leaderboard data - in real app would fetch from server
    const entries: LeaderboardEntry[] = Array.from({ length: 50 }, (_, i) => ({
      userId: `user_${i}`,
      username: `trainer_${i + 1}`,
      displayName: `Trainer ${i + 1}`,
      value: Math.floor(Math.random() * 10000),
      rank: i + 1,
      change: Math.floor(Math.random() * 10) - 5,
    }));
    
    return {
      id: `${type}_${metric}`,
      name: `${type} ${metric} Leaderboard`,
      type,
      metric: metric as any,
      entries: entries.sort((a, b) => b.value - a.value).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
      lastUpdated: new Date(),
    };
  }

  getStats(): GamificationStats {
    return { ...this.stats };
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter(a => a.unlockedAt);
  }

  getActiveChallenges(): Challenge[] {
    return [...this.stats.activeChallenges];
  }

  getEarnedBadges(): Badge[] {
    return this.badges.filter(b => b.earnedAt);
  }

  private async loadGamificationData(): Promise<void> {
    try {
      const [statsData, achievementsData, challengesData, badgesData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.STATS),
        AsyncStorage.getItem(this.STORAGE_KEYS.ACHIEVEMENTS),
        AsyncStorage.getItem(this.STORAGE_KEYS.CHALLENGES),
        AsyncStorage.getItem(this.STORAGE_KEYS.BADGES),
      ]);

      if (statsData) {
        const parsed = JSON.parse(statsData);
        this.stats = {
          ...this.stats,
          ...parsed,
          streaks: {
            ...this.stats.streaks,
            ...parsed.streaks,
            lastActiveDate: new Date(parsed.streaks?.lastActiveDate || Date.now()),
          },
        };
      }

      if (achievementsData) {
        const parsed = JSON.parse(achievementsData);
        this.achievements = parsed.map((a: any) => ({
          ...a,
          unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
        }));
      }
    } catch (error) {
      console.error('Load gamification data error:', error);
    }
  }

  private async saveGamificationData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.STATS, JSON.stringify(this.stats)),
        AsyncStorage.setItem(this.STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(this.achievements)),
        AsyncStorage.setItem(this.STORAGE_KEYS.CHALLENGES, JSON.stringify(this.challenges)),
        AsyncStorage.setItem(this.STORAGE_KEYS.BADGES, JSON.stringify(this.badges)),
      ]);
    } catch (error) {
      console.error('Save gamification data error:', error);
    }
  }

  async resetProgress(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.STORAGE_KEYS.STATS,
      this.STORAGE_KEYS.ACHIEVEMENTS,
      this.STORAGE_KEYS.CHALLENGES,
      this.STORAGE_KEYS.BADGES,
    ]);
    
    // Reset to initial state
    this.stats = {
      level: {
        level: 1,
        currentXP: 0,
        xpToNextLevel: 100,
        totalXP: 0,
        title: 'Novice',
        perks: [],
      },
      totalXP: 0,
      achievements: [],
      badges: [],
      activeChallenges: [],
      completedChallenges: [],
      streaks: {
        current: 0,
        longest: 0,
        lastActiveDate: new Date(),
      },
      coins: 0,
      reputation: 0,
    };
    
    this.initializeAchievements();
    this.initializeChallenges();
    this.initializeBadges();
    
    console.log('Gamification progress reset');
  }
}

export const gamificationService = new GamificationService();