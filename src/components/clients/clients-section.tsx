'use client';

import { Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getZonesAction } from '@/components/zones/actions';
import { ManageZonesModal } from '@/components/zones/manage-zones-modal';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { DEFAULT_ITEMS_PER_PAGE } from '@/lib/constants/table-columns';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import { queryKeys } from '@/lib/query-keys';
import type { Serialized } from '@/lib/serialization';
import type { Client, User } from '@/payload-types';

import { ClientModal } from './client-modal';
import { ClientsTable } from './clients-table';

interface ClientsSectionProps {
  clients: Client[];
  clientDebts: Record<number, number>;
  currentUser: Serialized<User>;
  capabilities?: string[];
}

export function ClientsSection({ clients, clientDebts, currentUser, capabilities }: ClientsSectionProps) {
  const isOwner = currentUser.role === 'owner';
  const canManageClients = capabilities?.includes('client.manage') ?? isOwner;
  const canDeleteClients = capabilities?.includes('client.delete') ?? isOwner;
  const canManageZones = capabilities?.includes('zones.manage') ?? isOwner;
  const canUseContactFields = capabilities?.includes('client.contact-fields') ?? isOwner;
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
  const [itemsPerPage, setItemsPerPage] = usePersistedLimit('flowy:clients:limit', DEFAULT_ITEMS_PER_PAGE);

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
      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={canUseContactFields ? 'Buscar por nombre, localidad, CUIT...' : 'Buscar por nombre'}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="hidden sm:flex h-9 items-center gap-2 rounded-full bg-white px-4 shadow-sm"
            title="Clientes registrados"
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-sm font-semibold text-foreground">{clients.length} clientes</span>
          </div>

          {canManageClients && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar cliente
            </Button>
          )}
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
          showContactColumns={canUseContactFields}
          onEdit={canManageClients ? handleEdit : undefined}
          canDelete={canDeleteClients}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>

      <ClientModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        client={clientToEdit}
        canUseContactFields={canUseContactFields}
        canManageZones={canManageZones}
      />

      {canManageZones && (
        <ManageZonesModal
          isOpen={isManageZonesOpen}
          onClose={() => setIsManageZonesOpen(false)}
          onZonesChanged={handleZonesChanged}
        />
      )}
    </div>
  );
}
