'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SidebarMenuButton } from '@/components/ui/sidebar';

import { logout } from './actions';

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logout();
      setOpen(false);
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <SidebarMenuButton
          tooltip="Cerrar sesión"
          className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut />
          <span>Cerrar sesión</span>
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a cerrar tu sesión actual. Tendrás que volver a iniciar sesión para acceder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={isPending} className="bg-red-600 hover:bg-red-700">
            {isPending ? 'Cerrando...' : 'Cerrar sesión'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
