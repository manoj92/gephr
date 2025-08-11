import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Switch, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { authService, User } from '../services/AuthService';
import { marketplaceService } from '../services/MarketplaceService';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    email: '',
  });

  // Settings form state
  const [settings, setSettings] = useState({
    theme: 'dark' as 'dark' | 'light' | 'auto',
    notifications: true,
    dataSharing: false,
    biometricEnabled: false,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // Redirect to login screen
        Alert.alert('Not Authenticated', 'Please sign in to access your profile');
        return;
      }

      setUser(currentUser);
      setEditForm({
        displayName: currentUser.displayName,
        username: currentUser.username,
        email: currentUser.email,
      });
      setSettings({
        theme: currentUser.preferences.theme,
        notifications: currentUser.preferences.notifications,
        dataSharing: currentUser.preferences.dataSharing,
        biometricEnabled: await authService.isBiometricEnabled(),
      });

      // Load earnings and balance
      const [userEarnings, balance] = await Promise.all([
        marketplaceService.getEarnings(currentUser.id),
        marketplaceService.getUserBalance(currentUser.id),
      ]);
      
      setEarnings(userEarnings);
      setUserBalance(balance);
    } catch (error) {
      console.error('Failed to load user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      const updatedUser = await authService.updateProfile({
        displayName: editForm.displayName,
        username: editForm.username,
        email: editForm.email,
      });
      
      setUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
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
    if (!user) return;
    
    const achievements = [
      'First Recording Completed',
      'Marketplace Explorer',
      `Level ${user.stats.level} Trainer`,
      '100+ Training Sessions',
      'Data Contributor',
    ];
    
    Alert.alert(
      'Achievements',
      `🏆 ${achievements.join('\n🏆 ')}\n\nTotal XP: ${user.stats.xp.toLocaleString()}\nReputation: ${user.stats.reputation}`
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
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user.displayName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userLevel}>Level {user.stats.level} Trainer</Text>
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>{user.subscription.type.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>${userBalance.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Earnings</Text>
            <Text style={styles.balanceValue}>${earnings.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.stats.totalRecordings}</Text>
              <Text style={styles.statLabel}>Recordings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.stats.skillsCreated}</Text>
              <Text style={styles.statLabel}>Skills Created</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.stats.xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP Points</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.stats.reputation}</Text>
              <Text style={styles.statLabel}>Reputation</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Record' as never)}>
            <Text style={styles.actionButtonText}>Start Training Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Marketplace' as never)}>
            <Text style={styles.actionButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleViewAchievements}>
            <Text style={styles.actionButtonText}>View Achievements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleTrainingHistory}>
            <Text style={styles.actionButtonText}>Training History</Text>
          </TouchableOpacity>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.displayName}
              onChangeText={(text) => setEditForm({...editForm, displayName: text})}
              placeholder="Enter display name"
            />

            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.username}
              onChangeText={(text) => setEditForm({...editForm, username: text})}
              placeholder="Enter username"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.email}
              onChangeText={(text) => setEditForm({...editForm, email: text})}
              placeholder="Enter email"
              keyboardType="email-address"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
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
    </View>
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
});

export default ProfileScreen;