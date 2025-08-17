/**
 * Advanced Transition System for smooth screen transitions and route changes
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Animated,
  Dimensions,
  Easing,
  ViewStyle,
  PanGestureHandler,
  State as GestureState,
} from 'react-native';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  ClipPath,
  Circle,
  Path,
} from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export type TransitionType = 
  | 'fade'
  | 'slide'
  | 'scale'
  | 'flip'
  | 'cube'
  | 'wipe'
  | 'spiral'
  | 'liquid'
  | 'particle'
  | 'shatter'
  | 'ripple'
  | 'morph';

export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

interface TransitionConfig {
  type: TransitionType;
  direction?: TransitionDirection;
  duration?: number;
  easing?: (value: number) => number;
  delay?: number;
}

interface ScreenTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  config: TransitionConfig;
  onTransitionStart?: () => void;
  onTransitionEnd?: () => void;
  style?: ViewStyle;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  children,
  isVisible,
  config,
  onTransitionStart,
  onTransitionEnd,
  style,
}) => {
  const transitionAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const [lastVisible, setLastVisible] = useState(isVisible);
  
  useEffect(() => {
    if (isVisible !== lastVisible) {
      setLastVisible(isVisible);
      
      if (onTransitionStart) onTransitionStart();
      
      Animated.timing(transitionAnim, {
        toValue: isVisible ? 1 : 0,
        duration: config.duration || 300,
        easing: config.easing || Easing.out(Easing.cubic),
        delay: config.delay || 0,
        useNativeDriver: false,
      }).start(() => {
        if (onTransitionEnd) onTransitionEnd();
      });
    }
  }, [isVisible, lastVisible, config, onTransitionStart, onTransitionEnd]);
  
  const getTransitionStyle = (): ViewStyle => {
    const { type, direction = 'right' } = config;
    
    switch (type) {
      case 'fade':
        return {
          opacity: transitionAnim,
        };
        
      case 'slide':
        const translateMap = {
          left: { translateX: transitionAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-screenWidth, 0],
          }) },
          right: { translateX: transitionAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [screenWidth, 0],
          }) },
          up: { translateY: transitionAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-screenHeight, 0],
          }) },
          down: { translateY: transitionAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [screenHeight, 0],
          }) },
        };
        return {
          transform: [translateMap[direction]],
        };
        
      case 'scale':
        return {
          transform: [{
            scale: transitionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            }),
          }],
          opacity: transitionAnim,
        };
        
      case 'flip':
        return {
          transform: [{
            rotateY: transitionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['90deg', '0deg'],
            }),
          }],
        };
        
      case 'cube':
        const perspective = 1000;
        return {
          transform: [
            { perspective },
            {
              rotateY: transitionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['90deg', '0deg'],
              }),
            },
            {
              translateX: transitionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [screenWidth / 2, 0],
              }),
            },
          ],
        };
        
      default:
        return {
          opacity: transitionAnim,
        };
    }
  };
  
  const renderWipeTransition = () => {
    if (config.type !== 'wipe') return null;
    
    const clipWidth = transitionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, screenWidth],
    });
    
    return (
      <Svg
        style={{ position: 'absolute', top: 0, left: 0 }}
        width={screenWidth}
        height={screenHeight}
      >
        <Defs>
          <ClipPath id="wipeClip">
            <Animated.Rect
              x={0}
              y={0}
              width={clipWidth}
              height={screenHeight}
            />
          </ClipPath>
        </Defs>
        <View style={{ clipPath: 'url(#wipeClip)' }}>
          {children}
        </View>
      </Svg>
    );
  };
  
  const renderSpiralTransition = () => {
    if (config.type !== 'spiral') return null;
    
    const rotation = transitionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    const scale = transitionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    return (
      <Animated.View
        style={{
          transform: [
            { rotate: rotation },
            { scale },
          ],
        }}
      >
        {children}
      </Animated.View>
    );
  };
  
  const renderLiquidTransition = () => {
    if (config.type !== 'liquid') return null;
    
    const morphPath = transitionAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [
        `M 0 0 Q ${screenWidth/2} ${screenHeight} ${screenWidth} 0 L ${screenWidth} ${screenHeight} L 0 ${screenHeight} Z`,
        `M 0 0 Q ${screenWidth/2} ${screenHeight/2} ${screenWidth} 0 L ${screenWidth} ${screenHeight} L 0 ${screenHeight} Z`,
        `M 0 0 L ${screenWidth} 0 L ${screenWidth} ${screenHeight} L 0 ${screenHeight} Z`,
      ],
    });
    
    return (
      <Svg
        style={{ position: 'absolute', top: 0, left: 0 }}
        width={screenWidth}
        height={screenHeight}
      >
        <Defs>
          <ClipPath id="liquidClip">
            <Animated.Path d={morphPath} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#liquidClip)">
          {children}
        </G>
      </Svg>
    );
  };
  
  const renderRippleTransition = () => {
    if (config.type !== 'ripple') return null;
    
    const rippleRadius = transitionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.max(screenWidth, screenHeight) * 1.2],
    });
    
    return (
      <Svg
        style={{ position: 'absolute', top: 0, left: 0 }}
        width={screenWidth}
        height={screenHeight}
      >
        <Defs>
          <ClipPath id="rippleClip">
            <Animated.Circle
              cx={screenWidth / 2}
              cy={screenHeight / 2}
              r={rippleRadius}
            />
          </ClipPath>
        </Defs>
        <G clipPath="url(#rippleClip)">
          {children}
        </G>
      </Svg>
    );
  };
  
  if (config.type === 'wipe') {
    return (
      <View style={[{ flex: 1 }, style]}>
        {renderWipeTransition()}
      </View>
    );
  }
  
  if (config.type === 'spiral') {
    return (
      <View style={[{ flex: 1 }, style]}>
        {renderSpiralTransition()}
      </View>
    );
  }
  
  if (config.type === 'liquid') {
    return (
      <View style={[{ flex: 1 }, style]}>
        {renderLiquidTransition()}
      </View>
    );
  }
  
  if (config.type === 'ripple') {
    return (
      <View style={[{ flex: 1 }, style]}>
        {renderRippleTransition()}
      </View>
    );
  }
  
  return (
    <Animated.View style={[{ flex: 1 }, getTransitionStyle(), style]}>
      {children}
    </Animated.View>
  );
};

// ==================== SWIPEABLE SCREEN NAVIGATOR ====================

interface SwipeableScreenNavigatorProps {
  screens: React.ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  transitionConfig?: TransitionConfig;
  swipeThreshold?: number;
  style?: ViewStyle;
}

export const SwipeableScreenNavigator: React.FC<SwipeableScreenNavigatorProps> = ({
  screens,
  currentIndex,
  onIndexChange,
  transitionConfig = { type: 'slide', direction: 'right' },
  swipeThreshold = 100,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureHandler = useRef(null);
  
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );
  
  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === GestureState.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      if (Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > 500) {
        const direction = translationX > 0 ? 'right' : 'left';
        let newIndex = currentIndex;
        
        if (direction === 'right' && currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else if (direction === 'left' && currentIndex < screens.length - 1) {
          newIndex = currentIndex + 1;
        }
        
        if (newIndex !== currentIndex) {
          onIndexChange(newIndex);
        }
      }
      
      // Spring back to position
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };
  
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <PanGestureHandler
        ref={gestureHandler}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={{
            flex: 1,
            flexDirection: 'row',
            width: screenWidth * screens.length,
            transform: [
              { translateX: translateX },
              {
                translateX: Animated.multiply(
                  new Animated.Value(-currentIndex),
                  new Animated.Value(screenWidth)
                ),
              },
            ],
          }}
        >
          {screens.map((screen, index) => (
            <View key={index} style={{ width: screenWidth, flex: 1 }}>
              {screen}
            </View>
          ))}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// ==================== PAGE TRANSITION MANAGER ====================

interface PageTransitionManagerProps {
  children: React.ReactNode;
  routeKey: string;
  transitionConfig: TransitionConfig;
}

export const PageTransitionManager: React.FC<PageTransitionManagerProps> = ({
  children,
  routeKey,
  transitionConfig,
}) => {
  const [currentRoute, setCurrentRoute] = useState(routeKey);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    if (routeKey !== currentRoute) {
      setIsTransitioning(true);
    }
  }, [routeKey, currentRoute]);
  
  const handleTransitionEnd = () => {
    setIsTransitioning(false);
    setCurrentRoute(routeKey);
  };
  
  return (
    <ScreenTransition
      isVisible={!isTransitioning}
      config={transitionConfig}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </ScreenTransition>
  );
};

// ==================== PARALLAX TRANSITION EFFECT ====================

interface ParallaxTransitionProps {
  children: React.ReactNode[];
  scrollY: Animated.Value;
  speed?: number;
  style?: ViewStyle;
}

export const ParallaxTransition: React.FC<ParallaxTransitionProps> = ({
  children,
  scrollY,
  speed = 0.5,
  style,
}) => {
  return (
    <View style={[{ flex: 1 }, style]}>
      {children.map((child, index) => {
        const translateY = scrollY.interpolate({
          inputRange: [0, screenHeight],
          outputRange: [0, -screenHeight * speed * (index + 1)],
          extrapolate: 'clamp',
        });
        
        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY }],
            }}
          >
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
};

// ==================== MORPHING CONTAINER ====================

interface MorphingContainerProps {
  children: React.ReactNode;
  morphProgress: Animated.Value;
  fromShape: 'circle' | 'square' | 'rounded';
  toShape: 'circle' | 'square' | 'rounded';
  style?: ViewStyle;
}

export const MorphingContainer: React.FC<MorphingContainerProps> = ({
  children,
  morphProgress,
  fromShape,
  toShape,
  style,
}) => {
  const getBorderRadius = () => {
    const shapeMap = {
      circle: 1000,
      rounded: 16,
      square: 0,
    };
    
    return morphProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [shapeMap[fromShape], shapeMap[toShape]],
    });
  };
  
  return (
    <Animated.View
      style={[
        {
          borderRadius: getBorderRadius(),
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default {
  ScreenTransition,
  SwipeableScreenNavigator,
  PageTransitionManager,
  ParallaxTransition,
  MorphingContainer,
};