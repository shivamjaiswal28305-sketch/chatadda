// ChatAdda service worker — sirf push notifications ke liye
// (koi offline caching nahi ki, taaki app hamesha latest version load kare)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'ChatAdda', body: 'Naya message aaya hai', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (err) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification tap karne pe app khol do (ya jo already khula hai use focus karo)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
