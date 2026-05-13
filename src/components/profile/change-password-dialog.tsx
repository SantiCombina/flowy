'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { changePasswordSchema, type ChangePasswordValues } from '@/schemas/profile/change-password-schema';

import { changePasswordAction } from './actions';

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { executeAsync, status } = useAction(changePasswordAction);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  async function onSubmit(data: ChangePasswordValues) {
    setError(null);
    const result = await executeAsync(data);

    if (result?.serverError) {
      setError(result.serverError);
      return;
    }

    if (result?.data?.success) {
      setSuccess(true);
      form.reset();
    } else if (result?.data?.error) {
      setError(result.data.error);
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      form.reset();
      setError(null);
      setSuccess(false);
    }
  }

  const isExecuting = status === 'executing';

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Cambiar contraseña
      </Button>

      <ResponsiveModal open={open} onOpenChange={handleOpenChange} className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Cambiar contraseña</ResponsiveModalTitle>
          <ResponsiveModalDescription>Ingresá tu contraseña actual y luego la nueva.</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {success ? (
          <ResponsiveModalBody className="space-y-4">
            <div className="rounded-md bg-success-muted p-3 text-sm text-success-muted-foreground">
              Contraseña actualizada correctamente.
            </div>
            <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
              Cerrar
            </Button>
          </ResponsiveModalBody>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <ResponsiveModalBody className="space-y-4">
                {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña actual</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar nueva contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ResponsiveModalBody>

              <ResponsiveModalFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isExecuting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isExecuting}>
                  {isExecuting ? 'Guardando…' : 'Guardar'}
                </Button>
              </ResponsiveModalFooter>
            </form>
          </Form>
        )}
      </ResponsiveModal>
    </>
  );
}
