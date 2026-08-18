'use client';

import { Package } from 'lucide-react';

import type { TenantProductRow } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

interface TabProductsProps {
  products: TenantProductRow[];
}

export function TabProducts({ products }: TabProductsProps) {
  if (products.length === 0) {
    return <EmptyState icon={Package} title="Este tenant no tiene productos" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{product.name}</CardTitle>
              </div>
              <Badge variant={product.isActive ? 'success' : 'outline'}>
                {product.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            {product.description && <CardDescription className="line-clamp-2">{product.description}</CardDescription>}
          </CardHeader>
          <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {product.variantsCount} {product.variantsCount === 1 ? 'variante' : 'variantes'}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
