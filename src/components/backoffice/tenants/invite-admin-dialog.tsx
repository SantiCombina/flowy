'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import { adminInvitationSchema, type AdminInvitationValues } from '@/schemas/backoffice/admin-invitation-schema';

import { createInvitationAction, listInvitationsAction } from './invitations/actions';

const DEFAULT_VALUES: AdminInvitationValues = {
  name: '',
  email: '',
  businessName: '',
};

type CreatedResult = {
  expiresAt: string;
  token: string;
  emailSent: boolean;
};

function buildMagicLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000';
  return `${base}/register?token=${token}`;
}

export function InviteAdminDialog() {
  const [open, setOpen] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);
  const codeRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();

  const form = useForm<AdminInvitationValues>({
    resolver: zodResolver(adminInvitationSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { executeAsync, isExecuting } = useAction(createInvitationAction);

  const { data: pendingInvitations, isPending: isLoadingPending } = useServerActionQuery({
    queryKey: queryKeys.adminBackoffice.invitations.list(),
    queryFn: () => listInvitationsAction(),
    enabled: open,
  });

  function resetDialog() {
    form.reset(DEFAULT_VALUES);
    setCreatedResult(null);
  }

  async function onSubmit(data: AdminInvitationValues) {
    try {
      const result = await executeAsync(data);
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      if (result?.data) {
        if (!result.data.emailSent) {
          toast.warning('No se pudo enviar el email. Copiá el link manualmente.');
        } else {
          toast.success('Invitación creada');
        }
        setCreatedResult({
          token: result.data.token,
          expiresAt: result.data.expiresAt,
          emailSent: result.data.emailSent,
        });
        await invalidateQueries([queryKeys.adminBackoffice.invitations.list()]);
        router.refresh();
      }
    } catch {
      toast.error('Ocurrió un error inesperado. Intentá de nuevo más tarde.');
    }
  }

  async function handleCopyLink(link: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        toast.info('Link copiado');
        return;
      }
      throw new Error('clipboard unavailable');
    } catch {
      toast.warning('No se pudo copiar automáticamente. Seleccioná el link manualmente.');
      const node = codeRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button className="ml-auto h-9 py-1.5">
          <Mail className="h-4 w-4" />
          Invitar owner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar owner</DialogTitle>
          <DialogDescription>
            El invitado recibirá un email con un link para registrarse y crear su negocio. La invitación expira en 7
            días.
          </DialogDescription>
        </DialogHeader>

        {createdResult ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {createdResult.emailSent
                ? 'Email enviado. También podés copiar el link manualmente:'
                : 'Si el email no llega en unos minutos, podés copiar el link manualmente:'}
            </p>
            <div className="rounded-md border bg-muted/50 p-3">
              <code ref={codeRef} className="block break-all text-xs">
                {buildMagicLink(createdResult.token)}
              </code>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCopyLink(buildMagicLink(createdResult.token))}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar link
              </Button>
              <Button
                type="button"
                onClick={() => {
                  resetDialog();
                  setOpen(false);
                }}
              >
                Listo
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del dueño</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
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
                    <FormLabel>
                      Email <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del negocio</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Invitaciones pendientes creadas por vos</p>
                  {isLoadingPending ? <Spinner className="h-3 w-3" /> : null}
                </div>
                {pendingInvitations && pendingInvitations.length > 0 ? (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                    {pendingInvitations.map((row) => (
                      <li key={row.id} className="flex flex-col rounded border bg-background p-2">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted-foreground">{row.email}</span>
                        <span className="text-muted-foreground">
                          {new Date(row.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No hay invitaciones pendientes.</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isExecuting}>
                  {isExecuting ? (
                    <span className="flex items-center gap-2">
                      Enviando
                      <Spinner />
                    </span>
                  ) : (
                    'Enviar invitación'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
