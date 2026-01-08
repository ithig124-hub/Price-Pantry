import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Get the best (lowest) price from store prices
export function getBestPrice(storePrices) {
  const availablePrices = Object.entries(storePrices)
    .filter(([_, data]) => data.available)
    .map(([store, data]) => ({ store, price: data.price, onSpecial: data.on_special }));

  if (availablePrices.length === 0) return null;

  return availablePrices.reduce((best, current) =>
    current.price < best.price ? current : best
  );
}

// Format price to AUD
export function formatPrice(price) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

// Get store display info
export const STORE_INFO = {
  coles: { name: "Coles", color: "#E01A22", bgColor: "bg-red-50" },
  woolworths: { name: "Woolworths", color: "#178841", bgColor: "bg-green-50" },
  aldi: { name: "Aldi", color: "#001E79", bgColor: "bg-blue-50" },
  iga: { name: "IGA", color: "#DA291C", bgColor: "bg-red-50" },
  costco: { name: "Costco", color: "#005DAA", bgColor: "bg-blue-50" },
};

// Calculate savings percentage
export function calculateSavings(bestPrice, worstPrice) {
  if (!worstPrice || worstPrice === 0) return 0;
  return Math.round(((worstPrice - bestPrice) / worstPrice) * 100);
}

// Get worst price for comparison
export function getWorstPrice(storePrices) {
  const availablePrices = Object.entries(storePrices)
    .filter(([_, data]) => data.available)
    .map(([store, data]) => ({ store, price: data.price }));

  if (availablePrices.length === 0) return null;

  return availablePrices.reduce((worst, current) =>
    current.price > worst.price ? current : worst
  );
}

// Debounce function for search
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
