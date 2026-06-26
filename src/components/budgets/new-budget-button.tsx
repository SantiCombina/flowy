'use client';

import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface NewBudgetButtonProps {
  onOpen: () => void;
}

export function NewBudgetButton({ onOpen }: NewBudgetButtonProps) {
  return (
    <Button size="sm" onClick={onOpen}>
      <FileText className="h-4 w-4 mr-2" />
      Nuevo presupuesto
    </Button>
  );
}
