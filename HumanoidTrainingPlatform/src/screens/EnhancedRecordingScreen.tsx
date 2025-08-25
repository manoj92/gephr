import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HapticFeedback from '../utils/haptics';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';
import { handTrackingService } from '../services/MediaPipeHandTracking';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { startRecording, stopRecording } from '../store/slices/recordingSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EnhancedRecordingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isRecording, currentSession } = useAppSelector(state => state.recording);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [handData, setHandData] = useState<any>(null);
  const [fps, setFps] = useState(0);
  const [detectedHands, setDetectedHands] = useState(0);
  
  const cameraRef = useRef<Camera>(null);
  const recordingAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const handIndicatorAnimation = useSharedValue(0);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && mediaStatus === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingAnimation.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseAnimation.value = withRepeat(
        withSpring(1.2, { damping: 2 }),
        -1,
        true
      );
    } else {
      recordingAnimation.value = withTiming(0);
      pulseAnimation.value = withSpring(1);
    }
  }, [isRecording]);

  useEffect(() => {
    if (detectedHands > 0) {
      handIndicatorAnimation.value = withSpring(1);
    } else {
      handIndicatorAnimation.value = withSpring(0);
    }
  }, [detectedHands]);

  const recordingIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(recordingAnimation.value, [0, 1], [0.3, 1]),
    transform: [{ scale: pulseAnimation.value }],
  }));

  const handIndicatorStyle = useAnimatedStyle(() => ({
    opacity: handIndicatorAnimation.value,
    transform: [
      { 
        scale: interpolate(
          handIndicatorAnimation.value,
          [0, 1],
          [0.8, 1]
        )
      }
    ],
  }));

  const handleStartRecording = async () => {
    if (!isCameraReady) {
      Alert.alert('Camera not ready', 'Please wait for camera to initialize');
      return;
    }

    HapticFeedback.trigger('impactMedium');
    
    try {
      await handTrackingService.startTracking();
      dispatch(startRecording({
        sessionName: `Recording_${Date.now()}`,
        taskType: 'manipulation',
      }));
      
      // Start processing frames
      processFrames();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    HapticFeedback.trigger('impactHeavy');
    
    try {
      await handTrackingService.stopTracking();
      dispatch(stopRecording());
      
      Alert.alert(
        'Recording Saved',
        `Captured ${currentSession?.dataPoints || 0} data points`,
        [{ text: 'OK', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const processFrames = async () => {
    let frameCount = 0;
    let lastTime = Date.now();
    
    const frameProcessor = setInterval(async () => {
      if (!isRecording) {
        clearInterval(frameProcessor);
        return;
      }

      frameCount++;
      const currentTime = Date.now();
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      // Simulate hand tracking
      const mockHandData = await handTrackingService.processFrame({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        data: new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT * 4),
        timestamp: currentTime,
      });

      if (mockHandData) {
        setHandData(mockHandData);
        setDetectedHands(mockHandData.hands ? mockHandData.hands.length : 0);
      }
    }, 33); // ~30 FPS
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <BlurView intensity={100} style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </BlurView>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="camera-off" size={64} color={COLORS.error} />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <NeonButton
            title="Grant Permission"
            onPress={() => Camera.requestCameraPermissionsAsync()}
            variant="primary"
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={30} />
      
      <CameraView
        style={styles.camera}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        {/* Top Controls */}
        <View style={styles.topControls}>
          <GlassCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>FPS</Text>
                <Text style={styles.statValue}>{fps}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Hands</Text>
                <Animated.View style={handIndicatorStyle}>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>
                    {detectedHands}
                  </Text>
                </Animated.View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Points</Text>
                <Text style={styles.statValue}>{currentSession?.dataPoints || 0}</Text>
              </View>
            </View>
          </GlassCard>

          {isRecording && (
            <Animated.View style={[styles.recordingIndicator, recordingIndicatorStyle]}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>RECORDING</Text>
            </Animated.View>
          )}
        </View>

        {/* Hand Tracking Overlay */}
        {handData && (
          <View style={styles.handOverlay}>
            {handData.landmarks?.map((point: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.landmarkPoint,
                  {
                    left: point.x * SCREEN_WIDTH,
                    top: point.y * SCREEN_HEIGHT,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <GlassCard style={styles.controlsCard}>
            <View style={styles.mainControls}>
              {!isRecording ? (
                <TouchableOpacity
                  style={styles.recordButtonContainer}
                  onPress={handleStartRecording}
                >
                  <LinearGradient
                    colors={['#FF0080', '#FF00FF', '#8000FF']}
                    style={styles.recordButton}
                  >
                    <Ionicons name="radio-button-on" size={64} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.recordButtonContainer}
                  onPress={handleStopRecording}
                >
                  <Animated.View style={recordingIndicatorStyle}>
                    <LinearGradient
                      colors={['#FF0040', '#FF0080', '#FF00C0']}
                      style={styles.stopButton}
                    >
                      <Ionicons name="stop" size={48} color="#FFF" />
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gestureList}>
              {['Pick', 'Place', 'Rotate', 'Push', 'Pull'].map((gesture) => (
                <TouchableOpacity key={gesture} style={styles.gestureChip}>
                  <Text style={styles.gestureText}>{gesture}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>
        </View>
      </CameraView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionText: {
    fontSize: 20,
    color: COLORS.text,
    marginVertical: SPACING.lg,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    zIndex: 100,
  },
  statsCard: {
    padding: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0040',
    marginRight: SPACING.sm,
  },
  recordingText: {
    color: '#FF0040',
    fontWeight: 'bold',
    fontSize: 14,
  },
  handOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  landmarkPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF00',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
  },
  controlsCard: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  mainControls: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  recordButtonContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gestureList: {
    maxHeight: 50,
  },
  gestureChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  gestureText: {
    color: COLORS.text,
    fontSize: 14,
  },
});

export default EnhancedRecordingScreen;