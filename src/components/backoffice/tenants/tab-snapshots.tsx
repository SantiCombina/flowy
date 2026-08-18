'use client';

import { History } from 'lucide-react';

import type { TenantSnapshotRow } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

interface TabSnapshotsProps {
  snapshots: TenantSnapshotRow[];
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

const PLAN_BADGE_VARIANT: Record<string, 'info' | 'violet' | 'sky'> = {
  basic: 'info',
  medium: 'violet',
  professional: 'sky',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeDiff(snap: TenantSnapshotRow): string {
  const parts: string[] = [];
  if (snap.quotas) {
    if (snap.quotas.maxSellerSeats !== null) parts.push(`${snap.quotas.maxSellerSeats} vendedor(es)`);
    if (snap.quotas.maxProducts !== null) parts.push(`${snap.quotas.maxProducts} productos`);
    if (snap.quotas.maxVariantsPerProduct !== null) parts.push(`${snap.quotas.maxVariantsPerProduct} var/prod`);
  }
  if (snap.capabilities.length > 0) {
    parts.push(`${snap.capabilities.length} capacidades`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Snapshot inicial';
}

export function TabSnapshots({ snapshots }: TabSnapshotsProps) {
  if (snapshots.length === 0) {
    return <EmptyState icon={History} title="Este tenant no tiene snapshots de entitlement" />;
  }

  return (
    <div className="relative ml-3 border-l-2 border-border pl-6">
      {snapshots.map((snap) => (
        <div key={snap.id} className="relative pb-6 last:pb-0">
          <div className="absolute -left-8.5 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <History className="h-3 w-3" />
          </div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    Snapshot #{snap.sequence}
                    {snap.planCode && (
                      <span className="ml-2 align-middle">
                        <Badge variant={PLAN_BADGE_VARIANT[snap.planCode] ?? 'info'}>
                          {PLAN_LABELS[snap.planCode] ?? snap.planCode}
                          {snap.planVersion !== null ? ` · v${snap.planVersion}` : ''}
                        </Badge>
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{formatDateTime(snap.createdAt)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{summarizeDiff(snap)}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
