import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Camera, CameraView, CameraType, useCameraPermissions } from 'expo-camera';
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
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (permission?.granted) {
      onPermissionChange?.(true);
    } else {
      onPermissionChange?.(false);
    }
  }, [permission, onPermissionChange]);

  useEffect(() => {
    if (isRecording && permission?.granted) {
      startFrameCapture();
    } else {
      stopFrameCapture();
    }

    return () => stopFrameCapture();
  }, [isRecording, permission?.granted]);

  const startFrameCapture = () => {
    if (frameIntervalRef.current) return;

    frameIntervalRef.current = setInterval(async () => {
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.5,
            base64: false,
            skipProcessing: true,
          });

          if (photo?.uri) {
            onFrameCapture(photo.uri, Date.now());
          }
        } catch (error) {
          console.error('Error capturing frame:', error);
        }
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

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera" size={48} color={COLORS.textSecondary} />
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={48} color={COLORS.textSecondary} />
        <Text style={styles.permissionText}>Camera access is required for hand tracking</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        animateShutter={false}
      >
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
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
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