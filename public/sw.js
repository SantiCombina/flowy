self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Flowy', {
      body: data.body ?? '',
      icon: '/web-app-manifest-192x192.png',
      data: { url: data.url ?? '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const appUrl = event.notification.data?.url ?? '/dashboard';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(appUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(appUrl);
    }),
  );
});
