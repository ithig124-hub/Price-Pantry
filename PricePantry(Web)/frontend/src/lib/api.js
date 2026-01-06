import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

// API functions
export const api = {
  // Get all stores
  getStores: async () => {
    const response = await apiClient.get("/stores");
    return response.data;
  },

  // Get all categories
  getCategories: async () => {
    const response = await apiClient.get("/categories");
    return response.data.categories;
  },

  // Get API usage stats
  getApiUsage: async () => {
    const response = await apiClient.get("/api-usage");
    return response.data;
  },

  // Search products
  searchProducts: async (params) => {
    const response = await apiClient.get("/products/search", { params });
    return response.data;
  },

  // Get search suggestions
  getSuggestions: async (query) => {
    const response = await apiClient.get("/products/suggestions", {
      params: { q: query },
    });
    return response.data.suggestions;
  },

  // Get product by ID
  getProduct: async (productId) => {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
  },

  // Get products by category
  getProductsByCategory: async (category, limit = 10) => {
    const response = await apiClient.get(`/products/category/${encodeURIComponent(category)}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get special offers
  getSpecials: async (limit = 12) => {
    const response = await apiClient.get("/specials", { params: { limit } });
    return response.data.products;
  },

  // Price Alerts
  createAlert: async (alertData) => {
    const response = await apiClient.post("/alerts", alertData);
    return response.data;
  },

  getAlerts: async (productId = null) => {
    const params = productId ? { product_id: productId } : {};
    const response = await apiClient.get("/alerts", { params });
    return response.data;
  },

  deleteAlert: async (alertId) => {
    const response = await apiClient.delete(`/alerts/${alertId}`);
    return response.data;
  },

  // Shopping Lists
  createShoppingList: async (name = "My Shopping List") => {
    const response = await apiClient.post("/shopping-lists", null, { params: { name } });
    return response.data;
  },

  getShoppingLists: async () => {
    const response = await apiClient.get("/shopping-lists");
    return response.data;
  },

  getShoppingList: async (listId) => {
    const response = await apiClient.get(`/shopping-lists/${listId}`);
    return response.data;
  },

  addItemToShoppingList: async (listId, item) => {
    const response = await apiClient.post(`/shopping-lists/${listId}/items`, item);
    return response.data;
  },

  updateShoppingListItemQuantity: async (listId, itemId, quantity) => {
    const response = await apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, null, {
      params: { quantity },
    });
    return response.data;
  },

  removeItemFromShoppingList: async (listId, itemId) => {
    const response = await apiClient.delete(`/shopping-lists/${listId}/items/${itemId}`);
    return response.data;
  },

  deleteShoppingList: async (listId) => {
    const response = await apiClient.delete(`/shopping-lists/${listId}`);
    return response.data;
  },

  getShoppingListTotals: async (listId) => {
    const response = await apiClient.get(`/shopping-lists/${listId}/totals`);
    return response.data;
  },

  // Web Scraping
  scrapeStores: async (query) => {
    const response = await apiClient.get(`/scrape/${encodeURIComponent(query)}`);
    return response.data;
  },
};

export default api;
