import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';

const mockMarketplaceSkills = [
  { id: 1, name: 'Object Grasping Fundamentals', price: 'Free', rating: 4.8, downloads: 1234 },
  { id: 2, name: 'Advanced Assembly Techniques', price: '$49.99', rating: 4.9, downloads: 456 },
  { id: 3, name: 'Household Task Assistant', price: 'Free', rating: 4.3, downloads: 3456 },
];

export default function MarketplaceScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Skill Marketplace</Text>
          <Text style={styles.subtitle}>Buy, Sell & Share Robot Skills</Text>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills..."
            placeholderTextColor="#666"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>🔽 Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {['All', 'Manipulation', 'Navigation', 'Interaction', 'Custom'].map(category => (
            <TouchableOpacity 
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.selectedCategory]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Skills</Text>
          {mockMarketplaceSkills.map(skill => (
            <View key={skill.id} style={styles.skillCard}>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillStats}>
                  ⭐ {skill.rating} • 📥 {skill.downloads.toLocaleString()} downloads
                </Text>
                <View style={styles.skillPricing}>
                  <Text style={styles.skillPrice}>{skill.price}</Text>
                  <TouchableOpacity style={styles.downloadButton}>
                    <Text style={styles.downloadButtonText}>
                      {skill.price === 'Free' ? 'Download' : 'Buy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Your Contributions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Contributions</Text>
          <TouchableOpacity style={styles.contributionCard}>
            <Text style={styles.contributionTitle}>📤 Upload New Skill</Text>
            <Text style={styles.contributionSubtitle}>Share your training data with the community</Text>
          </TouchableOpacity>
          
          <View style={styles.earningsCard}>
            <Text style={styles.earningsTitle}>💰 Your Earnings</Text>
            <Text style={styles.earningsAmount}>$47.32</Text>
            <Text style={styles.earningsDetails}>from 3 skill sales this month</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, color: '#00E5FF', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#B0B0B0', textAlign: 'center' },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: '#1A1A1A', color: '#FFFFFF', padding: 12, borderRadius: 8, marginRight: 12 },
  filterButton: { backgroundColor: '#00E5FF', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: '#0A0A0A', fontSize: 14, fontWeight: '600' },
  categoriesContainer: { paddingHorizontal: 20, marginBottom: 20 },
  categoryChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  selectedCategory: { backgroundColor: '#00E5FF' },
  categoryText: { color: '#FFFFFF', fontSize: 14 },
  selectedCategoryText: { color: '#0A0A0A' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginBottom: 12 },
  skillCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12 },
  skillInfo: { flex: 1 },
  skillName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  skillStats: { color: '#808080', fontSize: 12, marginBottom: 8 },
  skillPricing: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillPrice: { color: '#00E5FF', fontSize: 16, fontWeight: 'bold' },
  downloadButton: { backgroundColor: '#00E5FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  downloadButtonText: { color: '#0A0A0A', fontSize: 12, fontWeight: '600' },
  contributionCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  contributionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  contributionSubtitle: { color: '#808080', fontSize: 12, textAlign: 'center' },
  earningsCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' },
  earningsTitle: { color: '#FFFFFF', fontSize: 14, marginBottom: 8 },
  earningsAmount: { color: '#00E5FF', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  earningsDetails: { color: '#808080', fontSize: 12 },
});