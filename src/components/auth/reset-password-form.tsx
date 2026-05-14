'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth/reset-password-schema';

import { resetPasswordAction } from './actions';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { executeAsync, status } = useAction(resetPasswordAction);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  async function onSubmit(data: ResetPasswordValues) {
    setError(null);
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      setError(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Contraseña actualizada');
      router.push('/login?password-reset=true');
    } else if (result?.data?.error) {
      toast.error(result.data.error);
      setError(result.data.error);
    }
  }

  const isExecuting = status === 'executing';

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Nueva contraseña</CardTitle>
        <CardDescription>Ingresá tu nueva contraseña para acceder a tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

            <FormField
              control={form.control}
              name="password"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isExecuting}>
              {isExecuting ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
