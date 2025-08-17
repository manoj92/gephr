/**
 * Advanced Card Component with sophisticated animations and interactive effects
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Dimensions,
  ViewStyle,
  Easing,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Rect, 
  Filter, 
  FeGaussianBlur,
  FeMorphology,
  FeFlood,
  FeComposite,
  FeOffset
} from 'react-native-svg';
import { useAnimatedValue, usePulse } from '../animations/AnimationLibrary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AdvancedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'neon' | 'gradient' | 'holographic';
  interactive?: boolean;
  floatingEffect?: boolean;
  tiltOnHover?: boolean;
  parallaxEffect?: boolean;
  magneticEffect?: boolean;
  glowOnHover?: boolean;
  rippleOnPress?: boolean;
  morphOnPress?: boolean;
  elasticBorder?: boolean;
  particleTrail?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  animationDuration?: number;
}

export const AdvancedCard: React.FC<AdvancedCardProps> = ({
  children,
  variant = 'default',
  interactive = true,
  floatingEffect = false,
  tiltOnHover = false,
  parallaxEffect = false,
  magneticEffect = false,
  glowOnHover = false,
  rippleOnPress = true,
  morphOnPress = false,
  elasticBorder = false,
  particleTrail = false,
  onPress,
  onLongPress,
  style,
  animationDuration = 300,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation values
  const scaleAnim = useAnimatedValue(1);
  const rotateXAnim = useAnimatedValue(0);
  const rotateYAnim = useAnimatedValue(0);
  const translateXAnim = useAnimatedValue(0);
  const translateYAnim = useAnimatedValue(0);
  const shadowOpacityAnim = useAnimatedValue(0.2);
  const shadowRadiusAnim = useAnimatedValue(8);
  const glowOpacityAnim = useAnimatedValue(0);
  const rippleAnim = useAnimatedValue(0);
  const morphAnim = useAnimatedValue(0);
  const borderWidthAnim = useAnimatedValue(1);
  const floatAnim = usePulse(3000, 1.02);
  
  const ripples = useRef<{ x: number; y: number; anim: Animated.Value }[]>([]);
  const particles = useRef<{ x: Animated.Value; y: Animated.Value; opacity: Animated.Value }[]>([]);
  
  // Pan responder for touch interactions
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive,
      onMoveShouldSetPanResponder: () => interactive,
      
      onPanResponderGrant: (evt) => {
        setIsPressed(true);
        handlePressIn(evt);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        if (tiltOnHover || parallaxEffect) {
          handleMouseMove(evt, gestureState);
        }
        
        if (magneticEffect) {
          handleMagneticEffect(evt, gestureState);
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        setIsPressed(false);
        handlePressOut();
        
        // Check if it's a tap (not a pan)
        if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          if (onPress) onPress();
        }
      },
    })
  ).current;
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          backdropFilter: 'blur(20px)',
        };
      case 'neon':
        return {
          backgroundColor: 'rgba(0, 229, 255, 0.05)',
          borderColor: '#00E5FF',
          borderWidth: 1,
          shadowColor: '#00E5FF',
        };
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'holographic':
        return {
          backgroundColor: 'transparent',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: '#1A1A1A',
          borderColor: '#333333',
          borderWidth: 1,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  const handlePressIn = (evt: any) => {
    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    // Shadow animation
    Animated.parallel([
      Animated.timing(shadowOpacityAnim, {
        toValue: 0.4,
        duration: animationDuration,
        useNativeDriver: false,
      }),
      Animated.timing(shadowRadiusAnim, {
        toValue: 16,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ]).start();
    
    // Glow effect
    if (glowOnHover) {
      Animated.timing(glowOpacityAnim, {
        toValue: 0.6,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    }
    
    // Ripple effect
    if (rippleOnPress && evt.nativeEvent) {
      const { locationX, locationY } = evt.nativeEvent;
      createRipple(locationX || 0, locationY || 0);
    }
    
    // Morph effect
    if (morphOnPress) {
      Animated.timing(morphAnim, {
        toValue: 1,
        duration: animationDuration,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      }).start();
    }
    
    // Elastic border
    if (elasticBorder) {
      Animated.spring(borderWidthAnim, {
        toValue: 3,
        tension: 200,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }
    
    // Particle trail
    if (particleTrail && evt.nativeEvent) {
      const { locationX, locationY } = evt.nativeEvent;
      createParticles(locationX || 0, locationY || 0);
    }
  };
  
  const handlePressOut = () => {
    // Scale back
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    // Shadow back
    Animated.parallel([
      Animated.timing(shadowOpacityAnim, {
        toValue: 0.2,
        duration: animationDuration,
        useNativeDriver: false,
      }),
      Animated.timing(shadowRadiusAnim, {
        toValue: 8,
        duration: animationDuration,
        useNativeDriver: false,
      }),
    ]).start();
    
    // Glow back
    if (glowOnHover) {
      Animated.timing(glowOpacityAnim, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    }
    
    // Tilt back to center
    if (tiltOnHover) {
      Animated.parallel([
        Animated.spring(rotateXAnim, {
          toValue: 0,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(rotateYAnim, {
          toValue: 0,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Parallax back
    if (parallaxEffect) {
      Animated.parallel([
        Animated.spring(translateXAnim, {
          toValue: 0,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Morph back
    if (morphOnPress) {
      Animated.timing(morphAnim, {
        toValue: 0,
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    
    // Border back
    if (elasticBorder) {
      Animated.spring(borderWidthAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }
  };
  
  const handleMouseMove = (evt: any, gestureState: any) => {
    const { dx, dy } = gestureState;
    const maxTilt = 15;
    const maxParallax = 10;
    
    if (tiltOnHover) {
      const rotateX = (dy / 100) * maxTilt;
      const rotateY = -(dx / 100) * maxTilt;
      
      rotateXAnim.setValue(rotateX);
      rotateYAnim.setValue(rotateY);
    }
    
    if (parallaxEffect) {
      const parallaxX = (dx / 100) * maxParallax;
      const parallaxY = (dy / 100) * maxParallax;
      
      translateXAnim.setValue(parallaxX);
      translateYAnim.setValue(parallaxY);
    }
  };
  
  const handleMagneticEffect = (evt: any, gestureState: any) => {
    const { dx, dy } = gestureState;
    const magneticStrength = 0.3;
    
    Animated.parallel([
      Animated.spring(translateXAnim, {
        toValue: dx * magneticStrength,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: dy * magneticStrength,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const createRipple = (x: number, y: number) => {
    const newRipple = {
      x,
      y,
      anim: new Animated.Value(0),
    };
    
    ripples.current.push(newRipple);
    
    Animated.timing(newRipple.anim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      ripples.current = ripples.current.filter(r => r !== newRipple);
    });
  };
  
  const createParticles = (x: number, y: number) => {
    for (let i = 0; i < 5; i++) {
      const particle = {
        x: new Animated.Value(x),
        y: new Animated.Value(y),
        opacity: new Animated.Value(1),
      };
      
      particles.current.push(particle);
      
      const angle = (Math.PI * 2 * i) / 5;
      const distance = 50 + Math.random() * 50;
      
      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: x + Math.cos(angle) * distance,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(particle.y, {
          toValue: y + Math.sin(angle) * distance,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        particles.current = particles.current.filter(p => p !== particle);
      });
    }
  };
  
  const renderGradientBackground = () => {
    if (variant !== 'gradient' && variant !== 'holographic') return null;
    
    return (
      <Svg
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        width="100%"
        height="100%"
      >
        <Defs>
          <LinearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {variant === 'gradient' ? (
              <>
                <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.1" />
                <Stop offset="50%" stopColor="#1A1A1A" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#00C896" stopOpacity="0.1" />
              </>
            ) : (
              <>
                <Stop offset="0%" stopColor="#FF00FF" stopOpacity="0.1" />
                <Stop offset="25%" stopColor="#00FFFF" stopOpacity="0.1" />
                <Stop offset="50%" stopColor="#FFFF00" stopOpacity="0.1" />
                <Stop offset="75%" stopColor="#FF0080" stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#8000FF" stopOpacity="0.1" />
              </>
            )}
          </LinearGradient>
          <Filter id="glow">
            <FeGaussianBlur stdDeviation="3" result="coloredBlur"/>
          </Filter>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="url(#cardGradient)"
          rx={16}
          filter="url(#glow)"
        />
      </Svg>
    );
  };
  
  const renderGlowEffect = () => {
    if (!glowOnHover && variant !== 'neon') return null;
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
          borderRadius: 20,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: '#00E5FF',
          opacity: glowOpacityAnim,
        }}
      />
    );
  };
  
  const renderRipples = () => {
    return ripples.current.map((ripple, index) => {
      const scale = ripple.anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 4],
      });
      
      const opacity = ripple.anim.interpolate({
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
            backgroundColor: '#00E5FF',
            left: ripple.x - 10,
            top: ripple.y - 10,
            transform: [{ scale }],
            opacity,
          }}
        />
      );
    });
  };
  
  const renderParticles = () => {
    return particles.current.map((particle, index) => (
      <Animated.View
        key={index}
        style={{
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#00E5FF',
          left: particle.x,
          top: particle.y,
          opacity: particle.opacity,
        }}
      />
    ));
  };
  
  const borderRadius = morphOnPress
    ? morphAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [16, 32],
      })
    : 16;
  
  const borderWidth = elasticBorder ? borderWidthAnim : variantStyles.borderWidth;
  
  return (
    <TouchableWithoutFeedback onLongPress={onLongPress}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 16,
            shadowColor: variantStyles.shadowColor || '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: shadowOpacityAnim,
            shadowRadius: shadowRadiusAnim,
            elevation: 8,
          },
          {
            transform: [
              { scale: floatingEffect ? floatAnim : scaleAnim },
              { rotateX: rotateXAnim.interpolate({
                inputRange: [-100, 100],
                outputRange: ['-15deg', '15deg'],
              }) },
              { rotateY: rotateYAnim.interpolate({
                inputRange: [-100, 100],
                outputRange: ['-15deg', '15deg'],
              }) },
              { translateX: translateXAnim },
              { translateY: translateYAnim },
            ],
          },
          style,
        ]}
      >
        <Animated.View
          style={{
            backgroundColor: variantStyles.backgroundColor,
            borderColor: variantStyles.borderColor,
            borderWidth: borderWidth,
            borderRadius: borderRadius,
            padding: 20,
            minHeight: 100,
          }}
        >
          {renderGradientBackground()}
          {renderGlowEffect()}
          {renderRipples()}
          {renderParticles()}
          {children}
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default AdvancedCard;