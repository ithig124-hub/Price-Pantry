// API Configuration
// The backend is accessible via the configured URL
// In development/container: Use localhost or your machine's IP
// In production: Use your deployed backend URL
// All API routes are prefixed with /api

// For mobile development, you may need to replace 'localhost' with your computer's IP address
// Example: const API_BASE_URL = 'http://192.168.1.100:8001/api';
const API_BASE_URL = 'http://localhost:8001/api';

// Store information - matches backend STORES configuration
export const STORE_INFO = {
  coles: { name: 'Coles', color: '#E01A22' },
  woolworths: { name: 'Woolworths', color: '#178841' },
  aldi: { name: 'Aldi', color: '#001E79' },
  iga: { name: 'IGA', color: '#DA291C' },
  costco: { name: 'Costco', color: '#005DAA' },
};

// Format price
export const formatPrice = (price) => {
  if (price === null || price === undefined) return 'N/A';
  return `$${price.toFixed(2)}`;
};

// Get best price from store prices
export const getBestPrice = (storePrices) => {
  if (!storePrices) return null;
  const available = Object.entries(storePrices)
    .filter(([_, data]) => data.available && data.price > 0)
    .map(([store, data]) => ({ store, price: data.price }));
  if (available.length === 0) return null;
  return available.reduce((a, b) => (a.price < b.price ? a : b));
};

// Get savings compared to target price
export const getSavings = (storePrices, targetPrice) => {
  const best = getBestPrice(storePrices);
  if (!best || !targetPrice) return 0;
  return Math.max(0, targetPrice - best.price);
};

// API functions
export const api = {
  // Get all stores
  async getStores() {
    try {
      const response = await fetch(`${API_BASE_URL}/stores`);
      if (!response.ok) throw new Error('Failed to fetch stores');
      return await response.json();
    } catch (error) {
      console.error('Get stores error:', error);
      // Return default stores as fallback
      return Object.entries(STORE_INFO).map(([key, info]) => ({
        key,
        name: info.name,
        color: info.color,
      }));
    }
  },

  // Get all categories
  async getCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      return data.categories;
    } catch (error) {
      console.error('Get categories error:', error);
      return [
        'Fruit & Veg',
        'Dairy & Eggs',
        'Meat & Seafood',
        'Bakery',
        'Pantry',
        'Frozen',
        'Beverages',
        'Snacks',
        'Household',
        'Personal Care',
      ];
    }
  },

  // Search products with full backend integration
  async searchProducts(query = '', options = {}) {
    try {
      const params = new URLSearchParams({
        q: query || '',
        page: options.page || 1,
        page_size: options.page_size || 20,
        sort_by: options.sort_by || 'best_price',
      });

      // Add optional filters
      if (options.category) params.append('category', options.category);
      if (options.store) params.append('store', options.store);
      if (options.min_price) params.append('min_price', options.min_price);
      if (options.max_price) params.append('max_price', options.max_price);

      const response = await fetch(`${API_BASE_URL}/products/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      return { products: [], total: 0, page: 1, page_size: 20 };
    }
  },

  // Get product by ID
  async getProduct(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`);
      if (!response.ok) throw new Error('Product not found');
      return await response.json();
    } catch (error) {
      console.error('Get product error:', error);
      return null;
    }
  },

  // Get search suggestions
  async getSuggestions(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/suggestions?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Suggestions failed');
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  },

  // Get products by category
  async getProductsByCategory(category, limit = 10) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/category/${encodeURIComponent(category)}?limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch category products');
      return await response.json();
    } catch (error) {
      console.error('Get category products error:', error);
      return [];
    }
  },

  // Get special offers
  async getSpecials(limit = 12) {
    try {
      const response = await fetch(`${API_BASE_URL}/specials?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch specials');
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Get specials error:', error);
      return [];
    }
  },

  // Price Alerts
  async createAlert(alertData) {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      if (!response.ok) throw new Error('Create alert failed');
      return await response.json();
    } catch (error) {
      console.error('Create alert error:', error);
      throw error;
    }
  },

  async getAlerts(productId = null) {
    try {
      const url = productId
        ? `${API_BASE_URL}/alerts?product_id=${productId}`
        : `${API_BASE_URL}/alerts`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return await response.json();
    } catch (error) {
      console.error('Get alerts error:', error);
      return [];
    }
  },

  async deleteAlert(alertId) {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete alert failed');
      return await response.json();
    } catch (error) {
      console.error('Delete alert error:', error);
      throw error;
    }
  },

  // Shopping Lists
  async createShoppingList(name = 'My Shopping List') {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Create shopping list failed');
      return await response.json();
    } catch (error) {
      console.error('Create shopping list error:', error);
      throw error;
    }
  },

  async getShoppingLists() {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists`);
      if (!response.ok) throw new Error('Failed to fetch shopping lists');
      return await response.json();
    } catch (error) {
      console.error('Get shopping lists error:', error);
      return [];
    }
  },

  async getShoppingList(listId) {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists/${listId}`);
      if (!response.ok) throw new Error('Failed to fetch shopping list');
      return await response.json();
    } catch (error) {
      console.error('Get shopping list error:', error);
      return null;
    }
  },

  async addItemToShoppingList(listId, item) {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error('Add item failed');
      return await response.json();
    } catch (error) {
      console.error('Add item error:', error);
      throw error;
    }
  },

  async updateShoppingListItemQuantity(listId, itemId, quantity) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/shopping-lists/${listId}/items/${itemId}?quantity=${quantity}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) throw new Error('Update quantity failed');
      return await response.json();
    } catch (error) {
      console.error('Update quantity error:', error);
      throw error;
    }
  },

  async removeItemFromShoppingList(listId, itemId) {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Remove item failed');
      return await response.json();
    } catch (error) {
      console.error('Remove item error:', error);
      throw error;
    }
  },

  async deleteShoppingList(listId) {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists/${listId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete shopping list failed');
      return await response.json();
    } catch (error) {
      console.error('Delete shopping list error:', error);
      throw error;
    }
  },

  async getShoppingListTotals(listId) {
    try {
      const response = await fetch(`${API_BASE_URL}/shopping-lists/${listId}/totals`);
      if (!response.ok) throw new Error('Failed to fetch totals');
      return await response.json();
    } catch (error) {
      console.error('Get shopping list totals error:', error);
      return null;
    }
  },

  // Web Scraping
  async scrapeStores(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/scrape/${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Scraping failed');
      return await response.json();
    } catch (error) {
      console.error('Scrape error:', error);
      return {};
    }
  },

  // Get API usage stats
  async getApiUsage() {
    try {
      const response = await fetch(`${API_BASE_URL}/api-usage`);
      if (!response.ok) throw new Error('Failed to fetch API usage');
      return await response.json();
    } catch (error) {
      console.error('Get API usage error:', error);
      return { calls_made: 0, monthly_limit: 1000, remaining: 1000 };
    }
  },
};

export default api;
