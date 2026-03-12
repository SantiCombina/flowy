import type { MovementType } from '@/app/services/stock-movements';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<MovementType, { label: string; className: string }> = {
  entry: {
    label: 'Ingreso',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  exit: {
    label: 'Egreso',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  },
  adjustment: {
    label: 'Ajuste',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  dispatch_to_mobile: {
    label: 'Asignación',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  },
  return_from_mobile: {
    label: 'Devolución',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  },
};

interface MovementTypeBadgeProps {
  type: MovementType;
}

export function MovementTypeBadge({ type }: MovementTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
