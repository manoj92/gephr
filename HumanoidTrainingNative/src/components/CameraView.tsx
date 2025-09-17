import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

interface CameraViewProps {
  onFrameCapture: (imageUri: string, timestamp: number) => void;
  isRecording: boolean;
  onPermissionChange?: (hasPermission: boolean) => void;
}

const CameraViewComponent: React.FC<CameraViewProps> = ({
  onFrameCapture,
  isRecording,
  onPermissionChange
}) => {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (hasPermission === false) {
      requestPermission();
    }
    onPermissionChange?.(hasPermission === true);
  }, [hasPermission, onPermissionChange]);

  useEffect(() => {
    if (isRecording && hasPermission) {
      startFrameCapture();
    } else {
      stopFrameCapture();
    }

    return () => stopFrameCapture();
  }, [isRecording, hasPermission]);

  const startFrameCapture = () => {
    if (frameIntervalRef.current) return;

    frameIntervalRef.current = setInterval(async () => {
      try {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePhoto({
            qualityPrioritization: 'speed',
            enableShutterSound: false,
          });
          onFrameCapture(photo.path, Date.now());
        }
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    }, 100); // 10 FPS - adjust as needed for performance
  };

  const stopFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={48} color={COLORS.textSecondary} />
        <Text style={styles.permissionText}>Camera access is required for hand tracking</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null || hasPermission !== true) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="camera-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>RECORDING</Text>
        </View>
      )}

      {/* Camera flip button */}
      <TouchableOpacity
        style={styles.flipButton}
        onPress={toggleCameraFacing}
      >
        <Icon name="camera-reverse" size={24} color={COLORS.text} />
      </TouchableOpacity>

      {/* Camera info */}
      <View style={styles.cameraInfo}>
        <Text style={styles.cameraInfoText}>
          {facing === 'front' ? 'Front Camera' : 'Back Camera'}
        </Text>
        <Text style={styles.cameraInfoText}>
          {isRecording ? '10 FPS' : 'Ready'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  permissionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  recordingIndicator: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginRight: SPACING.xs,
  },
  recordingText: {
    ...TYPOGRAPHY.small,
    color: COLORS.error,
    fontWeight: '600',
  },
  flipButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface + '80',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraInfo: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.surface + '80',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  cameraInfoText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default CameraViewComponent;