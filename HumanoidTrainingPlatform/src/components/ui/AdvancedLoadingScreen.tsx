/**
 * Advanced Loading Screen with sophisticated animations and visual effects
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  Easing,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import Svg, {
  Circle,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  Filter,
  FeGaussianBlur,
  FeTurbulence,
  FeColorMatrix,
  FeComposite,
} from 'react-native-svg';
import { useAnimatedValue, useRotate, usePulse } from '../animations/AnimationLibrary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AdvancedLoadingScreenProps {
  variant?: 'neural' | 'quantum' | 'matrix' | 'particle' | 'wave' | 'holographic';
  message?: string;
  submessage?: string;
  progress?: number;
  showProgress?: boolean;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  duration?: number;
  style?: ViewStyle;
}

export const AdvancedLoadingScreen: React.FC<AdvancedLoadingScreenProps> = ({
  variant = 'neural',
  message = 'Loading',
  submessage = 'Please wait...',
  progress = 0,
  showProgress = false,
  backgroundColor = '#0A0A0A',
  primaryColor = '#00E5FF',
  secondaryColor = '#00C896',
  duration = 2000,
  style,
}) => {
  const [dots, setDots] = useState('');
  
  // Animation values
  const fadeAnim = useAnimatedValue(0);
  const scaleAnim = useAnimatedValue(0);
  const rotateAnim = useRotate(duration);
  const pulseAnim = usePulse(1000, 1.2);
  const progressAnim = useAnimatedValue(0);
  const waveAnim = useAnimatedValue(0);
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(Math.random() * screenHeight),
      opacity: new Animated.Value(Math.random()),
      scale: new Animated.Value(Math.random() * 0.5 + 0.5),
    }))
  ).current;
  
  // Matrix rain effect
  const matrixColumns = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      y: new Animated.Value(-100),
      opacity: new Animated.Value(0),
      delay: i * 100,
    }))
  ).current;
  
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    
    // Scale in animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
    
    // Progress animation
    if (showProgress) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    
    // Wave animation
    const wave = () => {
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: false,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: false,
        }),
      ]).start(() => wave());
    };
    wave();
    
    // Particle animations
    particleAnims.forEach((particle, index) => {
      const animate = () => {
        Animated.parallel([
          Animated.timing(particle.x, {
            toValue: Math.random() * screenWidth,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: false,
          }),
          Animated.timing(particle.y, {
            toValue: Math.random() * screenHeight,
            duration: 3000 + Math.random() * 2000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: false,
          }),
          Animated.timing(particle.opacity, {
            toValue: Math.random(),
            duration: 2000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ]).start(() => animate());
      };
      setTimeout(() => animate(), index * 200);
    });
    
    // Matrix rain animation
    if (variant === 'matrix') {
      matrixColumns.forEach((column, index) => {
        const rain = () => {
          column.y.setValue(-100);
          column.opacity.setValue(0);
          
          Animated.sequence([
            Animated.timing(column.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(column.y, {
              toValue: screenHeight + 100,
              duration: 2000 + Math.random() * 1000,
              easing: Easing.linear,
              useNativeDriver: false,
            }),
            Animated.timing(column.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => rain());
        };
        setTimeout(() => rain(), column.delay);
      });
    }
  }, [progress, variant]);
  
  // Animated dots for message
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  const renderNeuralNetwork = () => {
    if (variant !== 'neural') return null;
    
    const nodes = Array.from({ length: 8 }, (_, i) => ({
      x: (screenWidth / 9) * (i + 1),
      y: screenHeight / 2 + Math.sin(i) * 50,
      delay: i * 200,
    }));
    
    return (
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.8" />
            <Stop offset="50%" stopColor={secondaryColor} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.8" />
          </LinearGradient>
          <Filter id="glow">
            <FeGaussianBlur stdDeviation="3" result="coloredBlur"/>
          </Filter>
        </Defs>
        
        {/* Connections */}
        {nodes.map((node, i) => 
          i < nodes.length - 1 ? (
            <Animated.Path
              key={i}
              d={`M ${node.x} ${node.y} L ${nodes[i + 1].x} ${nodes[i + 1].y}`}
              stroke="url(#neuralGradient)"
              strokeWidth="2"
              opacity={pulseAnim}
              filter="url(#glow)"
            />
          ) : null
        )}
        
        {/* Nodes */}
        {nodes.map((node, i) => (
          <Animated.Circle
            key={i}
            cx={node.x}
            cy={node.y}
            r="8"
            fill={primaryColor}
            opacity={pulseAnim}
            filter="url(#glow)"
          />
        ))}
      </Svg>
    );
  };
  
  const renderQuantumField = () => {
    if (variant !== 'quantum') return null;
    
    const rotation = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ rotate: rotation }] },
        ]}
      >
        <Svg width={screenWidth} height={screenHeight}>
          <Defs>
            <RadialGradient id="quantumGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.8" />
              <Stop offset="50%" stopColor={secondaryColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          
          {Array.from({ length: 6 }, (_, i) => (
            <Circle
              key={i}
              cx={screenWidth / 2}
              cy={screenHeight / 2}
              r={50 + i * 30}
              fill="none"
              stroke="url(#quantumGradient)"
              strokeWidth="2"
              strokeDasharray={`${10 + i * 5} ${5 + i * 2}`}
            />
          ))}
        </Svg>
      </Animated.View>
    );
  };
  
  const renderMatrixRain = () => {
    if (variant !== 'matrix') return null;
    
    return (
      <View style={StyleSheet.absoluteFillObject}>
        {matrixColumns.map((column, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              left: (screenWidth / 20) * i,
              top: column.y,
              color: primaryColor,
              fontSize: 16,
              fontFamily: 'monospace',
              opacity: column.opacity,
            }}
          >
            {String.fromCharCode(65 + Math.random() * 26)}
          </Animated.Text>
        ))}
      </View>
    );
  };
  
  const renderParticleField = () => {
    if (variant !== 'particle') return null;
    
    return (
      <View style={StyleSheet.absoluteFillObject}>
        {particleAnims.map((particle, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
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
  
  const renderWaveForm = () => {
    if (variant !== 'wave') return null;
    
    const waveHeight = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 80],
    });
    
    return (
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' }}>
          {Array.from({ length: 20 }, (_, i) => (
            <Animated.View
              key={i}
              style={{
                width: 4,
                height: waveHeight,
                backgroundColor: primaryColor,
                marginHorizontal: 2,
                borderRadius: 2,
                transform: [
                  {
                    scaleY: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2 + Math.sin(i * 0.5) * 0.3, 1 + Math.sin(i * 0.5) * 0.5],
                    }),
                  },
                ],
              }}
            />
          ))}
        </View>
      </View>
    );
  };
  
  const renderHolographicGrid = () => {
    if (variant !== 'holographic') return null;
    
    return (
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="holoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF00FF" stopOpacity="0.6" />
            <Stop offset="25%" stopColor="#00FFFF" stopOpacity="0.6" />
            <Stop offset="50%" stopColor="#FFFF00" stopOpacity="0.6" />
            <Stop offset="75%" stopColor="#FF0080" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#8000FF" stopOpacity="0.6" />
          </LinearGradient>
          <FeTurbulence
            baseFrequency="0.02"
            numOctaves="3"
            result="noise"
          />
          <FeColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="desaturatedNoise"
          />
        </Defs>
        
        {/* Grid lines */}
        {Array.from({ length: 10 }, (_, i) => (
          <G key={i}>
            <Path
              d={`M 0 ${(screenHeight / 10) * i} L ${screenWidth} ${(screenHeight / 10) * i}`}
              stroke="url(#holoGradient)"
              strokeWidth="1"
              opacity="0.3"
            />
            <Path
              d={`M ${(screenWidth / 10) * i} 0 L ${(screenWidth / 10) * i} ${screenHeight}`}
              stroke="url(#holoGradient)"
              strokeWidth="1"
              opacity="0.3"
            />
          </G>
        ))}
      </Svg>
    );
  };
  
  const renderProgressBar = () => {
    if (!showProgress) return null;
    
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: [0, screenWidth - 80],
      extrapolate: 'clamp',
    });
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth, backgroundColor: primaryColor },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: primaryColor }]}>
          {Math.round(progress)}%
        </Text>
      </View>
    );
  };
  
  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor, opacity: fadeAnim },
        style,
      ]}
    >
      {renderNeuralNetwork()}
      {renderQuantumField()}
      {renderMatrixRain()}
      {renderParticleField()}
      {renderWaveForm()}
      {renderHolographicGrid()}
      
      <Animated.View
        style={[
          styles.contentContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Svg width={80} height={80}>
            <Defs>
              <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={primaryColor} />
                <Stop offset="100%" stopColor={secondaryColor} />
              </LinearGradient>
            </Defs>
            <Circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="url(#logoGradient)"
              strokeWidth="4"
              strokeDasharray="110 110"
              strokeDashoffset="55"
            />
            <Circle
              cx="40"
              cy="40"
              r="20"
              fill="url(#logoGradient)"
              opacity="0.6"
            />
          </Svg>
        </Animated.View>
        
        <Text style={[styles.message, { color: primaryColor }]}>
          {message}{dots}
        </Text>
        
        {submessage && (
          <Text style={[styles.submessage, { color: secondaryColor }]}>
            {submessage}
          </Text>
        )}
        
        {renderProgressBar()}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 40,
  },
  message: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressContainer: {
    width: screenWidth - 80,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdvancedLoadingScreen;