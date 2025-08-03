import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

interface Skill {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  downloads: number;
  creator: string;
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  thumbnail: string;
  tags: string[];
}

const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'Kitchen Helper Pro',
    description: 'Advanced cooking and food preparation skills for home robots',
    price: 49.99,
    rating: 4.8,
    downloads: 1250,
    creator: 'ChefBot Studios',
    category: 'Household',
    difficulty: 3,
    thumbnail: '🍳',
    tags: ['cooking', 'food prep', 'kitchen'],
  },
  {
    id: '2',
    name: 'Assembly Line Master',
    description: 'Industrial assembly and quality control for factory automation',
    price: 199.99,
    rating: 4.9,
    downloads: 850,
    creator: 'IndustrialAI Corp',
    category: 'Industrial',
    difficulty: 4,
    thumbnail: '🏭',
    tags: ['assembly', 'factory', 'automation'],
  },
  {
    id: '3',
    name: 'Cleaning Specialist',
    description: 'Comprehensive cleaning routines for household and commercial use',
    price: 29.99,
    rating: 4.6,
    downloads: 2100,
    creator: 'CleanBot Labs',
    category: 'Household',
    difficulty: 2,
    thumbnail: '🧹',
    tags: ['cleaning', 'maintenance', 'household'],
  },
  {
    id: '4',
    name: 'Warehouse Logistics',
    description: 'Efficient picking, packing, and inventory management',
    price: 149.99,
    rating: 4.7,
    downloads: 640,
    creator: 'LogiTech Robotics',
    category: 'Logistics',
    difficulty: 3,
    thumbnail: '📦',
    tags: ['logistics', 'warehouse', 'inventory'],
  },
  {
    id: '5',
    name: 'Garden Maintenance',
    description: 'Automated gardening, watering, and plant care routines',
    price: 39.99,
    rating: 4.5,
    downloads: 890,
    creator: 'GreenThumb AI',
    category: 'Outdoor',
    difficulty: 2,
    thumbnail: '🌱',
    tags: ['gardening', 'plants', 'outdoor'],
  },
  {
    id: '6',
    name: 'Security Patrol',
    description: 'Advanced security monitoring and patrol behaviors',
    price: 299.99,
    rating: 4.9,
    downloads: 420,
    creator: 'SecureBot Inc',
    category: 'Security',
    difficulty: 5,
    thumbnail: '🛡️',
    tags: ['security', 'patrol', 'monitoring'],
  },
];

const CATEGORIES = ['All', 'Household', 'Industrial', 'Logistics', 'Outdoor', 'Security'];

const MarketplaceScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [userCredits, setUserCredits] = useState(1250);

  const filteredSkills = MOCK_SKILLS.filter(skill => {
    const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handlePurchase = (skill: Skill) => {
    if (userCredits >= skill.price) {
      Alert.alert(
        'Purchase Successful! 🎉',
        `You've successfully purchased "${skill.name}" for $${skill.price}. The skill has been added to your robot.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setUserCredits(prev => prev - skill.price);
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Insufficient Credits',
        `You need $${skill.price} to purchase this skill, but you only have $${userCredits}. Earn more credits by contributing training data!`
      );
    }
  };

  const handleUploadSkill = () => {
    Alert.alert(
      'Upload Your Skill',
      'Ready to monetize your robot training data? Upload your skill to the marketplace and start earning!',
      [
        { text: 'Learn More', onPress: () => console.log('Learn more about uploading') },
        { text: 'Upload Now', onPress: () => console.log('Upload skill') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getDifficultyStars = (difficulty: number) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  const SkillCard: React.FC<{ skill: Skill }> = ({ skill }) => (
    <View style={styles.skillCard}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceElevated]}
        style={styles.skillCardGradient}
      >
        <View style={styles.skillHeader}>
          <Text style={styles.skillThumbnail}>{skill.thumbnail}</Text>
          <View style={styles.skillInfo}>
            <Text style={styles.skillName}>{skill.name}</Text>
            <Text style={styles.skillCreator}>by {skill.creator}</Text>
            <Text style={styles.skillCategory}>{skill.category}</Text>
          </View>
          <View style={styles.skillPrice}>
            <Text style={styles.priceText}>${skill.price}</Text>
          </View>
        </View>

        <Text style={styles.skillDescription}>{skill.description}</Text>

        <View style={styles.skillMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Rating:</Text>
            <Text style={styles.metaValue}>⭐ {skill.rating}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Downloads:</Text>
            <Text style={styles.metaValue}>{skill.downloads.toLocaleString()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Difficulty:</Text>
            <Text style={styles.metaValue}>{getDifficultyStars(skill.difficulty)}</Text>
          </View>
        </View>

        <View style={styles.skillTags}>
          {skill.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => handlePurchase(skill)}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.purchaseButtonGradient}
          >
            <Text style={styles.purchaseButtonText}>Purchase Skill</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏪 Skills Marketplace</Text>
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsText}>💰 ${userCredits}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Upload Button */}
      <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSkill}>
        <LinearGradient
          colors={[COLORS.accent, COLORS.accentSecondary]}
          style={styles.uploadButtonGradient}
        >
          <Text style={styles.uploadButtonText}>📤 Upload Your Skill</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Skills List */}
      <ScrollView style={styles.skillsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsText}>
          {filteredSkills.length} skills found
        </Text>
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  creditsContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  creditsText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  categoriesContainer: {
    paddingLeft: SPACING.lg,
    marginBottom: SPACING.md,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  uploadButton: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  uploadButtonGradient: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
  },
  skillsList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  resultsText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.md,
  },
  skillCard: {
    marginBottom: SPACING.lg,
  },
  skillCardGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  skillThumbnail: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  skillCreator: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  skillCategory: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  skillPrice: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  priceText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: 'bold',
  },
  skillDescription: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  skillMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  metaValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  tag: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  purchaseButton: {
    borderRadius: BORDER_RADIUS.md,
  },
  purchaseButtonGradient: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
  },
});

export default MarketplaceScreen; 