'use client';

import type { NotificationRow } from '@/app/services/notifications';

interface NotificationItemProps {
  notification: NotificationRow;
  onMarkRead: (id: number) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-primary'}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${notification.read ? 'text-muted-foreground' : 'font-medium'}`}>
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/80 leading-snug">{notification.body}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}
