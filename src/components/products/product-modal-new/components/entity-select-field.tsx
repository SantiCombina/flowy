'use client';

import { X } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { EntitySelectFieldProps } from '../types';

export function EntitySelectField({
  label,
  value,
  onChange,
  options,
  entityType,
  onCreateEntity,
  onDeleteEntity,
  emptyMessage = 'Sin opciones',
}: EntitySelectFieldProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === '__create__') {
      onCreateEntity(entityType);
      return;
    }
    if (newValue === '__clear__') {
      onChange('');
      return;
    }
    onChange(newValue);
  };

  const handleDeleteClick = (e: React.MouseEvent, optionId: number, optionName: string) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteEntity(entityType, optionId, optionName);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select onValueChange={handleValueChange} value={value ?? ''}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__create__" className="text-primary font-medium cursor-pointer">
            + Crear nueva {label.toLowerCase()}
          </SelectItem>
          {value && (
            <SelectItem value="__clear__" className="text-muted-foreground cursor-pointer">
              ✕ Sin {label.toLowerCase()}
            </SelectItem>
          )}
          {options.length === 0 ? (
            <SelectItem value="_empty" disabled>
              {emptyMessage}
            </SelectItem>
          ) : (
            options.map((option) => (
              <SelectItem key={option.id} value={option.id.toString()} className="pr-16">
                <SelectItemText>{option.name}</SelectItemText>
                <button
                  type="button"
                  onMouseDown={(e) => handleDeleteClick(e, option.id, option.name)}
                  className="absolute right-8 p-1 rounded hover:bg-destructive/10 text-destructive transition-colors z-10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
