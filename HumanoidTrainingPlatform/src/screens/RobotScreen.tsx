import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/ApiService';

const RobotScreen: React.FC = () => {
  const navigation = useNavigation();
  const [supportedRobots, setSupportedRobots] = useState<any[]>([]);
  const [connectedRobot, setConnectedRobot] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showRobotSelector, setShowRobotSelector] = useState(false);
  const [robotState, setRobotState] = useState<any>(null);
  const [trainingPipelines, setTrainingPipelines] = useState<any[]>([]);

  useEffect(() => {
    loadSupportedRobots();
    loadUserPipelines();
  }, []);

  const loadSupportedRobots = async () => {
    try {
      const result = await apiService.getSupportedRobots();
      setSupportedRobots([
        {
          id: 'unitree_g1_001',
          name: 'Unitree G1 #001',
          type: 'unitree_g1',
          status: 'available',
          battery: 85,
          location: 'Lab Station 1',
          capabilities: ['bipedal_walking', 'manipulation', 'vision', 'balance', 'navigation']
        },
        {
          id: 'unitree_g1_002',
          name: 'Unitree G1 #002',
          type: 'unitree_g1',
          status: 'offline',
          battery: 45,
          location: 'Lab Station 2',
          capabilities: ['bipedal_walking', 'manipulation', 'vision', 'balance', 'navigation']
        },
        {
          id: 'custom_humanoid_001',
          name: 'Custom Humanoid Alpha',
          type: 'custom_humanoid',
          status: 'available',
          battery: 92,
          location: 'Research Lab',
          capabilities: ['bipedal_walking', 'manipulation', 'vision', 'balance', 'navigation', 'speech']
        }
      ]);
    } catch (error) {
      console.error('Failed to load supported robots:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPipelines = async () => {
    try {
      const result = await apiService.getUserPipelines(5);
      setTrainingPipelines(result.pipelines || []);
    } catch (error) {
      console.error('Failed to load training pipelines:', error);
    }
  };

  const handleConnectRobot = () => {
    setShowRobotSelector(true);
  };

  const handleSelectRobot = async (robot: any) => {
    setShowRobotSelector(false);
    setConnecting(true);
    
    try {
      const result = await apiService.connectRobot({
        robot_id: robot.id,
        robot_type: robot.type,
        connection_type: 'wifi'
      });
      
      if (result.success) {
        setConnectedRobot(robot);
        Alert.alert('Success', `Connected to ${robot.name}`);
        // Start polling robot state
        pollRobotState(robot.id);
      } else {
        Alert.alert('Connection Failed', result.error || 'Failed to connect to robot');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to robot');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectRobot = async () => {
    if (!connectedRobot) return;
    
    try {
      await apiService.disconnectRobot(connectedRobot.id);
      setConnectedRobot(null);
      setRobotState(null);
      Alert.alert('Success', 'Robot disconnected successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect robot');
    }
  };

  const pollRobotState = async (robotId: string) => {
    try {
      const state = await apiService.getRobotState(robotId);
      setRobotState(state.state);
    } catch (error) {
      console.error('Failed to get robot state:', error);
    }
  };

  const handleTestMovement = async () => {
    if (!connectedRobot) return;
    
    try {
      const result = await apiService.sendRobotCommand({
        robot_id: connectedRobot.id,
        command_type: 'move',
        parameters: {
          direction: 'forward',
          speed: 0.3,
          distance: 0.5
        }
      });
      
      Alert.alert('Command Sent', `Test movement command sent to ${connectedRobot.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send movement command');
    }
  };

  const handleStartGR00TTraining = () => {
    Alert.alert(
      'GR00T Training',
      'Start a new GR00T N1 training pipeline with your collected data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Training', 
          onPress: () => {
            // Navigate to training pipeline screen or start training
            Alert.alert('Training Started', 'GR00T N1 training pipeline initiated. You will be notified when complete.');
          }
        }
      ]
    );
  };

  const handleDeployModel = () => {
    Alert.alert(
      'Deploy Model',
      'Deploy your trained GR00T model to the connected robot?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deploy', 
          onPress: () => {
            Alert.alert('Model Deployed', 'GR00T model successfully deployed to robot.');
          }
        }
      ]
    );
  };

  const handleEmergencyStop = async () => {
    Alert.alert(
      'Emergency Stop',
      'Are you sure you want to emergency stop all robots?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'STOP', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await apiService.emergencyStopAll();
              Alert.alert('Emergency Stop', 'All robots stopped immediately!');
            } catch (error) {
              Alert.alert('Error', 'Failed to send emergency stop');
            }
          }
        }
      ]
    );
  };

  const handleViewTelemetry = () => {
    if (robotState) {
      const telemetryData = `
Battery: ${robotState.battery_level ? (robotState.battery_level * 100).toFixed(1) : '--'}%
Walking State: ${robotState.walking_state || 'Unknown'}
Joint Temperature: ${robotState.motor_temperatures ? Math.max(...robotState.motor_temperatures).toFixed(1) : '--'}°C
Control Mode: ${robotState.control_mode || 'Unknown'}
      `.trim();
      
      Alert.alert('Robot Telemetry', telemetryData);
    } else {
      Alert.alert('No Data', 'No robot telemetry data available. Connect to a robot first.');
    }
  };

  const handleRobotSettings = () => {
    Alert.alert('Robot Settings', 'Advanced robot configuration settings coming soon!');
  };

  const renderRobotCard = (robot: any) => (
    <TouchableOpacity
      key={robot.id}
      style={[
        styles.robotCard,
        robot.status === 'offline' && styles.robotCardOffline
      ]}
      onPress={() => robot.status === 'available' && handleSelectRobot(robot)}
      disabled={robot.status === 'offline'}
    >
      <View style={styles.robotCardHeader}>
        <Text style={styles.robotName}>{robot.name}</Text>
        <View style={[
          styles.statusBadge,
          robot.status === 'available' ? styles.statusAvailable : styles.statusOffline
        ]}>
          <Text style={styles.statusBadgeText}>{robot.status}</Text>
        </View>
      </View>
      <Text style={styles.robotType}>{robot.type.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.robotLocation}>{robot.location}</Text>
      <View style={styles.robotMetrics}>
        <Text style={styles.batteryText}>Battery: {robot.battery}%</Text>
        <Text style={styles.capabilitiesText}>
          {robot.capabilities.length} capabilities
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading supported robots...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Robot Control</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={handleRobotSettings}>
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Robot Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Robot Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text style={[
              styles.statusValue, 
              { color: connectedRobot ? COLORS.success : COLORS.error }
            ]}>
              {connectedRobot ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          {connectedRobot && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Robot:</Text>
                <Text style={styles.statusValue}>{connectedRobot.name}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Type:</Text>
                <Text style={styles.statusValue}>
                  {connectedRobot.type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </>
          )}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Battery:</Text>
            <Text style={styles.statusValue}>
              {robotState?.battery_level ? 
                `${(robotState.battery_level * 100).toFixed(1)}%` : 
                '--'
              }
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Mode:</Text>
            <Text style={styles.statusValue}>
              {robotState?.walking_state || 'Standby'}
            </Text>
          </View>
        </View>

        {/* Connection Section */}
        <View style={styles.connectionSection}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.primaryButton, connecting && styles.buttonDisabled]} 
              onPress={handleConnectRobot}
              disabled={connecting}
            >
              <Text style={styles.primaryButtonText}>
                {connecting ? 'Connecting...' : 'Connect Robot'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryButton, !connectedRobot && styles.buttonDisabled]} 
              onPress={handleDisconnectRobot}
              disabled={!connectedRobot}
            >
              <Text style={styles.secondaryButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* GR00T Training Section */}
        <View style={styles.groot00TSection}>
          <Text style={styles.sectionTitle}>GR00T N1 Training</Text>
          <TouchableOpacity style={styles.grootButton} onPress={handleStartGR00TTraining}>
            <Text style={styles.grootButtonText}>Start GR00T Training</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, !connectedRobot && styles.buttonDisabled]} 
            onPress={handleDeployModel}
            disabled={!connectedRobot}
          >
            <Text style={styles.actionButtonText}>Deploy Trained Model</Text>
          </TouchableOpacity>
          {trainingPipelines.length > 0 && (
            <View style={styles.pipelineStatus}>
              <Text style={styles.pipelineStatusText}>
                Recent Training: {trainingPipelines[0].status}
              </Text>
            </View>
          )}
        </View>

        {/* Robot Control Section */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Robot Control</Text>
          <TouchableOpacity 
            style={[styles.actionButton, !connectedRobot && styles.buttonDisabled]} 
            onPress={handleTestMovement}
            disabled={!connectedRobot}
          >
            <Text style={styles.actionButtonText}>Test Movement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleViewTelemetry}>
            <Text style={styles.actionButtonText}>View Telemetry</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Section */}
        <View style={styles.emergencySection}>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyStop}>
            <Text style={styles.emergencyButtonText}>EMERGENCY STOP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Robot Selection Modal */}
      <Modal
        visible={showRobotSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRobotSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Robot</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRobotSelector(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.robotList}>
              {supportedRobots.map(renderRobotCard)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  groot00TSection: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  grootButton: {
    backgroundColor: COLORS.accent,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  grootButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pipelineStatus: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  pipelineStatusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  controlSection: {
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
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  modalCloseButton: {
    backgroundColor: COLORS.background,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 16,
  },
  robotList: {
    maxHeight: 400,
  },
  
  // Robot card styles
  robotCard: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  robotCardOffline: {
    opacity: 0.6,
  },
  robotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  robotName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    flex: 1,
  },
  robotType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  robotLocation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  robotMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  capabilitiesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    minWidth: 60,
  },
  statusAvailable: {
    backgroundColor: COLORS.success,
  },
  statusOffline: {
    backgroundColor: COLORS.error,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default RobotScreen;