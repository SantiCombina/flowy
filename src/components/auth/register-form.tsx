'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { registerSchema, type RegisterValues } from '@/schemas/auth/register-schema';

import { registerUser } from './actions';

interface RegisterFormProps {
  token?: string;
  email?: string;
  role?: string;
}

export function RegisterForm({ token, email, role }: RegisterFormProps) {
  const router = useRouter();

  const { executeAsync, status } = useAction(registerUser);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: email ?? '',
      password: '',
      confirmPassword: '',
      token: token ?? '',
    },
  });

  async function onSubmit(data: RegisterValues) {
    if (!token || !email) return;

    setError(null);
    const result = await executeAsync(data);

    if (result?.serverError) {
      setError(result.serverError);
      return;
    }

    if (result?.data?.success) {
      router.push('/login?registered=true');
    } else if (result?.data?.error) {
      setError(result.data.error);
    }
  }

  if (!token || !email) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invitación inválida</CardTitle>
          <CardDescription>El enlace de invitación no es válido o ha expirado.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>
          Registrándose como <span className="font-medium capitalize">{role === 'owner' ? 'Dueño' : 'Vendedor'}</span>
          <br />
          <span className="text-foreground">{email}</span>
        </CardDescription>
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
                  <FormLabel>Contraseña</FormLabel>
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

            <Button type="submit" className="w-full" disabled={status === 'executing'}>
              {status === 'executing' ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
