import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { apiService } from '../services/ApiService';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRobots: 0,
    activeSessions: 0,
    marketplaceItems: 0,
    totalDownloads: 0,
    completedSessions: 0,
    platformUptime: 'Online',
    total_robots: 0,
    active_sessions: 0,
    completed_sessions: 0,
    marketplace_items: 0,
    total_downloads: 0,
    platform_uptime: 'Online',
  });
  const [dataRecorded] = useState('2.3 GB');
  const [earnings] = useState(47);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const platformStats = await apiService.getPlatformStats();
      setStats({
        totalRobots: platformStats.total_robots,
        activeSessions: platformStats.active_sessions,
        marketplaceItems: platformStats.marketplace_items,
        totalDownloads: platformStats.total_downloads,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Use mock data if API fails
      setStats({
        totalRobots: 4,
        activeSessions: 1,
        marketplaceItems: 4,
        totalDownloads: 850,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading platform stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Gephr Training Platform</Text>
          <Text style={styles.subtitle}>Transform your smartphone into a robot training powerhouse</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dataRecorded}</Text>
              <Text style={styles.statLabel}>Data Recorded</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${earnings}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalRobots}</Text>
              <Text style={styles.statLabel}>Available Robots</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.marketplaceItems}</Text>
              <Text style={styles.statLabel}>Skills Available</Text>
            </View>
          </View>

          <View style={styles.platformStatsContainer}>
            <Text style={styles.sectionTitle}>Platform Stats</Text>
            <View style={styles.platformCard}>
              <Text style={styles.platformStat}>Robots Connected: {stats.totalRobots}</Text>
              <Text style={styles.platformStat}>Active Sessions: {stats.activeSessions}</Text>
              <Text style={styles.platformStat}>Skills in Marketplace: {stats.marketplaceItems}</Text>
              <Text style={styles.platformStat}>Total Downloads: {(stats.totalDownloads || 0).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Record' as never)}
            >
              <Text style={styles.actionButtonText}>Start Recording</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Robot' as never)}
            >
              <Text style={styles.actionButtonText}>Connect Robot</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Marketplace' as never)}
            >
              <Text style={styles.actionButtonText}>Browse Marketplace</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Map' as never)}
            >
              <Text style={styles.actionButtonText}>Map Environment</Text>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 0.48,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  platformStatsContainer: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: 'bold',
  },
  platformCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformStat: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontSize: 16,
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.background,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default HomeScreen;