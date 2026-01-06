import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../lib/ThemeContext';
import { useFavorites } from '../lib/FavoritesContext';
import { useShoppingList } from '../lib/ShoppingListContext';
import { formatPrice, STORE_INFO } from '../lib/api';
import * as Haptics from 'expo-haptics';

export default function ProductCard({ product }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addItem } = useShoppingList();

  const getBestPrice = () => {
    const available = Object.entries(product.store_prices || {})
      .filter(([_, data]) => data.available && data.price > 0)
      .map(([store, data]) => ({ store, price: data.price }));
    return available.length > 0 ? available.reduce((a, b) => (a.price < b.price ? a : b)) : null;
  };

  const bestPrice = getBestPrice();

  const handleFavorite = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(product);
  };

  const handleAddToList = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem(product, 1);
  };

  const sortedPrices = Object.entries(product.store_prices || {})
    .filter(([_, data]) => data.available && data.price)
    .sort((a, b) => a[1].price - b[1].price)
    .slice(0, 3);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card }]}
      onPress={() => navigation.navigate('ProductDetail', { product })}
      activeOpacity={0.9}
    >
      {/* Image */}
      <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />

      {/* Favorite Button */}
      <TouchableOpacity style={styles.favoriteButton} onPress={handleFavorite}>
        <Ionicons
          name={isFavorite(product.id) ? 'heart' : 'heart-outline'}
          size={22}
          color={isFavorite(product.id) ? '#FF5252' : theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.brand, { color: theme.colors.textSecondary }]}>{product.brand}</Text>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.size, { color: theme.colors.textSecondary }]}>{product.size}</Text>

        {/* Best Price */}
        {bestPrice && (
          <View style={styles.bestPriceRow}>
            <Text style={styles.bestPrice}>{formatPrice(bestPrice.price)}</Text>
            <View style={[styles.storeBadge, { backgroundColor: STORE_INFO[bestPrice.store]?.color }]}>
              <Text style={styles.storeText}>{STORE_INFO[bestPrice.store]?.name}</Text>
            </View>
          </View>
        )}

        {/* Other Prices */}
        <View style={styles.pricesContainer}>
          {sortedPrices.slice(1).map(([store, data]) => (
            <View key={store} style={styles.otherPrice}>
              <View style={[styles.storeDot, { backgroundColor: STORE_INFO[store]?.color }]} />
              <Text style={[styles.otherPriceText, { color: theme.colors.textSecondary }]}>
                {formatPrice(data.price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Add to List Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddToList}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addButtonText}>Add to List</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: 15,
  },
  brand: {
    fontSize: 12,
    fontWeight: '500',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  size: {
    fontSize: 12,
    marginTop: 2,
  },
  bestPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  bestPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E676',
  },
  storeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pricesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  otherPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  otherPriceText: {
    fontSize: 13,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E676',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
});
