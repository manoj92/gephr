import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import HapticFeedback from '../../utils/haptics';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  pulse?: boolean;
  haptic?: boolean;
}

const variantColors = {
  primary: {
    gradient: ['#00F5FF', '#0080FF', '#FF00FF'],
    shadow: '#00F5FF',
    text: '#FFFFFF',
  },
  secondary: {
    gradient: ['#FF00FF', '#FF0080', '#FF8000'],
    shadow: '#FF00FF',
    text: '#FFFFFF',
  },
  danger: {
    gradient: ['#FF0040', '#FF0080', '#FF00C0'],
    shadow: '#FF0040',
    text: '#FFFFFF',
  },
  success: {
    gradient: ['#00FF80', '#00FF40', '#00FFC0'],
    shadow: '#00FF80',
    text: '#000000',
  },
};

const sizeStyles = {
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontSize: 16,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    fontSize: 18,
  },
};

export const NeonButton: React.FC<NeonButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  pulse = true,
  haptic = true,
}) => {
  const glowAnimation = useSharedValue(0);
  const pressAnimation = useSharedValue(1);
  const colors = variantColors[variant];
  const sizeConfig = sizeStyles[size];

  useEffect(() => {
    if (pulse && !disabled) {
      glowAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
  }, [pulse, disabled]);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: interpolate(glowAnimation.value, [0, 1], [0.5, 1]),
      shadowRadius: interpolate(glowAnimation.value, [0, 1], [10, 20]),
    };
  });

  const animatedPressStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressAnimation.value }],
    };
  });

  const handlePressIn = () => {
    pressAnimation.value = withTiming(0.95, { duration: 100 });
    if (haptic) {
      HapticFeedback.trigger('impactLight');
    }
  };

  const handlePressOut = () => {
    pressAnimation.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (!disabled) {
      if (haptic) {
        HapticFeedback.trigger('impactMedium');
      }
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedGlowStyle,
        animatedPressStyle,
        {
          shadowColor: colors.shadow,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              paddingHorizontal: sizeConfig.paddingHorizontal,
              paddingVertical: sizeConfig.paddingVertical,
            },
          ]}
        >
          <View style={styles.innerBorder}>
            <Text
              style={[
                styles.text,
                {
                  color: colors.text,
                  fontSize: sizeConfig.fontSize,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  gradient: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBorder: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  text: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});