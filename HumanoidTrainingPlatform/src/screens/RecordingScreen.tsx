import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/ApiService';
import CameraHandTracker from '../components/camera/CameraHandTracker';
import { HandPose } from '../types';

const RecordingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isRecording, setIsRecording] = useState(false);
  const [sessionData, setSessionData] = useState<HandPose[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  const handleHandPoseDetected = (pose: HandPose) => {
    if (isRecording) {
      setSessionData(prev => [...prev, pose]);
    }
  };

  const handleStartRecording = async () => {
    try {
      // Create new training session
      const session = await apiService.createTrainingSession(
        `Hand Tracking Session ${new Date().toLocaleString()}`,
        'default_robot'
      );
      
      setCurrentSession(session.id);
      setIsRecording(true);
      setSessionData([]);
      
      Alert.alert('Recording Started', 'Hand tracking is now active. Move your hands to generate robot commands.');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    if (!currentSession || sessionData.length === 0) {
      setIsRecording(false);
      return;
    }

    try {
      // Convert hand poses to LeRobot actions
      const actions = sessionData.map(pose => ({
        action_type: pose.gesture,
        timestamp: pose.timestamp.toISOString(),
        hand_pose: {
          landmarks: pose.landmarks,
          confidence: pose.confidence,
        },
        robot_state: {
          // This would be filled with actual robot state
          timestamp: pose.timestamp.toISOString(),
        },
      }));

      // Upload training data
      await apiService.uploadTrainingData(currentSession, actions);
      
      // Complete session
      await apiService.completeTrainingSession(currentSession);
      
      setIsRecording(false);
      setCurrentSession(null);
      
      Alert.alert(
        'Recording Saved', 
        `Captured ${sessionData.length} hand poses. Training data has been uploaded.`
      );
    } catch (error) {
      console.error('Failed to save recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hand Tracking Recording</Text>
        <Text style={styles.subtitle}>
          {isRecording 
            ? `Recording: ${sessionData.length} poses captured`
            : 'Position your hands in the camera view'
          }
        </Text>
      </View>

      {/* Camera Component */}
      <View style={styles.cameraContainer}>
        <CameraHandTracker
          onHandPoseDetected={handleHandPoseDetected}
          isRecording={isRecording}
          onRecordingStart={handleStartRecording}
          onRecordingStop={handleStopRecording}
        />
      </View>

      {/* Session Info */}
      {currentSession && (
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionText}>
            Session: {currentSession}
          </Text>
          <Text style={styles.sessionText}>
            Poses Captured: {sessionData.length}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  sessionInfo: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
});

export default RecordingScreen;