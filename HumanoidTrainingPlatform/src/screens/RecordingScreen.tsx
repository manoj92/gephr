import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/ApiService';

const RecordingScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackingStatus();
  }, []);

  const loadTrackingStatus = async () => {
    try {
      const status = await apiService.getTrackingStatus();
      setTrackingStatus(status);
    } catch (error) {
      console.error('Failed to load tracking status:', error);
      setTrackingStatus({
        tracking_active: false,
        fps: 0,
        latency_ms: 0,
        hands_detected: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      
      // Simulate hand pose processing
      const mockHandPose = {
        landmarks: [
          { x: 0.5, y: 0.3, z: 0.1 },
          { x: 0.6, y: 0.4, z: 0.2 },
        ],
        gesture: 'open_hand',
        confidence: 0.95
      };
      
      const result = await apiService.processHandPose(mockHandPose);
      console.log('Hand pose processed:', result);
      
      Alert.alert('Recording Started', 'Hand tracking is now active. Move your hands to generate robot commands.');
      
      // Update tracking status
      await loadTrackingStatus();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    Alert.alert('Recording Stopped', 'Hand tracking session has been saved.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tracking status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hand Tracking</Text>
        <Text style={styles.subtitle}>Record hand movements for robot training</Text>
      </View>

      <View style={styles.content}>
        {trackingStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.sectionTitle}>Tracking Status</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, { 
                  color: trackingStatus.tracking_active ? COLORS.success : COLORS.error 
                }]}>
                  {trackingStatus.tracking_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>FPS:</Text>
                <Text style={styles.statusValue}>{trackingStatus.fps}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Latency:</Text>
                <Text style={styles.statusValue}>{trackingStatus.latency_ms}ms</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Hands Detected:</Text>
                <Text style={styles.statusValue}>{trackingStatus.hands_detected}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.cameraContainer}>
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraText}>Camera</Text>
            <Text style={styles.cameraSubtext}>Camera view will appear here</Text>
            <Text style={styles.cameraSubtext}>Hand tracking visualization</Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          {!isRecording ? (
            <TouchableOpacity 
              style={styles.recordButton}
              onPress={handleStartRecording}
            >
              <Text style={styles.recordButtonText}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.recordButton, styles.stopButton]}
              onPress={handleStopRecording}
            >
              <Text style={styles.recordButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>• Position your hands within the camera frame</Text>
            <Text style={styles.instructionsText}>• Perform clear, deliberate movements</Text>
            <Text style={styles.instructionsText}>• Wait for green tracking indicators</Text>
            <Text style={styles.instructionsText}>• Recording will automatically save to LeRobot format</Text>
          </View>
        </View>
      </View>
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
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  statusContainer: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  statusValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    marginBottom: SPACING.lg,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  cameraText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  cameraSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  controlsContainer: {
    gap: SPACING.lg,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  recordButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  instructionsTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
});

export default RecordingScreen;