import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import HandTrackingService from '../services/HandTrackingService';
import LeRobotExportService from '../services/LeRobotExportService';
import { HandPose } from '../types';
import CameraView from '../components/CameraView';
import Logo from '../components/Logo';

const RecordingScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [handPoses, setHandPoses] = useState<HandPose[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [skillLabel, setSkillLabel] = useState('');
  const [stats, setStats] = useState<any>({});
  const [showSkillInput, setShowSkillInput] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeHandTracking();
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  const initializeHandTracking = useCallback(async () => {
    try {
      await HandTrackingService.initialize();
      setIsInitialized(true);
      updateStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize hand tracking');
    }
  }, []);

  const updateStats = useCallback(() => {
    const currentStats = HandTrackingService.getRecordingStats();
    setStats(currentStats);
  }, []);

  const handleCameraFrame = async (imageUri: string, timestamp: number) => {
    if (!isInitialized || !hasCameraPermission) return;

    try {
      const detectedHands = await HandTrackingService.processFrame(imageUri, timestamp);
      setHandPoses(detectedHands);

      if (isRecording) {
        HandTrackingService.recordFrame(imageUri, detectedHands, timestamp);
        updateStats();
      }
    } catch (error) {
      console.error('Frame processing error:', error);
    }
  };

  const simulateFrameProcessing = async () => {
    if (!isInitialized) {return;}

    try {
      const mockImageUri = `frame_${Date.now()}.jpg`;
      const timestamp = Date.now();

      const detectedHands = await HandTrackingService.processFrame(mockImageUri, timestamp);
      setHandPoses(detectedHands);

      if (isRecording) {
        HandTrackingService.recordFrame(mockImageUri, detectedHands, timestamp);
        updateStats();
      }
    } catch (error) {
      console.error('Frame processing error:', error);
    }
  };

  const startSkillTraining = () => {
    if (!skillLabel.trim()) {
      setShowSkillInput(true);
      return;
    }

    HandTrackingService.setCurrentSkill(skillLabel.trim());
    setIsRecording(true);
    setShowSkillInput(false);

    // Start continuous frame processing only if no camera permission
    if (!hasCameraPermission) {
      trackingIntervalRef.current = setInterval(() => {
        simulateFrameProcessing();
      }, 33); // ~30fps
    }

    updateStats();
    console.log(`Started training skill: ${skillLabel}`);
  };

  const stopSkillTraining = () => {
    setIsRecording(false);

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    updateStats();
    console.log('Stopped skill training');
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopSkillTraining();
    } else {
      startSkillTraining();
    }
  };

  const handleExportAllData = async () => {
    const stats = HandTrackingService.getStats();

    if (stats.episodes === 0) {
      Alert.alert('No Data', 'No training data has been recorded yet');
      return;
    }

    try {
      const episodes = HandTrackingService.getAllEpisodes();
      const taskName = stats.currentSkill || 'mixed_tasks';

      await LeRobotExportService.exportToLeRobotFormat(episodes, taskName, 'humanoid');

      // Also export the original format
      await HandTrackingService.exportAndShare();
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export training data');
    }
  };

  const handleStartNewTask = () => {
    // Clear all existing data and show skill input modal
    HandTrackingService.clearAllData();
    setSkillLabel('');
    setShowSkillInput(true);
    updateStats();
  };

  const SkillInputModal = useCallback(() => (
    <View style={styles.skillInputContainer}>
      <Text style={styles.skillInputTitle}>What task are you demonstrating?</Text>
      <Text style={styles.skillInputSubtitle}>Describe the complete activity you'll perform</Text>
      <TextInput
        style={styles.skillInput}
        value={skillLabel}
        onChangeText={setSkillLabel}
        placeholder="e.g., 'cooking omelet', 'assembling car part', 'cleaning kitchen', 'folding laundry'"
        placeholderTextColor={COLORS.textSecondary}
        autoFocus
        multiline
        numberOfLines={3}
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={() => {
          if (skillLabel.trim()) {
            startSkillTraining();
          }
        }}
      />
      <View style={styles.durationHint}>
        <Icon name="time" size={16} color={COLORS.textSecondary} />
        <Text style={styles.durationText}>
          Works for any duration: 30 seconds to 8+ hours
        </Text>
      </View>
      <View style={styles.skillInputButtons}>
        <TouchableOpacity
          style={[styles.skillInputButton, styles.cancelButton]}
          onPress={() => setShowSkillInput(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skillInputButton, styles.confirmButton]}
          onPress={() => {
            if (skillLabel.trim()) {
              startSkillTraining();
            }
          }}
        >
          <Text style={styles.confirmButtonText}>Start Recording</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [skillLabel]);

  const getStatusColor = () => {
    if (!isInitialized) return COLORS.textSecondary;
    if (stats.isAutoDetecting) return COLORS.success;
    if (isRecording) return COLORS.primary;
    return COLORS.textSecondary;
  };

  const getStatusText = () => {
    if (!isInitialized) return 'Initializing...';
    if (stats.isAutoDetecting) return 'Auto-detecting episodes';
    if (isRecording) return 'Recording manually';
    if (stats.currentSkill) return `Ready to train "${stats.currentSkill}"`;
    return 'Ready to start';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Logo size={80} style={styles.logo} />
          <Text style={styles.title}>Humanoid Training</Text>
          <Text style={styles.subtitle}>Capture human movements for robot learning</Text>
        </View>

        {/* Camera Feed */}
        <View style={styles.cameraContainer}>
          <CameraView
            onFrameCapture={handleCameraFrame}
            isRecording={isRecording}
            onPermissionChange={setHasCameraPermission}
            handPoses={handPoses}
          />

          {/* Status Indicator Overlay */}
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>

        </View>

        {/* Current Skill */}
        {stats.currentSkill && (
          <View style={styles.currentSkillContainer}>
            <View style={styles.currentSkillHeader}>
              <Icon name="flash" size={20} color={COLORS.primary} />
              <Text style={styles.currentSkillTitle}>Training: {stats.currentSkill}</Text>
            </View>
            <View style={styles.skillStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.skillEpisodeCount || 0}</Text>
                <Text style={styles.statLabel}>Episodes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.frameCount || 0}</Text>
                <Text style={styles.statLabel}>Current Frames</Text>
              </View>
              {stats.autoDetectionEnabled && (
                <View style={styles.autoDetectBadge}>
                  <Icon name="sparkles" size={12} color={COLORS.success} />
                  <Text style={styles.autoDetectText}>Auto-detect</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Auto-detection Info */}
        {stats.skillEpisodeCount >= 3 && !stats.autoDetectionEnabled && (
          <View style={styles.infoCard}>
            <Icon name="information-circle" size={20} color={COLORS.warning} />
            <Text style={styles.infoText}>
              Auto-detection will enable after 3 episodes for this skill
            </Text>
          </View>
        )}

        {/* Main Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isRecording && styles.actionButtonActive,
              !isInitialized && styles.actionButtonDisabled,
            ]}
            onPress={handleToggleRecording}
            disabled={!isInitialized}
          >
            <Icon
              name={isRecording ? 'stop' : 'play'}
              size={24}
              color={COLORS.text}
            />
            <Text style={styles.actionButtonText}>
              {isRecording ? 'Stop Recording' : (stats.currentSkill ? 'Continue Recording' : 'Start Recording')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* New Task Button - only show when there's existing data */}
          {(stats.episodes > 0 || stats.currentEpisodeFrames > 0) && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleStartNewTask}
            >
              <Icon name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Start New Task</Text>
            </TouchableOpacity>
          )}

          {/* Export Button */}
          {(stats.episodes > 0 || stats.currentEpisodeFrames > 0) && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportAllData}
            >
              <Icon name="download" size={20} color={COLORS.primary} />
              <Text style={styles.exportButtonText}>Export LeRobot Dataset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Skill Input Modal */}
        {showSkillInput && <SkillInputModal />}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  header: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  logo: {
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    height: 250,
    marginVertical: SPACING.lg,
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  statusIndicator: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    zIndex: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  statusText: {
    ...TYPOGRAPHY.small,
    fontWeight: '600',
  },
  handIndicators: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    zIndex: 10,
  },
  handIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  handIndicatorText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  currentSkillContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  currentSkillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  currentSkillTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  skillStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: 'auto',
  },
  autoDetectText: {
    ...TYPOGRAPHY.small,
    color: COLORS.success,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.warning,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  actionContainer: {
    marginVertical: SPACING.lg,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  actionButtonActive: {
    backgroundColor: COLORS.error,
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  },
  actionButtonText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  exportButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  skillInputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background + 'F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  skillInputTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  skillInputSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  durationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface + '80',
    borderRadius: BORDER_RADIUS.md,
  },
  durationText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    fontStyle: 'italic',
  },
  skillInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    fontSize: 16,
    color: COLORS.text,
    width: '100%',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  skillInputButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  skillInputButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  confirmButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  buttonContainer: {
    gap: SPACING.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
});

export default RecordingScreen;
