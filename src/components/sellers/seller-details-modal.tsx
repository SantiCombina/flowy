'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

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
import type { User } from '@/payload-types';

interface SellerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: User | null;
}

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

export function SellerDetailsModal({ isOpen, onClose, seller }: SellerDetailsModalProps) {
  const handleCopyCbu = async () => {
    if (!seller?.cbu) return;
    await navigator.clipboard.writeText(seller.cbu);
    toast.success('CBU/Alias copiado al portapapeles');
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle className="pr-8">{seller?.name ?? 'Detalles del vendedor'}</ResponsiveModalTitle>
        <div className="flex items-center gap-2">
          <ResponsiveModalDescription>{seller?.email}</ResponsiveModalDescription>
          <Badge variant={seller?.isActive ? 'default' : 'secondary'} className="text-xs">
            {seller?.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="space-y-5">
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
      </ResponsiveModalBody>

      <ResponsiveModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}
