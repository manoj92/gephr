import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  borderWidth?: number;
  borderColor?: string;
  animated?: boolean;
  onPress?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  tint = 'dark',
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.2)',
  animated = true,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        {
          rotateY: `${interpolate(
            rotation.value,
            [0, 1],
            [0, 10],
            Extrapolate.CLAMP
          )}deg`,
        },
      ],
    };
  });

  const handlePressIn = () => {
    if (animated) {
      scale.value = withSpring(0.98);
      rotation.value = withTiming(1, { duration: 200 });
    }
  };

  const handlePressOut = () => {
    if (animated) {
      scale.value = withSpring(1);
      rotation.value = withTiming(0, { duration: 200 });
    }
    onPress?.();
  };

  const Container = animated ? Animated.View : View;

  return (
    <Container
      style={[animatedStyle, style]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      <View style={[styles.container, { borderWidth, borderColor }]}>
        <BlurView intensity={intensity} tint={tint} style={styles.blur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
            style={styles.gradient}
          />
          {children}
        </BlurView>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  blur: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});