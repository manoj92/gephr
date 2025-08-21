/**
 * Enhanced Profile Screen with advanced UI, animations, and interactions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Easing,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { authService, User } from '../services/AuthService';
import { marketplaceService } from '../services/MarketplaceService';
import { AdvancedButton } from '../components/ui/AdvancedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ValidatedTextInput, ValidatedPasswordInput } from '../components/forms/ValidatedInput';
import { useFormValidation, ValidationRules, UserRegistrationSchema } from '../utils/validation';
import { useFloatingAnimation, usePulseAnimation, useShakeAnimation } from '../components/animations/AnimationLibrary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [achievementsVisible, setAchievementsVisible] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Custom animations
  const floatingAnim = useFloatingAnimation();
  const pulseAnim = usePulseAnimation();
  const shakeAnim = useShakeAnimation();
  
  // Form validation
  const {
    values: editForm,
    errors: editErrors,
    touched: editTouched,
    isValid: editFormValid,
    setValue: setEditValue,
    setTouched: setEditTouched,
    submitForm: submitEditForm,
    resetForm: resetEditForm,
  } = useFormValidation(
    {
      displayName: '',
      username: '',
      email: '',
    },
    {
      displayName: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(50)],
      username: [ValidationRules.required(), ValidationRules.minLength(3), ValidationRules.alphanumeric()],
      email: [ValidationRules.required(), ValidationRules.email()],
    }
  );

  // Settings form state
  const [settings, setSettings] = useState({
    theme: 'dark' as 'dark' | 'light' | 'auto',
    notifications: true,
    dataSharing: false,
    biometricEnabled: false,
  });

  useEffect(() => {
    loadUserData();
    
    // Initialize entrance animations
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Continuous subtle rotation for avatar
    const avatarRotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    avatarRotation.start();
    
    return () => avatarRotation.stop();
  }, []);

  const loadUserData = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to access your profile',
          [
            { text: 'Sign In', onPress: () => {/* Navigate to login */} },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      setUser(currentUser);
      
      // Set form values
      setEditValue('displayName', currentUser.displayName);
      setEditValue('username', currentUser.username);
      setEditValue('email', currentUser.email);
      
      setSettings({
        theme: currentUser.preferences.theme,
        notifications: currentUser.preferences.notifications,
        dataSharing: currentUser.preferences.dataSharing,
        biometricEnabled: await authService.isBiometricEnabled(),
      });

      // Load earnings and balance with better error handling
      try {
        const [userEarnings, balance] = await Promise.all([
          marketplaceService.getEarnings(currentUser.id),
          marketplaceService.getUserBalance(currentUser.id),
        ]);
        
        setEarnings(userEarnings);
        setUserBalance(balance);
      } catch (marketplaceError) {
        console.warn('Failed to load marketplace data:', marketplaceError);
        // Don't fail the whole profile load for marketplace data
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      Alert.alert(
        'Connection Error',
        'Failed to load profile data. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => loadUserData(refresh) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    const validation = submitEditForm();
    if (!validation.isValid) {
      // Trigger shake animation for validation errors
      shakeAnim.start();
      Alert.alert(
        'Validation Error',
        'Please fix the errors in the form before saving.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      const updatedUser = await authService.updateProfile({
        displayName: editForm.displayName,
        username: editForm.username,
        email: editForm.email,
      });
      
      setUser(updatedUser);
      setEditModalVisible(false);
      
      // Success animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      
      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully!',
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (error) {
      console.error('Profile update failed:', error);
      shakeAnim.start();
      Alert.alert(
        'Update Failed',
        error instanceof Error ? error.message : 'Failed to update profile. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAccountSettings = () => {
    setSettingsModalVisible(true);
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      // Update user preferences
      await authService.updateProfile({
        preferences: {
          ...user.preferences,
          theme: settings.theme,
          notifications: settings.notifications,
          dataSharing: settings.dataSharing,
        },
      });

      // Handle biometric setting
      if (settings.biometricEnabled !== await authService.isBiometricEnabled()) {
        if (settings.biometricEnabled) {
          const available = await authService.isBiometricAvailable();
          if (!available) {
            Alert.alert('Biometric Not Available', 'Biometric authentication is not available on this device');
            return;
          }
          await authService.enableBiometric();
        } else {
          await authService.disableBiometric();
        }
      }

      setSettingsModalVisible(false);
      Alert.alert('Success', 'Settings updated successfully!');
      loadUserData(); // Refresh user data
    } catch (error) {
      console.error('Settings update failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update settings');
    }
  };

  const handleChangePassword = () => {
    Alert.prompt(
      'Change Password',
      'Enter your current password:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: (currentPassword) => {
            if (currentPassword) {
              Alert.prompt(
                'New Password',
                'Enter your new password:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Change',
                    onPress: async (newPassword) => {
                      if (newPassword) {
                        try {
                          await authService.changePassword(currentPassword, newPassword);
                          Alert.alert('Success', 'Password changed successfully!');
                        } catch (error) {
                          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to change password');
                        }
                      }
                    },
                  },
                ],
                'secure-text'
              );
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleDataExport = async () => {
    if (!user) return;
    
    Alert.alert(
      'Export Data',
      'This will export all your training data, recordings, and marketplace activity. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              // Simulate data export
              await new Promise(resolve => setTimeout(resolve, 2000));
              Alert.alert('Export Complete', 'Your data has been exported and will be available for download shortly.');
            } catch (error) {
              Alert.alert('Export Failed', 'Failed to export your data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              Alert.alert('Signed Out', 'You have been signed out successfully.');
              // Navigate to login screen or reset app state
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out properly');
            }
          }
        }
      ]
    );
  };

  const handleViewAchievements = () => {
    setAchievementsVisible(true);
  };
  
  const renderAchievements = () => {
    if (!user) return null;
    
    const achievements = [
      { title: 'First Steps', description: 'Completed your first recording', icon: 'trophy-outline', unlocked: true },
      { title: 'Marketplace Explorer', description: 'Browsed 10+ skills', icon: 'compass-outline', unlocked: true },
      { title: `Level ${user.stats.level} Trainer`, description: 'Reached training level', icon: 'star-outline', unlocked: true },
      { title: 'Century Club', description: '100+ training sessions', icon: 'medal-outline', unlocked: user.stats.totalRecordings >= 100 },
      { title: 'Data Contributor', description: 'Uploaded valuable datasets', icon: 'cloud-upload-outline', unlocked: user.stats.skillsCreated > 0 },
      { title: 'Reputation Master', description: 'Earned 1000+ reputation', icon: 'shield-checkmark-outline', unlocked: user.stats.reputation >= 1000 },
    ];
    
    return (
      <Modal
        visible={achievementsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAchievementsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.achievementsModal} intensity={80}>
            <View style={styles.achievementsHeader}>
              <Text style={styles.achievementsTitle}>Achievements</Text>
              <TouchableOpacity
                onPress={() => setAchievementsVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.achievementsList}>
              {achievements.map((achievement, index) => (
                <Animated.View
                  key={achievement.title}
                  style={[
                    styles.achievementItem,
                    !achievement.unlocked && styles.achievementLocked,
                    {
                      transform: [
                        {
                          scale: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, achievement.unlocked ? 1.02 : 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={[
                    styles.achievementIcon,
                    achievement.unlocked && styles.achievementIconUnlocked
                  ]}>
                    <Ionicons
                      name={achievement.icon as any}
                      size={24}
                      color={achievement.unlocked ? COLORS.primary : COLORS.textSecondary}
                    />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={[
                      styles.achievementTitle,
                      !achievement.unlocked && styles.achievementTitleLocked
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                  </View>
                  {achievement.unlocked && (
                    <View style={styles.unlockedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    </View>
                  )}
                </Animated.View>
              ))}
            </ScrollView>
            
            <View style={styles.achievementsFooter}>
              <Text style={styles.xpText}>Total XP: {user.stats.xp.toLocaleString()}</Text>
              <Text style={styles.reputationText}>Reputation: {user.stats.reputation}</Text>
            </View>
          </GlassCard>
        </View>
      </Modal>
    );
  };

  const handleTrainingHistory = () => {
    if (!user) return;
    
    Alert.alert(
      'Training History',
      `📊 Training Sessions: ${user.stats.totalRecordings}\n⏱️ Total Time: ${Math.round(user.stats.totalTrainingTime / 3600000)}h\n🤖 Skills Created: ${user.stats.skillsCreated}\n💰 Skills Purchased: ${user.stats.skillsPurchased}`
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Please sign in to access your profile</Text>
        <TouchableOpacity style={styles.signInButton} onPress={() => {/* Navigate to sign in */}}>
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUserData(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Profile Card */}
        <GlassCard style={styles.profileCard} intensity={60}>
          <LinearGradient
            colors={[COLORS.primary + '20', 'transparent']}
            style={styles.profileGradient}
          />
          <Animated.View 
            style={[
              styles.avatarContainer,
              {
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
            </LinearGradient>
            <View style={styles.statusIndicator}>
              <View style={styles.onlineStatus} />
            </View>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.userInfo,
              {
                transform: [
                  {
                    translateY: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.userName}>{user.displayName}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.levelContainer}>
              <Ionicons name="star" size={16} color={COLORS.primary} />
              <Text style={styles.userLevel}>Level {user.stats.level} Trainer</Text>
            </View>
            
            <View style={styles.subscriptionContainer}>
              <LinearGradient
                colors={user.subscription.type === 'premium' ? [COLORS.primary, COLORS.secondary] : [COLORS.border, COLORS.surface]}
                style={styles.subscriptionBadge}
              >
                <Ionicons 
                  name={user.subscription.type === 'premium' ? 'diamond' : 'person'} 
                  size={12} 
                  color={user.subscription.type === 'premium' ? COLORS.background : COLORS.text} 
                />
                <Text style={[
                  styles.subscriptionText,
                  { color: user.subscription.type === 'premium' ? COLORS.background : COLORS.text }
                ]}>
                  {user.subscription.type.toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </GlassCard>

        {/* Enhanced Balance Cards */}
        <View style={styles.balanceContainer}>
          <GlassCard style={styles.balanceCard} intensity={40}>
            <LinearGradient
              colors={[COLORS.primary + '20', 'transparent']}
              style={styles.balanceGradient}
            />
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
            <Text style={styles.balanceLabel}>Balance</Text>
            <Animated.Text 
              style={[
                styles.balanceValue,
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              ${userBalance.toFixed(2)}
            </Animated.Text>
            <Text style={styles.balanceSubtext}>Available</Text>
          </GlassCard>
          
          <GlassCard style={styles.balanceCard} intensity={40}>
            <LinearGradient
              colors={[COLORS.success + '20', 'transparent']}
              style={styles.balanceGradient}
            />
            <Ionicons name="trending-up-outline" size={24} color={COLORS.success} />
            <Text style={styles.balanceLabel}>Earnings</Text>
            <Animated.Text 
              style={[
                styles.balanceValue,
                { color: COLORS.success },
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              ${earnings.toFixed(2)}
            </Animated.Text>
            <Text style={styles.balanceSubtext}>Total earned</Text>
          </GlassCard>
        </View>

        {/* Enhanced Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <TouchableOpacity onPress={handleViewAchievements}>
              <Ionicons name="trophy-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            {[
              { value: user.stats.totalRecordings, label: 'Recordings', icon: 'videocam-outline', color: COLORS.primary },
              { value: user.stats.skillsCreated, label: 'Skills Created', icon: 'construct-outline', color: COLORS.secondary },
              { value: user.stats.xp.toLocaleString(), label: 'XP Points', icon: 'star-outline', color: COLORS.warning },
              { value: user.stats.reputation, label: 'Reputation', icon: 'shield-checkmark-outline', color: COLORS.success },
            ].map((stat, index) => (
              <Animated.View
                key={stat.label}
                style={[
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.02],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <GlassCard style={styles.statCard} intensity={30}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Enhanced Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <AdvancedButton
              variant="primary"
              size="large"
              onPress={() => navigation.navigate('Record' as never)}
              style={styles.actionButton}
              effectType="glow"
            >
              <Ionicons name="videocam" size={20} color={COLORS.background} />
              <Text style={styles.actionButtonText}>Start Training</Text>
            </AdvancedButton>
            
            <AdvancedButton
              variant="secondary"
              size="large"
              onPress={() => navigation.navigate('Marketplace' as never)}
              style={styles.actionButton}
              effectType="ripple"
            >
              <Ionicons name="storefront" size={20} color={COLORS.text} />
              <Text style={[styles.actionButtonText, { color: COLORS.text }]}>Marketplace</Text>
            </AdvancedButton>
            
            <AdvancedButton
              variant="secondary"
              size="large"
              onPress={handleViewAchievements}
              style={styles.actionButton}
              effectType="morph"
            >
              <Ionicons name="trophy" size={20} color={COLORS.text} />
              <Text style={[styles.actionButtonText, { color: COLORS.text }]}>Achievements</Text>
            </AdvancedButton>
            
            <AdvancedButton
              variant="secondary"
              size="large"
              onPress={handleTrainingHistory}
              style={styles.actionButton}
              effectType="liquid"
            >
              <Ionicons name="analytics" size={20} color={COLORS.text} />
              <Text style={[styles.actionButtonText, { color: COLORS.text }]}>History</Text>
            </AdvancedButton>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleAccountSettings}>
            <Text style={styles.settingText}>Account Settings</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <Text style={styles.settingText}>Change Password</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleDataExport}>
            <Text style={styles.settingText}>Export My Data</Text>
            <Text style={styles.settingArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Render Achievements Modal */}
      {renderAchievements()}

      {/* Enhanced Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <ValidatedTextInput
              label="Display Name"
              value={editForm.displayName}
              onChangeText={(text) => setEditValue('displayName', text)}
              onBlur={() => setEditTouched('displayName')}
              placeholder="Enter your display name"
              rules={[ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(50)]}
              required
              style={styles.inputContainer}
            />

            <ValidatedTextInput
              label="Username"
              value={editForm.username}
              onChangeText={(text) => setEditValue('username', text)}
              onBlur={() => setEditTouched('username')}
              placeholder="Enter your username"
              rules={[ValidationRules.required(), ValidationRules.minLength(3), ValidationRules.alphanumeric()]}
              required
              autoCapitalize="none"
              style={styles.inputContainer}
            />

            <ValidatedTextInput
              label="Email"
              value={editForm.email}
              onChangeText={(text) => setEditValue('email', text)}
              onBlur={() => setEditTouched('email')}
              placeholder="Enter your email address"
              rules={[ValidationRules.required(), ValidationRules.email()]}
              required
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputContainer}
            />

            <View style={styles.modalButtons}>
              <AdvancedButton
                variant="secondary"
                size="large"
                onPress={() => {
                  setEditModalVisible(false);
                  resetEditForm();
                }}
                style={styles.modalButton}
                effectType="ripple"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AdvancedButton>
              
              <AdvancedButton
                variant="primary"
                size="large"
                onPress={handleSaveProfile}
                style={styles.modalButton}
                effectType="glow"
                disabled={!editFormValid}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </AdvancedButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Account Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Theme</Text>
              <View style={styles.themeButtons}>
                {(['dark', 'light', 'auto'] as const).map((theme) => (
                  <TouchableOpacity
                    key={theme}
                    style={[styles.themeButton, settings.theme === theme && styles.themeButtonSelected]}
                    onPress={() => setSettings({...settings, theme})}
                  >
                    <Text style={[styles.themeButtonText, settings.theme === theme && styles.themeButtonTextSelected]}>
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={settings.notifications}
                onValueChange={(value) => setSettings({...settings, notifications: value})}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Data Sharing</Text>
              <Switch
                value={settings.dataSharing}
                onValueChange={(value) => setSettings({...settings, dataSharing: value})}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Biometric Login</Text>
              <Switch
                value={settings.biometricEnabled}
                onValueChange={(value) => setSettings({...settings, biometricEnabled: value})}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setSettingsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  signInButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  editButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  userName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  userLevel: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  subscriptionBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  subscriptionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  balanceCard: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  balanceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  balanceValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  statsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    flex: 0.48,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    fontWeight: 'bold',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: SPACING.xl,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  actionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: SPACING.xl,
  },
  settingItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  settingArrow: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontSize: 18,
  },
  logoutSection: {
    marginBottom: SPACING.xl,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  logoutButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  inputLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  themeButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  themeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  themeButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  themeButtonTextSelected: {
    color: COLORS.background,
  },
  // Achievements Modal Styles
  achievementsModal: {
    width: '90%',
    maxHeight: '80%',
    padding: SPACING.xl,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  achievementsTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SPACING.sm,
  },
  achievementsList: {
    maxHeight: screenHeight * 0.5,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface + '80',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border + '40',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  achievementIconUnlocked: {
    backgroundColor: COLORS.primary + '20',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  achievementTitleLocked: {
    color: COLORS.textSecondary,
  },
  achievementDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  unlockedBadge: {
    marginLeft: SPACING.sm,
  },
  achievementsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
  },
  xpText: {
    ...TYPOGRAPHY.body,
    color: COLORS.warning,
    fontWeight: '600',
  },
  reputationText: {
    ...TYPOGRAPHY.body,
    color: COLORS.success,
    fontWeight: '600',
  },
});

export default ProfileScreen;