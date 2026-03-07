'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ARGENTINA_PROVINCES } from '@/lib/constants/argentina-geo';
import type { Client } from '@/payload-types';
import { clientSchema, type ClientValues } from '@/schemas/clients/client-schema';

import { createClientAction, updateClientAction } from './actions';

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

  const [localities, setLocalities] = useState<{ id: string; nombre: string }[]>([]);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const localitiesCache = useRef<Record<string, { id: string; nombre: string }[]>>({});

  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      cuit: '',
      phone: '',
      email: '',
      address: '',
      provincia: '',
      localidad: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        name: '',
        cuit: '',
        phone: '',
        email: '',
        address: '',
        provincia: '',
        localidad: '',
      });
      setLocalities([]);
      return;
    }

    if (isEditMode && client) {
      const provincia = client.provincia ?? '';
      form.reset({
        name: client.name,
        cuit: client.cuit ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        provincia,
        localidad: client.localidad ?? '',
      });
      if (provincia) {
        void loadLocalities(provincia);
      }
    }
  }, [isOpen, isEditMode, client]);

  const loadLocalities = async (provinceName: string) => {
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
  };

  const handleProvinciaChange = (value: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(value);
    form.setValue('localidad', '');
    setLocalities([]);
    if (value) {
      void loadLocalities(value);
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
      onSuccess(result.data.client as Client);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar cliente' : 'Agregar cliente'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modificá los datos del cliente.' : 'Completá los datos para registrar un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Input {...field} placeholder="20-12345678-9" />
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
                      <Input {...field} placeholder="+54 9 11 1234-5678" />
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
                    <Select value={field.value ?? ''} onValueChange={(v) => handleProvinciaChange(v, field.onChange)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ARGENTINA_PROVINCES.map((p) => (
                          <SelectItem key={p.id} value={p.nombre}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        disabled={localities.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={form.watch('provincia') ? 'Seleccionar...' : 'Elegí una provincia'}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {localities.map((l) => (
                            <SelectItem key={l.id} value={l.nombre}>
                              {l.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
