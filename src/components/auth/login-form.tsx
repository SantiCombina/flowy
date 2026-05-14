'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/schemas/auth/forgot-password-schema';
import { loginSchema, type LoginValues } from '@/schemas/auth/login-schema';

import { forgotPasswordAction, loginUser } from './actions';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const passwordReset = searchParams.get('password-reset') === 'true';

  const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const { executeAsync: executeLogin, status: loginStatus } = useAction(loginUser);
  const { executeAsync: executeForgot, status: forgotStatus } = useAction(forgotPasswordAction);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const forgotForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onLoginSubmit(data: LoginValues) {
    setLoginError(null);
    setRedirecting(false);
    const result = await executeLogin(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      setLoginError(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Ingreso exitoso');
      setRedirecting(true);
      await Promise.all([router.push('/'), router.refresh()]);
    }
  }

  async function onForgotSubmit(data: ForgotPasswordValues) {
    const result = await executeForgot(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Enlace enviado');
      setView('forgot-sent');
    }
  }

  function goToForgot() {
    forgotForm.reset();
    setView('forgot');
  }

  function goToLogin() {
    loginForm.reset();
    setLoginError(null);
    setView('login');
  }

  const isLoginExecuting = loginStatus === 'executing';
  const isForgotExecuting = forgotStatus === 'executing';

  if (view === 'forgot' || view === 'forgot-sent') {
    return (
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">Recuperar contraseña</CardTitle>
          <CardDescription>
            {view === 'forgot-sent'
              ? 'Revisá tu bandeja de entrada.'
              : 'Te enviamos un enlace para restablecer tu contraseña.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'forgot-sent' ? (
            <div className="space-y-4">
              <div className="rounded-md bg-success-muted p-3 text-sm text-success-muted-foreground">
                Si el email está registrado, recibirás un enlace en breve.
              </div>
              <Button variant="outline" className="w-full" onClick={goToLogin}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isForgotExecuting}>
                  {isForgotExecuting ? 'Enviando…' : 'Enviar enlace'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="text-xs text-muted-foreground/70 hover:text-muted-foreground"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
        <CardDescription>Ingresá tus credenciales para acceder</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...loginForm}>
          <form method="post" onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-2">
            {registered && (
              <div className="rounded-md bg-success-muted p-3 text-sm text-success-muted-foreground">
                Cuenta creada exitosamente. Ingresá tus credenciales.
              </div>
            )}
            {passwordReset && (
              <div className="rounded-md bg-success-muted p-3 text-sm text-success-muted-foreground">
                Contraseña actualizada. Ingresá con tu nueva contraseña.
              </div>
            )}
            {loginError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{loginError}</div>
            )}

            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@ejemplo.com" {...field} />
                  </FormControl>
                  <div className="-mt-1 min-h-5">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="••••••••" {...field} />
                  </FormControl>
                  <div className="-mt-1 min-h-5">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoginExecuting || redirecting}>
              {isLoginExecuting || redirecting ? 'Ingresando…' : 'Ingresar'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={goToForgot}
                className="text-xs text-muted-foreground/70 hover:text-muted-foreground"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
