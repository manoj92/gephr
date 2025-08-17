import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HapticFeedback from 'react-native-haptic-feedback';
import LottieView from 'lottie-react-native';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  animation?: string;
  tips: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to the Future',
    subtitle: 'Humanoid Training Platform',
    description: 'Transform your smartphone into a powerful robot training tool. Capture hand movements and create training data for the next generation of humanoid robots.',
    icon: 'robot-excited',
    color: '#00F5FF',
    tips: [
      'Train robots with natural hand movements',
      'Earn income through skills marketplace',
      'Connect with multiple robot platforms'
    ]
  },
  {
    id: 2,
    title: 'Hand Tracking Magic',
    subtitle: 'AI-Powered Motion Capture',
    description: 'Our advanced computer vision system captures every nuance of your hand movements with incredible precision. No expensive equipment needed.',
    icon: 'hand-heart',
    color: '#FF00FF',
    tips: [
      'Works with any smartphone camera',
      'Real-time hand pose detection',
      'Sub-centimeter accuracy'
    ]
  },
  {
    id: 3,
    title: 'Robot Connection',
    subtitle: 'Universal Compatibility',
    description: 'Connect seamlessly with Unitree G1, Boston Dynamics robots, Tesla Optimus, and custom robotic platforms through our unified interface.',
    icon: 'robot-industrial',
    color: '#00FF80',
    tips: [
      'Multiple robot support',
      'Real-time control and feedback',
      'Secure wireless connections'
    ]
  },
  {
    id: 4,
    title: 'Skills Marketplace',
    subtitle: 'Monetize Your Expertise',
    description: 'Upload your training data to our global marketplace and earn from every download. Share your skills with robot developers worldwide.',
    icon: 'storefront',
    color: '#FFD700',
    tips: [
      'Global skill sharing platform',
      'Earn passive income',
      'Quality verification system'
    ]
  },
  {
    id: 5,
    title: 'Ready to Start?',
    subtitle: 'Begin Your Journey',
    description: 'You are all set to start training robots! Begin by recording your first hand movement session and join the robotics revolution.',
    icon: 'rocket',
    color: '#FF0080',
    tips: [
      'Start with simple movements',
      'Practice makes perfect',
      'Join our community for tips'
    ]
  }
];

const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const titleAnimation = useSharedValue(0);
  const contentAnimation = useSharedValue(0);
  const iconAnimation = useSharedValue(0);
  const particleAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);

  useEffect(() => {
    animateStep();
  }, [currentStep]);

  const animateStep = () => {
    // Reset animations
    titleAnimation.value = 0;
    contentAnimation.value = 0;
    iconAnimation.value = 0;
    
    // Animate in sequence
    titleAnimation.value = withDelay(200, withSpring(1, { damping: 10 }));
    iconAnimation.value = withDelay(400, withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 10 })
    ));
    contentAnimation.value = withDelay(600, withSpring(1, { damping: 12 }));
    
    // Update progress
    progressAnimation.value = withTiming((currentStep + 1) / onboardingSteps.length, { duration: 800 });
    
    // Particles effect
    particleAnimation.value = withSequence(
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 1000 })
    );
  };

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleAnimation.value,
    transform: [
      {
        translateY: interpolate(
          titleAnimation.value,
          [0, 1],
          [50, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentAnimation.value,
    transform: [
      {
        translateY: interpolate(
          contentAnimation.value,
          [0, 1],
          [30, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconAnimation.value,
    transform: [
      { scale: iconAnimation.value },
      {
        rotate: `${interpolate(
          iconAnimation.value,
          [0, 1],
          [0, 360],
          Extrapolate.CLAMP
        )}deg`,
      },
    ],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * 100}%`,
  }));

  const particleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: particleAnimation.value,
    transform: [{ scale: particleAnimation.value }],
  }));

  const handleNext = () => {
    HapticFeedback.trigger('impactLight');
    
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({
        x: (currentStep + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      HapticFeedback.trigger('notificationSuccess');
      onComplete();
    }
  };

  const handlePrevious = () => {
    HapticFeedback.trigger('impactLight');
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({
        x: (currentStep - 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    HapticFeedback.trigger('impactMedium');
    onComplete();
  };

  const step = onboardingSteps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={20} />
      
      {/* Decorative Background */}
      <Animated.View style={[styles.decorativeParticles, particleAnimatedStyle]}>
        <View style={[styles.floatingParticle, { backgroundColor: step.color, top: '20%', left: '10%' }]} />
        <View style={[styles.floatingParticle, { backgroundColor: step.color, top: '60%', right: '15%' }]} />
        <View style={[styles.floatingParticle, { backgroundColor: step.color, top: '80%', left: '20%' }]} />
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentStep + 1} of {onboardingSteps.length}
          </Text>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.contentContainer}
      >
        {onboardingSteps.map((stepData, index) => (
          <View key={stepData.id} style={styles.stepContainer}>
            {index === currentStep && (
              <>
                {/* Icon */}
                <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
                  <LinearGradient
                    colors={[`${stepData.color}40`, `${stepData.color}20`]}
                    style={styles.iconGradient}
                  >
                    <MaterialCommunityIcons
                      name={stepData.icon as any}
                      size={80}
                      color={stepData.color}
                    />
                  </LinearGradient>
                </Animated.View>

                {/* Title */}
                <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
                  <Text style={styles.title}>{stepData.title}</Text>
                  <Text style={[styles.subtitle, { color: stepData.color }]}>
                    {stepData.subtitle}
                  </Text>
                </Animated.View>

                {/* Content */}
                <Animated.View style={[styles.contentCard, contentAnimatedStyle]}>
                  <GlassCard style={styles.card}>
                    <Text style={styles.description}>{stepData.description}</Text>
                    
                    <View style={styles.tipsContainer}>
                      <Text style={styles.tipsTitle}>Key Features:</Text>
                      {stepData.tips.map((tip, tipIndex) => (
                        <View key={tipIndex} style={styles.tipItem}>
                          <Ionicons name="checkmark-circle" size={16} color={stepData.color} />
                          <Text style={styles.tipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  </GlassCard>
                </Animated.View>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <View style={styles.navButtons}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.spacer} />
          
          <NeonButton
            title={currentStep === onboardingSteps.length - 1 ? "Get Started" : "Next"}
            onPress={handleNext}
            variant="primary"
            size="large"
          />
        </View>

        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {onboardingSteps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentStep ? step.color : 'rgba(255, 255, 255, 0.3)',
                  transform: [{ scale: index === currentStep ? 1.2 : 1 }],
                }
              ]}
              onPress={() => {
                setCurrentStep(index);
                scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  decorativeParticles: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingParticle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  skipButton: {
    padding: SPACING.sm,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  progressContainer: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: SPACING.lg,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  contentCard: {
    marginHorizontal: SPACING.md,
  },
  card: {
    padding: SPACING.xl,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  tipsContainer: {
    marginTop: SPACING.md,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  navigation: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  navButtonText: {
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontSize: 16,
  },
  spacer: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default OnboardingScreen;