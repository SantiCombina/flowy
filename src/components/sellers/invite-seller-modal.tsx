'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
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
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { inviteSellerSchema, type InviteSellerValues } from '@/schemas/sellers/invite-seller-schema';

import { inviteSellerAction } from './actions';

interface InviteSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteSellerModal({ isOpen, onClose, onSuccess }: InviteSellerModalProps) {
  const { executeAsync, isExecuting } = useAction(inviteSellerAction);
  const { invalidateQueries } = useInvalidateQueries();
  const [showSuccess, setShowSuccess] = useState(false);

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

  const onSubmit = async (data: InviteSellerValues) => {
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      setShowSuccess(true);
      form.reset();
      invalidateQueries([['sellers']]);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Invitar vendedor</ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Envía una invitación por email para agregar un nuevo vendedor a tu equipo.
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      {showSuccess ? (
        <ResponsiveModalBody className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">¡Invitación enviada!</h3>
            <p className="text-sm text-muted-foreground">Se ha enviado un email con el link de registro</p>
          </div>
        </ResponsiveModalBody>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
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
              <Button type="button" variant="outline" onClick={handleClose} disabled={isExecuting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? 'Enviando…' : 'Enviar invitación'}
              </Button>
            </ResponsiveModalFooter>
          </form>
        </Form>
      )}
    </ResponsiveModal>
  );
}
