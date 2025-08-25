import { Camera } from 'expo-camera';
import { HandPose, HandKeypoint, LerobotAction, LerobotObservation, LerobotDataPoint } from '../types';
import { Platform } from 'react-native';

// MediaPipe types (mocked for React Native)
interface Results {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness?: Array<{ label: string; score: number }>;
}

interface Hands {
  setOptions: (options: any) => void;
  onResults: (callback: (results: Results) => void) => void;
  send: (input: any) => Promise<void>;
}

interface MediaPipeHand {
  handedness: string;
  landmarks: Array<{ x: number; y: number; z: number }>;
  score: number;
}

export class MediaPipeHandTrackingService {
  private hands: Hands | null = null;
  private isInitialized = false;
  private frameBuffer: Array<{ timestamp: number; hands: HandPose[] }> = [];
  private lastActionTime = 0;
  private actionThreshold = 100; // ms between actions
  private recordingSession: LerobotDataPoint[] = [];
  private isRecording = false;
  private sessionStartTime = 0;

  async initialize(): Promise<void> {
    try {
      // Mock MediaPipe initialization for React Native
      console.log('Initializing mock hand tracking service...');
      
      // Create mock hands object
      this.hands = {
        setOptions: (options: any) => {
          console.log('Hand tracking options set:', options);
        },
        onResults: (callback: (results: Results) => void) => {
          // Store callback for later use
          this.onResultsCallback = callback;
        },
        send: async (input: any) => {
          // Process mock frame
          await this.processMockFrame();
        }
      };

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults(this.onResults.bind(this));
      
      this.isInitialized = true;
      console.log('Mock hand tracking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      this.isInitialized = false;
    }
  }

  private onResultsCallback?: (results: Results) => void;

  private async processMockFrame(): Promise<void> {
    // Generate mock hand data
    const mockResults: Results = {
      multiHandLandmarks: [
        Array.from({ length: 21 }, (_, i) => ({
          x: 0.5 + Math.sin(Date.now() / 1000 + i) * 0.2,
          y: 0.5 + Math.cos(Date.now() / 1000 + i) * 0.2,
          z: Math.random() * 0.1
        }))
      ],
      multiHandedness: [
        { label: 'Right', score: 0.95 }
      ]
    };

    if (this.onResultsCallback) {
      this.onResultsCallback(mockResults);
    }
  }

  private onResults(results: Results): void {
    const hands: HandPose[] = [];
    
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];
        
        const keypoints: HandKeypoint[] = landmarks.map((landmark, index) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          name: this.getLandmarkName(index),
          score: handedness.score
        }));

        hands.push({
          handedness: handedness.label.toLowerCase() as 'left' | 'right',
          keypoints,
          score: handedness.score
        });
      }
    }

    // Store in frame buffer
    this.frameBuffer.push({
      timestamp: Date.now(),
      hands
    });

    // Keep buffer size manageable
    if (this.frameBuffer.length > 30) {
      this.frameBuffer.shift();
    }

    // Process for recording if active
    if (this.isRecording) {
      this.processFrameForRecording(hands);
    }
  }

  private processFrameForRecording(hands: HandPose[]): void {
    const currentTime = Date.now();
    const relativeTime = currentTime - this.sessionStartTime;

    // Classify action from hand poses
    const action = this.classifyAction(hands);
    
    if (action) {
      // Create LeRobot observation
      const observation: LerobotObservation = {
        image: null, // Camera frame would go here
        state: {
          hand_positions: hands.map(hand => ({
            position: this.getHandPosition(hand),
            orientation: this.getHandOrientation(hand),
            gesture: this.detectGesture([hand])
          }))
        },
        timestamp: relativeTime
      };

      // Create LeRobot data point
      const dataPoint: LerobotDataPoint = {
        observation,
        action,
        reward: this.calculateReward(action, hands),
        done: false,
        info: {
          frame_id: this.recordingSession.length,
          confidence: Math.max(...hands.map(h => h.score)),
          num_hands: hands.length
        },
        timestamp: relativeTime,
        metadata: {
          device_info: {
            platform: Platform.OS,
            model: 'unknown'
          },
          recording_session: Date.now().toString(),
          hand_tracking_version: '1.0.0'
        }
      };

      this.recordingSession.push(dataPoint);
    }
  }

  async processFrame(imageData: any): Promise<HandPose[]> {
    if (!this.isInitialized) {
      console.warn('Hand tracking not initialized, returning empty results');
      return [];
    }

    if (!this.hands) {
      return [];
    }

    try {
      // In React Native, we use mock processing
      await this.hands.send(imageData);

      // Return the most recent hand poses from frame buffer
      if (this.frameBuffer.length > 0) {
        return this.frameBuffer[this.frameBuffer.length - 1].hands;
      }

      return [];
    } catch (error) {
      console.error('Frame processing error:', error);
      return [];
    }
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

  private getHandPosition(hand: HandPose): { x: number; y: number; z: number } {
    // Use wrist position as hand center
    const wrist = hand.keypoints.find(k => k.name === 'wrist');
    if (wrist) {
      return { x: wrist.x, y: wrist.y, z: wrist.z };
    }
    // Fallback: average all keypoints
    const avgX = hand.keypoints.reduce((sum, k) => sum + k.x, 0) / hand.keypoints.length;
    const avgY = hand.keypoints.reduce((sum, k) => sum + k.y, 0) / hand.keypoints.length;
    const avgZ = hand.keypoints.reduce((sum, k) => sum + k.z, 0) / hand.keypoints.length;
    return { x: avgX, y: avgY, z: avgZ };
  }

  private getHandOrientation(hand: HandPose): { roll: number; pitch: number; yaw: number } {
    // Calculate hand orientation using wrist and middle finger MCP
    const wrist = hand.keypoints.find(k => k.name === 'wrist');
    const middleMcp = hand.keypoints.find(k => k.name === 'middle_mcp');
    
    if (wrist && middleMcp) {
      const dx = middleMcp.x - wrist.x;
      const dy = middleMcp.y - wrist.y;
      const dz = middleMcp.z - wrist.z;
      
      const yaw = Math.atan2(dy, dx);
      const pitch = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy));
      const roll = 0; // Simplified - would need more landmarks for accurate roll
      
      return { roll, pitch, yaw };
    }
    
    return { roll: 0, pitch: 0, yaw: 0 };
  }

  detectGesture(hands: HandPose[]): string {
    if (hands.length === 0) return 'none';

    const primaryHand = hands[0];
    const fingers = this.getFingerStates(primaryHand);
    
    // Detect gestures based on finger states
    if (this.isPinching(primaryHand)) {
      return 'pinch';
    } else if (fingers.thumb && fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'point';
    } else if (fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
      return 'open';
    } else if (!fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'fist';
    } else if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'peace';
    }

    return 'unknown';
  }

  private getFingerStates(hand: HandPose): { [key: string]: boolean } {
    const states = {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false
    };

    // Thumb finger (different logic due to thumb orientation)
    const thumbTip = hand.keypoints.find(k => k.name === 'thumb_tip');
    const thumbIp = hand.keypoints.find(k => k.name === 'thumb_ip');
    if (thumbTip && thumbIp) {
      states.thumb = thumbTip.x > thumbIp.x; // Simplified thumb detection
    }

    // Index finger
    const indexTip = hand.keypoints.find(k => k.name === 'index_tip');
    const indexPip = hand.keypoints.find(k => k.name === 'index_pip');
    if (indexTip && indexPip) {
      states.index = indexTip.y < indexPip.y;
    }

    // Middle finger
    const middleTip = hand.keypoints.find(k => k.name === 'middle_tip');
    const middlePip = hand.keypoints.find(k => k.name === 'middle_pip');
    if (middleTip && middlePip) {
      states.middle = middleTip.y < middlePip.y;
    }

    // Ring finger
    const ringTip = hand.keypoints.find(k => k.name === 'ring_tip');
    const ringPip = hand.keypoints.find(k => k.name === 'ring_pip');
    if (ringTip && ringPip) {
      states.ring = ringTip.y < ringPip.y;
    }

    // Pinky finger
    const pinkyTip = hand.keypoints.find(k => k.name === 'pinky_tip');
    const pinkyPip = hand.keypoints.find(k => k.name === 'pinky_pip');
    if (pinkyTip && pinkyPip) {
      states.pinky = pinkyTip.y < pinkyPip.y;
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
          confidence: hands[0]?.score || 0
        };
        break;
      case 'open':
        action = {
          type: 'place',
          parameters: {
            release_speed: 0.3,
            retract_distance: 0.1
          },
          timestamp: currentTime,
          confidence: hands[0]?.score || 0
        };
        break;
      case 'point':
        action = {
          type: 'move',
          parameters: {
            target_position: this.getHandPosition(hands[0]),
            movement_speed: 0.4
          },
          timestamp: currentTime,
          confidence: hands[0]?.score || 0
        };
        break;
      case 'fist':
        action = {
          type: 'rotate',
          parameters: {
            rotation_axis: 'z',
            angle: 0.5,
            rotation_speed: 0.2
          },
          timestamp: currentTime,
          confidence: hands[0]?.score || 0
        };
        break;
      default:
        // No action for unknown gestures
        break;
    }

    if (action) {
      this.lastActionTime = currentTime;
    }

    return action;
  }

  private calculateReward(action: LerobotAction, hands: HandPose[]): number {
    // Simple reward calculation based on confidence and hand stability
    const baseReward = 0.1;
    const confidenceBonus = Math.max(...hands.map(h => h.score)) * 0.5;
    const stabilityBonus = hands.length >= 1 ? 0.2 : 0;
    
    return baseReward + confidenceBonus + stabilityBonus;
  }

  startRecording(): void {
    this.isRecording = true;
    this.sessionStartTime = Date.now();
    this.recordingSession = [];
    console.log('Recording session started');
  }

  stopRecording(): LerobotDataPoint[] {
    this.isRecording = false;
    console.log(`Recording session stopped. Captured ${this.recordingSession.length} data points`);
    return [...this.recordingSession];
  }

  // Aliases for compatibility
  async startTracking(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    this.startRecording();
  }

  async stopTracking(): Promise<LerobotDataPoint[]> {
    return this.stopRecording();
  }

  getFrameBuffer(): Array<{ timestamp: number; hands: HandPose[] }> {
    return [...this.frameBuffer];
  }

  clearFrameBuffer(): void {
    this.frameBuffer = [];
  }

  exportToLeRobotFormat(): string {
    const dataset = {
      info: {
        fps: 30,
        video_path: 'recording.mp4',
        total_frames: this.recordingSession.length,
        total_episodes: 1
      },
      tasks: [{
        task_index: 0,
        episode_index: 0,
        timestamp: this.sessionStartTime,
        data: this.recordingSession.map((point, index) => ({
          frame_index: index,
          timestamp: point.timestamp,
          observation: point.observation,
          action: point.action,
          reward: point.reward,
          done: point.done
        }))
      }],
      metadata: {
        created_at: new Date().toISOString(),
        platform: Platform.OS,
        hand_tracking_version: '1.0.0',
        total_data_points: this.recordingSession.length
      }
    };

    return JSON.stringify(dataset, null, 2);
  }

  dispose(): void {
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.isInitialized = false;
    this.frameBuffer = [];
    this.recordingSession = [];
  }
}

export const mediaPipeHandTracking = new MediaPipeHandTrackingService();
export const handTrackingService = mediaPipeHandTracking; // Alias for compatibility