import { Camera, CameraType } from 'expo-camera';
import { HandPose } from '../types';
import { mediaPipeIntegration } from './MediaPipeIntegration';

interface CameraDevice {
  id: string;
  type: any;
  position: 'front' | 'back' | 'external';
  isActive: boolean;
  lastFrame: any;
  frameRate: number;
  resolution: { width: number; height: number };
}

interface SyncConfig {
  maxLatencyMs: number;
  frameSyncMode: 'timestamp' | 'frame_number' | 'adaptive';
  interpolation: boolean;
  maxCameras: number;
}

interface SyncedFrame {
  timestamp: number;
  frames: Map<string, any>;
  handPoses: Map<string, HandPose[]>;
  syncQuality: number; // 0-1 quality metric
}

export class MultiCameraSyncService {
  private cameras: Map<string, CameraDevice> = new Map();
  private syncConfig: SyncConfig;
  private frameBuffer: Map<string, Array<{ timestamp: number; frame: any }>> = new Map();
  private syncedFrameCallback: ((frame: SyncedFrame) => void) | null = null;
  private masterCameraId: string | null = null;
  private isRecording = false;
  private syncOffset: Map<string, number> = new Map(); // Time offset for each camera
  private frameCounter = 0;
  
  constructor(config?: Partial<SyncConfig>) {
    this.syncConfig = {
      maxLatencyMs: 50,
      frameSyncMode: 'timestamp',
      interpolation: true,
      maxCameras: 4,
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Request camera permissions
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission not granted');
    }
    
    // Initialize MediaPipe for hand tracking
    await mediaPipeIntegration.initialize();
    
    console.log('Multi-camera sync service initialized');
  }

  async discoverCameras(): Promise<CameraDevice[]> {
    const devices: CameraDevice[] = [];
    
    // Add front camera
    devices.push({
      id: 'camera_front',
      type: 'front' as any,
      position: 'front',
      isActive: false,
      lastFrame: null,
      frameRate: 30,
      resolution: { width: 1920, height: 1080 }
    });
    
    // Add back camera
    devices.push({
      id: 'camera_back',
      type: 'back' as any,
      position: 'back',
      isActive: false,
      lastFrame: null,
      frameRate: 30,
      resolution: { width: 1920, height: 1080 }
    });
    
    // Check for external cameras (would need platform-specific implementation)
    // This is a placeholder for external camera detection
    if (this.detectExternalCameras()) {
      devices.push({
        id: 'camera_external_1',
        type: 'back' as any,
        position: 'external',
        isActive: false,
        lastFrame: null,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 }
      });
    }
    
    devices.forEach(device => {
      this.cameras.set(device.id, device);
      this.frameBuffer.set(device.id, []);
      this.syncOffset.set(device.id, 0);
    });
    
    return devices;
  }

  private detectExternalCameras(): boolean {
    // Placeholder for external camera detection
    // In a real implementation, this would check for USB/wireless cameras
    return false;
  }

  async addCamera(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    if (this.getActiveCameras().length >= this.syncConfig.maxCameras) {
      throw new Error(`Maximum number of cameras (${this.syncConfig.maxCameras}) reached`);
    }
    
    camera.isActive = true;
    
    // Set first camera as master
    if (!this.masterCameraId) {
      this.masterCameraId = cameraId;
    }
    
    console.log(`Camera ${cameraId} added to sync group`);
  }

  async removeCamera(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      camera.isActive = false;
      
      // Clear frame buffer for this camera
      this.frameBuffer.set(cameraId, []);
      
      // Select new master if needed
      if (this.masterCameraId === cameraId) {
        const activeCameras = this.getActiveCameras();
        this.masterCameraId = activeCameras.length > 0 ? activeCameras[0].id : null;
      }
    }
  }

  async calibrateCameras(): Promise<void> {
    console.log('Starting camera calibration...');
    
    const activeCameras = this.getActiveCameras();
    if (activeCameras.length < 2) {
      throw new Error('At least 2 cameras required for calibration');
    }
    
    // Capture calibration frames from all cameras
    const calibrationFrames = new Map<string, any[]>();
    
    for (const camera of activeCameras) {
      calibrationFrames.set(camera.id, []);
    }
    
    // Collect 30 frames for calibration
    for (let i = 0; i < 30; i++) {
      await this.captureCalibrationFrame(calibrationFrames);
      await this.delay(33); // ~30 fps
    }
    
    // Calculate time offsets between cameras
    this.calculateSyncOffsets(calibrationFrames);
    
    console.log('Camera calibration complete');
  }

  private async captureCalibrationFrame(calibrationFrames: Map<string, any[]>): Promise<void> {
    const timestamp = Date.now();
    
    for (const [cameraId, frames] of calibrationFrames) {
      // Simulate frame capture (in real implementation, would capture from actual camera)
      frames.push({
        timestamp,
        data: `calibration_frame_${cameraId}_${timestamp}`
      });
    }
  }

  private calculateSyncOffsets(calibrationFrames: Map<string, any[]>): void {
    if (!this.masterCameraId) return;
    
    const masterFrames = calibrationFrames.get(this.masterCameraId);
    if (!masterFrames) return;
    
    for (const [cameraId, frames] of calibrationFrames) {
      if (cameraId === this.masterCameraId) continue;
      
      // Calculate average time offset
      let totalOffset = 0;
      let count = 0;
      
      for (let i = 0; i < Math.min(masterFrames.length, frames.length); i++) {
        const offset = frames[i].timestamp - masterFrames[i].timestamp;
        totalOffset += offset;
        count++;
      }
      
      const avgOffset = count > 0 ? totalOffset / count : 0;
      this.syncOffset.set(cameraId, avgOffset);
      
      console.log(`Camera ${cameraId} sync offset: ${avgOffset}ms`);
    }
  }

  async processFrame(cameraId: string, frame: any): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera || !camera.isActive) return;
    
    const timestamp = Date.now();
    const adjustedTimestamp = timestamp - (this.syncOffset.get(cameraId) || 0);
    
    // Add frame to buffer
    const buffer = this.frameBuffer.get(cameraId) || [];
    buffer.push({ timestamp: adjustedTimestamp, frame });
    
    // Keep only recent frames (last 100ms)
    const cutoffTime = adjustedTimestamp - 100;
    const recentFrames = buffer.filter(f => f.timestamp > cutoffTime);
    this.frameBuffer.set(cameraId, recentFrames);
    
    // Update camera info
    camera.lastFrame = frame;
    
    // Try to sync frames
    if (this.isRecording) {
      this.attemptFrameSync();
    }
  }

  private attemptFrameSync(): void {
    const activeCameras = this.getActiveCameras();
    if (activeCameras.length === 0) return;
    
    const currentTime = Date.now();
    const syncedFrame: SyncedFrame = {
      timestamp: currentTime,
      frames: new Map(),
      handPoses: new Map(),
      syncQuality: 0
    };
    
    let totalLatency = 0;
    let frameCount = 0;
    
    for (const camera of activeCameras) {
      const buffer = this.frameBuffer.get(camera.id) || [];
      if (buffer.length === 0) continue;
      
      // Find frame closest to current time
      let closestFrame = buffer[0];
      let minDiff = Math.abs(buffer[0].timestamp - currentTime);
      
      for (const bufferedFrame of buffer) {
        const diff = Math.abs(bufferedFrame.timestamp - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestFrame = bufferedFrame;
        }
      }
      
      if (minDiff <= this.syncConfig.maxLatencyMs) {
        syncedFrame.frames.set(camera.id, closestFrame.frame);
        totalLatency += minDiff;
        frameCount++;
        
        // Process hand tracking for this frame
        this.processHandTracking(camera.id, closestFrame.frame, syncedFrame);
      }
    }
    
    // Calculate sync quality
    if (frameCount > 0) {
      const avgLatency = totalLatency / frameCount;
      syncedFrame.syncQuality = 1 - (avgLatency / this.syncConfig.maxLatencyMs);
      
      // Trigger callback with synced frame
      if (this.syncedFrameCallback && frameCount === activeCameras.length) {
        this.syncedFrameCallback(syncedFrame);
      }
    }
  }

  private async processHandTracking(
    cameraId: string,
    frame: any,
    syncedFrame: SyncedFrame
  ): Promise<void> {
    try {
      // Process frame with MediaPipe
      const result = await mediaPipeIntegration.processImage(frame);
      const handPoses = mediaPipeIntegration.convertToHandPose(result);
      
      syncedFrame.handPoses.set(cameraId, handPoses);
    } catch (error) {
      console.error(`Hand tracking failed for camera ${cameraId}:`, error);
    }
  }

  startRecording(callback: (frame: SyncedFrame) => void): void {
    this.syncedFrameCallback = callback;
    this.isRecording = true;
    this.frameCounter = 0;
    
    console.log('Multi-camera recording started');
  }

  stopRecording(): void {
    this.isRecording = false;
    this.syncedFrameCallback = null;
    
    // Clear all frame buffers
    for (const [cameraId] of this.frameBuffer) {
      this.frameBuffer.set(cameraId, []);
    }
    
    console.log(`Multi-camera recording stopped. Total frames: ${this.frameCounter}`);
  }

  getActiveCameras(): CameraDevice[] {
    return Array.from(this.cameras.values()).filter(cam => cam.isActive);
  }

  getCameraStatus(cameraId: string): CameraDevice | undefined {
    return this.cameras.get(cameraId);
  }

  getSyncMetrics(): {
    activeCameras: number;
    avgSyncQuality: number;
    totalFrames: number;
    syncOffsets: Map<string, number>;
  } {
    const activeCameras = this.getActiveCameras();
    
    return {
      activeCameras: activeCameras.length,
      avgSyncQuality: 0.95, // Placeholder
      totalFrames: this.frameCounter,
      syncOffsets: new Map(this.syncOffset)
    };
  }

  async exportSyncedRecording(format: 'mp4' | 'frames'): Promise<Blob> {
    // Placeholder for export functionality
    console.log(`Exporting recording in ${format} format`);
    
    return new Blob(['exported_data'], { type: 'application/octet-stream' });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
  }

  cleanup(): void {
    this.stopRecording();
    this.cameras.clear();
    this.frameBuffer.clear();
    this.syncOffset.clear();
  }
}

// Singleton instance
export const multiCameraSync = new MultiCameraSyncService();
export default multiCameraSync;