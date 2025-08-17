import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Mesh, Vector3, Quaternion, BufferGeometry, Material } from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { HandPose, RobotState } from '../../types';
import { COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface AROverlayProps {
  handPoses: HandPose[];
  robotState?: RobotState;
  showHandSkeleton: boolean;
  showRobotModel: boolean;
  showTrajectory: boolean;
  showEnvironmentMesh: boolean;
  cameraIntrinsics: {
    fx: number;
    fy: number;
    cx: number;
    cy: number;
  };
}

interface HandJoint {
  position: Vector3;
  confidence: number;
  type: 'fingertip' | 'joint' | 'palm';
}

interface TrajectoryPoint {
  position: Vector3;
  timestamp: number;
  confidence: number;
}

export const ARVisualizationOverlay: React.FC<AROverlayProps> = ({
  handPoses,
  robotState,
  showHandSkeleton,
  showRobotModel,
  showTrajectory,
  showEnvironmentMesh,
  cameraIntrinsics
}) => {
  const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>([]);
  const [environmentMesh, setEnvironmentMesh] = useState<BufferGeometry | null>(null);
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    // Update trajectory when hand poses change
    if (handPoses.length > 0 && showTrajectory) {
      const newPoints = handPoses.map(pose => ({
        position: new Vector3(
          pose.landmarks[8].x, // Index fingertip
          pose.landmarks[8].y,
          pose.landmarks[8].z
        ),
        timestamp: pose.timestamp.getTime(),
        confidence: pose.confidence
      }));

      setTrajectoryPoints(prev => {
        const combined = [...prev, ...newPoints];
        // Keep only last 100 points
        return combined.slice(-100);
      });
    }
  }, [handPoses, showTrajectory]);

  const projectToScreen = (worldPos: Vector3): { x: number; y: number } => {
    // Project 3D world coordinates to 2D screen coordinates
    const { fx, fy, cx, cy } = cameraIntrinsics;
    
    const x = (worldPos.x * fx) / worldPos.z + cx;
    const y = (worldPos.y * fy) / worldPos.z + cy;
    
    return { x, y };
  };

  const HandSkeletonComponent = ({ pose }: { pose: HandPose }) => {
    const handConnections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm connections
    ];

    return (
      <group>
        {/* Hand joints */}
        {pose.landmarks.map((landmark, index) => {
          const position = new Vector3(landmark.x, landmark.y, landmark.z);
          const isFingertip = [4, 8, 12, 16, 20].includes(index);
          
          return (
            <mesh key={index} position={position}>
              <sphereGeometry args={[isFingertip ? 0.008 : 0.005, 8, 8]} />
              <meshBasicMaterial
                color={isFingertip ? COLORS.secondary : COLORS.primary}
                transparent
                opacity={landmark.confidence}
              />
            </mesh>
          );
        })}
        
        {/* Hand connections */}
        {handConnections.map(([start, end], index) => {
          const startPos = new Vector3(
            pose.landmarks[start].x,
            pose.landmarks[start].y,
            pose.landmarks[start].z
          );
          const endPos = new Vector3(
            pose.landmarks[end].x,
            pose.landmarks[end].y,
            pose.landmarks[end].z
          );
          
          const direction = new Vector3().subVectors(endPos, startPos);
          const length = direction.length();
          const center = new Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
          
          return (
            <mesh key={index} position={center}>
              <cylinderGeometry args={[0.002, 0.002, length, 8]} />
              <meshBasicMaterial
                color={COLORS.accent}
                transparent
                opacity={0.7}
              />
            </mesh>
          );
        })}
        
        {/* Gesture indicator */}
        <mesh position={[pose.landmarks[0].x, pose.landmarks[0].y - 0.1, pose.landmarks[0].z]}>
          <planeGeometry args={[0.1, 0.03]} />
          <meshBasicMaterial color={COLORS.success} transparent opacity={0.8} />
        </mesh>
      </group>
    );
  };

  const RobotModelComponent = ({ state }: { state: RobotState }) => {
    const robotRef = useRef<Mesh>(null);
    
    useFrame(() => {
      if (robotRef.current && state.position && state.orientation) {
        robotRef.current.position.set(
          state.position.x,
          state.position.y,
          state.position.z
        );
        
        robotRef.current.quaternion.set(
          state.orientation.x,
          state.orientation.y,
          state.orientation.z,
          state.orientation.w
        );
      }
    });

    return (
      <group ref={robotRef}>
        {/* Robot body (simplified representation) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.2]} />
          <meshBasicMaterial color={COLORS.primary} transparent opacity={0.7} />
        </mesh>
        
        {/* Robot head */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={COLORS.secondary} transparent opacity={0.7} />
        </mesh>
        
        {/* Robot arms */}
        <mesh position={[-0.3, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.3, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.7} />
        </mesh>
        
        {/* Robot legs */}
        <mesh position={[-0.15, -0.6, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.15, -0.6, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.7} />
        </mesh>
        
        {/* Joint indicators */}
        {state.jointStates && Object.entries(state.jointStates).map(([joint, angle], index) => (
          <mesh key={joint} position={[
            (index % 3 - 1) * 0.2,
            Math.floor(index / 3) * 0.2 - 0.2,
            0.15
          ]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial
              color={angle > 45 ? COLORS.error : COLORS.success}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    );
  };

  const TrajectoryComponent = ({ points }: { points: TrajectoryPoint[] }) => {
    if (points.length < 2) return null;

    return (
      <group>
        {points.map((point, index) => {
          if (index === 0) return null;
          
          const prevPoint = points[index - 1];
          const direction = new Vector3().subVectors(point.position, prevPoint.position);
          const length = direction.length();
          const center = new Vector3().addVectors(point.position, prevPoint.position).multiplyScalar(0.5);
          
          const age = (Date.now() - point.timestamp) / 1000; // Age in seconds
          const opacity = Math.max(0.1, 1 - age / 10); // Fade over 10 seconds
          
          return (
            <mesh key={index} position={center}>
              <cylinderGeometry args={[0.003, 0.003, length, 6]} />
              <meshBasicMaterial
                color={COLORS.secondary}
                transparent
                opacity={opacity * point.confidence}
              />
            </mesh>
          );
        })}
        
        {/* Trajectory points */}
        {points.map((point, index) => (
          <mesh key={`point-${index}`} position={point.position}>
            <sphereGeometry args={[0.005, 6, 6]} />
            <meshBasicMaterial
              color={COLORS.primary}
              transparent
              opacity={point.confidence}
            />
          </mesh>
        ))}
      </group>
    );
  };

  const EnvironmentMeshComponent = () => {
    if (!environmentMesh) return null;

    return (
      <mesh geometry={environmentMesh}>
        <meshBasicMaterial
          color={COLORS.background}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    );
  };

  const CoordinateAxes = () => (
    <group>
      {/* X-axis (red) */}
      <mesh position={[0.05, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Y-axis (green) */}
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshBasicMaterial color="green" />
      </mesh>
      
      {/* Z-axis (blue) */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </group>
  );

  const InfoPanel = () => (
    <View style={styles.infoPanel}>
      <Text style={styles.infoText}>
        Hands: {handPoses.length} | 
        Confidence: {handPoses.length > 0 ? 
          (handPoses[0].confidence * 100).toFixed(1) + '%' : 'N/A'}
      </Text>
      <Text style={styles.infoText}>
        Trajectory Points: {trajectoryPoints.length}
      </Text>
      {robotState && (
        <Text style={styles.infoText}>
          Robot: {robotState.status} | 
          Battery: {robotState.battery ? robotState.battery.toFixed(1) + '%' : 'N/A'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        camera={{
          position: [0, 0, 1],
          fov: 60,
          near: 0.01,
          far: 100
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 0, 1]} intensity={0.8} />
        
        {/* Coordinate system */}
        <CoordinateAxes />
        
        {/* Hand skeletons */}
        {showHandSkeleton && handPoses.map((pose, index) => (
          <HandSkeletonComponent key={index} pose={pose} />
        ))}
        
        {/* Robot model */}
        {showRobotModel && robotState && (
          <RobotModelComponent state={robotState} />
        )}
        
        {/* Trajectory visualization */}
        {showTrajectory && (
          <TrajectoryComponent points={trajectoryPoints} />
        )}
        
        {/* Environment mesh */}
        {showEnvironmentMesh && <EnvironmentMeshComponent />}
      </Canvas>
      
      <InfoPanel />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  canvas: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    minWidth: 200,
  },
  infoText: {
    color: COLORS.white,
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default ARVisualizationOverlay;