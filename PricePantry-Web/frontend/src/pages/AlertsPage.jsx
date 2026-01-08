import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Trash2, Plus, Search, Loader2, Mail, BellRing, BellOff } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { formatPrice, getBestPrice } from "@/lib/utils";
import { toast } from "sonner";
import {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  showNotification,
  savePushSubscription,
} from "@/lib/pushNotifications";

export const AlertsPage = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [email, setEmail] = useState("");
  const [enablePush, setEnablePush] = useState(false);
  const [pushPermission, setPushPermission] = useState(getPermissionStatus());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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
      console.error("Error searching products:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    const bestPrice = getBestPrice(product.store_prices);
    setTargetPrice(bestPrice ? (bestPrice.price * 0.9).toFixed(2) : "");
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleCreateAlert = async () => {
    if (!selectedProduct || !targetPrice) return;

    setCreating(true);
    try {
      // Handle push notification permission
      if (enablePush && pushPermission !== 'granted') {
        const result = await requestPermission();
        setPushPermission(result.permission);
        if (!result.success) {
          toast.error("Push notifications permission denied. Email alerts will still work.");
        }
      }

      // Save push subscription locally
      if (enablePush && (pushPermission === 'granted' || (await requestPermission()).success)) {
        savePushSubscription(selectedProduct.id, parseFloat(targetPrice));
      }

      const bestPrice = getBestPrice(selectedProduct.store_prices);
      await api.createAlert({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        target_price: parseFloat(targetPrice),
        current_best_price: bestPrice ? bestPrice.price : 0,
        email: email || null,
      });
      
      // Show demo notification if push is enabled
      if (enablePush && pushPermission === 'granted') {
        showNotification("Alert Created! 🎉", {
          body: `We'll notify you when ${selectedProduct.name} drops below $${targetPrice}`,
        });
      }
      
      toast.success(email ? "Price alert created with email notifications!" : "Price alert created!");
      setIsDialogOpen(false);
      setSelectedProduct(null);
      setTargetPrice("");
      setEmail("");
      setEnablePush(false);
      fetchAlerts();
    } catch (error) {
      console.error("Error creating alert:", error);
      toast.error("Failed to create alert");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await api.deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success("Alert deleted");
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast.error("Failed to delete alert");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="alerts-title">Price Alerts</h1>
              <p className="text-sm text-gray-500">
                Get notified when prices drop
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#00E676] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                data-testid="create-alert-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-black max-w-md">
              <DialogHeader>
                <DialogTitle>Create Price Alert</DialogTitle>
                <DialogDescription>
                  Search for a product and set your target price
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {!selectedProduct ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search for a product..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 border-2 border-black"
                      data-testid="alert-search-input"
                    />
                    
                    {(searchResults || []).length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black rounded-lg overflow-hidden z-10 max-h-60 overflow-y-auto">
                        {(searchResults || []).map((product) => {
                          const bestPrice = getBestPrice(product.store_prices);
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleSelectProduct(product)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              data-testid={`search-result-${product.id}`}
                            >
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                {product.brand} · Current: {bestPrice ? formatPrice(bestPrice.price) : "N/A"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{selectedProduct.name}</p>
                        <p className="text-sm text-gray-500">{selectedProduct.brand}</p>
                        <p className="text-sm text-gray-500">
                          Current best: {formatPrice(getBestPrice(selectedProduct.store_prices)?.price || 0)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedProduct && (
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Target Price (AUD)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter target price"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="border-2 border-black"
                        data-testid="target-price-input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        We&apos;ll notify you when the price drops to this amount or lower
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Email for Notifications (Optional)
                      </Label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-2 border-black"
                        data-testid="alert-email-input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Receive an email when the price drops
                      </p>
                    </div>

                    {/* Push Notifications Toggle */}
                    {isPushSupported() && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {pushPermission === 'granted' ? (
                            <BellRing className="w-5 h-5 text-[#00E676]" />
                          ) : (
                            <BellOff className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <Label className="text-sm font-medium">Browser Push Notifications</Label>
                            <p className="text-xs text-gray-500">
                              {pushPermission === 'granted' 
                                ? "Enabled - Get instant browser alerts"
                                : pushPermission === 'denied'
                                ? "Blocked - Enable in browser settings"
                                : "Get instant alerts in your browser"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={enablePush}
                          onCheckedChange={setEnablePush}
                          disabled={pushPermission === 'denied'}
                          data-testid="push-notification-toggle"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-2 border-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAlert}
                  disabled={!selectedProduct || !targetPrice || creating}
                  className="bg-[#00E676] text-black font-bold border-2 border-black"
                  data-testid="confirm-create-alert-btn"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Alert"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (alerts || []).length === 0 ? (
          <div className="text-center py-16" data-testid="empty-alerts">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold mb-2">No price alerts</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Create your first price alert to get notified when products drop to your target price.
            </p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="alerts-list">
            {(alerts || []).map((alert) => (
              <div
                key={alert.id}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-between"
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alert.triggered ? "bg-green-100" : "bg-amber-100"}`}>
                    <Bell className={`w-5 h-5 ${alert.triggered ? "text-green-600" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <p className="font-bold">{alert.product_name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Target: {formatPrice(alert.target_price)}</span>
                      <span>·</span>
                      <span>Current: {formatPrice(alert.current_best_price)}</span>
                      {alert.email && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {alert.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500"
                      data-testid={`delete-alert-${alert.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-2 border-black">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete alert?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the price alert for {alert.product_name}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="bg-red-500 text-white border-2 border-red-500"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-[#00E676]/10 border-2 border-[#00E676] rounded-xl p-6">
          <h3 className="font-bold text-lg mb-2">How Price Alerts Work</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              Search for a product you want to track
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              Set your target price and choose notification preferences
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              Get notified via email or browser push notifications when prices drop!
            </li>
          </ul>
          
          {/* Push notification status */}
          <div className="mt-4 pt-4 border-t border-[#00E676]/30">
            <div className="flex items-center gap-2 text-sm">
              {pushPermission === 'granted' ? (
                <>
                  <BellRing className="w-4 h-4 text-[#00E676]" />
                  <span className="text-green-700">Browser notifications enabled</span>
                </>
              ) : pushPermission === 'denied' ? (
                <>
                  <BellOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Browser notifications blocked</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Enable browser notifications for instant alerts</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
