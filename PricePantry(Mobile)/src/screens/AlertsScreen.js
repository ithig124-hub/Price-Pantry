import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { api, formatPrice, getBestPrice } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlertsScreen() {
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [email, setEmail] = useState('');

  React.useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const saved = await AsyncStorage.getItem('priceAlerts');
      if (saved) {
        setAlerts(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Error loading alerts:', e);
    }
  };

  const saveAlert = async (newAlert) => {
    const newAlerts = [...alerts, newAlert];
    setAlerts(newAlerts);
    try {
      await AsyncStorage.setItem('priceAlerts', JSON.stringify(newAlerts));
    } catch (e) {
      console.log('Error saving alert:', e);
    }
  };

  const deleteAlert = async (alertId) => {
    const newAlerts = alerts.filter(a => a.id !== alertId);
    setAlerts(newAlerts);
    try {
      await AsyncStorage.setItem('priceAlerts', JSON.stringify(newAlerts));
    } catch (e) {
      console.log('Error deleting alert:', e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const result = await api.searchProducts(searchQuery, { limit: 5 });
      setSearchResults(result.products || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleCreateAlert = () => {
    if (!selectedProduct || !targetPrice) {
      Alert.alert('Error', 'Please select a product and enter a target price');
      return;
    }

    const newAlert = {
      id: Date.now().toString(),
      product: selectedProduct,
      targetPrice: parseFloat(targetPrice),
      email: email || null,
      createdAt: new Date().toISOString(),
    };

    saveAlert(newAlert);
    setModalVisible(false);
    setSelectedProduct(null);
    setTargetPrice('');
    setEmail('');
    setSearchQuery('');
    setSearchResults([]);
    Alert.alert('Success', 'Price alert created!');
  };

  const renderAlertItem = ({ item }) => {
    const bestPrice = getBestPrice(item.product.store_prices);
    
    return (
      <View style={[styles.alertCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.alertHeader}>
          <Text style={[styles.productName, { color: theme.colors.text }]}>
            {item.product.name}
          </Text>
          <TouchableOpacity onPress={() => deleteAlert(item.id)}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.alertInfo, { color: theme.colors.textSecondary }]}>
          Target: {formatPrice(item.targetPrice)}
        </Text>
        <Text style={[styles.alertInfo, { color: theme.colors.textSecondary }]}>
          Current best: {bestPrice ? formatPrice(bestPrice.price) : 'N/A'}
        </Text>
        {item.email && (
          <Text style={[styles.alertInfo, { color: theme.colors.textSecondary }]}>
            📧 {item.email}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Price Alerts</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {alerts.length} active alerts
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={80} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>
              No price alerts
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Create an alert to get notified when prices drop
            </Text>
          </View>
        }
      />

      {/* Create Alert Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Alert</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Product Search */}
          <View style={styles.searchSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Search Product</Text>
            <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Search..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
            </View>
            
            {searchResults.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.searchResult,
                  { backgroundColor: theme.colors.card },
                  selectedProduct?.id === product.id && styles.selectedResult,
                ]}
                onPress={() => {
                  setSelectedProduct(product);
                  const best = getBestPrice(product.store_prices);
                  if (best) setTargetPrice((best.price * 0.9).toFixed(2));
                }}
              >
                <Text style={[styles.resultName, { color: theme.colors.text }]}>
                  {product.name}
                </Text>
                <Text style={[styles.resultPrice, { color: theme.colors.textSecondary }]}>
                  {formatPrice(getBestPrice(product.store_prices)?.price)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedProduct && (
            <View style={styles.formSection}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Target Price</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={targetPrice}
                onChangeText={setTargetPrice}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: theme.colors.text }]}>Email (Optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.createButton} onPress={handleCreateAlert}>
                <Text style={styles.createButtonText}>Create Alert</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#00E676',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    flexGrow: 1,
  },
  alertCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  alertInfo: {
    fontSize: 14,
    marginTop: 4,
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
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  searchResult: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedResult: {
    borderWidth: 2,
    borderColor: '#00E676',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  formSection: {
    marginTop: 10,
  },
  formInput: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 16,
    marginBottom: 15,
  },
  createButton: {
    backgroundColor: '#00E676',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
