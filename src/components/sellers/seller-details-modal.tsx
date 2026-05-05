'use client';

import { Copy, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import type { CommissionPaymentRow, CommissionSummary } from '@/app/services/commissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { User } from '@/payload-types';

import { getCommissionDetailAction } from './commission-actions';
import { RegisterCommissionPaymentModal } from './register-commission-payment-modal';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  check: 'Cheque',
};

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface DetailRowProps {
  label: string;
  value?: string | null;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );
}

interface SellerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: User | null;
}

export function SellerDetailsModal({ isOpen, onClose, seller }: SellerDetailsModalProps) {
  const router = useRouter();
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPaymentRow[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const fetchVersionRef = useRef(0);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { executeAsync: loadCommissions } = useAction(getCommissionDetailAction);

  useEffect(() => {
    setActiveTab('info');
    setCommissionSummary(null);
    setCommissionPayments([]);
    fetchVersionRef.current += 1;
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth() + 1);
  }, [seller?.id]);

  const periodLabel = useMemo(() => {
    return `${MONTH_LABELS[selectedMonth - 1]} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    const newMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const newYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    fetchCommissions(newYear, newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const newYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    fetchCommissions(newYear, newMonth);
  };

  const fetchCommissions = async (year: number, month: number) => {
    if (!seller) return;
    const currentVersion = ++fetchVersionRef.current;
    setIsLoadingCommissions(true);
    try {
      const result = await loadCommissions({ sellerId: seller.id, year, month });
      if (currentVersion !== fetchVersionRef.current) return;
      if (result?.data?.success) {
        setCommissionSummary(result.data.summary);
        setCommissionPayments(result.data.payments);
      } else {
        toast.error(result?.serverError ?? 'No se pudo cargar la información de comisiones');
      }
    } catch {
      if (currentVersion !== fetchVersionRef.current) return;
      toast.error('Error al cargar las comisiones');
    } finally {
      if (currentVersion === fetchVersionRef.current) {
        setIsLoadingCommissions(false);
      }
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'commissions' && seller && !commissionSummary) {
      fetchCommissions(selectedYear, selectedMonth);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!seller) return;
    fetchCommissions(selectedYear, selectedMonth);
    router.refresh();
  };

  const handleClose = () => {
    setCommissionSummary(null);
    setCommissionPayments([]);
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth() + 1);
    onClose();
  };

  const handleCopyCbu = async () => {
    if (!seller?.cbu) return;
    await navigator.clipboard.writeText(seller.cbu);
    toast.success('CBU/Alias copiado al portapapeles');
  };

  return (
    <>
      <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-lg">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="pr-8">{seller?.name ?? 'Detalles del vendedor'}</ResponsiveModalTitle>
          <div className="flex items-center gap-2">
            <ResponsiveModalDescription>{seller?.email}</ResponsiveModalDescription>
            <Badge variant={seller?.isActive ? 'default' : 'secondary'} className="text-xs">
              {seller?.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </ResponsiveModalHeader>

        <ResponsiveModalBody>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Información
              </TabsTrigger>
              <TabsTrigger value="commissions" className="flex-1">
                Comisiones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacto</h3>
                <DetailRow label="Teléfono" value={seller?.phone} />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos fiscales</h3>
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="DNI" value={seller?.dni} />
                  <DetailRow label="CUIT/CUIL" value={seller?.cuitCuil} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datos bancarios</h3>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">CBU / Alias</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium break-all">{seller?.cbu || '-'}</span>
                    {seller?.cbu && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopyCbu}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="commissions" className="mt-4 space-y-4">
              {!commissionSummary && isLoadingCommissions ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Cargando comisiones...
                </div>
              ) : commissionSummary ? (
                <div
                  className={`space-y-4 ${isLoadingCommissions ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}`}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <span className="text-xs text-muted-foreground">Saldo pendiente</span>
                      <p
                        className={`text-lg font-semibold ${commissionSummary.pendingBalance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                      >
                        {formatCurrency(commissionSummary.pendingBalance)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <span className="text-xs text-muted-foreground">Total pagado</span>
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(commissionSummary.totalPaid)}
                      </p>
                    </div>
                  </div>

                  {commissionSummary.pendingBalance > 0 && (
                    <Button className="w-full" onClick={() => setIsPaymentModalOpen(true)}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      Registrar pago de comisión
                    </Button>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Detalle del período
                      </h3>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">{periodLabel}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border p-2.5">
                        <span className="text-[11px] text-muted-foreground">Ventas</span>
                        <p className="text-sm font-semibold">{formatCurrency(commissionSummary.periodSales)}</p>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <span className="text-[11px] text-muted-foreground">Comisión</span>
                        <p className="text-sm font-semibold">{formatCurrency(commissionSummary.periodCommission)}</p>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <span className="text-[11px] text-muted-foreground">Pagos</span>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(commissionSummary.periodPayments)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pagos — {periodLabel}
                    </h3>
                    {commissionPayments.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No hay pagos de comisión en este período
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {commissionPayments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(payment.createdAt)} ·{' '}
                                {PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                              </span>
                              {payment.reference && (
                                <span className="text-xs text-muted-foreground">Ref: {payment.reference}</span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No se pudo cargar la información de comisiones
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ResponsiveModalBody>

        <ResponsiveModalFooter>
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModal>

      {seller && commissionSummary && (
        <RegisterCommissionPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          sellerId={seller.id}
          sellerName={seller.name}
          pendingBalance={commissionSummary.pendingBalance}
        />
      )}
    </>
  );
}
