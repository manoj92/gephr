import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const mockTrainingData = [
  { id: 1, name: 'Grasp Coffee Cup', duration: '2:34', gestures: 12, accuracy: 94 },
  { id: 2, name: 'Open Door', duration: '1:45', gestures: 8, accuracy: 89 },
  { id: 3, name: 'Pick up Book', duration: '3:21', gestures: 15, accuracy: 97 },
];

export default function HomeScreen() {
  const [stats, setStats] = useState({
    dataRecorded: '2.3 GB',
    earnings: '$47',
    sessionsToday: 5,
    accuracy: 94
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>🤖 Humanoid Training Platform</Text>
          <Text style={styles.subtitle}>AI-Powered Robot Training Hub</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.dataRecorded}</Text>
            <Text style={styles.statLabel}>Data Recorded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.earnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.sessionsToday}</Text>
            <Text style={styles.statLabel}>Sessions Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.accuracy}%</Text>
            <Text style={styles.statLabel}>Avg Accuracy</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🎥</Text>
              <Text style={styles.actionText}>Start Recording</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🤖</Text>
              <Text style={styles.actionText}>Connect Robot</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🏷️</Text>
              <Text style={styles.actionText}>Label Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🛒</Text>
              <Text style={styles.actionText}>Marketplace</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Training Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Training Sessions</Text>
          {mockTrainingData.map(session => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{session.name}</Text>
                <Text style={styles.sessionDetails}>
                  {session.duration} • {session.gestures} gestures • {session.accuracy}% accuracy
                </Text>
              </View>
              <TouchableOpacity style={styles.sessionAction}>
                <Text style={styles.sessionActionText}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  statCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center', width: (width - 60) / 2, marginBottom: 16 },
  statValue: { fontSize: 20, color: '#00E5FF', fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#808080', marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionButton: { backgroundColor: '#00E5FF', padding: 16, borderRadius: 12, alignItems: 'center', width: (width - 60) / 2, marginBottom: 12 },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { color: '#0A0A0A', fontSize: 14, fontWeight: '600' },
  sessionCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  sessionInfo: { flex: 1 },
  sessionName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sessionDetails: { color: '#808080', fontSize: 12 },
  sessionAction: { backgroundColor: '#00E5FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  sessionActionText: { color: '#0A0A0A', fontSize: 12, fontWeight: '600' },
});