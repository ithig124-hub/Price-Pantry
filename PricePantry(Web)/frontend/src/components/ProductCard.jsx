import React, { useState, useEffect } from "react";
import { Heart, TrendingDown, ExternalLink, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getBestPrice,
  getWorstPrice,
  formatPrice,
  calculateSavings,
  STORE_INFO,
} from "@/lib/utils";
import { favorites } from "@/lib/favorites";
import { toast } from "sonner";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";

export const ProductCard = ({ product, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllPrices, setShowAllPrices] = useState(false);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  const bestPrice = getBestPrice(product.store_prices);
  const worstPrice = getWorstPrice(product.store_prices);
  const savings = bestPrice && worstPrice ? calculateSavings(bestPrice.price, worstPrice.price) : 0;

  useEffect(() => {
    setIsFavorite(favorites.isFavorite(product.id));
  }, [product.id]);

  const handleFavoriteToggle = () => {
    const result = favorites.toggle(product);
    setIsFavorite(!isFavorite);
    if (onFavoriteChange) {
      onFavoriteChange(result.favorites);
    }
    toast.success(result.added ? "Added to favorites" : "Removed from favorites");
  };

  // Sort prices by amount (lowest first)
  const sortedPrices = Object.entries(product.store_prices)
    .filter(([_, data]) => data.available)
    .sort((a, b) => a[1].price - b[1].price);

  const hasSpecial = sortedPrices.some(([_, data]) => data.on_special);

  return (
    <div
      className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)] hover:-translate-y-1"
      data-testid={`product-card-${product.id}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {hasSpecial && (
          <div className="absolute top-2 left-2 bg-[#FF3D00] text-white text-xs font-bold px-2 py-1 uppercase tracking-wider">
            Special
          </div>
        )}
        <button
          onClick={handleFavoriteToggle}
          className={`absolute top-2 right-2 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 transition-all ${
            isFavorite ? "text-red-500" : "text-gray-400 hover:text-red-500"
          }`}
          data-testid={`favorite-btn-${product.id}`}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{product.brand}</p>
          <h3 className="font-bold text-lg leading-tight line-clamp-2 dark:text-white">{product.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{product.size}</p>
        </div>

        {/* Best Price Highlight */}
        {bestPrice && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="font-mono text-2xl font-bold bg-[#00E676] text-black px-3 py-1 rounded"
              data-testid={`best-price-${product.id}`}
            >
              {formatPrice(bestPrice.price)}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: STORE_INFO[bestPrice.store]?.color }}>
                {STORE_INFO[bestPrice.store]?.name}
              </p>
              {savings > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Save {savings}%
                </p>
              )}
            </div>
          </div>
        )}

        {/* Store Prices List */}
        <div className="space-y-1">
          {(showAllPrices ? sortedPrices : sortedPrices.slice(0, 3)).map(([store, data], index) => (
            <div
              key={store}
              className={`flex justify-between items-center py-2 px-2 rounded ${
                index === 0 ? "bg-[#00E676]/10 dark:bg-[#00E676]/20" : ""
              }`}
              data-testid={`price-row-${store}`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STORE_INFO[store]?.color }}
                />
                <span className="text-sm font-medium dark:text-white">{STORE_INFO[store]?.name}</span>
                {data.on_special && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    SALE
                  </Badge>
                )}
              </div>
              <span
                className={`font-mono font-bold ${
                  index === 0 ? "text-black dark:text-white" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {formatPrice(data.price)}
              </span>
            </div>
          ))}
        </div>

        {/* Show More/Less Button */}
        {sortedPrices.length > 3 && (
          <button
            onClick={() => setShowAllPrices(!showAllPrices)}
            className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium py-1"
            data-testid={`toggle-prices-${product.id}`}
          >
            {showAllPrices ? "Show less" : `Show ${sortedPrices.length - 3} more stores`}
          </button>
        )}

        {/* Price History Button */}
        {product.price_history && product.price_history.length > 0 && (
          <button
            onClick={() => setShowPriceHistory(true)}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg py-2 transition-colors"
            data-testid={`price-history-btn-${product.id}`}
          >
            <LineChart className="w-4 h-4" />
            View Price History
          </button>
        )}

        {/* Unavailable Stores */}
        {Object.entries(product.store_prices).filter(([_, d]) => !d.available).length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Unavailable at:{" "}
            {Object.entries(product.store_prices)
              .filter(([_, d]) => !d.available)
              .map(([store]) => STORE_INFO[store]?.name)
              .join(", ")}
          </p>
        )}
      </div>

      {/* Price History Modal */}
      <PriceHistoryChart
        product={product}
        isOpen={showPriceHistory}
        onClose={() => setShowPriceHistory(false)}
      />
    </div>
  );
};

export default ProductCard;
