'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { useUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { ARGENTINA_PROVINCES } from '@/lib/constants/argentina-geo';
import { formatPhoneInput } from '@/lib/phone';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { Client, Zone } from '@/payload-types';
import { clientSchema, type ClientValues } from '@/schemas/clients/client-schema';

import { createZoneAction, getZonesAction } from '../zones/actions';

import { createClientAction, updateClientAction } from './actions';

function formatCuit(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
  client?: Client | null;
}

export function ClientModal({ isOpen, onClose, onSuccess, client }: ClientModalProps) {
  const isEditMode = !!client;
  const { executeAsync: execCreate, isExecuting: isCreating } = useAction(createClientAction);
  const { executeAsync: execUpdate, isExecuting: isUpdating } = useAction(updateClientAction);
  const isExecuting = isCreating || isUpdating;
  const { invalidateQueries } = useInvalidateQueries();

  const currentUser = useUser();
  const isOwner = currentUser.role === 'owner';

  const [localities, setLocalities] = useState<{ id: string; nombre: string }[]>([]);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const localitiesCache = useRef<Record<string, { id: string; nombre: string }[]>>({});

  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');

  const { data: zonesData } = useServerActionQuery({
    queryKey: queryKeys.zones.list(),
    queryFn: getZonesAction,
    enabled: isOpen,
    staleTime: 30_000,
  });

  const zones = (zonesData?.zones ?? []) as Zone[];

  const isDuplicateZone = zones.some((z) => z.name.toLowerCase() === newZoneName.trim().toLowerCase());

  const { executeAsync: execCreateZone } = useAction(createZoneAction);

  const defaultValues = useMemo(
    () => ({
      name: isEditMode && client ? client.name : '',
      cuit: isEditMode && client ? (client.cuit ?? '') : '',
      phone: isEditMode && client ? (client.phone ?? '') : '',
      email: isEditMode && client ? (client.email ?? '') : '',
      address: isEditMode && client ? (client.address ?? '') : '',
      provincia: isEditMode && client ? (client.provincia ?? '') : '',
      localidad: isEditMode && client ? (client.localidad ?? '') : '',
      zone:
        isEditMode && client
          ? client.zone && typeof client.zone === 'object'
            ? client.zone.id
            : (client.zone ?? undefined)
          : undefined,
    }),
    [isEditMode, client],
  );

  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    values: defaultValues,
  });

  const provinciaValue = useWatch({ control: form.control, name: 'provincia' });

  const loadLocalities = useCallback(async (provinceName: string) => {
    if (localitiesCache.current[provinceName]) {
      setLocalities(localitiesCache.current[provinceName]);
      return;
    }

    const province = ARGENTINA_PROVINCES.find((p) => p.nombre === provinceName);
    if (!province) return;

    setLoadingLocalities(true);
    try {
      const res = await fetch(
        `https://apis.datos.gob.ar/georef/api/localidades?provincia=${province.id}&campos=id,nombre&max=1000&orden=nombre`,
      );
      if (!res.ok) throw new Error('Error al cargar localidades');
      const json = (await res.json()) as { localidades: { id: string; nombre: string }[] };
      const seen = new Set<string>();
      const items = json.localidades
        .map((l) => ({ id: l.id, nombre: l.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .filter((l) => {
          if (seen.has(l.nombre)) return false;
          seen.add(l.nombre);
          return true;
        });
      localitiesCache.current[provinceName] = items;
      setLocalities(items);
    } catch {
      toast.error('No se pudieron cargar las localidades. Verificá tu conexión.');
      setLocalities([]);
    } finally {
      setLoadingLocalities(false);
    }
  }, []);

  const handleProvinciaChange = (value: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(value);
    form.setValue('localidad', '');
    setLocalities([]);
    if (value) {
      void loadLocalities(value);
    }
  };

  const handleCreateZone = async () => {
    const name = newZoneName.trim();
    if (!name) return;

    const result = await execCreateZone({ name });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success && result.data.zone) {
      const newZone = result.data.zone as Zone;
      invalidateQueries([queryKeys.zones.list()]);
      form.setValue('zone', newZone.id, { shouldDirty: true });
      setNewZoneName('');
      setIsCreatingZone(false);
      toast.success(`Zona "${newZone.name}" creada`);
    }
  };

  const onSubmit = async (data: ClientValues) => {
    let result;

    if (isEditMode && client) {
      result = await execUpdate({ id: client.id, ...data });
    } else {
      result = await execCreate(data);
    }

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success && result.data.client) {
      invalidateQueries([queryKeys.clients.list()]);
      onSuccess(result.data.client as Client);
      onClose();
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-lg">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>{isEditMode ? 'Editar cliente' : 'Agregar cliente'}</ResponsiveModalTitle>
        <ResponsiveModalDescription>
          {isEditMode ? 'Modificá los datos del cliente.' : 'Completá los datos para registrar un nuevo cliente.'}
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ResponsiveModalBody className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre / Razón social <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Empresa S.A." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT/CUIL</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="20-12345678-9"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(formatCuit(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="tel"
                        placeholder="+54 9 11 1234-5678"
                        {...field}
                        onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="contacto@empresa.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Av. Corrientes 1234" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="provincia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <FormControl>
                      <Combobox
                        options={ARGENTINA_PROVINCES.map((p) => ({ value: p.nombre, label: p.nombre }))}
                        value={field.value ?? ''}
                        onValueChange={(v) => handleProvinciaChange(v, field.onChange)}
                        placeholder="Seleccionar..."
                        searchPlaceholder="Buscar provincia..."
                        emptyMessage="No se encontró la provincia."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localidad</FormLabel>
                    {loadingLocalities ? (
                      <Skeleton className="h-9 w-full rounded-md" />
                    ) : (
                      <FormControl>
                        <Combobox
                          options={localities.map((l) => ({ value: l.nombre, label: l.nombre }))}
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          placeholder={provinciaValue ? 'Seleccionar...' : 'Elegí una provincia'}
                          searchPlaceholder="Buscar localidad..."
                          emptyMessage="No se encontró la localidad."
                          disabled={localities.length === 0}
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="zone"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Zona</FormLabel>
                    {isOwner && !isCreatingZone && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingZone(true);
                          field.onChange(undefined);
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        + Nueva zona
                      </button>
                    )}
                  </div>
                  {isCreatingZone ? (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="relative">
                        <Input
                          placeholder="Nombre de la zona"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!isDuplicateZone) void handleCreateZone();
                            }
                            if (e.key === 'Escape') {
                              setIsCreatingZone(false);
                              setNewZoneName('');
                            }
                          }}
                          autoFocus
                          className={cn('pr-20', isDuplicateZone && 'border-destructive')}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => void handleCreateZone()}
                            disabled={!newZoneName.trim() || isDuplicateZone}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-emerald-600 transition-colors"
                            title="Crear zona"
                          >
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingZone(false);
                              setNewZoneName('');
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      {isDuplicateZone && (
                        <p className="text-xs text-destructive mt-1">Ya existe una zona con ese nombre</p>
                      )}
                    </div>
                  ) : (
                    <FormControl>
                      <Combobox
                        options={zones.map((z) => ({ value: String(z.id), label: z.name }))}
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(v ? (v === '' ? null : Number(v)) : null)}
                        placeholder="Sin zona"
                        searchPlaceholder="Buscar zona..."
                        emptyMessage="No se encontró la zona."
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </ResponsiveModalBody>

          <ResponsiveModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isExecuting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting
                ? isEditMode
                  ? 'Guardando…'
                  : 'Creando…'
                : isEditMode
                  ? 'Guardar cambios'
                  : 'Crear cliente'}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </Form>
    </ResponsiveModal>
  );
}
