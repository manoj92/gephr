import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
      
      // Hide splash screen
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsReady(true);
      await SplashScreen.hideAsync();
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

  return (
    <Provider store={store}>
      <NavigationContainer>
        <View style={styles.container}>
          <StatusBar style="light" />
          <AppNavigator />
        </View>
      </NavigationContainer>
    </Provider>
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
});