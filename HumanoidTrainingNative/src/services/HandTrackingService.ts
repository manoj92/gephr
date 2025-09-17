import { HandPose, HandKeypoint, LerobotDataPoint, LerobotObservation } from '../types';
import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { zip } from 'react-native-zip-archive';

interface HandTrackingConfig {
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  maxHands: number;
  autoEpisodeDetection: boolean;
  episodeTimeoutMs: number;
  minEpisodeFrames: number;
}

interface SkillEpisode {
  id: string;
  skillLabel: string;
  startTime: number;
  endTime?: number;
  frameCount: number;
  data: LerobotDataPoint[];
  isComplete: boolean;
}

class HandTrackingService {
  private config: HandTrackingConfig;
  private isInitialized: boolean = false;
  private currentFrameIndex: number = 0;
  private episodeIndex: number = 0;
  private recordingData: LerobotDataPoint[] = [];
  private currentSkillLabel: string = '';
  private episodes: SkillEpisode[] = [];
  private lastActivityTime: number = 0;
  private isAutoDetecting: boolean = false;
  private activityThreshold: number = 0.02;
  private previousHandPositions: HandPose[] = [];
  private dataDirectory: string = '';
  private frameBuffer: string[] = [];

  constructor() {
    this.config = {
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
      maxHands: 2,
      autoEpisodeDetection: true,
      episodeTimeoutMs: 3000, // 3 seconds of inactivity ends episode
      minEpisodeFrames: 30, // minimum 1 second at 30fps
    };
  }

  async initialize(): Promise<void> {
    try {
      // Create data directory for storing training data
      this.dataDirectory = `${Paths.document.uri}training_data/`;

      const dirInfo = await FileSystem.getInfoAsync(this.dataDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.dataDirectory, { intermediates: true });
      }

      // Initialize hand tracking model (simulated - in production would load MediaPipe model)
      console.log('Hand tracking service initialized with data directory:', this.dataDirectory);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      throw error;
    }
  }

  // Mock hand tracking - generates realistic hand pose data
  private generateMockHandPose(handedness: 'Left' | 'Right'): HandPose {
    const landmarks: HandKeypoint[] = [];

    // Generate 21 hand keypoints (MediaPipe standard)
    // Following MediaPipe Hand landmark model topology
    const handLandmarks = [
      // Wrist
      { base: [0.5, 0.5], range: 0.1 },
      // Thumb
      { base: [0.45, 0.45], range: 0.08 },
      { base: [0.42, 0.4], range: 0.08 },
      { base: [0.39, 0.35], range: 0.08 },
      { base: [0.36, 0.3], range: 0.08 },
      // Index finger
      { base: [0.5, 0.4], range: 0.08 },
      { base: [0.5, 0.32], range: 0.08 },
      { base: [0.5, 0.25], range: 0.08 },
      { base: [0.5, 0.18], range: 0.08 },
      // Middle finger
      { base: [0.53, 0.35], range: 0.08 },
      { base: [0.53, 0.25], range: 0.08 },
      { base: [0.53, 0.15], range: 0.08 },
      { base: [0.53, 0.08], range: 0.08 },
      // Ring finger
      { base: [0.56, 0.38], range: 0.08 },
      { base: [0.56, 0.3], range: 0.08 },
      { base: [0.56, 0.22], range: 0.08 },
      { base: [0.56, 0.15], range: 0.08 },
      // Pinky
      { base: [0.59, 0.42], range: 0.08 },
      { base: [0.59, 0.36], range: 0.08 },
      { base: [0.59, 0.3], range: 0.08 },
      { base: [0.59, 0.25], range: 0.08 },
    ];

    handLandmarks.forEach((landmark, i) => {
      landmarks.push({
        x: landmark.base[0] + (Math.random() - 0.5) * landmark.range,
        y: landmark.base[1] + (Math.random() - 0.5) * landmark.range,
        z: Math.random() * 0.02 - 0.01, // Small depth variation
        visibility: Math.random() * 0.2 + 0.8, // High visibility
      });
    });

    return {
      handedness,
      landmarks,
      confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
    };
  }

  async processFrame(_imageUri: string, _timestamp: number): Promise<HandPose[]> {
    if (!this.isInitialized) {
      throw new Error('Hand tracking service not initialized');
    }

    try {
      // In a real implementation, this would process the image with MediaPipe
      // For now, simulate hand detection with mock data
      const detectedHands: HandPose[] = [];

      // Randomly detect 0-2 hands
      const numHands = Math.floor(Math.random() * 3);

      if (numHands >= 1) {
        detectedHands.push(this.generateMockHandPose('Right'));
      }
      if (numHands >= 2) {
        detectedHands.push(this.generateMockHandPose('Left'));
      }

      // Auto-episode detection logic
      if (this.config.autoEpisodeDetection && this.currentSkillLabel) {
        this.detectEpisodeBoundaries(detectedHands, _timestamp);
      }

      return detectedHands;
    } catch (error) {
      console.error('Error processing frame:', error);
      return [];
    }
  }

  // Auto-detect episode boundaries based on hand movement
  private detectEpisodeBoundaries(handPoses: HandPose[], timestamp: number): void {
    const hasActivity = this.calculateHandActivity(handPoses);

    if (hasActivity) {
      this.lastActivityTime = timestamp;

      // Start new episode if not currently recording one
      if (!this.isAutoDetecting && this.episodes.length >= 3) { // Enable after 3 manual episodes
        this.startAutoEpisode();
      }
    } else if (this.isAutoDetecting) {
      // Check if enough time has passed without activity to end episode
      const timeSinceActivity = timestamp - this.lastActivityTime;
      if (timeSinceActivity > this.config.episodeTimeoutMs) {
        this.endAutoEpisode();
      }
    }
  }

  private calculateHandActivity(handPoses: HandPose[]): boolean {
    if (handPoses.length === 0) {
      this.previousHandPositions = [];
      return false;
    }

    if (this.previousHandPositions.length === 0) {
      this.previousHandPositions = handPoses;
      return false;
    }

    // Calculate movement by comparing wrist positions and key finger landmarks
    let totalMovement = 0;
    let comparedHands = 0;

    handPoses.forEach(currentHand => {
      // Find corresponding hand in previous frame
      const previousHand = this.previousHandPositions.find(
        prev => prev.handedness === currentHand.handedness
      );

      if (previousHand && currentHand.landmarks.length >= 21 && previousHand.landmarks.length >= 21) {
        // Compare key landmarks: wrist (0), index tip (8), thumb tip (4), middle tip (12)
        const keyLandmarks = [0, 4, 8, 12];

        keyLandmarks.forEach(index => {
          const curr = currentHand.landmarks[index];
          const prev = previousHand.landmarks[index];

          const movement = Math.sqrt(
            Math.pow(curr.x - prev.x, 2) +
            Math.pow(curr.y - prev.y, 2) +
            Math.pow((curr.z || 0) - (prev.z || 0), 2)
          );

          totalMovement += movement;
        });

        comparedHands++;
      }
    });

    // Update previous positions
    this.previousHandPositions = handPoses;

    // Calculate average movement per landmark
    const averageMovement = comparedHands > 0 ? totalMovement / (comparedHands * 4) : 0;

    // Activity threshold - adjust based on your needs
    return averageMovement > this.activityThreshold;
  }

  private startAutoEpisode(): void {
    this.isAutoDetecting = true;
    this.startEpisode();
    console.log(`Auto-started episode for skill: ${this.currentSkillLabel}`);
  }

  private endAutoEpisode(): void {
    if (this.recordingData.length >= this.config.minEpisodeFrames) {
      this.endEpisode();
      console.log(`Auto-ended episode: ${this.recordingData.length} frames`);
    } else {
      // Discard short episodes
      this.recordingData = [];
      console.log('Auto-discarded short episode');
    }
    this.isAutoDetecting = false;
  }

  // Convert hand poses to robot actions (simplified)
  private handPosesToActions(handPoses: HandPose[]): number[] {
    if (handPoses.length === 0) {
      return [0, 0, 0, 0, 0, 0]; // Default neutral pose
    }

    const rightHand = handPoses.find(h => h.handedness === 'Right');
    const leftHand = handPoses.find(h => h.handedness === 'Left');

    // Extract key landmarks for action computation
    const actions: number[] = [];

    if (rightHand) {
      // Use wrist position for translation
      const wrist = rightHand.landmarks[0];
      actions.push(wrist.x - 0.5); // X translation (-0.5 to 0.5)
      actions.push(wrist.y - 0.5); // Y translation
      actions.push(wrist.z || 0);   // Z translation

      // Use finger positions for grip
      const indexTip = rightHand.landmarks[8];
      const thumbTip = rightHand.landmarks[4];
      const gripDistance = Math.sqrt(
        Math.pow(indexTip.x - thumbTip.x, 2) +
        Math.pow(indexTip.y - thumbTip.y, 2)
      );
      actions.push(gripDistance > 0.05 ? 0 : 1); // Grip open/close
    } else {
      actions.push(0, 0, 0, 0); // No right hand detected
    }

    if (leftHand) {
      // Similar processing for left hand
      const wrist = leftHand.landmarks[0];
      actions.push(wrist.x - 0.5);
      actions.push(wrist.y - 0.5);
    } else {
      actions.push(0, 0); // No left hand detected
    }

    return actions;
  }

  // Record a frame for LeRobot dataset
  recordFrame(imageUri: string, handPoses: HandPose[], _timestamp: number): LerobotDataPoint {
    const observation: LerobotObservation = {
      image: imageUri,
      hand_pose: handPoses,
    };

    const action = this.handPosesToActions(handPoses);

    const dataPoint: LerobotDataPoint = {
      observation,
      action,
      done: false,
      reward: 1.0, // Simple reward for successful detection
    };

    this.recordingData.push(dataPoint);
    this.currentFrameIndex++;

    return dataPoint;
  }

  // Set current skill being trained
  setCurrentSkill(skillLabel: string): void {
    this.currentSkillLabel = skillLabel;
    console.log(`Training skill: ${skillLabel}`);
  }

  // Start a new recording episode
  startEpisode(): void {
    this.episodeIndex++;
    this.currentFrameIndex = 0;
    this.recordingData = [];

    // Create episode record
    const episode: SkillEpisode = {
      id: `${this.currentSkillLabel}_${this.episodeIndex}_${Date.now()}`,
      skillLabel: this.currentSkillLabel,
      startTime: Date.now(),
      frameCount: 0,
      data: [],
      isComplete: false,
    };

    this.episodes.push(episode);
    console.log(`Started episode ${this.episodeIndex} for skill: ${this.currentSkillLabel}`);
  }

  // End the current episode
  endEpisode(): void {
    if (this.recordingData.length > 0) {
      // Mark the last frame as done
      this.recordingData[this.recordingData.length - 1].done = true;

      // Update episode record
      const currentEpisode = this.episodes[this.episodes.length - 1];
      if (currentEpisode) {
        currentEpisode.endTime = Date.now();
        currentEpisode.frameCount = this.recordingData.length;
        currentEpisode.data = [...this.recordingData];
        currentEpisode.isComplete = true;
      }
    }
    console.log(`Ended episode ${this.episodeIndex} with ${this.recordingData.length} frames`);
  }

  // Get episodes for current skill
  getSkillEpisodes(skillLabel?: string): SkillEpisode[] {
    const targetSkill = skillLabel || this.currentSkillLabel;
    return this.episodes.filter(ep => ep.skillLabel === targetSkill && ep.isComplete);
  }

  // Get all unique skills
  getSkillLabels(): string[] {
    const skills = new Set(this.episodes.map(ep => ep.skillLabel));
    return Array.from(skills).filter(skill => skill.length > 0);
  }

  // Check if auto-detection is enabled for current skill
  isAutoDetectionEnabled(): boolean {
    const skillEpisodes = this.getSkillEpisodes();
    return this.config.autoEpisodeDetection && skillEpisodes.length >= 3;
  }

  // Export data in LeRobot format for current skill
  async exportLerobotData(skillLabel?: string): Promise<any> {
    const targetSkill = skillLabel || this.currentSkillLabel;
    const skillEpisodes = this.getSkillEpisodes(targetSkill);

    const totalFrames = skillEpisodes.reduce((sum, ep) => sum + ep.frameCount, 0);

    const lerobotDataset = {
      info: {
        dataset_name: `${targetSkill}_training_data`,
        skill_label: targetSkill,
        created_at: new Date().toISOString(),
        num_episodes: skillEpisodes.length,
        num_frames: totalFrames,
        fps: 30,
        auto_detection_enabled: this.isAutoDetectionEnabled(),
        features: {
          observation: {
            image: {
              dtype: 'string',
              description: 'Camera image URI',
            },
            hand_pose: {
              dtype: 'array',
              shape: ['variable', 21, 3],
              description: 'Hand landmarks (x, y, z) for up to 2 hands',
            },
          },
          action: {
            dtype: 'array',
            shape: [6],
            description: 'Robot actions: [right_x, right_y, right_z, right_grip, left_x, left_y]',
          },
        },
      },
      episodes: skillEpisodes.map((episode, index) => ({
        episode_id: episode.id,
        episode_index: index,
        skill_label: episode.skillLabel,
        length: episode.frameCount,
        duration_ms: episode.endTime ? episode.endTime - episode.startTime : 0,
        data: episode.data,
      })),
    };

    // Return dataset without auto-saving

    return lerobotDataset;
  }

  // Export LeRobot dataset as a zip file with episodes split into separate files
  async exportLerobotZip(skillLabel?: string): Promise<string> {
    const targetSkill = skillLabel || this.currentSkillLabel;
    const lerobotData = this.exportLerobotData(targetSkill);

    if (lerobotData.episodes.length === 0) {
      throw new Error('No episodes to export');
    }

    try {
      // Create temporary directory for export
      const exportDir = `${Paths.cache.uri}export_${Date.now()}/`;
      await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });

      // Save main dataset info
      const infoPath = `${exportDir}dataset_info.json`;
      await FileSystem.writeAsStringAsync(infoPath, JSON.stringify(lerobotData.info, null, 2));

      // Save each episode as separate file
      const episodePromises = lerobotData.episodes.map(async (episode: any, index: number) => {
        const episodePath = `${exportDir}episode_${index.toString().padStart(3, '0')}.json`;
        await FileSystem.writeAsStringAsync(episodePath, JSON.stringify(episode, null, 2));
      });

      await Promise.all(episodePromises);

      // Create README
      const readmePath = `${exportDir}README.md`;
      const readmeContent = `# ${targetSkill} Training Dataset

Generated on: ${new Date().toISOString()}
Episodes: ${lerobotData.episodes.length}
Total Frames: ${lerobotData.info.num_frames}

## Files
- \`dataset_info.json\`: Dataset metadata and structure
- \`episode_*.json\`: Individual episode data
- \`README.md\`: This file

## Format
This dataset is compatible with LeRobot training pipelines.
`;
      await FileSystem.writeAsStringAsync(readmePath, readmeContent);

      // Create zip file
      const zipFileName = `${targetSkill.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;
      const zipPath = `${Paths.cache.uri}${zipFileName}`;

      await zip(exportDir, zipPath);

      // Clean up temporary directory
      await FileSystem.deleteAsync(exportDir, { idempotent: true });

      return zipPath;
    } catch (error) {
      console.error('Failed to create export zip:', error);
      throw error;
    }
  }

  // Share exported zip file
  async shareExportedData(skillLabel?: string): Promise<void> {
    try {
      const zipPath = await this.exportLerobotZip(skillLabel);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(zipPath, {
          mimeType: 'application/zip',
          dialogTitle: `Share ${skillLabel || this.currentSkillLabel} Training Data`
        });
      } else {
        console.log('Sharing not available on this platform');
        throw new Error('Sharing not available on this platform');
      }
    } catch (error) {
      console.error('Failed to share export:', error);
      throw error;
    }
  }

  // Load existing training summary
  private async loadTrainingSummary(): Promise<any> {
    try {
      const summaryPath = `${this.dataDirectory}training_summary.json`;
      const summaryInfo = await FileSystem.getInfoAsync(summaryPath);

      if (summaryInfo.exists) {
        const summaryContent = await FileSystem.readAsStringAsync(summaryPath);
        return JSON.parse(summaryContent);
      }
    } catch (error) {
      console.log('No existing summary found, creating new one');
    }

    return {
      version: '1.0',
      created: new Date().toISOString(),
      datasets: []
    };
  }

  // Get current recording stats
  getRecordingStats() {
    const skillEpisodes = this.getSkillEpisodes();
    return {
      currentSkill: this.currentSkillLabel,
      episodeIndex: this.episodeIndex,
      frameCount: this.recordingData.length,
      isRecording: this.recordingData.length > 0,
      isAutoDetecting: this.isAutoDetecting,
      autoDetectionEnabled: this.isAutoDetectionEnabled(),
      skillEpisodeCount: skillEpisodes.length,
      totalSkills: this.getSkillLabels().length,
    };
  }

  // Clear all recorded data
  clearRecordingData(): void {
    this.recordingData = [];
    this.currentFrameIndex = 0;
    console.log('Recording data cleared');
  }
}

export default new HandTrackingService();
