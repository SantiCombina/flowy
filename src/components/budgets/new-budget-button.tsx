'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface NewBudgetButtonProps {
  onOpen: () => void;
}

export function NewBudgetButton({ onOpen }: NewBudgetButtonProps) {
  return (
    <Button onClick={onOpen}>
      <Plus className="h-4 w-4" />
      Nuevo presupuesto
    </Button>
  );
}
