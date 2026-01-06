// Local storage utilities for favorites

const FAVORITES_KEY = "pricepantry_favorites";

export const favorites = {
  // Get all favorites
  getAll: () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Add a product to favorites
  add: (product) => {
    const current = favorites.getAll();
    if (!current.find((p) => p.id === product.id)) {
      const updated = [...current, product];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  },

  // Remove a product from favorites
  remove: (productId) => {
    const current = favorites.getAll();
    const updated = current.filter((p) => p.id !== productId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  },

  // Check if a product is favorited
  isFavorite: (productId) => {
    const current = favorites.getAll();
    return current.some((p) => p.id === productId);
  },

  // Toggle favorite status
  toggle: (product) => {
    if (favorites.isFavorite(product.id)) {
      return { favorites: favorites.remove(product.id), added: false };
    } else {
      return { favorites: favorites.add(product), added: true };
    }
  },

  // Clear all favorites
  clear: () => {
    localStorage.removeItem(FAVORITES_KEY);
    return [];
  },
};

export default favorites;
