'use client';

import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { NotificationRow } from '@/app/services/notifications';
import {
  getNotificationsAction,
  markAllReadAction,
  markReadAction,
  subscribePushAction,
} from '@/components/notifications/actions';
import { useUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { getPusherClient } from '@/lib/pusher-client';

import { NotificationItem } from './notification-item';

const NOTIFICATION_EVENTS = [
  'sale_created',
  'payment_registered',
  'stock_dispatched',
  'stock_returned',
  'stock_low',
  'stock_adjusted',
] as const;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationBell() {
  const { id: userId, role } = useUser();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isPushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

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
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const channel = role === 'seller' ? `private-seller-${userId}` : `private-owner-${userId}`;
    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const handleEvent = () => void loadNotifications();
    for (const event of NOTIFICATION_EVENTS) {
      subscription.bind(event, handleEvent);
    }
    return () => {
      for (const event of NOTIFICATION_EVENTS) {
        subscription.unbind(event, handleEvent);
      }
      pusher.unsubscribe(channel);
    };
  }, [userId, role, loadNotifications]);

  useEffect(() => {
    if (!isPushSupported || !('Notification' in window)) return;
    setPushPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setIsSubscribed(!!sub))
        .catch(() => undefined);
    }
  }, [isPushSupported]);

  const handleEnablePush = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      setPushPermission('granted');
      const json = sub.toJSON();
      if (json.endpoint && json.keys) {
        const result = await subscribePushAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys['p256dh'] ?? '', auth: json.keys['auth'] ?? '' },
        });
        if (result?.data?.success) {
          setIsSubscribed(true);
        } else {
          toast.error('No se pudo guardar la suscripción. Intentá de nuevo.');
        }
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        setPushPermission(Notification.permission);
        toast.error('Permiso denegado. Habilitá las notificaciones en la configuración del sistema.');
      } else {
        toast.error(`Error al activar: ${err instanceof Error ? err.message : 'desconocido'}`);
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
    void loadNotifications();
  }, [loadNotifications]);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) void loadNotifications();
  };

  const handleMarkRead = async (id: number) => {
    await markRead({ id });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications([]);
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
        <div className="max-h-90 overflow-y-auto">
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
        {isPushSupported && !(pushPermission === 'granted' && isSubscribed) && (
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
                  {isSubscribing
                    ? 'Activando...'
                    : pushPermission === 'granted'
                      ? 'Reactivar notificaciones push'
                      : 'Activar notificaciones push'}
                </Button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
