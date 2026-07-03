'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import {
  getNotificationsAction,
  getUnreadCountAction,
  markAllReadAction,
  markReadAction,
  subscribePushAction,
} from '@/components/notifications/actions';
import { useUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
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
  const queryClient = useQueryClient();
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

  const { data: listData, isLoading: isLoadingList } = useServerActionQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotificationsAction,
    enabled: open,
    staleTime: 5_000,
  });

  const { data: countData } = useServerActionQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCountAction,
    enabled: true,
    staleTime: 5_000,
  });

  const notifications = listData?.notifications ?? [];
  const unreadCount = countData?.unreadCount ?? 0;

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const markReadMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const result = await markReadAction({ id });
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.list() });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount() });

      const previousList = queryClient.getQueryData<{ notifications: Array<{ id: number; read: boolean }> }>(
        queryKeys.notifications.list(),
      );
      const previousCount = queryClient.getQueryData<{ unreadCount: number }>(queryKeys.notifications.unreadCount());

      queryClient.setQueryData(
        queryKeys.notifications.list(),
        (old: { notifications: Array<{ id: number; read: boolean }> } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          };
        },
      );

      queryClient.setQueryData(queryKeys.notifications.unreadCount(), (old: { unreadCount: number } | undefined) => {
        if (!old) return old;
        return { unreadCount: Math.max(0, old.unreadCount - 1) };
      });

      return { previousList, previousCount };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.list(), context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
      }
      toast.error('No se pudo marcar como leído');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const result = await markAllReadAction();
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.list() });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount() });

      const previousList = queryClient.getQueryData<{ notifications: Array<{ id: number; read: boolean }> }>(
        queryKeys.notifications.list(),
      );
      const previousCount = queryClient.getQueryData<{ unreadCount: number }>(queryKeys.notifications.unreadCount());

      queryClient.setQueryData(
        queryKeys.notifications.list(),
        (old: { notifications: Array<{ id: number; read: boolean }> } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, read: true })),
          };
        },
      );

      queryClient.setQueryData(queryKeys.notifications.unreadCount(), { unreadCount: 0 });

      return { previousList, previousCount };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.list(), context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(queryKeys.notifications.unreadCount(), context.previousCount);
      }
      toast.error('No se pudieron marcar las notificaciones');
    },
  });

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const channel = role === 'seller' ? `private-seller-${userId}` : `private-owner-${userId}`;
    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const handleEvent = () =>
      invalidateQueries([queryKeys.notifications.list(), queryKeys.notifications.unreadCount()]);
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
    await markReadMutation.mutateAsync({ id });
  };

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
  };

  const notificationList = (
    <>
      {isLoadingList ? (
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex w-full items-start gap-3 px-4 py-3">
              <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin notificaciones</p>
        </div>
      ) : (
        <div className="divide-y">
          {unreadNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
          ))}
          {readNotifications.length > 0 && unreadNotifications.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Anteriores</p>
            </div>
          )}
          {readNotifications.map((notification) => (
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
            disabled={markAllReadMutation.isPending}
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

  const sheetBody = (
    <>
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
        <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col gap-0">
          <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 pr-10 border-b space-y-0">
            <SheetTitle className="text-base">Notificaciones</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:bg-transparent hover:text-info [&_svg]:hover:text-info"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todo
              </Button>
            )}
          </SheetHeader>
          {sheetBody}
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
