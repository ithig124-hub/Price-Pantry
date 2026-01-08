import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowUpDown, Grid, List, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard } from "@/components/ProductCard";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdBanner } from "@/components/AdBanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

export const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState("best_price");
  const [viewMode, setViewMode] = useState("grid");

  const query = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || null;

  const [filters, setFilters] = useState({
    category: categoryParam,
    store: null,
    brand: null,
    min_price: null,
    max_price: null,
  });

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = {
        q: query,
        page: pageNum,
        page_size: 20,
        sort_by: sortBy,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== null)
        ),
      };

      const data = await api.searchProducts(params);
      const productsArray = Array.isArray(data?.products) ? data.products : [];
      
      if (append) {
        setProducts((prev) => [...prev, ...productsArray]);
      } else {
        setProducts(productsArray);
      }
      
      setTotalResults(data?.total || 0);
      setHasMore(productsArray.length === 20 && pageNum * 20 < (data?.total || 0));
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setTotalResults(0);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, filters, sortBy]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [query, filters, sortBy, fetchProducts]);

  useEffect(() => {
    if (categoryParam !== filters.category) {
      setFilters((prev) => ({ ...prev, category: categoryParam }));
    }
  }, [categoryParam]);

  const handleSearch = (newQuery) => {
    setSearchParams({ q: newQuery });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Update URL params
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (newFilters.category) params.set("category", newFilters.category);
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setFilters({
      category: null,
      store: null,
      brand: null,
      min_price: null,
      max_price: null,
    });
    setSearchParams(query ? { q: query } : {});
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950 transition-colors">
      <Header />

      {/* Search Header */}
      <div className="bg-white dark:bg-gray-900 border-b-2 border-black dark:border-gray-700 py-4 px-4 sticky top-[65px] z-40 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <SearchBar initialQuery={query} onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold dark:text-white" data-testid="search-results-title">
                  {query ? `Results for "${query}"` : filters.category ? filters.category : "All Products"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalResults} products found
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px] border-2 border-black" data-testid="sort-select">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best_price">Lowest Price</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="per_unit">Best Value</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="hidden sm:flex items-center border-2 border-black rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-black text-white" : "bg-white text-black"}`}
                    data-testid="view-grid-btn"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-black text-white" : "bg-white text-black"}`}
                    data-testid="view-list-btn"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
              />
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    <Skeleton className="aspect-square w-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-6 w-1/2 mb-4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : (products || []).length === 0 ? (
              <div className="text-center py-16" data-testid="no-results">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h2 className="text-xl font-bold mb-2">No products found</h2>
                <p className="text-gray-500 mb-4">
                  Try adjusting your search or filters
                </p>
                <Button
                  onClick={handleResetFilters}
                  className="bg-[#00E676] text-black font-bold border-2 border-black"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Ad Banner - Top of Results */}
                <div className="mb-6">
                  <AdBanner type="horizontal" />
                </div>

                <div
                  className={`grid gap-4 ${
                    viewMode === "grid"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1"
                  }`}
                  data-testid="products-grid"
                >
                  {(products || []).map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ProductCard product={product} />
                      {/* Insert ad after every 6th product */}
                      {(index + 1) % 6 === 0 && index < (products || []).length - 1 && (
                        <div className={`${viewMode === "grid" ? "col-span-full" : ""}`}>
                          <AdBanner type="horizontal" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center mt-8">
                    <Button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="bg-black text-white font-bold px-8 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all"
                      data-testid="load-more-btn"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More Products"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
