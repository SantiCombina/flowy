'use client';

import { Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import type { Client, User } from '@/payload-types';

import { ClientModal } from './client-modal';
import { ClientsTable } from './clients-table';

interface ClientsSectionProps {
  clients: Client[];
  currentUser: User;
}

export function ClientsSection({ clients, currentUser }: ClientsSectionProps) {
  const router = useRouter();
  const isOwner = currentUser.role === 'owner';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSuccess = () => {
    router.refresh();
  };

  const handleEdit = (client: Client) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setClientToEdit(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Clientes"
        description="Gestión de clientes del negocio"
        actions={
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Agregar cliente
          </Button>
        }
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, localidad, CUIT..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ColumnVisibilityDropdown tableName="clients" />
        </div>

        <ClientsTable
          clients={clients}
          searchQuery={searchQuery}
          showSellerColumn={isOwner}
          onEdit={handleEdit}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>

      <ClientModal isOpen={isModalOpen} onClose={handleClose} onSuccess={handleSuccess} client={clientToEdit} />
    </div>
  );
}
