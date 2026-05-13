'use client';

import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useIsMobile } from '@/hooks/use-mobile';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { getPusherClient } from '@/lib/pusher-client';
import { queryKeys } from '@/lib/query-keys';

import { NotificationItem } from './notification-item';

const NOTIFICATION_EVENTS = [
  'sale_created',
  'payment_registered',
  'stock_dispatched',
  'stock_returned',
  'stock_low',
  'stock_adjusted',
] as const;

const pushPermissionStore = {
  listeners: new Set<() => void>(),
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  },
  getSnapshot(): NotificationPermission | null {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;
    return Notification.permission;
  },
  notify() {
    this.listeners.forEach((l) => l());
  },
};

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
  const isMobile = useIsMobile();
  const { invalidateQueries } = useInvalidateQueries();
  const [open, setOpen] = useState(false);
  const pushPermission = useSyncExternalStore(
    (cb) => pushPermissionStore.subscribe(cb),
    () => pushPermissionStore.getSnapshot(),
    () => null,
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isPushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

  const { data } = useServerActionQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotificationsAction,
    enabled: open,
    staleTime: 5_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const { executeAsync: markRead } = useAction(markReadAction);
  const { executeAsync: markAllRead, isExecuting: isMarkingAll } = useAction(markAllReadAction);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const channel = role === 'seller' ? `private-seller-${userId}` : `private-owner-${userId}`;
    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const handleEvent = () => invalidateQueries([queryKeys.notifications.list()]);
    for (const event of NOTIFICATION_EVENTS) {
      subscription.bind(event, handleEvent);
    }
    return () => {
      for (const event of NOTIFICATION_EVENTS) {
        subscription.unbind(event, handleEvent);
      }
    };
  }, [userId, role, invalidateQueries]);

  useEffect(() => {
    if (!isPushSupported || !('Notification' in window)) return;
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
      pushPermissionStore.notify();
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
        pushPermissionStore.notify();
        toast.error('Permiso denegado. Habilitá las notificaciones en la configuración del sistema.');
      } else {
        toast.error(`Error al activar: ${err instanceof Error ? err.message : 'desconocido'}`);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
  };

  const handleMarkRead = async (id: number) => {
    await markRead({ id });
    invalidateQueries([queryKeys.notifications.list()]);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    invalidateQueries([queryKeys.notifications.list()]);
  };

  const notificationList = (
    <>
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
    </>
  );

  const content = (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">Notificaciones</p>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:bg-transparent hover:text-info [&_svg]:hover:text-info"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todo como leído
          </Button>
        )}
      </div>
      <Separator />
      <div className="max-h-90 overflow-y-auto flex-1">{notificationList}</div>
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
    </>
  );

  const sheetContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">Notificaciones</p>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:bg-transparent hover:text-info [&_svg]:hover:text-info"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todo como leído
          </Button>
        )}
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto">{notificationList}</div>
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
    </>
  );

  const trigger = (
    <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notificaciones">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col">
          <SheetTitle className="sr-only">Notificaciones</SheetTitle>
          {sheetContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {content}
      </PopoverContent>
    </Popover>
  );
}
