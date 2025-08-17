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
    }));\n\n    // Emit joint data for training if recording\n    if (recordingMode) {\n      // Here you would send the joint data to your training service\n      console.log('Recording joint movement:', { jointId, rotation });\n    }\n  };\n\n  const handleObjectInteraction = (objectId: string, action: 'click' | 'hover') => {\n    if (action === 'click') {\n      Alert.alert(\n        'Object Interaction',\n        `Interacted with: ${objectId}`,\n        [\n          { text: 'Move Robot Here', onPress: () => moveRobotToObject(objectId) },\n          { text: 'OK', style: 'cancel' },\n        ]\n      );\n    }\n  };\n\n  const moveRobotToObject = (objectId: string) => {\n    // Simulate moving robot to object position\n    // In a real implementation, this would calculate path and animate movement\n    Alert.alert('Robot Movement', `Robot moving to ${objectId}...`);\n  };\n\n  const startSimulation = () => {\n    const session: SimulationSession = {\n      id: `sim_${Date.now()}`,\n      name: `${robotConfig.type} in ${currentEnvironment}`,\n      environment: currentEnvironment,\n      robot: robotConfig,\n      startTime: new Date(),\n      duration: 0,\n      status: 'active',\n    };\n    \n    setSimulationSession(session);\n    setIsSimulating(true);\n    \n    Alert.alert(\n      'Simulation Started',\n      `Started simulation: ${session.name}`,\n      [{ text: 'OK' }]\n    );\n  };\n\n  const stopSimulation = () => {\n    setIsSimulating(false);\n    setSimulationSession(null);\n    Alert.alert('Simulation Stopped', 'Simulation has been stopped.');\n  };\n\n  const toggleRecording = () => {\n    setRecordingMode(!recordingMode);\n    Alert.alert(\n      recordingMode ? 'Recording Stopped' : 'Recording Started',\n      recordingMode ? 'Training data recording stopped.' : 'Training data recording started.',\n      [{ text: 'OK' }]\n    );\n  };\n\n  const resetRobotPose = () => {\n    setRobotConfig(prev => ({\n      ...prev,\n      jointAngles: {},\n    }));\n  };\n\n  const changeRobotType = () => {\n    const newType = robotConfig.type === 'unitree_g1' ? 'custom_humanoid' : 'unitree_g1';\n    setRobotConfig(prev => ({\n      ...prev,\n      type: newType,\n      jointAngles: {}, // Reset pose when changing robot\n    }));\n  };\n\n  const renderViewModeContent = () => {\n    switch (currentViewMode) {\n      case 'robot_only':\n        return (\n          <RobotVisualization\n            robotType={robotConfig.type}\n            jointAngles={robotConfig.jointAngles}\n            onJointMove={handleJointMove}\n            showControls={true}\n            autoRotate={false}\n            style={styles.fullVisualization}\n          />\n        );\n      \n      case 'environment_only':\n        return (\n          <EnvironmentVisualization\n            environmentId={currentEnvironment}\n            onObjectInteraction={handleObjectInteraction}\n            showRobot={false}\n            style={styles.fullVisualization}\n          />\n        );\n      \n      case 'combined':\n        return (\n          <EnvironmentVisualization\n            environmentId={currentEnvironment}\n            onObjectInteraction={handleObjectInteraction}\n            showRobot={true}\n            robotPosition={robotConfig.position}\n            style={styles.fullVisualization}\n          />\n        );\n      \n      case 'split':\n        return (\n          <View style={styles.splitContainer}>\n            <View style={styles.splitPanel}>\n              <RobotVisualization\n                robotType={robotConfig.type}\n                jointAngles={robotConfig.jointAngles}\n                onJointMove={handleJointMove}\n                showControls={false}\n                autoRotate={true}\n                style={styles.splitVisualization}\n              />\n            </View>\n            <View style={styles.splitPanel}>\n              <EnvironmentVisualization\n                environmentId={currentEnvironment}\n                onObjectInteraction={handleObjectInteraction}\n                showRobot={true}\n                robotPosition={robotConfig.position}\n                style={styles.splitVisualization}\n              />\n            </View>\n          </View>\n        );\n      \n      default:\n        return null;\n    }\n  };\n\n  const renderSettingsModal = () => (\n    <Modal\n      visible={showSettings}\n      animationType=\"slide\"\n      transparent={true}\n      onRequestClose={() => setShowSettings(false)}\n    >\n      <View style={styles.modalOverlay}>\n        <GlassCard style={styles.settingsModal} intensity={80}>\n          <View style={styles.settingsHeader}>\n            <Text style={styles.settingsTitle}>Visualization Settings</Text>\n            <TouchableOpacity\n              onPress={() => setShowSettings(false)}\n              style={styles.closeButton}\n            >\n              <Ionicons name=\"close\" size={24} color={COLORS.text} />\n            </TouchableOpacity>\n          </View>\n          \n          <ScrollView style={styles.settingsContent}>\n            {/* Robot Configuration */}\n            <View style={styles.settingSection}>\n              <Text style={styles.settingSectionTitle}>Robot Configuration</Text>\n              \n              <View style={styles.settingItem}>\n                <Text style={styles.settingLabel}>Robot Type</Text>\n                <AdvancedButton\n                  variant=\"secondary\"\n                  size=\"medium\"\n                  onPress={changeRobotType}\n                  style={styles.settingButton}\n                  effectType=\"ripple\"\n                >\n                  <Text style={styles.settingButtonText}>\n                    {robotConfig.type.replace('_', ' ').toUpperCase()}\n                  </Text>\n                </AdvancedButton>\n              </View>\n              \n              <View style={styles.settingItem}>\n                <Text style={styles.settingLabel}>Reset Pose</Text>\n                <AdvancedButton\n                  variant=\"secondary\"\n                  size=\"medium\"\n                  onPress={resetRobotPose}\n                  style={styles.settingButton}\n                  effectType=\"glow\"\n                >\n                  <Ionicons name=\"refresh\" size={16} color={COLORS.text} />\n                  <Text style={styles.settingButtonText}>Reset</Text>\n                </AdvancedButton>\n              </View>\n            </View>\n            \n            {/* Environment Settings */}\n            <View style={styles.settingSection}>\n              <Text style={styles.settingSectionTitle}>Environment</Text>\n              \n              {['warehouse', 'manipulation', 'balance'].map((env) => (\n                <TouchableOpacity\n                  key={env}\n                  style={[\n                    styles.environmentOption,\n                    currentEnvironment === env && styles.environmentOptionSelected\n                  ]}\n                  onPress={() => setCurrentEnvironment(env)}\n                >\n                  <Text style={[\n                    styles.environmentOptionText,\n                    currentEnvironment === env && styles.environmentOptionTextSelected\n                  ]}>\n                    {env.charAt(0).toUpperCase() + env.slice(1)}\n                  </Text>\n                  {currentEnvironment === env && (\n                    <Ionicons name=\"checkmark-circle\" size={20} color={COLORS.primary} />\n                  )}\n                </TouchableOpacity>\n              ))}\n            </View>\n            \n            {/* Recording Settings */}\n            <View style={styles.settingSection}>\n              <Text style={styles.settingSectionTitle}>Training Data</Text>\n              \n              <View style={styles.settingItem}>\n                <Text style={styles.settingLabel}>Record Movements</Text>\n                <AdvancedButton\n                  variant={recordingMode ? \"primary\" : \"secondary\"}\n                  size=\"medium\"\n                  onPress={toggleRecording}\n                  style={styles.settingButton}\n                  effectType=\"pulse\"\n                >\n                  <Ionicons \n                    name={recordingMode ? \"stop-circle\" : \"radio-button-on\"} \n                    size={16} \n                    color={recordingMode ? COLORS.background : COLORS.text} \n                  />\n                  <Text style={[\n                    styles.settingButtonText,\n                    { color: recordingMode ? COLORS.background : COLORS.text }\n                  ]}>\n                    {recordingMode ? 'Stop' : 'Record'}\n                  </Text>\n                </AdvancedButton>\n              </View>\n            </View>\n          </ScrollView>\n        </GlassCard>\n      </View>\n    </Modal>\n  );\n\n  return (\n    <Animated.View \n      style={[\n        styles.container,\n        {\n          opacity: fadeAnim,\n          transform: [{ translateY: slideAnim }],\n        },\n      ]}\n    >\n      {/* Header */}\n      <View style={styles.header}>\n        <LinearGradient\n          colors={[COLORS.primary + '20', 'transparent']}\n          style={styles.headerGradient}\n        />\n        \n        <View style={styles.headerContent}>\n          <TouchableOpacity\n            onPress={() => navigation.goBack()}\n            style={styles.backButton}\n          >\n            <Ionicons name=\"arrow-back\" size={24} color={COLORS.text} />\n          </TouchableOpacity>\n          \n          <Animated.View\n            style={[\n              styles.titleContainer,\n              {\n                transform: [\n                  {\n                    translateY: floatingAnim.interpolate({\n                      inputRange: [0, 1],\n                      outputRange: [0, -3],\n                    }),\n                  },\n                ],\n              },\n            ]}\n          >\n            <Text style={styles.title}>3D Robot Visualization</Text>\n            <Text style={styles.subtitle}>\n              {viewModes.find(mode => mode.id === currentViewMode)?.description}\n            </Text>\n          </Animated.View>\n          \n          <View style={styles.headerActions}>\n            <TouchableOpacity\n              onPress={() => setShowSettings(true)}\n              style={styles.headerButton}\n            >\n              <Ionicons name=\"settings-outline\" size={20} color={COLORS.text} />\n            </TouchableOpacity>\n            \n            {isSimulating && (\n              <Animated.View\n                style={[\n                  styles.recordingIndicator,\n                  {\n                    transform: [\n                      {\n                        scale: pulseAnim.interpolate({\n                          inputRange: [0, 1],\n                          outputRange: [1, 1.2],\n                        }),\n                      },\n                    ],\n                  },\n                ]}\n              >\n                <View style={styles.recordingDot} />\n              </Animated.View>\n            )}\n          </View>\n        </View>\n      </View>\n\n      {/* View Mode Selector */}\n      <GlassCard style={styles.viewModeCard} intensity={60}>\n        <ScrollView \n          horizontal \n          showsHorizontalScrollIndicator={false}\n          contentContainerStyle={styles.viewModeScroll}\n        >\n          {viewModes.map((mode) => (\n            <AdvancedButton\n              key={mode.id}\n              variant={currentViewMode === mode.id ? \"primary\" : \"secondary\"}\n              size=\"medium\"\n              onPress={() => setCurrentViewMode(mode.id)}\n              style={styles.viewModeButton}\n              effectType=\"morph\"\n            >\n              <Ionicons \n                name={mode.icon as any} \n                size={18} \n                color={currentViewMode === mode.id ? COLORS.background : COLORS.text} \n              />\n              <Text style={[\n                styles.viewModeButtonText,\n                { color: currentViewMode === mode.id ? COLORS.background : COLORS.text }\n              ]}>\n                {mode.name}\n              </Text>\n            </AdvancedButton>\n          ))}\n        </ScrollView>\n      </GlassCard>\n\n      {/* Visualization Content */}\n      <View style={styles.visualizationContainer}>\n        {renderViewModeContent()}\n      </View>\n\n      {/* Control Panel */}\n      <GlassCard style={styles.controlPanel} intensity={60}>\n        <View style={styles.controlRow}>\n          <AdvancedButton\n            variant={isSimulating ? \"error\" : \"primary\"}\n            size=\"large\"\n            onPress={isSimulating ? stopSimulation : startSimulation}\n            style={styles.controlButton}\n            effectType=\"glow\"\n          >\n            <Ionicons \n              name={isSimulating ? \"stop\" : \"play\"} \n              size={20} \n              color={COLORS.background} \n            />\n            <Text style={styles.controlButtonText}>\n              {isSimulating ? 'Stop' : 'Start'} Simulation\n            </Text>\n          </AdvancedButton>\n          \n          <AdvancedButton\n            variant=\"secondary\"\n            size=\"large\"\n            onPress={toggleRecording}\n            style={styles.controlButton}\n            effectType={recordingMode ? \"pulse\" : \"ripple\"}\n          >\n            <Ionicons \n              name={recordingMode ? \"stop-circle\" : \"radio-button-on\"} \n              size={20} \n              color={recordingMode ? COLORS.error : COLORS.text} \n            />\n            <Text style={[\n              styles.controlButtonText,\n              { color: recordingMode ? COLORS.error : COLORS.text }\n            ]}>\n              {recordingMode ? 'Stop' : 'Record'}\n            </Text>\n          </AdvancedButton>\n        </View>\n        \n        {/* Status Info */}\n        {simulationSession && (\n          <View style={styles.statusInfo}>\n            <Text style={styles.statusText}>Session: {simulationSession.name}</Text>\n            <Text style={styles.statusText}>Status: {simulationSession.status.toUpperCase()}</Text>\n          </View>\n        )}\n      </GlassCard>\n      \n      {/* Settings Modal */}\n      {renderSettingsModal()}\n    </Animated.View>\n  );\n};\n\n// ==================== STYLES ====================\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    backgroundColor: COLORS.background,\n  },\n  header: {\n    position: 'relative',\n    paddingTop: 50,\n    paddingBottom: SPACING.lg,\n  },\n  headerGradient: {\n    position: 'absolute',\n    top: 0,\n    left: 0,\n    right: 0,\n    height: '100%',\n  },\n  headerContent: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    paddingHorizontal: SPACING.lg,\n    gap: SPACING.md,\n  },\n  backButton: {\n    padding: SPACING.sm,\n  },\n  titleContainer: {\n    flex: 1,\n  },\n  title: {\n    ...TYPOGRAPHY.h2,\n    color: COLORS.text,\n    fontWeight: 'bold',\n  },\n  subtitle: {\n    ...TYPOGRAPHY.body,\n    color: COLORS.textSecondary,\n    fontSize: 13,\n  },\n  headerActions: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: SPACING.sm,\n  },\n  headerButton: {\n    padding: SPACING.sm,\n  },\n  recordingIndicator: {\n    position: 'relative',\n  },\n  recordingDot: {\n    width: 12,\n    height: 12,\n    borderRadius: 6,\n    backgroundColor: COLORS.error,\n  },\n  viewModeCard: {\n    marginHorizontal: SPACING.lg,\n    marginBottom: SPACING.md,\n    padding: SPACING.md,\n  },\n  viewModeScroll: {\n    gap: SPACING.sm,\n  },\n  viewModeButton: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: SPACING.xs,\n    paddingHorizontal: SPACING.md,\n    paddingVertical: SPACING.sm,\n  },\n  viewModeButtonText: {\n    ...TYPOGRAPHY.caption,\n    fontWeight: '500',\n    fontSize: 11,\n  },\n  visualizationContainer: {\n    flex: 1,\n    marginHorizontal: SPACING.lg,\n    marginBottom: SPACING.md,\n  },\n  fullVisualization: {\n    flex: 1,\n    borderRadius: BORDER_RADIUS.lg,\n    overflow: 'hidden',\n  },\n  splitContainer: {\n    flex: 1,\n    flexDirection: 'row',\n    gap: SPACING.sm,\n  },\n  splitPanel: {\n    flex: 1,\n  },\n  splitVisualization: {\n    flex: 1,\n    borderRadius: BORDER_RADIUS.md,\n    overflow: 'hidden',\n  },\n  controlPanel: {\n    marginHorizontal: SPACING.lg,\n    marginBottom: SPACING.lg,\n    padding: SPACING.lg,\n  },\n  controlRow: {\n    flexDirection: 'row',\n    gap: SPACING.md,\n  },\n  controlButton: {\n    flex: 1,\n    flexDirection: 'row',\n    alignItems: 'center',\n    justifyContent: 'center',\n    gap: SPACING.sm,\n    paddingVertical: SPACING.lg,\n  },\n  controlButtonText: {\n    ...TYPOGRAPHY.button,\n    fontWeight: '600',\n  },\n  statusInfo: {\n    marginTop: SPACING.md,\n    paddingTop: SPACING.md,\n    borderTopWidth: 1,\n    borderTopColor: COLORS.border + '40',\n  },\n  statusText: {\n    ...TYPOGRAPHY.caption,\n    color: COLORS.textSecondary,\n    fontSize: 11,\n  },\n  \n  // Modal Styles\n  modalOverlay: {\n    flex: 1,\n    backgroundColor: 'rgba(0, 0, 0, 0.7)',\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  settingsModal: {\n    width: '90%',\n    maxHeight: '80%',\n    padding: SPACING.xl,\n  },\n  settingsHeader: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center',\n    marginBottom: SPACING.lg,\n  },\n  settingsTitle: {\n    ...TYPOGRAPHY.h3,\n    color: COLORS.text,\n    fontWeight: 'bold',\n  },\n  closeButton: {\n    padding: SPACING.sm,\n  },\n  settingsContent: {\n    maxHeight: screenHeight * 0.6,\n  },\n  settingSection: {\n    marginBottom: SPACING.xl,\n  },\n  settingSectionTitle: {\n    ...TYPOGRAPHY.h4,\n    color: COLORS.text,\n    fontWeight: '600',\n    marginBottom: SPACING.md,\n  },\n  settingItem: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center',\n    marginBottom: SPACING.md,\n  },\n  settingLabel: {\n    ...TYPOGRAPHY.body,\n    color: COLORS.text,\n    flex: 1,\n  },\n  settingButton: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: SPACING.xs,\n    paddingHorizontal: SPACING.md,\n    paddingVertical: SPACING.sm,\n  },\n  settingButtonText: {\n    ...TYPOGRAPHY.caption,\n    fontWeight: '500',\n    fontSize: 12,\n  },\n  environmentOption: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center',\n    padding: SPACING.md,\n    marginBottom: SPACING.sm,\n    backgroundColor: COLORS.surface + '60',\n    borderRadius: BORDER_RADIUS.md,\n    borderWidth: 1,\n    borderColor: COLORS.border + '40',\n  },\n  environmentOptionSelected: {\n    borderColor: COLORS.primary,\n    backgroundColor: COLORS.primary + '20',\n  },\n  environmentOptionText: {\n    ...TYPOGRAPHY.body,\n    color: COLORS.text,\n  },\n  environmentOptionTextSelected: {\n    color: COLORS.primary,\n    fontWeight: '600',\n  },\n});\n\nexport default RobotVisualizationScreen;