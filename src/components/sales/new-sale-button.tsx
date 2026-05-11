'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { NewSaleDialog } from './new-sale-dialog';

export function NewSaleButton() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const handleOpen = () => {
    setDialogKey((k) => k + 1);
    setIsOpen(true);
  };

  const handleSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        Nueva venta
      </Button>

      <NewSaleDialog key={dialogKey} isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={handleSuccess} />
    </>
  );
}
