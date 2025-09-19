import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { HandPose, ArmPose, FullBodyPose, Keypoint } from '../types';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface HandTrackingOverlayProps {
  handPoses: HandPose[];
  armPoses?: { left?: ArmPose; right?: ArmPose };
  fullBodyPose?: FullBodyPose;
  trackingMode?: 'hands' | 'arms' | 'full_body';
  cameraWidth: number;
  cameraHeight: number;
  shirtPocketMode?: boolean;
}

const HandTrackingOverlay: React.FC<HandTrackingOverlayProps> = ({
  handPoses,
  armPoses = {},
  fullBodyPose,
  trackingMode = 'hands',
  cameraWidth,
  cameraHeight,
  shirtPocketMode = false,
}) => {
  const hasAnyPose = handPoses.length > 0 || armPoses.left || armPoses.right || fullBodyPose;

  if (!hasAnyPose) {
    return null;
  }

  const renderHandLandmarks = (handPose: HandPose, handIndex: number) => {
    const color = handPose.handedness === 'Left' ? COLORS.primary : COLORS.warning;

    return handPose.landmarks.map((landmark, index) => {
      // Apply shirt pocket perspective correction
      let x = landmark.x * cameraWidth;
      let y = landmark.y * cameraHeight;

      if (shirtPocketMode) {
        // Adjust for upward viewing angle
        y = y * 0.9 + cameraHeight * 0.05;
        // Apply slight perspective distortion
        const centerX = cameraWidth / 2;
        const distFromCenter = Math.abs(x - centerX) / centerX;
        y = y - (distFromCenter * 10);
      }

      // Different sizes for different landmark types
      let size = 6;
      let borderSize = 8;
      if (index === 0) {
        size = 10; // Wrist - larger
        borderSize = 12;
      } else if ([4, 8, 12, 16, 20].includes(index)) {
        size = 8; // Fingertips - medium
        borderSize = 10;
      }

      return (
        <React.Fragment key={`hand-${handIndex}-landmark-${index}`}>
          {/* Outer border circle */}
          <View
            style={[
              styles.landmarkBorder,
              {
                left: x - borderSize / 2,
                top: y - borderSize / 2,
                width: borderSize,
                height: borderSize,
                borderRadius: borderSize / 2,
                borderColor: color + '80',
              }
            ]}
          />
          {/* Inner filled circle */}
          <View
            style={[
              styles.landmark,
              {
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
              }
            ]}
          />
        </React.Fragment>
      );
    });
  };

  const renderGestureIndicator = (handPose: HandPose, handIndex: number) => {
    if (!handPose.currentAction || handPose.currentAction === 'none') return null;

    const color = handPose.handedness === 'Left' ? COLORS.primary : COLORS.warning;
    const wrist = handPose.landmarks[0];
    let x = wrist.x * cameraWidth;
    let y = wrist.y * cameraHeight;

    if (shirtPocketMode) {
      y = y * 0.9 + cameraHeight * 0.05;
    }

    const actionColors: { [key: string]: string } = {
      'pinch_close': COLORS.success,
      'grasp': COLORS.warning,
      'place': COLORS.primary,
      'rotate': COLORS.info,
      'move': COLORS.text,
      'point': COLORS.accent,
    };

    const actionColor = actionColors[handPose.currentAction] || color;

    return (
      <View
        key={`gesture-${handIndex}`}
        style={[
          styles.gestureIndicator,
          {
            left: x - 25,
            top: y - 35,
            borderColor: actionColor,
            backgroundColor: actionColor + '20',
          }
        ]}
      />
    );
  };

  const renderArmPose = (armPose: ArmPose, side: 'left' | 'right') => {
    const color = side === 'left' ? COLORS.primary : COLORS.warning;
    const sideIndex = side === 'left' ? 0 : 1;

    return (
      <React.Fragment key={`arm-${side}`}>
        {/* Arm skeleton */}
        {renderArmSkeleton(armPose, color)}

        {/* Joint indicators */}
        {renderJoint(armPose.shoulder, color, 'shoulder')}
        {renderJoint(armPose.elbow, color, 'elbow')}
        {renderJoint(armPose.wrist, color, 'wrist')}

        {/* Hand if available */}
        {armPose.hand && armPose.hand.landmarks.length > 0 && (
          <React.Fragment>
            {renderHandLandmarks(armPose.hand, sideIndex)}
            {renderGestureIndicator(armPose.hand, sideIndex)}
          </React.Fragment>
        )}

        {/* Confidence bar */}
        {renderConfidenceBar(armPose.confidence, sideIndex * 120 + 10)}
      </React.Fragment>
    );
  };

  const renderArmSkeleton = (armPose: ArmPose, color: string) => {
    const shoulder = armPose.shoulder;
    const elbow = armPose.elbow;
    const wrist = armPose.wrist;

    return (
      <React.Fragment>
        {/* Upper arm line */}
        <View style={[
          styles.boneLine,
          {
            left: shoulder.x * cameraWidth,
            top: shoulder.y * cameraHeight,
            width: Math.sqrt(
              Math.pow((elbow.x - shoulder.x) * cameraWidth, 2) +
              Math.pow((elbow.y - shoulder.y) * cameraHeight, 2)
            ),
            transform: [{
              rotate: `${Math.atan2(
                (elbow.y - shoulder.y) * cameraHeight,
                (elbow.x - shoulder.x) * cameraWidth
              )}rad`
            }],
            backgroundColor: color,
          }
        ]} />

        {/* Forearm line */}
        <View style={[
          styles.boneLine,
          {
            left: elbow.x * cameraWidth,
            top: elbow.y * cameraHeight,
            width: Math.sqrt(
              Math.pow((wrist.x - elbow.x) * cameraWidth, 2) +
              Math.pow((wrist.y - elbow.y) * cameraHeight, 2)
            ),
            transform: [{
              rotate: `${Math.atan2(
                (wrist.y - elbow.y) * cameraHeight,
                (wrist.x - elbow.x) * cameraWidth
              )}rad`
            }],
            backgroundColor: color,
          }
        ]} />
      </React.Fragment>
    );
  };

  const renderJoint = (joint: Keypoint, color: string, type: string) => {
    const size = type === 'shoulder' ? 12 : type === 'elbow' ? 10 : 8;

    return (
      <View
        style={[
          styles.joint,
          {
            left: joint.x * cameraWidth - size / 2,
            top: joint.y * cameraHeight - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderColor: color + '80',
          }
        ]}
      />
    );
  };

  const renderFullBodyPose = (pose: FullBodyPose) => {
    return (
      <React.Fragment>
        {/* Torso outline */}
        {renderTorsoSkeleton(pose.torso)}

        {/* Arms if available */}
        {pose.leftArm && renderArmPose(pose.leftArm, 'left')}
        {pose.rightArm && renderArmPose(pose.rightArm, 'right')}
      </React.Fragment>
    );
  };

  const renderTorsoSkeleton = (torso: any) => {
    const shoulderColor = COLORS.info;

    return (
      <React.Fragment>
        {/* Shoulder line */}
        <View style={[
          styles.boneLine,
          {
            left: torso.leftShoulder.x * cameraWidth,
            top: torso.leftShoulder.y * cameraHeight,
            width: Math.sqrt(
              Math.pow((torso.rightShoulder.x - torso.leftShoulder.x) * cameraWidth, 2) +
              Math.pow((torso.rightShoulder.y - torso.leftShoulder.y) * cameraHeight, 2)
            ),
            transform: [{
              rotate: `${Math.atan2(
                (torso.rightShoulder.y - torso.leftShoulder.y) * cameraHeight,
                (torso.rightShoulder.x - torso.leftShoulder.x) * cameraWidth
              )}rad`
            }],
            backgroundColor: shoulderColor,
            height: 3,
          }
        ]} />

        {/* Neck indicator */}
        {renderJoint(torso.neck, shoulderColor, 'neck')}
      </React.Fragment>
    );
  };

  const renderArmInfo = () => {
    const leftActive = armPoses.left ? '✓' : '✗';
    const rightActive = armPoses.right ? '✓' : '✗';

    return (
      <View style={styles.armInfo}>
        <Text style={styles.armInfoText}>L: {leftActive} R: {rightActive}</Text>
        {armPoses.left && (
          <Text style={styles.armInfoDetail}>
            L Elbow: {armPoses.left.jointAngles.elbowFlexion.toFixed(0)}°
          </Text>
        )}
        {armPoses.right && (
          <Text style={styles.armInfoDetail}>
            R Elbow: {armPoses.right.jointAngles.elbowFlexion.toFixed(0)}°
          </Text>
        )}
      </View>
    );
  };

  const renderPoseInfo = (pose: FullBodyPose) => {
    return (
      <View style={styles.poseInfo}>
        <Text style={styles.poseInfoText}>Body: {(pose.confidence * 100).toFixed(0)}%</Text>
      </View>
    );
  };

  const renderConfidenceBar = (confidence: number, leftPosition: number) => {
    return (
      <View
        style={[
          styles.confidenceBar,
          {
            width: confidence * 50,
            left: leftPosition,
            backgroundColor: confidence > 0.8 ? COLORS.success : COLORS.warning,
          }
        ]}
      />
    );
  };

  const renderHandBoundingBox = (handPose: HandPose, handIndex: number) => {
    const color = handPose.handedness === 'Left' ? COLORS.primary : COLORS.warning;

    // Calculate bounding box from landmarks
    let xs = handPose.landmarks.map(l => l.x * cameraWidth);
    let ys = handPose.landmarks.map(l => l.y * cameraHeight);

    if (shirtPocketMode) {
      // Apply perspective correction to bounding box
      ys = ys.map(y => y * 0.9 + cameraHeight * 0.05);
    }

    const minX = Math.min(...xs) - 20;
    const maxX = Math.max(...xs) + 20;
    const minY = Math.min(...ys) - 20;
    const maxY = Math.max(...ys) + 20;

    const width = maxX - minX;
    const height = maxY - minY;

    return (
      <View
        key={`bbox-${handIndex}`}
        style={[
          styles.boundingBox,
          {
            left: minX,
            top: minY,
            width: width,
            height: height,
            borderColor: color + '60',
          }
        ]}
      />
    );
  };

  return (
    <View style={[styles.overlay, { width: cameraWidth, height: cameraHeight }]}>
      {/* Mode-specific guides */}
      {shirtPocketMode && !hasAnyPose && (
        <View style={styles.shirtPocketGuide}>
          <View style={styles.detectionZone} />
        </View>
      )}

      {/* Render based on tracking mode */}
      {trackingMode === 'hands' && handPoses.map((handPose, index) => (
        <React.Fragment key={`hand-overlay-${index}`}>
          {renderHandBoundingBox(handPose, index)}
          {renderHandLandmarks(handPose, index)}
          {renderGestureIndicator(handPose, index)}
          {renderConfidenceBar(handPose.confidence, index * 60 + 10)}
        </React.Fragment>
      ))}

      {/* Arm pose rendering */}
      {(trackingMode === 'arms' || trackingMode === 'full_body') && (
        <React.Fragment>
          {armPoses.left && renderArmPose(armPoses.left, 'left')}
          {armPoses.right && renderArmPose(armPoses.right, 'right')}
          {renderArmInfo()}
        </React.Fragment>
      )}

      {/* Full body pose rendering */}
      {trackingMode === 'full_body' && fullBodyPose && (
        <React.Fragment>
          {renderFullBodyPose(fullBodyPose)}
          {renderPoseInfo(fullBodyPose)}
        </React.Fragment>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 50,
    pointerEvents: 'none',
  },
  landmark: {
    position: 'absolute',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  landmarkBorder: {
    position: 'absolute',
    borderWidth: 1,
    elevation: 4,
  },
  gestureIndicator: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  shirtPocketGuide: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionZone: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
    borderStyle: 'dotted',
    borderRadius: 12,
  },
  confidenceBar: {
    position: 'absolute',
    top: 10,
    height: 4,
    borderRadius: 2,
  },
  boneLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    transformOrigin: '0 50%',
  },
  joint: {
    position: 'absolute',
    borderWidth: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  armInfo: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: COLORS.surface + 'E0',
    padding: SPACING.xs,
    borderRadius: 4,
    minWidth: 80,
  },
  armInfoText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text,
    fontWeight: '600',
  },
  armInfoDetail: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  poseInfo: {
    position: 'absolute',
    top: 40,
    right: 10,
    backgroundColor: COLORS.surface + 'E0',
    padding: SPACING.xs,
    borderRadius: 4,
  },
  poseInfoText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text,
    fontWeight: '600',
  },
});

export default HandTrackingOverlay;