import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
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
      
      // Load MediaPipe Hands model
      const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      
      // In production, this would load the actual MediaPipe model
      // For now, we'll use TensorFlow.js as a placeholder
      this.model = await tf.loadGraphModel(
        'https://tfhub.dev/mediapipe/tfjs-model/hand_landmark_full/1/default/1'
      );
      
      this.isInitialized = true;
      console.log('MediaPipe integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      throw error;
    }
  }

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
    // Convert image to tensor
    const imageTensor = tf.browser.fromPixels(imageData);
    const resized = tf.image.resizeBilinear(imageTensor, [256, 256]);
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0);

    // Run inference
    const predictions = await this.model.predict(batched);
    
    // Extract landmarks
    const landmarks = await this.extractLandmarks(predictions);
    
    // Clean up tensors
    imageTensor.dispose();
    resized.dispose();
    normalized.dispose();
    batched.dispose();
    
    return landmarks;
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
    // Simple gesture classification based on landmark positions
    // This is a placeholder - real implementation would use ML model
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const palmBase = landmarks[0];
    
    // Check if fingers are extended
    const thumbExtended = thumbTip.y < landmarks[3].y;
    const indexExtended = indexTip.y < landmarks[6].y;
    const middleExtended = middleTip.y < landmarks[10].y;
    const ringExtended = ringTip.y < landmarks[14].y;
    const pinkyExtended = pinkyTip.y < landmarks[18].y;
    
    const extendedCount = [
      thumbExtended,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended
    ].filter(Boolean).length;
    
    // Classify gesture based on extended fingers
    if (extendedCount === 0) {
      return 'fist';
    } else if (extendedCount === 5) {
      return 'open_hand';
    } else if (extendedCount === 1 && indexExtended) {
      return 'pointing';
    } else if (extendedCount === 2 && indexExtended && middleExtended) {
      return 'peace';
    } else if (extendedCount === 1 && thumbExtended) {
      return 'thumbs_up';
    } else {
      return 'unknown';
    }
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