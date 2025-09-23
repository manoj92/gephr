import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants/theme';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
}

const Logo: React.FC<LogoProps> = ({ size = 60, style }) => {
  const logoSize = size;
  const innerCircleSize = logoSize * 0.7;
  const eyeSize = logoSize * 0.12;
  const smileWidth = logoSize * 0.3;

  return (
    <View style={[styles.container, { width: logoSize, height: logoSize }, style]}>
      {/* Outer teal ring */}
      <View
        style={[
          styles.outerCircle,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 2
          }
        ]}
      />

      {/* Inner white circle */}
      <View
        style={[
          styles.innerCircle,
          {
            width: innerCircleSize,
            height: innerCircleSize,
            borderRadius: innerCircleSize / 2,
            position: 'absolute',
            top: (logoSize - innerCircleSize) / 2,
            left: (logoSize - innerCircleSize) / 2,
          }
        ]}
      />

      {/* Left eye */}
      <View
        style={[
          styles.eye,
          {
            width: eyeSize,
            height: eyeSize,
            borderRadius: eyeSize / 2,
            position: 'absolute',
            top: logoSize * 0.3,
            left: logoSize * 0.35,
          }
        ]}
      />

      {/* Right eye */}
      <View
        style={[
          styles.eye,
          {
            width: eyeSize,
            height: eyeSize,
            borderRadius: eyeSize / 2,
            position: 'absolute',
            top: logoSize * 0.3,
            right: logoSize * 0.35,
          }
        ]}
      />

      {/* Smile */}
      <View
        style={[
          styles.smile,
          {
            width: smileWidth,
            height: smileWidth / 2,
            borderRadius: smileWidth,
            position: 'absolute',
            bottom: logoSize * 0.35,
            left: (logoSize - smileWidth) / 2,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerCircle: {
    backgroundColor: '#2D7D8C',
  },
  innerCircle: {
    backgroundColor: 'white',
  },
  eye: {
    backgroundColor: '#00B4D8',
  },
  smile: {
    backgroundColor: '#00B4D8',
  },
});

export default Logo;