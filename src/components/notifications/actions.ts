'use server';

import { z } from 'zod';

import {
  deletePushSubscription,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from '@/app/services/notifications';
import { getCurrentUser } from '@/lib/payload';
import { pusherServer } from '@/lib/pusher-server';
import { actionClient } from '@/lib/safe-action';

export const getNotificationsAction = actionClient.action(async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autorizado');

  const notifications = await getNotifications(user.id);
  const unreadCount = await getUnreadCount(user.id);

  return { success: true, notifications, unreadCount };
});

export const markReadAction = actionClient
  .schema(z.object({ id: z.number({ required_error: 'ID requerido' }) }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('No autorizado');

    await markNotificationRead(parsedInput.id, user.id);
    return { success: true };
  });

export const markAllReadAction = actionClient.action(async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autorizado');

  await markAllNotificationsRead(user.id);
  return { success: true };
});

export const authorizePusherChannelAction = actionClient
  .schema(z.object({ socketId: z.string(), channelName: z.string() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('No autorizado');

    const { socketId, channelName } = parsedInput;
    const ownerMatch = channelName.match(/^private-owner-(\d+)$/);
    const sellerMatch = channelName.match(/^private-seller-(\d+)$/);
    const canSubscribe =
      (ownerMatch && (user.role === 'owner' || user.role === 'admin') && user.id === Number(ownerMatch[1])) ||
      (sellerMatch && user.role === 'seller' && user.id === Number(sellerMatch[1])) ||
      user.role === 'admin';

    if (!canSubscribe) throw new Error('No autorizado para este canal');

    return pusherServer.authorizeChannel(socketId, channelName);
  });

export const subscribePushAction = actionClient
  .schema(
    z.object({
      endpoint: z.string(),
      keys: z.object({ p256dh: z.string(), auth: z.string() }),
    }),
  )
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('No autorizado');

    await savePushSubscription(user.id, parsedInput);
    return { success: true };
  });

export const unsubscribePushAction = actionClient
  .schema(z.object({ endpoint: z.string() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('No autorizado');

    await deletePushSubscription(user.id, parsedInput.endpoint);
    return { success: true };
  });
