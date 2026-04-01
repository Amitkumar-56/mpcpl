// PWA Notification utility for chat messages

// Request notification permission
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('🔔 Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('🔔 Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('🔔 Error requesting notification permission:', error);
      return false;
    }
  }

  console.log('🔔 Notification permission denied');
  return false;
};

// Show PWA notification for new chat messages
export const showChatNotification = (customerName, message, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('🔔 Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.log('🔔 Notification permission not granted');
    return false;
  }

  try {
    const notification = new Notification(`📨 New message from ${customerName}`, {
      body: message,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `chat-${customerName}`, // Prevent duplicate notifications
      requireInteraction: true, // Keep notification until user interacts
      silent: false, // Play sound/vibrate
      vibrate: [200, 100, 200], // Vibration pattern for mobile
      ...options
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      // If chat is open, focus on it
      const chatElement = document.querySelector('[data-chat-widget]');
      if (chatElement) {
        chatElement.focus();
        chatElement.scrollIntoView({ behavior: 'smooth' });
      }
      notification.close();
    };

    // Auto-close after 8 seconds
    setTimeout(() => {
      notification.close();
    }, 8000);

    console.log('🔔 Chat notification shown:', { customerName, message });
    return true;
  } catch (error) {
    console.error('🔔 Error showing notification:', error);
    return false;
  }
};

// Show notification for new chat requests
export const showChatRequestNotification = (customerName, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('🔔 Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.log('🔔 Notification permission not granted');
    return false;
  }

  try {
    const notification = new Notification(`🆕 New chat request from ${customerName}`, {
      body: 'Customer is waiting to connect with you',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `chat-request-${customerName}`,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200], // Longer vibration for requests
      actions: [
        {
          action: 'accept',
          title: 'Accept Chat'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      ...options
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Handle action buttons
    notification.addEventListener('notificationclick', (event) => {
      if (event.action === 'accept') {
        // Trigger chat acceptance
        window.dispatchEvent(new CustomEvent('acceptChatRequest', {
          detail: { customerName }
        }));
      }
      notification.close();
    });

    // Auto-close after 12 seconds (longer for requests)
    setTimeout(() => {
      notification.close();
    }, 12000);

    console.log('🔔 Chat request notification shown:', customerName);
    return true;
  } catch (error) {
    console.error('🔔 Error showing chat request notification:', error);
    return false;
  }
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

  if (status.canShow) {
    console.log('🔔 Notifications ready');
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
export const showUnreadCountNotification = (count, customerNames = []) => {
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
