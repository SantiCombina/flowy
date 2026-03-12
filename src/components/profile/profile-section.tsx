'use client';

import { useUser } from '@/components/providers/user-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

import { PageHeader } from '../layout/page-header';

import { ChangePasswordDialog } from './change-password-dialog';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  owner: 'Dueño',
  seller: 'Vendedor',
};

export function ProfileSection() {
  const user = useUser();

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Mi Perfil" description="Información de tu cuenta" />

      <main className="flex-1 px-4 pb-6 sm:px-6">
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-5 rounded-xl border bg-linear-to-br from-primary/10 via-background to-background p-6">
            <Avatar className="h-20 w-20 shrink-0 ring-4 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarImage src="" alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="mt-1 text-sm">{user.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rol</p>
                <p className="mt-1 text-sm">{ROLE_LABELS[user.role]}</p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <ChangePasswordDialog />
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
