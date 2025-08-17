/**
 * Advanced 3D Robot Visualization Component
 * Displays interactive 3D models of robots with real-time animation and control
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import {
  Mesh,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  DirectionalLight,
  AmbientLight,
  Vector3,
  Euler,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshPhongMaterial,
  Color,
} from 'three';
import { OrbitControls } from '@react-three/drei/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import { GlassCard } from '../ui/GlassCard';
import { AdvancedButton } from '../ui/AdvancedButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==================== TYPES ====================

interface RobotJoint {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  children?: RobotJoint[];
  constraints?: {
    minRotation: [number, number, number];
    maxRotation: [number, number, number];
  };
}

interface RobotVisualizationProps {
  robotType: 'unitree_g1' | 'custom_humanoid';
  jointAngles?: { [jointId: string]: [number, number, number] };
  onJointMove?: (jointId: string, rotation: [number, number, number]) => void;
  showControls?: boolean;
  autoRotate?: boolean;
  style?: any;
}

interface AnimationPreset {
  name: string;
  description: string;
  keyframes: Array<{
    time: number;
    joints: { [jointId: string]: [number, number, number] };
  }>;
  duration: number;
  loop: boolean;
}

// ==================== ROBOT MODELS ====================

const createHumanoidRobot = (): RobotJoint => ({
  id: 'torso',
  name: 'Torso',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  children: [
    {
      id: 'head',
      name: 'Head',
      position: [0, 1.5, 0],
      rotation: [0, 0, 0],
      constraints: {
        minRotation: [-Math.PI / 4, -Math.PI / 3, -Math.PI / 6],
        maxRotation: [Math.PI / 4, Math.PI / 3, Math.PI / 6],
      },
    },
    {
      id: 'left_shoulder',
      name: 'Left Shoulder',
      position: [-0.8, 1.2, 0],
      rotation: [0, 0, 0],
      constraints: {
        minRotation: [-Math.PI / 2, -Math.PI, -Math.PI / 2],
        maxRotation: [Math.PI / 2, Math.PI / 6, Math.PI / 2],
      },
      children: [
        {
          id: 'left_elbow',
          name: 'Left Elbow',
          position: [0, -0.8, 0],
          rotation: [0, 0, 0],
          constraints: {
            minRotation: [-Math.PI, -Math.PI / 6, -Math.PI / 6],
            maxRotation: [0, Math.PI / 6, Math.PI / 6],
          },
          children: [
            {
              id: 'left_wrist',
              name: 'Left Wrist',
              position: [0, -0.8, 0],
              rotation: [0, 0, 0],
              constraints: {
                minRotation: [-Math.PI / 3, -Math.PI / 3, -Math.PI / 3],
                maxRotation: [Math.PI / 3, Math.PI / 3, Math.PI / 3],
              },
            },
          ],
        },
      ],
    },
    {
      id: 'right_shoulder',
      name: 'Right Shoulder',
      position: [0.8, 1.2, 0],
      rotation: [0, 0, 0],
      constraints: {
        minRotation: [-Math.PI / 2, -Math.PI / 6, -Math.PI / 2],
        maxRotation: [Math.PI / 2, Math.PI, Math.PI / 2],
      },
      children: [
        {
          id: 'right_elbow',
          name: 'Right Elbow',
          position: [0, -0.8, 0],
          rotation: [0, 0, 0],
          constraints: {
            minRotation: [-Math.PI, -Math.PI / 6, -Math.PI / 6],
            maxRotation: [0, Math.PI / 6, Math.PI / 6],
          },
          children: [
            {
              id: 'right_wrist',
              name: 'Right Wrist',
              position: [0, -0.8, 0],
              rotation: [0, 0, 0],
              constraints: {
                minRotation: [-Math.PI / 3, -Math.PI / 3, -Math.PI / 3],
                maxRotation: [Math.PI / 3, Math.PI / 3, Math.PI / 3],
              },
            },
          ],
        },
      ],
    },
    {
      id: 'left_hip',
      name: 'Left Hip',
      position: [-0.3, -0.5, 0],
      rotation: [0, 0, 0],
      constraints: {
        minRotation: [-Math.PI / 3, -Math.PI / 6, -Math.PI / 3],
        maxRotation: [Math.PI / 3, Math.PI / 6, Math.PI / 3],
      },
      children: [
        {
          id: 'left_knee',
          name: 'Left Knee',
          position: [0, -1, 0],
          rotation: [0, 0, 0],
          constraints: {
            minRotation: [0, -Math.PI / 6, -Math.PI / 6],
            maxRotation: [Math.PI, Math.PI / 6, Math.PI / 6],
          },
          children: [
            {
              id: 'left_ankle',
              name: 'Left Ankle',
              position: [0, -1, 0],
              rotation: [0, 0, 0],
              constraints: {
                minRotation: [-Math.PI / 3, -Math.PI / 6, -Math.PI / 6],
                maxRotation: [Math.PI / 3, Math.PI / 6, Math.PI / 6],
              },
            },
          ],
        },
      ],
    },
    {
      id: 'right_hip',
      name: 'Right Hip',
      position: [0.3, -0.5, 0],
      rotation: [0, 0, 0],
      constraints: {
        minRotation: [-Math.PI / 3, -Math.PI / 6, -Math.PI / 3],
        maxRotation: [Math.PI / 3, Math.PI / 6, Math.PI / 3],
      },
      children: [
        {
          id: 'right_knee',
          name: 'Right Knee',
          position: [0, -1, 0],
          rotation: [0, 0, 0],
          constraints: {
            minRotation: [0, -Math.PI / 6, -Math.PI / 6],
            maxRotation: [Math.PI, Math.PI / 6, Math.PI / 6],
          },
          children: [
            {
              id: 'right_ankle',
              name: 'Right Ankle',
              position: [0, -1, 0],
              rotation: [0, 0, 0],
              constraints: {
                minRotation: [-Math.PI / 3, -Math.PI / 6, -Math.PI / 6],
                maxRotation: [Math.PI / 3, Math.PI / 6, Math.PI / 6],
              },
            },
          ],
        },
      ],
    },
  ],
});

// ==================== ANIMATION PRESETS ====================

const animationPresets: { [key: string]: AnimationPreset } = {
  wave: {
    name: 'Wave',
    description: 'Friendly waving gesture',
    duration: 3000,
    loop: true,
    keyframes: [
      {
        time: 0,
        joints: {
          right_shoulder: [0, 0, Math.PI / 2],
          right_elbow: [-Math.PI / 3, 0, 0],
          right_wrist: [0, 0, Math.PI / 6],
        },
      },
      {
        time: 0.5,
        joints: {
          right_shoulder: [0, 0, Math.PI / 2],
          right_elbow: [-Math.PI / 4, 0, 0],
          right_wrist: [0, 0, -Math.PI / 6],
        },
      },
      {
        time: 1,
        joints: {
          right_shoulder: [0, 0, Math.PI / 2],
          right_elbow: [-Math.PI / 3, 0, 0],
          right_wrist: [0, 0, Math.PI / 6],
        },
      },
    ],
  },
  walk: {
    name: 'Walk',
    description: 'Walking motion cycle',
    duration: 2000,
    loop: true,
    keyframes: [
      {
        time: 0,
        joints: {
          left_hip: [Math.PI / 6, 0, 0],
          left_knee: [Math.PI / 3, 0, 0],
          right_hip: [-Math.PI / 6, 0, 0],
          right_knee: [0, 0, 0],
          left_shoulder: [Math.PI / 12, 0, 0],
          right_shoulder: [-Math.PI / 12, 0, 0],
        },
      },
      {
        time: 0.5,
        joints: {
          left_hip: [-Math.PI / 6, 0, 0],
          left_knee: [0, 0, 0],
          right_hip: [Math.PI / 6, 0, 0],
          right_knee: [Math.PI / 3, 0, 0],
          left_shoulder: [-Math.PI / 12, 0, 0],
          right_shoulder: [Math.PI / 12, 0, 0],
        },
      },
      {
        time: 1,
        joints: {
          left_hip: [Math.PI / 6, 0, 0],
          left_knee: [Math.PI / 3, 0, 0],
          right_hip: [-Math.PI / 6, 0, 0],
          right_knee: [0, 0, 0],
          left_shoulder: [Math.PI / 12, 0, 0],
          right_shoulder: [-Math.PI / 12, 0, 0],
        },
      },
    ],
  },
  balance: {
    name: 'Balance',
    description: 'Dynamic balancing pose',
    duration: 4000,
    loop: true,
    keyframes: [
      {
        time: 0,
        joints: {
          left_shoulder: [0, 0, Math.PI / 4],
          right_shoulder: [0, 0, -Math.PI / 4],
          left_hip: [0, 0, -Math.PI / 12],
          right_hip: [0, 0, Math.PI / 12],
        },
      },
      {
        time: 0.5,
        joints: {
          left_shoulder: [0, 0, -Math.PI / 4],
          right_shoulder: [0, 0, Math.PI / 4],
          left_hip: [0, 0, Math.PI / 12],
          right_hip: [0, 0, -Math.PI / 12],
        },
      },
      {
        time: 1,
        joints: {
          left_shoulder: [0, 0, Math.PI / 4],
          right_shoulder: [0, 0, -Math.PI / 4],
          left_hip: [0, 0, -Math.PI / 12],
          right_hip: [0, 0, Math.PI / 12],
        },
      },
    ],
  },
};

// ==================== 3D COMPONENTS ====================

const RobotJointMesh: React.FC<{
  joint: RobotJoint;
  currentRotations: { [jointId: string]: [number, number, number] };
  onJointClick?: (jointId: string) => void;
  selectedJoint?: string;
}> = ({ joint, currentRotations, onJointClick, selectedJoint }) => {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);

  const rotation = currentRotations[joint.id] || joint.rotation;
  const isSelected = selectedJoint === joint.id;

  // Define different geometries for different joint types
  const getJointGeometry = (jointId: string) => {
    if (jointId === 'torso') return new BoxGeometry(1, 1.5, 0.5);
    if (jointId === 'head') return new SphereGeometry(0.3);
    if (jointId.includes('shoulder') || jointId.includes('hip')) return new SphereGeometry(0.15);
    if (jointId.includes('elbow') || jointId.includes('knee')) return new SphereGeometry(0.12);
    if (jointId.includes('wrist') || jointId.includes('ankle')) return new SphereGeometry(0.1);
    return new CylinderGeometry(0.08, 0.08, 0.6);
  };

  const getJointMaterial = (jointId: string, isSelected: boolean) => {
    const baseColor = isSelected ? new Color(COLORS.primary) : new Color(COLORS.secondary);
    
    if (jointId === 'torso') return new MeshPhongMaterial({ color: new Color(COLORS.surface) });
    if (jointId === 'head') return new MeshPhongMaterial({ color: new Color(COLORS.text) });
    
    return new MeshPhongMaterial({
      color: baseColor,
      shininess: 100,
      transparent: true,
      opacity: isSelected ? 1.0 : 0.8,
    });
  };

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.set(...rotation);
    }
  });

  return (
    <group ref={groupRef} position={joint.position} onClick={() => onJointClick?.(joint.id)}>
      <mesh ref={meshRef} geometry={getJointGeometry(joint.id)} material={getJointMaterial(joint.id, isSelected)} />
      
      {/* Render child joints */}
      {joint.children?.map((childJoint) => (
        <RobotJointMesh
          key={childJoint.id}
          joint={childJoint}
          currentRotations={currentRotations}
          onJointClick={onJointClick}
          selectedJoint={selectedJoint}
        />
      ))}
    </group>
  );
};

const Scene: React.FC<{
  robot: RobotJoint;
  currentRotations: { [jointId: string]: [number, number, number] };
  onJointClick?: (jointId: string) => void;
  selectedJoint?: string;
  autoRotate: boolean;
}> = ({ robot, currentRotations, onJointClick, selectedJoint, autoRotate }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={0.4} />
      
      {/* Robot Model */}
      <RobotJointMesh
        joint={robot}
        currentRotations={currentRotations}
        onJointClick={onJointClick}
        selectedJoint={selectedJoint}
      />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshPhongMaterial color={new Color(COLORS.border)} transparent opacity={0.3} />
      </mesh>
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={15}
      />
    </>
  );
};

// ==================== MAIN COMPONENT ====================

export const RobotVisualization: React.FC<RobotVisualizationProps> = ({
  robotType,
  jointAngles = {},
  onJointMove,
  showControls = true,
  autoRotate = false,
  style,
}) => {
  const [currentRotations, setCurrentRotations] = useState<{ [jointId: string]: [number, number, number] }>({});
  const [selectedJoint, setSelectedJoint] = useState<string | undefined>();
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(autoRotate);
  
  const animationRef = useRef<NodeJS.Timeout>();
  const animationProgress = useRef(0);

  // Create robot model based on type
  const robot = useMemo(() => {
    return createHumanoidRobot();
  }, [robotType]);

  // Update rotations when joint angles change
  useEffect(() => {
    setCurrentRotations(prev => ({ ...prev, ...jointAngles }));
  }, [jointAngles]);

  // Animation system
  const playAnimation = (presetName: string) => {
    const preset = animationPresets[presetName];
    if (!preset) return;

    setIsAnimating(true);
    setCurrentAnimation(presetName);
    animationProgress.current = 0;

    const animate = () => {
      animationProgress.current += 16; // ~60fps
      const progress = (animationProgress.current % preset.duration) / preset.duration;

      // Find current keyframe and next keyframe
      let currentKeyframe = preset.keyframes[0];
      let nextKeyframe = preset.keyframes[1] || preset.keyframes[0];

      for (let i = 0; i < preset.keyframes.length - 1; i++) {
        if (progress >= preset.keyframes[i].time && progress < preset.keyframes[i + 1].time) {
          currentKeyframe = preset.keyframes[i];
          nextKeyframe = preset.keyframes[i + 1];
          break;
        }
      }

      // Interpolate between keyframes
      const localProgress = nextKeyframe.time > currentKeyframe.time 
        ? (progress - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time)
        : 0;

      const newRotations: { [jointId: string]: [number, number, number] } = {};

      // Interpolate each joint
      Object.keys(currentKeyframe.joints).forEach(jointId => {
        const currentRot = currentKeyframe.joints[jointId];
        const nextRot = nextKeyframe.joints[jointId] || currentRot;
        
        newRotations[jointId] = [
          currentRot[0] + (nextRot[0] - currentRot[0]) * localProgress,
          currentRot[1] + (nextRot[1] - currentRot[1]) * localProgress,
          currentRot[2] + (nextRot[2] - currentRot[2]) * localProgress,
        ];
      });

      setCurrentRotations(prev => ({ ...prev, ...newRotations }));

      if (preset.loop || animationProgress.current < preset.duration) {
        animationRef.current = setTimeout(animate, 16);
      } else {
        setIsAnimating(false);
        setCurrentAnimation(null);
      }
    };

    animate();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    setIsAnimating(false);
    setCurrentAnimation(null);
  };

  const resetPose = () => {
    stopAnimation();
    setCurrentRotations({});
    setSelectedJoint(undefined);
  };

  const handleJointClick = (jointId: string) => {
    setSelectedJoint(selectedJoint === jointId ? undefined : jointId);
  };

  const adjustJoint = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!selectedJoint) return;

    const current = currentRotations[selectedJoint] || [0, 0, 0];
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const newRotation: [number, number, number] = [...current];
    newRotation[axisIndex] = Math.max(-Math.PI, Math.min(Math.PI, current[axisIndex] + delta));

    setCurrentRotations(prev => ({
      ...prev,
      [selectedJoint]: newRotation,
    }));

    onJointMove?.(selectedJoint, newRotation);
  };

  return (
    <View style={[styles.container, style]}>
      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas style={styles.canvas}>
          <Scene
            robot={robot}
            currentRotations={currentRotations}
            onJointClick={handleJointClick}
            selectedJoint={selectedJoint}
            autoRotate={autoRotateEnabled}
          />
        </Canvas>

        {/* Overlay UI */}
        {showControls && (
          <View style={styles.overlayControls}>
            {/* Animation Controls */}
            <GlassCard style={styles.animationCard} intensity={60}>
              <Text style={styles.controlTitle}>Animations</Text>
              <View style={styles.animationButtons}>
                {Object.entries(animationPresets).map(([key, preset]) => (
                  <AdvancedButton
                    key={key}
                    variant={currentAnimation === key ? "primary" : "secondary"}
                    size="small"
                    onPress={() => currentAnimation === key ? stopAnimation() : playAnimation(key)}
                    style={styles.animationButton}
                    effectType="ripple"
                    disabled={isAnimating && currentAnimation !== key}
                  >
                    <Text style={styles.animationButtonText}>{preset.name}</Text>
                  </AdvancedButton>
                ))}
              </View>
            </GlassCard>

            {/* Joint Controls */}
            {selectedJoint && (
              <GlassCard style={styles.jointCard} intensity={60}>
                <Text style={styles.controlTitle}>
                  {robot.children?.find(j => j.id === selectedJoint)?.name || selectedJoint}
                </Text>
                <View style={styles.jointControls}>
                  {['x', 'y', 'z'].map((axis) => (
                    <View key={axis} style={styles.axisControl}>
                      <Text style={styles.axisLabel}>{axis.toUpperCase()}</Text>
                      <View style={styles.axisButtons}>
                        <TouchableOpacity
                          style={styles.adjustButton}
                          onPress={() => adjustJoint(axis as any, -Math.PI / 12)}
                        >
                          <Ionicons name="remove" size={16} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.adjustButton}
                          onPress={() => adjustJoint(axis as any, Math.PI / 12)}
                        >
                          <Ionicons name="add" size={16} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}

            {/* Global Controls */}
            <GlassCard style={styles.globalCard} intensity={60}>
              <View style={styles.globalControls}>
                <AdvancedButton
                  variant="secondary"
                  size="small"
                  onPress={() => setAutoRotateEnabled(!autoRotateEnabled)}
                  style={styles.globalButton}
                  effectType="glow"
                >
                  <Ionicons 
                    name={autoRotateEnabled ? "pause" : "play"} 
                    size={16} 
                    color={COLORS.text} 
                  />
                </AdvancedButton>
                
                <AdvancedButton
                  variant="secondary"
                  size="small"
                  onPress={resetPose}
                  style={styles.globalButton}
                  effectType="ripple"
                >
                  <Ionicons name="refresh" size={16} color={COLORS.text} />
                </AdvancedButton>
              </View>
            </GlassCard>
          </View>
        )}
      </View>

      {/* Info Panel */}
      {showControls && (
        <GlassCard style={styles.infoPanel} intensity={40}>
          <Text style={styles.infoTitle}>Robot: {robotType.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.infoText}>
            {selectedJoint ? `Selected: ${selectedJoint}` : 'Tap a joint to select'}
          </Text>
          {isAnimating && (
            <Text style={styles.infoText}>
              Playing: {animationPresets[currentAnimation!]?.description}
            </Text>
          )}
        </GlassCard>
      )}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
  overlayControls: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    gap: SPACING.md,
    maxWidth: 200,
  },
  animationCard: {
    padding: SPACING.md,
  },
  controlTitle: {
    ...TYPOGRAPHY.h5,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  animationButtons: {
    gap: SPACING.xs,
  },
  animationButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  animationButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
  },
  jointCard: {
    padding: SPACING.md,
  },
  jointControls: {
    gap: SPACING.sm,
  },
  axisControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  axisLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
    minWidth: 20,
  },
  axisButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  adjustButton: {
    backgroundColor: COLORS.surface + '80',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  globalCard: {
    padding: SPACING.md,
  },
  globalControls: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  globalButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
  },
  infoPanel: {
    margin: SPACING.lg,
    padding: SPACING.md,
  },
  infoTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});

export default RobotVisualization;