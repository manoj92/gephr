import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function RobotScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [robotStatus, setRobotStatus] = useState('Disconnected');
  const [batteryLevel, setBatteryLevel] = useState(85);

  const connectRobot = () => {
    setIsConnected(!isConnected);
    setRobotStatus(isConnected ? 'Disconnected' : 'Connected');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🤖 Robot Control</Text>
          <Text style={styles.subtitle}>Connect and Control Your Robots</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionCard}>
          <View style={styles.robotHeader}>
            <Text style={styles.robotName}>Unitree G1 Humanoid</Text>
            <View style={[styles.statusDot, isConnected && styles.connectedDot]} />
          </View>
          <Text style={styles.robotStatus}>{robotStatus}</Text>
          {isConnected && (
            <Text style={styles.batteryStatus}>🔋 Battery: {batteryLevel}%</Text>
          )}
          <TouchableOpacity style={styles.connectButton} onPress={connectRobot}>
            <Text style={styles.connectButtonText}>
              {isConnected ? 'Disconnect' : 'Connect Robot'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Control Interface */}
        {isConnected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Robot Controls</Text>
            
            {/* Movement Controls */}
            <View style={styles.controlPanel}>
              <Text style={styles.controlTitle}>Movement</Text>
              <View style={styles.movementGrid}>
                <TouchableOpacity style={styles.movementButton}>
                  <Text style={styles.movementText}>⬆️</Text>
                </TouchableOpacity>
                <View style={styles.movementRow}>
                  <TouchableOpacity style={styles.movementButton}>
                    <Text style={styles.movementText}>⬅️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.movementButton}>
                    <Text style={styles.movementText}>🛑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.movementButton}>
                    <Text style={styles.movementText}>➡️</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.movementButton}>
                  <Text style={styles.movementText}>⬇️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gesture Controls */}
            <View style={styles.controlPanel}>
              <Text style={styles.controlTitle}>Gestures</Text>
              <View style={styles.gestureControls}>
                <TouchableOpacity style={styles.gestureButton}>
                  <Text style={styles.gestureText}>👋 Wave</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.gestureButton}>
                  <Text style={styles.gestureText}>✋ Grasp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.gestureButton}>
                  <Text style={styles.gestureText}>👉 Point</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.gestureButton}>
                  <Text style={styles.gestureText}>🤝 Handshake</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Robot Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Robot Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>2.5h</Text>
              <Text style={styles.analyticsLabel}>Active Time</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>47</Text>
              <Text style={styles.analyticsLabel}>Tasks Complete</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>94%</Text>
              <Text style={styles.analyticsLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, color: '#00E5FF', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#B0B0B0', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 12 },
  connectionCard: { backgroundColor: '#1A1A1A', margin: 20, padding: 16, borderRadius: 12 },
  robotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  robotName: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5252' },
  connectedDot: { backgroundColor: '#00C896' },
  robotStatus: { color: '#808080', fontSize: 14, marginBottom: 8 },
  batteryStatus: { color: '#00E5FF', fontSize: 14, marginBottom: 16 },
  connectButton: { backgroundColor: '#00E5FF', padding: 12, borderRadius: 8, alignItems: 'center' },
  connectButtonText: { color: '#0A0A0A', fontSize: 16, fontWeight: '600' },
  controlPanel: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 16 },
  controlTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  movementGrid: { alignItems: 'center' },
  movementRow: { flexDirection: 'row' },
  movementButton: { backgroundColor: '#333333', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', margin: 8 },
  movementText: { fontSize: 24 },
  gestureControls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gestureButton: { backgroundColor: '#333333', padding: 12, borderRadius: 8, width: (width - 80) / 2, alignItems: 'center', marginBottom: 8 },
  gestureText: { color: '#FFFFFF', fontSize: 14 },
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  analyticsCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center', width: (width - 80) / 3 },
  analyticsValue: { color: '#00E5FF', fontSize: 18, fontWeight: 'bold' },
  analyticsLabel: { color: '#808080', fontSize: 12, marginTop: 4, textAlign: 'center' },
});