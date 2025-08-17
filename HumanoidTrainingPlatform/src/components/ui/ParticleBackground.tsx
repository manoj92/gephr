import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  minDuration?: number;
  maxDuration?: number;
}

const AnimatedParticle: React.FC<{
  particle: Particle;
}> = ({ particle }) => {
  const translateY = useSharedValue(particle.y);
  const translateX = useSharedValue(particle.x);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(-100, {
          duration: particle.duration,
          easing: Easing.linear,
        }),
        -1
      )
    );

    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(particle.x + (Math.random() - 0.5) * 100, {
          duration: particle.duration * 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, {
          duration: particle.duration / 4,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.size / 2,
          position: 'absolute',
          left: 0,
          top: 0,
        },
      ]}
    />
  );
};

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 50,
  colors = ['#00F5FF', '#FF00FF', '#FFFF00', '#00FF00', '#FF0080'],
  minSize = 2,
  maxSize = 6,
  minDuration = 10000,
  maxDuration = 20000,
}) => {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    for (let i = 0; i < particleCount; i++) {
      particles.current.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT + SCREEN_HEIGHT,
        size: Math.random() * (maxSize - minSize) + minSize,
        duration: Math.random() * (maxDuration - minDuration) + minDuration,
        delay: Math.random() * 5000,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((particle) => (
        <AnimatedParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  particle: {
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});