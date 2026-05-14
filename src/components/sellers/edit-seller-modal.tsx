'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { formatPhoneInput } from '@/lib/phone';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/payload-types';
import { editSellerSchema, type EditSellerValues } from '@/schemas/sellers/edit-seller-schema';

import { updateSellerAction } from './actions';

interface EditSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seller: User | null;
}

export function EditSellerModal({ isOpen, onClose, onSuccess, seller }: EditSellerModalProps) {
  const { executeAsync, isExecuting } = useAction(updateSellerAction);
  const { invalidateQueries } = useInvalidateQueries();

  const form = useForm<EditSellerValues>({
    resolver: zodResolver(editSellerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      dni: '',
      cuitCuil: '',
      cbu: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (seller) {
      form.reset({
        name: seller.name,
        email: seller.email,
        phone: seller.phone || '',
        dni: seller.dni || '',
        cuitCuil: seller.cuitCuil || '',
        cbu: seller.cbu || '',
        isActive: seller.isActive ?? true,
      });
    }
  }, [seller, form]);

  const onSubmit = async (data: EditSellerValues) => {
    if (!seller) return;

    const result = await executeAsync({
      id: seller.id,
      ...data,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      const wasDeactivated = seller.isActive && !data.isActive;
      toast[wasDeactivated ? 'warning' : 'success'](wasDeactivated ? 'Vendedor desactivado' : 'Vendedor actualizado');
      invalidateQueries([queryKeys.sellers.list()]);
      onSuccess();
      onClose();
    }
  };

  const formatCuitCuil = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10, 11)}`;
  };

  const handleCuitCuilChange = (onChange: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCuitCuil(e.target.value);
    onChange(formatted);
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-xl">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Editar vendedor</ResponsiveModalTitle>
        <ResponsiveModalDescription>Modificá los datos del vendedor.</ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ResponsiveModalBody className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información básica</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Juan Pérez" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="vendedor@ejemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información adicional</h3>
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

              <FormField
                control={form.control}
                name="dni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNI</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345678" maxLength={8} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cuitCuil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT/CUIL</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value}
                        onChange={handleCuitCuilChange(field.onChange)}
                        placeholder="20-12345678-9"
                        maxLength={13}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cbu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CBU / Alias</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0000000000000000000000 o alias" maxLength={50} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex bg-white flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow-sm">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Vendedor activo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Si está desactivado, el vendedor no podrá iniciar sesión
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </ResponsiveModalBody>

          <ResponsiveModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isExecuting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </Form>
    </ResponsiveModal>
  );
}
