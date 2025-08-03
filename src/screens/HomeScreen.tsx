import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const QuickAction: React.FC<QuickActionProps> = ({ icon, title, subtitle, onPress, color }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.7, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <AnimatedPressable
      style={[styles.quickAction, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceElevated]}
        style={styles.quickActionGradient}
      >
        <Animated.View style={[styles.glowBackground, glowStyle, { backgroundColor: color }]} />
        <View style={styles.quickActionContent}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={28} color={color} />
          </View>
          <View style={styles.quickActionText}>
            <Text style={styles.quickActionTitle}>{title}</Text>
            <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: keyof typeof Ionicons.glyphMap; trend?: number }> = ({
  title,
  value,
  icon,
  trend
}) => {
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1.05, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  return (
    <Animated.View style={[styles.statCard, pulseStyle]}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceElevated]}
        style={styles.statCardGradient}
      >
        <View style={styles.statCardHeader}>
          <Ionicons name={icon} size={24} color={COLORS.primary} />
          {trend && (
            <View style={styles.trendContainer}>
              <Ionicons 
                name={trend > 0 ? "trending-up" : "trending-down"} 
                size={16} 
                color={trend > 0 ? COLORS.success : COLORS.error} 
              />
              <Text style={[styles.trendText, { color: trend > 0 ? COLORS.success : COLORS.error }]}>
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const HomeScreen: React.FC = () => {
  const headerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 800 });
    contentTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const quickActions = [
    {
      icon: 'videocam' as const,
      title: 'Start Recording',
      subtitle: 'Capture hand movements',
      color: COLORS.primary,
      onPress: () => console.log('Start Recording'),
    },
    {
      icon: 'map' as const,
      title: 'Map Environment',
      subtitle: 'Scan and label surroundings',
      color: COLORS.accent,
      onPress: () => console.log('Map Environment'),
    },
    {
      icon: 'hardware-chip' as const,
      title: 'Connect Robot',
      subtitle: 'Link to Unitree G1',
      color: COLORS.robotBlue,
      onPress: () => console.log('Connect Robot'),
    },
    {
      icon: 'storefront' as const,
      title: 'Browse Skills',
      subtitle: 'Explore marketplace',
      color: COLORS.accentSecondary,
      onPress: () => console.log('Browse Skills'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient
          colors={[COLORS.background, COLORS.backgroundSecondary]}
          style={styles.headerGradient}
        >
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.headerTitle}>Humanoid Training Platform</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Ionicons name="flash" size={16} color={COLORS.neon} />
              <Text style={styles.headerStatText}>Level 12</Text>
            </View>
            <View style={styles.headerStat}>
              <Ionicons name="diamond" size={16} color={COLORS.primary} />
              <Text style={styles.headerStatText}>1,250 Credits</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, contentStyle]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <View style={styles.statsGrid}>
              <StatCard title="Data Recorded" value="2.3 GB" icon="cloud-upload" trend={15} />
              <StatCard title="Skills Created" value="3" icon="build" trend={-5} />
              <StatCard title="Earnings" value="$47" icon="wallet" trend={22} />
              <StatCard title="Robot Tasks" value="12" icon="rocket" trend={8} />
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <QuickAction key={index} {...action} />
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceElevated]}
                style={styles.activityGradient}
              >
                <View style={styles.activityItem}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>Skill "Kitchen Helper" Uploaded</Text>
                    <Text style={styles.activityTime}>2 hours ago</Text>
                  </View>
                </View>
                <View style={styles.activityItem}>
                  <Ionicons name="download" size={24} color={COLORS.info} />
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>Downloaded "Assembly Pro"</Text>
                    <Text style={styles.activityTime}>5 hours ago</Text>
                  </View>
                </View>
                <View style={styles.activityItem}>
                  <Ionicons name="robot" size={24} color={COLORS.robotBlue} />
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>Robot G1 Connected</Text>
                    <Text style={styles.activityTime}>1 day ago</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerGradient: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  headerStats: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.lg,
  },
  headerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerStatText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  statsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
  },
  statCardGradient: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  trendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: '600',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs / 2,
  },
  statTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  quickActionsSection: {
    marginBottom: SPACING.xl,
  },
  quickActionsGrid: {
    gap: SPACING.md,
  },
  quickAction: {
    marginBottom: SPACING.sm,
  },
  quickActionGradient: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  quickActionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  recentSection: {
    marginBottom: SPACING.xxl,
  },
  activityCard: {
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  activityGradient: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  activityText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs / 2,
  },
});

export default HomeScreen; 