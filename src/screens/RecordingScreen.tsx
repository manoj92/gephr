import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const RecordingScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<Camera>(null);

  const recordButtonScale = useSharedValue(1);
  const recordingPulse = useSharedValue(1);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      recordingPulse.value = withRepeat(
        withTiming(1.2, { duration: 1000 }),
        -1,
        true
      );
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      recordingPulse.value = withTiming(1);
      setRecordingDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleRecordPress = () => {
    recordButtonScale.value = withSpring(0.9, {}, () => {
      recordButtonScale.value = withSpring(1);
    });

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        // Here you would implement actual video recording
        // and hand tracking logic
        console.log('Started recording...');
      } catch (error) {
        Alert.alert('Error', 'Failed to start recording');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      console.log('Stopped recording...');
      // Process and save the recorded data
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const recordButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordButtonScale.value }],
  }));

  const recordingIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingPulse.value }],
  }));

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Requesting camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <Text style={styles.permissionSubtext}>
            Please enable camera access to record hand movements
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.backgroundSecondary, COLORS.background]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Hand Tracking Recording</Text>
          {isRecording && (
            <View style={styles.recordingInfo}>
              <Animated.View style={[styles.recordingDot, recordingIndicatorStyle]} />
              <Text style={styles.recordingText}>
                Recording • {formatDuration(recordingDuration)}
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.back}
          ratio="16:9"
        >
          {/* Hand tracking overlay would go here */}
          <View style={styles.overlay}>
            <View style={styles.trackingInfo}>
              <View style={styles.infoCard}>
                <Ionicons name="hand-left" size={20} color={COLORS.primary} />
                <Text style={styles.infoText}>Left Hand: Detected</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="hand-right" size={20} color={COLORS.primary} />
                <Text style={styles.infoText}>Right Hand: Detected</Text>
              </View>
            </View>
          </View>
        </Camera>
      </View>

      <View style={styles.controls}>
        <LinearGradient
          colors={[COLORS.background, COLORS.backgroundSecondary]}
          style={styles.controlsGradient}
        >
          <View style={styles.controlsContent}>
            <Pressable style={styles.settingsButton}>
              <Ionicons name="settings" size={24} color={COLORS.textSecondary} />
            </Pressable>

            <Animated.View style={recordButtonStyle}>
              <Pressable
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                ]}
                onPress={handleRecordPress}
              >
                <LinearGradient
                  colors={
                    isRecording
                      ? [COLORS.error, '#FF7043']
                      : [COLORS.primary, COLORS.primaryDark]
                  }
                  style={styles.recordButtonGradient}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'videocam'}
                    size={32}
                    color={COLORS.text}
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable style={styles.galleryButton}>
              <Ionicons name="folder" size={24} color={COLORS.textSecondary} />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  permissionSubtext: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    zIndex: 10,
  },
  headerGradient: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
    marginRight: SPACING.sm,
  },
  recordingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.error,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  trackingInfo: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  controls: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  controlsGradient: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  controlsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    ...SHADOWS.large,
  },
  recordButtonActive: {
    ...SHADOWS.glow,
  },
  recordButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
});

export default RecordingScreen; 