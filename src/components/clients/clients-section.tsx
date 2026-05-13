'use client';

import { Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import { getZonesAction } from '@/components/zones/actions';
import { ManageZonesModal } from '@/components/zones/manage-zones-modal';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import { queryKeys } from '@/lib/query-keys';
import type { Client, User } from '@/payload-types';

import { ClientModal } from './client-modal';
import { ClientsTable } from './clients-table';

interface ClientsSectionProps {
  clients: Client[];
  clientDebts: Record<number, number>;
  currentUser: User;
}

export function ClientsSection({ clients, clientDebts, currentUser }: ClientsSectionProps) {
  const isOwner = currentUser.role === 'owner';
  const { invalidateQueries } = useInvalidateQueries();

  const { data: zonesData } = useServerActionQuery({
    queryKey: queryKeys.zones.list(),
    queryFn: getZonesAction,
    enabled: isOwner,
    staleTime: 30_000,
  });

  const zones = zonesData?.zones ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isManageZonesOpen, setIsManageZonesOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [localidadFilter, setLocalidadFilter] = useState<string>('');
  const [provinciaFilter, setProvinciaFilter] = useState<string>('');
  const [itemsPerPage, setItemsPerPage] = usePersistedLimit('flowy:clients:limit', 10);

  const handleZonesChanged = () => {
    invalidateQueries([queryKeys.zones.list()]);
  };

  const handleSuccess = () => {
    invalidateQueries([queryKeys.clients.list()]);
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
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex h-9 items-center gap-2 rounded-full border bg-background px-4 shadow-sm">
              <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-sm font-semibold text-foreground">{clients.length} clientes</span>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar cliente
            </Button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, localidad, CUIT..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto">
            <ColumnVisibilityDropdown tableName="clients" />
          </div>
        </div>

        <ClientsTable
          clients={clients}
          clientDebts={clientDebts}
          searchQuery={searchQuery}
          zones={zones.map((z) => ({ id: z.id, name: z.name }))}
          zoneFilter={zoneFilter}
          onZoneFilterChange={(v) => setZoneFilter(v === zoneFilter ? '' : v)}
          localidades={[...new Set(clients.map((c) => c.localidad).filter(Boolean) as string[])].sort()}
          localidadFilter={localidadFilter}
          onLocalidadFilterChange={(v) => setLocalidadFilter(v === localidadFilter ? '' : v)}
          provincias={[...new Set(clients.map((c) => c.provincia).filter(Boolean) as string[])].sort()}
          provinciaFilter={provinciaFilter}
          onProvinciaFilterChange={(v) => setProvinciaFilter(v === provinciaFilter ? '' : v)}
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
