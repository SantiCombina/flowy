'use client';

import { Package, Search } from 'lucide-react';
import { useState } from 'react';

import type { SellerInventorySummary } from '@/app/services/mobile-seller';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { SellerInventoryCard } from './seller-inventory-card';

interface AssignmentsSectionProps {
  sellers: SellerInventorySummary[];
}

export function AssignmentsSection({ sellers }: AssignmentsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const totalUnits = sellers.reduce((sum, s) => sum + s.totalQuantity, 0);

  const filteredSellers =
    searchQuery.trim() === ''
      ? sellers
      : sellers.filter(
          (s) =>
            s.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase())),
        );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Asignaciones" description="Stock en poder de tus vendedores" />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Ningún vendedor tiene stock asignado actualmente.</p>
            <p className="text-sm text-muted-foreground">
              Asigná stock desde la vista de Vendedores para que aparezca aquí.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{sellers.length} vendedores con stock</Badge>
              <Badge variant="outline">{totalUnits} unidades en circulación</Badge>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por vendedor o producto..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredSellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <p className="text-muted-foreground">Sin resultados para &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredSellers.map((seller) => (
                  <SellerInventoryCard key={seller.sellerId} seller={seller} searchQuery={searchQuery} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
