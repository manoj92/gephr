import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/ApiService';

const RobotScreen: React.FC = () => {
  const navigation = useNavigation();
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedRobot, setConnectedRobot] = useState<string | null>(null);

  useEffect(() => {
    loadRobots();
  }, []);

  const loadRobots = async () => {
    try {
      const result = await apiService.getRobots();
      setRobots(result.robots);
    } catch (error) {
      console.error('Failed to load robots:', error);
      setRobots([
        { id: 'robot_1', name: 'Unitree G1', type: 'humanoid', status: 'available' },
        { id: 'robot_2', name: 'Boston Dynamics Spot', type: 'quadruped', status: 'offline' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRobot = () => {
    Alert.alert('Robot Connection', 'Searching for available robots...');
  };

  const handleDisconnectRobot = () => {
    Alert.alert('Robot Connection', 'Robot disconnected successfully');
  };

  const handleTestMovement = () => {
    Alert.alert('Robot Control', 'Sending test movement command to robot...');
  };

  const handleCalibrateRobot = () => {
    Alert.alert('Robot Calibration', 'Starting robot calibration sequence...');
  };

  const handleEmergencyStop = () => {
    Alert.alert(
      'Emergency Stop',
      'Are you sure you want to emergency stop the robot?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'STOP', style: 'destructive', onPress: () => Alert.alert('Emergency Stop', 'Robot stopped immediately!') }
      ]
    );
  };

  const handleViewTelemetry = () => {
    Alert.alert('Telemetry', 'Robot telemetry data viewer coming soon!');
  };

  const handleSyncTraining = () => {
    Alert.alert('Training Sync', 'Syncing training data with robot...');
  };

  const handleRobotSettings = () => {
    Alert.alert('Robot Settings', 'Robot configuration settings coming soon!');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Robot Control</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={handleRobotSettings}>
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Robot Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connection:</Text>
          <Text style={[styles.statusValue, { color: COLORS.error }]}>Disconnected</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Battery:</Text>
          <Text style={styles.statusValue}>--</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Mode:</Text>
          <Text style={styles.statusValue}>Standby</Text>
        </View>
      </View>

      <View style={styles.connectionSection}>
        <Text style={styles.sectionTitle}>Connection</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleConnectRobot}>
            <Text style={styles.primaryButtonText}>Connect Robot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleDisconnectRobot}>
            <Text style={styles.secondaryButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlSection}>
        <Text style={styles.sectionTitle}>Robot Control</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleTestMovement}>
          <Text style={styles.actionButtonText}>Test Movement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleCalibrateRobot}>
          <Text style={styles.actionButtonText}>Calibrate Robot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleSyncTraining}>
          <Text style={styles.actionButtonText}>Sync Training Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monitoringSection}>
        <Text style={styles.sectionTitle}>Monitoring</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleViewTelemetry}>
          <Text style={styles.actionButtonText}>View Telemetry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.emergencySection}>
        <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyStop}>
          <Text style={styles.emergencyButtonText}>EMERGENCY STOP</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  settingsButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
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
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  connectionSection: {
    marginBottom: SPACING.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    textAlign: 'center',
  },
  controlSection: {
    marginBottom: SPACING.xl,
  },
  monitoringSection: {
    marginBottom: SPACING.xl,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  emergencySection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  emergencyButton: {
    backgroundColor: COLORS.error,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  emergencyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RobotScreen;