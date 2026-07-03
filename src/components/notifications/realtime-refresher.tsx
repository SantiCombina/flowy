'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { getPusherClient } from '@/lib/pusher-client';

interface RealtimeRefresherProps {
  channel: string;
  events: string[];
  userId?: number;
}

const EVENT_TO_KEYS: Record<string, string[][]> = {
  sale_created: [['sales'], ['products', 'demand']],
  sale_deleted: [['sales'], ['products', 'demand']],
  sale_edited: [['sales'], ['products', 'demand']],
  payment_registered: [['sales'], ['products', 'demand']],
  stock_dispatched: [['products'], ['sales']],
  stock_returned: [['products']],
  stock_low: [['products']],
  stock_adjusted: [['products']],
  budget_created: [['budgets']],
  budget_updated: [['budgets']],
  budget_deleted: [['budgets']],
  budget_converted: [['budgets']],
  product_created: [['products']],
  product_updated: [['products']],
  product_deleted: [['products']],
  variant_created: [['products']],
  variant_updated: [['products']],
  variant_deleted: [['products']],
  seller_invited: [['sellers']],
  seller_updated: [['sellers']],
  seller_deleted: [['sellers']],
  commission_paid: [['sellers']],
  client_created: [['clients']],
  client_updated: [['clients']],
  client_deleted: [['clients']],
  business_updated: [['user', 'current']],
  user_updated: [['user', 'current']],
};

export function RealtimeRefresher({ channel, events, userId }: RealtimeRefresherProps) {
  const queryClient = useQueryClient();
  const eventsKey = useMemo(() => events.join(','), [events]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const eventList = eventsKey.split(',');

    const handlers = new Map<string, (data?: { metadata?: Record<string, unknown> }) => void>();

    for (const event of eventList) {
      const handler = (data?: { metadata?: Record<string, unknown> }) => {
        const eventUserId =
          typeof data?.metadata?.userId === 'number'
            ? data.metadata.userId
            : typeof data?.metadata?.sellerId === 'number'
              ? data.metadata.sellerId
              : undefined;
        if (userId && eventUserId === userId) return;

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
  }, [channel, eventsKey, queryClient, userId]);

  return null;
}
