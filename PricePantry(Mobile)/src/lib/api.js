// API Configuration
const API_BASE_URL = 'https://your-backend-url.com/api'; // Update with your actual backend URL

// Store information
export const STORE_INFO = {
  coles: { name: 'Coles', color: '#ED1C24' },
  woolworths: { name: 'Woolworths', color: '#60A946' },
  aldi: { name: 'Aldi', color: '#00529B' },
  iga: { name: 'IGA', color: '#EC1C24' },
  costco: { name: 'Costco', color: '#E31837' },
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

// API functions
export const api = {
  async searchProducts(query, options = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: options.limit || 20,
        ...options,
      });
      const response = await fetch(`${API_BASE_URL}/products/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      // Return mock data for demo
      return { products: getMockProducts(query) };
    }
  },

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

  async getSuggestions(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/suggestions?q=${query}`);
      if (!response.ok) throw new Error('Suggestions failed');
      return await response.json();
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  },

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
};

// Mock products for demo/offline mode
const getMockProducts = (query) => {
  const mockProducts = [
    {
      id: '1',
      name: 'Full Cream Milk',
      brand: 'Devondale',
      category: 'Dairy & Eggs',
      size: '2L',
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
      store_prices: {
        coles: { price: 3.50, available: true },
        woolworths: { price: 3.60, available: true },
        aldi: { price: 3.29, available: true },
        iga: { price: 3.70, available: true },
        costco: { price: 3.20, available: true },
      },
      price_history: generatePriceHistory(3.50),
    },
    {
      id: '2',
      name: 'Free Range Eggs',
      brand: 'Sunny Queen',
      category: 'Dairy & Eggs',
      size: '12 Pack',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400',
      store_prices: {
        coles: { price: 6.50, available: true },
        woolworths: { price: 6.80, available: true },
        aldi: { price: 5.99, available: true },
        iga: { price: 7.00, available: true },
        costco: { price: 5.50, available: true },
      },
      price_history: generatePriceHistory(6.50),
    },
    {
      id: '3',
      name: 'White Bread',
      brand: 'Tip Top',
      category: 'Bakery',
      size: '700g',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
      store_prices: {
        coles: { price: 3.50, available: true },
        woolworths: { price: 3.40, available: true },
        aldi: { price: 2.99, available: true },
        iga: { price: 3.60, available: true },
        costco: { price: 2.80, available: true },
      },
      price_history: generatePriceHistory(3.50),
    },
    {
      id: '4',
      name: 'Royal Gala Apples',
      brand: 'Fresh',
      category: 'Fruit & Veg',
      size: '1kg',
      image: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400',
      store_prices: {
        coles: { price: 4.50, available: true },
        woolworths: { price: 4.90, available: true },
        aldi: { price: 3.99, available: true },
        iga: { price: 5.00, available: true },
        costco: { price: 3.80, available: true },
      },
      price_history: generatePriceHistory(4.50),
    },
    {
      id: '5',
      name: 'Chicken Breast',
      brand: 'Lilydale',
      category: 'Meat & Seafood',
      size: '500g',
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400',
      store_prices: {
        coles: { price: 10.00, available: true },
        woolworths: { price: 11.00, available: true },
        aldi: { price: 9.49, available: true },
        iga: { price: 11.50, available: true },
        costco: { price: 8.99, available: true },
      },
      price_history: generatePriceHistory(10.00),
    },
  ];

  if (!query) return mockProducts;
  return mockProducts.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase())
  );
};

// Generate mock price history
const generatePriceHistory = (basePrice) => {
  const history = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 0.4;
    const wasOnSale = Math.random() < 0.15;
    const price = wasOnSale ? basePrice * 0.85 : basePrice + variation;
    history.push({
      date: date.toISOString(),
      price: Math.round(price * 100) / 100,
      was_on_sale: wasOnSale,
    });
  }
  return history;
};

export default api;
