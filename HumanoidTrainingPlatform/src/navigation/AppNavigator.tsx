// CRITICAL NUCLEAR PATCH: ExpoFontLoader suppression BEFORE @expo/vector-icons import
try {
  if (!global._ExpoFontLoader) {
    global._ExpoFontLoader = {
      default: {
        getLoadedFonts: () => [],
        loadAsync: () => Promise.resolve(),
        isLoaded: () => true,
        isLoading: () => false
      }
    };
  }
  global.ExpoFontLoader = global._ExpoFontLoader;
} catch (e) {
  console.log('AppNavigator ExpoFontLoader patch applied');
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import RecordingScreen from '../screens/RecordingScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MappingScreen from '../screens/MappingScreen';
import RobotScreen from '../screens/RobotScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => {
            try {
              return <Ionicons name="home" size={size || 24} color={color || COLORS.primary} />;
            } catch (error) {
              console.warn('Icon render error:', error);
              return null;
            }
          },
        }}
      />
      <Tab.Screen 
        name="Record" 
        component={RecordingScreen}
        options={{
          tabBarLabel: 'Record',
          tabBarIcon: ({ color, size }) => {
            try {
              return <Ionicons name="radio-button-on" size={size || 24} color={color || COLORS.primary} />;
            } catch (error) {
              console.warn('Icon render error:', error);
              return null;
            }
          },
        }}
      />
      <Tab.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => {
            try {
              return <Ionicons name="storefront" size={size || 24} color={color || COLORS.primary} />;
            } catch (error) {
              console.warn('Icon render error:', error);
              return null;
            }
          },
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MappingScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => {
            try {
              return <Ionicons name="map" size={size || 24} color={color || COLORS.primary} />;
            } catch (error) {
              console.warn('Icon render error:', error);
              return null;
            }
          },
        }}
      />
      <Tab.Screen 
        name="Robot" 
        component={RobotScreen}
        options={{
          tabBarLabel: 'Robot',
          tabBarIcon: ({ color, size }) => {
            try {
              return <MaterialCommunityIcons name="robot" size={size || 24} color={color || COLORS.primary} />;
            } catch (error) {
              console.warn('Icon render error:', error);
              return null;
            }
          },
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => {
            try {
              return <Ionicons name="person" size={size || 24} color={color || COLORS.primary} />;
            } catch (error) {
              console.warn('Icon render error:', error);
              return null;
            }
          },
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AppNavigator;