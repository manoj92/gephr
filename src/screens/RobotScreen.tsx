import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

interface Robot {
  id: string;
  name: string;
  type: 'unitree_g1' | 'boston_dynamics' | 'tesla_bot' | 'custom';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  batteryLevel: number;
  capabilities: string[];
  ipAddress: string;
}

const MOCK_ROBOTS: Robot[] = [
  {
    id: '1',
    name: 'Unitree G1 #001',
    type: 'unitree_g1',
    status: 'disconnected',
    batteryLevel: 85,
    capabilities: ['Navigation', 'Manipulation', 'Vision', 'Balance'],
    ipAddress: '192.168.1.100',
  },
  {
    id: '2',
    name: 'Custom Robot #001',
    type: 'custom',
    status: 'disconnected',
    batteryLevel: 92,
    capabilities: ['Navigation', 'Manipulation'],
    ipAddress: '192.168.1.101',
  },
];

const RobotScreen: React.FC = () => {
  const [robots, setRobots] = useState<Robot[]>(MOCK_ROBOTS);
  const [connectedRobot, setConnectedRobot] = useState<Robot | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleConnect = async (robot: Robot) => {
    setRobots(prev => prev.map(r => 
      r.id === robot.id ? { ...r, status: 'connecting' } : r
    ));

    // Simulate connection delay
    setTimeout(() => {
      setRobots(prev => prev.map(r => 
        r.id === robot.id ? { ...r, status: 'connected' } : r
      ));
      setConnectedRobot({ ...robot, status: 'connected' });
      Alert.alert('Connected!', `Successfully connected to ${robot.name}`);
    }, 2000);
  };

  const handleDisconnect = () => {
    if (connectedRobot) {
      setRobots(prev => prev.map(r => 
        r.id === connectedRobot.id ? { ...r, status: 'disconnected' } : r
      ));
      setConnectedRobot(null);
      Alert.alert('Disconnected', 'Robot disconnected successfully');
    }
  };

  const handleScanForRobots = () => {
    setIsScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert('Scan Complete', 'Found 2 robots on the network');
    }, 3000);
  };

  const executeCommand = (command: string) => {
    if (!connectedRobot) {
      Alert.alert('No Robot Connected', 'Please connect to a robot first');
      return;
    }

    Alert.alert(
      'Command Sent',
      `Executing "${command}" on ${connectedRobot.name}`,
      [
        { text: 'OK', onPress: () => console.log(`Executed: ${command}`) }
      ]
    );
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return COLORS.success;
    if (level > 30) return COLORS.warning;
    return COLORS.error;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return COLORS.success;
      case 'connecting': return COLORS.warning;
      case 'error': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getRobotEmoji = (type: string) => {
    switch (type) {
      case 'unitree_g1': return '🦾';
      case 'boston_dynamics': return '🦿';
      case 'tesla_bot': return '🤖';
      default: return '⚙️';
    }
  };

  const RobotCard: React.FC<{ robot: Robot }> = ({ robot }) => (
    <View style={styles.robotCard}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceElevated]}
        style={styles.robotCardGradient}
      >
        <View style={styles.robotHeader}>
          <Text style={styles.robotEmoji}>{getRobotEmoji(robot.type)}</Text>
          <View style={styles.robotInfo}>
            <Text style={styles.robotName}>{robot.name}</Text>
            <Text style={styles.robotType}>{robot.type.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.robotIp}>IP: {robot.ipAddress}</Text>
          </View>
          <View style={styles.robotStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(robot.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(robot.status) }]}>
              {robot.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.robotMeta}>
          <View style={styles.batteryContainer}>
            <Text style={styles.batteryLabel}>Battery:</Text>
            <View style={styles.batteryBar}>
              <View 
                style={[
                  styles.batteryFill, 
                  { 
                    width: `${robot.batteryLevel}%`,
                    backgroundColor: getBatteryColor(robot.batteryLevel)
                  }
                ]} 
              />
            </View>
            <Text style={styles.batteryText}>{robot.batteryLevel}%</Text>
          </View>
        </View>

        <View style={styles.capabilities}>
          <Text style={styles.capabilitiesLabel}>Capabilities:</Text>
          <View style={styles.capabilitiesList}>
            {robot.capabilities.map((capability, index) => (
              <View key={index} style={styles.capabilityTag}>
                <Text style={styles.capabilityText}>{capability}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => 
            robot.status === 'connected' 
              ? handleDisconnect() 
              : handleConnect(robot)
          }
          disabled={robot.status === 'connecting'}
        >
          <LinearGradient
            colors={
              robot.status === 'connected'
                ? [COLORS.error, '#FF7043']
                : [COLORS.primary, COLORS.primaryDark]
            }
            style={styles.connectButtonGradient}
          >
            <Text style={styles.connectButtonText}>
              {robot.status === 'connected' 
                ? 'Disconnect' 
                : robot.status === 'connecting'
                ? 'Connecting...'
                : 'Connect'
              }
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 Robot Control</Text>
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={handleScanForRobots}
          disabled={isScanning}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? '🔄 Scanning...' : '🔍 Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connected Robot Status */}
        {connectedRobot && (
          <View style={styles.connectedSection}>
            <Text style={styles.sectionTitle}>🟢 Connected Robot</Text>
            <View style={styles.connectedRobotCard}>
              <LinearGradient
                colors={[COLORS.success + '20', COLORS.success + '10']}
                style={styles.connectedRobotGradient}
              >
                <Text style={styles.connectedRobotName}>{connectedRobot.name}</Text>
                <Text style={styles.connectedRobotStatus}>Ready for commands</Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Quick Commands */}
        {connectedRobot && (
          <View style={styles.commandsSection}>
            <Text style={styles.sectionTitle}>⚡ Quick Commands</Text>
            <View style={styles.commandsGrid}>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Move Forward')}
              >
                <Text style={styles.commandText}>🔼 Forward</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Move Backward')}
              >
                <Text style={styles.commandText}>🔽 Backward</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Turn Left')}
              >
                <Text style={styles.commandText}>◀️ Left</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Turn Right')}
              >
                <Text style={styles.commandText}>▶️ Right</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Pick Object')}
              >
                <Text style={styles.commandText}>🫴 Pick</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Place Object')}
              >
                <Text style={styles.commandText}>🫳 Place</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Emergency Stop')}
              >
                <Text style={styles.commandText}>🛑 STOP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commandButton}
                onPress={() => executeCommand('Return Home')}
              >
                <Text style={styles.commandText}>🏠 Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Available Robots */}
        <View style={styles.robotsSection}>
          <Text style={styles.sectionTitle}>📡 Available Robots</Text>
          {robots.map((robot) => (
            <RobotCard key={robot.id} robot={robot} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  scanButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  scanButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  connectedSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  connectedRobotCard: {
    borderRadius: BORDER_RADIUS.md,
  },
  connectedRobotGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  connectedRobotName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  connectedRobotStatus: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.success,
    fontWeight: '500',
  },
  commandsSection: {
    marginBottom: SPACING.xl,
  },
  commandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  commandButton: {
    width: '45%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  commandText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '500',
  },
  robotsSection: {
    marginBottom: SPACING.xxl,
  },
  robotCard: {
    marginBottom: SPACING.lg,
  },
  robotCardGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  robotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  robotEmoji: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  robotInfo: {
    flex: 1,
  },
  robotName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  robotType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  robotIp: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
  },
  robotStatus: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
  },
  robotMeta: {
    marginBottom: SPACING.md,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  batteryLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    minWidth: 60,
  },
  batteryBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.xs,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.xs,
  },
  batteryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  capabilities: {
    marginBottom: SPACING.md,
  },
  capabilitiesLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  capabilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  capabilityTag: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  capabilityText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  connectButton: {
    borderRadius: BORDER_RADIUS.md,
  },
  connectButtonGradient: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  connectButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
  },
});

export default RobotScreen; 