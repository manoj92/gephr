/**
 * Advanced Gesture-based Interaction System with sophisticated animations
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
  ViewStyle,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  State as GestureState,
} from 'react-native';
import {
  PanGestureHandlerGestureEvent,
  PinchGestureHandlerGestureEvent,
  RotationGestureHandlerGestureEvent,
  TapGestureHandlerGestureEvent,
  LongPressGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==================== DRAGGABLE COMPONENT ====================

interface DraggableProps {
  children: React.ReactNode;
  onDrag?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  bounds?: { minX?: number; maxX?: number; minY?: number; maxY?: number };
  magneticTargets?: { x: number; y: number; radius: number }[];
  elasticReturn?: boolean;
  momentum?: boolean;
  hapticFeedback?: boolean;
  style?: ViewStyle;
}

export const Draggable: React.FC<DraggableProps> = ({
  children,
  onDrag,
  onDragEnd,
  bounds,
  magneticTargets = [],
  elasticReturn = false,
  momentum = true,
  hapticFeedback = false,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  
  const [isDragging, setIsDragging] = useState(false);
  const lastGesture = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  
  const panGestureRef = useRef(null);
  
  const applyBounds = (x: number, y: number) => {
    let boundedX = x;
    let boundedY = y;
    
    if (bounds) {
      if (bounds.minX !== undefined) boundedX = Math.max(bounds.minX, boundedX);
      if (bounds.maxX !== undefined) boundedX = Math.min(bounds.maxX, boundedX);
      if (bounds.minY !== undefined) boundedY = Math.max(bounds.minY, boundedY);
      if (bounds.maxY !== undefined) boundedY = Math.min(bounds.maxY, boundedY);
    }
    
    return { x: boundedX, y: boundedY };
  };
  
  const findNearestMagneticTarget = (x: number, y: number) => {
    for (const target of magneticTargets) {
      const distance = Math.sqrt(
        Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)
      );
      if (distance <= target.radius) {
        return target;
      }
    }
    return null;
  };
  
  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    {
      useNativeDriver: false,
      listener: (event: PanGestureHandlerGestureEvent) => {
        const { translationX, translationY } = event.nativeEvent;
        const bounded = applyBounds(translationX, translationY);
        
        if (onDrag) {
          onDrag(bounded.x, bounded.y);
        }
        
        lastGesture.current = {
          x: bounded.x,
          y: bounded.y,
          vx: event.nativeEvent.velocityX,
          vy: event.nativeEvent.velocityY,
        };
      },
    }
  );
  
  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    switch (event.nativeEvent.state) {
      case GestureState.BEGAN:
        setIsDragging(true);
        
        // Scale up slightly when dragging starts
        Animated.spring(scale, {
          toValue: 1.05,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }).start();
        
        if (hapticFeedback) {
          // Vibration.vibrate(10);
        }
        break;
        
      case GestureState.END:
      case GestureState.CANCELLED:
        setIsDragging(false);
        
        // Scale back to normal
        Animated.spring(scale, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }).start();
        
        const { x, y, vx, vy } = lastGesture.current;
        
        // Check for magnetic targets
        const magneticTarget = findNearestMagneticTarget(x, y);
        if (magneticTarget) {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: magneticTarget.x,
              tension: 200,
              friction: 10,
              useNativeDriver: false,
            }),
            Animated.spring(translateY, {
              toValue: magneticTarget.y,
              tension: 200,
              friction: 10,
              useNativeDriver: false,
            }),
          ]).start();
          
          if (onDragEnd) {
            onDragEnd(magneticTarget.x, magneticTarget.y);
          }
          return;
        }
        
        // Apply momentum if enabled
        if (momentum && (Math.abs(vx) > 100 || Math.abs(vy) > 100)) {
          const decelerationFactor = 0.95;
          const finalX = x + (vx * decelerationFactor) / 10;
          const finalY = y + (vy * decelerationFactor) / 10;
          const bounded = applyBounds(finalX, finalY);
          
          Animated.parallel([
            Animated.decay(translateX, {
              velocity: vx / 10,
              deceleration: 0.997,
              useNativeDriver: false,
            }),
            Animated.decay(translateY, {
              velocity: vy / 10,
              deceleration: 0.997,
              useNativeDriver: false,
            }),
          ]).start();
        }
        
        // Elastic return to center
        if (elasticReturn) {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: false,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: false,
            }),
          ]).start();
        }
        
        if (onDragEnd) {
          onDragEnd(x, y);
        }
        break;
    }
  };
  
  return (
    <PanGestureHandler
      ref={panGestureRef}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
              { rotate: rotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              }) },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

// ==================== SCALABLE COMPONENT ====================

interface ScalableProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  onScale?: (scale: number) => void;
  onScaleEnd?: (scale: number) => void;
  style?: ViewStyle;
}

export const Scalable: React.FC<ScalableProps> = ({
  children,
  minScale = 0.5,
  maxScale = 3,
  onScale,
  onScaleEnd,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale } }],
    {
      useNativeDriver: false,
      listener: (event: PinchGestureHandlerGestureEvent) => {
        const currentScale = Math.max(
          minScale,
          Math.min(maxScale, event.nativeEvent.scale * lastScale.current)
        );
        
        if (onScale) {
          onScale(currentScale);
        }
      },
    }
  );
  
  const onPinchHandlerStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === GestureState.END) {
      lastScale.current *= event.nativeEvent.scale;
      lastScale.current = Math.max(
        minScale,
        Math.min(maxScale, lastScale.current)
      );
      
      scale.setValue(1);
      
      if (onScaleEnd) {
        onScaleEnd(lastScale.current);
      }
    }
  };
  
  return (
    <PinchGestureHandler
      onGestureEvent={onPinchGestureEvent}
      onHandlerStateChange={onPinchHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              {
                scale: Animated.multiply(
                  scale,
                  new Animated.Value(lastScale.current)
                ),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PinchGestureHandler>
  );
};

// ==================== ROTATABLE COMPONENT ====================

interface RotatableProps {
  children: React.ReactNode;
  onRotate?: (rotation: number) => void;
  onRotateEnd?: (rotation: number) => void;
  snapToAngles?: number[];
  style?: ViewStyle;
}

export const Rotatable: React.FC<RotatableProps> = ({
  children,
  onRotate,
  onRotateEnd,
  snapToAngles = [],
  style,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const lastRotation = useRef(0);
  
  const onRotationGestureEvent = Animated.event(
    [{ nativeEvent: { rotation } }],
    {
      useNativeDriver: false,
      listener: (event: RotationGestureHandlerGestureEvent) => {
        const currentRotation = event.nativeEvent.rotation + lastRotation.current;
        
        if (onRotate) {
          onRotate(currentRotation);
        }
      },
    }
  );
  
  const onRotationHandlerStateChange = (event: RotationGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === GestureState.END) {
      lastRotation.current += event.nativeEvent.rotation;
      
      // Snap to angles if specified
      if (snapToAngles.length > 0) {
        const currentAngle = (lastRotation.current * 180) / Math.PI;
        let nearestAngle = snapToAngles[0];
        let minDistance = Math.abs(currentAngle - nearestAngle);
        
        for (const angle of snapToAngles) {
          const distance = Math.abs(currentAngle - angle);
          if (distance < minDistance) {
            minDistance = distance;
            nearestAngle = angle;
          }
        }
        
        if (minDistance < 15) {
          // Snap threshold: 15 degrees
          lastRotation.current = (nearestAngle * Math.PI) / 180;
          
          Animated.spring(rotation, {
            toValue: lastRotation.current,
            tension: 200,
            friction: 10,
            useNativeDriver: false,
          }).start();
        }
      }
      
      rotation.setValue(0);
      
      if (onRotateEnd) {
        onRotateEnd(lastRotation.current);
      }
    }
  };
  
  return (
    <RotationGestureHandler
      onGestureEvent={onRotationGestureEvent}
      onHandlerStateChange={onRotationHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              {
                rotate: Animated.add(
                  rotation,
                  new Animated.Value(lastRotation.current)
                ).interpolate({
                  inputRange: [0, 2 * Math.PI],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </RotationGestureHandler>
  );
};

// ==================== SWIPEABLE CARDS ====================

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  style?: ViewStyle;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 100,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true }
  );
  
  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === GestureState.END) {
      const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;
      
      // Determine swipe direction
      let swipeAction = null;
      
      if (Math.abs(translationX) > Math.abs(translationY)) {
        // Horizontal swipe
        if (translationX > threshold || velocityX > 500) {
          swipeAction = onSwipeRight;
        } else if (translationX < -threshold || velocityX < -500) {
          swipeAction = onSwipeLeft;
        }
      } else {
        // Vertical swipe
        if (translationY > threshold || velocityY > 500) {
          swipeAction = onSwipeDown;
        } else if (translationY < -threshold || velocityY < -500) {
          swipeAction = onSwipeUp;
        }
      }
      
      if (swipeAction) {
        // Animate card off screen
        const targetX = translationX > 0 ? screenWidth : translationX < 0 ? -screenWidth : 0;
        const targetY = translationY > 0 ? screenHeight : translationY < 0 ? -screenHeight : 0;
        
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: targetY,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: translationX * 0.1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          swipeAction();
          
          // Reset card position
          translateX.setValue(0);
          translateY.setValue(0);
          rotation.setValue(0);
          opacity.setValue(1);
        });
      } else {
        // Spring back to center
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            tension: 200,
            friction: 10,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            tension: 200,
            friction: 10,
            useNativeDriver: true,
          }),
          Animated.spring(rotation, {
            toValue: 0,
            tension: 200,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };
  
  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { translateX },
              { translateY },
              {
                rotate: rotation.interpolate({
                  inputRange: [-100, 100],
                  outputRange: ['-15deg', '15deg'],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

// ==================== GESTURE TRAIL EFFECT ====================

interface GestureTrailProps {
  children: React.ReactNode;
  trailColor?: string;
  trailWidth?: number;
  fadeDuration?: number;
  style?: ViewStyle;
}

export const GestureTrail: React.FC<GestureTrailProps> = ({
  children,
  trailColor = '#00E5FF',
  trailWidth = 4,
  fadeDuration = 1000,
  style,
}) => {
  const [trailPoints, setTrailPoints] = useState<{ x: number; y: number; id: number }[]>([]);
  const pointId = useRef(0);
  
  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { absoluteX, absoluteY } = event.nativeEvent;
    
    const newPoint = {
      x: absoluteX,
      y: absoluteY,
      id: pointId.current++,
    };
    
    setTrailPoints(prev => [...prev, newPoint]);
    
    // Remove point after fade duration
    setTimeout(() => {
      setTrailPoints(prev => prev.filter(point => point.id !== newPoint.id));
    }, fadeDuration);
  };
  
  const renderTrail = () => {
    if (trailPoints.length < 2) return null;
    
    const pathData = trailPoints.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${path} L ${point.x} ${point.y}`;
    }, '');
    
    return (
      <Svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: screenWidth,
          height: screenHeight,
          pointerEvents: 'none',
        }}
      >
        <Path
          d={pathData}
          stroke={trailColor}
          strokeWidth={trailWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.7}
        />
        
        {/* Render individual trail points */}
        {trailPoints.map((point, index) => (
          <Circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={trailWidth / 2}
            fill={trailColor}
            opacity={1 - (index / trailPoints.length) * 0.8}
          />
        ))}
      </Svg>
    );
  };
  
  return (
    <View style={[{ flex: 1 }, style]}>
      {renderTrail()}
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View style={{ flex: 1 }}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default {
  Draggable,
  Scalable,
  Rotatable,
  SwipeableCard,
  GestureTrail,
};