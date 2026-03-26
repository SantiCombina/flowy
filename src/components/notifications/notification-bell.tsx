'use client';

import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useState } from 'react';

import type { NotificationRow } from '@/app/services/notifications';
import {
  getNotificationsAction,
  markAllReadAction,
  markReadAction,
  subscribePushAction,
} from '@/components/notifications/actions';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

import { NotificationItem } from './notification-item';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isPushSupported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

  const { executeAsync: fetchNotifications } = useAction(getNotificationsAction);
  const { executeAsync: markRead } = useAction(markReadAction);
  const { executeAsync: markAllRead, isExecuting: isMarkingAll } = useAction(markAllReadAction);

  const loadNotifications = useCallback(async () => {
    const result = await fetchNotifications();
    if (result?.data) {
      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    if (isPushSupported && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, [isPushSupported]);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const json = sub.toJSON();
      if (json.endpoint && json.keys) {
        await subscribePushAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys['p256dh'] ?? '', auth: json.keys['auth'] ?? '' },
        });
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    const handleNewNotification = () => void loadNotifications();
    window.addEventListener('flowy:notification', handleNewNotification);
    return () => window.removeEventListener('flowy:notification', handleNewNotification);
  }, [loadNotifications]);

  useEffect(() => {
    const timer = setTimeout(() => void loadNotifications(), 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) void loadNotifications();
  };

  const handleMarkRead = async (id: number) => {
    await markRead({ id });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:bg-transparent hover:text-blue-500 [&_svg]:hover:text-blue-500"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todo como leído
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </div>
        {isPushSupported && pushPermission !== 'granted' && (
          <>
            <Separator />
            <div className="px-4 py-3">
              {pushPermission === 'denied' ? (
                <p className="text-xs text-muted-foreground">
                  Notificaciones bloqueadas. Habilitálas desde la configuración del navegador.
                </p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={handleEnablePush}
                  disabled={isSubscribing}
                >
                  <BellRing className="h-3.5 w-3.5" />
                  {isSubscribing ? 'Activando...' : 'Activar notificaciones push'}
                </Button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
