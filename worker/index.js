// Custom worker code injected into next-pwa's service worker
// This adds push notification + notificationclick handlers

// Push event — handles background push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  let data = {
    title: 'MPCL - New Message',
    body: 'You have a new message',
    icon: '/LOGO_NEW.jpg',
    badge: '/favicon.png',
    tag: 'chat-message',
    senderName: 'Someone',
    url: '/'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/LOGO_NEW.jpg',
    badge: data.badge || '/favicon.png',
    tag: data.tag || `chat-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/',
      senderName: data.senderName,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open-chat', title: '💬 Open Chat' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Send message to client to open chat
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: event.action || 'open-chat',
              data: event.notification.data
            });
            return;
          }
        }
        // No window open — open new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed');
});

// Message handler — receive messages from main app to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, senderName, tag, url } = event.data;

    self.registration.showNotification(title, {
      body: body,
      icon: '/LOGO_NEW.jpg',
      badge: '/favicon.png',
      tag: tag || `chat-${senderName}-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: url || '/',
        senderName: senderName,
        timestamp: Date.now()
      },
      actions: [
        { action: 'open-chat', title: '💬 Open Chat' },
        { action: 'dismiss', title: '✕ Dismiss' }
      ]
    });
  }
});
