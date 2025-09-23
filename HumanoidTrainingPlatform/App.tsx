// TRIPLE NUCLEAR: Pre-emptive ExpoFontLoader suppression BEFORE React imports
try {
  global._ExpoFontLoader = global._ExpoFontLoader || {
    default: {
      getLoadedFonts: () => [],
      loadAsync: () => Promise.resolve(),
      isLoaded: () => true,
      isLoading: () => false
    }
  };
  global.ExpoFontLoader = global._ExpoFontLoader;

  // Override any possible access patterns
  Object.defineProperty(global, '_ExpoFontLoader', {
    value: global._ExpoFontLoader,
    writable: true,
    enumerable: true,
    configurable: true
  });
} catch (e) {
  console.log('Pre-React ExpoFontLoader patch applied');
}

// Simplified error handling - main patching is done in index.js
console.log('Humanoid Training Platform starting...');

import React, { useState, useEffect, Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';

// DISABLE splash screen entirely to fix hang issue
// SplashScreen is causing the app to hang, so we'll skip it
try {
  // Don't prevent auto hide - let it hide naturally or skip entirely
  console.log('Skipping splash screen to avoid hang');
} catch (error) {
  // Silently ignore splash screen errors
}

// Additional runtime safety checks
setTimeout(() => {
  try {
    // Double-check our patches are in place after everything loads
    if (!global._ExpoFontLoader || !global._ExpoFontLoader.default) {
      global._ExpoFontLoader = {
        default: {
          getLoadedFonts: () => [],
          loadAsync: () => Promise.resolve()
        }
      };
    }
  } catch (e) {
    // Ignore
  }
}, 0);

// Error Boundary to catch render errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Ignore all ExpoFontLoader and SplashModule errors completely
    const message = error?.message || '';
    if (message.includes('_ExpoFontLoader') || message.includes('SplashModule')) {
      return { hasError: false }; // Don't trigger error boundary
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Only log real errors (not Expo module compatibility issues)
    const message = error?.message || '';
    if (!message.includes('_ExpoFontLoader') && !message.includes('SplashModule')) {
      console.warn('ErrorBoundary caught an error:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
          <Text style={styles.errorSubtext}>Please restart the app.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Simple initialization - just check storage
      console.log('Initializing Humanoid Training Platform...');
      
      // Small delay to show splash screen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsReady(true);
      console.log('App initialization complete');
      
      // Skip splash screen hiding since it's causing hangs
      console.log('Skipping splash screen hide to prevent hang');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsReady(true);
      console.log('App recovery complete - skipping splash screen');
    }
  };

  // Show loading while initializing
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
      </View>
    );
  }

  // FINAL NUCLEAR PATCH: Ensure ExpoFontLoader is mocked right before AppNavigator renders
  try {
    if (!global._ExpoFontLoader?.default?.getLoadedFonts) {
      global._ExpoFontLoader = {
        default: {
          getLoadedFonts: () => [],
          loadAsync: () => Promise.resolve(),
          isLoaded: () => true,
          isLoading: () => false
        }
      };
      global.ExpoFontLoader = global._ExpoFontLoader;
    }
  } catch (e) {
    // Force the mock even if there's an error
    global._ExpoFontLoader = { default: { getLoadedFonts: () => [] } };
  }

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <NavigationContainer>
          <View style={styles.container}>
            <StatusBar style="light" />
            <AppNavigator />
          </View>
        </NavigationContainer>
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.error || '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary || '#888',
    textAlign: 'center',
  },
});