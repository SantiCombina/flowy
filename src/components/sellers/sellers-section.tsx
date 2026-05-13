'use client';

import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

import type { CommissionSummary } from '@/app/services/commissions';
import type { PopulatedProductVariant } from '@/app/services/products';
import { PageHeader } from '@/components/layout/page-header';
import { useUserOptional } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/payload-types';

import { getSellersAction } from './actions';
import { DispatchStockModal } from './dispatch-stock-modal';
import { EditSellerModal } from './edit-seller-modal';
import { InviteSellerModal } from './invite-seller-modal';
import { ReturnStockModal } from './return-stock-modal';
import { SellerDetailsModal } from './seller-details-modal';
import { SellersTable } from './sellers-table';

interface SellersSectionProps {
  initialSellers: { success: true; sellers: User[] };
  variants: PopulatedProductVariant[];
  commissionBalances: Record<number, CommissionSummary>;
}

export function SellersSection({ initialSellers, variants, commissionBalances }: SellersSectionProps) {
  const user = useUserOptional();
  const canInviteSeller = user?.role === 'owner' || user?.role === 'admin';
  const { invalidateQueries } = useInvalidateQueries();

  const { data } = useServerActionQuery({
    queryKey: queryKeys.sellers.list(),
    queryFn: getSellersAction,
    initialData: initialSellers,
    staleTime: 30_000,
  });

  const sellers = data?.sellers ?? initialSellers.sellers;

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [sellerForDetails, setSellerForDetails] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [sellerToEdit, setSellerToEdit] = useState<User | null>(null);
  const [sellerForDispatch, setSellerForDispatch] = useState<User | null>(null);
  const [sellerForReturn, setSellerForReturn] = useState<User | null>(null);

  const handleSuccess = () => {
    invalidateQueries([queryKeys.sellers.list()]);
  };

  const handleOpenDetails = (seller: User) => {
    setSellerForDetails(seller);
    setIsDetailsModalOpen(true);
  };

  const handleOpenDispatch = (seller: User) => {
    setSellerForDispatch(seller);
    setIsDispatchModalOpen(true);
  };

  const handleOpenReturn = (seller: User) => {
    setSellerForReturn(seller);
    setIsReturnModalOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Vendedores"
        description="Gestión del equipo de ventas"
        actions={
          canInviteSeller ? (
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar vendedor
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto">
            <ColumnVisibilityDropdown tableName="sellers" />
          </div>
        </div>
        <SellersTable
          sellers={sellers}
          commissionBalances={commissionBalances}
          searchQuery={searchQuery}
          onViewDetails={handleOpenDetails}
          onEdit={(seller) => {
            setSellerToEdit(seller);
            setIsEditModalOpen(true);
          }}
          onDispatch={handleOpenDispatch}
          onReturn={handleOpenReturn}
        />
      </main>

      <InviteSellerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <SellerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSellerForDetails(null);
        }}
        seller={sellerForDetails}
      />
      <EditSellerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSellerToEdit(null);
        }}
        onSuccess={handleSuccess}
        seller={sellerToEdit}
      />
      <DispatchStockModal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false);
          setSellerForDispatch(null);
        }}
        onSuccess={handleSuccess}
        seller={sellerForDispatch}
        variants={variants}
      />
      <ReturnStockModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSellerForReturn(null);
        }}
        onSuccess={handleSuccess}
        seller={sellerForReturn}
      />
    </div>
  );
}
