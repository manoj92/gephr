import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  level: number;
  totalCredits: number;
  dataContributed: number; // in GB
  skillsPurchased: number;
  skillsCreated: number;
  robotsConnected: number;
  achievements: Achievement[];
  preferences: UserPreferences;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserPreferences {
  notifications: boolean;
  autoSync: boolean;
  dataQuality: 'low' | 'medium' | 'high';
  shareAnonymousData: boolean;
  preferredRobotType: string;
}

const MOCK_USER: UserProfile = {
  id: 'user_001',
  username: 'RobotTrainer92',
  email: 'trainer@humanoidplatform.com',
  level: 12,
  totalCredits: 1247.50,
  dataContributed: 2.3,
  skillsPurchased: 8,
  skillsCreated: 3,
  robotsConnected: 2,
  achievements: [
    {
      id: 'ach1',
      title: 'First Steps',
      description: 'Complete your first recording session',
      icon: 'Baby',
      unlockedAt: new Date('2024-01-15'),
      rarity: 'common',
    },
    {
      id: 'ach2',
      title: 'Data Contributor',
      description: 'Upload 1GB of training data',
      icon: 'Disk',
      unlockedAt: new Date('2024-02-20'),
      rarity: 'rare',
    },
    {
      id: 'ach3',
      title: 'Robot Whisperer',
      description: 'Successfully connect to 5 different robots',
      icon: 'Robot',
      unlockedAt: new Date('2024-03-01'),
      rarity: 'epic',
    },
  ],
  preferences: {
    notifications: true,
    autoSync: false,
    dataQuality: 'high',
    shareAnonymousData: true,
    preferredRobotType: 'unitree_g1',
  },
};

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<UserProfile>(MOCK_USER);
  const [showAchievements, setShowAchievements] = useState(false);

  const handleEditProfile = () => {
    Alert.alert(
      'Edit Profile',
      'Choose what to edit',
      [
        { text: 'Username', onPress: () => console.log('Edit username') },
        { text: 'Email', onPress: () => console.log('Edit email') },
        { text: 'Preferences', onPress: () => console.log('Edit preferences') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Download your training data in LeRobot format?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: () => {
            Alert.alert('Success!', 'Your data has been exported successfully.');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => console.log('Account deletion requested')
        }
      ]
    );
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setUser(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }));
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return COLORS.textSecondary;
      case 'rare': return COLORS.info;
      case 'epic': return COLORS.accent;
      case 'legendary': return COLORS.primary;
      default: return COLORS.text;
    }
  };

  const getExperienceProgress = () => {
    const currentLevelXP = user.level * 1000;
    const nextLevelXP = (user.level + 1) * 1000;
    const userXP = user.dataContributed * 500 + user.skillsCreated * 200; // Mock XP calculation
    const progress = ((userXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={[COLORS.primary + '20', COLORS.primaryDark + '10']}
            style={styles.profileGradient}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>R</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv.{user.level}</Text>
              </View>
            </View>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            
            <View style={styles.xpContainer}>
              <Text style={styles.xpLabel}>Experience to next level:</Text>
              <View style={styles.xpBar}>
                <View 
                  style={[styles.xpFill, { width: `${getExperienceProgress()}%` }]} 
                />
              </View>
              <Text style={styles.xpText}>{getExperienceProgress().toFixed(0)}%</Text>
            </View>

            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${user.totalCredits.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Credits</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.dataContributed} GB</Text>
              <Text style={styles.statLabel}>Data Contributed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.skillsPurchased}</Text>
              <Text style={styles.statLabel}>Skills Purchased</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.skillsCreated}</Text>
              <Text style={styles.statLabel}>Skills Created</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.robotsConnected}</Text>
              <Text style={styles.statLabel}>Robots Connected</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.achievements.length}</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setShowAchievements(!showAchievements)}
          >
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.expandIcon}>
              {showAchievements ? 'v' : '>'}
            </Text>
          </TouchableOpacity>
          
          {showAchievements && (
            <View style={styles.achievementsList}>
              {user.achievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementTitle, { color: getRarityColor(achievement.rarity) }]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    <Text style={styles.achievementDate}>
                      Unlocked: {achievement.unlockedAt.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferencesList}>
            <View style={styles.preferenceItem}>
              <View>
                <Text style={styles.preferenceLabel}>Notifications</Text>
                <Text style={styles.preferenceDescription}>
                  Receive alerts about robot status and earnings
                </Text>
              </View>
              <Switch
                value={user.preferences.notifications}
                onValueChange={(value) => updatePreference('notifications', value)}
                trackColor={{ false: COLORS.backgroundSecondary, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
            </View>

            <View style={styles.preferenceItem}>
              <View>
                <Text style={styles.preferenceLabel}>Auto Sync</Text>
                <Text style={styles.preferenceDescription}>
                  Automatically upload training data
                </Text>
              </View>
              <Switch
                value={user.preferences.autoSync}
                onValueChange={(value) => updatePreference('autoSync', value)}
                trackColor={{ false: COLORS.backgroundSecondary, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
            </View>

            <View style={styles.preferenceItem}>
              <View>
                <Text style={styles.preferenceLabel}>Share Anonymous Data</Text>
                <Text style={styles.preferenceDescription}>
                  Help improve the platform for everyone
                </Text>
              </View>
              <Switch
                value={user.preferences.shareAnonymousData}
                onValueChange={(value) => updatePreference('shareAnonymousData', value)}
                trackColor={{ false: COLORS.backgroundSecondary, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
            </View>

            <TouchableOpacity style={styles.preferenceItem}>
              <View>
                <Text style={styles.preferenceLabel}>Data Quality</Text>
                <Text style={styles.preferenceDescription}>
                  Current: {user.preferences.dataQuality.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.preferenceArrow}>></Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.preferenceItem}>
              <View>
                <Text style={styles.preferenceLabel}>Preferred Robot</Text>
                <Text style={styles.preferenceDescription}>
                  {user.preferences.preferredRobotType.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.preferenceArrow}>></Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
              <Text style={styles.actionText}>Export Training Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Privacy Policy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Contact Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>About App</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.dangerButton]} 
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.actionText, styles.dangerText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  profileGradient: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    fontSize: 80,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  levelText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  username: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  xpLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  xpBar: {
    width: '80%',
    height: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.xs,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs,
  },
  xpText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  editButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  expandIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  achievementsList: {
    gap: SPACING.md,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  achievementDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  achievementDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
  },
  preferencesList: {
    gap: SPACING.sm,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  preferenceLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  preferenceDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  preferenceArrow: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  actionsList: {
    gap: SPACING.sm,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: COLORS.error,
  },
  dangerText: {
    color: COLORS.error,
  },
});

export default ProfileScreen; 