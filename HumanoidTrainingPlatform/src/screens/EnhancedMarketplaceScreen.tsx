import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import HapticFeedback from 'react-native-haptic-feedback';

import { COLORS, SPACING } from '../constants/theme';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { ParticleBackground } from '../components/ui/ParticleBackground';
import { marketplaceService } from '../services/MarketplaceService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 3) / 2;

interface SkillItem {
  id: string;
  name: string;
  creator: string;
  price: number;
  rating: number;
  downloads: number;
  category: string;
  preview: string;
  trending: boolean;
  verified: boolean;
}

const categories = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'manipulation', name: 'Manipulation', icon: 'hand-left' },
  { id: 'navigation', name: 'Navigation', icon: 'navigate' },
  { id: 'interaction', name: 'Interaction', icon: 'people' },
  { id: 'learning', name: 'Learning', icon: 'school' },
];

const mockSkills: SkillItem[] = [
  {
    id: '1',
    name: 'Kitchen Assistant Pro',
    creator: 'RoboChef Labs',
    price: 49.99,
    rating: 4.8,
    downloads: 15234,
    category: 'manipulation',
    preview: 'https://via.placeholder.com/200',
    trending: true,
    verified: true,
  },
  {
    id: '2',
    name: 'Precision Soldering',
    creator: 'TechCraft AI',
    price: 89.99,
    rating: 4.9,
    downloads: 8421,
    category: 'manipulation',
    preview: 'https://via.placeholder.com/200',
    trending: false,
    verified: true,
  },
  {
    id: '3',
    name: 'Warehouse Navigator',
    creator: 'LogiBot Systems',
    price: 129.99,
    rating: 4.7,
    downloads: 23156,
    category: 'navigation',
    preview: 'https://via.placeholder.com/200',
    trending: true,
    verified: false,
  },
  {
    id: '4',
    name: 'Social Greeting Pack',
    creator: 'HumanBot Co',
    price: 29.99,
    rating: 4.5,
    downloads: 41234,
    category: 'interaction',
    preview: 'https://via.placeholder.com/200',
    trending: false,
    verified: true,
  },
];

const EnhancedMarketplaceScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [skills, setSkills] = useState<SkillItem[]>(mockSkills);
  const [featuredSkill, setFeaturedSkill] = useState<SkillItem>(mockSkills[0]);

  const scrollY = useSharedValue(0);
  const headerScale = useSharedValue(1);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 100],
          [0, -50],
          Extrapolate.CLAMP
        ),
      },
      { scale: headerScale.value },
    ],
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.8], Extrapolate.CLAMP),
  }));

  const handleCategorySelect = (categoryId: string) => {
    HapticFeedback.trigger('impactLight');
    setSelectedCategory(categoryId);
    
    if (categoryId === 'all') {
      setSkills(mockSkills);
    } else {
      setSkills(mockSkills.filter(skill => skill.category === categoryId));
    }
  };

  const handleSkillPress = (skill: SkillItem) => {
    HapticFeedback.trigger('impactMedium');
    // Navigate to skill detail
  };

  const renderSkillCard = ({ item }: { item: SkillItem }) => {
    const cardAnimation = useSharedValue(0);
    
    const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        {
          scale: interpolate(
            cardAnimation.value,
            [0, 1],
            [0.95, 1],
            Extrapolate.CLAMP
          ),
        },
      ],
    }));

    useEffect(() => {
      cardAnimation.value = withSpring(1, { damping: 10 });
    }, []);

    return (
      <Animated.View style={[styles.skillCard, cardAnimatedStyle]}>
        <TouchableOpacity onPress={() => handleSkillPress(item)}>
          <GlassCard style={styles.skillCardContent}>
            {/* Skill Preview */}
            <View style={styles.skillPreview}>
              <LinearGradient
                colors={['#8B5CF6', '#6366F1', '#3B82F6']}
                style={styles.previewGradient}
              >
                <MaterialCommunityIcons
                  name="robot"
                  size={48}
                  color="rgba(255,255,255,0.8)"
                />
              </LinearGradient>
              
              {item.trending && (
                <View style={styles.trendingBadge}>
                  <Ionicons name="trending-up" size={12} color="#FFF" />
                  <Text style={styles.trendingText}>HOT</Text>
                </View>
              )}
              
              {item.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                </View>
              )}
            </View>

            {/* Skill Info */}
            <View style={styles.skillInfo}>
              <Text style={styles.skillName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.skillCreator}>{item.creator}</Text>
              
              <View style={styles.skillStats}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.statText}>{item.rating}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="download" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.statText}>{(item.downloads / 1000).toFixed(1)}k</Text>
                </View>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.price}>${item.price}</Text>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ParticleBackground particleCount={15} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <Text style={styles.title}>Skills Marketplace</Text>
          <Text style={styles.subtitle}>Transform your robot's capabilities</Text>
        </Animated.View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <GlassCard style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search skills..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity>
              <Ionicons name="options" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.id ? COLORS.background : COLORS.text}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Skill */}
        <View style={styles.featuredContainer}>
          <Text style={styles.sectionTitle}>Featured Skill</Text>
          <GlassCard style={styles.featuredCard}>
            <LinearGradient
              colors={['#FF0080', '#FF00FF', '#8000FF']}
              style={styles.featuredGradient}
            >
              <View style={styles.featuredContent}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.featuredBadgeText}>FEATURED</Text>
                </View>
                <Text style={styles.featuredName}>{featuredSkill.name}</Text>
                <Text style={styles.featuredCreator}>by {featuredSkill.creator}</Text>
                <View style={styles.featuredStats}>
                  <View style={styles.featuredStat}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.featuredStatText}>{featuredSkill.rating}</Text>
                  </View>
                  <View style={styles.featuredStat}>
                    <Ionicons name="download" size={14} color="#FFF" />
                    <Text style={styles.featuredStatText}>
                      {(featuredSkill.downloads / 1000).toFixed(1)}k
                    </Text>
                  </View>
                  <View style={styles.featuredStat}>
                    <Text style={styles.featuredPrice}>${featuredSkill.price}</Text>
                  </View>
                </View>
                <NeonButton
                  title="Get Now"
                  onPress={() => handleSkillPress(featuredSkill)}
                  variant="secondary"
                  size="medium"
                />
              </View>
            </LinearGradient>
          </GlassCard>
        </View>

        {/* Skills Grid */}
        <View style={styles.skillsContainer}>
          <Text style={styles.sectionTitle}>Popular Skills</Text>
          <FlatList
            data={skills}
            renderItem={renderSkillCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.skillRow}
            scrollEnabled={false}
          />
        </View>

        {/* Upload Your Skill CTA */}
        <View style={styles.ctaContainer}>
          <GlassCard style={styles.ctaCard}>
            <LinearGradient
              colors={['rgba(0, 245, 255, 0.1)', 'rgba(255, 0, 255, 0.1)']}
              style={styles.ctaGradient}
            >
              <MaterialCommunityIcons name="upload" size={48} color={COLORS.primary} />
              <Text style={styles.ctaTitle}>Share Your Skills</Text>
              <Text style={styles.ctaText}>
                Upload your robot behaviors and earn from every download
              </Text>
              <NeonButton
                title="Start Selling"
                onPress={() => {}}
                variant="primary"
                size="large"
              />
            </LinearGradient>
          </GlassCard>
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
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  categoriesContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.text,
    fontSize: 14,
  },
  categoryTextActive: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  featuredContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  featuredCard: {
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: SPACING.lg,
    borderRadius: 20,
  },
  featuredContent: {
    alignItems: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: SPACING.md,
    gap: 4,
  },
  featuredBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuredName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  featuredCreator: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SPACING.md,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredStatText: {
    color: '#FFF',
    fontSize: 14,
  },
  featuredPrice: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skillsContainer: {
    paddingHorizontal: SPACING.lg,
  },
  skillRow: {
    justifyContent: 'space-between',
  },
  skillCard: {
    width: CARD_WIDTH,
    marginBottom: SPACING.md,
  },
  skillCardContent: {
    padding: 0,
    overflow: 'hidden',
  },
  skillPreview: {
    height: 120,
    position: 'relative',
  },
  previewGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0040',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  trendingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  skillInfo: {
    padding: SPACING.md,
  },
  skillName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  skillCreator: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  skillStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ctaContainer: {
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  ctaCard: {
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  ctaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
});

export default EnhancedMarketplaceScreen;