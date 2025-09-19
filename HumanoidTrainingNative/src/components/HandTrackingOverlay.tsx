import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HandPose, HandKeypoint } from '../types';
import { COLORS } from '../constants/theme';

interface HandTrackingOverlayProps {
  handPoses: HandPose[];
  cameraWidth: number;
  cameraHeight: number;
  shirtPocketMode?: boolean;
}

const HandTrackingOverlay: React.FC<HandTrackingOverlayProps> = ({
  handPoses,
  cameraWidth,
  cameraHeight,
  shirtPocketMode = false,
}) => {
  if (!handPoses || handPoses.length === 0) {
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

    // Map action to icon or visualization
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
      {/* Shirt pocket mode indicator */}
      {shirtPocketMode && handPoses.length === 0 && (
        <View style={styles.shirtPocketGuide}>
          <View style={styles.detectionZone} />
        </View>
      )}

      {handPoses.map((handPose, index) => (
        <React.Fragment key={`hand-overlay-${index}`}>
          {/* Hand bounding box */}
          {renderHandBoundingBox(handPose, index)}

          {/* Hand landmarks */}
          {renderHandLandmarks(handPose, index)}

          {/* Gesture indicator */}
          {renderGestureIndicator(handPose, index)}

          {/* Confidence indicator */}
          {handPose.confidence > 0 && (
            <View
              style={[
                styles.confidenceBar,
                {
                  width: handPose.confidence * 50,
                  left: 10 + index * 60,
                  backgroundColor: handPose.confidence > 0.8 ? COLORS.success : COLORS.warning,
                }
              ]}
            />
          )}
        </React.Fragment>
      ))}
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
});

export default HandTrackingOverlay;