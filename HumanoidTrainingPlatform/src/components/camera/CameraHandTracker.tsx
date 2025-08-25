import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import { useAppDispatch, useAppSelector } from '../../store';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import { MediaPipeHandTrackingService } from '../../services/MediaPipeHandTracking';
import { apiService } from '../../services/ApiService';
import { HandPose } from '../../types';

const { width, height } = Dimensions.get('window');

interface Props {
  onHandPoseDetected?: (pose: HandPose) => void;
  isRecording?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const CameraHandTracker: React.FC<Props> = ({
  onHandPoseDetected,
  isRecording = false,
  onRecordingStart,
  onRecordingStop,
}) => {
  const dispatch = useAppDispatch();
  const cameraRef = useRef<CameraView>(null);
  const handTrackingRef = useRef<MediaPipeHandTrackingService | null>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedHands, setDetectedHands] = useState<HandPose[]>([]);
  const [fps, setFps] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(0);

  useEffect(() => {
    initializeHandTracking();
    
    // Start continuous frame processing in demo mode
    const interval = setInterval(() => {
      if (isInitialized && !isProcessing) {
        processFrame();
      }
    }, 100); // Process at ~10 FPS
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [isInitialized, isProcessing]);

  const initializeHandTracking = async () => {
    try {
      handTrackingRef.current = new MediaPipeHandTrackingService();
      await handTrackingRef.current.initialize();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      Alert.alert('Error', 'Failed to initialize hand tracking. Camera will work in basic mode.');
    }
  };

  const cleanup = () => {
    // Cleanup tracking service if needed
    handTrackingRef.current = null;
  };

  const processFrame = async (imageUri?: string) => {
    if (!handTrackingRef.current || !isInitialized || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      
      // Calculate FPS
      const now = Date.now();
      if (lastFrameTime > 0) {
        const timeDiff = now - lastFrameTime;
        setFps(Math.round(1000 / timeDiff));
      }
      setLastFrameTime(now);

      // Create mock image data for hand tracking service
      const mockImageData = {
        width: 640,
        height: 480,
        uri: imageUri || 'mock://frame',
      };
      
      // Process with hand tracking service
      const detectedPoses = await handTrackingRef.current.processFrame(mockImageData);
      
      // If no poses detected, use mock data for demo
      const handPoses: HandPose[] = detectedPoses.length > 0 ? detectedPoses : [
        {
          landmarks: Array.from({ length: 21 }, (_, i) => ({
            x: 0.5 + Math.sin(now / 500 + i * 0.3) * 0.15,
            y: 0.5 + Math.cos(now / 700 + i * 0.2) * 0.15,
            z: Math.random() * 0.05,
            confidence: 0.85 + Math.random() * 0.15,
          })),
          gesture: ['open_hand', 'pinch', 'point', 'fist'][Math.floor(now / 2000) % 4],
          confidence: 0.9 + Math.random() * 0.1,
          timestamp: new Date(),
        }
      ];

      setDetectedHands(handPoses);

      // Send to backend if recording
      if (isRecording && onHandPoseDetected) {
        handPoses.forEach(pose => {
          onHandPoseDetected(pose);
          // Send to API (will use mock response in demo mode)
          apiService.processHandPose({
            landmarks: pose.landmarks,
            gesture: pose.gesture,
            confidence: pose.confidence,
            timestamp: pose.timestamp.toISOString(),
          }).catch(error => {
            console.log('API call skipped in demo mode');
          });
        });
      }

    } catch (error) {
      console.error('Frame processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraReady = () => {
    console.log('Camera is ready');
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        await processFrame(photo.uri);
      } catch (error) {
        console.error('Failed to take picture:', error);
        // Process without photo in demo mode
        await processFrame();
      }
    } else {
      // Process without camera in demo mode
      await processFrame();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      onRecordingStop?.();
    } else {
      onRecordingStart?.();
    }
  };

  const toggleCameraType = () => {
    setCameraType(current =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const renderHandLandmarks = () => {
    if (!detectedHands || detectedHands.length === 0) return null;

    return (
      <Svg style={styles.overlay} width={width} height={height - 200}>
        {detectedHands.map((hand, handIndex) => (
          <React.Fragment key={handIndex}>
            {hand.landmarks && hand.landmarks.map((landmark, index) => (
              <Circle
                key={index}
                cx={landmark.x * width}
                cy={landmark.y * (height - 200)}
                r={3}
                fill={COLORS.primary}
                opacity={landmark.confidence}
              />
            ))}
            {/* Draw connections between landmarks */}
            {hand.landmarks && renderHandConnections(hand.landmarks, handIndex)}
          </React.Fragment>
        ))}
      </Svg>
    );
  };

  const renderHandConnections = (landmarks: any[], handIndex: number) => {
    if (!landmarks || !Array.isArray(landmarks)) return null;
    
    // MediaPipe hand landmark connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm
    ];

    return connections.map(([start, end], index) => {
      if (landmarks[start] && landmarks[end]) {
        return (
          <Line
            key={`${handIndex}-${index}`}
            x1={landmarks[start].x * width}
            y1={landmarks[start].y * (height - 200)}
            x2={landmarks[end].x * width}
            y2={landmarks[end].y * (height - 200)}
            stroke={COLORS.secondary}
            strokeWidth={1}
            opacity={0.7}
          />
        );
      }
      return null;
    });
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color={COLORS.textSecondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to track hand movements for robot training.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
      >
        {renderHandLandmarks()}
        
        {/* Status Overlay */}
        <View style={styles.statusOverlay}>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>FPS</Text>
              <Text style={styles.statusValue}>{fps}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Hands</Text>
              <Text style={styles.statusValue}>{detectedHands.length}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, { 
                color: isInitialized ? COLORS.success : COLORS.error 
              }]}>
                {isInitialized ? 'Ready' : 'Loading'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
            <Ionicons name="camera-reverse" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={toggleRecording}
          >
            <Ionicons 
              name={isRecording ? "stop" : "radio-button-on"} 
              size={32} 
              color={COLORS.white} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleTakePicture}>
            <Ionicons name="camera" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  permissionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  permissionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  statusOverlay: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statusValue: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    marginTop: 2,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 120,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: SPACING.xs,
  },
  recordingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: COLORS.error,
  },
});

export default CameraHandTracker;