import { formatShortDate } from '@/lib/utils';

export interface SaleWhatsAppDetails {
  date: string;
  notes?: string | null;
  total: number;
  items: Array<{
    variantName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getSaleWhatsAppLink(sale: SaleWhatsAppDetails, businessName: string | null): string {
  const name = businessName?.trim() || 'Flowy';
  const intro = `Hola! desde ${name} le informamos el detalle de su compra realizada el ${formatShortDate(sale.date)} con un total de $ ${formatPrice(sale.total)}`;
  const lines: string[] = [intro, ''];

  for (let i = 0; i < sale.items.length; i++) {
    const item = sale.items[i];
    lines.push(`- ${item.variantName} x${item.quantity} - $ ${formatPrice(item.unitPrice)}`);
    if (i < sale.items.length - 1) {
      lines.push('');
    }
  }

  if (sale.notes) {
    lines.push('');
    lines.push(`Notas: ${sale.notes}`);
  }

  lines.push('');
  lines.push('Mensaje enviado desde www.flowy.ar - Sistema de gestión');

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}
