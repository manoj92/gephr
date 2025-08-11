import { Camera, CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { mediaPipeHandTracking } from './MediaPipeHandTracking';
import { HandPose, LerobotDataPoint } from '../types';

interface RecordingSession {
  id: string;
  startTime: number;
  endTime?: number;
  videoUri?: string;
  handData: Array<{
    timestamp: number;
    hands: HandPose[];
    gesture: string;
  }>;
  lerobotData: LerobotDataPoint[];
  metadata: {
    duration?: number;
    frameCount: number;
    resolution: { width: number; height: number };
    deviceInfo: {
      model: string;
      os: string;
      orientation: string;
    };
  };
}

export class CameraRecordingService {
  private camera: Camera | null = null;
  private isRecording = false;
  private currentSession: RecordingSession | null = null;
  private frameProcessingInterval: NodeJS.Timeout | null = null;
  private frameCount = 0;
  private videoQuality = '1080p';
  private frameRate = 30;
  private handOverlayEnabled = true;

  async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const micPermission = await Camera.requestMicrophonePermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();

      return (
        cameraPermission.status === 'granted' &&
        micPermission.status === 'granted' &&
        mediaLibraryPermission.status === 'granted'
      );
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async startRecording(cameraRef: any): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Required permissions not granted');
    }

    try {
      // Initialize MediaPipe if not already initialized
      await mediaPipeHandTracking.initialize();

      // Create new recording session
      this.currentSession = {
        id: `recording_${Date.now()}`,
        startTime: Date.now(),
        handData: [],
        lerobotData: [],
        metadata: {
          frameCount: 0,
          resolution: { width: 1920, height: 1080 },
          deviceInfo: {
            model: 'iPhone',
            os: 'iOS',
            orientation: 'portrait'
          }
        }
      };

      // Start video recording
      if (cameraRef && cameraRef.recordAsync) {
        this.isRecording = true;
        mediaPipeHandTracking.startRecording();

        // Start frame processing for hand tracking
        this.startFrameProcessing(cameraRef);

        const video = await cameraRef.recordAsync({
          quality: this.videoQuality,
          maxDuration: 300, // 5 minutes max
          maxFileSize: 100 * 1024 * 1024, // 100MB max
          mute: false
        });

        this.currentSession.videoUri = video.uri;
        await this.saveRecording();
      }

      return this.currentSession.id;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async stopRecording(cameraRef: any): Promise<RecordingSession> {
    if (!this.isRecording || !this.currentSession) {
      throw new Error('No recording in progress');
    }

    try {
      // Stop camera recording
      if (cameraRef && cameraRef.stopRecording) {
        cameraRef.stopRecording();
      }

      // Stop frame processing
      this.stopFrameProcessing();

      // Stop MediaPipe recording
      const lerobotData = mediaPipeHandTracking.stopRecording();
      this.currentSession.lerobotData = lerobotData;

      // Update session metadata
      this.currentSession.endTime = Date.now();
      this.currentSession.metadata.duration = 
        (this.currentSession.endTime - this.currentSession.startTime) / 1000;
      this.currentSession.metadata.frameCount = this.frameCount;

      // Save to media library
      await this.saveToMediaLibrary();

      const session = { ...this.currentSession };
      this.currentSession = null;
      this.isRecording = false;
      this.frameCount = 0;

      return session;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  private startFrameProcessing(cameraRef: any): void {
    this.frameProcessingInterval = setInterval(async () => {
      if (!this.isRecording || !this.currentSession) return;

      try {
        // Capture frame for processing
        const photo = await cameraRef.takePictureAsync({
          quality: 0.5,
          base64: true,
          skipProcessing: true
        });

        // Process frame for hand tracking
        const imageData = this.base64ToImageData(photo.base64);
        const hands = await mediaPipeHandTracking.processFrame(imageData);
        
        // Detect gesture
        const gesture = mediaPipeHandTracking.detectGesture(hands);
        
        // Classify action for LeRobot
        const action = mediaPipeHandTracking.classifyAction(hands);
        
        // Add to recording
        mediaPipeHandTracking.addToRecording(hands, action);

        // Store hand data
        this.currentSession.handData.push({
          timestamp: Date.now(),
          hands,
          gesture
        });

        this.frameCount++;

        // Trigger overlay update if enabled
        if (this.handOverlayEnabled && hands.length > 0) {
          this.updateHandOverlay(hands);
        }
      } catch (error) {
        console.error('Frame processing error:', error);
      }
    }, 1000 / this.frameRate); // Process at specified frame rate
  }

  private stopFrameProcessing(): void {
    if (this.frameProcessingInterval) {
      clearInterval(this.frameProcessingInterval);
      this.frameProcessingInterval = null;
    }
  }

  private base64ToImageData(base64: string): ImageData {
    // Convert base64 to ImageData for processing
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create ImageData object (simplified - actual implementation would decode image properly)
    return {
      data: new Uint8ClampedArray(bytes),
      width: 1920,
      height: 1080
    } as ImageData;
  }

  private updateHandOverlay(hands: HandPose[]): void {
    // This would update the UI overlay in real-time
    // Implementation depends on the UI framework being used
    if (global.handOverlayCallback) {
      global.handOverlayCallback(hands);
    }
  }

  private async saveRecording(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Create directory for session data
      const sessionDir = `${FileSystem.documentDirectory}sessions/${this.currentSession.id}/`;
      await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });

      // Save hand tracking data
      const handDataPath = `${sessionDir}hand_data.json`;
      await FileSystem.writeAsStringAsync(
        handDataPath,
        JSON.stringify(this.currentSession.handData, null, 2)
      );

      // Save LeRobot dataset
      const lerobotDataset = mediaPipeHandTracking.exportLerobotDataset();
      const lerobotPath = `${sessionDir}lerobot_dataset.json`;
      await FileSystem.writeAsStringAsync(lerobotPath, lerobotDataset);

      // Save metadata
      const metadataPath = `${sessionDir}metadata.json`;
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(this.currentSession.metadata, null, 2)
      );

      console.log(`Recording saved to ${sessionDir}`);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  }

  private async saveToMediaLibrary(): Promise<void> {
    if (!this.currentSession?.videoUri) return;

    try {
      const asset = await MediaLibrary.createAssetAsync(this.currentSession.videoUri);
      
      // Create or get album
      const album = await MediaLibrary.getAlbumAsync('Humanoid Training');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Humanoid Training', asset, false);
      }

      console.log('Video saved to media library');
    } catch (error) {
      console.error('Failed to save to media library:', error);
    }
  }

  async exportSession(sessionId: string): Promise<string> {
    const sessionDir = `${FileSystem.documentDirectory}sessions/${sessionId}/`;
    
    try {
      // Read all session files
      const handData = await FileSystem.readAsStringAsync(`${sessionDir}hand_data.json`);
      const lerobotData = await FileSystem.readAsStringAsync(`${sessionDir}lerobot_dataset.json`);
      const metadata = await FileSystem.readAsStringAsync(`${sessionDir}metadata.json`);

      // Create export package
      const exportPackage = {
        sessionId,
        exportDate: new Date().toISOString(),
        handData: JSON.parse(handData),
        lerobotDataset: JSON.parse(lerobotData),
        metadata: JSON.parse(metadata)
      };

      // Save export package
      const exportPath = `${FileSystem.documentDirectory}exports/${sessionId}_export.json`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}exports/`, { 
        intermediates: true 
      });
      await FileSystem.writeAsStringAsync(
        exportPath,
        JSON.stringify(exportPackage, null, 2)
      );

      return exportPath;
    } catch (error) {
      console.error('Failed to export session:', error);
      throw error;
    }
  }

  async listRecordedSessions(): Promise<Array<{ id: string; date: string; duration: number }>> {
    try {
      const sessionsDir = `${FileSystem.documentDirectory}sessions/`;
      const sessionDirs = await FileSystem.readDirectoryAsync(sessionsDir);
      
      const sessions = await Promise.all(
        sessionDirs.map(async (dir) => {
          try {
            const metadataPath = `${sessionsDir}${dir}/metadata.json`;
            const metadataStr = await FileSystem.readAsStringAsync(metadataPath);
            const metadata = JSON.parse(metadataStr);
            
            return {
              id: dir,
              date: new Date(parseInt(dir.split('_')[1])).toISOString(),
              duration: metadata.duration || 0
            };
          } catch {
            return null;
          }
        })
      );

      return sessions.filter(s => s !== null) as Array<{ 
        id: string; 
        date: string; 
        duration: number 
      }>;
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  setHandOverlayEnabled(enabled: boolean): void {
    this.handOverlayEnabled = enabled;
  }

  setVideoQuality(quality: '720p' | '1080p' | '4K'): void {
    this.videoQuality = quality;
  }

  setFrameRate(rate: 15 | 30 | 60): void {
    this.frameRate = rate;
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  getCurrentSessionId(): string | null {
    return this.currentSession?.id || null;
  }
}

export const cameraRecordingService = new CameraRecordingService();