import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HapticFeedback from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';

interface SettingsSection {
  title: string;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'action' | 'navigation' | 'theme';
  icon: string;
  color: string;
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

const EnhancedSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<{ [key: string]: any }>({
    darkMode: true,
    hapticFeedback: true,
    soundEffects: true,
    notifications: true,
    autoSave: true,
    cameraQuality: 'high',
    dataPrivacy: true,
    analyticsOptIn: false,
  });

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'cyberpunk'>('cyberpunk');
  
  const headerAnimation = useSharedValue(0);
  const sectionsAnimation = useSharedValue(0);

  useEffect(() => {
    loadSettings();
    animateIn();
  }, []);

  const animateIn = () => {
    headerAnimation.value = withSpring(1, { damping: 10 });
    sectionsAnimation.value = withTiming(1, { duration: 800 });
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleToggle = (settingId: string, value: boolean) => {
    HapticFeedback.trigger('impactLight');
    const newSettings = { ...settings, [settingId]: value };
    saveSettings(newSettings);
  };

  const handleThemeChange = (theme: 'dark' | 'light' | 'cyberpunk') => {
    HapticFeedback.trigger('impactMedium');
    setCurrentTheme(theme);
    // Here you would update your theme context
  };

  const handleDataExport = () => {
    HapticFeedback.trigger('impactMedium');
    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'LeRobot Format', onPress: () => exportData('lerobot') },
        { text: 'JSON', onPress: () => exportData('json') },
        { text: 'CSV', onPress: () => exportData('csv') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const exportData = (format: string) => {
    // Simulate data export
    Alert.alert('Export Started', `Exporting data in ${format.toUpperCase()} format...`);
  };

  const handleResetApp = () => {
    HapticFeedback.trigger('impactHeavy');
    Alert.alert(
      'Reset App',
      'This will clear all data and reset the app to default settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => performReset() },
      ]
    );
  };

  const performReset = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Reset Complete', 'App has been reset to default settings.');
    } catch (error) {
      Alert.alert('Reset Failed', 'Unable to reset app data.');
    }
  };

  const settingsSections: SettingsSection[] = [
    {
      title: 'Appearance',
      items: [
        {
          id: 'darkMode',
          title: 'Dark Mode',
          subtitle: 'Use dark theme interface',
          type: 'toggle',
          icon: 'moon',
          color: '#4C51BF',
          value: settings.darkMode,
          onToggle: (value) => handleToggle('darkMode', value),
        },
        {
          id: 'theme',
          title: 'Theme Selection',
          subtitle: 'Choose your preferred theme',
          type: 'theme',
          icon: 'color-palette',
          color: '#8B5CF6',
        },
      ],
    },
    {
      title: 'Experience',
      items: [
        {
          id: 'hapticFeedback',
          title: 'Haptic Feedback',
          subtitle: 'Feel vibrations on interactions',
          type: 'toggle',
          icon: 'phone-vibrate',
          color: '#10B981',
          value: settings.hapticFeedback,
          onToggle: (value) => handleToggle('hapticFeedback', value),
        },
        {
          id: 'soundEffects',
          title: 'Sound Effects',
          subtitle: 'Play audio feedback',
          type: 'toggle',
          icon: 'volume-high',
          color: '#F59E0B',
          value: settings.soundEffects,
          onToggle: (value) => handleToggle('soundEffects', value),
        },
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive updates and alerts',
          type: 'toggle',
          icon: 'notifications',
          color: '#EF4444',
          value: settings.notifications,
          onToggle: (value) => handleToggle('notifications', value),
        },
      ],
    },
    {
      title: 'Recording',
      items: [
        {
          id: 'autoSave',
          title: 'Auto-Save Sessions',
          subtitle: 'Automatically save recording sessions',
          type: 'toggle',
          icon: 'save',
          color: '#06B6D4',
          value: settings.autoSave,
          onToggle: (value) => handleToggle('autoSave', value),
        },
        {
          id: 'cameraQuality',
          title: 'Camera Quality',
          subtitle: 'High quality recording (uses more storage)',
          type: 'navigation',
          icon: 'camera',
          color: '#84CC16',
          onPress: () => Alert.alert('Camera Quality', 'Current: High\nOptions: Low, Medium, High'),
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          id: 'dataPrivacy',
          title: 'Data Encryption',
          subtitle: 'Encrypt stored training data',
          type: 'toggle',
          icon: 'shield-checkmark',
          color: '#8B5CF6',
          value: settings.dataPrivacy,
          onToggle: (value) => handleToggle('dataPrivacy', value),
        },
        {
          id: 'analyticsOptIn',
          title: 'Analytics',
          subtitle: 'Help improve the app with usage data',
          type: 'toggle',
          icon: 'analytics',
          color: '#F97316',
          value: settings.analyticsOptIn,
          onToggle: (value) => handleToggle('analyticsOptIn', value),
        },
        {
          id: 'exportData',
          title: 'Export Data',
          subtitle: 'Download your training data',
          type: 'action',
          icon: 'download',
          color: '#06B6D4',
          onPress: handleDataExport,
        },
      ],
    },
    {
      title: 'Advanced',
      items: [
        {
          id: 'about',
          title: 'About',
          subtitle: 'Version 1.0.0 • Build 2024.08.17',
          type: 'navigation',
          icon: 'information-circle',
          color: '#6B7280',
          onPress: () => Alert.alert('About', 'Humanoid Training Platform v1.0.0\nBuilt with React Native & Expo'),
        },
        {
          id: 'reset',
          title: 'Reset App',
          subtitle: 'Clear all data and reset to defaults',
          type: 'action',
          icon: 'refresh',
          color: '#EF4444',
          onPress: handleResetApp,
        },
      ],
    },
  ];

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerAnimation.value,
    transform: [
      {
        translateY: interpolate(headerAnimation.value, [0, 1], [-50, 0]),
      },
    ],
  }));

  const sectionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sectionsAnimation.value,
  }));

  const renderThemeSelector = () => (
    <View style={styles.themeSelector}>
      <Text style={styles.themeSelectorTitle}>Theme Options</Text>
      <View style={styles.themeOptions}>
        {[
          { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#00F5FF', '#FF00FF'] },
          { id: 'dark', name: 'Dark', colors: ['#1F2937', '#374151'] },
          { id: 'light', name: 'Light', colors: ['#F9FAFB', '#E5E7EB'] },
        ].map((theme) => (
          <TouchableOpacity
            key={theme.id}
            style={[
              styles.themeOption,
              currentTheme === theme.id && styles.themeOptionActive,
            ]}
            onPress={() => handleThemeChange(theme.id as any)}
          >
            <LinearGradient colors={theme.colors} style={styles.themePreview} />
            <Text style={styles.themeOptionText}>{theme.name}</Text>
            {currentTheme === theme.id && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
        
        {item.type === 'theme' && renderThemeSelector()}
      </View>
      
      <View style={styles.settingAction}>
        {item.type === 'toggle' && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#374151', true: `${item.color}40` }}
            thumbColor={item.value ? item.color : '#9CA3AF'}
          />
        )}
        {item.type === 'navigation' && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        )}
        {item.type === 'action' && (
          <Ionicons name="arrow-forward" size={20} color={item.color} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={10} />
      
      {/* Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your experience</Text>
      </Animated.View>

      {/* Settings Sections */}
      <Animated.View style={sectionsAnimatedStyle}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <GlassCard style={styles.sectionCard}>
                {section.items.map((item, itemIndex) => (
                  <View key={item.id}>
                    {renderSettingItem(item)}
                    {itemIndex < section.items.length - 1 && <View style={styles.separator} />}
                  </View>
                ))}
              </GlassCard>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made with care for the robotics community
            </Text>
            <View style={styles.footerIcons}>
              <Ionicons name="heart" size={16} color={COLORS.error} />
              <MaterialCommunityIcons name="robot" size={16} color={COLORS.primary} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  settingAction: {
    marginLeft: SPACING.md,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: SPACING.lg + 48 + SPACING.md,
  },
  themeSelector: {
    marginTop: SPACING.md,
  },
  themeSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  themeOptions: {
    gap: SPACING.sm,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  themeOptionActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  themePreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: SPACING.sm,
  },
  themeOptionText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  footerIcons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});

export default EnhancedSettingsScreen;