import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';

export interface PerformanceMetrics {
  appLaunchTime: number;
  screenTransitionTime: number;
  memoryUsage: number;
  renderTime: number;
  networkLatency: number;
  batteryUsage: number;
  storageUsage: number;
  gestureProcessingTime: number;
  robotConnectionTime: number;
}

export interface OptimizationConfig {
  enableBatching: boolean;
  batchSize: number;
  debounceDelay: number;
  cacheSize: number;
  compressionEnabled: boolean;
  lazyLoadingEnabled: boolean;
  preloadCriticalData: boolean;
  reduceAnimations: boolean;
  optimizeImages: boolean;
}

export class PerformanceOptimizationService {
  private metrics: PerformanceMetrics = {
    appLaunchTime: 0,
    screenTransitionTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    networkLatency: 0,
    batteryUsage: 0,
    storageUsage: 0,
    gestureProcessingTime: 0,
    robotConnectionTime: 0,
  };

  private config: OptimizationConfig = {
    enableBatching: true,
    batchSize: 50,
    debounceDelay: 300,
    cacheSize: 100 * 1024 * 1024, // 100MB
    compressionEnabled: true,
    lazyLoadingEnabled: true,
    preloadCriticalData: true,
    reduceAnimations: false,
    optimizeImages: true,
  };

  private performanceTimers: Map<string, number> = new Map();
  private batchedOperations: Map<string, any[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private memoryCache: Map<string, { data: any; timestamp: number; size: number }> = new Map();
  private criticalDataPreloaded = false;

  constructor() {
    this.initializePerformanceMonitoring();
    this.loadConfiguration();
    this.startPerformanceMetricsCollection();
  }

  private async initializePerformanceMonitoring(): Promise<void> {
    // Monitor app launch time
    this.startTimer('appLaunch');
    
    // Set up memory monitoring
    this.monitorMemoryUsage();
    
    // Set up interaction manager for smooth animations
    this.setupInteractionManager();
    
    console.log('Performance optimization service initialized');
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('performance_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load performance configuration:', error);
    }
  }

  private setupInteractionManager(): void {
    // Delay heavy operations until interactions are complete
    InteractionManager.runAfterInteractions(() => {
      if (this.config.preloadCriticalData && !this.criticalDataPreloaded) {
        this.preloadCriticalData();
      }
    });
  }

  private async preloadCriticalData(): Promise<void> {
    try {
      // Preload critical app data in background
      const criticalDataPromises = [
        this.preloadUserProfile(),
        this.preloadGamificationData(),
        this.preloadRecentGestures(),
        this.preloadRobotConfigurations(),
      ];

      await Promise.all(criticalDataPromises);
      this.criticalDataPreloaded = true;
      console.log('Critical data preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload critical data:', error);
    }
  }

  private async preloadUserProfile(): Promise<void> {
    // Mock preloading user profile data
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async preloadGamificationData(): Promise<void> {
    // Mock preloading gamification stats
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  private async preloadRecentGestures(): Promise<void> {
    // Mock preloading recent gesture data
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async preloadRobotConfigurations(): Promise<void> {
    // Mock preloading robot configurations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Start a performance timer for measuring operation duration
   */
  public startTimer(operation: string): void {
    this.performanceTimers.set(operation, Date.now());
  }

  /**
   * End a performance timer and record the metric
   */
  public endTimer(operation: string): number {
    const startTime = this.performanceTimers.get(operation);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.performanceTimers.delete(operation);

    // Record the metric
    switch (operation) {
      case 'appLaunch':
        this.metrics.appLaunchTime = duration;
        break;
      case 'screenTransition':
        this.metrics.screenTransitionTime = duration;
        break;
      case 'gestureProcessing':
        this.metrics.gestureProcessingTime = duration;
        break;
      case 'robotConnection':
        this.metrics.robotConnectionTime = duration;
        break;
      default:
        // Store custom metrics
        break;
    }

    return duration;
  }

  /**
   * Batch operations for better performance
   */
  public batchOperation<T>(key: string, operation: T, processor: (batch: T[]) => Promise<void>): void {
    if (!this.config.enableBatching) {
      // Process immediately if batching is disabled
      processor([operation]);
      return;
    }

    // Add to batch
    const batch = this.batchedOperations.get(key) || [];
    batch.push(operation);
    this.batchedOperations.set(key, batch);

    // Process when batch size is reached
    if (batch.length >= this.config.batchSize) {
      this.processBatch(key, processor);
    } else {
      // Set up timer to process remaining items
      this.scheduleBatchProcessing(key, processor);
    }
  }

  private scheduleBatchProcessing<T>(key: string, processor: (batch: T[]) => Promise<void>): void {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.processBatch(key, processor);
    }, this.config.debounceDelay);

    this.debounceTimers.set(key, timer);
  }

  private async processBatch<T>(key: string, processor: (batch: T[]) => Promise<void>): Promise<void> {
    const batch = this.batchedOperations.get(key);
    if (!batch || batch.length === 0) return;

    try {
      await processor(batch);
      this.batchedOperations.delete(key);
      
      const timer = this.debounceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    } catch (error) {
      console.error(`Failed to process batch for ${key}:`, error);
    }
  }

  /**
   * Debounce function calls to reduce excessive operations
   */
  public debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number = this.config.debounceDelay
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * Intelligent caching with size and time-based eviction
   */
  public setCache(key: string, data: any, maxAge?: number): void {
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;
    
    // Check cache size limit
    this.evictOldCacheEntries(size);
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
  }

  public getCache<T>(key: string, maxAge: number = 5 * 60 * 1000): T | null {
    const cached = this.memoryCache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > maxAge) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private evictOldCacheEntries(newEntrySize: number): void {
    const currentSize = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    if (currentSize + newEntrySize <= this.config.cacheSize) return;
    
    // Sort by timestamp (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    let freedSpace = 0;
    const targetSpace = (currentSize + newEntrySize) - this.config.cacheSize;
    
    for (const [key, entry] of entries) {
      this.memoryCache.delete(key);
      freedSpace += entry.size;
      
      if (freedSpace >= targetSpace) break;
    }
  }

  /**
   * Optimize images for better performance
   */
  public optimizeImageSize(width: number, height: number, quality: 'low' | 'medium' | 'high' = 'medium'): { width: number; height: number; quality: number } {
    if (!this.config.optimizeImages) {
      return { width, height, quality: 1.0 };
    }

    const qualityMap = { low: 0.6, medium: 0.8, high: 0.9 };
    const maxDimensions = { low: 480, medium: 720, high: 1080 };
    
    const maxDimension = maxDimensions[quality];
    const aspectRatio = width / height;
    
    let optimizedWidth = width;
    let optimizedHeight = height;
    
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        optimizedWidth = maxDimension;
        optimizedHeight = maxDimension / aspectRatio;
      } else {
        optimizedHeight = maxDimension;
        optimizedWidth = maxDimension * aspectRatio;
      }
    }
    
    return {
      width: Math.round(optimizedWidth),
      height: Math.round(optimizedHeight),
      quality: qualityMap[quality],
    };
  }

  /**
   * Memory monitoring
   */
  private monitorMemoryUsage(): void {
    const updateMemoryMetrics = () => {
      if ((global as any).performance && (global as any).performance.memory) {
        const memory = (global as any).performance.memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
      }
    };

    updateMemoryMetrics();
    setInterval(updateMemoryMetrics, 30000); // Update every 30 seconds
  }

  /**
   * Network performance optimization
   */
  public async optimizedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // Add compression headers if enabled
      if (this.config.compressionEnabled) {
        options.headers = {
          ...options.headers,
          'Accept-Encoding': 'gzip, deflate, br',
        };
      }
      
      const response = await fetch(url, {
        ...options,
        timeout: 10000, // 10 second timeout
      } as any);
      
      this.metrics.networkLatency = Date.now() - startTime;
      return response;
    } catch (error) {
      this.metrics.networkLatency = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Lazy loading utilities
   */
  public createLazyLoader<T>(loader: () => Promise<T>): () => Promise<T> {
    let cached: T | null = null;
    let loading = false;
    let loadPromise: Promise<T> | null = null;

    return async (): Promise<T> => {
      if (cached) return cached;
      
      if (loading && loadPromise) return loadPromise;
      
      loading = true;
      loadPromise = loader().then(result => {
        cached = result;
        loading = false;
        return result;
      }).catch(error => {
        loading = false;
        loadPromise = null;
        throw error;
      });
      
      return loadPromise;
    };
  }

  /**
   * Performance metrics collection
   */
  private startPerformanceMetricsCollection(): void {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000); // Collect metrics every minute
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // Collect storage usage
      const storageInfo = await this.getStorageUsage();
      this.metrics.storageUsage = storageInfo.used;

      // Log metrics for monitoring
      console.log('Performance Metrics:', {
        appLaunchTime: `${this.metrics.appLaunchTime}ms`,
        memoryUsage: `${this.metrics.memoryUsage.toFixed(2)}MB`,
        storageUsage: `${(this.metrics.storageUsage / (1024 * 1024)).toFixed(2)}MB`,
        cacheSize: `${this.memoryCache.size} items`,
      });

      // Store metrics for analysis
      await this.storePerformanceMetrics();
    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
    }
  }

  private async getStorageUsage(): Promise<{ used: number; available: number }> {
    // Mock implementation - in a real app, you'd use device-specific APIs
    return {
      used: Math.random() * 1024 * 1024 * 100, // Random size up to 100MB
      available: 1024 * 1024 * 1024 * 5, // 5GB available
    };
  }

  private async storePerformanceMetrics(): Promise<void> {
    try {
      const metricsHistory = await AsyncStorage.getItem('performance_metrics_history');
      const history = metricsHistory ? JSON.parse(metricsHistory) : [];
      
      history.push({
        ...this.metrics,
        timestamp: Date.now(),
      });
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      await AsyncStorage.setItem('performance_metrics_history', JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to store performance metrics:', error);
    }
  }

  /**
   * Configuration management
   */
  public updateConfiguration(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfiguration();
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('performance_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save performance configuration:', error);
    }
  }

  public getConfiguration(): OptimizationConfig {
    return { ...this.config };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Cleanup and resource management
   */
  public cleanup(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Clear performance timers
    this.performanceTimers.clear();
    
    // Clear batched operations
    this.batchedOperations.clear();
    
    // Clear memory cache
    this.memoryCache.clear();
    
    console.log('Performance optimization service cleaned up');
  }

  /**
   * Performance recommendations
   */
  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.appLaunchTime > 3000) {
      recommendations.push('Consider reducing app launch time by optimizing initialization');
    }
    
    if (this.metrics.memoryUsage > 200) {
      recommendations.push('High memory usage detected - consider clearing unused data');
    }
    
    if (this.metrics.gestureProcessingTime > 100) {
      recommendations.push('Gesture processing is slow - consider optimizing hand tracking algorithms');
    }
    
    if (this.metrics.robotConnectionTime > 5000) {
      recommendations.push('Robot connection is slow - check network conditions');
    }
    
    if (this.memoryCache.size > 1000) {
      recommendations.push('Large cache size - consider reducing cache retention time');
    }
    
    return recommendations;
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();