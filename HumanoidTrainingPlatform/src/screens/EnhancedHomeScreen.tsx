import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import HapticFeedback from '../utils/haptics';
import LottieView from 'lottie-react-native';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';
import { useAppSelector } from '../store/hooks';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  trend: 'up' | 'down';
}

const statsData: StatCard[] = [
  {
    title: 'Total Recordings',
    value: '1,234',
    change: '+12%',
    icon: 'video',
    color: '#00F5FF',
    trend: 'up',
  },
  {
    title: 'Skills Earned',
    value: '$2,450',
    change: '+28%',
    icon: 'dollar-sign',
    color: '#00FF80',
    trend: 'up',
  },
  {
    title: 'Robots Connected',
    value: '8',
    change: '+2',
    icon: 'robot',
    color: '#FF00FF',
    trend: 'up',
  },
  {
    title: 'Training Hours',
    value: '156',
    change: '+15h',
    icon: 'clock',
    color: '#FFD700',
    trend: 'up',
  },
];

const quickActions = [
  { id: '1', title: 'Start Recording', icon: 'radio-button-on', screen: 'Record', color: '#FF0080' },
  { id: '2', title: 'Connect Robot', icon: 'link', screen: 'Robot', color: '#00F5FF' },
  { id: '3', title: 'Browse Skills', icon: 'storefront', screen: 'Marketplace', color: '#8000FF' },
  { id: '4', title: 'View Map', icon: 'map', screen: 'Map', color: '#00FF80' },
];

const EnhancedHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAppSelector(state => state.user.currentUser);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStat, setSelectedStat] = useState<number | null>(null);

  const welcomeAnimation = useSharedValue(0);
  const cardAnimations = statsData.map(() => useSharedValue(0));
  const pulseAnimation = useSharedValue(1);
  const rotationAnimation = useSharedValue(0);

  useEffect(() => {
    // Welcome animation
    welcomeAnimation.value = withSpring(1, { damping: 10 });

    // Cards stagger animation
    cardAnimations.forEach((anim, index) => {
      anim.value = withDelay(index * 100, withSpring(1, { damping: 10 }));
    });

    // Continuous pulse for active elements
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    // Rotation animation for decorative elements
    rotationAnimation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1
    );
  }, []);

  const welcomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: welcomeAnimation.value,
    transform: [
      {
        translateY: interpolate(welcomeAnimation.value, [0, 1], [50, 0]),
      },
    ],
  }));

  const handleRefresh = () => {
    HapticFeedback.trigger('impactLight');
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      cardAnimations.forEach((anim, index) => {
        anim.value = 0;
        anim.value = withDelay(index * 100, withSpring(1, { damping: 10 }));
      });
    }, 1500);
  };

  const handleQuickAction = (screen: string) => {
    HapticFeedback.trigger('impactMedium');
    navigation.navigate(screen as never);
  };

  const renderStatCard = (stat: StatCard, index: number) => {
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: cardAnimations[index].value,
      transform: [
        {
          scale: interpolate(cardAnimations[index].value, [0, 1], [0.8, 1]),
        },
        {
          translateY: interpolate(cardAnimations[index].value, [0, 1], [50, 0]),
        },
      ],
    }));

    const isSelected = selectedStat === index;
    const selectedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: isSelected ? withSpring(1.05) : withSpring(1) }],
    }));

    return (
      <Animated.View key={index} style={[styles.statCard, animatedStyle, selectedStyle]}>
        <TouchableOpacity onPress={() => setSelectedStat(isSelected ? null : index)}>
          <GlassCard style={styles.statCardContent}>
            <LinearGradient
              colors={[`${stat.color}20`, 'transparent']}
              style={styles.statGradient}
            />
            <View style={styles.statHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}30` }]}>
                {stat.icon === 'robot' ? (
                  <MaterialCommunityIcons name={stat.icon} size={24} color={stat.color} />
                ) : (
                  <FontAwesome5 name={stat.icon} size={20} color={stat.color} />
                )}
              </View>
              <View style={styles.statTrend}>
                <Ionicons
                  name={stat.trend === 'up' ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={stat.trend === 'up' ? COLORS.success : COLORS.error}
                />
                <Text style={[
                  styles.statChange,
                  { color: stat.trend === 'up' ? COLORS.success : COLORS.error }
                ]}>
                  {stat.change}
                </Text>
              </View>
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const decorativeRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAnimation.value}deg` }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={25} />
      
      {/* Decorative Background Elements */}
      <Animated.View style={[styles.decorativeCircle, decorativeRotation]}>
        <LinearGradient
          colors={['#00F5FF', '#FF00FF', '#8000FF']}
          style={styles.gradientCircle}
        />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, welcomeAnimatedStyle]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.userName}>{user?.name || 'Robot Trainer'}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <View style={styles.notificationBadge} />
              <Ionicons name="notifications" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Level Progress */}
          <GlassCard style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelTitle}>Level {user?.level || 12}</Text>
              <Text style={styles.levelXP}>2,450 / 3,000 XP</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#00F5FF', '#00FF80']}
                  style={[styles.progressFill, { width: '82%' }]}
                />
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            {statsData.map((stat, index) => renderStatCard(stat, index))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => handleQuickAction(action.screen)}
              >
                <LinearGradient
                  colors={[`${action.color}40`, `${action.color}20`]}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name={action.icon as any} size={32} color={action.color} />
                  <Text style={styles.quickActionText}>{action.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <GlassCard style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Kitchen Task Completed</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
              <Text style={styles.activityValue}>+150 XP</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="download" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New Skill Purchased</Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
              <Text style={styles.activityValue}>-$29.99</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialCommunityIcons name="robot" size={24} color={COLORS.warning} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Robot Connected</Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
              <Text style={styles.activityValue}>Unitree G1</Text>
            </View>
          </GlassCard>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <GlassCard style={styles.ctaCard}>
            <LinearGradient
              colors={['rgba(255, 0, 128, 0.1)', 'rgba(128, 0, 255, 0.1)']}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaTitle}>Ready to Train?</Text>
              <Text style={styles.ctaText}>
                Start recording hand movements to create robot training data
              </Text>
              <NeonButton
                title="Start Recording"
                onPress={() => handleQuickAction('Record')}
                variant="primary"
                size="large"
              />
            </LinearGradient>
          </GlassCard>
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
  decorativeCircle: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
    opacity: 0.1,
  },
  header: {
    padding: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  levelCard: {
    padding: SPACING.md,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  levelXP: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 3) / 2,
    marginBottom: SPACING.md,
  },
  statCardContent: {
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  statGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickActionsContainer: {
    paddingLeft: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  quickActionCard: {
    width: 120,
    height: 120,
    marginRight: SPACING.md,
  },
  quickActionGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  activityContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  activityCard: {
    padding: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  activityDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: SPACING.sm,
  },
  ctaContainer: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  ctaCard: {
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  ctaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});

export default EnhancedHomeScreen;