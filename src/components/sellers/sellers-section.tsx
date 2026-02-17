'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { useUserOptional } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
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

      <main className="flex-1 space-y-4 px-6 pb-6">
        <SellersTable sellers={sellers} onEdit={handleOpenEditModal} />
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
