import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../lib/ThemeContext';
import { api, STORE_INFO } from '../lib/api';
import ProductCard from '../components/ProductCard';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const result = await api.getSpecials(12);
      setFeaturedProducts(result || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeaturedProducts();
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { query: searchQuery });
    }
  };

  const categories = [
    { name: 'Fruit & Veg', icon: '🍎', color: '#4CAF50' },
    { name: 'Dairy & Eggs', icon: '🥛', color: '#2196F3' },
    { name: 'Meat & Seafood', icon: '🥩', color: '#F44336' },
    { name: 'Bakery', icon: '🍞', color: '#FF9800' },
    { name: 'Pantry', icon: '🥫', color: '#9C27B0' },
    { name: 'Frozen', icon: '🧊', color: '#00BCD4' },
    { name: 'Beverages', icon: '🥤', color: '#3F51B5' },
    { name: 'Snacks', icon: '🍪', color: '#E91E63' },
    { name: 'Household', icon: '🧹', color: '#607D8B' },
    { name: 'Personal Care', icon: '🧴', color: '#795548' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image
            source={{ uri: 'https://customer-assets.emergentagent.com/job_grocerysaver-2/artifacts/jf8ef6cp_image.png' }}
            style={styles.logo}
          />
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={24}
              color={isDark ? '#FFD700' : '#333'}
            />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Find the best{' '}
          <Text style={{ color: theme.colors.primary }}>grocery deals</Text>
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Compare prices across 5 major Australian stores
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for groceries..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Store Badges */}
      <View style={styles.storesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Compare across</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(STORE_INFO).map(([key, store]) => (
            <View key={key} style={[styles.storeBadge, { backgroundColor: store.color }]}>
              <Text style={styles.storeName}>{store.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={[styles.categoryCard, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate('Search', { category: cat.name })}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryName, { color: theme.colors.text }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Featured Products */}
      <View style={styles.featuredContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Featured Deals</Text>
        {featuredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>

      {/* Ad Placeholder */}
      <View style={styles.adPlaceholder}>
        <Ionicons name="megaphone-outline" size={24} color="#999" />
        <Text style={styles.adText}>Ad Space - 320×50</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  themeButton: {
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  storesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  storeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  storeName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '31%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuredContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  adPlaceholder: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adText: {
    color: '#999',
    marginTop: 8,
    fontSize: 12,
  },
});
