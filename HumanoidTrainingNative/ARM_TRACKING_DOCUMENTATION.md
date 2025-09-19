# Full Arm Tracking System for Humanoid Robot Training

## Overview

This implementation provides a comprehensive full arm tracking system designed specifically for training humanoid robots. The system captures complete arm movements including shoulders, elbows, wrists, and hands, converting them to precise robot control commands and LeRobot-compatible training datasets.

## Key Features

### 1. Full Arm Pose Detection
- **Complete arm skeleton**: Tracks shoulder, elbow, wrist, and hand landmarks
- **Dual arm support**: Simultaneous tracking of both left and right arms
- **Joint angle calculation**: Real-time computation of all major arm joint angles
- **3D positioning**: Depth-aware tracking for spatial understanding
- **High precision**: Sub-degree accuracy for joint angles

### 2. Advanced MediaPipe Integration
- **MediaPipe Pose**: Full upper body pose detection
- **MediaPipe Hands**: Detailed hand landmarks (21 points per hand)
- **Real-time processing**: Optimized for mobile performance
- **Adaptive quality**: Dynamic model complexity adjustment
- **Robust tracking**: Handles occlusions and challenging lighting

### 3. Humanoid Robot Optimization
- **Joint angle mapping**: Direct conversion to robot joint commands
- **Action classification**: 15+ arm-specific actions for manipulation tasks
- **Dual arm coordination**: Bimanual task recognition and control
- **Movement smoothing**: Temporal filtering for natural robot motion
- **Safety constraints**: Joint limit enforcement for robot protection

### 4. Enhanced Data Export
- **LeRobot v2.0 compatibility**: Latest dataset format support
- **Arm pose data**: Complete joint angles and 3D positions
- **Robot commands**: Ready-to-use control sequences
- **Temporal synchronization**: Frame-perfect timing for replay
- **Multi-format export**: Standard, compressed, and training-ready formats

## Technical Architecture

### Core Components

#### 1. ArmTrackingService
The main service that orchestrates arm pose detection and tracking:

```typescript
export class ArmTrackingService {
  // Core tracking capabilities
  async processFrame(imageUri: string, timestamp: number): Promise<{
    arms: { left?: ArmPose; right?: ArmPose };
    fullBodyPose?: FullBodyPose;
  }>;

  // Joint angle calculations
  private calculateJointAngles(shoulder, elbow, wrist): JointAngles;

  // Action classification
  private classifyArmAction(arms): string;
}
```

#### 2. Enhanced Type System
Comprehensive type definitions for arm tracking:

```typescript
interface ArmPose {
  side: 'Left' | 'Right';
  shoulder: Keypoint;
  elbow: Keypoint;
  wrist: Keypoint;
  hand: HandPose;
  confidence: number;
  jointAngles: {
    shoulderFlexion: number;    // Forward/backward movement
    shoulderAbduction: number;  // Side movement
    shoulderRotation: number;   // Internal/external rotation
    elbowFlexion: number;       // Elbow bend
    wristFlexion: number;       // Wrist up/down
    wristDeviation: number;     // Wrist side-to-side
  };
  timestamp: number;
}

interface ArmCommand {
  shoulder_angles: [number, number, number];
  elbow_angle: number;
  wrist_angles: [number, number];
  gripper_state: 'open' | 'closed' | 'closing' | 'opening';
  target_position: [number, number, number];
  movement_speed: number;
}
```

#### 3. Visual Overlay System
Real-time arm pose visualization:

- **Arm skeleton rendering**: Connected bone lines between joints
- **Joint indicators**: Color-coded joint markers with confidence
- **Action feedback**: Real-time gesture classification display
- **Dual arm coordination**: Synchronized visualization of both arms
- **Performance metrics**: Frame rate and tracking quality indicators

### Tracking Modes

#### 1. Arms Mode (Default)
- **Focus**: Upper body and arm movements
- **Camera**: Front-facing for self-view
- **Use case**: Manipulation tasks, reaching, grasping
- **Data**: Complete arm joint angles and hand poses

#### 2. Hands Mode (Legacy)
- **Focus**: Detailed hand and finger movements
- **Camera**: Configurable (front/back)
- **Use case**: Fine manipulation, precision tasks
- **Data**: 21-point hand landmarks per hand

#### 3. Full Body Mode
- **Focus**: Complete upper body pose
- **Camera**: Front-facing with wider field of view
- **Use case**: Complex coordinated movements
- **Data**: Full skeleton including torso and head

## Action Classification

### Individual Arm Actions
1. **Reach**: Extension of arm toward target
2. **Retract**: Pulling arm back to body
3. **Lateral Movement**: Side-to-side arm motion
4. **Manipulate**: Fine control and rotation
5. **Reach and Grasp**: Combined reaching with grasping
6. **Retract and Release**: Combined retraction with object release

### Dual Arm Actions
1. **Dual Arm Reach**: Both arms extending simultaneously
2. **Dual Arm Grasp**: Coordinated grasping with both hands
3. **Bimanual Manipulation**: Complex two-handed object control
4. **Asymmetric Coordination**: Different actions per arm

### Hand Actions (Integrated)
1. **Pinch**: Precision grip with thumb and finger
2. **Grasp**: Power grip with full hand
3. **Point**: Directional indication
4. **Open**: Relaxed open hand state
5. **Place**: Controlled object release

## Robot Control Integration

### Joint Mapping
The system provides direct mapping from human arm poses to robot joint commands:

```typescript
// Human joint angles → Robot commands
const robotCommand: ArmCommand = {
  shoulder_angles: [flexion, abduction, rotation],
  elbow_angle: elbowFlexion,
  wrist_angles: [wristFlexion, wristDeviation],
  gripper_state: mapHandToGripper(handAction),
  target_position: [x, y, z],
  movement_speed: calculateSpeed(action)
};
```

### Supported Robot Types
- **Unitree G1**: Humanoid robot with arms
- **Boston Dynamics Spot**: Manipulation arm
- **Tesla Bot**: Full humanoid
- **Custom Robots**: Configurable joint mapping

## Data Format

### LeRobot v2.0 Arm Dataset
```json
{
  "version": "2.0",
  "metadata": {
    "task_name": "arm_manipulation_task",
    "robot_type": "humanoid",
    "recording_mode": "full_arm_tracking",
    "tracking_config": {
      "enable_pose_detection": true,
      "enable_arm_tracking": true,
      "joint_smoothing": 0.8
    }
  },
  "episodes": [
    {
      "frames": [
        {
          "observations": {
            "arms": {
              "left": {
                "shoulder": {"x": 0.3, "y": 0.25, "z": 0.1},
                "elbow": {"x": 0.25, "y": 0.4, "z": 0.05},
                "wrist": {"x": 0.2, "y": 0.55, "z": 0.0},
                "joint_angles": {
                  "shoulder_flexion": 45,
                  "shoulder_abduction": 30,
                  "elbow_flexion": 90
                }
              }
            }
          },
          "actions": {
            "action_type": "left_reach_and_grasp",
            "action_parameters": {
              "arm_commands": {
                "left": {
                  "shoulder_angles": [45, 30, 0],
                  "elbow_angle": 90,
                  "gripper_state": "closing"
                }
              }
            }
          }
        }
      ]
    }
  ]
}
```

## Performance Optimization

### Frame Processing
- **Adaptive frame rate**: 5-30 FPS based on complexity
- **Model complexity**: Three levels (0-2) for speed vs accuracy
- **Selective tracking**: Arms-only mode for better performance
- **Background processing**: Non-blocking pose detection

### Smoothing and Filtering
- **Temporal smoothing**: Configurable joint angle filtering
- **Confidence-based filtering**: Remove low-quality detections
- **Outlier rejection**: Detect and correct impossible movements
- **Prediction**: Fill in missing frames with interpolation

### Memory Management
- **Efficient landmark storage**: Compressed pose data
- **History buffering**: Limited frame history for smoothing
- **Garbage collection**: Automatic cleanup of old data
- **Stream processing**: Real-time without accumulation

## Usage Instructions

### Basic Setup
1. **Select tracking mode**: Choose "Arms" from the mode selector
2. **Position yourself**: Stand facing the camera with arms visible
3. **Start recording**: Begin demonstration of the desired task
4. **Perform movements**: Execute clear, deliberate arm movements
5. **Stop and export**: End recording and export to LeRobot format

### Optimal Recording Conditions
- **Lighting**: Even, bright lighting without harsh shadows
- **Background**: Plain, contrasting background
- **Clothing**: Avoid loose sleeves that obscure arm shape
- **Distance**: 1.5-3 meters from camera for full arm visibility
- **Movements**: Deliberate, controlled movements for best tracking

### Common Tasks
1. **Reaching and Grasping**: Extend arm to target, close gripper
2. **Object Manipulation**: Rotate, move, and position objects
3. **Bimanual Assembly**: Coordinated two-handed tasks
4. **Tool Use**: Using tools and implements
5. **Handovers**: Passing objects between hands

## Troubleshooting

### Tracking Issues
- **Poor detection**: Improve lighting and reduce background clutter
- **Jittery movement**: Enable smoothing and reduce frame rate
- **Missing arms**: Ensure full arm visibility and proper distance
- **Incorrect angles**: Calibrate camera angle and position

### Performance Issues
- **Low frame rate**: Reduce model complexity or resolution
- **High latency**: Enable background processing
- **Memory usage**: Clear episode data regularly
- **Battery drain**: Reduce frame rate and disable unnecessary features

## Development and Customization

### Adding New Actions
```typescript
// Extend action classification
private classifyCustomAction(arm: ArmPose): string {
  // Custom logic for new action types
  if (customCondition(arm)) {
    return 'custom_action';
  }
  return this.classifyIndividualArmAction(arm);
}
```

### Robot Integration
```typescript
// Map to custom robot commands
private createCustomRobotCommand(arm: ArmPose): CustomCommand {
  return {
    joint1: arm.jointAngles.shoulderFlexion,
    joint2: arm.jointAngles.shoulderAbduction,
    joint3: arm.jointAngles.elbowFlexion,
    // ... custom mapping
  };
}
```

### Model Customization
- **Custom pose models**: Load specialized models for specific tasks
- **Fine-tuning**: Adapt detection for specific environments
- **Domain adaptation**: Optimize for specific robot types
- **Transfer learning**: Use existing models as starting points

## Future Enhancements

### Phase 2
- [ ] Real-time robot control integration
- [ ] Advanced gesture recognition
- [ ] Multi-person arm tracking
- [ ] Depth camera integration

### Phase 3
- [ ] Force estimation from visual cues
- [ ] Predictive movement modeling
- [ ] Advanced safety constraints
- [ ] Cloud-based model inference

This comprehensive arm tracking system transforms smartphone cameras into powerful tools for collecting high-quality humanoid robot training data, enabling the development of more capable and natural robotic manipulation skills.