import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PointCloudData {
  points: Point3D[];
  colors?: number[];
  intensity?: number[];
  timestamp: Date;
}

export interface MapRegion {
  id: string;
  name: string;
  bounds: {
    min: Point3D;
    max: Point3D;
  };
  pointCount: number;
  createdAt: Date;
  isActive: boolean;
}

export interface SpatialAnchor {
  id: string;
  position: Point3D;
  orientation: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  confidence: number;
  type: 'manual' | 'automatic';
  description?: string;
  createdAt: Date;
}

export interface MappingSliceState {
  isMapping: boolean;
  isPaused: boolean;
  currentPointCloud: PointCloudData | null;
  savedMaps: MapRegion[];
  currentMap: MapRegion | null;
  spatialAnchors: SpatialAnchor[];
  mappingQuality: number;
  trackingState: 'not_tracking' | 'limited' | 'normal' | 'relocating';
  devicePose: {
    position: Point3D;
    orientation: {
      x: number;
      y: number;
      z: number;
      w: number;
    };
  } | null;
  lidarAvailable: boolean;
  depthDataAvailable: boolean;
  error: string | null;
  settings: {
    enableLidar: boolean;
    enableDepthCamera: boolean;
    pointCloudDensity: 'low' | 'medium' | 'high';
    autoSaveInterval: number;
    maxPointCloudSize: number;
  };
}

const initialState: MappingSliceState = {
  isMapping: false,
  isPaused: false,
  currentPointCloud: null,
  savedMaps: [],
  currentMap: null,
  spatialAnchors: [],
  mappingQuality: 0,
  trackingState: 'not_tracking',
  devicePose: null,
  lidarAvailable: false,
  depthDataAvailable: false,
  error: null,
  settings: {
    enableLidar: true,
    enableDepthCamera: true,
    pointCloudDensity: 'medium',
    autoSaveInterval: 30000,
    maxPointCloudSize: 100000,
  },
};

export const startMapping = createAsyncThunk(
  'mapping/startMapping',
  async (mapName: string, { rejectWithValue }) => {
    try {
      // Initialize mapping session
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newMap: MapRegion = {
        id: `map-${Date.now()}`,
        name: mapName,
        bounds: {
          min: { x: -5, y: -5, z: -1 },
          max: { x: 5, y: 5, z: 3 },
        },
        pointCount: 0,
        createdAt: new Date(),
        isActive: true,
      };
      
      return newMap;
    } catch (error) {
      return rejectWithValue('Failed to start mapping session');
    }
  }
);

export const stopMapping = createAsyncThunk(
  'mapping/stopMapping',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { mapping: MappingSliceState };
      
      if (!state.mapping.currentMap) {
        throw new Error('No active mapping session');
      }
      
      // Save final map data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalMap: MapRegion = {
        ...state.mapping.currentMap,
        pointCount: state.mapping.currentPointCloud?.points.length || 0,
        isActive: false,
      };
      
      return finalMap;
    } catch (error) {
      return rejectWithValue('Failed to stop mapping session');
    }
  }
);

export const loadSavedMaps = createAsyncThunk(
  'mapping/loadSavedMaps',
  async (_, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock saved maps
      const savedMaps: MapRegion[] = [
        {
          id: 'map-1',
          name: 'Living Room',
          bounds: {
            min: { x: -3, y: -4, z: 0 },
            max: { x: 3, y: 4, z: 2.5 },
          },
          pointCount: 15420,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          isActive: false,
        },
        {
          id: 'map-2',
          name: 'Kitchen',
          bounds: {
            min: { x: -2, y: -3, z: 0 },
            max: { x: 4, y: 2, z: 2.8 },
          },
          pointCount: 8930,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          isActive: false,
        },
      ];
      
      return savedMaps;
    } catch (error) {
      return rejectWithValue('Failed to load saved maps');
    }
  }
);

export const createSpatialAnchor = createAsyncThunk(
  'mapping/createSpatialAnchor',
  async (params: { position: Point3D; description?: string }, { rejectWithValue }) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const anchor: SpatialAnchor = {
        id: `anchor-${Date.now()}`,
        position: params.position,
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        confidence: 0.85 + Math.random() * 0.14,
        type: 'manual',
        description: params.description,
        createdAt: new Date(),
      };
      
      return anchor;
    } catch (error) {
      return rejectWithValue('Failed to create spatial anchor');
    }
  }
);

// Simulate real-time point cloud updates
export const updatePointCloud = createAsyncThunk(
  'mapping/updatePointCloud',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { mapping: MappingSliceState };
      
      if (!state.mapping.isMapping || state.mapping.isPaused) {
        return null;
      }
      
      // Generate mock point cloud data
      const pointCount = Math.min(
        (state.mapping.currentPointCloud?.points.length || 0) + Math.floor(Math.random() * 50 + 10),
        state.mapping.settings.maxPointCloudSize
      );
      
      const points: Point3D[] = Array.from({ length: pointCount }, (_, i) => {
        if (i < (state.mapping.currentPointCloud?.points.length || 0)) {
          return state.mapping.currentPointCloud!.points[i];
        }
        return {
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          z: Math.random() * 3,
        };
      });
      
      const colors = points.map(() => Math.floor(Math.random() * 0xFFFFFF));
      
      const pointCloudData: PointCloudData = {
        points,
        colors,
        timestamp: new Date(),
      };
      
      return pointCloudData;
    } catch (error) {
      return rejectWithValue('Failed to update point cloud');
    }
  }
);

const mappingSlice = createSlice({
  name: 'mapping',
  initialState,
  reducers: {
    pauseMapping: (state) => {
      state.isPaused = true;
    },
    resumeMapping: (state) => {
      state.isPaused = false;
    },
    setTrackingState: (state, action: PayloadAction<MappingSliceState['trackingState']>) => {
      state.trackingState = action.payload;
    },
    updateDevicePose: (state, action: PayloadAction<MappingSliceState['devicePose']>) => {
      state.devicePose = action.payload;
    },
    setMappingQuality: (state, action: PayloadAction<number>) => {
      state.mappingQuality = Math.max(0, Math.min(1, action.payload));
    },
    removeSpatialAnchor: (state, action: PayloadAction<string>) => {
      state.spatialAnchors = state.spatialAnchors.filter(anchor => anchor.id !== action.payload);
    },
    updateMappingSettings: (state, action: PayloadAction<Partial<MappingSliceState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentMap: (state, action: PayloadAction<MapRegion | null>) => {
      state.currentMap = action.payload;
    },
    checkSensorAvailability: (state) => {
      // Mock sensor availability check
      state.lidarAvailable = Math.random() > 0.3;
      state.depthDataAvailable = Math.random() > 0.2;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start mapping
      .addCase(startMapping.pending, (state) => {
        state.error = null;
      })
      .addCase(startMapping.fulfilled, (state, action) => {
        state.isMapping = true;
        state.isPaused = false;
        state.currentMap = action.payload;
        state.trackingState = 'normal';
        state.mappingQuality = 0;
        state.currentPointCloud = null;
      })
      .addCase(startMapping.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Stop mapping
      .addCase(stopMapping.pending, (state) => {
        state.error = null;
      })
      .addCase(stopMapping.fulfilled, (state, action) => {
        state.isMapping = false;
        state.isPaused = false;
        state.trackingState = 'not_tracking';
        state.savedMaps.push(action.payload);
        state.currentMap = null;
        state.currentPointCloud = null;
        state.spatialAnchors = [];
      })
      .addCase(stopMapping.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Load saved maps
      .addCase(loadSavedMaps.fulfilled, (state, action) => {
        state.savedMaps = action.payload;
      })
      .addCase(loadSavedMaps.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Create spatial anchor
      .addCase(createSpatialAnchor.fulfilled, (state, action) => {
        state.spatialAnchors.push(action.payload);
      })
      .addCase(createSpatialAnchor.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Update point cloud
      .addCase(updatePointCloud.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentPointCloud = action.payload;
          state.mappingQuality = Math.min(1, state.mappingQuality + 0.01);
        }
      })
      .addCase(updatePointCloud.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  pauseMapping,
  resumeMapping,
  setTrackingState,
  updateDevicePose,
  setMappingQuality,
  removeSpatialAnchor,
  updateMappingSettings,
  clearError,
  setCurrentMap,
  checkSensorAvailability,
} = mappingSlice.actions;

export default mappingSlice.reducer;