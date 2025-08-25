import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import HapticFeedback from '../utils/haptics';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';
import { robotService } from '../services/RobotService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { connectRobot, disconnectRobot } from '../store/slices/robotSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RobotCard {
  id: string;
  name: string;
  type: 'unitree' | 'boston' | 'tesla' | 'custom';
  status: 'online' | 'offline' | 'busy';
  battery: number;
  signal: number;
  capabilities: string[];
}

const mockRobots: RobotCard[] = [
  {
    id: '1',
    name: 'Unitree G1',
    type: 'unitree',
    status: 'online',
    battery: 85,
    signal: 95,
    capabilities: ['walk', 'manipulate', 'vision'],
  },
  {
    id: '2',
    name: 'Atlas Pro',
    type: 'boston',
    status: 'offline',
    battery: 60,
    signal: 0,
    capabilities: ['parkour', 'lift', 'dance'],
  },
  {
    id: '3',
    name: 'Optimus',
    type: 'tesla',
    status: 'busy',
    battery: 92,
    signal: 88,
    capabilities: ['autonomous', 'learn', 'interact'],
  },
];

const EnhancedRobotScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { connectedRobot, isConnected } = useAppSelector(state => state.robot);
  
  const [selectedRobot, setSelectedRobot] = useState<RobotCard | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [robots, setRobots] = useState<RobotCard[]>(mockRobots);

  const scanAnimation = useSharedValue(0);
  const connectionAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    if (isScanning) {
      scanAnimation.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1
      );
    } else {
      scanAnimation.value = withTiming(0);
    }
  }, [isScanning]);

  useEffect(() => {
    if (isConnected) {
      connectionAnimation.value = withSpring(1);
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1
      );
    } else {
      connectionAnimation.value = withSpring(0);
      pulseAnimation.value = 1;
    }
  }, [isConnected]);

  const scanAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${scanAnimation.value * 360}deg` }],
    opacity: interpolate(scanAnimation.value, [0, 0.5, 1], [0.3, 1, 0.3]),
  }));

  const connectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: connectionAnimation.value,
    transform: [{ scale: pulseAnimation.value }],
  }));

  const handleScanRobots = async () => {
    HapticFeedback.trigger('impactLight');
    setIsScanning(true);

    try {
      const discovered = await robotService.discoverRobots();
      
      // Simulate finding robots
      setTimeout(() => {
        setRobots([...mockRobots, {
          id: '4',
          name: 'Custom Bot',
          type: 'custom',
          status: 'online',
          battery: 100,
          signal: 75,
          capabilities: ['custom'],
        }]);
        setIsScanning(false);
        Alert.alert('Scan Complete', `Found ${discovered.length + 1} robots`);
      }, 3000);
    } catch (error) {
      setIsScanning(false);
      Alert.alert('Scan Failed', 'Unable to discover robots');
    }
  };

  const handleConnectRobot = async (robot: RobotCard) => {
    HapticFeedback.trigger('impactMedium');
    setSelectedRobot(robot);

    try {
      const connection = await robotService.connectToRobot(
        robot.id,
        robot.type as any
      );
      
      dispatch(connectRobot({
        robotId: robot.id,
        robotType: robot.type as any,
        robotName: robot.name,
      }));
      
      Alert.alert('Connected', `Successfully connected to ${robot.name}`);
    } catch (error) {
      Alert.alert('Connection Failed', `Unable to connect to ${robot.name}`);
    }
  };

  const handleDisconnect = async () => {
    HapticFeedback.trigger('impactHeavy');
    
    try {
      await robotService.disconnect();
      dispatch(disconnectRobot());
      setSelectedRobot(null);
      Alert.alert('Disconnected', 'Robot connection closed');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect');
    }
  };

  const handleSendCommand = async () => {
    if (!commandInput.trim() || !isConnected) return;

    HapticFeedback.trigger('impactLight');
    const command = commandInput.trim();
    
    try {
      await robotService.sendCommand({
        type: 'custom',
        payload: { command },
        priority: 1,
      });
      
      setCommandHistory([command, ...commandHistory.slice(0, 9)]);
      setCommandInput('');
    } catch (error) {
      Alert.alert('Command Failed', 'Unable to send command to robot');
    }
  };

  const getRobotIcon = (type: string) => {
    switch (type) {
      case 'unitree': return 'robot';
      case 'boston': return 'robot-industrial';
      case 'tesla': return 'robot-love';
      default: return 'robot-confused';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return COLORS.success;
      case 'offline': return COLORS.textSecondary;
      case 'busy': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={20} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Robot Control</Text>
          <Text style={styles.subtitle}>Connect and control your robots</Text>
        </View>

        {/* Connection Status */}
        {isConnected && selectedRobot && (
          <Animated.View style={connectionAnimatedStyle}>
            <GlassCard style={styles.connectionCard}>
              <View style={styles.connectionHeader}>
                <MaterialCommunityIcons
                  name={getRobotIcon(selectedRobot.type)}
                  size={32}
                  color={COLORS.primary}
                />
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>{selectedRobot.name}</Text>
                  <Text style={styles.connectionStatus}>Connected</Text>
                </View>
                <TouchableOpacity onPress={handleDisconnect}>
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Ionicons name="battery-charging" size={20} color={COLORS.success} />
                  <Text style={styles.statValue}>{selectedRobot.battery}%</Text>
                  <Text style={styles.statLabel}>Battery</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="wifi" size={20} color={COLORS.primary} />
                  <Text style={styles.statValue}>{selectedRobot.signal}%</Text>
                  <Text style={styles.statLabel}>Signal</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="speedometer" size={20} color={COLORS.warning} />
                  <Text style={styles.statValue}>30ms</Text>
                  <Text style={styles.statLabel}>Latency</Text>
                </View>
              </View>

              {/* Command Interface */}
              <View style={styles.commandSection}>
                <Text style={styles.sectionTitle}>Send Command</Text>
                <View style={styles.commandInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter command..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={commandInput}
                    onChangeText={setCommandInput}
                    onSubmitEditing={handleSendCommand}
                  />
                  <TouchableOpacity style={styles.sendButton} onPress={handleSendCommand}>
                    <Ionicons name="send" size={20} color={COLORS.background} />
                  </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
                  {['Walk Forward', 'Turn Left', 'Turn Right', 'Stop', 'Wave'].map((action) => (
                    <TouchableOpacity
                      key={action}
                      style={styles.actionChip}
                      onPress={() => setCommandInput(action.toLowerCase())}
                    >
                      <Text style={styles.actionText}>{action}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Command History */}
                {commandHistory.length > 0 && (
                  <View style={styles.historySection}>
                    <Text style={styles.historyTitle}>Recent Commands</Text>
                    {commandHistory.slice(0, 3).map((cmd, index) => (
                      <Text key={index} style={styles.historyItem}>
                        {cmd}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Scan Button */}
        {!isConnected && (
          <View style={styles.scanSection}>
            <NeonButton
              title={isScanning ? "Scanning..." : "Scan for Robots"}
              onPress={handleScanRobots}
              variant="primary"
              size="large"
              disabled={isScanning}
              pulse={!isScanning}
            />
            {isScanning && (
              <Animated.View style={[styles.scanIndicator, scanAnimatedStyle]}>
                <MaterialCommunityIcons name="radar" size={48} color={COLORS.primary} />
              </Animated.View>
            )}
          </View>
        )}

        {/* Robot List */}
        <View style={styles.robotList}>
          <Text style={styles.sectionTitle}>Available Robots</Text>
          {robots.map((robot) => (
            <GlassCard key={robot.id} style={styles.robotCard}>
              <TouchableOpacity
                onPress={() => handleConnectRobot(robot)}
                disabled={robot.status === 'offline' || isConnected}
              >
                <View style={styles.robotCardContent}>
                  <MaterialCommunityIcons
                    name={getRobotIcon(robot.type)}
                    size={48}
                    color={getStatusColor(robot.status)}
                  />
                  <View style={styles.robotInfo}>
                    <Text style={styles.robotName}>{robot.name}</Text>
                    <Text style={[styles.robotStatus, { color: getStatusColor(robot.status) }]}>
                      {robot.status.toUpperCase()}
                    </Text>
                    <View style={styles.robotCapabilities}>
                      {robot.capabilities.slice(0, 2).map((cap) => (
                        <View key={cap} style={styles.capabilityBadge}>
                          <Text style={styles.capabilityText}>{cap}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.robotStats}>
                    <View style={styles.miniStat}>
                      <Ionicons name="battery-half" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.miniStatText}>{robot.battery}%</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Ionicons name="wifi" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.miniStatText}>{robot.signal}%</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  connectionCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  connectionInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  connectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  connectionStatus: {
    fontSize: 14,
    color: COLORS.success,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  commandSection: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  commandInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 16,
  },
  sendButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    marginRight: 4,
  },
  quickActions: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  historySection: {
    marginTop: SPACING.md,
  },
  historyTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  historyItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingVertical: 2,
  },
  scanSection: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  scanIndicator: {
    marginTop: SPACING.lg,
  },
  robotList: {
    padding: SPACING.lg,
  },
  robotCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  robotCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  robotInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  robotName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  robotStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  robotCapabilities: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  capabilityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: SPACING.xs,
  },
  capabilityText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  robotStats: {
    alignItems: 'flex-end',
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
});

export default EnhancedRobotScreen;