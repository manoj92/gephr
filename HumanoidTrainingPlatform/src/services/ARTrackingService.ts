import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import { HandPose, RobotState } from '../types';
import { mediaPipeIntegration } from './MediaPipeIntegration';

interface ARConfig {
  enablePlaneDetection: boolean;
  enableLightEstimation: boolean;
  enableHandTracking: boolean;
  enableObjectTracking: boolean;
  worldAlignment: 'gravity' | 'gravityAndHeading' | 'camera';
}

interface PlaneAnchor {
  id: string;
  transform: number[]; // 4x4 transformation matrix
  extent: { width: number; height: number };
  alignment: 'horizontal' | 'vertical';
  confidence: number;
}

interface LightEstimate {
  ambientIntensity: number;
  ambientColorTemperature: number;
  directionalIntensity: number;
  directionalDirection: [number, number, number];
}

interface ARFrame {
  timestamp: number;
  cameraTransform: number[]; // 4x4 camera pose matrix
  cameraIntrinsics: {
    fx: number;
    fy: number;
    cx: number;
    cy: number;
  };
  detectedPlanes: PlaneAnchor[];
  lightEstimate: LightEstimate;
  handPoses: HandPose[];
  trackedObjects: any[];
}

export class ARTrackingService {
  private isInitialized = false;
  private config: ARConfig;
  private currentFrame: ARFrame | null = null;
  private frameCallbacks: ((frame: ARFrame) => void)[] = [];
  private planeAnchors: Map<string, PlaneAnchor> = new Map();
  private worldOrigin: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; // Identity matrix
  private isTracking = false;
  
  constructor(config?: Partial<ARConfig>) {
    this.config = {
      enablePlaneDetection: true,
      enableLightEstimation: true,
      enableHandTracking: true,
      enableObjectTracking: false,
      worldAlignment: 'gravityAndHeading',
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Initialize MediaPipe for hand tracking
      if (this.config.enableHandTracking) {
        await mediaPipeIntegration.initialize();
      }
      
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission required for AR tracking');
      }
      
      this.isInitialized = true;
      console.log('AR Tracking Service initialized');
    } catch (error) {
      console.error('Failed to initialize AR tracking:', error);
      throw error;
    }
  }

  async startTracking(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AR Tracking not initialized');
    }
    
    this.isTracking = true;
    this.startTrackingLoop();
    console.log('AR tracking started');
  }

  stopTracking(): void {
    this.isTracking = false;
    console.log('AR tracking stopped');
  }

  private async startTrackingLoop(): Promise<void> {
    const trackingLoop = async () => {
      if (!this.isTracking) return;
      
      try {
        const frame = await this.processCurrentFrame();
        this.currentFrame = frame;
        
        // Notify callbacks
        this.frameCallbacks.forEach(callback => {
          try {
            callback(frame);
          } catch (error) {
            console.error('Error in AR frame callback:', error);
          }
        });
      } catch (error) {
        console.error('Error in AR tracking loop:', error);
      }
      
      // Continue loop
      if (this.isTracking) {
        requestAnimationFrame(trackingLoop);
      }
    };
    
    trackingLoop();
  }

  private async processCurrentFrame(): Promise<ARFrame> {
    const timestamp = Date.now();
    
    // Mock camera transform (in real implementation, this would come from ARKit/ARCore)
    const cameraTransform = this.generateMockCameraTransform();
    
    // Mock camera intrinsics
    const cameraIntrinsics = {
      fx: 1200,
      fy: 1200,
      cx: 640,
      cy: 360
    };
    
    // Detect planes
    const detectedPlanes = this.config.enablePlaneDetection ? 
      await this.detectPlanes() : [];
    
    // Estimate lighting
    const lightEstimate = this.config.enableLightEstimation ? 
      await this.estimateLighting() : this.getDefaultLightEstimate();
    
    // Track hands
    const handPoses = this.config.enableHandTracking ? 
      await this.trackHands() : [];
    
    // Track objects
    const trackedObjects = this.config.enableObjectTracking ? 
      await this.trackObjects() : [];
    
    return {
      timestamp,
      cameraTransform,
      cameraIntrinsics,
      detectedPlanes,
      lightEstimate,
      handPoses,
      trackedObjects
    };
  }

  private generateMockCameraTransform(): number[] {
    // Generate a mock camera pose (in real implementation, this comes from SLAM)
    const time = Date.now() / 1000;
    const x = Math.sin(time * 0.1) * 0.1;
    const y = Math.cos(time * 0.15) * 0.05;
    const z = 0.5;
    
    return [
      1, 0, 0, x,
      0, 1, 0, y,
      0, 0, 1, z,
      0, 0, 0, 1
    ];
  }

  private async detectPlanes(): Promise<PlaneAnchor[]> {
    // Mock plane detection (in real implementation, this would use ARKit/ARCore)
    const planes: PlaneAnchor[] = [];
    
    // Add a horizontal floor plane
    if (Math.random() > 0.5) { // Simulate detection probability
      planes.push({
        id: 'floor_plane',
        transform: [
          1, 0, 0, 0,
          0, 1, 0, -0.5, // 50cm below camera
          0, 0, 1, 1,
          0, 0, 0, 1
        ],
        extent: { width: 2.0, height: 2.0 },
        alignment: 'horizontal',
        confidence: 0.85
      });
    }
    
    // Add a vertical wall plane
    if (Math.random() > 0.7) {
      planes.push({
        id: 'wall_plane',
        transform: [
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, -1, 0, 2, // 2m in front of camera
          0, 0, 0, 1
        ],
        extent: { width: 3.0, height: 2.5 },
        alignment: 'vertical',
        confidence: 0.75
      });
    }
    
    // Update anchors map
    planes.forEach(plane => {
      this.planeAnchors.set(plane.id, plane);
    });
    
    return planes;
  }

  private async estimateLighting(): Promise<LightEstimate> {
    // Mock light estimation (in real implementation, this would use camera data)
    return {
      ambientIntensity: 0.6 + Math.random() * 0.4,
      ambientColorTemperature: 5000 + Math.random() * 2000,
      directionalIntensity: 0.8,
      directionalDirection: [0.3, -0.7, 0.6] // Normalized direction vector
    };
  }

  private getDefaultLightEstimate(): LightEstimate {
    return {
      ambientIntensity: 0.8,
      ambientColorTemperature: 6500,
      directionalIntensity: 1.0,
      directionalDirection: [0, -1, 0]
    };
  }

  private async trackHands(): Promise<HandPose[]> {
    try {
      // In real implementation, this would process camera frame
      // For now, we'll return mock data or use MediaPipe if available
      if (mediaPipeIntegration) {
        // Mock image data (in real implementation, this would be camera frame)
        const mockImageData = new ImageData(640, 480);
        const result = await mediaPipeIntegration.processImage(mockImageData);
        return mediaPipeIntegration.convertToHandPose(result);
      }
      return [];
    } catch (error) {
      console.error('Hand tracking error:', error);
      return [];
    }
  }

  private async trackObjects(): Promise<any[]> {
    // Mock object tracking (in real implementation, this would track specific objects)
    return [];
  }

  addFrameCallback(callback: (frame: ARFrame) => void): void {
    this.frameCallbacks.push(callback);
  }

  removeFrameCallback(callback: (frame: ARFrame) => void): void {
    const index = this.frameCallbacks.indexOf(callback);
    if (index > -1) {
      this.frameCallbacks.splice(index, 1);
    }
  }

  getCurrentFrame(): ARFrame | null {
    return this.currentFrame;
  }

  getDetectedPlanes(): PlaneAnchor[] {
    return Array.from(this.planeAnchors.values());
  }

  addAnchor(id: string, transform: number[]): void {
    // Add a custom anchor point in 3D space
    const anchor: PlaneAnchor = {
      id,
      transform,
      extent: { width: 0.1, height: 0.1 },
      alignment: 'horizontal',
      confidence: 1.0
    };
    
    this.planeAnchors.set(id, anchor);
  }

  removeAnchor(id: string): boolean {
    return this.planeAnchors.delete(id);
  }

  worldToScreen(worldPosition: [number, number, number]): { x: number; y: number } | null {
    if (!this.currentFrame) return null;
    
    const { cameraTransform, cameraIntrinsics } = this.currentFrame;
    
    // Transform world point to camera space
    const cameraPoint = this.transformPoint(worldPosition, cameraTransform);
    
    // Project to screen space
    const { fx, fy, cx, cy } = cameraIntrinsics;
    const x = (cameraPoint[0] * fx) / cameraPoint[2] + cx;
    const y = (cameraPoint[1] * fy) / cameraPoint[2] + cy;
    
    return { x, y };
  }

  screenToWorld(
    screenPosition: { x: number; y: number },
    depth: number = 1.0
  ): [number, number, number] | null {
    if (!this.currentFrame) return null;
    
    const { cameraTransform, cameraIntrinsics } = this.currentFrame;
    const { fx, fy, cx, cy } = cameraIntrinsics;
    
    // Unproject from screen to camera space
    const cameraX = (screenPosition.x - cx) * depth / fx;
    const cameraY = (screenPosition.y - cy) * depth / fy;
    const cameraZ = depth;
    
    // Transform to world space
    const worldPoint = this.transformPoint([cameraX, cameraY, cameraZ], cameraTransform);
    
    return worldPoint;
  }

  private transformPoint(point: [number, number, number], matrix: number[]): [number, number, number] {
    // Apply 4x4 transformation matrix to 3D point
    const [x, y, z] = point;
    
    const newX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    const newY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    const newZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    
    return [newX / w, newY / w, newZ / w];
  }

  hitTest(screenPosition: { x: number; y: number }): PlaneAnchor | null {
    // Test if screen position hits any detected planes
    const worldRay = this.screenToWorld(screenPosition, 1.0);
    if (!worldRay) return null;
    
    // Find closest plane intersection (simplified)
    let closestPlane: PlaneAnchor | null = null;
    let closestDistance = Infinity;
    
    for (const plane of this.planeAnchors.values()) {
      // Extract plane position from transform matrix
      const planePosition = [plane.transform[12], plane.transform[13], plane.transform[14]];
      const distance = Math.sqrt(
        Math.pow(worldRay[0] - planePosition[0], 2) +
        Math.pow(worldRay[1] - planePosition[1], 2) +
        Math.pow(worldRay[2] - planePosition[2], 2)
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlane = plane;
      }
    }
    
    return closestDistance < 0.5 ? closestPlane : null; // Within 50cm
  }

  updateConfig(newConfig: Partial<ARConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ARConfig {
    return { ...this.config };
  }

  getTrackingQuality(): {
    overall: number;
    pose: number;
    lighting: number;
    planes: number;
  } {
    // Mock tracking quality metrics
    return {
      overall: 0.85,
      pose: 0.9,
      lighting: 0.8,
      planes: 0.85
    };
  }

  cleanup(): void {
    this.stopTracking();
    this.frameCallbacks = [];
    this.planeAnchors.clear();
    this.currentFrame = null;
  }
}

// Singleton instance
export const arTrackingService = new ARTrackingService();
export default arTrackingService;