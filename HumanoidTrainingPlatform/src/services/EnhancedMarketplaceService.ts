import AsyncStorage from '@react-native-async-storage/async-storage';
import { LerobotDataset } from './LeRobotDatasetService';

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'dataset' | 'model' | 'behavior' | 'simulation';
  category: string;
  price: number;
  currency: 'credits' | 'USD' | 'tokens';
  creator: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    verified: boolean;
  };
  stats: {
    downloads: number;
    views: number;
    rating: number;
    reviews: number;
    revenue: number;
  };
  compatibility: {
    robots: string[];
    minVersion: string;
    requirements: string[];
  };
  files: {
    preview?: string;
    main: string;
    size: number;
    format: string;
  };
  metadata: {
    version: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    license: string;
  };
  featured: boolean;
  verified: boolean;
  trending: boolean;
}

export interface Transaction {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
  transactionHash?: string;
}

export interface UserWallet {
  userId: string;
  credits: number;
  tokens: number;
  earnings: number;
  transactions: Transaction[];
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  helpful: number;
  timestamp: Date;
}

export class EnhancedMarketplaceService {
  private items: Map<string, MarketplaceItem>;
  private userWallet: UserWallet | null = null;
  private transactions: Map<string, Transaction>;
  private reviews: Map<string, Review[]>;
  private cart: MarketplaceItem[];
  private wishlist: Set<string>;

  constructor() {
    this.items = new Map();
    this.transactions = new Map();
    this.reviews = new Map();
    this.cart = [];
    this.wishlist = new Set();

    this.initializeMarketplace();
  }

  private async initializeMarketplace(): Promise<void> {
    // Load sample marketplace items
    this.loadSampleItems();

    // Load user wallet
    await this.loadUserWallet();

    // Load user preferences
    await this.loadUserPreferences();
  }

  private loadSampleItems(): void {
    const sampleItems: MarketplaceItem[] = [
      {
        id: 'skill_001',
        title: 'Advanced Object Manipulation',
        description: 'Professional-grade object manipulation skills with 98% success rate',
        type: 'skill',
        category: 'Manipulation',
        price: 299,
        currency: 'credits',
        creator: {
          id: 'creator_001',
          name: 'RoboMaster Labs',
          rating: 4.8,
          verified: true
        },
        stats: {
          downloads: 15420,
          views: 89230,
          rating: 4.7,
          reviews: 342,
          revenue: 4603580
        },
        compatibility: {
          robots: ['unitree_g1', 'boston_dynamics', 'custom'],
          minVersion: '2.0.0',
          requirements: ['hand_tracking', 'force_feedback']
        },
        files: {
          main: 'manipulation_v3.lerobot',
          size: 45678900,
          format: 'lerobot'
        },
        metadata: {
          version: '3.2.1',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-12-01'),
          tags: ['manipulation', 'precision', 'industrial'],
          license: 'Commercial'
        },
        featured: true,
        verified: true,
        trending: true
      },
      {
        id: 'dataset_001',
        title: 'Kitchen Tasks Dataset - 10K Hours',
        description: 'Comprehensive kitchen task dataset with multi-angle recordings',
        type: 'dataset',
        category: 'Home Automation',
        price: 499,
        currency: 'credits',
        creator: {
          id: 'creator_002',
          name: 'HomeBot Research',
          rating: 4.9,
          verified: true
        },
        stats: {
          downloads: 8923,
          views: 45670,
          rating: 4.8,
          reviews: 189,
          revenue: 4452677
        },
        compatibility: {
          robots: ['all'],
          minVersion: '1.5.0',
          requirements: ['storage_50gb']
        },
        files: {
          main: 'kitchen_tasks_10k.dataset',
          size: 53687091200,
          format: 'lerobot_dataset'
        },
        metadata: {
          version: '2.0.0',
          createdAt: new Date('2024-03-20'),
          updatedAt: new Date('2024-11-15'),
          tags: ['kitchen', 'cooking', 'cleaning', 'dataset'],
          license: 'Research'
        },
        featured: true,
        verified: true,
        trending: false
      },
      {
        id: 'model_001',
        title: 'Vision-Language Navigation Model',
        description: 'SOTA navigation model with natural language understanding',
        type: 'model',
        category: 'Navigation',
        price: 799,
        currency: 'credits',
        creator: {
          id: 'creator_003',
          name: 'AI Navigation Corp',
          rating: 4.6,
          verified: true
        },
        stats: {
          downloads: 5421,
          views: 32100,
          rating: 4.5,
          reviews: 98,
          revenue: 4331379
        },
        compatibility: {
          robots: ['unitree_g1', 'tesla_bot'],
          minVersion: '2.5.0',
          requirements: ['gpu_compute', 'lidar']
        },
        files: {
          main: 'vln_model_v2.onnx',
          size: 2147483648,
          format: 'onnx'
        },
        metadata: {
          version: '2.1.0',
          createdAt: new Date('2024-06-10'),
          updatedAt: new Date('2024-12-05'),
          tags: ['navigation', 'vision', 'language', 'ai'],
          license: 'Commercial'
        },
        featured: false,
        verified: true,
        trending: true
      },
      {
        id: 'behavior_001',
        title: 'Social Interaction Behaviors Pack',
        description: 'Natural human-robot interaction behaviors for social settings',
        type: 'behavior',
        category: 'Social',
        price: 199,
        currency: 'credits',
        creator: {
          id: 'creator_004',
          name: 'SocialBot Studio',
          rating: 4.7,
          verified: false
        },
        stats: {
          downloads: 12300,
          views: 67890,
          rating: 4.6,
          reviews: 256,
          revenue: 2447700
        },
        compatibility: {
          robots: ['all'],
          minVersion: '2.0.0',
          requirements: ['speech', 'gesture_recognition']
        },
        files: {
          main: 'social_behaviors.pack',
          size: 134217728,
          format: 'behavior_pack'
        },
        metadata: {
          version: '1.5.0',
          createdAt: new Date('2024-04-01'),
          updatedAt: new Date('2024-11-20'),
          tags: ['social', 'interaction', 'gestures', 'conversation'],
          license: 'MIT'
        },
        featured: false,
        verified: false,
        trending: true
      },
      {
        id: 'simulation_001',
        title: 'Warehouse Logistics Simulator',
        description: 'Complete warehouse environment for training logistics robots',
        type: 'simulation',
        category: 'Industrial',
        price: 599,
        currency: 'credits',
        creator: {
          id: 'creator_005',
          name: 'SimuLogix',
          rating: 4.8,
          verified: true
        },
        stats: {
          downloads: 3210,
          views: 18900,
          rating: 4.7,
          reviews: 67,
          revenue: 1922790
        },
        compatibility: {
          robots: ['unitree_g1', 'boston_dynamics', 'custom'],
          minVersion: '2.2.0',
          requirements: ['isaac_sim', 'gpu_8gb']
        },
        files: {
          main: 'warehouse_sim.usd',
          size: 8589934592,
          format: 'usd'
        },
        metadata: {
          version: '1.2.0',
          createdAt: new Date('2024-07-15'),
          updatedAt: new Date('2024-12-10'),
          tags: ['warehouse', 'logistics', 'simulation', 'training'],
          license: 'Commercial'
        },
        featured: true,
        verified: true,
        trending: false
      }
    ];

    sampleItems.forEach(item => {
      this.items.set(item.id, item);
      this.generateReviews(item.id);
    });
  }

  private generateReviews(itemId: string): void {
    const reviewCount = Math.floor(Math.random() * 5) + 2;
    const reviews: Review[] = [];

    const sampleReviews = [
      { name: 'Alex Chen', comment: 'Excellent quality! Works perfectly with my setup.' },
      { name: 'Sarah Johnson', comment: 'Good value for money, minor issues with compatibility.' },
      { name: 'Mike Williams', comment: 'Amazing! Exceeded my expectations.' },
      { name: 'Emma Davis', comment: 'Solid implementation, well documented.' },
      { name: 'John Smith', comment: 'Works as advertised. Happy with the purchase.' }
    ];

    for (let i = 0; i < reviewCount; i++) {
      const review = sampleReviews[i % sampleReviews.length];
      reviews.push({
        id: `review_${itemId}_${i}`,
        itemId,
        userId: `user_${i}`,
        userName: review.name,
        rating: 4 + Math.random(),
        comment: review.comment,
        helpful: Math.floor(Math.random() * 50),
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    this.reviews.set(itemId, reviews);
  }

  private async loadUserWallet(): Promise<void> {
    try {
      const walletData = await AsyncStorage.getItem('userWallet');
      if (walletData) {
        this.userWallet = JSON.parse(walletData);
      } else {
        // Initialize with default wallet
        this.userWallet = {
          userId: 'current_user',
          credits: 1000,
          tokens: 50,
          earnings: 0,
          transactions: []
        };
        await this.saveUserWallet();
      }
    } catch (error) {
      console.error('Error loading user wallet:', error);
      this.userWallet = {
        userId: 'current_user',
        credits: 1000,
        tokens: 50,
        earnings: 0,
        transactions: []
      };
    }
  }

  private async saveUserWallet(): Promise<void> {
    if (this.userWallet) {
      try {
        await AsyncStorage.setItem('userWallet', JSON.stringify(this.userWallet));
      } catch (error) {
        console.error('Error saving user wallet:', error);
      }
    }
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      const cartData = await AsyncStorage.getItem('marketplaceCart');
      const wishlistData = await AsyncStorage.getItem('marketplaceWishlist');

      if (cartData) {
        const cartIds = JSON.parse(cartData);
        this.cart = cartIds.map((id: string) => this.items.get(id)).filter(Boolean);
      }

      if (wishlistData) {
        this.wishlist = new Set(JSON.parse(wishlistData));
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async searchItems(query: string, filters?: {
    type?: MarketplaceItem['type'];
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    compatibility?: string[];
    verified?: boolean;
  }): Promise<MarketplaceItem[]> {
    let results = Array.from(this.items.values());

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.type) {
        results = results.filter(item => item.type === filters.type);
      }
      if (filters.category) {
        results = results.filter(item => item.category === filters.category);
      }
      if (filters.minPrice !== undefined) {
        results = results.filter(item => item.price >= filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        results = results.filter(item => item.price <= filters.maxPrice);
      }
      if (filters.minRating !== undefined) {
        results = results.filter(item => item.stats.rating >= filters.minRating);
      }
      if (filters.compatibility) {
        results = results.filter(item =>
          filters.compatibility.some(robot =>
            item.compatibility.robots.includes(robot) ||
            item.compatibility.robots.includes('all')
          )
        );
      }
      if (filters.verified !== undefined) {
        results = results.filter(item => item.verified === filters.verified);
      }
    }

    return results;
  }

  getFeaturedItems(): MarketplaceItem[] {
    return Array.from(this.items.values()).filter(item => item.featured);
  }

  getTrendingItems(): MarketplaceItem[] {
    return Array.from(this.items.values()).filter(item => item.trending);
  }

  getItemById(id: string): MarketplaceItem | undefined {
    return this.items.get(id);
  }

  getItemReviews(itemId: string): Review[] {
    return this.reviews.get(itemId) || [];
  }

  async purchaseItem(itemId: string): Promise<Transaction> {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (!this.userWallet) {
      throw new Error('Wallet not initialized');
    }

    // Check balance
    const balance = item.currency === 'credits' ? this.userWallet.credits : this.userWallet.tokens;
    if (balance < item.price) {
      throw new Error('Insufficient balance');
    }

    // Create transaction
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId,
      buyerId: this.userWallet.userId,
      sellerId: item.creator.id,
      amount: item.price,
      currency: item.currency,
      status: 'pending',
      timestamp: new Date(),
      transactionHash: this.generateTransactionHash()
    };

    // Process payment
    try {
      // Deduct from wallet
      if (item.currency === 'credits') {
        this.userWallet.credits -= item.price;
      } else {
        this.userWallet.tokens -= item.price;
      }

      // Update transaction status
      transaction.status = 'completed';

      // Update item stats
      item.stats.downloads++;
      item.stats.revenue += item.price;

      // Save transaction
      this.transactions.set(transaction.id, transaction);
      this.userWallet.transactions.push(transaction);

      // Remove from cart if present
      this.cart = this.cart.filter(cartItem => cartItem.id !== itemId);

      // Save wallet
      await this.saveUserWallet();

      // Trigger download
      await this.downloadItem(itemId);

      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      throw error;
    }
  }

  private generateTransactionHash(): string {
    return '0x' + Array(64).fill(0).map(() =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private async downloadItem(itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item) return;

    console.log(`Downloading ${item.title}...`);
    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Download complete: ${item.files.main}`);
  }

  async addToCart(itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (!this.cart.find(cartItem => cartItem.id === itemId)) {
      this.cart.push(item);
      await this.saveCart();
    }
  }

  async removeFromCart(itemId: string): Promise<void> {
    this.cart = this.cart.filter(item => item.id !== itemId);
    await this.saveCart();
  }

  async clearCart(): Promise<void> {
    this.cart = [];
    await this.saveCart();
  }

  private async saveCart(): Promise<void> {
    try {
      const cartIds = this.cart.map(item => item.id);
      await AsyncStorage.setItem('marketplaceCart', JSON.stringify(cartIds));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  getCart(): MarketplaceItem[] {
    return this.cart;
  }

  getCartTotal(): { total: number; currency: string } {
    const creditTotal = this.cart
      .filter(item => item.currency === 'credits')
      .reduce((sum, item) => sum + item.price, 0);

    return { total: creditTotal, currency: 'credits' };
  }

  async addToWishlist(itemId: string): Promise<void> {
    this.wishlist.add(itemId);
    await this.saveWishlist();
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    this.wishlist.delete(itemId);
    await this.saveWishlist();
  }

  private async saveWishlist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'marketplaceWishlist',
        JSON.stringify(Array.from(this.wishlist))
      );
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  }

  isInWishlist(itemId: string): boolean {
    return this.wishlist.has(itemId);
  }

  getWishlist(): MarketplaceItem[] {
    return Array.from(this.wishlist)
      .map(id => this.items.get(id))
      .filter(Boolean) as MarketplaceItem[];
  }

  async submitReview(itemId: string, rating: number, comment: string): Promise<void> {
    const review: Review = {
      id: `review_${Date.now()}`,
      itemId,
      userId: this.userWallet?.userId || 'anonymous',
      userName: 'Current User',
      rating,
      comment,
      helpful: 0,
      timestamp: new Date()
    };

    const itemReviews = this.reviews.get(itemId) || [];
    itemReviews.push(review);
    this.reviews.set(itemId, itemReviews);

    // Update item rating
    const item = this.items.get(itemId);
    if (item) {
      const totalRating = itemReviews.reduce((sum, r) => sum + r.rating, 0);
      item.stats.rating = totalRating / itemReviews.length;
      item.stats.reviews = itemReviews.length;
    }
  }

  async publishItem(itemData: Partial<MarketplaceItem>): Promise<MarketplaceItem> {
    const newItem: MarketplaceItem = {
      id: `item_${Date.now()}`,
      title: itemData.title || 'Untitled',
      description: itemData.description || '',
      type: itemData.type || 'skill',
      category: itemData.category || 'General',
      price: itemData.price || 0,
      currency: itemData.currency || 'credits',
      creator: itemData.creator || {
        id: this.userWallet?.userId || 'anonymous',
        name: 'Current User',
        rating: 0,
        verified: false
      },
      stats: {
        downloads: 0,
        views: 0,
        rating: 0,
        reviews: 0,
        revenue: 0
      },
      compatibility: itemData.compatibility || {
        robots: ['all'],
        minVersion: '1.0.0',
        requirements: []
      },
      files: itemData.files || {
        main: 'file.dat',
        size: 0,
        format: 'unknown'
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: itemData.metadata?.tags || [],
        license: itemData.metadata?.license || 'MIT'
      },
      featured: false,
      verified: false,
      trending: false
    };

    this.items.set(newItem.id, newItem);
    return newItem;
  }

  getUserWallet(): UserWallet | null {
    return this.userWallet;
  }

  async addCredits(amount: number): Promise<void> {
    if (this.userWallet) {
      this.userWallet.credits += amount;
      await this.saveUserWallet();
    }
  }

  async addTokens(amount: number): Promise<void> {
    if (this.userWallet) {
      this.userWallet.tokens += amount;
      await this.saveUserWallet();
    }
  }

  getUserTransactions(): Transaction[] {
    return this.userWallet?.transactions || [];
  }

  getUserPurchases(): MarketplaceItem[] {
    const purchasedIds = this.getUserTransactions()
      .filter(txn => txn.status === 'completed')
      .map(txn => txn.itemId);

    return purchasedIds
      .map(id => this.items.get(id))
      .filter(Boolean) as MarketplaceItem[];
  }

  getRecommendations(limit: number = 5): MarketplaceItem[] {
    // Simple recommendation based on popularity
    return Array.from(this.items.values())
      .sort((a, b) => b.stats.downloads - a.stats.downloads)
      .slice(0, limit);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.items.forEach(item => categories.add(item.category));
    return Array.from(categories);
  }

  async cleanup(): Promise<void> {
    await this.saveUserWallet();
    await this.saveCart();
    await this.saveWishlist();
  }
}

export const enhancedMarketplaceService = new EnhancedMarketplaceService();
export default enhancedMarketplaceService;