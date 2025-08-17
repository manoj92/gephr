/**
 * Enhanced Marketplace Screen with advanced UI and animations
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
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';
import { marketplaceService } from '../services/MarketplaceService';
import { SkillListing, RobotType } from '../types';
import { AdvancedButton } from '../components/ui/AdvancedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ValidatedTextInput } from '../components/forms/ValidatedInput';
import { useFieldValidation, ValidationRules } from '../utils/validation';
import { Draggable, SwipeableCard } from '../components/interactions/GestureSystem';
import { useParticleSystem, useFloatingAnimation, usePulseAnimation } from '../components/animations/AnimationLibrary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation();
  const [skills, setSkills] = useState<SkillListing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRobotType, setSelectedRobotType] = useState<RobotType | ''>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [userBalance, setUserBalance] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'downloads' | 'recent'>('rating');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Custom hooks for animations
  const floatingAnim = useFloatingAnimation();
  const pulseAnim = usePulseAnimation();
  const particles = useParticleSystem(10);
  
  // Validation
  const searchValidation = useFieldValidation(searchQuery, [ValidationRules.maxLength(100)]);
  const priceValidation = useFieldValidation(maxPrice, [ValidationRules.pattern(/^\d*\.?\d*$/, 'Please enter a valid price')]);

  const currentUserId = 'user_current'; // In real app, get from auth context

  useEffect(() => {
    loadData();
    
    // Initialize entrance animations
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
    ]).start();
    
    // Continuous rotation animation for loading states
    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotationLoop.start();
    
    return () => rotationLoop.stop();
  }, []);

  const loadData = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [skillsData, categoriesData, balance] = await Promise.all([
        marketplaceService.getFeaturedSkills(),
        marketplaceService.getPopularCategories(),
        marketplaceService.getUserBalance(currentUserId),
      ]);
      
      // Apply sorting
      const sortedSkills = sortSkills(skillsData, sortBy);
      
      setSkills(sortedSkills);
      setCategories(categoriesData);
      setUserBalance(balance);
      
      // Animate skill cards entrance
      animateSkillsEntrance();
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
      Alert.alert(
        'Connection Error',
        'Failed to load marketplace data. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: () => loadData(refresh) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const sortSkills = (skillsData: SkillListing[], sortType: typeof sortBy) => {
    return [...skillsData].sort((a, b) => {
      switch (sortType) {
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.rating - a.rating;
        case 'downloads':
          return b.downloads - a.downloads;
        case 'recent':
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        default:
          return 0;
      }
    });
  };
  
  const animateSkillsEntrance = () => {
    const staggerDelay = 100;
    skills.forEach((_, index) => {
      Animated.sequence([
        Animated.delay(index * staggerDelay),
        Animated.spring(new Animated.Value(0), {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
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

  const renderSkillCard = (skill: SkillListing, index: number) => {
    const cardScale = useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      Animated.spring(cardScale, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };
    
    return (
      <SwipeableCard
        key={skill.id}
        onSwipeLeft={() => {
          Alert.alert('Added to Wishlist', `${skill.title} added to your wishlist!`);
        }}
        onSwipeRight={() => handlePurchaseSkill(skill)}
        style={[styles.skillCard, viewMode === 'grid' ? styles.skillCardGrid : styles.skillCardList]}
      >
        <Animated.View style={{ transform: [{ scale: cardScale }] }}>
          <TouchableOpacity
            onPress={() => handleSkillPress(skill)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <GlassCard
              intensity={80}
              style={styles.glassCard}
              borderRadius={16}
              borderWidth={1}
              borderOpacity={0.2}
            >
              {skill.thumbnailUrl && (
                <View style={styles.thumbnailContainer}>
                  <Image source={{ uri: skill.thumbnailUrl }} style={styles.skillThumbnail} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.thumbnailOverlay}
                  />
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{skill.rating.toFixed(1)}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.skillContent}>
                <View style={styles.skillHeader}>
                  <Text style={styles.skillName} numberOfLines={2}>{skill.title}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.skillPrice}>${skill.price}</Text>
                    <Text style={styles.priceLabel}>USD</Text>
                  </View>
                </View>
                
                <Text style={styles.skillDescription} numberOfLines={2}>
                  {skill.description}
                </Text>
                
                <View style={styles.skillTags}>
                  {skill.tags.slice(0, 3).map((tag, tagIndex) => (
                    <Animated.View
                      key={tag}
                      style={[
                        styles.tag,
                        {
                          transform: [
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
                      <Text style={styles.tagText}>{tag}</Text>
                    </Animated.View>
                  ))}
                </View>
                
                <View style={styles.skillStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="download-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.statText}>{skill.downloads}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.statText}>{skill.datasetSize}GB</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.statText}>Updated {skill.updatedAt || 'recently'}</Text>
                  </View>
                </View>
                
                <View style={styles.skillRobotTypes}>
                  <Text style={styles.robotTypesLabel}>Compatible with:</Text>
                  <View style={styles.robotTypesBadges}>
                    {skill.robotTypes.map(type => (
                      <View key={type} style={styles.robotTypeBadge}>
                        <Ionicons
                          name={type === 'unitree_g1' ? 'hardware-chip-outline' : 'construct-outline'}
                          size={12}
                          color={COLORS.secondary}
                        />
                        <Text style={styles.robotTypeText}>
                          {type.replace('_', ' ').replace('unitree g1', 'Unitree G1').replace('custom humanoid', 'Custom')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      </SwipeableCard>
    );
  };

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
            {(['unitree_g1', 'custom_humanoid'] as RobotType[]).map(type => (
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
      {/* Particle System Background */}
      <View style={styles.particleContainer}>
        {particles.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                opacity: particle.opacity,
                transform: [{ scale: particle.scale }],
              },
            ]}
          />
        ))}
      </View>
      
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={[COLORS.primary + '20', 'transparent']}
            style={styles.headerGradient}
          />
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Animated.Text 
                style={[
                  styles.title,
                  {
                    transform: [
                      {
                        translateY: floatingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -5],
                        }),
                      },
                    ],
                  },
                ]}
              >
                Skills Marketplace
              </Animated.Text>
              <Text style={styles.subtitle}>Discover & trade robot skills</Text>
            </View>
            <GlassCard style={styles.balanceCard} intensity={60}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balance}>${userBalance.toFixed(2)}</Text>
            </GlassCard>
          </View>
        </View>

        {/* Enhanced Search and Controls */}
        <View style={styles.searchContainer}>
          <GlassCard style={styles.searchCard} intensity={40}>
            <ValidatedTextInput
              label=""
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search skills, categories, or creators..."
              rules={[ValidationRules.maxLength(100)]}
              style={styles.searchInputContainer}
              inputStyle={styles.searchInput}
              showSuccessIcon={false}
              showErrorIcon={false}
              onSubmitEditing={handleSearch}
            />
            <AdvancedButton
              variant="primary"
              size="medium"
              onPress={handleSearch}
              style={styles.searchButton}
              effectType="ripple"
              disabled={!!searchValidation.error}
            >
              <Ionicons name="search" size={18} color={COLORS.background} />
            </AdvancedButton>
          </GlassCard>
          
          <View style={styles.controlsRow}>
            <AdvancedButton
              variant="secondary"
              size="small"
              onPress={() => setShowFilters(true)}
              style={styles.filterButton}
              effectType="glow"
            >
              <Ionicons name="options-outline" size={16} color={COLORS.text} />
              <Text style={styles.buttonText}>Filter</Text>
            </AdvancedButton>
            
            <AdvancedButton
              variant="secondary"
              size="small"
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              style={styles.viewModeButton}
              effectType="morph"
            >
              <Ionicons 
                name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} 
                size={16} 
                color={COLORS.text} 
              />
            </AdvancedButton>
            
            <AdvancedButton
              variant="secondary"
              size="small"
              onPress={() => {
                const sortOptions = ['rating', 'price', 'downloads', 'recent'] as const;
                const currentIndex = sortOptions.indexOf(sortBy);
                const nextSort = sortOptions[(currentIndex + 1) % sortOptions.length];
                setSortBy(nextSort);
                setSkills(sortSkills(skills, nextSort));
              }}
              style={styles.sortButton}
              effectType="liquid"
            >
              <Ionicons name="swap-vertical-outline" size={16} color={COLORS.text} />
              <Text style={styles.buttonTextSmall}>{sortBy}</Text>
            </AdvancedButton>
          </View>
        </View>

        {/* Enhanced Action Section */}
        <View style={styles.actionSection}>
          <AdvancedButton
            variant="primary"
            size="large"
            onPress={handleUploadSkill}
            style={styles.primaryActionButton}
            effectType="glow"
          >
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.background} />
            <Text style={styles.primaryButtonText}>Upload Skill</Text>
          </AdvancedButton>
          
          <AdvancedButton
            variant="secondary"
            size="large"
            onPress={handleMySkills}
            style={styles.secondaryActionButton}
            effectType="ripple"
          >
            <Ionicons name="library-outline" size={20} color={COLORS.text} />
            <Text style={styles.secondaryButtonText}>My Skills</Text>
          </AdvancedButton>
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

        {/* Enhanced Skills Section */}
        <View style={styles.skillsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? `${selectedCategory} Skills` : 'Featured Skills'}
            </Text>
            <Text style={styles.resultCount}>
              {loading ? 'Loading...' : `${skills.length} skill${skills.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Animated.View
                style={[
                  styles.loadingSpinner,
                  {
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="refresh" size={40} color={COLORS.primary} />
              </Animated.View>
              <Text style={styles.loadingText}>Discovering amazing skills...</Text>
            </View>
          ) : skills.length > 0 ? (
            <FlatList
              data={skills}
              renderItem={({ item, index }) => renderSkillCard(item, index)}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode} // Force re-render when view mode changes
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
              columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
              scrollEnabled={false} // Disable since we're inside a ScrollView
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={60} color={COLORS.textSecondary} />
              <Text style={styles.noResults}>No skills found</Text>
              <Text style={styles.noResultsSubtext}>
                Try adjusting your search terms or filters
              </Text>
            </View>
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
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '600',
  },
});

export default MarketplaceScreen;