'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { inviteSellerSchema, type InviteSellerValues } from '@/schemas/sellers/invite-seller-schema';

import { inviteSellerAction } from '../actions';

interface InviteSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteSellerModal({ isOpen, onClose, onSuccess }: InviteSellerModalProps) {
  const queryClient = useQueryClient();
  const { executeAsync } = useAction(inviteSellerAction);

  const form = useForm<InviteSellerValues>({
    resolver: zodResolver(inviteSellerSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = useCallback(
    async (data: InviteSellerValues) => {
      onClose();

      const result = await executeAsync(data);

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success('Invitación enviada');
        queryClient.invalidateQueries({ queryKey: ['sellers'], refetchType: 'none' });
        onSuccess();
      }
    },
    [executeAsync, queryClient, onSuccess, onClose],
  );

  const handleClose = () => {
    onClose();
  };

  const handleFormSubmit = form.handleSubmit(onSubmit);

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Invitar vendedor</ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Envía una invitación por email para agregar un nuevo vendedor a tu equipo.
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <Form {...form}>
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
          <ResponsiveModalBody className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
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
          </ResponsiveModalBody>

          <ResponsiveModalFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Enviar invitación</Button>
          </ResponsiveModalFooter>
        </form>
      </Form>
    </ResponsiveModal>
  );
}
