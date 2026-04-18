// PWA Enhanced Notifications Utility
// Uses Service Worker showNotification() for reliable mobile/PWA notifications

// Check if running in PWA standalone mode
export const isPWAStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
};

// Check if running in PWA
export const isPWA = () => {
  if (typeof window === 'undefined') return false;
  return isPWAStandalone();
};

// Get active service worker registration
const getSWRegistration = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
};

// Enhanced PWA notification via Service Worker
export const showPWANotification = async (title, message, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (window.Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  try {
    const isStandalone = isPWAStandalone();
    const registration = await getSWRegistration();

    const notificationOptions = {
      body: message,
      icon: '/LOGO_NEW.jpg',
      badge: '/favicon.png',
      tag: options.tag || `pwa-${title}-${Date.now()}`,
      renotify: options.renotify !== false,
      requireInteraction: isStandalone,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        title: title,
        message: message,
        url: window.location.href,
        timestamp: Date.now(),
        isPWA: isStandalone
      },
      actions: [
        { action: 'open-chat', title: '💬 Open Chat' },
        { action: 'dismiss', title: '✕ Dismiss' }
      ],
      ...options
    };

    // Use Service Worker showNotification (works in background!)
    if (registration) {
      await registration.showNotification(title, notificationOptions);
      console.log('PWA Notification via SW shown:', { title, message, isStandalone });
      return true;
    }

    // Fallback: send message to SW to show notification
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body: message,
        senderName: options.senderName || title,
        tag: notificationOptions.tag,
        url: window.location.href
      });
      console.log('PWA Notification sent to SW:', { title, message });
      return true;
    }

    // Last fallback: new Notification API
    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setTimeout(() => notification.close(), isStandalone ? 15000 : 8000);

    console.log('PWA Notification (fallback) shown:', { title, message, isStandalone });
    return true;
  } catch (error) {
    console.error('Error showing PWA notification:', error);
    return false;
  }
};

// Request notification permission with PWA enhancements
export const requestPWANotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (window.Notification.permission === 'granted') {
    console.log('PWA: Notification permission already granted');
    return true;
  }

  if (window.Notification.permission !== 'denied') {
    try {
      const permission = await window.Notification.requestPermission();
      console.log('PWA: Notification permission result:', permission);

      if (permission === 'granted' && isPWAStandalone()) {
        // Show a welcome notification in PWA
        showPWANotification(
          '✅ MPCL Chat Ready',
          'Notifications enabled! You will receive chat alerts.',
          {
            tag: 'pwa-welcome',
            requireInteraction: false
          }
        );
      }

      return permission === 'granted';
    } catch (error) {
      console.error('PWA: Error requesting notification permission:', error);
      return false;
    }
  }

  console.log('PWA: Notification permission denied');
  return false;
};

// Initialize PWA notifications
export const initializePWANotifications = async () => {
  console.log('PWA: Initializing notifications...');

  const isStandalone = isPWAStandalone();
  console.log('PWA: Standalone mode:', isStandalone);

  // Service worker notification handlers are injected via next-pwa customWorkerDir
  // No separate SW registration needed

  // Request permission
  const granted = await requestPWANotificationPermission();

  if (granted) {
    console.log('PWA: Notifications ready');
  } else {
    console.log('PWA: Notifications not available');
  }

  return granted;
};

// Show chat notification with PWA enhancements
export const showChatNotificationPWA = async (senderName, message, options = {}) => {
  return showPWANotification(
    `💬 ${senderName}`,
    message,
    {
      ...options,
      tag: options.tag || `chat-${senderName}`,
      renotify: true,
      senderName: senderName
    }
  );
};
