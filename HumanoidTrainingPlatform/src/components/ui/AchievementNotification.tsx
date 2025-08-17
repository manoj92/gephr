import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

import { COLORS, SPACING } from '../../constants/theme';
import { Achievement } from '../../services/AchievementService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AchievementNotificationProps {
  achievement: Achievement;
  visible: boolean;
  onDismiss: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  visible,
  onDismiss,
}) => {
  const translateY = useSharedValue(-200);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const glowAnimation = useSharedValue(0);
  const sparkleAnimation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Show animation
      translateY.value = withSpring(0, { damping: 10 });
      scale.value = withSequence(
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
      opacity.value = withTiming(1, { duration: 300 });
      
      // Glow effect
      glowAnimation.value = withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.7, { duration: 1000 }),
        withTiming(1, { duration: 500 })
      );
      
      // Sparkle effect
      sparkleAnimation.value = withTiming(1, { duration: 1000 });
      
      // Auto dismiss after 4 seconds
      const timeout = setTimeout(() => {
        dismissNotification();
      }, 4000);
      
      return () => clearTimeout(timeout);
    } else {
      dismissNotification();
    }
  }, [visible]);

  const dismissNotification = () => {
    translateY.value = withTiming(-200, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    scale.value = withTiming(0.8, { duration: 300 });
    
    setTimeout(() => {
      runOnJS(onDismiss)();
    }, 300);
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowAnimation.value,
    transform: [
      { scale: interpolate(glowAnimation.value, [0, 1], [0.9, 1.1]) },
    ],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleAnimation.value,
    transform: [
      { rotate: `${sparkleAnimation.value * 360}deg` },
    ],
  }));

  const getRarityGradient = (rarity: Achievement['rarity']): string[] => {
    switch (rarity) {
      case 'common':
        return ['#10B981', '#059669'];
      case 'rare':
        return ['#3B82F6', '#1D4ED8'];
      case 'epic':
        return ['#8B5CF6', '#7C3AED'];
      case 'legendary':
        return ['#F59E0B', '#D97706', '#EF4444'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.notification, containerAnimatedStyle]}>
        {/* Glow Effect */}
        <Animated.View style={[styles.glowEffect, glowAnimatedStyle]}>
          <LinearGradient
            colors={[...getRarityGradient(achievement.rarity), 'transparent']}
            style={styles.glow}
          />
        </Animated.View>

        {/* Sparkles */}
        <Animated.View style={[styles.sparkles, sparkleAnimatedStyle]}>
          {[...Array(8)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.sparkle,
                {
                  transform: [
                    { rotate: `${index * 45}deg` },
                    { translateX: 60 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Main Content */}
        <BlurView intensity={20} tint="dark" style={styles.content}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.contentGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerText}>Achievement Unlocked!</Text>
              <Text style={[styles.rarityText, { color: achievement.color }]}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>

            {/* Achievement Content */}
            <View style={styles.achievementContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${achievement.color}20` }]}>
                <Ionicons
                  name={achievement.icon as any}
                  size={48}
                  color={achievement.color}
                />
              </View>
              
              <View style={styles.textContent}>
                <Text style={styles.title}>{achievement.title}</Text>
                <Text style={styles.description}>{achievement.description}</Text>
              </View>
            </View>

            {/* Rewards */}
            <View style={styles.rewards}>
              <View style={styles.reward}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.rewardText}>+{achievement.xpReward} XP</Text>
              </View>
              <View style={styles.reward}>
                <Ionicons name="diamond" size={16} color="#00F5FF" />
                <Text style={styles.rewardText}>+{achievement.coinReward} Coins</Text>
              </View>
            </View>

            {/* Progress Bar (if applicable) */}
            {achievement.maxProgress > 1 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={getRarityGradient(achievement.rarity)}
                    style={[
                      styles.progressFill,
                      { width: `${(achievement.progress / achievement.maxProgress) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {achievement.progress}/{achievement.maxProgress}
                </Text>
              </View>
            )}
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  notification: {
    width: SCREEN_WIDTH - 40,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  glow: {
    flex: 1,
    borderRadius: 25,
    opacity: 0.3,
  },
  sparkles: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  content: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentGradient: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  rewards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default AchievementNotification;