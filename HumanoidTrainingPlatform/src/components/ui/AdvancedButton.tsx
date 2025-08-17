/**
 * Advanced Button Component with sophisticated animations and effects
 */

import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Animated,
  Dimensions,
  ViewStyle,
  TextStyle,
  Easing,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useAnimatedValue, usePulse } from '../animations/AnimationLibrary';

const { width: screenWidth } = Dimensions.get('window');

interface AdvancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  hapticFeedback?: boolean;
  glowEffect?: boolean;
  liquidEffect?: boolean;
  morphOnPress?: boolean;
  rippleEffect?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AdvancedButton: React.FC<AdvancedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  hapticFeedback = true,
  glowEffect = false,
  liquidEffect = false,
  morphOnPress = false,
  rippleEffect = true,
  style,
  textStyle,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useAnimatedValue(1);
  const rotateAnim = useAnimatedValue(0);
  const rippleAnim = useAnimatedValue(0);
  const glowAnim = usePulse(2000, 1.05);
  const liquidAnim = useAnimatedValue(0);
  const morphAnim = useAnimatedValue(0);
  
  const ripples = useRef<Animated.Value[]>([]);
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#00E5FF',
          borderColor: '#00E5FF',
          textColor: '#0A0A0A',
          shadowColor: '#00E5FF',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: '#00E5FF',
          textColor: '#00E5FF',
          shadowColor: '#00E5FF',
        };
      case 'danger':
        return {
          backgroundColor: '#FF4444',
          borderColor: '#FF4444',
          textColor: '#FFFFFF',
          shadowColor: '#FF4444',
        };
      case 'ghost':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          textColor: '#FFFFFF',
          shadowColor: '#FFFFFF',
        };
      case 'neon':
        return {
          backgroundColor: 'transparent',
          borderColor: '#00E5FF',
          textColor: '#00E5FF',
          shadowColor: '#00E5FF',
        };
      default:
        return {
          backgroundColor: '#00E5FF',
          borderColor: '#00E5FF',
          textColor: '#0A0A0A',
          shadowColor: '#00E5FF',
        };
    }
  };
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 8,
          fontSize: 12,
          iconSize: 16,
        };
      case 'medium':
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          fontSize: 14,
          iconSize: 20,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 16,
          fontSize: 16,
          iconSize: 24,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          fontSize: 14,
          iconSize: 20,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  
  const handlePressIn = () => {
    setIsPressed(true);
    
    if (hapticFeedback) {
      Vibration.vibrate(10);
    }
    
    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    // Morph animation
    if (morphOnPress) {
      Animated.timing(morphAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    
    // Liquid effect
    if (liquidEffect) {
      Animated.timing(liquidAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    
    // Ripple effect
    if (rippleEffect) {
      const newRipple = new Animated.Value(0);
      ripples.current.push(newRipple);
      
      Animated.timing(newRipple, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        ripples.current = ripples.current.filter(r => r !== newRipple);
      });
    }
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    
    // Scale back
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    // Morph back
    if (morphOnPress) {
      Animated.timing(morphAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    
    // Liquid back
    if (liquidEffect) {
      Animated.timing(liquidAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  };
  
  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };
  
  // Loading rotation animation
  React.useEffect(() => {
    if (loading) {
      const rotate = () => {
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          rotateAnim.setValue(0);
          if (loading) rotate();
        });
      };
      rotate();
    }
  }, [loading, rotateAnim]);
  
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const liquidHeight = liquidAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  const morphBorderRadius = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [sizeStyles.borderRadius, sizeStyles.borderRadius * 2],
  });
  
  const renderRipples = () => {
    return ripples.current.map((ripple, index) => {
      const scale = ripple.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 4],
      });
      
      const opacity = ripple.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.6, 0.3, 0],
      });
      
      return (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: variantStyles.textColor,
            transform: [{ scale }],
            opacity,
            top: '50%',
            left: '50%',
            marginTop: -10,
            marginLeft: -10,
          }}
        />
      );
    });
  };
  
  const renderNeonGlow = () => {
    if (!glowEffect && variant !== 'neon') return null;
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
          borderRadius: sizeStyles.borderRadius + 4,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: variantStyles.shadowColor,
          opacity: 0.3,
          transform: [{ scale: glowAnim }],
        }}
      />
    );
  };
  
  const renderLiquidEffect = () => {
    if (!liquidEffect) return null;
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: liquidHeight,
          backgroundColor: `${variantStyles.backgroundColor}80`,
          borderBottomLeftRadius: sizeStyles.borderRadius,
          borderBottomRightRadius: sizeStyles.borderRadius,
        }}
      />
    );
  };
  
  const renderIcon = () => {
    if (!icon) return null;
    
    if (loading) {
      return (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons
            name="refresh"
            size={sizeStyles.iconSize}
            color={variantStyles.textColor}
          />
        </Animated.View>
      );
    }
    
    return (
      <Ionicons
        name={icon as any}
        size={sizeStyles.iconSize}
        color={variantStyles.textColor}
      />
    );
  };
  
  const renderGradientBackground = () => {
    if (variant !== 'neon') return null;
    
    return (
      <Svg
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        width="100%"
        height="100%"
      >
        <Defs>
          <LinearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.2" />
            <Stop offset="50%" stopColor="#00E5FF" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#00E5FF" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="url(#neonGradient)"
          rx={sizeStyles.borderRadius}
        />
      </Svg>
    );
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[
        {
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            backgroundColor: variantStyles.backgroundColor,
            borderWidth: variant === 'secondary' || variant === 'ghost' || variant === 'neon' ? 2 : 0,
            borderColor: variantStyles.borderColor,
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderRadius: morphOnPress ? morphBorderRadius : sizeStyles.borderRadius,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            shadowColor: variantStyles.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: variant === 'neon' ? 0.6 : 0.3,
            shadowRadius: variant === 'neon' ? 12 : 8,
            elevation: variant === 'neon' ? 12 : 8,
          },
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {renderGradientBackground()}
        {renderNeonGlow()}
        {renderLiquidEffect()}
        {renderRipples()}
        
        {iconPosition === 'left' && icon && (
          <View style={{ marginRight: 8 }}>
            {renderIcon()}
          </View>
        )}
        
        <Text
          style={[
            {
              color: variantStyles.textColor,
              fontSize: sizeStyles.fontSize,
              fontWeight: '600',
              textAlign: 'center',
            },
            textStyle,
          ]}
        >
          {loading ? 'Loading...' : title}
        </Text>
        
        {iconPosition === 'right' && icon && (
          <View style={{ marginLeft: 8 }}>
            {renderIcon()}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default AdvancedButton;