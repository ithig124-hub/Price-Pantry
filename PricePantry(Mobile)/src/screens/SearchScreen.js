import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';

export default function SearchScreen() {
  const route = useRoute();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState(route.params?.query || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('price_low');

  useEffect(() => {
    if (route.params?.query) {
      setSearchQuery(route.params.query);
      searchProducts(route.params.query);
    } else if (route.params?.category) {
      setSearchQuery('');
      searchProducts('', route.params.category);
    } else {
      // Load all products initially
      searchProducts('');
    }
  }, [route.params]);

  const searchProducts = async (query, category = null) => {
    setLoading(true);
    try {
      const options = {
        page_size: 50,
        sort_by: sortBy === 'price_low' ? 'best_price' : sortBy === 'name' ? 'name' : 'best_price',
      };
      
      if (category) {
        options.category = category;
      }
      
      const result = await api.searchProducts(query, options);
      let sortedProducts = result.products || [];
      sortedProducts = sortProducts(sortedProducts, sortBy);
      setProducts(sortedProducts);
    } catch (error) {
      console.error('Search error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const sortProducts = (products, sort) => {
    return [...products].sort((a, b) => {
      const getLowestPrice = (p) => {
        const prices = Object.values(p.store_prices || {})
          .filter(s => s.available && s.price)
          .map(s => s.price);
        return prices.length > 0 ? Math.min(...prices) : Infinity;
      };

      if (sort === 'price_low') {
        return getLowestPrice(a) - getLowestPrice(b);
      } else if (sort === 'price_high') {
        return getLowestPrice(b) - getLowestPrice(a);
      } else if (sort === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  };

  const handleSort = (newSort) => {
    setSortBy(newSort);
    setProducts(sortProducts(products, newSort));
  };

  const handleSearch = () => {
    searchProducts(searchQuery);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search groceries..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); searchProducts(''); }}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>
          {products.length} products found
        </Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'price_low' && styles.sortButtonActive]}
            onPress={() => handleSort('price_low')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'price_low' && styles.sortButtonTextActive]}>
              Price ↑
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'price_high' && styles.sortButtonActive]}
            onPress={() => handleSort('price_high')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'price_high' && styles.sortButtonTextActive]}>
              Price ↓
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => handleSort('name')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
              A-Z
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No products found
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                Try a different search term
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 15,
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
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  resultCount: {
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  sortButtonActive: {
    backgroundColor: '#00E676',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#000',
  },
  listContent: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
