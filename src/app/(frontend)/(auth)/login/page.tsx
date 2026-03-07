import { Box, Package, ShoppingCart, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/login-form';
import { getCurrentUser } from '@/lib/payload';

const features = [
  { icon: Package, label: 'Control de stock en tiempo real' },
  { icon: Users, label: 'Gestión de vendedores y asignaciones' },
  { icon: ShoppingCart, label: 'Registro de ventas y clientes' },
];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/20">
            <Box className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Stocker</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">Gestión de inventario y ventas simplificada</h2>
            <p className="text-lg text-primary-foreground/70 leading-relaxed">
              Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas desde un solo lugar.
            </p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-primary-foreground/85">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/40">© 2026 Stocker</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 bg-muted/20">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Box className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Stocker</span>
        </div>

        <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-lg bg-muted" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
