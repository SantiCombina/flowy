'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { EntitySelectFieldProps } from '../types';

export function EntitySelectField({
  label,
  value,
  onChange,
  options,
  entityType,
  onCreate,
  onDeleteEntity,
  emptyMessage = 'Sin opciones',
}: EntitySelectFieldProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValueChange = (newValue: string) => {
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

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    const result = await onCreate(trimmed);
    setIsSubmitting(false);

    if (result) {
      onChange(result.id.toString());
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {!isCreating && (
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setNewName('');
            }}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            + Nueva {label.toLowerCase()}
          </button>
        )}
      </div>
      {isCreating ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={`Nombre de la nueva ${label.toLowerCase()}`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleCreate()}
              disabled={!newName.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creando…' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCancelCreate} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Select onValueChange={handleValueChange} value={value ?? ''}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
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
      )}
    </div>
  );
}
