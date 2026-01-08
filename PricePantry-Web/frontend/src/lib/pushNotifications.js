/**
 * Push Notification Utility for PricePantry
 * 
 * This module handles browser push notification permissions and display.
 * Note: For production, you would integrate with a service worker and a push service
 * like Firebase Cloud Messaging (FCM) or Web Push API with VAPID keys.
 */

// Check if notifications are supported
export const isPushSupported = () => {
  return 'Notification' in window;
};

// Get current permission status
export const getPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
};

// Request notification permission
export const requestPermission = async () => {
  if (!isPushSupported()) {
    return { success: false, error: 'Notifications not supported in this browser' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { 
      success: permission === 'granted', 
      permission,
      error: permission === 'denied' ? 'Permission denied by user' : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Show a local notification (for demo/testing)
export const showNotification = (title, options = {}) => {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    console.warn('Cannot show notification: permission not granted');
    return null;
  }

  const defaultOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'pricepantry-notification',
    renotify: true,
    ...options,
  };

  try {
    const notification = new Notification(title, defaultOptions);
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.onClick) options.onClick();
    };

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Show a price drop notification
export const showPriceDropNotification = (productName, oldPrice, newPrice, store) => {
  const savings = ((oldPrice - newPrice) / oldPrice * 100).toFixed(0);
  
  return showNotification(`🎉 Price Drop: ${productName}`, {
    body: `Now $${newPrice.toFixed(2)} at ${store} (${savings}% off!)`,
    tag: `price-drop-${productName}`,
    data: { productName, oldPrice, newPrice, store },
  });
};

// Store push subscription in localStorage (for demo)
// In production, you'd send this to your backend
export const savePushSubscription = (productId, targetPrice) => {
  const subscriptions = JSON.parse(localStorage.getItem('pushSubscriptions') || '{}');
  subscriptions[productId] = {
    targetPrice,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('pushSubscriptions', JSON.stringify(subscriptions));
};

export const getPushSubscriptions = () => {
  return JSON.parse(localStorage.getItem('pushSubscriptions') || '{}');
};

export const removePushSubscription = (productId) => {
  const subscriptions = JSON.parse(localStorage.getItem('pushSubscriptions') || '{}');
  delete subscriptions[productId];
  localStorage.setItem('pushSubscriptions', JSON.stringify(subscriptions));
};

export const isPushEnabled = (productId) => {
  const subscriptions = getPushSubscriptions();
  return subscriptions[productId]?.enabled || false;
};
