import * as THREE from 'three';
import { Point3D, PointCloudData, MapRegion, SpatialAnchor } from '../store/slices/mappingSlice';

export interface LidarFrame {
  points: Point3D[];
  intensity: number[];
  timestamp: Date;
  devicePose: {
    position: Point3D;
    orientation: { x: number; y: number; z: number; w: number };
  };
}

export interface DepthFrame {
  width: number;
  height: number;
  depthData: Float32Array;
  rgbData?: Uint8Array;
  cameraIntrinsics: {
    fx: number;
    fy: number;
    cx: number;
    cy: number;
  };
  timestamp: Date;
}

export interface MappingConfig {
  maxPointCloudSize: number;
  voxelSize: number;
  enableLidar: boolean;
  enableDepthCamera: boolean;
  enableVisualOdometry: boolean;
  enableLoop: boolean;
  quality: 'low' | 'medium' | 'high';
}

export class MappingService {
  private pointCloud: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private scene: THREE.Scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  
  private accumulatedPoints: Point3D[] = [];
  private accumulatedColors: number[] = [];
  private spatialAnchors: Map<string, SpatialAnchor> = new Map();
  private keyframes: Map<string, any> = new Map();
  
  private isMapping: boolean = false;
  private currentConfig: MappingConfig;
  private trackingState: 'not_tracking' | 'limited' | 'normal' | 'relocating' = 'not_tracking';
  private lastPose: any = null;
  
  private voxelGrid: Map<string, Point3D> = new Map();
  private boundingBox = {
    min: new THREE.Vector3(-10, -10, -2),
    max: new THREE.Vector3(10, 10, 4),
  };

  constructor(config?: Partial<MappingConfig>) {
    this.currentConfig = {
      maxPointCloudSize: 100000,
      voxelSize: 0.05,
      enableLidar: true,
      enableDepthCamera: true,
      enableVisualOdometry: true,
      enableLoop: true,
      quality: 'medium',
      ...config,
    };

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.setupScene();
  }

  private setupScene(): void {
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Setup point cloud geometry and material
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
    });

    this.pointCloud = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.pointCloud);

    // Setup camera initial position
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);
  }

  async startMapping(mapName: string): Promise<void> {
    if (this.isMapping) {
      throw new Error('Mapping session already active');
    }

    try {
      // Initialize mapping systems
      await this.initializeSensors();
      
      this.isMapping = true;
      this.trackingState = 'normal';
      this.accumulatedPoints = [];
      this.accumulatedColors = [];
      this.voxelGrid.clear();
      this.spatialAnchors.clear();
      
      console.log(`Started mapping session: ${mapName}`);
    } catch (error) {
      console.error('Failed to start mapping:', error);
      throw error;
    }
  }

  async stopMapping(): Promise<MapRegion> {
    if (!this.isMapping) {
      throw new Error('No active mapping session');
    }

    try {
      this.isMapping = false;
      this.trackingState = 'not_tracking';

      // Generate final map data
      const mapRegion = await this.finalizeMap();
      
      console.log('Mapping session stopped');
      return mapRegion;
    } catch (error) {
      console.error('Failed to stop mapping:', error);
      throw error;
    }
  }

  async processLidarFrame(frame: LidarFrame): Promise<void> {
    if (!this.isMapping || !this.currentConfig.enableLidar) return;

    try {
      // Transform points to world coordinates
      const transformedPoints = this.transformPoints(frame.points, frame.devicePose);
      
      // Apply voxel grid filtering
      const filteredPoints = this.applyVoxelGridFilter(transformedPoints);
      
      // Add to accumulated point cloud
      this.addPointsToCloud(filteredPoints, frame.intensity);
      
      // Update tracking state based on point quality
      this.updateTrackingState(filteredPoints);
    } catch (error) {
      console.error('Error processing LiDAR frame:', error);
    }
  }

  async processDepthFrame(frame: DepthFrame): Promise<void> {
    if (!this.isMapping || !this.currentConfig.enableDepthCamera) return;

    try {
      // Convert depth image to point cloud
      const points = this.depthImageToPointCloud(frame);
      
      // Apply filtering and processing
      const filteredPoints = this.applyStatisticalOutlierFilter(points);
      
      // Transform and add to main cloud
      if (this.lastPose) {
        const transformedPoints = this.transformPoints(filteredPoints, this.lastPose);
        const voxelFiltered = this.applyVoxelGridFilter(transformedPoints);
        this.addPointsToCloud(voxelFiltered);
      }
    } catch (error) {
      console.error('Error processing depth frame:', error);
    }
  }

  private async initializeSensors(): Promise<void> {
    // Simulate sensor initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check sensor availability
    const sensors = {
      lidar: this.currentConfig.enableLidar && Math.random() > 0.3,
      depthCamera: this.currentConfig.enableDepthCamera && Math.random() > 0.2,
    };
    
    console.log('Sensors initialized:', sensors);
  }

  private transformPoints(points: Point3D[], pose: any): Point3D[] {
    const transformMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z);
    const quaternion = new THREE.Quaternion(
      pose.orientation.x,
      pose.orientation.y,
      pose.orientation.z,
      pose.orientation.w
    );

    transformMatrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));

    return points.map(point => {
      const vector = new THREE.Vector3(point.x, point.y, point.z);
      vector.applyMatrix4(transformMatrix);
      return { x: vector.x, y: vector.y, z: vector.z };
    });
  }

  private applyVoxelGridFilter(points: Point3D[]): Point3D[] {
    const voxelSize = this.currentConfig.voxelSize;
    const voxelMap = new Map<string, Point3D>();

    for (const point of points) {
      // Calculate voxel coordinates
      const voxelX = Math.floor(point.x / voxelSize);
      const voxelY = Math.floor(point.y / voxelSize);
      const voxelZ = Math.floor(point.z / voxelSize);
      const voxelKey = `${voxelX}_${voxelY}_${voxelZ}`;

      // Keep only one point per voxel (centroid averaging could be added)
      if (!voxelMap.has(voxelKey)) {
        voxelMap.set(voxelKey, point);
      }
    }

    return Array.from(voxelMap.values());
  }

  private applyStatisticalOutlierFilter(points: Point3D[]): Point3D[] {
    // Simple statistical outlier removal
    if (points.length < 10) return points;

    // Calculate mean distances
    const distances: number[] = [];
    for (let i = 0; i < points.length; i++) {
      let totalDistance = 0;
      let count = 0;
      
      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          const distance = this.euclideanDistance(points[i], points[j]);
          if (distance < 1.0) { // Only consider nearby points
            totalDistance += distance;
            count++;
          }
        }
      }
      
      distances.push(count > 0 ? totalDistance / count : 0);
    }

    // Calculate statistics
    const meanDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((a, b) => a + Math.pow(b - meanDistance, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // Filter outliers (points with distance > mean + 2*stdDev)
    const threshold = meanDistance + 2 * stdDev;
    return points.filter((_, i) => distances[i] <= threshold);
  }

  private euclideanDistance(p1: Point3D, p2: Point3D): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }

  private depthImageToPointCloud(frame: DepthFrame): Point3D[] {
    const points: Point3D[] = [];
    const { width, height, depthData, cameraIntrinsics } = frame;

    for (let v = 0; v < height; v++) {
      for (let u = 0; u < width; u++) {
        const index = v * width + u;
        const depth = depthData[index];

        if (depth > 0.1 && depth < 10.0) { // Valid depth range
          // Convert pixel coordinates to 3D point
          const x = (u - cameraIntrinsics.cx) * depth / cameraIntrinsics.fx;
          const y = (v - cameraIntrinsics.cy) * depth / cameraIntrinsics.fy;
          const z = depth;

          points.push({ x, y: -y, z }); // Flip Y for standard coordinate system
        }
      }
    }

    return points;
  }

  private addPointsToCloud(points: Point3D[], intensity?: number[]): void {
    // Check if we're exceeding max point cloud size
    const totalPoints = this.accumulatedPoints.length + points.length;
    if (totalPoints > this.currentConfig.maxPointCloudSize) {
      // Remove oldest points (FIFO)
      const pointsToRemove = totalPoints - this.currentConfig.maxPointCloudSize;
      this.accumulatedPoints.splice(0, pointsToRemove);
      this.accumulatedColors.splice(0, pointsToRemove * 3);
    }

    // Add new points
    this.accumulatedPoints.push(...points);

    // Generate colors based on intensity or height
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      if (intensity && intensity[i] !== undefined) {
        // Color based on intensity
        const normalizedIntensity = Math.max(0, Math.min(1, intensity[i] / 255));
        this.accumulatedColors.push(normalizedIntensity, normalizedIntensity, normalizedIntensity);
      } else {
        // Color based on height (z-coordinate)
        const normalizedHeight = (point.z - this.boundingBox.min.z) / 
                                (this.boundingBox.max.z - this.boundingBox.min.z);
        const color = this.heightToColor(normalizedHeight);
        this.accumulatedColors.push(color.r, color.g, color.b);
      }
    }

    // Update Three.js geometry
    this.updatePointCloudGeometry();
  }

  private heightToColor(normalizedHeight: number): { r: number; g: number; b: number } {
    // Create a color gradient from blue (low) to red (high)
    const clamped = Math.max(0, Math.min(1, normalizedHeight));
    
    if (clamped < 0.5) {
      return {
        r: 0,
        g: clamped * 2,
        b: 1 - clamped * 2,
      };
    } else {
      return {
        r: (clamped - 0.5) * 2,
        g: 1 - (clamped - 0.5) * 2,
        b: 0,
      };
    }
  }

  private updatePointCloudGeometry(): void {
    if (!this.geometry || !this.pointCloud) return;

    // Convert points to Float32Array for Three.js
    const positions = new Float32Array(this.accumulatedPoints.length * 3);
    const colors = new Float32Array(this.accumulatedColors);

    for (let i = 0; i < this.accumulatedPoints.length; i++) {
      const point = this.accumulatedPoints[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.computeBoundingBox();
  }

  private updateTrackingState(points: Point3D[]): void {
    const pointCount = points.length;
    
    if (pointCount < 100) {
      this.trackingState = 'limited';
    } else if (pointCount < 50) {
      this.trackingState = 'relocating';
    } else {
      this.trackingState = 'normal';
    }
  }

  private async finalizeMap(): Promise<MapRegion> {
    // Calculate final bounding box
    const bounds = this.calculateBoundingBox();
    
    return {
      id: `map_${Date.now()}`,
      name: `Map ${new Date().toLocaleString()}`,
      bounds,
      pointCount: this.accumulatedPoints.length,
      createdAt: new Date(),
      isActive: false,
    };
  }

  private calculateBoundingBox(): { min: Point3D; max: Point3D } {
    if (this.accumulatedPoints.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 },
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const point of this.accumulatedPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      maxZ = Math.max(maxZ, point.z);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  async createSpatialAnchor(position: Point3D, description?: string): Promise<SpatialAnchor> {
    const anchor: SpatialAnchor = {
      id: `anchor_${Date.now()}`,
      position,
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      confidence: 0.9,
      type: 'manual',
      description,
      createdAt: new Date(),
    };

    this.spatialAnchors.set(anchor.id, anchor);
    return anchor;
  }

  getCurrentPointCloud(): PointCloudData | null {
    if (this.accumulatedPoints.length === 0) return null;

    return {
      points: [...this.accumulatedPoints],
      colors: [...this.accumulatedColors],
      timestamp: new Date(),
    };
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  updateCamera(pose: any): void {
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.quaternion.set(
      pose.orientation.x,
      pose.orientation.y,
      pose.orientation.z,
      pose.orientation.w
    );
    this.lastPose = pose;
  }

  render(): void {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateConfig(config: Partial<MappingConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
  }

  getTrackingState(): string {
    return this.trackingState;
  }

  getMappingQuality(): number {
    const pointCount = this.accumulatedPoints.length;
    const maxPoints = this.currentConfig.maxPointCloudSize;
    return Math.min(1.0, pointCount / (maxPoints * 0.1));
  }

  exportPointCloud(): string {
    // Export in PLY format
    const header = [
      'ply',
      'format ascii 1.0',
      `element vertex ${this.accumulatedPoints.length}`,
      'property float x',
      'property float y',
      'property float z',
      'property uchar red',
      'property uchar green',
      'property uchar blue',
      'end_header',
    ].join('\n');

    const vertices = this.accumulatedPoints.map((point, i) => {
      const r = Math.floor(this.accumulatedColors[i * 3] * 255);
      const g = Math.floor(this.accumulatedColors[i * 3 + 1] * 255);
      const b = Math.floor(this.accumulatedColors[i * 3 + 2] * 255);
      return `${point.x} ${point.y} ${point.z} ${r} ${g} ${b}`;
    }).join('\n');

    return header + '\n' + vertices;
  }

  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    
    this.accumulatedPoints = [];
    this.accumulatedColors = [];
    this.spatialAnchors.clear();
    this.voxelGrid.clear();
    this.isMapping = false;
  }
}

export const mappingService = new MappingService();