const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure for MediaPipe and TensorFlow.js
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Handle .wasm files for TensorFlow.js
config.resolver.assetExts.push('wasm');

// Configure module resolution for MediaPipe packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Transform configuration for handling ES modules
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;