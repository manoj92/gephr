import { GestureData, LerobotDataPoint } from '../types';

export interface SkillListing {
  id: string;
  title: string;
  description: string;
  category: 'manipulation' | 'navigation' | 'interaction' | 'custom';
  difficulty: 1 | 2 | 3 | 4 | 5;
  robotTypes: string[];
  author: {
    id: string;
    name: string;
    reputation: number;
    verified: boolean;
  };
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    amount?: number;
    currency?: string;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
    successRate: number;
  };
  dataPoints: number;
  gestures: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  videoDemo?: string;
  isVerified: boolean;
  license: 'mit' | 'apache' | 'commercial' | 'custom';
}

export interface SkillContribution {
  id: string;
  userId: string;
  skillId?: string; // If contributing to existing skill
  title: string;
  description: string;
  category: string;
  difficulty: number;
  robotType: string;
  gestures: GestureData[];
  dataPoints: LerobotDataPoint[];
  metadata: {
    recordingEnvironment: string;
    recordingDevice: string;
    handTrackingVersion: string;
    totalRecordingTime: number;
  };
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'published' | 'rejected';
  submittedAt?: Date;
  reviewedAt?: Date;
  publishedAt?: Date;
  reviewNotes?: string;
}

export interface MarketplaceUser {
  id: string;
  username: string;
  email: string;
  reputation: number;
  skillLevel: number;
  totalContributions: number;
  totalDownloads: number;
  earnings: number;
  badges: string[];
  joinedAt: Date;
  isVerified: boolean;
  profile: {
    bio?: string;
    avatar?: string;
    specialties: string[];
    location?: string;
  };
}

export class MarketplaceService {
  private apiEndpoint = 'https://api.humanoidtraining.com/v1'; // Mock endpoint
  private mockSkills: SkillListing[] = [];
  private mockContributions: SkillContribution[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Generate mock marketplace data
    this.mockSkills = [
      {
        id: 'skill_001',
        title: 'Object Grasping Fundamentals',
        description: 'Learn to grasp various objects with precision and reliability',
        category: 'manipulation',
        difficulty: 2,
        robotTypes: ['unitree_g1', 'custom'],
        author: {
          id: 'user_001',
          name: 'Dr. Sarah Chen',
          reputation: 4.8,
          verified: true
        },
        pricing: { type: 'free' },
        stats: {
          downloads: 1234,
          rating: 4.7,
          reviews: 89,
          successRate: 0.92
        },
        dataPoints: 2500,
        gestures: 150,
        tags: ['grasping', 'manipulation', 'beginner'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-20'),
        isVerified: true,
        license: 'mit'
      },
      {
        id: 'skill_002',
        title: 'Advanced Assembly Techniques',
        description: 'Complex multi-step assembly operations for industrial applications',
        category: 'manipulation',
        difficulty: 5,
        robotTypes: ['unitree_g1', 'boston_dynamics', 'tesla_bot'],
        author: {
          id: 'user_002',
          name: 'RoboTech Industries',
          reputation: 4.9,
          verified: true
        },
        pricing: { 
          type: 'paid',
          amount: 49.99,
          currency: 'USD'
        },
        stats: {
          downloads: 456,
          rating: 4.9,
          reviews: 23,
          successRate: 0.87
        },
        dataPoints: 8900,
        gestures: 450,
        tags: ['assembly', 'industrial', 'advanced', 'precision'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-25'),
        isVerified: true,
        license: 'commercial'
      },
      {
        id: 'skill_003',
        title: 'Household Task Assistant',
        description: 'Common household tasks like cleaning, organizing, and food preparation',
        category: 'interaction',
        difficulty: 3,
        robotTypes: ['tesla_bot', 'custom'],
        author: {
          id: 'user_003',
          name: 'HomeBot Community',
          reputation: 4.5,
          verified: false
        },
        pricing: { type: 'free' },
        stats: {
          downloads: 3456,
          rating: 4.3,
          reviews: 234,
          successRate: 0.78
        },
        dataPoints: 5600,
        gestures: 320,
        tags: ['household', 'cleaning', 'cooking', 'daily-tasks'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-03-01'),
        isVerified: false,
        license: 'mit'
      }
    ];
  }

  /**
   * Search and filter skills in the marketplace
   */
  public async searchSkills(options: {
    query?: string;
    category?: string;
    difficulty?: number[];
    robotType?: string;
    priceRange?: { min: number; max: number };
    tags?: string[];
    sortBy?: 'popularity' | 'rating' | 'newest' | 'price';
    limit?: number;
    offset?: number;
  } = {}): Promise<SkillListing[]> {
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let filteredSkills = [...this.mockSkills];

    // Apply filters
    if (options.query) {
      const query = options.query.toLowerCase();
      filteredSkills = filteredSkills.filter(skill =>
        skill.title.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (options.category) {
      filteredSkills = filteredSkills.filter(skill => skill.category === options.category);
    }

    if (options.difficulty) {
      filteredSkills = filteredSkills.filter(skill => 
        options.difficulty!.includes(skill.difficulty)
      );
    }

    if (options.robotType) {
      filteredSkills = filteredSkills.filter(skill =>
        skill.robotTypes.includes(options.robotType!)
      );
    }

    if (options.tags && options.tags.length > 0) {
      filteredSkills = filteredSkills.filter(skill =>
        options.tags!.some(tag => skill.tags.includes(tag))
      );
    }

    // Apply sorting
    switch (options.sortBy) {
      case 'popularity':
        filteredSkills.sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
      case 'rating':
        filteredSkills.sort((a, b) => b.stats.rating - a.stats.rating);
        break;
      case 'newest':
        filteredSkills.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'price':
        filteredSkills.sort((a, b) => {
          const priceA = a.pricing.amount || 0;
          const priceB = b.pricing.amount || 0;
          return priceA - priceB;
        });
        break;
    }

    // Apply pagination
    const startIndex = options.offset || 0;
    const endIndex = startIndex + (options.limit || filteredSkills.length);
    
    return filteredSkills.slice(startIndex, endIndex);
  }

  /**
   * Get detailed information about a specific skill
   */
  public async getSkillDetails(skillId: string): Promise<SkillListing | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.mockSkills.find(skill => skill.id === skillId) || null;
  }

  /**
   * Download a skill (free or after payment)
   */
  public async downloadSkill(skillId: string, userId: string): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const skill = this.mockSkills.find(s => s.id === skillId);
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    // In a real implementation, this would handle payment processing
    if (skill.pricing.type === 'paid') {
      // Mock payment verification
      const paymentSuccess = Math.random() > 0.1; // 90% success rate
      if (!paymentSuccess) {
        return { success: false, error: 'Payment failed' };
      }
    }

    // Update download count
    skill.stats.downloads++;

    return {
      success: true,
      downloadUrl: `${this.apiEndpoint}/skills/${skillId}/download?token=mock_token`
    };
  }

  /**
   * Submit a skill contribution
   */
  public async submitContribution(contribution: Omit<SkillContribution, 'id' | 'status' | 'submittedAt'>): Promise<{
    success: boolean;
    contributionId?: string;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const newContribution: SkillContribution = {
        ...contribution,
        id: `contrib_${Date.now()}`,
        status: 'submitted',
        submittedAt: new Date()
      };

      this.mockContributions.push(newContribution);

      return {
        success: true,
        contributionId: newContribution.id
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to submit contribution'
      };
    }
  }

  /**
   * Get user's contributions
   */
  public async getUserContributions(userId: string): Promise<SkillContribution[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return this.mockContributions.filter(contrib => contrib.userId === userId);
  }

  /**
   * Rate and review a skill
   */
  public async submitReview(skillId: string, userId: string, review: {
    rating: number;
    comment?: string;
    anonymous?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const skill = this.mockSkills.find(s => s.id === skillId);
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    // Update skill stats (simplified)
    const newRating = (skill.stats.rating * skill.stats.reviews + review.rating) / (skill.stats.reviews + 1);
    skill.stats.rating = Math.round(newRating * 10) / 10;
    skill.stats.reviews++;

    return { success: true };
  }

  /**
   * Get trending skills
   */
  public async getTrendingSkills(limit: number = 10): Promise<SkillListing[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock trending algorithm based on recent downloads and ratings
    return this.mockSkills
      .sort((a, b) => {
        const scoreA = a.stats.downloads * 0.7 + a.stats.rating * 0.3;
        const scoreB = b.stats.downloads * 0.7 + b.stats.rating * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get recommended skills for a user
   */
  public async getRecommendedSkills(userId: string, userSkillLevel: number, robotType?: string): Promise<SkillListing[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    let recommendations = [...this.mockSkills];

    // Filter by skill level (recommend slightly above current level)
    recommendations = recommendations.filter(skill => 
      skill.difficulty >= userSkillLevel && 
      skill.difficulty <= userSkillLevel + 2
    );

    // Filter by robot type if specified
    if (robotType) {
      recommendations = recommendations.filter(skill =>
        skill.robotTypes.includes(robotType)
      );
    }

    // Sort by rating and return top 5
    return recommendations
      .sort((a, b) => b.stats.rating - a.stats.rating)
      .slice(0, 5);
  }

  /**
   * Get marketplace statistics
   */
  public async getMarketplaceStats(): Promise<{
    totalSkills: number;
    totalDownloads: number;
    averageRating: number;
    categoriesCount: Record<string, number>;
    topContributors: Array<{ name: string; contributions: number; reputation: number }>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const totalDownloads = this.mockSkills.reduce((sum, skill) => sum + skill.stats.downloads, 0);
    const averageRating = this.mockSkills.reduce((sum, skill) => sum + skill.stats.rating, 0) / this.mockSkills.length;
    
    const categoriesCount = this.mockSkills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topContributors = this.mockSkills
      .map(skill => ({
        name: skill.author.name,
        contributions: 1, // Simplified
        reputation: skill.author.reputation
      }))
      .slice(0, 5);

    return {
      totalSkills: this.mockSkills.length,
      totalDownloads,
      averageRating: Math.round(averageRating * 10) / 10,
      categoriesCount,
      topContributors
    };
  }

  /**
   * Create a contribution from recorded data
   */
  public createContributionFromData(
    gestures: GestureData[],
    dataPoints: LerobotDataPoint[],
    metadata: {
      title: string;
      description: string;
      category: string;
      difficulty: number;
      robotType: string;
      userId: string;
    }
  ): Omit<SkillContribution, 'id' | 'status' | 'submittedAt'> {
    const totalRecordingTime = gestures.reduce((sum, gesture) => 
      sum + (gesture.duration || 0), 0
    );

    return {
      userId: metadata.userId,
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      difficulty: metadata.difficulty,
      robotType: metadata.robotType,
      gestures,
      dataPoints,
      metadata: {
        recordingEnvironment: 'mobile_app',
        recordingDevice: 'smartphone',
        handTrackingVersion: '1.0.0',
        totalRecordingTime
      }
    };
  }
}

export const marketplaceService = new MarketplaceService();