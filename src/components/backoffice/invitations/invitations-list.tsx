'use client';

import { ChevronLeft, ChevronRight, Mail, MoreHorizontal, Send, XCircle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import type { InvitationListResult, InvitationRow } from '@/app/services/backoffice/invitations';
import { InviteAdminDialog } from '@/components/backoffice/tenants/invite-admin-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { invitationStateSchema, type InvitationListValues } from '@/schemas/backoffice/invitation-list-schema';

import { CancelInvitationDialog } from './cancel-invitation-dialog';
import { ResendInvitationDialog } from './resend-invitation-dialog';

const STATE_LABELS = {
  all: 'Todos los estados',
  pending: 'Pendiente',
  accepted: 'Aceptada',
  expired: 'Vencida',
  cancelled: 'Cancelada',
  replaced: 'Reemplazada',
};

const EMAIL_LABELS = { pending: 'Pendiente de envío', sent: 'Enviado', failed: 'Error de envío' };

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));
}

interface InvitationsListProps {
  data: InvitationListResult;
  filters: InvitationListValues;
}

export function InvitationsList({ data, filters }: InvitationsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<InvitationRow | null>(null);
  const [resending, setResending] = useState<InvitationRow | null>(null);
  const submittedSearches = useRef(new Set<string>());
  const query = searchParams.toString();

  useEffect(() => {
    if (submittedSearches.current.delete(filters.search)) return;
    setSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    function handlePopState() {
      submittedSearches.current.clear();
      setSearch(new URLSearchParams(window.location.search).get('search') ?? '');
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (search.trim() === filters.search) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(query);
      params.set('search', search.trim());
      params.delete('page');
      submittedSearches.current.add(search.trim());
      startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(timeout);
  }, [search, filters.search, query, pathname, router]);

  function navigate(key: 'state' | 'page', value: string) {
    const params = new URLSearchParams(query);
    params.set(key, value);
    params.set('search', search.trim());
    if (search.trim() !== filters.search) submittedSearches.current.add(search.trim());
    if (key !== 'page') params.delete('page');
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300" aria-busy={isPending}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput className="flex-1 sm:max-w-sm" placeholder="Buscar por nombre, email o negocio" name="invitations-search" value={search} onChange={setSearch} />
          <div className="hidden sm:flex h-9 items-center gap-2 rounded-full bg-white px-4 shadow-sm">
            <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-sm font-semibold text-foreground">{data.totalDocs} invitaciones</span>
          </div>
          <Select value={filters.state} disabled={isPending} onValueChange={(value) => {
            const result = invitationStateSchema.safeParse(value);
            if (result.success) navigate('state', result.data);
          }}>
            <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-auto min-w-35"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <InviteAdminDialog />
        </div>

        {data.docs.length === 0 && !filters.search && filters.state === 'all' ? (
          <EmptyState icon={Mail} title="Sin invitaciones registradas" />
        ) : (
          <div className="rounded-xl bg-card shadow-md overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                {['Destinatario', 'Negocio', 'Estado', 'Email', 'Creada', 'Vencimiento', 'Aceptada', 'Cancelada'].map((label) => <TableHead key={label}>{label}</TableHead>)}
                <TableHead className="w-10"><span className="sr-only">Acciones</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.docs.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No se encontraron invitaciones con esos filtros</TableCell></TableRow>
                ) : data.docs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><div className="font-medium">{row.name || '—'}</div><div className="text-xs text-muted-foreground">{row.email}</div></TableCell>
                    <TableCell>{row.businessName || '—'}</TableCell>
                    <TableCell><Badge variant={row.state === 'accepted' ? 'success' : row.state === 'pending' ? 'warning' : 'secondary'}>{STATE_LABELS[row.state]}</Badge></TableCell>
                    <TableCell><Badge variant={row.emailStatus === 'sent' ? 'success' : row.emailStatus === 'failed' ? 'error' : 'warning'}>{EMAIL_LABELS[row.emailStatus]}</Badge></TableCell>
                    {[row.createdAt, row.expiresAt, row.usedAt, row.cancelledAt].map((value, index) => <TableCell key={index} className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(value)}</TableCell>)}
                    <TableCell>
                      {(row.state === 'pending' || row.state === 'expired') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Acciones para ${row.email}`} disabled={isPending}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setResending(row)}><Send className="h-4 w-4" />Reenviar invitación</DropdownMenuItem>
                            {row.state === 'pending' && <DropdownMenuItem variant="destructive" onSelect={() => setSelected(row)}><XCircle className="h-4 w-4" />Cancelar invitación</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <span>25 filas por página</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <span aria-live="polite">{isPending ? 'Cargando…' : `${data.page} / ${data.totalPages} · ${data.totalDocs} resultados`}</span>
            <Button variant="outline" className="h-9 w-9 p-0" aria-label="Página anterior" disabled={data.page <= 1 || isPending} onClick={() => navigate('page', String(data.page - 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" className="h-9 w-9 p-0" aria-label="Página siguiente" disabled={data.page >= data.totalPages || isPending} onClick={() => navigate('page', String(data.page + 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <CancelInvitationDialog invitation={selected} onClose={() => setSelected(null)} />
        <ResendInvitationDialog invitation={resending} onClose={() => setResending(null)} />
      </main>
    </div>
  );
}
