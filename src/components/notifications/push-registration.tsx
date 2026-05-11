'use client';

import { useEffect } from 'react';

import { subscribePushAction } from './actions';

export function PushRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    void navigator.serviceWorker.register('/sw.js');

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !('Notification' in window) || Notification.permission !== 'granted') return;

    const resync = async () => {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!existing) return;
      const json = existing.toJSON();
      if (json.endpoint && json.keys) {
        await subscribePushAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys['p256dh'] ?? '', auth: json.keys['auth'] ?? '' },
        });
      }
    };

    void resync().catch(() => undefined);
  }, []);

  return null;
}
