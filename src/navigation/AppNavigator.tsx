import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

// Import screens (we'll create these next)
import HomeScreen from '../screens/HomeScreen';
import RecordingScreen from '../screens/RecordingScreen';
import MappingScreen from '../screens/MappingScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import RobotScreen from '../screens/RobotScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size: number;
}

const AnimatedTabIcon: React.FC<TabIconProps> = ({ name, focused, color, size }) => {
  const scale = useSharedValue(focused ? 1 : 0.8);
  const opacity = useSharedValue(focused ? 1 : 0.6);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.2 : 1, {
      damping: 15,
      stiffness: 200,
    });
    opacity.value = withSpring(focused ? 1 : 0.6);
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
        <Ionicons 
          name={name} 
          size={size} 
          color={focused ? COLORS.primary : color} 
        />
        {focused && <View style={styles.glowEffect} />}
      </View>
    </Animated.View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Animated.View key={route.key} style={styles.tabItem}>
            <Animated.View
              style={[
                styles.tabButton,
                isFocused && styles.tabButtonFocused,
              ]}
            >
              <Animated.Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabPressable}
              >
                {options.tabBarIcon({ focused: isFocused })}
              </Animated.Pressable>
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name="home"
              focused={focused}
              color={COLORS.textSecondary}
              size={24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name="videocam"
              focused={focused}
              color={COLORS.textSecondary}
              size={24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MappingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name="map"
              focused={focused}
              color={COLORS.textSecondary}
              size={24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name="storefront"
              focused={focused}
              color={COLORS.textSecondary}
              size={24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Robot"
        component={RobotScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name="hardware-chip"
              focused={focused}
              color={COLORS.textSecondary}
              size={24}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              name="person"
              focused={focused}
              color={COLORS.textSecondary}
              size={24}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                    extrapolate: Extrapolate.CLAMP,
                  }),
                },
              ],
            },
          }),
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    elevation: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabButton: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonFocused: {
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerFocused: {
    // Additional styling for focused icons
  },
  glowEffect: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    opacity: 0.2,
    transform: [{ scale: 1.5 }],
  },
});

export default AppNavigator; 