import { CameraFrame, HandPose, HandKeypoint, GestureData, LerobotDataPoint, LerobotAction, LerobotObservation } from '../types';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandTrackingService {
  private isTracking = false;
  private currentGesture: GestureData | null = null;
  private handPoses: HandPose[] = [];
  private frameBuffer: CameraFrame[] = [];
  private maxFrameBuffer = 300; // 10 seconds at 30fps
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  
  // Hand landmarks indices based on MediaPipe hand model
  private readonly HAND_LANDMARKS = {
    WRIST: 0,
    THUMB_TIP: 4,
    INDEX_TIP: 8,
    MIDDLE_TIP: 12,
    RING_TIP: 16,
    PINKY_TIP: 20,
    THUMB_MCP: 2,
    INDEX_MCP: 5,
    MIDDLE_MCP: 9,
    RING_MCP: 13,
    PINKY_MCP: 17,
  };

  // Action recognition thresholds
  private readonly ACTION_THRESHOLDS = {
    PICK_DISTANCE: 0.05, // Distance threshold for pick action
    PLACE_DISTANCE: 0.08,
    VELOCITY_THRESHOLD: 0.02,
    CONFIDENCE_THRESHOLD: 0.7,
  };

  constructor() {
    this.initializeTracking();
  }

  private async initializeTracking(): Promise<void> {
    try {
      this.hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults(this.onResults.bind(this));
      console.log('MediaPipe hands initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe hands:', error);
      // Fallback to mock mode
    }
  }

  private onResults(results: Results): void {
    if (!this.isTracking) return;

    const timestamp = Date.now();
    const handPoses: HandPose[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];
        
        const handKeypoints: HandKeypoint[] = landmarks.map((landmark: any) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0,
          confidence: 0.9 // MediaPipe doesn't provide per-landmark confidence
        }));

        handPoses.push({
          landmarks: handKeypoints,
          handedness: handedness.label === 'Left' ? 'left' : 'right',
          confidence: handedness.score,
          timestamp
        });
      }
    }

    this.handPoses.push(...handPoses);
    this.trimHandPosesBuffer();
  }

  public startTracking(): void {
    this.isTracking = true;
    this.handPoses = [];
    this.frameBuffer = [];
    console.log('Hand tracking started');
  }

  public stopTracking(): void {
    this.isTracking = false;
    console.log('Hand tracking stopped');
  }

  /**
   * Process a camera frame and extract hand poses
   */
  public async processFrame(frame: CameraFrame): Promise<HandPose[]> {
    if (!this.isTracking) return [];

    // Add frame to buffer
    this.frameBuffer.push(frame);
    if (this.frameBuffer.length > this.maxFrameBuffer) {
      this.frameBuffer.shift();
    }

    try {
      // In a real implementation, this would use MediaPipe Hands or similar
      const handPoses = await this.detectHands(frame);
      
      if (handPoses.length > 0) {
        this.handPoses.push(...handPoses);
        this.trimHandPosesBuffer();
      }

      return handPoses;
    } catch (error) {
      console.error('Error processing frame:', error);
      return [];
    }
  }

  /**
   * Mock hand detection - in production, this would use ML models
   */
  private async detectHands(frame: CameraFrame): Promise<HandPose[]> {
    // Simulate hand detection with mock data
    const mockPoses: HandPose[] = [];
    
    // Generate mock left hand
    if (Math.random() > 0.3) { // 70% chance of detecting left hand
      mockPoses.push(this.generateMockHandPose('left', frame.timestamp));
    }
    
    // Generate mock right hand
    if (Math.random() > 0.3) { // 70% chance of detecting right hand
      mockPoses.push(this.generateMockHandPose('right', frame.timestamp));
    }

    return mockPoses;
  }

  private generateMockHandPose(handedness: 'left' | 'right', timestamp: number): HandPose {
    const landmarks: HandKeypoint[] = [];
    
    // Generate 21 hand landmarks (MediaPipe standard)
    for (let i = 0; i < 21; i++) {
      landmarks.push({
        x: Math.random() * 640, // Assuming 640px width
        y: Math.random() * 480, // Assuming 480px height
        z: Math.random() * 0.1 - 0.05, // Depth relative to wrist
        confidence: 0.7 + Math.random() * 0.3,
      });
    }

    return {
      landmarks,
      handedness,
      confidence: 0.8 + Math.random() * 0.2,
      timestamp,
    };
  }

  /**
   * Classify the current hand configuration into an action
   */
  public classifyAction(handPoses: HandPose[]): LerobotAction | null {
    if (handPoses.length === 0) return null;

    const dominantHand = handPoses[0]; // Use first detected hand
    const landmarks = dominantHand.landmarks;

    if (landmarks.length < 21) return null;

    // Calculate hand metrics
    const fingerStates = this.calculateFingerStates(landmarks);
    const handVelocity = this.calculateHandVelocity(dominantHand);
    const graspStrength = this.calculateGraspStrength(landmarks);

    // Classify action based on hand state
    let actionType: LerobotAction['action_type'] = 'move';
    let confidence = dominantHand.confidence;

    if (graspStrength > 0.8 && handVelocity < this.ACTION_THRESHOLDS.VELOCITY_THRESHOLD) {
      actionType = 'pick';
      confidence *= 0.9;
    } else if (graspStrength < 0.3 && handVelocity > this.ACTION_THRESHOLDS.VELOCITY_THRESHOLD) {
      actionType = 'place';
      confidence *= 0.85;
    } else if (fingerStates.allExtended) {
      actionType = 'open';
      confidence *= 0.8;
    } else if (fingerStates.allClosed) {
      actionType = 'close';
      confidence *= 0.8;
    }

    return {
      action_type: actionType,
      gripper_position: graspStrength,
      confidence,
    };
  }

  private calculateFingerStates(landmarks: HandKeypoint[]) {
    const fingerTips = [
      landmarks[this.HAND_LANDMARKS.THUMB_TIP],
      landmarks[this.HAND_LANDMARKS.INDEX_TIP],
      landmarks[this.HAND_LANDMARKS.MIDDLE_TIP],
      landmarks[this.HAND_LANDMARKS.RING_TIP],
      landmarks[this.HAND_LANDMARKS.PINKY_TIP],
    ];

    const fingerMcps = [
      landmarks[this.HAND_LANDMARKS.THUMB_MCP],
      landmarks[this.HAND_LANDMARKS.INDEX_MCP],
      landmarks[this.HAND_LANDMARKS.MIDDLE_MCP],
      landmarks[this.HAND_LANDMARKS.RING_MCP],
      landmarks[this.HAND_LANDMARKS.PINKY_MCP],
    ];

    const extendedFingers = fingerTips.map((tip, index) => {
      const mcp = fingerMcps[index];
      return this.calculateDistance(tip, mcp) > 0.08; // Threshold for extended finger
    });

    return {
      extendedFingers,
      allExtended: extendedFingers.every(extended => extended),
      allClosed: extendedFingers.every(extended => !extended),
      extendedCount: extendedFingers.filter(extended => extended).length,
    };
  }

  private calculateHandVelocity(currentPose: HandPose): number {
    if (this.handPoses.length < 2) return 0;

    const previousPose = this.handPoses[this.handPoses.length - 2];
    const timeDiff = (currentPose.timestamp - previousPose.timestamp) / 1000; // Convert to seconds

    if (timeDiff === 0) return 0;

    const wrist1 = currentPose.landmarks[this.HAND_LANDMARKS.WRIST];
    const wrist2 = previousPose.landmarks[this.HAND_LANDMARKS.WRIST];

    const distance = this.calculateDistance(wrist1, wrist2);
    return distance / timeDiff;
  }

  private calculateGraspStrength(landmarks: HandKeypoint[]): number {
    const thumbTip = landmarks[this.HAND_LANDMARKS.THUMB_TIP];
    const indexTip = landmarks[this.HAND_LANDMARKS.INDEX_TIP];
    
    const distance = this.calculateDistance(thumbTip, indexTip);
    
    // Normalize distance to grasp strength (0 = fully open, 1 = fully closed)
    const maxDistance = 0.15; // Maximum expected distance between thumb and index
    return Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
  }

  private calculateDistance(point1: HandKeypoint, point2: HandKeypoint): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Generate LeRobot compatible observation from current frame and hand poses
   */
  public generateObservation(
    frame: CameraFrame,
    handPoses: HandPose[],
    environmentState: any
  ): LerobotObservation {
    return {
      image: frame.uri, // Base64 encoded image
      hand_poses: handPoses,
      environment_state: environmentState,
      timestamp: frame.timestamp,
    };
  }

  /**
   * Create a complete LeRobot data point
   */
  public createDataPoint(
    observation: LerobotObservation,
    action: LerobotAction,
    metadata: {
      task_id: string;
      user_id: string;
      robot_type: string;
      difficulty: number;
    }
  ): LerobotDataPoint {
    return {
      observation,
      action,
      reward: this.calculateReward(action),
      done: false, // This would be determined by task completion logic
      metadata,
    };
  }

  private calculateReward(action: LerobotAction): number {
    // Simple reward calculation based on action confidence
    // In a real system, this would be based on task success metrics
    return action.confidence * 0.1;
  }

  /**
   * Start recording a gesture sequence
   */
  public startGesture(taskType: any, environment: any): void {
    this.currentGesture = {
      id: Date.now().toString(),
      poses: [],
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      taskType,
      environment,
    };
  }

  /**
   * Stop recording and finalize gesture
   */
  public stopGesture(): GestureData | null {
    if (!this.currentGesture) return null;

    this.currentGesture.endTime = Date.now();
    this.currentGesture.duration = this.currentGesture.endTime - this.currentGesture.startTime;
    this.currentGesture.poses = [...this.handPoses];

    const gesture = this.currentGesture;
    this.currentGesture = null;
    this.handPoses = [];

    return gesture;
  }

  private trimHandPosesBuffer(): void {
    // Keep only last 5 seconds of poses (assuming 30fps)
    const maxPoses = 150;
    if (this.handPoses.length > maxPoses) {
      this.handPoses = this.handPoses.slice(-maxPoses);
    }
  }

  /**
   * Get current tracking statistics
   */
  public getTrackingStats() {
    return {
      isTracking: this.isTracking,
      totalFrames: this.frameBuffer.length,
      totalPoses: this.handPoses.length,
      currentGestureId: this.currentGesture?.id || null,
      gestureStartTime: this.currentGesture?.startTime || null,
    };
  }

  /**
   * Export recorded data in LeRobot format
   */
  public exportLerobotDataset(gestures: GestureData[]): any {
    const dataPoints: LerobotDataPoint[] = [];

    gestures.forEach(gesture => {
      const frames = this.frameBuffer.filter(
        frame => frame.timestamp >= gesture.startTime && frame.timestamp <= gesture.endTime
      );

      frames.forEach((frame, index) => {
        const handPoses = gesture.poses.filter(
          pose => Math.abs(pose.timestamp - frame.timestamp) < 50 // Within 50ms
        );

        const action = this.classifyAction(handPoses);
        if (action) {
          const observation = this.generateObservation(frame, handPoses, gesture.environment);
          const dataPoint = this.createDataPoint(observation, action, {
            task_id: gesture.id,
            user_id: 'current_user',
            robot_type: 'unitree_g1',
            difficulty: 1,
          });
          dataPoints.push(dataPoint);
        }
      });
    });

    return {
      info: {
        total_episodes: gestures.length,
        total_frames: dataPoints.length,
        fps: 30,
        created_at: new Date().toISOString(),
      },
      data: dataPoints,
    };
  }
}

export const handTrackingService = new HandTrackingService(); 