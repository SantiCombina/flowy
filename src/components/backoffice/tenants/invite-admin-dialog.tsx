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
import { queryKeys } from '@/lib/query-keys';
import { adminInvitationSchema, type AdminInvitationValues } from '@/schemas/backoffice/admin-invitation-schema';

import { createInvitationAction } from './invitations/actions';

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
  const submitting = useRef(false);
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();

  const form = useForm<AdminInvitationValues>({
    resolver: zodResolver(adminInvitationSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { executeAsync, isExecuting } = useAction(createInvitationAction);

  function resetDialog() {
    form.reset(DEFAULT_VALUES);
    setCreatedResult(null);
  }

  async function onSubmit(data: AdminInvitationValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await executeAsync(data);
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      if (result?.validationErrors) {
        toast.error('Revisá los datos de la invitación');
        return;
      }
      if (result?.data) {
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
    } finally {
      submitting.current = false;
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
        if (submitting.current) return;
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
                : 'No se confirmó el envío del email. Podés copiar el link manualmente:'}
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
                      <Input type="email" maxLength={254} {...field} autoComplete="off" />
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

              <DialogFooter>
                <Button type="button" variant="outline" disabled={isExecuting} onClick={() => setOpen(false)}>
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
