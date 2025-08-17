/**
 * Advanced Animation Library for Humanoid Training Platform
 * Provides sophisticated animations, transitions, and effects
 */

import React, { useRef, useEffect } from 'react';
import { 
  Animated, 
  Easing, 
  Dimensions, 
  View, 
  ViewStyle,
  PanGestureHandler,
  State as GestureState
} from 'react-native';
import Svg, { 
  Circle, 
  Path, 
  G, 
  Defs, 
  LinearGradient, 
  Stop, 
  Filter, 
  FeGaussianBlur 
} from 'react-native-svg';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==================== CUSTOM HOOKS ====================

export const useAnimatedValue = (initialValue: number = 0) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  return animatedValue;
};

export const useFadeIn = (duration: number = 1000, delay: number = 0) => {
  const fadeAnim = useAnimatedValue(0);
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);
  
  return fadeAnim;
};

export const useSlideIn = (direction: 'left' | 'right' | 'up' | 'down' = 'up', duration: number = 800) => {
  const slideAnim = useAnimatedValue(0);
  
  const getInitialValue = () => {
    switch (direction) {
      case 'left': return -screenWidth;
      case 'right': return screenWidth;
      case 'up': return screenHeight;
      case 'down': return -screenHeight;
    }
  };
  
  useEffect(() => {
    slideAnim.setValue(getInitialValue());
    Animated.timing(slideAnim, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, direction, duration]);
  
  return slideAnim;
};

export const useSpring = (toValue: number, config?: Partial<Animated.SpringAnimationConfig>) => {
  const springAnim = useAnimatedValue(0);
  
  useEffect(() => {
    Animated.spring(springAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
      ...config,
    }).start();
  }, [springAnim, toValue, config]);
  
  return springAnim;
};

export const usePulse = (duration: number = 1000, intensity: number = 1.1) => {
  const pulseAnim = useAnimatedValue(1);
  
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: intensity,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim, duration, intensity]);
  
  return pulseAnim;
};

export const useRotate = (duration: number = 2000) => {
  const rotateAnim = useAnimatedValue(0);
  
  useEffect(() => {
    const rotate = () => {
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => {
        rotateAnim.setValue(0);
        rotate();
      });
    };
    rotate();
  }, [rotateAnim, duration]);
  
  return rotateAnim;
};

// ==================== ANIMATED COMPONENTS ====================

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const FadeInView: React.FC<FadeInViewProps> = ({ 
  children, 
  duration = 1000, 
  delay = 0, 
  style 
}) => {
  const fadeAnim = useFadeIn(duration, delay);
  
  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
};

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  style?: ViewStyle;
}

export const SlideInView: React.FC<SlideInViewProps> = ({ 
  children, 
  direction = 'up', 
  duration = 800, 
  style 
}) => {
  const slideAnim = useSlideIn(direction, duration);
  
  const getTransform = () => {
    switch (direction) {
      case 'left':
      case 'right':
        return [{ translateX: slideAnim }];
      case 'up':
      case 'down':
        return [{ translateY: slideAnim }];
    }
  };
  
  return (
    <Animated.View style={[style, { transform: getTransform() }]}>
      {children}
    </Animated.View>
  );
};

interface PulseViewProps {
  children: React.ReactNode;
  duration?: number;
  intensity?: number;
  style?: ViewStyle;
}

export const PulseView: React.FC<PulseViewProps> = ({ 
  children, 
  duration = 1000, 
  intensity = 1.1, 
  style 
}) => {
  const pulseAnim = usePulse(duration, intensity);
  
  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      {children}
    </Animated.View>
  );
};

interface SpringViewProps {
  children: React.ReactNode;
  scale?: number;
  style?: ViewStyle;
}

export const SpringView: React.FC<SpringViewProps> = ({ 
  children, 
  scale = 1, 
  style 
}) => {
  const springAnim = useSpring(scale);
  
  return (
    <Animated.View style={[style, { transform: [{ scale: springAnim }] }]}>
      {children}
    </Animated.View>
  );
};

// ==================== PARTICLE EFFECTS ====================

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
}

interface ParticleEffectProps {
  particleCount?: number;
  colors?: string[];
  size?: number;
  speed?: number;
}

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  particleCount = 20,
  colors = ['#00E5FF', '#00C896', '#FF6B6B'],
  size = 4,
  speed = 2000
}) => {
  const particles = useRef<Particle[]>([]);
  
  useEffect(() => {
    // Initialize particles
    particles.current = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(Math.random() * screenHeight),
      opacity: new Animated.Value(Math.random()),
      scale: new Animated.Value(Math.random() * 0.5 + 0.5),
    }));
    
    // Animate particles
    const animateParticles = () => {
      particles.current.forEach((particle) => {
        const animations = [
          Animated.timing(particle.x, {
            toValue: Math.random() * screenWidth,
            duration: speed + Math.random() * 1000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: false,
          }),
          Animated.timing(particle.y, {
            toValue: Math.random() * screenHeight,
            duration: speed + Math.random() * 1000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: false,
          }),
          Animated.timing(particle.opacity, {
            toValue: Math.random(),
            duration: speed / 2,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ];
        
        Animated.parallel(animations).start(() => animateParticles());
      });
    };
    
    animateParticles();
  }, [particleCount, speed]);
  
  return (
    <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {particles.current.map((particle, index) => (
        <Animated.View
          key={particle.id}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors[index % colors.length],
            left: particle.x,
            top: particle.y,
            opacity: particle.opacity,
            transform: [{ scale: particle.scale }],
          }}
        />
      ))}
    </View>
  );
};

// ==================== LOADING ANIMATIONS ====================

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  color = '#00E5FF', 
  thickness = 4 
}) => {
  const rotateAnim = useRotate(1500);
  
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={(size - thickness) / 2}
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${Math.PI * (size - thickness)} ${Math.PI * (size - thickness)}`}
          strokeDashoffset={Math.PI * (size - thickness) * 0.75}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

interface WaveLoadingProps {
  width?: number;
  height?: number;
  color?: string;
}

export const WaveLoading: React.FC<WaveLoadingProps> = ({ 
  width = 100, 
  height = 20, 
  color = '#00E5FF' 
}) => {
  const wave1 = useAnimatedValue(0);
  const wave2 = useAnimatedValue(0);
  const wave3 = useAnimatedValue(0);
  
  useEffect(() => {
    const createWave = (anim: Animated.Value, delay: number) => {
      const wave = () => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            delay,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ]).start(() => wave());
      };
      wave();
    };
    
    createWave(wave1, 0);
    createWave(wave2, 200);
    createWave(wave3, 400);
  }, [wave1, wave2, wave3]);
  
  const getBarHeight = (anim: Animated.Value) => 
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [height * 0.2, height],
    });
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', width, height }}>
      <Animated.View
        style={{
          width: width / 5,
          height: getBarHeight(wave1),
          backgroundColor: color,
          marginRight: width / 20,
          borderRadius: 2,
        }}
      />
      <Animated.View
        style={{
          width: width / 5,
          height: getBarHeight(wave2),
          backgroundColor: color,
          marginRight: width / 20,
          borderRadius: 2,
        }}
      />
      <Animated.View
        style={{
          width: width / 5,
          height: getBarHeight(wave3),
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
    </View>
  );
};

// ==================== GESTURE ANIMATIONS ====================

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  style?: ViewStyle;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  style
}) => {
  const translateX = useAnimatedValue(0);
  const opacity = useAnimatedValue(1);
  const gestureHandler = useRef(null);
  
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );
  
  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === GestureState.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      if (Math.abs(translationX) > threshold || Math.abs(velocityX) > 500) {
        const direction = translationX > 0 ? 'right' : 'left';
        const targetX = direction === 'right' ? screenWidth : -screenWidth;
        
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (direction === 'right' && onSwipeRight) {
            onSwipeRight();
          } else if (direction === 'left' && onSwipeLeft) {
            onSwipeLeft();
          }
          
          // Reset position
          translateX.setValue(0);
          opacity.setValue(1);
        });
      } else {
        // Spring back to center
        Animated.spring(translateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };
  
  return (
    <PanGestureHandler
      ref={gestureHandler}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

// ==================== MORPHING SHAPES ====================

interface MorphingBlobProps {
  size?: number;
  color?: string;
  morphDuration?: number;
}

export const MorphingBlob: React.FC<MorphingBlobProps> = ({
  size = 100,
  color = '#00E5FF',
  morphDuration = 3000
}) => {
  const morphAnim = useAnimatedValue(0);
  
  useEffect(() => {
    const morph = () => {
      Animated.sequence([
        Animated.timing(morphAnim, {
          toValue: 1,
          duration: morphDuration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: false,
        }),
        Animated.timing(morphAnim, {
          toValue: 0,
          duration: morphDuration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: false,
        }),
      ]).start(() => morph());
    };
    morph();
  }, [morphAnim, morphDuration]);
  
  const animatedPath = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `M ${size/2} 0 C ${size*0.8} 0 ${size} ${size*0.2} ${size} ${size/2} C ${size} ${size*0.8} ${size*0.8} ${size} ${size/2} ${size} C ${size*0.2} ${size} 0 ${size*0.8} 0 ${size/2} C 0 ${size*0.2} ${size*0.2} 0 ${size/2} 0 Z`,
      `M ${size/2} 0 C ${size*0.9} ${size*0.1} ${size*0.9} ${size*0.3} ${size} ${size/2} C ${size*0.9} ${size*0.7} ${size*0.7} ${size*0.9} ${size/2} ${size} C ${size*0.3} ${size*0.9} ${size*0.1} ${size*0.7} 0 ${size/2} C ${size*0.1} ${size*0.3} ${size*0.1} ${size*0.1} ${size/2} 0 Z`,
    ],
  });
  
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </LinearGradient>
        <Filter id="glow">
          <FeGaussianBlur stdDeviation="3" result="coloredBlur"/>
        </Filter>
      </Defs>
      <Animated.Path
        d={animatedPath}
        fill="url(#blobGradient)"
        filter="url(#glow)"
      />
    </Svg>
  );
};

// ==================== EXPORT ALL ====================

export default {
  // Hooks
  useAnimatedValue,
  useFadeIn,
  useSlideIn,
  useSpring,
  usePulse,
  useRotate,
  
  // Components
  FadeInView,
  SlideInView,
  PulseView,
  SpringView,
  ParticleEffect,
  LoadingSpinner,
  WaveLoading,
  SwipeableCard,
  MorphingBlob,
};