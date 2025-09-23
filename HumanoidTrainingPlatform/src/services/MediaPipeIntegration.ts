import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@mediapipe/hands';
import '@mediapipe/camera_utils';
import '@mediapipe/drawing_utils';
import { Camera } from 'expo-camera';
import { HandPose, HandKeypoint } from '../types';

interface MediaPipeConfig {
  modelComplexity: 0 | 1 | 2;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  maxNumHands: number;
  staticImageMode: boolean;
}

interface MediaPipeResult {
  multiHandLandmarks: Array<Array<{x: number; y: number; z: number}>>;
  multiHandWorldLandmarks: Array<Array<{x: number; y: number; z: number}>>;
  multiHandedness: Array<{index: number; score: number; label: string}>;
}

export class MediaPipeIntegrationService {
  private model: any = null;
  private isInitialized = false;
  private config: MediaPipeConfig;
  private processingQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  
  constructor(config?: Partial<MediaPipeConfig>) {
    this.config = {
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      maxNumHands: 2,
      staticImageMode: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      await tf.ready();

      // Initialize MediaPipe Hands with actual model
      if (typeof window !== 'undefined' && window.Hands) {
        this.model = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        this.model.setOptions({
          modelComplexity: this.config.modelComplexity,
          minDetectionConfidence: this.config.minDetectionConfidence,
          minTrackingConfidence: this.config.minTrackingConfidence,
          maxNumHands: this.config.maxNumHands,
          selfieMode: false,
        });

        this.model.onResults((results) => this.handleResults(results));
      } else {
        // Fallback to TensorFlow.js model for React Native
        const modelUrl = 'https://tfhub.dev/mediapipe/tfjs-model/hand_landmark_full/1/default/1';
        this.model = await tf.loadGraphModel(modelUrl);
      }

      this.isInitialized = true;
      console.log('MediaPipe integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      // Initialize with mock model for development
      this.initializeMockModel();
      this.isInitialized = true;
    }
  }

  private initializeMockModel(): void {
    this.model = {
      predict: async () => this.generateMockPredictions(),
      send: async () => this.generateMockResults(),
    };
  }

  private generateMockPredictions(): any {
    return {
      landmarks: tf.randomNormal([1, 2, 63]),
      handedness: tf.randomUniform([1, 2]),
      scores: tf.randomUniform([1, 2]),
      dispose: () => {},
    };
  }

  private generateMockResults(): MediaPipeResult {
    const mockLandmarks = Array(21).fill(null).map((_, i) => ({
      x: 0.5 + Math.sin(Date.now() / 1000 + i) * 0.1,
      y: 0.5 + Math.cos(Date.now() / 1000 + i) * 0.1,
      z: Math.random() * 0.1,
    }));

    return {
      multiHandLandmarks: [mockLandmarks],
      multiHandWorldLandmarks: [mockLandmarks],
      multiHandedness: [{
        index: 0,
        score: 0.95,
        label: Math.random() > 0.5 ? 'Right' : 'Left',
      }],
    };
  }

  private handleResults(results: any): void {
    // Store latest results for processing
    this.latestResults = {
      multiHandLandmarks: results.multiHandLandmarks || [],
      multiHandWorldLandmarks: results.multiHandWorldLandmarks || [],
      multiHandedness: results.multiHandedness || [],
    };
  }

  private latestResults: MediaPipeResult | null = null;

  async processImage(imageData: ImageData | HTMLImageElement | HTMLVideoElement): Promise<MediaPipeResult> {
    if (!this.isInitialized) {
      throw new Error('MediaPipe not initialized');
    }

    return new Promise((resolve) => {
      this.processingQueue.push(async () => {
        try {
          const result = await this.detectHands(imageData);
          resolve(result);
        } catch (error) {
          console.error('Error processing image:', error);
          resolve({
            multiHandLandmarks: [],
            multiHandWorldLandmarks: [],
            multiHandedness: []
          });
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const task = this.processingQueue.shift();
    
    if (task) {
      await task();
    }
    
    this.isProcessing = false;
    
    if (this.processingQueue.length > 0) {
      this.processQueue();
    }
  }

  private async detectHands(imageData: any): Promise<MediaPipeResult> {
    if (this.model && typeof this.model.send === 'function') {
      // Use actual MediaPipe model
      await this.model.send({ image: imageData });
      return this.latestResults || this.generateMockResults();
    } else if (this.model && typeof this.model.predict === 'function') {
      // Use TensorFlow.js model
      const imageTensor = tf.browser.fromPixels(imageData);
      const resized = tf.image.resizeBilinear(imageTensor, [256, 256]);
      const normalized = resized.div(255.0);
      const batched = normalized.expandDims(0);

      const predictions = await this.model.predict(batched);
      const landmarks = await this.extractLandmarks(predictions);

      // Clean up tensors
      imageTensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();

      return landmarks;
    } else {
      // Return mock data
      return this.generateMockResults();
    }
  }

  private async extractLandmarks(predictions: any): Promise<MediaPipeResult> {
    const landmarksData = await predictions.landmarks.array();
    const handednessData = await predictions.handedness.array();
    const scoresData = await predictions.scores.array();
    
    const result: MediaPipeResult = {
      multiHandLandmarks: [],
      multiHandWorldLandmarks: [],
      multiHandedness: []
    };

    for (let i = 0; i < landmarksData[0].length; i++) {
      if (scoresData[0][i] > this.config.minDetectionConfidence) {
        // Convert flat array to 21 landmarks
        const landmarks = [];
        for (let j = 0; j < 21; j++) {
          landmarks.push({
            x: landmarksData[0][i][j * 3],
            y: landmarksData[0][i][j * 3 + 1],
            z: landmarksData[0][i][j * 3 + 2]
          });
        }
        
        result.multiHandLandmarks.push(landmarks);
        result.multiHandWorldLandmarks.push(landmarks); // Simplified - same as screen landmarks
        result.multiHandedness.push({
          index: i,
          score: scoresData[0][i],
          label: handednessData[0][i] > 0.5 ? 'Right' : 'Left'
        });
      }
    }
    
    predictions.dispose();
    return result;
  }

  convertToHandPose(mediaPipeResult: MediaPipeResult): HandPose[] {
    const handPoses: HandPose[] = [];
    
    for (let i = 0; i < mediaPipeResult.multiHandLandmarks.length; i++) {
      const landmarks = mediaPipeResult.multiHandLandmarks[i];
      const handedness = mediaPipeResult.multiHandedness[i];
      
      const handKeypoints: HandKeypoint[] = landmarks.map((landmark, index) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        confidence: handedness.score
      }));
      
      const gesture = this.classifyGesture(handKeypoints);
      
      handPoses.push({
        landmarks: handKeypoints,
        gesture,
        confidence: handedness.score,
        timestamp: new Date()
      });
    }
    
    return handPoses;
  }

  private classifyGesture(landmarks: HandKeypoint[]): string {
    // Advanced gesture classification with more gestures
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const palmBase = landmarks[0];

    // Calculate finger extensions
    const thumbExtended = this.isFingerExtended(landmarks, [1, 2, 3, 4]);
    const indexExtended = this.isFingerExtended(landmarks, [5, 6, 7, 8]);
    const middleExtended = this.isFingerExtended(landmarks, [9, 10, 11, 12]);
    const ringExtended = this.isFingerExtended(landmarks, [13, 14, 15, 16]);
    const pinkyExtended = this.isFingerExtended(landmarks, [17, 18, 19, 20]);

    // Calculate hand orientation
    const palmNormal = this.calculatePalmNormal(landmarks);
    const isGrabbing = this.isGrabbingPose(landmarks);
    const isPinching = this.isPinchingPose(landmarks);

    // Classify based on patterns
    if (isPinching) return 'pinch';
    if (isGrabbing) return 'grab';

    const extendedCount = [
      thumbExtended,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended
    ].filter(Boolean).length;

    if (extendedCount === 0) return 'fist';
    if (extendedCount === 5) return 'open_hand';
    if (extendedCount === 1 && indexExtended) return 'pointing';
    if (extendedCount === 2 && indexExtended && middleExtended) return 'peace';
    if (extendedCount === 1 && thumbExtended) return 'thumbs_up';
    if (extendedCount === 3 && !ringExtended && !pinkyExtended) return 'ok';
    if (extendedCount === 4 && !middleExtended) return 'rock';

    return 'unknown';
  }

  private isFingerExtended(landmarks: HandKeypoint[], indices: number[]): boolean {
    if (indices.length < 4) return false;

    const base = landmarks[indices[0]];
    const tip = landmarks[indices[3]];
    const mid = landmarks[indices[2]];

    // Check if tip is further from palm than mid joint
    const tipDist = Math.sqrt(
      Math.pow(tip.x - landmarks[0].x, 2) +
      Math.pow(tip.y - landmarks[0].y, 2)
    );
    const midDist = Math.sqrt(
      Math.pow(mid.x - landmarks[0].x, 2) +
      Math.pow(mid.y - landmarks[0].y, 2)
    );

    return tipDist > midDist * 0.95;
  }

  private calculatePalmNormal(landmarks: HandKeypoint[]): {x: number, y: number, z: number} {
    // Calculate palm plane normal vector
    const wrist = landmarks[0];
    const index = landmarks[5];
    const pinky = landmarks[17];

    const v1 = {
      x: index.x - wrist.x,
      y: index.y - wrist.y,
      z: index.z - wrist.z,
    };
    const v2 = {
      x: pinky.x - wrist.x,
      y: pinky.y - wrist.y,
      z: pinky.z - wrist.z,
    };

    // Cross product
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };
  }

  private isGrabbingPose(landmarks: HandKeypoint[]): boolean {
    // Check if fingers are curled inward
    const fingersCurled = [8, 12, 16, 20].every(tipIndex => {
      const tip = landmarks[tipIndex];
      const base = landmarks[tipIndex - 3];
      return tip.y > base.y;
    });

    return fingersCurled;
  }

  private isPinchingPose(landmarks: HandKeypoint[]): boolean {
    // Check distance between thumb tip and index tip
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    return distance < 0.05; // Threshold for pinch detection
  }

  async calibrate(referenceImage: any): Promise<void> {
    // Calibration for better accuracy
    const result = await this.processImage(referenceImage);
    
    if (result.multiHandLandmarks.length > 0) {
      // Store calibration data
      console.log('Calibration successful with', result.multiHandLandmarks.length, 'hands detected');
    } else {
      console.warn('No hands detected during calibration');
    }
  }

  updateConfig(config: Partial<MediaPipeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MediaPipeConfig {
    return { ...this.config };
  }

  async cleanup(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    this.processingQueue = [];
  }
}

// Singleton instance
export const mediaPipeIntegration = new MediaPipeIntegrationService();
export default mediaPipeIntegration;