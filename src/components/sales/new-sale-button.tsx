'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { useUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/query-keys';

import { NewSaleDialog } from './new-sale-dialog';

export function NewSaleButton() {
  const queryClient = useQueryClient();
  const user = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.owner('month') });
  };

  return (
    <>
      <Button onClick={handleOpen} className="h-9 py-1.5">
        <ShoppingCart className="h-4 w-4" />
        Nueva venta
      </Button>

      <NewSaleDialog key={user.id} isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={handleSuccess} />
    </>
  );
}
