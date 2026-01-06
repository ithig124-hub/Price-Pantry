import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { favorites } from "@/lib/favorites";
import { toast } from "sonner";

export const FavoritesPage = () => {
  const navigate = useNavigate();
  const [favoriteProducts, setFavoriteProducts] = useState([]);

  useEffect(() => {
    setFavoriteProducts(favorites.getAll());
  }, []);

  const handleFavoriteChange = (updatedFavorites) => {
    setFavoriteProducts(updatedFavorites);
  };

  const handleClearAll = () => {
    favorites.clear();
    setFavoriteProducts([]);
    toast.success("All favorites cleared");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="favorites-title">My Favorites</h1>
              <p className="text-sm text-gray-500">
                {favoriteProducts.length} {favoriteProducts.length === 1 ? "product" : "products"} saved
              </p>
            </div>
          </div>

          {favoriteProducts.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 border-black font-bold flex items-center gap-2 hover:bg-red-50 hover:border-red-500 hover:text-red-500"
                  data-testid="clear-all-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-2 border-black">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all favorites?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {favoriteProducts.length} products from your favorites list.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-red-500 text-white border-2 border-red-500"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Favorites Grid */}
        {favoriteProducts.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-favorites">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold mb-2">No favorites yet</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Start adding products to your favorites list by clicking the heart icon on any product card.
            </p>
            <Button
              onClick={() => navigate("/search")}
              className="bg-[#00E676] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
              data-testid="browse-products-btn"
            >
              <Search className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            data-testid="favorites-grid"
          >
            {favoriteProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
