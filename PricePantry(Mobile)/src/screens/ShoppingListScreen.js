import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../lib/ThemeContext';
import { useShoppingList } from '../lib/ShoppingListContext';
import { formatPrice, getBestPrice, STORE_INFO } from '../lib/api';

export default function ShoppingListScreen() {
  const { theme } = useTheme();
  const {
    items,
    removeItem,
    updateQuantity,
    clearList,
    getTotalByStore,
    getCheapestStore,
  } = useShoppingList();

  const storeTotals = getTotalByStore();
  const cheapestStore = getCheapestStore();

  const calculateSavings = () => {
    const totals = Object.entries(storeTotals).sort((a, b) => a[1] - b[1]);
    if (totals.length < 2) return null;
    const cheapest = totals[0][1];
    const mostExpensive = totals[totals.length - 1][1];
    const savings = mostExpensive - cheapest;
    const savingsPercent = ((savings / mostExpensive) * 100).toFixed(0);
    return {
      savings,
      savingsPercent,
      cheapestStore: totals[0][0],
      expensiveStore: totals[totals.length - 1][0],
    };
  };

  const handleShare = async () => {
    const listText = items.map(({ product, quantity }) => {
      const best = getBestPrice(product.store_prices);
      return `• ${product.name} x${quantity}${best ? ` - ${formatPrice(best.price)} at ${STORE_INFO[best.store]?.name}` : ''}`;
    }).join('\n');

    const savingsInfo = calculateSavings();
    let shareText = `🛒 My PricePantry Shopping List\n\n${listText}`;

    if (savingsInfo) {
      shareText += `\n\n💰 Shop at ${STORE_INFO[savingsInfo.cheapestStore]?.name} to save ${formatPrice(savingsInfo.savings)} (${savingsInfo.savingsPercent}%)!`;
    }

    try {
      await Clipboard.setStringAsync(shareText);
      Alert.alert('Copied!', 'Shopping list copied to clipboard');
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear List',
      'Are you sure you want to clear all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearList },
      ]
    );
  };

  const renderItem = ({ item: { product, quantity } }) => {
    const bestPrice = getBestPrice(product.store_prices);

    return (
      <View style={[styles.itemCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          <Text style={[styles.itemDetails, { color: theme.colors.textSecondary }]}>
            {product.brand} • {product.size}
          </Text>
          {bestPrice && (
            <Text style={[styles.itemPrice, { color: theme.colors.primary }]}>
              Best: {formatPrice(bestPrice.price)} at {STORE_INFO[bestPrice.store]?.name}
            </Text>
          )}
        </View>

        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(product.id, quantity - 1)}
          >
            <Ionicons name="remove" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.quantity, { color: theme.colors.text }]}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(product.id, quantity + 1)}
          >
            <Ionicons name="add" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quantityButton, { marginLeft: 10 }]}
            onPress={() => removeItem(product.id)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const savingsData = calculateSavings();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Shopping List</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {items.length} items
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {items.length > 0 && (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleClear}>
                <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Store Totals */}
      {items.length > 0 && (
        <View style={[styles.totalsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.totalsTitle, { color: theme.colors.text }]}>
            <Ionicons name="calculator-outline" size={18} /> Store Totals
          </Text>
          {Object.entries(storeTotals)
            .sort((a, b) => a[1] - b[1])
            .map(([store, total], index) => (
              <View key={store} style={styles.storeRow}>
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
                <Text style={[styles.storeTotal, { color: theme.colors.text }]}>
                  {formatPrice(total)}
                </Text>
              </View>
            ))}

          {/* Savings Display */}
          {savingsData && (
            <View style={styles.savingsContainer}>
              <Ionicons name="trending-down" size={18} color="#00C853" />
              <Text style={styles.savingsText}>
                Save {formatPrice(savingsData.savings)} ({savingsData.savingsPercent}%)
              </Text>
              <Text style={styles.savingsSubtext}>
                vs {STORE_INFO[savingsData.expensiveStore]?.name}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>
              Your list is empty
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Add items from search or product pages
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 8,
  },
  totalsCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  cheapestBadge: {
    backgroundColor: '#00E676',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  cheapestText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  storeTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00C853',
  },
  savingsSubtext: {
    fontSize: 12,
    color: '#4CAF50',
  },
  listContent: {
    padding: 15,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
