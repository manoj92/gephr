import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import '@tensorflow/tfjs-platform-react-native';
import { HandPose, HandKeypoint, LerobotAction, LerobotObservation, LerobotDataPoint } from '../types';
import { Platform } from 'react-native';

interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface MediaPipeHand {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

export class MediaPipeHandTrackingService {
  private model: any = null;
  private isInitialized = false;
  private frameBuffer: any[] = [];
  private lastActionTime = 0;
  private actionThreshold = 500; // ms between actions
  private recordingSession: LerobotDataPoint[] = [];
  private isRecording = false;
  private sessionStartTime = 0;

  async initialize(): Promise<void> {
    try {
      await tf.ready();
      
      // Load hand pose detection model
      const handpose = await tf.loadGraphModel(
        'https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/1/default/1'
      );
      
      this.model = handpose;
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      throw error;
    }
  }

  async processFrame(imageData: any): Promise<HandPose[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('MediaPipe not initialized');
    }

    try {
      // Convert image data to tensor
      const imageTensor = tf.browser.fromPixels(imageData);
      const resized = tf.image.resizeBilinear(imageTensor, [256, 256]);
      const normalized = resized.div(255.0);
      const batched = normalized.expandDims(0);

      // Run inference
      const predictions = await this.model.predict(batched);
      
      // Process predictions
      const hands = await this.extractHands(predictions);
      
      // Clean up tensors
      imageTensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();
      predictions.dispose();

      // Convert to HandPose format
      return hands.map(hand => this.convertToHandPose(hand));
    } catch (error) {
      console.error('Frame processing error:', error);
      return [];
    }
  }

  private async extractHands(predictions: any): Promise<MediaPipeHand[]> {
    const hands: MediaPipeHand[] = [];
    
    try {
      const handedness = await predictions.handedness.array();
      const landmarks = await predictions.landmarks.array();
      const scores = await predictions.scores.array();

      for (let i = 0; i < handedness[0].length; i++) {
        if (scores[0][i] > 0.5) {
          hands.push({
            handedness: handedness[0][i] > 0.5 ? 'Right' : 'Left',
            landmarks: this.reshapeLandmarks(landmarks[0][i]),
            score: scores[0][i]
          });
        }
      }
    } catch (error) {
      console.error('Hand extraction error:', error);
    }

    return hands;
  }

  private reshapeLandmarks(flatLandmarks: number[]): HandLandmark[] {
    const landmarks: HandLandmark[] = [];
    for (let i = 0; i < flatLandmarks.length; i += 3) {
      landmarks.push({
        x: flatLandmarks[i],
        y: flatLandmarks[i + 1],
        z: flatLandmarks[i + 2],
        visibility: 1.0
      });
    }
    return landmarks;
  }

  private convertToHandPose(mediaPipeHand: MediaPipeHand): HandPose {
    const keypoints: HandKeypoint[] = mediaPipeHand.landmarks.map((landmark, index) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      confidence: landmark.visibility || 1.0,
      name: this.getLandmarkName(index)
    }));

    return {
      keypoints,
      confidence: mediaPipeHand.score,
      handedness: mediaPipeHand.handedness.toLowerCase() as 'left' | 'right'
    };
  }

  private getLandmarkName(index: number): string {
    const landmarkNames = [
      'wrist',
      'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
      'index_mcp', 'index_pip', 'index_dip', 'index_tip',
      'middle_mcp', 'middle_pip', 'middle_dip', 'middle_tip',
      'ring_mcp', 'ring_pip', 'ring_dip', 'ring_tip',
      'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip'
    ];
    return landmarkNames[index] || `landmark_${index}`;
  }

  detectGesture(hands: HandPose[]): string {
    if (hands.length === 0) return 'none';

    const primaryHand = hands[0];
    const fingers = this.getFingerStates(primaryHand);
    
    // Detect pinch gesture
    if (this.isPinching(primaryHand)) {
      return 'pinch';
    }

    // Detect pointing gesture
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'point';
    }

    // Detect open palm
    if (fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
      return 'open';
    }

    // Detect closed fist
    if (!fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'close';
    }

    // Detect peace sign
    if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'peace';
    }

    return 'unknown';
  }

  private getFingerStates(hand: HandPose): Record<string, boolean> {
    const states: Record<string, boolean> = {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false
    };

    // Check if fingers are extended based on keypoint positions
    const wrist = hand.keypoints.find(k => k.name === 'wrist');
    if (!wrist) return states;

    // Thumb
    const thumbTip = hand.keypoints.find(k => k.name === 'thumb_tip');
    const thumbMcp = hand.keypoints.find(k => k.name === 'thumb_mcp');
    if (thumbTip && thumbMcp) {
      states.thumb = Math.abs(thumbTip.y - wrist.y) > Math.abs(thumbMcp.y - wrist.y);
    }

    // Index finger
    const indexTip = hand.keypoints.find(k => k.name === 'index_tip');
    const indexMcp = hand.keypoints.find(k => k.name === 'index_mcp');
    if (indexTip && indexMcp) {
      states.index = indexTip.y < indexMcp.y;
    }

    // Middle finger
    const middleTip = hand.keypoints.find(k => k.name === 'middle_tip');
    const middleMcp = hand.keypoints.find(k => k.name === 'middle_mcp');
    if (middleTip && middleMcp) {
      states.middle = middleTip.y < middleMcp.y;
    }

    // Ring finger
    const ringTip = hand.keypoints.find(k => k.name === 'ring_tip');
    const ringMcp = hand.keypoints.find(k => k.name === 'ring_mcp');
    if (ringTip && ringMcp) {
      states.ring = ringTip.y < ringMcp.y;
    }

    // Pinky finger
    const pinkyTip = hand.keypoints.find(k => k.name === 'pinky_tip');
    const pinkyMcp = hand.keypoints.find(k => k.name === 'pinky_mcp');
    if (pinkyTip && pinkyMcp) {
      states.pinky = pinkyTip.y < pinkyMcp.y;
    }

    return states;
  }

  private isPinching(hand: HandPose): boolean {
    const thumbTip = hand.keypoints.find(k => k.name === 'thumb_tip');
    const indexTip = hand.keypoints.find(k => k.name === 'index_tip');
    
    if (!thumbTip || !indexTip) return false;

    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    return distance < 0.05; // Threshold for pinch detection
  }

  classifyAction(hands: HandPose[]): LerobotAction | null {
    const currentTime = Date.now();
    if (currentTime - this.lastActionTime < this.actionThreshold) {
      return null;
    }

    const gesture = this.detectGesture(hands);
    let action: LerobotAction | null = null;

    switch (gesture) {
      case 'pinch':
        action = {
          type: 'pick',
          parameters: {
            grip_force: 0.7,
            approach_speed: 0.5
          },
          timestamp: currentTime,
          confidence: hands[0].confidence
        };
        break;
      case 'open':
        action = {
          type: 'place',
          parameters: {
            release_speed: 0.3,
            placement_precision: 0.8
          },
          timestamp: currentTime,
          confidence: hands[0].confidence
        };
        break;
      case 'point':
        action = {
          type: 'move',
          parameters: {
            direction: this.getPointingDirection(hands[0]),
            speed: 0.6
          },
          timestamp: currentTime,
          confidence: hands[0].confidence
        };
        break;
      case 'close':
        action = {
          type: 'close',
          parameters: {
            grip_strength: 0.9
          },
          timestamp: currentTime,
          confidence: hands[0].confidence
        };
        break;
    }

    if (action) {
      this.lastActionTime = currentTime;
    }

    return action;
  }

  private getPointingDirection(hand: HandPose): [number, number, number] {
    const indexTip = hand.keypoints.find(k => k.name === 'index_tip');
    const indexMcp = hand.keypoints.find(k => k.name === 'index_mcp');
    
    if (!indexTip || !indexMcp) return [0, 0, 1];

    const direction: [number, number, number] = [
      indexTip.x - indexMcp.x,
      indexTip.y - indexMcp.y,
      indexTip.z - indexMcp.z
    ];

    // Normalize the direction vector
    const magnitude = Math.sqrt(
      direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2
    );

    if (magnitude > 0) {
      direction[0] /= magnitude;
      direction[1] /= magnitude;
      direction[2] /= magnitude;
    }

    return direction;
  }

  startRecording(): void {
    this.isRecording = true;
    this.recordingSession = [];
    this.sessionStartTime = Date.now();
  }

  stopRecording(): LerobotDataPoint[] {
    this.isRecording = false;
    const session = [...this.recordingSession];
    this.recordingSession = [];
    return session;
  }

  addToRecording(hands: HandPose[], action: LerobotAction | null): void {
    if (!this.isRecording) return;

    const observation: LerobotObservation = {
      timestamp: Date.now(),
      hand_poses: hands,
      camera_frame: {
        width: 1920,
        height: 1080,
        format: 'rgb',
        data: new ArrayBuffer(0) // Placeholder
      }
    };

    const dataPoint: LerobotDataPoint = {
      observation,
      action: action || {
        type: 'idle',
        parameters: {},
        timestamp: Date.now(),
        confidence: 1.0
      },
      metadata: {
        session_id: `session_${this.sessionStartTime}`,
        device_type: 'mobile',
        recording_quality: 'high',
        environment: 'indoor'
      }
    };

    this.recordingSession.push(dataPoint);
  }

  exportLerobotDataset(): string {
    const dataset = {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      num_samples: this.recordingSession.length,
      data: this.recordingSession.map((point, index) => ({
        index,
        timestamp: point.observation.timestamp,
        action_type: point.action.type,
        action_params: point.action.parameters,
        hand_poses: point.observation.hand_poses.map(hand => ({
          handedness: hand.handedness,
          confidence: hand.confidence,
          keypoints: hand.keypoints.map(kp => ({
            name: kp.name,
            x: kp.x,
            y: kp.y,
            z: kp.z,
            confidence: kp.confidence
          }))
        })),
        metadata: point.metadata
      }))
    };

    return JSON.stringify(dataset, null, 2);
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    this.frameBuffer = [];
    this.recordingSession = [];
  }
}

export const mediaPipeHandTracking = new MediaPipeHandTrackingService();