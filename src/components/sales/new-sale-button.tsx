'use client';

import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { NewSaleDialog } from './new-sale-dialog';

export function NewSaleButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const handleOpen = () => {
    setDialogKey((k) => k + 1);
    setIsOpen(true);
  };

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        Nueva venta
      </Button>

      <NewSaleDialog
        key={dialogKey}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
