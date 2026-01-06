import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../lib/ThemeContext';
import { useFavorites } from '../lib/FavoritesContext';
import { useShoppingList } from '../lib/ShoppingListContext';
import { formatPrice, STORE_INFO, api } from '../lib/api';

const screenWidth = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addItem } = useShoppingList();
  const [product, setProduct] = useState(route.params?.product);

  useEffect(() => {
    if (route.params?.productId && !product) {
      loadProduct(route.params.productId);
    }
  }, [route.params]);

  const loadProduct = async (productId) => {
    const data = await api.getProduct(productId);
    if (data) setProduct(data);
  };

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  const priceHistory = product.price_history || [];
  const prices = priceHistory.map(p => p.price);
  const labels = priceHistory.map((p, i) => i % 5 === 0 ? new Date(p.date).getDate().toString() : '');

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const currentPrice = prices[prices.length - 1];

  const sortedPrices = Object.entries(product.store_prices || {})
    .filter(([_, data]) => data.available && data.price)
    .sort((a, b) => a[1].price - b[1].price);

  const handleAddToList = () => {
    addItem(product, 1);
    navigation.navigate('Main', { screen: 'List' });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(product)}
        >
          <Ionicons
            name={isFavorite(product.id) ? 'heart' : 'heart-outline'}
            size={28}
            color={isFavorite(product.id) ? '#FF5252' : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* Product Info */}
      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>{product.brand}</Text>
        <Text style={[styles.name, { color: theme.colors.text }]}>{product.name}</Text>
        <Text style={[styles.size, { color: theme.colors.textSecondary }]}>{product.size}</Text>

        {/* Best Price Highlight */}
        {sortedPrices.length > 0 && (
          <View style={styles.bestPriceContainer}>
            <Text style={styles.bestPriceLabel}>Best Price</Text>
            <Text style={styles.bestPrice}>{formatPrice(sortedPrices[0][1].price)}</Text>
            <Text style={styles.bestPriceStore}>at {STORE_INFO[sortedPrices[0][0]]?.name}</Text>
          </View>
        )}
      </View>

      {/* Store Prices */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Compare Prices</Text>
        {sortedPrices.map(([store, data], index) => (
          <View key={store} style={styles.priceRow}>
            <View style={styles.storeInfo}>
              <View style={[styles.storeDot, { backgroundColor: STORE_INFO[store]?.color }]} />
              <Text style={[styles.storeName, { color: theme.colors.text }]}>
                {STORE_INFO[store]?.name}
              </Text>
              {index === 0 && (
                <View style={styles.cheapestBadge}>
                  <Text style={styles.cheapestText}>Cheapest</Text>
                </View>
              )}
            </View>
            <Text style={[styles.price, { color: theme.colors.text }]}>
              {formatPrice(data.price)}
            </Text>
          </View>
        ))}
      </View>

      {/* Price History Chart */}
      {priceHistory.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Price History (30 Days)</Text>
          
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.statLabel}>Lowest</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{formatPrice(minPrice)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>{formatPrice(avgPrice)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFEBEE' }]}>
              <Text style={styles.statLabel}>Highest</Text>
              <Text style={[styles.statValue, { color: '#F44336' }]}>{formatPrice(maxPrice)}</Text>
            </View>
          </View>

          {/* Chart */}
          <LineChart
            data={{
              labels,
              datasets: [{ data: prices.length > 0 ? prices : [0] }],
            }}
            width={screenWidth - 60}
            height={180}
            chartConfig={{
              backgroundColor: theme.colors.card,
              backgroundGradientFrom: theme.colors.card,
              backgroundGradientTo: theme.colors.card,
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0, 230, 118, ${opacity})`,
              labelColor: (opacity = 1) => theme.isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#00E676',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Add to List Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddToList}>
        <Ionicons name="cart" size={24} color="#000" />
        <Text style={styles.addButtonText}>Add to Shopping List</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  favoriteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 10,
  },
  infoCard: {
    padding: 20,
    marginTop: -20,
    marginHorizontal: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  brand: {
    fontSize: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  size: {
    fontSize: 14,
    marginTop: 4,
  },
  bestPriceContainer: {
    backgroundColor: '#00E676',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  bestPriceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  bestPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  bestPriceStore: {
    fontSize: 14,
    color: '#000',
    opacity: 0.8,
  },
  section: {
    margin: 15,
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  storeName: {
    fontSize: 16,
  },
  cheapestBadge: {
    backgroundColor: '#00E676',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  cheapestText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#00E676',
    marginHorizontal: 15,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
