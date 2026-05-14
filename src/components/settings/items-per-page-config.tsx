'use client';

import { useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ITEMS_PER_PAGE_OPTIONS, type ItemsPerPageOption } from '@/lib/constants/table-columns';

interface ItemsPerPageConfigProps {
  initialValue: ItemsPerPageOption;
  onSave: (value: ItemsPerPageOption) => Promise<void>;
}

export function ItemsPerPageConfig({ initialValue, onSave }: ItemsPerPageConfigProps) {
  const [value, setValue] = useState<ItemsPerPageOption>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (newValue: string) => {
    const parsed = parseInt(newValue, 10);
    const numValue = ITEMS_PER_PAGE_OPTIONS.includes(parsed as ItemsPerPageOption)
      ? (parsed as ItemsPerPageOption)
      : initialValue;
    setValue(numValue);
    setIsSaving(true);
    try {
      await onSave(numValue);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">Mostrar</span>
      <Select value={value.toString()} onValueChange={handleChange} disabled={isSaving}>
        <SelectTrigger aria-label="Elementos por página" className="w-25">
          <SelectValue placeholder="10" />
        </SelectTrigger>
        <SelectContent>
          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">elementos por página</span>
    </div>
  );
}
