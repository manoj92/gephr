import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkillListing, Purchase, User, RobotType } from '../types';

export class MarketplaceService {
  private readonly STORAGE_KEYS = {
    SKILLS: '@marketplace/skills',
    PURCHASES: '@marketplace/purchases',
    USER_BALANCE: '@marketplace/balance',
    UPLOADED_SKILLS: '@marketplace/uploaded_skills',
  };

  private mockSkills: SkillListing[] = [
    {
      id: 'skill_001',
      title: 'Advanced Pick and Place',
      description: 'High-precision object manipulation with force feedback control. Perfect for assembly line tasks and delicate object handling.',
      robotTypes: ['unitree_g1', 'tesla_bot', 'custom'],
      difficulty: 'intermediate',
      price: 25.99,
      currency: 'USD',
      createdBy: 'user_001',
      createdAt: new Date('2024-01-15'),
      datasetSize: 15.6, // GB
      downloads: 1203,
      rating: 4.8,
      tags: ['manipulation', 'precision', 'assembly', 'industrial'],
      thumbnailUrl: 'https://example.com/thumbnails/pick-place.jpg',
      videoPreviewUrl: 'https://example.com/previews/pick-place.mp4',
    },
    {
      id: 'skill_002',
      title: 'Dynamic Walking Gaits',
      description: 'Adaptive walking patterns for various terrains including stairs, ramps, and uneven surfaces.',
      robotTypes: ['unitree_g1', 'boston_dynamics'],
      difficulty: 'advanced',
      price: 45.00,
      currency: 'USD',
      createdBy: 'user_002',
      createdAt: new Date('2024-01-20'),
      datasetSize: 28.3,
      downloads: 856,
      rating: 4.9,
      tags: ['locomotion', 'terrain', 'adaptive', 'stability'],
      thumbnailUrl: 'https://example.com/thumbnails/walking.jpg',
      videoPreviewUrl: 'https://example.com/previews/walking.mp4',
    },
    {
      id: 'skill_003',
      title: 'Real-time Object Detection',
      description: 'YOLO-based object detection and tracking optimized for mobile robotics applications.',
      robotTypes: ['unitree_g1', 'boston_dynamics', 'tesla_bot', 'custom'],
      difficulty: 'expert',
      price: 35.50,
      currency: 'USD',
      createdBy: 'user_003',
      createdAt: new Date('2024-01-25'),
      datasetSize: 42.1,
      downloads: 934,
      rating: 4.7,
      tags: ['vision', 'detection', 'tracking', 'yolo', 'realtime'],
      thumbnailUrl: 'https://example.com/thumbnails/detection.jpg',
      videoPreviewUrl: 'https://example.com/previews/detection.mp4',
    },
    {
      id: 'skill_004',
      title: 'Expressive Dance Choreography',
      description: 'Fluid, human-like dance movements synchronized to music with emotional expression.',
      robotTypes: ['tesla_bot', 'custom'],
      difficulty: 'intermediate',
      price: 18.99,
      currency: 'USD',
      createdBy: 'user_004',
      createdAt: new Date('2024-02-01'),
      datasetSize: 8.7,
      downloads: 1542,
      rating: 4.6,
      tags: ['entertainment', 'dance', 'expression', 'music', 'performance'],
      thumbnailUrl: 'https://example.com/thumbnails/dance.jpg',
      videoPreviewUrl: 'https://example.com/previews/dance.mp4',
    },
    {
      id: 'skill_005',
      title: 'Household Cleaning Suite',
      description: 'Complete cleaning behaviors including vacuuming, dusting, and surface wiping with obstacle avoidance.',
      robotTypes: ['tesla_bot', 'custom'],
      difficulty: 'beginner',
      price: 29.99,
      currency: 'USD',
      createdBy: 'user_005',
      createdAt: new Date('2024-02-05'),
      datasetSize: 19.2,
      downloads: 678,
      rating: 4.8,
      tags: ['domestic', 'cleaning', 'automation', 'household', 'navigation'],
      thumbnailUrl: 'https://example.com/thumbnails/cleaning.jpg',
      videoPreviewUrl: 'https://example.com/previews/cleaning.mp4',
    },
    {
      id: 'skill_006',
      title: 'Dynamic Balance Control',
      description: 'Advanced balance algorithms for walking on narrow beams, uneven surfaces, and during disturbances.',
      robotTypes: ['unitree_g1', 'boston_dynamics'],
      difficulty: 'expert',
      price: 52.00,
      currency: 'USD',
      createdBy: 'user_006',
      createdAt: new Date('2024-02-10'),
      datasetSize: 31.8,
      downloads: 423,
      rating: 4.9,
      tags: ['balance', 'stability', 'control', 'disturbance', 'advanced'],
      thumbnailUrl: 'https://example.com/thumbnails/balance.jpg',
      videoPreviewUrl: 'https://example.com/previews/balance.mp4',
    },
  ];

  async getSkills(filters?: {
    category?: string;
    robotType?: RobotType;
    difficulty?: string;
    maxPrice?: number;
    searchQuery?: string;
  }): Promise<SkillListing[]> {
    let skills = [...this.mockSkills];

    if (filters) {
      if (filters.robotType) {
        skills = skills.filter(skill => skill.robotTypes.includes(filters.robotType!));
      }
      
      if (filters.difficulty) {
        skills = skills.filter(skill => skill.difficulty === filters.difficulty);
      }
      
      if (filters.maxPrice) {
        skills = skills.filter(skill => skill.price <= filters.maxPrice!);
      }
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        skills = skills.filter(skill => 
          skill.title.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      if (filters.category) {
        skills = skills.filter(skill => 
          skill.tags.some(tag => tag.toLowerCase().includes(filters.category!.toLowerCase()))
        );
      }
    }

    return skills.sort((a, b) => b.rating - a.rating);
  }

  async getSkillById(skillId: string): Promise<SkillListing | null> {
    const skills = await this.getSkills();
    return skills.find(skill => skill.id === skillId) || null;
  }

  async getFeaturedSkills(): Promise<SkillListing[]> {
    const skills = await this.getSkills();
    return skills
      .filter(skill => skill.rating >= 4.7 && skill.downloads > 500)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 6);
  }

  async getPopularCategories(): Promise<string[]> {
    const skills = await this.getSkills();
    const tagCounts = new Map<string, number>();

    skills.forEach(skill => {
      skill.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + skill.downloads);
      });
    });

    return Array.from(tagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag]) => tag);
  }

  async purchaseSkill(skillId: string, userId: string): Promise<Purchase> {
    const skill = await this.getSkillById(skillId);
    if (!skill) {
      throw new Error('Skill not found');
    }

    const balance = await this.getUserBalance(userId);
    if (balance < skill.price) {
      throw new Error('Insufficient balance');
    }

    const purchase: Purchase = {
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      skillId,
      amount: skill.price,
      currency: skill.currency,
      purchaseDate: new Date(),
      downloadUrl: `https://api.marketplace.com/download/${skillId}?token=user_${userId}`,
    };

    // Save purchase
    const purchases = await this.getUserPurchases(userId);
    purchases.push(purchase);
    await AsyncStorage.setItem(
      `${this.STORAGE_KEYS.PURCHASES}_${userId}`, 
      JSON.stringify(purchases)
    );

    // Update balance
    await this.updateUserBalance(userId, balance - skill.price);

    // Increment download count (mock)
    const skillIndex = this.mockSkills.findIndex(s => s.id === skillId);
    if (skillIndex !== -1) {
      this.mockSkills[skillIndex].downloads += 1;
    }

    return purchase;
  }

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEYS.PURCHASES}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load purchases:', error);
      return [];
    }
  }

  async getUserBalance(userId: string): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEYS.USER_BALANCE}_${userId}`);
      return stored ? parseFloat(stored) : 100.0; // Default starting balance
    } catch (error) {
      console.error('Failed to load balance:', error);
      return 100.0;
    }
  }

  async updateUserBalance(userId: string, newBalance: number): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.STORAGE_KEYS.USER_BALANCE}_${userId}`, 
        newBalance.toString()
      );
    } catch (error) {
      console.error('Failed to update balance:', error);
      throw error;
    }
  }

  async uploadSkill(
    userId: string, 
    skillData: Omit<SkillListing, 'id' | 'createdBy' | 'createdAt' | 'downloads' | 'rating'>
  ): Promise<SkillListing> {
    const newSkill: SkillListing = {
      ...skillData,
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdBy: userId,
      createdAt: new Date(),
      downloads: 0,
      rating: 0,
    };

    // Save to uploaded skills
    const uploadedSkills = await this.getUserUploadedSkills(userId);
    uploadedSkills.push(newSkill);
    await AsyncStorage.setItem(
      `${this.STORAGE_KEYS.UPLOADED_SKILLS}_${userId}`,
      JSON.stringify(uploadedSkills)
    );

    // Add to mock skills for marketplace
    this.mockSkills.push(newSkill);

    return newSkill;
  }

  async getUserUploadedSkills(userId: string): Promise<SkillListing[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEYS.UPLOADED_SKILLS}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load uploaded skills:', error);
      return [];
    }
  }

  async rateSkill(skillId: string, userId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if user has purchased the skill
    const purchases = await this.getUserPurchases(userId);
    const hasPurchased = purchases.some(p => p.skillId === skillId);
    
    if (!hasPurchased) {
      throw new Error('You must purchase a skill before rating it');
    }

    // Update skill rating (simplified - in real app would store individual ratings)
    const skillIndex = this.mockSkills.findIndex(s => s.id === skillId);
    if (skillIndex !== -1) {
      const skill = this.mockSkills[skillIndex];
      // Simplified rating update - in production would track individual user ratings
      skill.rating = ((skill.rating * skill.downloads) + rating) / (skill.downloads + 1);
    }
  }

  async searchSkills(query: string): Promise<SkillListing[]> {
    return this.getSkills({ searchQuery: query });
  }

  async getSkillsByCategory(category: string): Promise<SkillListing[]> {
    return this.getSkills({ category });
  }

  async getRecommendedSkills(userId: string, robotType?: RobotType): Promise<SkillListing[]> {
    const purchases = await this.getUserPurchases(userId);
    const purchasedSkillIds = purchases.map(p => p.skillId);
    
    let skills = await this.getSkills(robotType ? { robotType } : undefined);
    
    // Filter out already purchased skills
    skills = skills.filter(skill => !purchasedSkillIds.includes(skill.id));
    
    // Sort by rating and downloads
    return skills
      .sort((a, b) => (b.rating * Math.log(b.downloads + 1)) - (a.rating * Math.log(a.downloads + 1)))
      .slice(0, 10);
  }

  async addBalance(userId: string, amount: number): Promise<number> {
    const currentBalance = await this.getUserBalance(userId);
    const newBalance = currentBalance + amount;
    await this.updateUserBalance(userId, newBalance);
    return newBalance;
  }

  async getEarnings(userId: string): Promise<number> {
    const uploadedSkills = await this.getUserUploadedSkills(userId);
    
    // Calculate earnings based on downloads and prices
    return uploadedSkills.reduce((total, skill) => {
      const revenue = skill.downloads * skill.price;
      const commission = 0.7; // 70% to creator, 30% to platform
      return total + (revenue * commission);
    }, 0);
  }

  dispose(): void {
    // Clean up any resources if needed
  }
}

export const marketplaceService = new MarketplaceService();