import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [userStats] = useState({
    totalEarnings: 127.45,
    dataContributed: '8.7 GB',
    skillsPublished: 3,
    reputation: 4.8
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>👤 Profile</Text>
          <Text style={styles.subtitle}>Your Training Progress & Settings</Text>
        </View>

        {/* User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.userName}>Robot Trainer</Text>
          <Text style={styles.userLevel}>Level 5 Contributor</Text>
          <View style={styles.reputationRow}>
            <Text style={styles.reputation}>⭐ {userStats.reputation}</Text>
            <Text style={styles.reputationLabel}>Reputation</Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${userStats.totalEarnings}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{userStats.dataContributed}</Text>
              <Text style={styles.statLabel}>Data Contributed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{userStats.skillsPublished}</Text>
              <Text style={styles.statLabel}>Skills Published</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>🔔 Notifications</Text>
            <Text style={styles.settingValue}>On</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>🌓 Dark Mode</Text>
            <Text style={styles.settingValue}>Enabled</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>📊 Data Privacy</Text>
            <Text style={styles.settingValue}>Configure</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>💳 Payment Methods</Text>
            <Text style={styles.settingValue}>Manage</Text>
          </TouchableOpacity>
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
  profileCard: { backgroundColor: '#1A1A1A', margin: 20, padding: 20, borderRadius: 12, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#333333', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 40 },
  userName: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  userLevel: { color: '#00E5FF', fontSize: 14, marginBottom: 12 },
  reputationRow: { flexDirection: 'row', alignItems: 'center' },
  reputation: { color: '#FFD700', fontSize: 16, marginRight: 8 },
  reputationLabel: { color: '#808080', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center', width: (width - 60) / 2, marginBottom: 16 },
  statValue: { fontSize: 20, color: '#00E5FF', fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#808080', marginTop: 4 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12 },
  settingLabel: { color: '#FFFFFF', fontSize: 16 },
  settingValue: { color: '#00E5FF', fontSize: 14 },
});