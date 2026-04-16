// PWA Notification utility for chat messages
// Uses Service Worker showNotification() for reliable mobile/PWA notifications

let swRegistration = null;
let notificationPermissionGranted = false;

// Register custom service worker and store registration
const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('🔔 Service Worker not supported');
    return null;
  }

  try {
    // First, try to get the existing SW registration (from next-pwa)
    const existingReg = await navigator.serviceWorker.getRegistration('/');
    if (existingReg) {
      swRegistration = existingReg;
      console.log('🔔 Using existing Service Worker registration:', existingReg.scope);
    } else {
      // Register our custom SW as fallback
      const registration = await navigator.serviceWorker.register('/custom-sw.js', {
        scope: '/'
      });
      swRegistration = registration;
      console.log('🔔 Custom Service Worker registered:', registration.scope);
    }

    // Listen for notification click messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('🔔 Notification clicked, opening chat...');
        window.focus();
        // Dispatch event so chat components can react
        window.dispatchEvent(new CustomEvent('openChatFromNotification', {
          detail: event.data
        }));
      }
    });

    return swRegistration;
  } catch (error) {
    console.error('🔔 Service Worker registration failed:', error);
    return null;
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('🔔 Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    notificationPermissionGranted = true;
    console.log('🔔 Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      notificationPermissionGranted = permission === 'granted';
      console.log('🔔 Notification permission:', permission);
      return notificationPermissionGranted;
    } catch (error) {
      console.error('🔔 Error requesting notification permission:', error);
      return false;
    }
  }

  console.log('🔔 Notification permission denied');
  return false;
};

// Get active service worker registration
const getServiceWorkerRegistration = async () => {
  if (swRegistration) return swRegistration;

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    // Try to get any active registration
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      swRegistration = registration;
      return registration;
    }
  } catch (e) {
    console.log('🔔 No active service worker registration');
  }

  return null;
};

// Show notification using Service Worker (works in PWA background!)
const showNotificationViaSW = async (title, body, options = {}) => {
  try {
    const registration = await getServiceWorkerRegistration();

    if (registration) {
      // Use SW showNotification — this works when app is backgrounded!
      await registration.showNotification(title, {
        body: body,
        icon: '/LOGO_NEW.jpg',
        badge: '/favicon.png',
        tag: options.tag || `chat-${Date.now()}`,
        renotify: options.renotify !== false,
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
        data: {
          url: options.url || (typeof window !== 'undefined' ? window.location.href : '/'),
          senderName: options.senderName || title,
          sessionId: options.sessionId,
          senderId: options.senderId,
          customerId: options.customerId,
          timestamp: Date.now()
        },
        actions: [
          { action: 'open-chat', title: '💬 Open Chat' },
          { action: 'dismiss', title: '✕ Dismiss' }
        ],
        ...options
      });

      console.log('🔔 SW Notification shown:', title, body);
      return true;
    }
  } catch (error) {
    console.error('🔔 SW notification failed:', error);
  }

  return false;
};

// Fallback: use new Notification() API (works in browser foreground)
const showNotificationFallback = (title, body, options = {}) => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    const notification = new Notification(title, {
      body: body,
      icon: '/LOGO_NEW.jpg',
      badge: '/favicon.png',
      tag: options.tag || `chat-${Date.now()}`,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      window.dispatchEvent(new CustomEvent('openChatFromNotification', {
        detail: { action: 'open-chat' }
      }));
    };

    // Auto-close after 15 seconds
    setTimeout(() => notification.close(), 15000);

    console.log('🔔 Fallback notification shown:', title, body);
    return true;
  } catch (error) {
    console.error('🔔 Fallback notification failed:', error);
    return false;
  }
};

// Show PWA notification for new chat messages (main export)
export const showChatNotification = async (senderName, message, options = {}) => {
  if (typeof window === 'undefined') return false;

  // Don't show notification if page is visible and user is actively viewing
  // (caller should handle this check)

  if (Notification.permission === 'default') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('🔔 Notification permission denied/blocked');
    return false;
  }

  const title = `💬 ${senderName}`;
  const body = message || 'New message received';
  const notifOptions = {
    tag: `chat-${senderName}`,
    renotify: true,
    senderName: senderName,
    ...options
  };

  // Try Service Worker first (works in background!)
  const swResult = await showNotificationViaSW(title, body, notifOptions);
  if (swResult) return true;

  // Fallback to old API
  return showNotificationFallback(title, body, notifOptions);
};

// Show notification for new chat requests
export const showChatRequestNotification = async (customerName, options = {}) => {
  const title = `🆕 New chat request — ${customerName}`;
  const body = 'Customer is waiting to connect with you';
  const notifOptions = {
    tag: `chat-request-${customerName}`,
    renotify: true,
    senderName: customerName,
    ...options
  };

  const swResult = await showNotificationViaSW(title, body, notifOptions);
  if (swResult) return true;
  return showNotificationFallback(title, body, notifOptions);
};

// Check if notifications are supported and permission granted
export const checkNotificationSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, permission: 'unsupported' };
  }

  if (!('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }

  return {
    supported: true,
    permission: Notification.permission,
    canShow: Notification.permission === 'granted'
  };
};

// Initialize notifications on app load
export const initializeNotifications = async () => {
  const status = checkNotificationSupport();

  if (!status.supported) {
    console.log('🔔 Notifications not supported in this browser');
    return false;
  }

  // Register our custom service worker
  await registerServiceWorker();

  if (status.canShow) {
    console.log('🔔 Notifications ready (SW + permission granted)');
    return true;
  }

  // Request permission if not denied
  if (status.permission === 'default') {
    console.log('🔔 Requesting notification permission...');
    return await requestNotificationPermission();
  }

  console.log('🔔 Notifications blocked by user');
  return false;
};

// Show notification for unread messages count
export const showUnreadCountNotification = async (count, customerNames = []) => {
  if (count <= 0) return false;

  const namesText = customerNames.length > 0
    ? ` from ${customerNames.slice(0, 3).join(', ')}${customerNames.length > 3 ? ' and others' : ''}`
    : '';

  return showChatNotification(
    'Multiple Chats',
    `You have ${count} unread message${count > 1 ? 's' : ''}${namesText}`,
    {
      tag: 'unread-messages',
      icon: '/favicon.png'
    }
  );
};
