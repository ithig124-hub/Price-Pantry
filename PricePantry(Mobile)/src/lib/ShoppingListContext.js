import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ShoppingListContext = createContext();

export const useShoppingList = () => {
  const context = useContext(ShoppingListContext);
  if (!context) {
    throw new Error('useShoppingList must be used within a ShoppingListProvider');
  }
  return context;
};

export const ShoppingListProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const saved = await AsyncStorage.getItem('shoppingList');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Error loading shopping list:', e);
    }
  };

  const saveItems = async (newItems) => {
    try {
      await AsyncStorage.setItem('shoppingList', JSON.stringify(newItems));
    } catch (e) {
      console.log('Error saving shopping list:', e);
    }
  };

  const addItem = async (product, quantity = 1) => {
    const existing = items.find(item => item.product.id === product.id);
    let newItems;
    if (existing) {
      newItems = items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newItems = [...items, { product, quantity }];
    }
    setItems(newItems);
    await saveItems(newItems);
  };

  const removeItem = async (productId) => {
    const newItems = items.filter(item => item.product.id !== productId);
    setItems(newItems);
    await saveItems(newItems);
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }
    const newItems = items.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    setItems(newItems);
    await saveItems(newItems);
  };

  const clearList = async () => {
    setItems([]);
    await AsyncStorage.removeItem('shoppingList');
  };

  const getTotalByStore = () => {
    const totals = {};
    items.forEach(({ product, quantity }) => {
      if (product.store_prices) {
        Object.entries(product.store_prices).forEach(([store, data]) => {
          if (data.available && data.price) {
            if (!totals[store]) totals[store] = 0;
            totals[store] += data.price * quantity;
          }
        });
      }
    });
    return totals;
  };

  const getCheapestStore = () => {
    const totals = getTotalByStore();
    const entries = Object.entries(totals);
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => (a[1] < b[1] ? a : b));
  };

  return (
    <ShoppingListContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearList,
      getTotalByStore,
      getCheapestStore,
    }}>
      {children}
    </ShoppingListContext.Provider>
  );
};

export default ShoppingListProvider;
