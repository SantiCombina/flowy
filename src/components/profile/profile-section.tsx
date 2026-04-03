'use client';

import { Building2, Mail, Shield, User } from 'lucide-react';

import { useUser } from '@/components/providers/user-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { PageHeader } from '../layout/page-header';

import { ChangePasswordDialog } from './change-password-dialog';
import { UpdateBusinessNameForm } from './update-business-name-form';
import { UpdateProfileForm } from './update-profile-form';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  owner: 'Dueño',
  seller: 'Vendedor',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  owner: 'default',
  seller: 'secondary',
};

interface ProfileSectionProps {
  phone?: string | null;
  dni?: string | null;
  cuitCuil?: string | null;
  cbu?: string | null;
  businessName?: string | null;
}

export function ProfileSection({ phone, dni, cuitCuil, cbu, businessName }: ProfileSectionProps) {
  const user = useUser();

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Mi perfil" description="Información de tu cuenta" />

      <main className="flex-1 px-4 pb-6 sm:px-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src="" alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{user.name}</h2>
                    <Badge variant={ROLE_VARIANTS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                  {user.role === 'owner' && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {user.businessName?.trim() || 'Sin nombre de negocio'}
                    </p>
                  )}
                  {user.role === 'seller' && user.businessName && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {user.businessName}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Seguridad</CardTitle>
              </div>
              <CardDescription>Gestioná el acceso a tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Contraseña</p>
                  <p className="text-xs text-muted-foreground">Última actualización desconocida</p>
                </div>
                <ChangePasswordDialog />
              </div>
            </CardContent>
          </Card>

          {user.role === 'owner' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Tu negocio</CardTitle>
                </div>
                <CardDescription>Este nombre aparecerá en el sidebar para vos y tus vendedores</CardDescription>
              </CardHeader>
              <CardContent>
                <UpdateBusinessNameForm initialValue={businessName} />
              </CardContent>
            </Card>
          )}

          {user.role === 'seller' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Datos personales</CardTitle>
                </div>
                <CardDescription>Tu información de contacto y datos fiscales</CardDescription>
              </CardHeader>
              <CardContent>
                <UpdateProfileForm phone={phone} dni={dni} cuitCuil={cuitCuil} cbu={cbu} />
              </CardContent>
            </Card>
          )}

          {user.role === 'seller' && user.businessName && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Trabajando para</p>
                  <p className="text-sm text-muted-foreground">{user.businessName}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
