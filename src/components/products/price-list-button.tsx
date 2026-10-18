'use client';

import { Download, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceListPdfError } from '@/lib/price-list-pdf';

import { getPriceListAction } from './price-list-action';

export function PriceListButton() {
  const { executeAsync, isExecuting } = useAction(getPriceListAction);
  const [isGenerating, setIsGenerating] = useState(false);
  const busy = isExecuting || isGenerating;

  async function handleDownload() {
    setIsGenerating(true);
    try {
      const result = await executeAsync();
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      if (!result?.data?.success) {
        toast.error('No se pudo generar la lista de precios');
        return;
      }
      const { createPriceListPdf } = await import('@/lib/price-list-pdf');
      const doc = await createPriceListPdf(result.data.priceList);
      doc.save(`lista-de-precios-${result.data.priceList.date.replaceAll('/', '-')}.pdf`);
    } catch (error) {
      toast.error(error instanceof PriceListPdfError ? error.message : 'No se pudo generar la lista de precios');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" disabled={busy} onClick={handleDownload}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? 'Generando...' : 'Exportar'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exportar lista de precios en PDF</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
