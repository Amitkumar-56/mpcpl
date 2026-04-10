// PWA Enhanced Notifications Utility
// Special handling for PWA installed apps

// Check if running in PWA standalone mode
export const isPWAStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
};

// Check if running in PWA
export const isPWA = () => {
  if (typeof window === 'undefined') return false;
  return isPWAStandalone() || window.navigator.standalone;
};

// Enhanced PWA notification
export const showPWANotification = (title, message, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  try {
    const isStandalone = isPWAStandalone();
    
    const notificationOptions = {
      body: message,
      icon: '/LOGO_NEW.jpg',
      badge: '/favicon.png',
      tag: `pwa-${title}`, // Prevent duplicate notifications
      requireInteraction: isStandalone, // Keep notification in PWA
      silent: false,
      vibrate: isStandalone ? [200, 100, 200] : undefined,
      data: {
        title: title,
        message: message,
        url: window.location.href,
        timestamp: Date.now(),
        isPWA: isStandalone
      },
      // PWA specific actions
      actions: isStandalone ? [
        {
          action: 'open-chat',
          title: 'Open Chat',
          icon: '/LOGO_NEW.jpg'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/favicon.png'
        }
      ] : [],
      ...options
    };

    const notification = new Notification(title, notificationOptions);

    // Enhanced click handling for PWA
    notification.onclick = () => {
      console.log('Notification clicked:', { title, isStandalone });
      
      // Focus or open window
      if (isStandalone) {
        // In PWA, just focus the window
        window.focus();
        
        // Try to open chat widget
        const chatWidget = document.querySelector('[data-chat-widget]');
        const chatToggle = document.querySelector('[data-chat-toggle]');
        
        if (chatWidget) {
          chatWidget.scrollIntoView({ behavior: 'smooth' });
          // Try to focus on chat input
          const chatInput = chatWidget.querySelector('input[type="text"]');
          if (chatInput) {
            setTimeout(() => chatInput.focus(), 500);
          }
        } else if (chatToggle) {
          chatToggle.click();
        }
      } else {
        // In browser, focus window
        window.focus();
      }
      
      notification.close();
    };

    // Handle notification actions (PWA only)
    if (isStandalone) {
      notification.addEventListener('notificationclick', (event) => {
        console.log('PWA Notification action:', event.action);
        
        if (event.action === 'open-chat') {
          window.focus();
          const chatToggle = document.querySelector('[data-chat-toggle]');
          if (chatToggle) {
            chatToggle.click();
          }
        } else if (event.action === 'dismiss') {
          // Just close
        }
        
        notification.close();
      });
    }

    // Auto-close timing
    const autoCloseTime = isStandalone ? 15000 : 8000; // Longer in PWA
    setTimeout(() => {
      notification.close();
    }, autoCloseTime);

    console.log('PWA Notification shown:', { title, message, isStandalone });
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

  if (Notification.permission === 'granted') {
    console.log('PWA: Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      // In PWA, show a more descriptive prompt
      const isStandalone = isPWAStandalone();
      if (isStandalone) {
        console.log('PWA: Requesting notification permission for standalone app');
      }
      
      const permission = await Notification.requestPermission();
      console.log('PWA: Notification permission result:', permission);
      
      if (permission === 'granted' && isStandalone) {
        // Show a welcome notification in PWA
        showPWANotification(
          'MPCL Chat Ready',
          'Notifications enabled! You will receive chat alerts.',
          {
            icon: '/LOGO_NEW.jpg',
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
  
  // Request permission
  const granted = await requestPWANotificationPermission();
  
  if (granted) {
    console.log('PWA: Notifications ready');
    
    // In PWA, register for background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('PWA: Background sync available');
        return registration;
      } catch (error) {
        console.log('PWA: Background sync not available');
      }
    }
  } else {
    console.log('PWA: Notifications not available');
  }
  
  return granted;
};

// Show chat notification with PWA enhancements
export const showChatNotificationPWA = (senderName, message, options = {}) => {
  const isStandalone = isPWAStandalone();
  
  return showPWANotification(
    `New message from ${senderName}`,
    message,
    {
      ...options,
      // Enhanced options for PWA
      tag: `chat-${senderName}`,
      renotify: true, // Show new notification even if same tag exists
      silent: false,
      // Custom actions for chat
      actions: isStandalone ? [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/LOGO_NEW.jpg'
        },
        {
          action: 'open-chat',
          title: 'Open Chat',
          icon: '/favicon.png'
        }
      ] : []
    }
  );
};
