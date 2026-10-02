import { Package, ShoppingCart, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { validateInvitation } from '@/app/services/invitations';
import { RegisterForm } from '@/components/auth/register-form';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Creá tu cuenta en Flowy y empezá a gestionar tu negocio.',
  alternates: {
    canonical: '/register',
  },
  openGraph: {
    title: 'Crear cuenta | Flowy',
    description: 'Creá tu cuenta en Flowy y empezá a gestionar tu negocio.',
    url: '/register',
    type: 'website',
  },
};

const ownerFeatures = [
  { icon: Package, label: 'Control de stock en tiempo real' },
  { icon: Users, label: 'Gestión de vendedores y asignaciones' },
  { icon: ShoppingCart, label: 'Registro de ventas y clientes' },
];

const sellerFeatures = [
  { icon: Package, label: 'Consultá tu stock en cualquier momento' },
  { icon: ShoppingCart, label: 'Registrá ventas en segundos' },
  { icon: Users, label: 'Mantenete conectado con tu equipo' },
];

type RegisterVariant = 'owner' | 'seller' | 'default';

interface RegisterShellProps {
  variant: RegisterVariant;
  children: React.ReactNode;
}

function RegisterShell({ variant, children }: RegisterShellProps) {
  const headline =
    variant === 'owner'
      ? 'Estás a un paso de empezar a gestionar tu negocio'
      : variant === 'seller'
        ? 'Estás a un paso de sumarte al equipo'
        : 'Gestión de inventario y ventas simplificada';

  const subhead =
    variant === 'owner'
      ? 'Configurá tu contraseña y empezá a operar tu negocio en Flowy.'
      : variant === 'seller'
        ? 'Configurá tu contraseña y empezá a registrar ventas desde donde estés.'
        : 'Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas desde un solo lugar.';

  const features = variant === 'seller' ? sellerFeatures : ownerFeatures;

  return (
    <main className="flex min-h-dvh">
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-primary p-12 text-primary-foreground">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/isotipo.png" alt="Flowy" width={48} height={48} className="shrink-0" priority />
          <span className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Flowy
          </span>
        </Link>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">{headline}</h2>
            <p className="text-lg text-primary-foreground leading-relaxed">{subhead}</p>
          </div>

          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-primary-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-primary-foreground">© 2026 Flowy</p>
          <a href="https://forge.ar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
            <span className="text-xs text-primary-foreground">Un desarrollo de</span>
            <Image src="/forge.png" alt="Forge" width={56} height={16} className="h-6 w-auto" />
          </a>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 bg-muted/20">
        <Link href="/" className="flex items-center gap-3 lg:hidden">
          <Image src="/isotipo.png" alt="Flowy" width={48} height={48} className="shrink-0" priority />
          <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Flowy
          </span>
        </Link>

        <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-lg bg-muted" />}>
          {children}
        </Suspense>
      </div>
    </main>
  );
}

interface RegisterPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  const { token } = await searchParams;

  if (!token) {
    return (
      <RegisterShell variant="default">
        <RegisterForm />
      </RegisterShell>
    );
  }

  const result = await validateInvitation(token);

  if (!result.valid || !result.invitation) {
    return (
      <RegisterShell variant="default">
        <RegisterForm />
      </RegisterShell>
    );
  }

  const variant: RegisterVariant = result.invitation.role === 'owner' ? 'owner' : 'seller';

  return (
    <RegisterShell variant={variant}>
      <RegisterForm email={result.invitation.email} token={token} role={result.invitation.role} />
    </RegisterShell>
  );
}
