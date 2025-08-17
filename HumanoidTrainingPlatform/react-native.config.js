const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * React Native Configuration for Humanoid Training Platform
 * Configures native modules, dependencies, and platform-specific settings
 */

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    // Exclude Expo modules that may conflict with native React Native
    'expo': {
      platforms: {
        android: {
          sourceDir: null,
        },
        ios: {
          sourceDir: null,
        },
      },
    },
    // Configure react-native-vision-camera for native builds
    'react-native-vision-camera': {
      platforms: {
        ios: {
          project: 'VisionCamera.xcodeproj',
        },
        android: {
          sourceDir: '../node_modules/react-native-vision-camera/android',
          packageImportPath: 'import io.mrousavy.camera.CameraPackage;',
        },
      },
    },
    // Configure react-native-reanimated
    'react-native-reanimated': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-reanimated/android',
          packageImportPath: 'import com.swmansion.reanimated.ReanimatedPackage;',
        },
        ios: {
          project: 'RNReanimated.xcodeproj',
        },
      },
    },
    // Configure gesture handler
    'react-native-gesture-handler': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-gesture-handler/android',
          packageImportPath: 'import com.swmansion.gesturehandler.RNGestureHandlerPackage;',
        },
        ios: {
          project: 'RNGestureHandler.xcodeproj',
        },
      },
    },
  },
  assets: ['./assets/fonts/', './assets/icons/'],
};