'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { getPusherClient } from '@/lib/pusher-client';

interface RealtimeRefresherProps {
  channel: string;
  events: string[];
}

export function RealtimeRefresher({ channel, events }: RealtimeRefresherProps) {
  const router = useRouter();
  const eventsKey = useMemo(() => events.join(','), [events]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = getPusherClient();
    const subscription = pusher.subscribe(channel);
    const eventList = eventsKey.split(',');

    const handleEvent = () => {
      router.refresh();
    };

    for (const event of eventList) {
      subscription.bind(event, handleEvent);
    }

    return () => {
      for (const event of eventList) {
        subscription.unbind(event, handleEvent);
      }
    };
  }, [channel, eventsKey, router]);

  return null;
}
