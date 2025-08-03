import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet, Text } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import RecordingScreen from '../screens/RecordingScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import RobotScreen from '../screens/RobotScreen';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
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
            tabBarIcon: () => <View style={styles.tabIcon}><Text>🏠</Text></View>,
          }}
        />
        <Tab.Screen
          name="Record"
          component={RecordingScreen}
          options={{
            tabBarIcon: () => <View style={styles.tabIcon}><Text>📹</Text></View>,
          }}
        />
        <Tab.Screen
          name="Marketplace"
          component={MarketplaceScreen}
          options={{
            tabBarIcon: () => <View style={styles.tabIcon}><Text>🏪</Text></View>,
          }}
        />
        <Tab.Screen
          name="Robot"
          component={RobotScreen}
          options={{
            tabBarIcon: () => <View style={styles.tabIcon}><Text>🤖</Text></View>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    height: 80,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator; 