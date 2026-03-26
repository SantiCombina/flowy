'use client';

import { useEffect } from 'react';

import { subscribePushAction } from './actions';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushRegistration() {
  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const register = async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        const json = existing.toJSON();
        if (json.endpoint && json.keys) {
          await subscribePushAction({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys['p256dh'] ?? '', auth: json.keys['auth'] ?? '' },
          });
        }
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      if (json.endpoint && json.keys) {
        await subscribePushAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys['p256dh'] ?? '', auth: json.keys['auth'] ?? '' },
        });
      }
    };

    void register().catch(console.error);
  }, []);

  return null;
}
