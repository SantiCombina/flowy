'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { getPusherClient } from '@/lib/pusher-client';

interface RealtimeRefresherProps {
  channel: string;
  events: string[];
}

const EVENT_TO_KEYS: Record<string, string[][]> = {
  sale_created: [['sales']],
  payment_registered: [['sales']],
  stock_dispatched: [['products', 'variants'], ['sales']],
  stock_returned: [['products', 'variants']],
  stock_low: [['products', 'variants']],
  stock_adjusted: [['products', 'variants']],
};

export function RealtimeRefresher({ channel, events }: RealtimeRefresherProps) {
  const queryClient = useQueryClient();
  const eventsKey = useMemo(() => events.join(','), [events]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const eventList = eventsKey.split(',');

    const handlers = new Map<string, () => void>();

    for (const event of eventList) {
      const handler = () => {
        const keys = EVENT_TO_KEYS[event];
        if (keys) {
          for (const key of keys) {
            void queryClient.invalidateQueries({ queryKey: key });
          }
        }
      };
      handlers.set(event, handler);
      subscription.bind(event, handler);
    }

    return () => {
      for (const [event, handler] of handlers) {
        subscription.unbind(event, handler);
      }
    };
  }, [channel, eventsKey, queryClient]);

  return null;
}
