import webpush from 'web-push';

import { pusherServer } from '@/lib/pusher-server';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export type NotificationType =
  | 'sale_created'
  | 'sale_deleted'
  | 'sale_edited'
  | 'payment_registered'
  | 'stock_dispatched'
  | 'stock_returned'
  | 'stock_low'
  | 'stock_adjusted'
  | 'budget_created'
  | 'budget_updated'
  | 'budget_deleted'
  | 'budget_converted'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'variant_created'
  | 'variant_updated'
  | 'variant_deleted'
  | 'seller_invited'
  | 'seller_updated'
  | 'seller_deleted'
  | 'commission_paid'
  | 'client_created'
  | 'client_updated'
  | 'client_deleted';

interface NotifyPayload {
  recipientId: number;
  ownerId: number;
  sellerId?: number;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

const vapidConfigured = !!process.env.VAPID_EMAIL && !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

if (vapidConfigured) {
  webpush.setVapidDetails(process.env.VAPID_EMAIL!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

const pusherConfigured =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.PUSHER_KEY &&
  !!process.env.PUSHER_SECRET &&
  !!process.env.PUSHER_CLUSTER;

export async function notifyEvent(payload: NotifyPayload): Promise<void> {
  const { recipientId, ownerId, sellerId, type, title, body, metadata } = payload;

  try {
    await persistNotification({ recipientId, ownerId, type, title, body, metadata });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[notify] persistNotification failed:', err);
    }
  }

  const results = await Promise.allSettled([
    triggerPusher({ recipientId, ownerId, sellerId, type, title, body, metadata }),
    sendPush({ recipientId, title, body }),
  ]);

  results.forEach((result, i) => {
    if (result.status === 'rejected' && process.env.NODE_ENV !== 'production') {
      const names = ['triggerPusher', 'sendPush'];
      console.error(`[notify] ${names[i]} failed:`, result.reason);
    }
  });
}

async function persistNotification({
  recipientId,
  ownerId,
  type,
  title,
  body,
  metadata,
}: NotifyPayload): Promise<void> {
  const client = await getPayloadClient();
  await client.create({
    collection: 'notifications',
    data: {
      recipient: recipientId,
      owner: ownerId,
      type,
      title,
      body,
      ...(metadata ? { metadata } : {}),
      read: false,
    },
    overrideAccess: true,
  });
}

async function triggerPusher({
  recipientId,
  ownerId,
  sellerId,
  type,
  title,
  body,
  metadata,
}: NotifyPayload): Promise<void> {
  if (!pusherConfigured) return;
  const isOwner = recipientId === ownerId;
  const primaryChannel = isOwner ? `private-owner-${ownerId}` : `private-seller-${recipientId}`;
  const channels: string[] = [primaryChannel];
  if (isOwner && sellerId && sellerId !== ownerId) {
    channels.push(`private-seller-${sellerId}`);
  }
  await pusherServer.trigger(channels, type, { title, body, metadata });
}

async function sendPush({
  recipientId,
  title,
  body,
}: {
  recipientId: number;
  title: string;
  body: string;
}): Promise<void> {
  if (!vapidConfigured) return;
  const client = await getPayloadClient();
  const result = await client.find({
    collection: 'push-subscriptions',
    where: { user: { equals: recipientId } },
    limit: 100,
    overrideAccess: true,
  });

  const notificationPayload = JSON.stringify({ title, body });

  await Promise.allSettled(
    result.docs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload,
          { TTL: 60, urgency: 'high' },
        );
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'statusCode' in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          await client.delete({
            collection: 'push-subscriptions',
            id: sub.id,
            overrideAccess: true,
          });
        }
      }
    }),
  );
}
