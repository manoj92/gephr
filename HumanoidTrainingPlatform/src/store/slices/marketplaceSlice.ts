import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'manipulation' | 'navigation' | 'interaction' | 'custom';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  price: number;
  currency: 'USD' | 'EUR' | 'tokens';
  rating: number;
  totalRatings: number;
  downloads: number;
  creator: {
    id: string;
    name: string;
    reputation: number;
    avatar?: string;
  };
  tags: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  datasetSize: number;
  compatibility: string[];
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  isFeatured: boolean;
}

export interface SkillPurchase {
  id: string;
  skillId: string;
  userId: string;
  purchaseDate: Date;
  price: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface MarketplaceSliceState {
  skills: Skill[];
  featuredSkills: Skill[];
  mySkills: Skill[];
  purchasedSkills: SkillPurchase[];
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: 'popularity' | 'price' | 'rating' | 'newest';
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
  selectedSkill: Skill | null;
}

const initialState: MarketplaceSliceState = {
  skills: [],
  featuredSkills: [],
  mySkills: [],
  purchasedSkills: [],
  searchQuery: '',
  selectedCategory: null,
  sortBy: 'popularity',
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  page: 0,
  error: null,
  selectedSkill: null,
};

// Mock data
const generateMockSkills = (page: number = 0): Skill[] => {
  const categories: Skill['category'][] = ['manipulation', 'navigation', 'interaction', 'custom'];
  const difficulties: Skill['difficulty'][] = ['beginner', 'intermediate', 'advanced', 'expert'];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `skill-${page}-${i}`,
    name: `Robot Skill ${page * 10 + i + 1}`,
    description: `Advanced robot skill for ${categories[i % categories.length]} tasks`,
    category: categories[i % categories.length],
    difficulty: difficulties[i % difficulties.length],
    price: Math.floor(Math.random() * 1000) + 50,
    currency: 'USD' as const,
    rating: 3.5 + Math.random() * 1.5,
    totalRatings: Math.floor(Math.random() * 500) + 10,
    downloads: Math.floor(Math.random() * 10000) + 100,
    creator: {
      id: `creator-${i}`,
      name: `Creator ${i + 1}`,
      reputation: Math.floor(Math.random() * 1000) + 100,
    },
    tags: ['robotics', 'ai', 'training'],
    datasetSize: Math.floor(Math.random() * 10000) + 1000,
    compatibility: ['unitree_g1', 'boston_dynamics', 'tesla_bot'],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    isVerified: Math.random() > 0.3,
    isFeatured: Math.random() > 0.8,
  }));
};

export const loadSkills = createAsyncThunk(
  'marketplace/loadSkills',
  async (params: { 
    page?: number; 
    category?: string; 
    search?: string; 
    sortBy?: string; 
  } = {}, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const skills = generateMockSkills(params.page || 0);
      const hasMore = (params.page || 0) < 5; // Limit to 5 pages for demo
      
      return { skills, hasMore, page: params.page || 0 };
    } catch (error) {
      return rejectWithValue('Failed to load skills');
    }
  }
);

export const loadFeaturedSkills = createAsyncThunk(
  'marketplace/loadFeaturedSkills',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const allSkills = generateMockSkills(0);
      const featuredSkills = allSkills.filter(skill => skill.isFeatured);
      
      return featuredSkills;
    } catch (error) {
      return rejectWithValue('Failed to load featured skills');
    }
  }
);

export const purchaseSkill = createAsyncThunk(
  'marketplace/purchaseSkill',
  async (skillId: string, { rejectWithValue }) => {
    try {
      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const purchase: SkillPurchase = {
        id: `purchase-${Date.now()}`,
        skillId,
        userId: 'current-user',
        purchaseDate: new Date(),
        price: Math.floor(Math.random() * 1000) + 50,
        currency: 'USD',
        status: 'completed',
      };
      
      return purchase;
    } catch (error) {
      return rejectWithValue('Failed to purchase skill');
    }
  }
);

export const loadMySkills = createAsyncThunk(
  'marketplace/loadMySkills',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Return a few mock skills created by the user
      const mySkills = generateMockSkills(0).slice(0, 3).map(skill => ({
        ...skill,
        creator: {
          id: 'current-user',
          name: 'You',
          reputation: 750,
        },
      }));
      
      return mySkills;
    } catch (error) {
      return rejectWithValue('Failed to load your skills');
    }
  }
);

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.page = 0;
      state.skills = [];
      state.hasMore = true;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
      state.page = 0;
      state.skills = [];
      state.hasMore = true;
    },
    setSortBy: (state, action: PayloadAction<MarketplaceSliceState['sortBy']>) => {
      state.sortBy = action.payload;
      state.page = 0;
      state.skills = [];
      state.hasMore = true;
    },
    setSelectedSkill: (state, action: PayloadAction<Skill | null>) => {
      state.selectedSkill = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetSkills: (state) => {
      state.skills = [];
      state.page = 0;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load skills
      .addCase(loadSkills.pending, (state, action) => {
        if (action.meta.arg.page === 0) {
          state.isLoading = true;
        } else {
          state.isLoadingMore = true;
        }
        state.error = null;
      })
      .addCase(loadSkills.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        
        if (action.payload.page === 0) {
          state.skills = action.payload.skills;
        } else {
          state.skills.push(...action.payload.skills);
        }
        
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(loadSkills.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingMore = false;
        state.error = action.payload as string;
      })
      
      // Load featured skills
      .addCase(loadFeaturedSkills.pending, (state) => {
        state.error = null;
      })
      .addCase(loadFeaturedSkills.fulfilled, (state, action) => {
        state.featuredSkills = action.payload;
      })
      .addCase(loadFeaturedSkills.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Purchase skill
      .addCase(purchaseSkill.pending, (state) => {
        state.error = null;
      })
      .addCase(purchaseSkill.fulfilled, (state, action) => {
        state.purchasedSkills.push(action.payload);
      })
      .addCase(purchaseSkill.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Load my skills
      .addCase(loadMySkills.pending, (state) => {
        state.error = null;
      })
      .addCase(loadMySkills.fulfilled, (state, action) => {
        state.mySkills = action.payload;
      })
      .addCase(loadMySkills.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setSearchQuery,
  setSelectedCategory,
  setSortBy,
  setSelectedSkill,
  clearError,
  resetSkills,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;