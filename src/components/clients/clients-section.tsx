'use client';

import { Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import { ZoneFilter } from '@/components/ui/zone-filter';
import { getZonesAction } from '@/components/zones/actions';
import { ManageZonesModal } from '@/components/zones/manage-zones-modal';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import type { Client, User, Zone } from '@/payload-types';

import { ClientModal } from './client-modal';
import { ClientsTable } from './clients-table';

interface ClientsSectionProps {
  clients: Client[];
  clientDebts: Record<number, number>;
  currentUser: User;
}

export function ClientsSection({ clients, clientDebts, currentUser }: ClientsSectionProps) {
  const router = useRouter();
  const isOwner = currentUser.role === 'owner';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isManageZonesOpen, setIsManageZonesOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [itemsPerPage, setItemsPerPage] = usePersistedLimit('flowy:clients:limit', 10);

  const { executeAsync: execGetZones } = useAction(getZonesAction);

  useEffect(() => {
    if (!isOwner) return;
    execGetZones().then((result) => {
      if (result?.data?.success) {
        setZones(result.data.zones as Zone[]);
      }
    });
  }, [isOwner]);

  const handleZonesChanged = () => {
    router.refresh();
    execGetZones().then((result) => {
      if (result?.data?.success) {
        setZones(result.data.zones as Zone[]);
      }
    });
  };

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
          <Button onClick={() => setIsModalOpen(true)}>
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
          {isOwner && (
            <ZoneFilter
              zones={zones.map((z) => ({ id: z.id, name: z.name }))}
              value={zoneFilter}
              onChange={(v) => setZoneFilter(v === zoneFilter ? '' : v)}
              onManageZones={() => setIsManageZonesOpen(true)}
            />
          )}
          <ColumnVisibilityDropdown tableName="clients" />
        </div>

        <ClientsTable
          clients={clients}
          clientDebts={clientDebts}
          searchQuery={searchQuery}
          zoneFilter={zoneFilter}
          showSellerColumn={isOwner}
          onEdit={handleEdit}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>

      <ClientModal isOpen={isModalOpen} onClose={handleClose} onSuccess={handleSuccess} client={clientToEdit} />

      {isOwner && (
        <ManageZonesModal
          isOpen={isManageZonesOpen}
          onClose={() => setIsManageZonesOpen(false)}
          onZonesChanged={handleZonesChanged}
        />
      )}
    </div>
  );
}
