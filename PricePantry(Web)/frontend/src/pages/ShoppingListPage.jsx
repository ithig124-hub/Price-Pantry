import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, Plus, Minus, Trash2, Search, 
  Calculator, Store, Loader2, CheckCircle, Share2, Copy, TrendingDown
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatPrice, STORE_INFO } from "@/lib/utils";
import { toast } from "sonner";

export const ShoppingListPage = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  const fetchLists = useCallback(async () => {
    try {
      const data = await api.getShoppingLists();
      const listsArray = Array.isArray(data) ? data : [];
      setLists(listsArray);
      if (listsArray.length > 0 && !currentList) {
        setCurrentList(listsArray[0]);
        fetchTotals(listsArray[0].id);
      }
    } catch (error) {
      console.error("Error fetching lists:", error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [currentList]);

  const fetchTotals = async (listId) => {
    try {
      const data = await api.getShoppingListTotals(listId);
      setTotals(data);
    } catch (error) {
      console.error("Error fetching totals:", error);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (currentList) {
      fetchTotals(currentList.id);
    }
  }, [currentList]);

  const handleCreateList = async () => {
    setCreatingList(true);
    try {
      const newList = await api.createShoppingList("My Shopping List");
      setLists([...lists, newList]);
      setCurrentList(newList);
      toast.success("Shopping list created!");
    } catch (error) {
      toast.error("Failed to create list");
    } finally {
      setCreatingList(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await api.searchProducts({ q: query, page_size: 5 });
      setSearchResults(Array.isArray(data?.products) ? data.products : []);
    } catch (error) {
      console.error("Error searching:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddItem = async (product) => {
    if (!currentList) return;

    try {
      const updatedList = await api.addItemToShoppingList(currentList.id, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity: 1,
        store_prices: product.store_prices,
      });
      setCurrentList(updatedList);
      fetchTotals(currentList.id);
      setSearchQuery("");
      setSearchResults([]);
      setIsAddDialogOpen(false);
      toast.success(`${product.name} added to list`);
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (!currentList || newQuantity < 1) return;

    try {
      await api.updateShoppingListItemQuantity(currentList.id, itemId, newQuantity);
      setCurrentList({
        ...currentList,
        items: currentList.items.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        ),
      });
      fetchTotals(currentList.id);
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!currentList) return;

    try {
      await api.removeItemFromShoppingList(currentList.id, itemId);
      setCurrentList({
        ...currentList,
        items: currentList.items.filter((item) => item.id !== itemId),
      });
      fetchTotals(currentList.id);
      toast.success("Item removed");
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleDeleteList = async () => {
    if (!currentList) return;

    try {
      await api.deleteShoppingList(currentList.id);
      const remainingLists = lists.filter((l) => l.id !== currentList.id);
      setLists(remainingLists);
      setCurrentList(remainingLists[0] || null);
      setTotals(null);
      toast.success("Shopping list deleted");
    } catch (error) {
      toast.error("Failed to delete list");
    }
  };

  const getBestPrice = (storePrices) => {
    const available = Object.entries(storePrices || {})
      .filter(([_, data]) => data.available && data.price > 0)
      .map(([store, data]) => ({ store, price: data.price }));
    return available.length > 0 ? available.reduce((a, b) => (a.price < b.price ? a : b)) : null;
  };

  // Calculate potential savings
  const calculateSavings = () => {
    if (!totals || !totals.store_totals) return null;
    const sortedTotals = Object.entries(totals.store_totals)
      .filter(([_, total]) => total > 0)
      .sort((a, b) => a[1] - b[1]);
    
    if (sortedTotals.length < 2) return null;
    
    const cheapest = sortedTotals[0][1];
    const mostExpensive = sortedTotals[sortedTotals.length - 1][1];
    const savings = mostExpensive - cheapest;
    const savingsPercent = ((savings / mostExpensive) * 100).toFixed(0);
    
    return { savings, savingsPercent, cheapestStore: sortedTotals[0][0], expensiveStore: sortedTotals[sortedTotals.length - 1][0] };
  };

  // Share shopping list
  const handleShare = async () => {
    if (!currentList) return;
    
    const listText = currentList.items?.map(item => {
      const best = getBestPrice(item.store_prices);
      return `• ${item.product_name} x${item.quantity}${best ? ` - ${formatPrice(best.price)} at ${STORE_INFO[best.store]?.name}` : ''}`;
    }).join('\n');
    
    const savingsInfo = calculateSavings();
    let shareText = `🛒 My PricePantry Shopping List\n\n${listText}`;
    
    if (savingsInfo) {
      shareText += `\n\n💰 Shop at ${STORE_INFO[savingsInfo.cheapestStore]?.name} to save ${formatPrice(savingsInfo.savings)} (${savingsInfo.savingsPercent}%)!`;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Shopping List',
          text: shareText,
        });
        toast.success('List shared!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Fallback to copy
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('List copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00E676] rounded-xl flex items-center justify-center border-2 border-black">
              <ShoppingCart className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="shopping-list-title">Shopping List</h1>
              <p className="text-sm text-gray-500">
                {currentList ? `${currentList.items?.length || 0} items` : "Create a list to get started"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {currentList && currentList.items?.length > 0 && (
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-2 border-black"
                data-testid="share-list-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
            
            {currentList && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-[#00E676] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    data-testid="add-item-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 border-black max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Item to List</DialogTitle>
                    <DialogDescription>Search for a product to add</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 border-2 border-black"
                        data-testid="add-item-search"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {searchResults.map((product) => {
                          const best = getBestPrice(product.store_prices);
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleAddItem(product)}
                              className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#00E676] transition-colors"
                              data-testid={`add-product-${product.id}`}
                            >
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1 text-left">
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.brand}</p>
                              </div>
                              {best && (
                                <span className="font-mono font-bold text-[#00E676]">
                                  {formatPrice(best.price)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {!currentList && (
              <Button
                onClick={handleCreateList}
                disabled={creatingList}
                className="bg-[#00E676] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                data-testid="create-list-btn"
              >
                {creatingList ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create List
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !currentList ? (
          <div className="text-center py-16" data-testid="empty-list">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold mb-2">No shopping list yet</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create a shopping list to start adding products and compare prices across stores.
            </p>
            <Button
              onClick={handleCreateList}
              disabled={creatingList}
              className="bg-[#00E676] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Shopping List
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {currentList.items?.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <p className="text-gray-500 mb-4">Your shopping list is empty</p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    variant="outline"
                    className="border-2 border-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first item
                  </Button>
                </div>
              ) : (
                currentList.items?.map((item) => {
                  const best = getBestPrice(item.store_prices);
                  return (
                    <div
                      key={item.id}
                      className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] flex items-center gap-4"
                      data-testid={`list-item-${item.id}`}
                    >
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{item.product_name}</p>
                        {best && (
                          <p className="text-sm text-gray-500">
                            Best: {formatPrice(best.price)} at{" "}
                            <span style={{ color: STORE_INFO[best.store]?.color }}>
                              {STORE_INFO[best.store]?.name}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 border-2 border-black"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 border-2 border-black"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  );
                })
              )}

              {currentList.items?.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete List
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-2 border-black">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete shopping list?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your shopping list and all items.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteList}
                        className="bg-red-500 text-white border-2 border-red-500"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Store Totals */}
            <div className="space-y-4">
              <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5" />
                  <h3 className="font-bold">Store Totals</h3>
                </div>

                {totals && currentList.items?.length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(totals.store_totals || {})
                      .filter(([_, total]) => total > 0)
                      .sort((a, b) => a[1] - b[1])
                      .map(([store, total], index) => (
                        <div
                          key={store}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            index === 0 ? "bg-[#00E676]/20 border-2 border-[#00E676]" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: STORE_INFO[store]?.color }}
                            />
                            <span className="font-medium">{STORE_INFO[store]?.name}</span>
                            {index === 0 && (
                              <Badge className="bg-[#00E676] text-black text-xs">Cheapest</Badge>
                            )}
                          </div>
                          <span className="font-mono font-bold">{formatPrice(total)}</span>
                        </div>
                      ))}

                    {totals.cheapest_store && (
                      <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
                        <div className="flex items-center gap-2 text-[#00E676]">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold">
                            Save at {STORE_INFO[totals.cheapest_store]?.name}!
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Total: {formatPrice(totals.cheapest_total)} for {totals.item_count} items
                        </p>
                        
                        {/* Savings Calculator */}
                        {calculateSavings() && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-700">
                              <TrendingDown className="w-4 h-4" />
                              <span className="font-bold text-sm">
                                You save {formatPrice(calculateSavings().savings)}
                              </span>
                              <Badge className="bg-green-600 text-white text-xs">
                                {calculateSavings().savingsPercent}% off
                              </Badge>
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                              vs shopping at {STORE_INFO[calculateSavings().expensiveStore]?.name}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Add items to see price comparison</p>
                )}
              </div>

              <div className="bg-[#00E676]/10 border-2 border-[#00E676] rounded-xl p-4">
                <h4 className="font-bold mb-2">How it works</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>1. Add products to your list</li>
                  <li>2. See total cost at each store</li>
                  <li>3. Shop at the cheapest store!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingListPage;
