'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/query-keys';

const NewSaleDialog = dynamic(() => import('./new-sale-dialog').then((m) => m.NewSaleDialog));

export function NewSaleButton() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const handleOpen = () => {
    setDialogKey((k) => k + 1);
    setIsOpen(true);
  };

  const handleSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.owner('month') });
  };

  return (
    <>
      <Button size="sm" className="gap-2" onClick={handleOpen}>
        <ShoppingCart className="h-4 w-4" />
        Nueva venta
      </Button>

      <NewSaleDialog key={dialogKey} isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={handleSuccess} />
    </>
  );
}
