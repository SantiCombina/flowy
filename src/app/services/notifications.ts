'use server';

import { getPayloadClient } from '@/lib/payload';

export interface NotificationRow {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export async function getNotifications(userId: number): Promise<NotificationRow[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'notifications',
    where: { recipient: { equals: userId } },
    sort: '-createdAt',
    limit: 50,
    overrideAccess: true,
  });

  return result.docs.map((doc) => ({
    id: doc.id,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    read: doc.read ?? false,
    createdAt: doc.createdAt,
    metadata: (doc.metadata as Record<string, unknown>) ?? null,
  }));
}

export async function getUnreadCount(userId: number): Promise<number> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'notifications',
    where: { and: [{ recipient: { equals: userId } }, { read: { equals: false } }] },
    limit: 0,
    overrideAccess: true,
  });

  return result.totalDocs;
}

export async function markNotificationRead(notificationId: number, userId: number): Promise<void> {
  const payload = await getPayloadClient();

  const notification = await payload.findByID({
    collection: 'notifications',
    id: notificationId,
    overrideAccess: true,
  });

  const recipientId =
    typeof notification?.recipient === 'number'
      ? notification.recipient
      : (notification?.recipient as { id: number } | null)?.id;

  if (!notification || recipientId !== userId) return;

  await payload.update({
    collection: 'notifications',
    id: notificationId,
    data: { read: true, readAt: new Date().toISOString() },
    overrideAccess: true,
  });
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const payload = await getPayloadClient();

  const unread = await payload.find({
    collection: 'notifications',
    where: { and: [{ recipient: { equals: userId } }, { read: { equals: false } }] },
    limit: 100,
    overrideAccess: true,
  });

  await Promise.all(
    unread.docs.map((doc) =>
      payload.update({
        collection: 'notifications',
        id: doc.id,
        data: { read: true, readAt: new Date().toISOString() },
        overrideAccess: true,
      }),
    ),
  );
}

export async function savePushSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  const payload = await getPayloadClient();

  const existing = await payload.find({
    collection: 'push-subscriptions',
    where: { endpoint: { equals: subscription.endpoint } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) return;

  await payload.create({
    collection: 'push-subscriptions',
    data: {
      user: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    overrideAccess: true,
  });
}

export async function deletePushSubscription(userId: number, endpoint: string): Promise<void> {
  const payload = await getPayloadClient();

  const existing = await payload.find({
    collection: 'push-subscriptions',
    where: { and: [{ user: { equals: userId } }, { endpoint: { equals: endpoint } }] },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    await payload.delete({
      collection: 'push-subscriptions',
      id: existing.docs[0].id,
      overrideAccess: true,
    });
  }
}
