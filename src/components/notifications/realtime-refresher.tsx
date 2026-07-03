'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { getPusherClient } from '@/lib/pusher-client';

interface RealtimeRefresherProps {
  channel: string;
  events: string[];
}

const EVENT_TO_KEYS: Record<string, string[][]> = {
  sale_created: [['sales'], ['products', 'demand']],
  payment_registered: [['sales'], ['products', 'demand']],
  stock_dispatched: [['products'], ['sales']],
  stock_returned: [['products']],
  stock_low: [['products']],
  stock_adjusted: [['products']],
  budget_created: [['budgets']],
};

export function RealtimeRefresher({ channel, events }: RealtimeRefresherProps) {
  const queryClient = useQueryClient();
  const eventsKey = useMemo(() => events.join(','), [events]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const eventList = eventsKey.split(',');

    const handlers = new Map<string, () => void>();

    for (const event of eventList) {
      const handler = () => {
        const keys = EVENT_TO_KEYS[event];
        if (!keys) return;

        for (const key of keys) {
          pendingKeysRef.current.add(JSON.stringify(key));
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          for (const serialized of pendingKeysRef.current) {
            void queryClient.invalidateQueries({ queryKey: JSON.parse(serialized) as string[] });
          }
          pendingKeysRef.current.clear();
        }, 2000);
      };
      handlers.set(event, handler);
      subscription.bind(event, handler);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingKeysRef.current.clear();

      for (const [event, handler] of handlers) {
        subscription.unbind(event, handler);
      }
    };
  }, [channel, eventsKey, queryClient]);

  return null;
}
