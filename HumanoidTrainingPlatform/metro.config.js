const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure for MediaPipe and TensorFlow.js
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Handle .wasm files for TensorFlow.js
config.resolver.assetExts.push('wasm');

// Configure module resolution for MediaPipe packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// NUCLEAR APPROACH: Completely exclude ExpoFontLoader from the bundle
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block any ExpoFontLoader and SplashScreen related modules
  if (moduleName && typeof moduleName === 'string' && (
      moduleName.includes('ExpoFontLoader') ||
      moduleName.includes('expo-font') ||
      moduleName.includes('expo-splash-screen') ||
      moduleName.includes('SplashModule') ||
      moduleName.includes('@expo/vector-icons/build/vendor/react-native-vector-icons/lib/react-native-vector-icons')
  )) {
    // Return a mock module instead
    return {
      type: 'sourceFile',
      filePath: require.resolve('./mock-expo-font-loader.js')
    };
  }

  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Transform configuration for handling ES modules
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;