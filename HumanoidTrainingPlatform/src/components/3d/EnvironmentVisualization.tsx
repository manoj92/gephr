/**
 * Environment Visualization Component
 * Displays interactive 3D environments for robot training and simulation
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import {
  Mesh,
  Group,
  BoxGeometry,
  PlaneGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhongMaterial,
  Color,
  Vector3,
  DirectionalLight,
  SpotLight,
  PointLight,
  Fog,
} from 'three';
import { OrbitControls, Text as ThreeText } from '@react-three/drei/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import { GlassCard } from '../ui/GlassCard';
import { AdvancedButton } from '../ui/AdvancedButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==================== TYPES ====================

interface EnvironmentObject {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'platform' | 'obstacle' | 'target';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  interactive?: boolean;
  metadata?: any;
}

interface Environment {
  id: string;
  name: string;
  description: string;
  objects: EnvironmentObject[];
  lighting: {
    ambient: number;
    directional: {
      intensity: number;
      position: [number, number, number];
      color: string;
    }[];
    spotlights?: {
      intensity: number;
      position: [number, number, number];
      target: [number, number, number];
      color: string;
    }[];
  };
  fog?: {
    color: string;
    near: number;
    far: number;
  };
  ground: {
    size: [number, number];
    color: string;
    texture?: string;
  };
}

interface EnvironmentVisualizationProps {
  environmentId?: string;
  onObjectInteraction?: (objectId: string, action: 'click' | 'hover') => void;
  showRobot?: boolean;
  robotPosition?: [number, number, number];
  style?: any;
}

// ==================== PREDEFINED ENVIRONMENTS ====================

const environments: { [key: string]: Environment } = {
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse Navigation',
    description: 'Navigate through boxes and shelving units',
    objects: [
      // Shelving units
      { id: 'shelf1', type: 'box', position: [-5, 1, -3], scale: [0.5, 2, 3], color: COLORS.surface, interactive: true },
      { id: 'shelf2', type: 'box', position: [5, 1, -3], scale: [0.5, 2, 3], color: COLORS.surface, interactive: true },
      { id: 'shelf3', type: 'box', position: [-5, 1, 3], scale: [0.5, 2, 3], color: COLORS.surface, interactive: true },
      { id: 'shelf4', type: 'box', position: [5, 1, 3], scale: [0.5, 2, 3], color: COLORS.surface, interactive: true },
      
      // Boxes on floor
      { id: 'box1', type: 'box', position: [-2, 0.5, 0], scale: [1, 1, 1], color: COLORS.warning, interactive: true },
      { id: 'box2', type: 'box', position: [2, 0.5, 1], scale: [0.8, 1.2, 0.8], color: COLORS.secondary, interactive: true },
      { id: 'box3', type: 'box', position: [0, 0.3, -2], scale: [1.2, 0.6, 1], color: COLORS.primary, interactive: true },
      
      // Navigation targets
      { id: 'target1', type: 'target', position: [-3, 0.1, -1], scale: [0.8, 0.2, 0.8], color: COLORS.success, interactive: true },
      { id: 'target2', type: 'target', position: [3, 0.1, 2], scale: [0.8, 0.2, 0.8], color: COLORS.success, interactive: true },
    ],
    lighting: {
      ambient: 0.3,
      directional: [
        { intensity: 0.8, position: [10, 15, 5], color: '#ffffff' },
        { intensity: 0.4, position: [-5, 10, -5], color: '#ffffff' },
      ],
      spotlights: [
        { intensity: 1.0, position: [0, 8, 0], target: [0, 0, 0], color: '#ffffff' },
      ],
    },
    ground: {
      size: [20, 20],
      color: COLORS.border,
    },
  },
  manipulation: {
    id: 'manipulation',
    name: 'Manipulation Lab',
    description: 'Practice object manipulation and grasping',
    objects: [
      // Work table
      { id: 'table', type: 'box', position: [0, 0.75, 0], scale: [3, 0.1, 2], color: COLORS.surface, interactive: false },
      { id: 'table_leg1', type: 'cylinder', position: [-1.3, 0.375, -0.8], scale: [0.1, 0.75, 0.1], color: COLORS.border, interactive: false },
      { id: 'table_leg2', type: 'cylinder', position: [1.3, 0.375, -0.8], scale: [0.1, 0.75, 0.1], color: COLORS.border, interactive: false },
      { id: 'table_leg3', type: 'cylinder', position: [-1.3, 0.375, 0.8], scale: [0.1, 0.75, 0.1], color: COLORS.border, interactive: false },
      { id: 'table_leg4', type: 'cylinder', position: [1.3, 0.375, 0.8], scale: [0.1, 0.75, 0.1], color: COLORS.border, interactive: false },
      
      // Objects to manipulate
      { id: 'sphere1', type: 'sphere', position: [-0.5, 0.9, 0.3], scale: [0.15, 0.15, 0.15], color: COLORS.primary, interactive: true },
      { id: 'box_small', type: 'box', position: [0.3, 0.85, -0.2], scale: [0.2, 0.2, 0.2], color: COLORS.warning, interactive: true },
      { id: 'cylinder_tool', type: 'cylinder', position: [0, 0.85, 0.5], scale: [0.05, 0.3, 0.05], color: COLORS.secondary, interactive: true },
      
      // Storage containers
      { id: 'container1', type: 'box', position: [-2, 0.2, 1], scale: [0.6, 0.4, 0.6], color: COLORS.surface, interactive: true },
      { id: 'container2', type: 'box', position: [2, 0.2, -1], scale: [0.6, 0.4, 0.6], color: COLORS.surface, interactive: true },
    ],
    lighting: {
      ambient: 0.4,
      directional: [
        { intensity: 0.7, position: [5, 8, 3], color: '#ffffff' },
        { intensity: 0.5, position: [-3, 6, -2], color: '#f0f0f0' },
      ],
      spotlights: [
        { intensity: 1.2, position: [0, 3, 0], target: [0, 0.8, 0], color: '#ffffff' },
      ],
    },
    ground: {
      size: [12, 12],
      color: COLORS.background,
    },
  },
  balance: {
    id: 'balance',
    name: 'Balance Challenge',
    description: 'Navigate uneven terrain and obstacles',
    objects: [
      // Uneven platforms
      { id: 'platform1', type: 'platform', position: [-3, 0.2, -2], scale: [1.5, 0.4, 1.5], color: COLORS.surface, interactive: false },
      { id: 'platform2', type: 'platform', position: [0, 0.5, 0], scale: [1.2, 0.8, 1.2], color: COLORS.surface, interactive: false },
      { id: 'platform3', type: 'platform', position: [3, 0.3, 2], scale: [1.8, 0.6, 1.8], color: COLORS.surface, interactive: false },
      { id: 'platform4', type: 'platform', position: [-1, 0.8, 3], scale: [1, 1.2, 1], color: COLORS.surface, interactive: false },
      
      // Balance beams
      { id: 'beam1', type: 'box', position: [-1.5, 0.6, -0.5], scale: [0.2, 0.2, 2], color: COLORS.warning, interactive: false },
      { id: 'beam2', type: 'box', position: [1.5, 0.4, 1], scale: [2, 0.2, 0.2], color: COLORS.warning, interactive: false },
      
      // Obstacles
      { id: 'obstacle1', type: 'cylinder', position: [0, 0.3, -3], scale: [0.3, 0.6, 0.3], color: COLORS.error, interactive: false },
      { id: 'obstacle2', type: 'sphere', position: [2, 0.5, -1], scale: [0.4, 0.4, 0.4], color: COLORS.error, interactive: false },
      
      // Targets
      { id: 'goal', type: 'target', position: [4, 0.1, 4], scale: [1, 0.2, 1], color: COLORS.success, interactive: true },
    ],
    lighting: {
      ambient: 0.2,
      directional: [
        { intensity: 0.9, position: [8, 12, 6], color: '#fff8dc' },
        { intensity: 0.3, position: [-4, 8, -3], color: '#ffffff' },
      ],
    },
    fog: {
      color: '#87CEEB',
      near: 8,
      far: 25,
    },
    ground: {
      size: [16, 16],
      color: '#228B22',
    },
  },
};

// ==================== 3D COMPONENTS ====================

const EnvironmentObject: React.FC<{
  object: EnvironmentObject;
  onInteraction?: (objectId: string, action: 'click' | 'hover') => void;
  isHighlighted?: boolean;
}> = ({ object, onInteraction, isHighlighted }) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(() => {
    const scale = object.scale || [1, 1, 1];
    switch (object.type) {
      case 'box':
      case 'platform':
        return new BoxGeometry(scale[0], scale[1], scale[2]);
      case 'sphere':
        return new SphereGeometry(scale[0], 16, 16);
      case 'cylinder':
        return new CylinderGeometry(scale[0], scale[0], scale[1], 16);
      case 'target':
        return new CylinderGeometry(scale[0], scale[0], scale[1], 16);
      default:
        return new BoxGeometry(scale[0], scale[1], scale[2]);
    }
  }, [object.type, object.scale]);

  const material = useMemo(() => {
    const baseColor = new Color(object.color);
    const emissive = isHighlighted || hovered ? new Color(object.color).multiplyScalar(0.3) : new Color(0x000000);
    
    return new MeshStandardMaterial({
      color: baseColor,
      emissive,
      roughness: object.type === 'target' ? 0.1 : 0.7,
      metalness: object.type === 'target' ? 0.8 : 0.1,
      transparent: object.type === 'target',
      opacity: object.type === 'target' ? 0.8 : 1.0,
    });
  }, [object.color, object.type, isHighlighted, hovered]);

  const handleClick = () => {
    if (object.interactive) {
      onInteraction?.(object.id, 'click');
    }
  };

  const handlePointerOver = () => {
    if (object.interactive) {
      setHovered(true);
      onInteraction?.(object.id, 'hover');
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
  };

  useFrame(() => {
    if (meshRef.current && object.type === 'target') {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={object.position}
      rotation={object.rotation}
      geometry={geometry}
      material={material}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
};

const SimpleRobot: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Simple walking animation
      const time = state.clock.elapsedTime;
      groupRef.current.position.x = position[0] + Math.sin(time * 0.5) * 0.1;
      groupRef.current.rotation.y = Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.6, 1.2, 0.3]} />
        <meshStandardMaterial color={new Color(COLORS.primary)} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.25]} />
        <meshStandardMaterial color={new Color(COLORS.text)} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.5, 1.2, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={new Color(COLORS.secondary)} />
      </mesh>
      <mesh position={[0.5, 1.2, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={new Color(COLORS.secondary)} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.2, 0.4, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={new Color(COLORS.secondary)} />
      </mesh>
      <mesh position={[0.2, 0.4, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color={new Color(COLORS.secondary)} />
      </mesh>
    </group>
  );
};

const EnvironmentScene: React.FC<{
  environment: Environment;
  onObjectInteraction?: (objectId: string, action: 'click' | 'hover') => void;
  showRobot?: boolean;
  robotPosition?: [number, number, number];
  highlightedObject?: string;
}> = ({ environment, onObjectInteraction, showRobot, robotPosition, highlightedObject }) => {
  const { scene, camera } = useThree();

  useEffect(() => {
    // Set up camera
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);

    // Set up fog if defined
    if (environment.fog) {
      scene.fog = new Fog(
        new Color(environment.fog.color),
        environment.fog.near,
        environment.fog.far
      );
    } else {
      scene.fog = null;
    }
  }, [environment, scene, camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={environment.lighting.ambient} />
      
      {environment.lighting.directional.map((light, index) => (
        <directionalLight
          key={`directional-${index}`}
          intensity={light.intensity}
          position={light.position}
          color={new Color(light.color)}
          castShadow
        />
      ))}
      
      {environment.lighting.spotlights?.map((light, index) => (
        <spotLight
          key={`spot-${index}`}
          intensity={light.intensity}
          position={light.position}
          target={light.target}
          color={new Color(light.color)}
          angle={Math.PI / 6}
          penumbra={0.3}
          castShadow
        />
      ))}

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={environment.ground.size} />
        <meshStandardMaterial color={new Color(environment.ground.color)} />
      </mesh>

      {/* Environment objects */}
      {environment.objects.map((object) => (
        <EnvironmentObject
          key={object.id}
          object={object}
          onInteraction={onObjectInteraction}
          isHighlighted={highlightedObject === object.id}
        />
      ))}

      {/* Robot */}
      {showRobot && robotPosition && (
        <SimpleRobot position={robotPosition} />
      )}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={3}
        maxDistance={20}
      />
    </>
  );
};

// ==================== MAIN COMPONENT ====================

export const EnvironmentVisualization: React.FC<EnvironmentVisualizationProps> = ({
  environmentId = 'warehouse',
  onObjectInteraction,
  showRobot = true,
  robotPosition = [0, 0, 0],
  style,
}) => {
  const [currentEnvironment, setCurrentEnvironment] = useState(environmentId);
  const [highlightedObject, setHighlightedObject] = useState<string>();
  const [selectedObject, setSelectedObject] = useState<string>();

  const environment = environments[currentEnvironment];

  const handleObjectInteraction = (objectId: string, action: 'click' | 'hover') => {
    if (action === 'click') {
      setSelectedObject(selectedObject === objectId ? undefined : objectId);
    } else if (action === 'hover') {
      setHighlightedObject(objectId);
    }
    onObjectInteraction?.(objectId, action);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Environment Selector */}
      <GlassCard style={styles.selectorCard} intensity={60}>
        <Text style={styles.selectorTitle}>Environment</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.environmentButtons}>
            {Object.values(environments).map((env) => (
              <AdvancedButton
                key={env.id}
                variant={currentEnvironment === env.id ? "primary" : "secondary"}
                size="small"
                onPress={() => setCurrentEnvironment(env.id)}
                style={styles.environmentButton}
                effectType="ripple"
              >
                <Text style={[
                  styles.environmentButtonText,
                  { color: currentEnvironment === env.id ? COLORS.background : COLORS.text }
                ]}>
                  {env.name}
                </Text>
              </AdvancedButton>
            ))}
          </View>
        </ScrollView>
      </GlassCard>

      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas style={styles.canvas}>
          <EnvironmentScene
            environment={environment}
            onObjectInteraction={handleObjectInteraction}
            showRobot={showRobot}
            robotPosition={robotPosition}
            highlightedObject={highlightedObject}
          />
        </Canvas>

        {/* Object Info Overlay */}
        {selectedObject && (
          <View style={styles.objectInfo}>
            <GlassCard style={styles.objectInfoCard} intensity={80}>
              <View style={styles.objectInfoHeader}>
                <Text style={styles.objectInfoTitle}>
                  {selectedObject.replace(/\d+$/, '').replace('_', ' ').toUpperCase()}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedObject(undefined)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={16} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.objectInfoText}>
                Object ID: {selectedObject}
              </Text>
              <Text style={styles.objectInfoText}>
                Interactive: {environment.objects.find(o => o.id === selectedObject)?.interactive ? 'Yes' : 'No'}
              </Text>
            </GlassCard>
          </View>
        )}
      </View>

      {/* Environment Info */}
      <GlassCard style={styles.infoCard} intensity={40}>
        <Text style={styles.infoTitle}>{environment.name}</Text>
        <Text style={styles.infoDescription}>{environment.description}</Text>
        <View style={styles.infoStats}>
          <Text style={styles.infoStat}>Objects: {environment.objects.length}</Text>
          <Text style={styles.infoStat}>
            Interactive: {environment.objects.filter(o => o.interactive).length}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  selectorCard: {
    margin: SPACING.lg,
    padding: SPACING.md,
  },
  selectorTitle: {
    ...TYPOGRAPHY.h5,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  environmentButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  environmentButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  environmentButtonText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '500',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
  objectInfo: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    maxWidth: 200,
  },
  objectInfoCard: {
    padding: SPACING.md,
  },
  objectInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  objectInfoTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  objectInfoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: SPACING.xs,
  },
  infoCard: {
    margin: SPACING.lg,
    padding: SPACING.md,
  },
  infoTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  infoDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontSize: 13,
  },
  infoStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  infoStat: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '500',
  },
});

export default EnvironmentVisualization;