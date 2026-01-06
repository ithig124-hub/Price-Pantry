import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingDown, Sparkles, ArrowRight, ShoppingCart } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdBanner } from "@/components/AdBanner";
import { api } from "@/lib/api";

const CATEGORIES = [
  { name: "Fruit & Veg", emoji: "🥬" },
  { name: "Dairy & Eggs", emoji: "🥛" },
  { name: "Meat & Seafood", emoji: "🥩" },
  { name: "Bakery", emoji: "🍞" },
  { name: "Pantry", emoji: "🥫" },
  { name: "Frozen", emoji: "🧊" },
  { name: "Beverages", emoji: "🥤" },
  { name: "Snacks", emoji: "🍪" },
];

export const HomePage = () => {
  const navigate = useNavigate();
  const [specials, setSpecials] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSpecials = useCallback(async () => {
    try {
      const data = await api.getSpecials(8);
      setSpecials(data);
    } catch (error) {
      console.error("Error fetching specials:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecials();
  }, [fetchSpecials]);

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleCategoryClick = (category) => {
    navigate(`/search?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950 transition-colors">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-4 bg-white dark:bg-gray-900 border-b-2 border-black dark:border-gray-700 transition-colors" data-testid="hero-section">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#00E676] text-black px-4 py-2 rounded-full font-bold text-sm mb-6 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <TrendingDown className="w-4 h-4" />
            Compare prices across 5 major stores
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Find the best
            <br />
            <span className="text-[#00E676]">grocery deals</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            Search thousands of products across Coles, Woolworths, Aldi, IGA, and Costco. 
            Save money on every shop.
          </p>

          {/* Search Bar */}
          <div className="flex justify-center mb-8">
            <SearchBar large onSearch={handleSearch} />
          </div>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Popular:</span>
            {["Milk", "Eggs", "Bread", "Bananas", "Chicken"].map((term) => (
              <button
                key={term}
                onClick={() => handleSearch(term)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white underline underline-offset-4"
                data-testid={`popular-search-${term.toLowerCase()}`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Banner - Top */}
      <div className="py-6 px-4 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-6xl mx-auto">
          <AdBanner type="horizontal" />
        </div>
      </div>

      {/* Categories Section */}
      <section className="py-12 px-4" data-testid="categories-section">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategoryClick(category.name)}
                className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-black rounded-xl hover:bg-[#00E676]/10 hover:-translate-y-1 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                data-testid={`category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="text-2xl">{category.emoji}</span>
                <span className="text-sm font-medium text-center">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Specials Section */}
      <section className="py-12 px-4 bg-white border-t-2 border-b-2 border-black" data-testid="specials-section">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF3D00] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Today's Specials</h2>
                <p className="text-sm text-gray-500">Products currently on sale</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/search")}
              className="hidden sm:flex items-center gap-2 border-2 border-black font-bold"
              data-testid="view-all-btn"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <Skeleton className="aspect-square w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-6 w-1/2 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {specials.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => navigate("/search")}
            className="sm:hidden w-full mt-4 flex items-center justify-center gap-2 border-2 border-black font-bold"
          >
            View All Products
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4" data-testid="how-it-works-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">How PricePantry Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#00E676] border-2 border-black rounded-xl flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Search className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Search</h3>
              <p className="text-gray-600 text-sm">
                Enter any grocery item you're looking for
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#00E676] border-2 border-black rounded-xl flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <TrendingDown className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Compare</h3>
              <p className="text-gray-600 text-sm">
                See prices from all 5 major stores side-by-side
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#00E676] border-2 border-black rounded-xl flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <ShoppingCart className="w-8 h-8 text-black" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Save</h3>
              <p className="text-gray-600 text-sm">
                Shop at the store with the best price and save money
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t-2 border-black bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00E676] border-2 border-black flex items-center justify-center font-bold text-black">
              P
            </div>
            <span className="font-bold">PricePantry</span>
          </div>
          <p className="text-sm text-gray-500">
            Compare grocery prices across Coles, Woolworths, Aldi, IGA & Costco
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
