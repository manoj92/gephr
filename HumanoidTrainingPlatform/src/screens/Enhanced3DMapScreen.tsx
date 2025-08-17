import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HapticFeedback from 'react-native-haptic-feedback';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PointCloudData {
  x: number;
  y: number;
  z: number;
  color: string;
  intensity: number;
}

interface MapControls {
  zoom: number;
  rotation: { x: number; y: number; z: number };
  translation: { x: number; y: number };
}

// 3D Point Cloud Component
const PointCloud: React.FC<{ points: PointCloudData[] }> = ({ points }) => {
  const meshRef = useRef<any>();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={meshRef}>
      {points.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color={point.color} />
        </mesh>
      ))}
    </group>
  );
};

// 3D Room Wireframe
const RoomWireframe: React.FC = () => {
  const frameRef = useRef<any>();

  useFrame(() => {
    if (frameRef.current) {
      frameRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={frameRef}>
      {/* Floor */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(4, 4)]} />
        <lineBasicMaterial color="#00F5FF" />
      </lineSegments>
      
      {/* Walls */}
      <lineSegments position={[0, 1, -2]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4, 2)]} />
        <lineBasicMaterial color="#FF00FF" />
      </lineSegments>
      
      <lineSegments position={[-2, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(4, 2)]} />
        <lineBasicMaterial color="#00FF80" />
      </lineSegments>
    </group>
  );
};

const Enhanced3DMapScreen: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [pointCloudData, setPointCloudData] = useState<PointCloudData[]>([]);
  const [mapControls, setMapControls] = useState<MapControls>({
    zoom: 1,
    rotation: { x: 0, y: 0, z: 0 },
    translation: { x: 0, y: 0 },
  });
  const [scanProgress, setScanProgress] = useState(0);
  const [roomDimensions, setRoomDimensions] = useState({ width: 0, height: 0, depth: 0 });

  const scanAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isScanning) {
      scanAnimation.value = withTiming(1, { duration: 200 });
      progressAnimation.value = withTiming(1, { duration: 5000 });
      simulatePointCloudGeneration();
    } else {
      scanAnimation.value = withTiming(0, { duration: 200 });
      progressAnimation.value = withTiming(0, { duration: 300 });
    }
  }, [isScanning]);

  const simulatePointCloudGeneration = () => {
    const points: PointCloudData[] = [];
    const colors = ['#00F5FF', '#FF00FF', '#00FF80', '#FFD700', '#FF0080'];
    
    for (let i = 0; i < 500; i++) {
      points.push({
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 2,
        z: (Math.random() - 0.5) * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        intensity: Math.random(),
      });
    }
    
    setPointCloudData(points);
    setRoomDimensions({ width: 4.2, height: 2.5, depth: 4.2 });
    
    // Simulate scan progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.02;
      setScanProgress(progress);
      
      if (progress >= 1) {
        clearInterval(interval);
        setIsScanning(false);
        HapticFeedback.trigger('notificationSuccess');
      }
    }, 100);
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  });

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const scanAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scanAnimation.value,
    transform: [{ scale: interpolate(scanAnimation.value, [0, 1], [0.8, 1]) }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressAnimation.value, [0, 1], [0, 100])}%`,
  }));

  const handleStartScan = () => {
    HapticFeedback.trigger('impactMedium');
    setIsScanning(true);
    setScanProgress(0);
  };

  const handleZoomIn = () => {
    HapticFeedback.trigger('impactLight');
    scale.value = withSpring(Math.min(scale.value + 0.2, 3));
  };

  const handleZoomOut = () => {
    HapticFeedback.trigger('impactLight');
    scale.value = withSpring(Math.max(scale.value - 0.2, 0.5));
  };

  const handleResetView = () => {
    HapticFeedback.trigger('impactMedium');
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={15} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>3D Environment Map</Text>
        <Text style={styles.subtitle}>Real-time spatial mapping</Text>
      </View>

      {/* 3D Canvas */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.canvasContainer, animatedCanvasStyle]}>
          <Canvas style={styles.canvas}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <pointLight position={[-10, -10, -10]} color="#FF00FF" />
            
            {pointCloudData.length > 0 && <PointCloud points={pointCloudData} />}
            <RoomWireframe />
            
            <mesh position={[0, -1, 0]}>
              <planeGeometry args={[10, 10]} />
              <meshBasicMaterial color="#0A0A0A" transparent opacity={0.3} />
            </mesh>
          </Canvas>
          
          {/* Scan Overlay */}
          {isScanning && (
            <Animated.View style={[styles.scanOverlay, scanAnimatedStyle]}>
              <View style={styles.scanLines}>
                {[...Array(5)].map((_, i) => (
                  <View key={i} style={[styles.scanLine, { top: `${i * 20}%` }]} />
                ))}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </PanGestureHandler>

      {/* Map Info */}
      <View style={styles.infoContainer}>
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="cube" size={20} color={COLORS.primary} />
              <Text style={styles.infoLabel}>Points</Text>
              <Text style={styles.infoValue}>{pointCloudData.length}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="resize" size={20} color={COLORS.success} />
              <Text style={styles.infoLabel}>Dimensions</Text>
              <Text style={styles.infoValue}>
                {roomDimensions.width.toFixed(1)}m × {roomDimensions.depth.toFixed(1)}m
              </Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="ruler" size={20} color={COLORS.warning} />
              <Text style={styles.infoLabel}>Height</Text>
              <Text style={styles.infoValue}>{roomDimensions.height.toFixed(1)}m</Text>
            </View>
          </View>
        </GlassCard>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.leftControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
            <Ionicons name="add" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
            <Ionicons name="remove" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleResetView}>
            <Ionicons name="refresh" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerControls}>
          {!isScanning ? (
            <NeonButton
              title="Start Scan"
              onPress={handleStartScan}
              variant="primary"
              size="large"
            />
          ) : (
            <GlassCard style={styles.progressCard}>
              <Text style={styles.progressText}>Scanning... {Math.round(scanProgress * 100)}%</Text>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
              </View>
            </GlassCard>
          )}
        </View>

        <View style={styles.rightControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="save" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="share" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="settings" size={24} color={COLORS.text} />
          </TouchableOpacity>
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
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  canvasContainer: {
    flex: 1,
    margin: SPACING.lg,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
  },
  scanLines: {
    flex: 1,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  infoContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  infoCard: {
    padding: SPACING.md,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  leftControls: {
    gap: SPACING.sm,
  },
  centerControls: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  rightControls: {
    gap: SPACING.sm,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressCard: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  progressBar: {
    width: '100%',
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
});

export default Enhanced3DMapScreen;