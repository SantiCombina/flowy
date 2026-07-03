'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getZonesAction } from '@/components/zones/actions';
import { ManageZonesModal } from '@/components/zones/manage-zones-modal';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { DEFAULT_ITEMS_PER_PAGE } from '@/lib/constants/table-columns';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import { queryKeys } from '@/lib/query-keys';
import type { Serialized } from '@/lib/serialization';
import type { Client, User } from '@/payload-types';
import type { ClientValues } from '@/schemas/clients/client-schema';

import { createClientAction, deleteClientAction, updateClientAction } from './actions';
import { ClientsTable } from './clients-table';

const generateTempId = () => -Date.now();

const ClientModal = dynamic(() => import('./client-modal').then((m) => m.ClientModal));

interface ClientsSectionProps {
  clients: Client[];
  clientDebts: Record<number, number>;
  currentUser: Serialized<User>;
}

export function ClientsSection({ clients, clientDebts, currentUser }: ClientsSectionProps) {
  const isOwner = currentUser.role === 'owner';
  const queryClient = useQueryClient();

  const [clientList, setClientList] = useState(clients);

  const { data: zonesData } = useServerActionQuery({
    queryKey: queryKeys.zones.list(),
    queryFn: getZonesAction,
    enabled: isOwner,
    staleTime: 5 * 60 * 1000,
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
    queryClient.invalidateQueries({ queryKey: ['zones'], refetchType: 'none' });
  };

  const handleCreateClient = async (data: ClientValues) => {
    const tempId = generateTempId();
    const zoneId = data.zone;
    const zoneObj = zones.find((z) => z.id === zoneId);

    const placeholder: Client = {
      id: tempId,
      name: data.name,
      cuit: data.cuit ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      provincia: data.provincia ?? null,
      localidad: data.localidad ?? null,
      zone: zoneId ? (zoneObj ?? zoneId) : null,
      createdBy: currentUser as unknown as User,
      owner: currentUser as unknown as User,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setClientList((prev) => [placeholder, ...prev]);
    handleClose();

    const result = await createClientAction(data);

    if (result?.serverError) {
      setClientList((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success && result.data.client) {
      setClientList((prev) => prev.map((c) => (c.id === tempId ? (result.data!.client as Client) : c)));
      toast.success('Cliente creado');
    }
  };

  const handleUpdateClient = async (id: number, data: ClientValues) => {
    const previous = clientList;
    const zoneId = data.zone;
    const zoneObj = zones.find((z) => z.id === zoneId);

    setClientList((prev) =>
      prev.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              name: data.name,
              cuit: data.cuit ?? null,
              phone: data.phone ?? null,
              email: data.email ?? null,
              address: data.address ?? null,
              provincia: data.provincia ?? null,
              localidad: data.localidad ?? null,
              zone: zoneId ? (zoneObj ?? zoneId) : null,
            },
      ),
    );
    handleClose();

    const result = await updateClientAction({ id, ...data });

    if (result?.serverError) {
      setClientList(previous);
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success && result.data.client) {
      setClientList((prev) => prev.map((c) => (c.id === id ? (result.data!.client as Client) : c)));
      toast.success('Cliente actualizado');
    }
  };

  const handleDelete = async (clientId: number) => {
    const previous = clientList;
    setClientList((prev) => prev.filter((c) => c.id !== clientId));

    const result = await deleteClientAction({ id: clientId });

    if (result?.serverError) {
      toast.error(result.serverError);
      setClientList(previous);
      return;
    }

    toast.warning('Cliente eliminado');
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
              placeholder="Buscar por nombre, localidad, CUIT..."
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

          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar cliente
          </Button>
        </div>

        <ClientsTable
          clients={clientList}
          clientDebts={clientDebts}
          searchQuery={searchQuery}
          zones={zones.map((z) => ({ id: z.id, name: z.name }))}
          zoneFilter={zoneFilter}
          onZoneFilterChange={(v) => setZoneFilter(v === zoneFilter ? '' : v)}
          localidades={[...new Set(clientList.map((c) => c.localidad).filter(Boolean) as string[])].sort()}
          localidadFilter={localidadFilter}
          onLocalidadFilterChange={(v) => setLocalidadFilter(v === localidadFilter ? '' : v)}
          provincias={[...new Set(clientList.map((c) => c.provincia).filter(Boolean) as string[])].sort()}
          provinciaFilter={provinciaFilter}
          onProvinciaFilterChange={(v) => setProvinciaFilter(v === provinciaFilter ? '' : v)}
          showSellerColumn={isOwner}
          onEdit={handleEdit}
          onDelete={handleDelete}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>

      <ClientModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onCreate={handleCreateClient}
        onEdit={handleUpdateClient}
        client={clientToEdit}
      />

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
