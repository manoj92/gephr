import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'memory' | 'cpu' | 'network' | 'storage' | 'rendering' | 'battery';
}

export interface PerformanceProfile {
  deviceType: 'low' | 'medium' | 'high' | 'premium';
  settings: {
    handTrackingQuality: 'low' | 'medium' | 'high';
    renderingQuality: 'low' | 'medium' | 'high' | 'ultra';
    frameRate: 30 | 60 | 120;
    pointCloudDensity: 'low' | 'medium' | 'high';
    enableEffects: boolean;
    enableAntialiasing: boolean;
    maxConcurrentOperations: number;
    cacheSize: number;
  };
  thresholds: {
    maxMemoryUsage: number; // MB
    maxCpuUsage: number; // percentage
    minBatteryLevel: number; // percentage
    maxNetworkLatency: number; // ms
  };
}

export interface OptimizationRecommendation {
  id: string;
  type: 'memory' | 'cpu' | 'battery' | 'network' | 'storage';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  automated: boolean;
  impact: 'low' | 'medium' | 'high';
}

export class PerformanceService {
  private isMonitoring: boolean = false;
  private metrics: PerformanceMetric[] = [];
  private currentProfile: PerformanceProfile;
  private monitors: Map<string, NodeJS.Timeout> = new Map();
  private optimizationCallbacks: Function[] = [];
  
  private readonly STORAGE_KEY = 'performance_profile';
  private readonly METRICS_STORAGE_KEY = 'performance_metrics';
  private readonly MAX_METRICS_HISTORY = 1000;

  private readonly DEFAULT_PROFILES: Record<string, PerformanceProfile> = {
    low: {
      deviceType: 'low',
      settings: {
        handTrackingQuality: 'low',
        renderingQuality: 'low',
        frameRate: 30,
        pointCloudDensity: 'low',
        enableEffects: false,
        enableAntialiasing: false,
        maxConcurrentOperations: 2,
        cacheSize: 50,
      },
      thresholds: {
        maxMemoryUsage: 200,
        maxCpuUsage: 70,
        minBatteryLevel: 20,
        maxNetworkLatency: 2000,
      },
    },
    medium: {
      deviceType: 'medium',
      settings: {
        handTrackingQuality: 'medium',
        renderingQuality: 'medium',
        frameRate: 60,
        pointCloudDensity: 'medium',
        enableEffects: true,
        enableAntialiasing: false,
        maxConcurrentOperations: 4,
        cacheSize: 100,
      },
      thresholds: {
        maxMemoryUsage: 400,
        maxCpuUsage: 80,
        minBatteryLevel: 15,
        maxNetworkLatency: 1500,
      },
    },
    high: {
      deviceType: 'high',
      settings: {
        handTrackingQuality: 'high',
        renderingQuality: 'high',
        frameRate: 60,
        pointCloudDensity: 'high',
        enableEffects: true,
        enableAntialiasing: true,
        maxConcurrentOperations: 6,
        cacheSize: 200,
      },
      thresholds: {
        maxMemoryUsage: 800,
        maxCpuUsage: 85,
        minBatteryLevel: 10,
        maxNetworkLatency: 1000,
      },
    },
    premium: {
      deviceType: 'premium',
      settings: {
        handTrackingQuality: 'high',
        renderingQuality: 'ultra',
        frameRate: 120,
        pointCloudDensity: 'high',
        enableEffects: true,
        enableAntialiasing: true,
        maxConcurrentOperations: 8,
        cacheSize: 500,
      },
      thresholds: {
        maxMemoryUsage: 1500,
        maxCpuUsage: 90,
        minBatteryLevel: 5,
        maxNetworkLatency: 500,
      },
    },
  };

  constructor() {
    this.currentProfile = this.DEFAULT_PROFILES.medium;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved profile and metrics
      await this.loadPerformanceData();
      
      // Auto-detect device capabilities if no saved profile
      if (!await this.hasSavedProfile()) {
        const detectedProfile = await this.detectDeviceCapabilities();
        await this.setPerformanceProfile(detectedProfile);
      }
      
      // Start performance monitoring
      this.startMonitoring();
      
      console.log(`Performance service initialized with ${this.currentProfile.deviceType} profile`);
    } catch (error) {
      console.error('Performance service initialization error:', error);
      throw error;
    }
  }

  async detectDeviceCapabilities(): Promise<keyof typeof this.DEFAULT_PROFILES> {
    try {
      // Simulate device capability detection
      const deviceInfo = await this.getDeviceInfo();
      const performanceScore = await this.runPerformanceBenchmark();
      
      if (performanceScore >= 8000) {
        return 'premium';
      } else if (performanceScore >= 5000) {
        return 'high';
      } else if (performanceScore >= 2500) {
        return 'medium';
      } else {
        return 'low';
      }
    } catch (error) {
      console.error('Device capability detection error:', error);
      return 'medium'; // Safe default
    }
  }

  private async runPerformanceBenchmark(): Promise<number> {
    console.log('Running performance benchmark...');
    
    let score = 0;
    const startTime = Date.now();
    
    // CPU benchmark - mathematical operations
    const cpuStart = Date.now();
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    const cpuTime = Date.now() - cpuStart;
    score += Math.max(0, 3000 - cpuTime); // Lower time = higher score
    
    // Memory benchmark - array operations
    const memoryStart = Date.now();
    const largeArray = new Array(100000).fill(0).map((_, i) => ({ id: i, value: Math.random() }));
    largeArray.sort((a, b) => a.value - b.value);
    const memoryTime = Date.now() - memoryStart;
    score += Math.max(0, 2000 - memoryTime);
    
    // Graphics benchmark - simulate rendering operations
    const gfxStart = Date.now();
    const canvas = { width: 1920, height: 1080 };
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      // Simulate pixel operations
      const pixel = Math.floor(x) + Math.floor(y) * canvas.width;
    }
    const gfxTime = Date.now() - gfxStart;
    score += Math.max(0, 1500 - gfxTime);
    
    const totalTime = Date.now() - startTime;
    console.log(`Benchmark completed in ${totalTime}ms, score: ${score}`);
    
    return score;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor memory usage
    this.monitors.set('memory', setInterval(() => {
      this.recordMemoryMetrics();
    }, 5000));
    
    // Monitor CPU usage
    this.monitors.set('cpu', setInterval(() => {
      this.recordCpuMetrics();
    }, 3000));
    
    // Monitor battery
    this.monitors.set('battery', setInterval(() => {
      this.recordBatteryMetrics();
    }, 30000));
    
    // Monitor network performance
    this.monitors.set('network', setInterval(() => {
      this.recordNetworkMetrics();
    }, 10000));
    
    // Monitor rendering performance
    this.monitors.set('rendering', setInterval(() => {
      this.recordRenderingMetrics();
    }, 1000));
    
    console.log('Performance monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Clear all monitors
    this.monitors.forEach(timer => clearInterval(timer));
    this.monitors.clear();
    
    console.log('Performance monitoring stopped');
  }

  private async recordMemoryMetrics(): Promise<void> {
    try {
      // Simulate memory usage measurement
      const memoryUsage = this.simulateMemoryUsage();
      
      this.addMetric({
        name: 'memory_usage',
        value: memoryUsage,
        unit: 'MB',
        timestamp: new Date(),
        category: 'memory',
      });
      
      // Check thresholds
      if (memoryUsage > this.currentProfile.thresholds.maxMemoryUsage) {
        await this.handleMemoryPressure(memoryUsage);
      }
    } catch (error) {
      console.error('Memory metrics recording error:', error);
    }
  }

  private async recordCpuMetrics(): Promise<void> {
    try {
      const cpuUsage = this.simulateCpuUsage();
      
      this.addMetric({
        name: 'cpu_usage',
        value: cpuUsage,
        unit: '%',
        timestamp: new Date(),
        category: 'cpu',
      });
      
      if (cpuUsage > this.currentProfile.thresholds.maxCpuUsage) {
        await this.handleHighCpuUsage(cpuUsage);
      }
    } catch (error) {
      console.error('CPU metrics recording error:', error);
    }
  }

  private async recordBatteryMetrics(): Promise<void> {
    try {
      const batteryLevel = this.simulateBatteryLevel();
      
      this.addMetric({
        name: 'battery_level',
        value: batteryLevel,
        unit: '%',
        timestamp: new Date(),
        category: 'battery',
      });
      
      if (batteryLevel < this.currentProfile.thresholds.minBatteryLevel) {
        await this.handleLowBattery(batteryLevel);
      }
    } catch (error) {
      console.error('Battery metrics recording error:', error);
    }
  }

  private async recordNetworkMetrics(): Promise<void> {
    try {
      const latency = await this.measureNetworkLatency();
      
      this.addMetric({
        name: 'network_latency',
        value: latency,
        unit: 'ms',
        timestamp: new Date(),
        category: 'network',
      });
      
      if (latency > this.currentProfile.thresholds.maxNetworkLatency) {
        await this.handleHighLatency(latency);
      }
    } catch (error) {
      console.error('Network metrics recording error:', error);
    }
  }

  private async recordRenderingMetrics(): Promise<void> {
    try {
      const frameTime = this.simulateFrameTime();
      const fps = 1000 / frameTime;
      
      this.addMetric({
        name: 'frame_rate',
        value: fps,
        unit: 'fps',
        timestamp: new Date(),
        category: 'rendering',
      });
      
      this.addMetric({
        name: 'frame_time',
        value: frameTime,
        unit: 'ms',
        timestamp: new Date(),
        category: 'rendering',
      });
    } catch (error) {
      console.error('Rendering metrics recording error:', error);
    }
  }

  private simulateMemoryUsage(): number {
    return 150 + Math.random() * 200; // 150-350 MB
  }

  private simulateCpuUsage(): number {
    return 30 + Math.random() * 50; // 30-80%
  }

  private simulateBatteryLevel(): number {
    return 20 + Math.random() * 80; // 20-100%
  }

  private simulateFrameTime(): number {
    const targetFps = this.currentProfile.settings.frameRate;
    const targetFrameTime = 1000 / targetFps;
    const variance = targetFrameTime * 0.2;
    return targetFrameTime + (Math.random() - 0.5) * variance;
  }

  private async measureNetworkLatency(): Promise<number> {
    try {
      const startTime = Date.now();
      // Simulate network ping
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
      return Date.now() - startTime;
    } catch (error) {
      return 2000; // Default high latency on error
    }
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Trim metrics if too many
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.splice(0, this.metrics.length - this.MAX_METRICS_HISTORY);
    }
  }

  private async handleMemoryPressure(memoryUsage: number): Promise<void> {
    console.log(`Memory pressure detected: ${memoryUsage}MB`);
    
    // Auto-optimization strategies
    await this.clearCaches();
    await this.reduceQualitySettings();
    
    this.notifyOptimizationCallbacks('memory_pressure', { memoryUsage });
  }

  private async handleHighCpuUsage(cpuUsage: number): Promise<void> {
    console.log(`High CPU usage detected: ${cpuUsage}%`);
    
    // Auto-optimization strategies
    await this.reduceFrameRate();
    await this.pauseNonEssentialOperations();
    
    this.notifyOptimizationCallbacks('high_cpu', { cpuUsage });
  }

  private async handleLowBattery(batteryLevel: number): Promise<void> {
    console.log(`Low battery detected: ${batteryLevel}%`);
    
    // Auto-optimization strategies
    await this.enableBatterySavingMode();
    
    this.notifyOptimizationCallbacks('low_battery', { batteryLevel });
  }

  private async handleHighLatency(latency: number): Promise<void> {
    console.log(`High network latency detected: ${latency}ms`);
    
    // Auto-optimization strategies
    await this.enableOfflineMode();
    await this.reduceNetworkOperations();
    
    this.notifyOptimizationCallbacks('high_latency', { latency });
  }

  // Optimization strategies
  private async clearCaches(): Promise<void> {
    try {
      // Clear app caches
      await AsyncStorage.multiRemove([
        'image_cache',
        'model_cache',
        'temp_data',
      ]);
      console.log('Caches cleared');
    } catch (error) {
      console.error('Cache clearing error:', error);
    }
  }

  private async reduceQualitySettings(): Promise<void> {
    const newSettings = { ...this.currentProfile.settings };
    
    if (newSettings.handTrackingQuality === 'high') {
      newSettings.handTrackingQuality = 'medium';
    } else if (newSettings.handTrackingQuality === 'medium') {
      newSettings.handTrackingQuality = 'low';
    }
    
    if (newSettings.renderingQuality === 'ultra') {
      newSettings.renderingQuality = 'high';
    } else if (newSettings.renderingQuality === 'high') {
      newSettings.renderingQuality = 'medium';
    }
    
    await this.updateProfileSettings(newSettings);
    console.log('Quality settings reduced');
  }

  private async reduceFrameRate(): Promise<void> {
    const newSettings = { ...this.currentProfile.settings };
    
    if (newSettings.frameRate === 120) {
      newSettings.frameRate = 60;
    } else if (newSettings.frameRate === 60) {
      newSettings.frameRate = 30;
    }
    
    await this.updateProfileSettings(newSettings);
    console.log(`Frame rate reduced to ${newSettings.frameRate}fps`);
  }

  private async pauseNonEssentialOperations(): Promise<void> {
    // Pause background tasks, reduce concurrent operations
    this.notifyOptimizationCallbacks('pause_non_essential', {});
    console.log('Non-essential operations paused');
  }

  private async enableBatterySavingMode(): Promise<void> {
    const newSettings = { ...this.currentProfile.settings };
    
    newSettings.handTrackingQuality = 'low';
    newSettings.renderingQuality = 'low';
    newSettings.frameRate = 30;
    newSettings.enableEffects = false;
    newSettings.enableAntialiasing = false;
    
    await this.updateProfileSettings(newSettings);
    console.log('Battery saving mode enabled');
  }

  private async enableOfflineMode(): Promise<void> {
    this.notifyOptimizationCallbacks('enable_offline_mode', {});
    console.log('Offline mode enabled due to high latency');
  }

  private async reduceNetworkOperations(): Promise<void> {
    this.notifyOptimizationCallbacks('reduce_network_ops', {});
    console.log('Network operations reduced');
  }

  // Public API
  async setPerformanceProfile(profileType: keyof typeof this.DEFAULT_PROFILES): Promise<void> {
    this.currentProfile = { ...this.DEFAULT_PROFILES[profileType] };
    await this.savePerformanceData();
    
    this.notifyOptimizationCallbacks('profile_changed', { profileType });
    console.log(`Performance profile set to: ${profileType}`);
  }

  async updateProfileSettings(settings: Partial<PerformanceProfile['settings']>): Promise<void> {
    this.currentProfile.settings = { ...this.currentProfile.settings, ...settings };
    await this.savePerformanceData();
    
    this.notifyOptimizationCallbacks('settings_updated', { settings });
  }

  getCurrentProfile(): PerformanceProfile {
    return { ...this.currentProfile };
  }

  getMetrics(category?: PerformanceMetric['category'], limit: number = 100): PerformanceMetric[] {
    let filteredMetrics = this.metrics;
    
    if (category) {
      filteredMetrics = this.metrics.filter(m => m.category === category);
    }
    
    return filteredMetrics.slice(-limit);
  }

  getAverageMetric(name: string, timeframeMinutes: number = 10): number {
    const cutoff = new Date(Date.now() - timeframeMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => 
      m.name === name && m.timestamp > cutoff
    );
    
    if (recentMetrics.length === 0) return 0;
    
    const sum = recentMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / recentMetrics.length;
  }

  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Analyze recent metrics and generate recommendations
    const avgMemory = this.getAverageMetric('memory_usage', 5);
    const avgCpu = this.getAverageMetric('cpu_usage', 5);
    const avgFps = this.getAverageMetric('frame_rate', 2);
    
    if (avgMemory > this.currentProfile.thresholds.maxMemoryUsage * 0.8) {
      recommendations.push({
        id: 'high_memory',
        type: 'memory',
        severity: 'medium',
        title: 'High Memory Usage',
        description: `Memory usage is at ${avgMemory.toFixed(1)}MB, approaching the limit`,
        action: 'Clear caches and reduce quality settings',
        automated: true,
        impact: 'medium',
      });
    }
    
    if (avgCpu > this.currentProfile.thresholds.maxCpuUsage * 0.8) {
      recommendations.push({
        id: 'high_cpu',
        type: 'cpu',
        severity: 'high',
        title: 'High CPU Usage',
        description: `CPU usage is at ${avgCpu.toFixed(1)}%, consider reducing processing load`,
        action: 'Reduce frame rate and pause background tasks',
        automated: true,
        impact: 'high',
      });
    }
    
    if (avgFps < this.currentProfile.settings.frameRate * 0.8) {
      recommendations.push({
        id: 'low_fps',
        type: 'cpu',
        severity: 'medium',
        title: 'Low Frame Rate',
        description: `Frame rate is ${avgFps.toFixed(1)}fps, below target of ${this.currentProfile.settings.frameRate}fps`,
        action: 'Optimize rendering settings',
        automated: false,
        impact: 'medium',
      });
    }
    
    return recommendations;
  }

  addOptimizationCallback(callback: Function): void {
    this.optimizationCallbacks.push(callback);
  }

  removeOptimizationCallback(callback: Function): void {
    const index = this.optimizationCallbacks.indexOf(callback);
    if (index > -1) {
      this.optimizationCallbacks.splice(index, 1);
    }
  }

  private notifyOptimizationCallbacks(event: string, data: any): void {
    this.optimizationCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Optimization callback error:', error);
      }
    });
  }

  private async getDeviceInfo(): Promise<any> {
    // Simulate device info collection
    return {
      model: 'Unknown',
      os: 'iOS',
      version: '15.0',
      memory: 4096, // MB
      cores: 6,
    };
  }

  private async hasSavedProfile(): Promise<boolean> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEY);
      return !!saved;
    } catch (error) {
      return false;
    }
  }

  private async loadPerformanceData(): Promise<void> {
    try {
      const [profileData, metricsData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.METRICS_STORAGE_KEY),
      ]);

      if (profileData) {
        this.currentProfile = JSON.parse(profileData);
      }

      if (metricsData) {
        this.metrics = JSON.parse(metricsData).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    } catch (error) {
      console.error('Load performance data error:', error);
    }
  }

  private async savePerformanceData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentProfile)),
        AsyncStorage.setItem(this.METRICS_STORAGE_KEY, JSON.stringify(this.metrics)),
      ]);
    } catch (error) {
      console.error('Save performance data error:', error);
    }
  }

  async exportPerformanceData(): Promise<string> {
    const exportData = {
      profile: this.currentProfile,
      metrics: this.metrics,
      recommendations: this.getOptimizationRecommendations(),
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  dispose(): void {
    this.stopMonitoring();
    this.optimizationCallbacks = [];
    this.metrics = [];
  }
}

export const performanceService = new PerformanceService();