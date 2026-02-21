'use client';

import { Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { useUserOptional } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import type { User } from '@/payload-types';

import { EditSellerModal } from './edit-seller-modal';
import { InviteSellerModal } from './invite-seller-modal';
import { SellersTable } from './sellers-table';

interface SellersSectionProps {
  sellers: User[];
}

export function SellersSection({ sellers }: SellersSectionProps) {
  const router = useRouter();
  const user = useUserOptional();
  const canInviteSeller = user?.role === 'owner' || user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sellerToEdit, setSellerToEdit] = useState<User | null>(null);

  const handleOpenInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  const handleOpenEditModal = (seller: User) => {
    setSellerToEdit(seller);
    setIsEditModalOpen(true);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSellerToEdit(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Vendedores"
        description="Gestión del equipo de ventas"
        actions={
          canInviteSeller ? (
            <Button
              onClick={handleOpenInviteModal}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 gap-1"
            >
              <Plus className="mr-1 h-4 w-4" />
              Agregar vendedor
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ColumnVisibilityDropdown tableName="sellers" />
        </div>
        <SellersTable sellers={sellers} searchQuery={searchQuery} onEdit={handleOpenEditModal} />
      </main>

      <InviteSellerModal isOpen={isInviteModalOpen} onClose={handleCloseInviteModal} onSuccess={handleSuccess} />
      <EditSellerModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleSuccess}
        seller={sellerToEdit}
      />
    </div>
  );
}
