/**
 * Robot Visualization Screen
 * Comprehensive 3D visualization interface combining robot models and environments
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { RobotVisualization } from '../components/3d/RobotVisualization';
import { EnvironmentVisualization } from '../components/3d/EnvironmentVisualization';
import { GlassCard } from '../components/ui/GlassCard';
import { AdvancedButton } from '../components/ui/AdvancedButton';
import { useFloatingAnimation, usePulseAnimation } from '../components/animations/AnimationLibrary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==================== TYPES ====================

interface ViewMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface RobotConfig {
  type: 'unitree_g1' | 'custom_humanoid';
  position: [number, number, number];
  jointAngles: { [jointId: string]: [number, number, number] };
}

interface SimulationSession {
  id: string;
  name: string;
  environment: string;
  robot: RobotConfig;
  startTime: Date;
  duration: number;
  status: 'active' | 'paused' | 'stopped';
}

// ==================== VIEW MODES ====================

const viewModes: ViewMode[] = [
  {
    id: 'robot_only',
    name: 'Robot Focus',
    description: 'Detailed robot visualization and control',
    icon: 'hardware-chip-outline',
  },
  {
    id: 'environment_only',
    name: 'Environment',
    description: 'Environment exploration and interaction',
    icon: 'cube-outline',
  },
  {
    id: 'combined',
    name: 'Full Scene',
    description: 'Robot in environment simulation',
    icon: 'layers-outline',
  },
  {
    id: 'split',
    name: 'Split View',
    description: 'Side-by-side robot and environment',
    icon: 'resize-outline',
  },
];

// ==================== MAIN COMPONENT ====================

const RobotVisualizationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentViewMode, setCurrentViewMode] = useState<string>('robot_only');
  const [robotConfig, setRobotConfig] = useState<RobotConfig>({
    type: 'unitree_g1',
    position: [0, 0, 0],
    jointAngles: {},
  });
  const [currentEnvironment, setCurrentEnvironment] = useState('warehouse');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSession, setSimulationSession] = useState<SimulationSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const floatingAnim = useFloatingAnimation();
  const pulseAnim = usePulseAnimation();

  useEffect(() => {
    // Initialize entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleJointMove = (jointId: string, rotation: [number, number, number]) => {
    setRobotConfig(prev => ({
      ...prev,
      jointAngles: {
        ...prev.jointAngles,
        [jointId]: rotation,
      },
    }));

    // Emit joint data for training if recording
    if (recordingMode) {
      // Here you would send the joint data to your training service
      console.log('Recording joint movement:', { jointId, rotation });
    }
  };

  const handleObjectInteraction = (objectId: string, action: 'click' | 'hover') => {
    if (action === 'click') {
      Alert.alert(
        'Object Interaction',
        `Interacted with: ${objectId}`,
        [
          { text: 'Move Robot Here', onPress: () => moveRobotToObject(objectId) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const moveRobotToObject = (objectId: string) => {
    // Simulate moving robot to object position
    // In a real implementation, this would calculate path and animate movement
    Alert.alert('Robot Movement', `Robot moving to ${objectId}...`);
  };

  const startSimulation = () => {
    const session: SimulationSession = {
      id: `sim_${Date.now()}`,
      name: `${robotConfig.type} in ${currentEnvironment}`,
      environment: currentEnvironment,
      robot: robotConfig,
      startTime: new Date(),
      duration: 0,
      status: 'active',
    };
    
    setSimulationSession(session);
    setIsSimulating(true);
    
    Alert.alert(
      'Simulation Started',
      `Started simulation: ${session.name}`,
      [{ text: 'OK' }]
    );
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setSimulationSession(null);
    Alert.alert('Simulation Stopped', 'Simulation has been stopped.');
  };

  const toggleRecording = () => {
    setRecordingMode(!recordingMode);
    Alert.alert(
      recordingMode ? 'Recording Stopped' : 'Recording Started',
      recordingMode ? 'Training data recording stopped.' : 'Training data recording started.',
      [{ text: 'OK' }]
    );
  };

  const resetRobotPose = () => {
    setRobotConfig(prev => ({
      ...prev,
      jointAngles: {},
    }));
  };

  const changeRobotType = () => {
    const newType = robotConfig.type === 'unitree_g1' ? 'custom_humanoid' : 'unitree_g1';
    setRobotConfig(prev => ({
      ...prev,
      type: newType,
      jointAngles: {}, // Reset pose when changing robot
    }));
  };

  const renderViewModeContent = () => {
    switch (currentViewMode) {
      case 'robot_only':
        return (
          <RobotVisualization
            robotType={robotConfig.type}
            jointAngles={robotConfig.jointAngles}
            onJointMove={handleJointMove}
            showControls={true}
            autoRotate={false}
            style={styles.fullVisualization}
          />
        );
      
      case 'environment_only':
        return (
          <EnvironmentVisualization
            environmentId={currentEnvironment}
            onObjectInteraction={handleObjectInteraction}
            showRobot={false}
            style={styles.fullVisualization}
          />
        );
      
      case 'combined':
        return (
          <EnvironmentVisualization
            environmentId={currentEnvironment}
            onObjectInteraction={handleObjectInteraction}
            showRobot={true}
            robotPosition={robotConfig.position}
            style={styles.fullVisualization}
          />
        );
      
      case 'split':
        return (
          <View style={styles.splitContainer}>
            <View style={styles.splitPanel}>
              <RobotVisualization
                robotType={robotConfig.type}
                jointAngles={robotConfig.jointAngles}
                onJointMove={handleJointMove}
                showControls={false}
                autoRotate={true}
                style={styles.splitVisualization}
              />
            </View>
            <View style={styles.splitPanel}>
              <EnvironmentVisualization
                environmentId={currentEnvironment}
                onObjectInteraction={handleObjectInteraction}
                showRobot={true}
                robotPosition={robotConfig.position}
                style={styles.splitVisualization}
              />
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderSettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <GlassCard style={styles.settingsModal} intensity={80}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Visualization Settings</Text>
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.settingsContent}>
            {/* Robot Configuration */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>Robot Configuration</Text>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Robot Type</Text>
                <AdvancedButton
                  variant="secondary"
                  size="medium"
                  onPress={changeRobotType}
                  style={styles.settingButton}
                  effectType="ripple"
                >
                  <Text style={styles.settingButtonText}>
                    {robotConfig.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </AdvancedButton>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Reset Pose</Text>
                <AdvancedButton
                  variant="secondary"
                  size="medium"
                  onPress={resetRobotPose}
                  style={styles.settingButton}
                  effectType="glow"
                >
                  <Ionicons name="refresh" size={16} color={COLORS.text} />
                  <Text style={styles.settingButtonText}>Reset</Text>
                </AdvancedButton>
              </View>
            </View>
            
            {/* Environment Settings */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>Environment</Text>
              
              {['warehouse', 'manipulation', 'balance'].map((env) => (
                <TouchableOpacity
                  key={env}
                  style={[
                    styles.environmentOption,
                    currentEnvironment === env && styles.environmentOptionSelected
                  ]}
                  onPress={() => setCurrentEnvironment(env)}
                >
                  <Text style={[
                    styles.environmentOptionText,
                    currentEnvironment === env && styles.environmentOptionTextSelected
                  ]}>
                    {env.charAt(0).toUpperCase() + env.slice(1)}
                  </Text>
                  {currentEnvironment === env && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Recording Settings */}
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>Training Data</Text>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Record Movements</Text>
                <AdvancedButton
                  variant={recordingMode ? "primary" : "secondary"}
                  size="medium"
                  onPress={toggleRecording}
                  style={styles.settingButton}
                  effectType="pulse"
                >
                  <Ionicons 
                    name={recordingMode ? "stop-circle" : "radio-button-on"} 
                    size={16} 
                    color={recordingMode ? COLORS.background : COLORS.text} 
                  />
                  <Text style={[
                    styles.settingButtonText,
                    { color: recordingMode ? COLORS.background : COLORS.text }
                  ]}>
                    {recordingMode ? 'Stop' : 'Record'}
                  </Text>
                </AdvancedButton>
              </View>
            </View>
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.primary + '20', 'transparent']}
          style={styles.headerGradient}
        />
        
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          
          <Animated.View
            style={[
              styles.titleContainer,
              {
                transform: [
                  {
                    translateY: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.title}>3D Robot Visualization</Text>
            <Text style={styles.subtitle}>
              {viewModes.find(mode => mode.id === currentViewMode)?.description}
            </Text>
          </Animated.View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.headerButton}
            >
              <Ionicons name="settings-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
            
            {isSimulating && (
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.recordingDot} />
              </Animated.View>
            )}
          </View>
        </View>
      </View>

      {/* View Mode Selector */}
      <GlassCard style={styles.viewModeCard} intensity={60}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.viewModeScroll}
        >
          {viewModes.map((mode) => (
            <AdvancedButton
              key={mode.id}
              variant={currentViewMode === mode.id ? "primary" : "secondary"}
              size="medium"
              onPress={() => setCurrentViewMode(mode.id)}
              style={styles.viewModeButton}
              effectType="morph"
            >
              <Ionicons 
                name={mode.icon as any} 
                size={18} 
                color={currentViewMode === mode.id ? COLORS.background : COLORS.text} 
              />
              <Text style={[
                styles.viewModeButtonText,
                { color: currentViewMode === mode.id ? COLORS.background : COLORS.text }
              ]}>
                {mode.name}
              </Text>
            </AdvancedButton>
          ))}
        </ScrollView>
      </GlassCard>

      {/* Visualization Content */}
      <View style={styles.visualizationContainer}>
        {renderViewModeContent()}
      </View>

      {/* Control Panel */}
      <GlassCard style={styles.controlPanel} intensity={60}>
        <View style={styles.controlRow}>
          <AdvancedButton
            variant={isSimulating ? "error" : "primary"}
            size="large"
            onPress={isSimulating ? stopSimulation : startSimulation}
            style={styles.controlButton}
            effectType="glow"
          >
            <Ionicons 
              name={isSimulating ? "stop" : "play"} 
              size={20} 
              color={COLORS.background} 
            />
            <Text style={styles.controlButtonText}>
              {isSimulating ? 'Stop' : 'Start'} Simulation
            </Text>
          </AdvancedButton>
          
          <AdvancedButton
            variant="secondary"
            size="large"
            onPress={toggleRecording}
            style={styles.controlButton}
            effectType={recordingMode ? "pulse" : "ripple"}
          >
            <Ionicons 
              name={recordingMode ? "stop-circle" : "radio-button-on"} 
              size={20} 
              color={recordingMode ? COLORS.error : COLORS.text} 
            />
            <Text style={[
              styles.controlButtonText,
              { color: recordingMode ? COLORS.error : COLORS.text }
            ]}>
              {recordingMode ? 'Stop' : 'Record'}
            </Text>
          </AdvancedButton>
        </View>
        
        {/* Status Info */}
        {simulationSession && (
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>Session: {simulationSession.name}</Text>
            <Text style={styles.statusText}>Status: {simulationSession.status.toUpperCase()}</Text>
          </View>
        )}
      </GlassCard>
      
      {/* Settings Modal */}
      {renderSettingsModal()}
    </Animated.View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'relative',
    paddingTop: 50,
    paddingBottom: SPACING.lg,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  recordingIndicator: {
    position: 'relative',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  viewModeCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  viewModeScroll: {
    gap: SPACING.sm,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  viewModeButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
    fontSize: 11,
  },
  visualizationContainer: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  fullVisualization: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  splitPanel: {
    flex: 1,
  },
  splitVisualization: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  controlPanel: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  controlRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  controlButtonText: {
    ...TYPOGRAPHY.button,
    fontWeight: '600',
  },
  statusInfo: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    width: '90%',
    maxHeight: '80%',
    padding: SPACING.xl,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  settingsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SPACING.sm,
  },
  settingsContent: {
    maxHeight: screenHeight * 0.6,
  },
  settingSection: {
    marginBottom: SPACING.xl,
  },
  settingSectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  settingButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
    fontSize: 12,
  },
  environmentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface + '60',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  environmentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  environmentOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  environmentOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default RobotVisualizationScreen;