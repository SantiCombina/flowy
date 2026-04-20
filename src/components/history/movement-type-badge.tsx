import type { VariantProps } from 'class-variance-authority';

import type { MovementType } from '@/app/services/stock-movements';
import { Badge, type badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const TYPE_CONFIG: Record<MovementType, { label: string; variant: BadgeVariant }> = {
  entry: { label: 'Ingreso', variant: 'success' },
  exit: { label: 'Egreso', variant: 'error' },
  adjustment: { label: 'Ajuste', variant: 'warning' },
  sale: { label: 'Venta', variant: 'pending' },
  dispatch_to_mobile: { label: 'Asignación', variant: 'info' },
  return_from_mobile: { label: 'Devolución', variant: 'violet' },
  sale_cancelled: { label: 'Venta cancelada', variant: 'error' },
  sale_edit: { label: 'Edición venta', variant: 'sky' },
};

interface MovementTypeBadgeProps {
  type: MovementType;
}

export function MovementTypeBadge({ type }: MovementTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
