'use client';

import { Package } from 'lucide-react';
import { useState } from 'react';

import type { SellerInventorySummary } from '@/app/services/mobile-seller';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { normalizeText } from '@/lib/text';

import { SellerInventoryCard } from './seller-inventory-card';

interface AssignmentsSectionProps {
  sellers: SellerInventorySummary[];
}

export function AssignmentsSection({ sellers }: AssignmentsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const totalUnits = sellers.reduce((sum, s) => sum + s.totalQuantity, 0);

  const q = normalizeText(searchQuery);
  const filteredSellers =
    searchQuery.trim() === ''
      ? sellers
      : sellers.filter(
          (s) =>
            normalizeText(s.sellerName).includes(q) ||
            s.items.some((item) => normalizeText(item.productName).includes(q)),
        );

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Package className="h-12 w-12 text-muted-foreground/70" />
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

            <SearchInput
              className="max-w-sm"
              placeholder="Buscar por vendedor o producto..."
              value={searchQuery}
              onChange={setSearchQuery}
            />

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
