'use client';

import PusherJs from 'pusher-js';

import { authorizePusherChannelAction } from '@/components/notifications/actions';

let pusherClient: PusherJs | null = null;

export function getPusherClient(): PusherJs {
  if (!pusherClient) {
    pusherClient = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: {
        transport: 'ajax',
        endpoint: '',
        customHandler: ({ socketId, channelName }, callback) => {
          authorizePusherChannelAction({ socketId, channelName })
            .then((result) => {
              if (result?.data) {
                callback(null, result.data as { auth: string });
              } else {
                callback(new Error('Pusher channel authorization failed'), null);
              }
            })
            .catch((err: unknown) => {
              callback(err instanceof Error ? err : new Error('Auth error'), null);
            });
        },
      },
    });
  }
  return pusherClient;
}
