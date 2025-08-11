import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { marketplaceService } from '../services/MarketplaceService';
import { SkillListing, RobotType } from '../types';

const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation();
  const [skills, setSkills] = useState<SkillListing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRobotType, setSelectedRobotType] = useState<RobotType | ''>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [userBalance, setUserBalance] = useState(0);

  const currentUserId = 'user_current'; // In real app, get from auth context

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [skillsData, categoriesData, balance] = await Promise.all([
        marketplaceService.getFeaturedSkills(),
        marketplaceService.getPopularCategories(),
        marketplaceService.getUserBalance(currentUserId),
      ]);
      
      setSkills(skillsData);
      setCategories(categoriesData);
      setUserBalance(balance);
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
      Alert.alert('Error', 'Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await marketplaceService.searchSkills(searchQuery);
      setSkills(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRobotType) filters.robotType = selectedRobotType;
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
      if (searchQuery) filters.searchQuery = searchQuery;

      const filteredSkills = await marketplaceService.getSkills(filters);
      setSkills(filteredSkills);
      setShowFilters(false);
    } catch (error) {
      console.error('Filter failed:', error);
      Alert.alert('Error', 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedRobotType('');
    setMaxPrice('');
    setSearchQuery('');
    loadData();
    setShowFilters(false);
  };

  const handleSkillPress = (skill: SkillListing) => {
    Alert.alert(
      skill.title,
      `${skill.description}\n\nPrice: $${skill.price}\nRating: ${skill.rating.toFixed(1)}\nDownloads: ${skill.downloads}\nDataset Size: ${skill.datasetSize}GB`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Purchase', onPress: () => handlePurchaseSkill(skill) }
      ]
    );
  };

  const handlePurchaseSkill = async (skill: SkillListing) => {
    if (userBalance < skill.price) {
      Alert.alert('Insufficient Balance', `You need $${(skill.price - userBalance).toFixed(2)} more to purchase this skill.`);
      return;
    }

    try {
      Alert.alert(
        'Confirm Purchase',
        `Purchase "${skill.title}" for $${skill.price}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Purchase', 
            onPress: async () => {
              try {
                await marketplaceService.purchaseSkill(skill.id, currentUserId);
                const newBalance = await marketplaceService.getUserBalance(currentUserId);
                setUserBalance(newBalance);
                Alert.alert('Success', `${skill.title} purchased successfully! Dataset download will begin shortly.`);
                loadData(); // Refresh to update download counts
              } catch (error) {
                Alert.alert('Purchase Failed', error instanceof Error ? error.message : 'Purchase failed');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Purchase failed');
    }
  };

  const handleUploadSkill = () => {
    Alert.alert('Upload Skill', 'Skill upload functionality allows you to monetize your training data. Coming soon!');
  };

  const handleMySkills = async () => {
    try {
      const [purchases, uploaded, earnings] = await Promise.all([
        marketplaceService.getUserPurchases(currentUserId),
        marketplaceService.getUserUploadedSkills(currentUserId),
        marketplaceService.getEarnings(currentUserId),
      ]);
      
      Alert.alert(
        'My Skills',
        `Purchased: ${purchases.length} skills\nUploaded: ${uploaded.length} skills\nEarnings: $${earnings.toFixed(2)}`
      );
    } catch (error) {
      console.error('Failed to load user skills:', error);
      Alert.alert('Error', 'Failed to load your skills');
    }
  };

  const handleCategoryPress = async (category: string) => {
    try {
      setLoading(true);
      const categorySkills = await marketplaceService.getSkillsByCategory(category);
      setSkills(categorySkills);
      setSelectedCategory(category);
    } catch (error) {
      console.error('Category filter failed:', error);
      Alert.alert('Error', 'Failed to filter by category');
    } finally {
      setLoading(false);
    }
  };

  const renderSkillCard = (skill: SkillListing) => (
    <TouchableOpacity 
      key={skill.id} 
      style={styles.skillCard}
      onPress={() => handleSkillPress(skill)}
    >
      {skill.thumbnailUrl && (
        <Image source={{ uri: skill.thumbnailUrl }} style={styles.skillThumbnail} />
      )}
      <View style={styles.skillHeader}>
        <Text style={styles.skillName}>{skill.title}</Text>
        <Text style={styles.skillPrice}>${skill.price}</Text>
      </View>
      <Text style={styles.skillDescription} numberOfLines={2}>{skill.description}</Text>
      <View style={styles.skillTags}>
        {skill.tags.slice(0, 3).map(tag => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={styles.skillStats}>
        <Text style={styles.skillRating}>★ {skill.rating.toFixed(1)}</Text>
        <Text style={styles.skillDownloads}>{skill.downloads} downloads</Text>
        <Text style={styles.skillSize}>{skill.datasetSize}GB</Text>
      </View>
      <View style={styles.skillRobotTypes}>
        <Text style={styles.robotTypesLabel}>Compatible:</Text>
        <Text style={styles.robotTypes} numberOfLines={1}>
          {skill.robotTypes.map(type => type.replace('_', ' ')).join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Skills</Text>
          
          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity 
              style={[styles.filterOption, selectedCategory === '' && styles.filterOptionSelected]}
              onPress={() => setSelectedCategory('')}
            >
              <Text style={styles.filterOptionText}>All</Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity 
                key={category}
                style={[styles.filterOption, selectedCategory === category && styles.filterOptionSelected]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={styles.filterOptionText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Robot Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity 
              style={[styles.filterOption, selectedRobotType === '' && styles.filterOptionSelected]}
              onPress={() => setSelectedRobotType('')}
            >
              <Text style={styles.filterOptionText}>All</Text>
            </TouchableOpacity>
            {(['unitree_g1', 'boston_dynamics', 'tesla_bot', 'custom'] as RobotType[]).map(type => (
              <TouchableOpacity 
                key={type}
                style={[styles.filterOption, selectedRobotType === type && styles.filterOptionSelected]}
                onPress={() => setSelectedRobotType(type)}
              >
                <Text style={styles.filterOptionText}>{type.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Max Price ($)</Text>
          <TextInput
            style={styles.priceInput}
            value={maxPrice}
            onChangeText={setMaxPrice}
            placeholder="Enter max price"
            keyboardType="numeric"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Skills Marketplace</Text>
          <Text style={styles.balance}>Balance: ${userBalance.toFixed(2)}</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search skills..."
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleUploadSkill}>
            <Text style={styles.primaryButtonText}>Upload Skill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleMySkills}>
            <Text style={styles.secondaryButtonText}>My Skills</Text>
          </TouchableOpacity>
        </View>

        {categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoriesGrid}>
                {categories.map((category) => (
                  <TouchableOpacity 
                    key={category} 
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonSelected
                    ]}
                    onPress={() => handleCategoryPress(category)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category && styles.categoryButtonTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.skillsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory} Skills` : 'Featured Skills'}
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loading} />
          ) : skills.length > 0 ? (
            skills.map(renderSkillCard)
          ) : (
            <Text style={styles.noResults}>No skills found</Text>
          )}
        </View>
      </ScrollView>
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
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
  balance: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
  },
  searchButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  filterButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
  },
  filterButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  actionSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    textAlign: 'center',
  },
  categoriesSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  categoryButton: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  categoryButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  categoryButtonTextSelected: {
    color: COLORS.background,
  },
  skillsSection: {
    marginBottom: SPACING.xl,
  },
  skillCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  skillThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  skillName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  skillPrice: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  skillDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  tagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontSize: 12,
  },
  skillStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  skillRating: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  skillDownloads: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  skillSize: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  skillRobotTypes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  robotTypesLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
  },
  robotTypes: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  loading: {
    marginVertical: SPACING.xl,
  },
  noResults: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.xl,
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
  filterLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  categoryScroll: {
    marginBottom: SPACING.md,
  },
  filterOption: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  priceInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  clearButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  clearButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    textAlign: 'center',
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  applyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
});

export default MarketplaceScreen;