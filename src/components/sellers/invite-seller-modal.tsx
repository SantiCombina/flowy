'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { inviteSellerAction } from './actions';

const inviteSellerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
});

type InviteSellerFormData = z.infer<typeof inviteSellerSchema>;

interface InviteSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteSellerModal({ isOpen, onClose, onSuccess }: InviteSellerModalProps) {
  const { executeAsync, isExecuting } = useAction(inviteSellerAction);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<InviteSellerFormData>({
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

  const onSubmit = async (data: InviteSellerFormData) => {
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      setShowSuccess(true);
      form.reset();
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Invitar vendedor</DialogTitle>
          <DialogDescription>
            Envía una invitación por email para agregar un nuevo vendedor a tu equipo.
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">¡Invitación enviada!</h3>
              <p className="text-sm text-muted-foreground">Se ha enviado un email con el link de registro</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="Juan Pérez" className="pl-9" />
                      </div>
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
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type="email" placeholder="vendedor@ejemplo.com" className="pl-9" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isExecuting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isExecuting}>
                  {isExecuting ? 'Enviando...' : 'Enviar invitación'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
