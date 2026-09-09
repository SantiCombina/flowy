'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import type { EntitySelectFieldProps } from '../types';

function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function EntitySelectField({
  label,
  value,
  onChange,
  options,
  entityType,
  onCreate,
  onDeleteEntity,
  emptyMessage = 'Sin opciones',
  disabledCreate = false,
  disabledOptionIds,
}: EntitySelectFieldProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCancelCreate = () => {
    if (isSubmitting) return;
    setIsCreating(false);
    setNewName('');
  };

  useEffect(() => {
    if (!isCreating || isSubmitting) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapperRef.current?.contains(target)) return;
      handleCancelCreate();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isCreating, isSubmitting]);

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
    if (!trimmed || isSubmitting) return;

    const duplicate = options.some((o) => normalize(o.name) === normalize(trimmed));
    if (duplicate) return;

    setIsSubmitting(true);
    const result = await onCreate(trimmed);
    setIsSubmitting(false);

    if (result) {
      onChange(result.id.toString());
      setNewName('');
      setIsCreating(false);
    }
  };

  const trimmedName = newName.trim();
  const isDuplicate = trimmedName.length > 0 && options.some((o) => normalize(o.name) === normalize(trimmedName));
  const canSubmit = trimmedName.length > 0 && !isDuplicate && !isSubmitting;

  const comboboxOptions = [
    ...(value ? [{ value: '__clear__', label: `✕ Sin ${label.toLowerCase()}` }] : []),
    ...options.map((option) => ({
      value: option.id.toString(),
      label: option.name,
      disabled: disabledOptionIds?.includes(option.id.toString()) ?? false,
    })),
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {!isCreating && (
          <button
            type="button"
            onClick={() => {
              if (disabledCreate) return;
              setIsCreating(true);
              setNewName('');
              onChange('');
            }}
            disabled={disabledCreate}
            className={cn(
              'text-xs leading-none underline decoration-transparent focus:outline-none focus-visible:decoration-current flex items-center gap-1',
              disabledCreate
                ? 'text-muted-foreground cursor-not-allowed'
                : 'text-primary hover:decoration-current focus-visible:decoration-current',
            )}
          >
            + Nueva {label.toLowerCase()}
          </button>
        )}
      </div>

      {isCreating ? (
        <div ref={wrapperRef} className="animate-in fade-in duration-200">
          <div className="relative">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreate();
                }
                if (e.key === 'Escape') {
                  handleCancelCreate();
                }
              }}
              autoFocus
              placeholder={`Nombre de la ${label.toLowerCase()}`}
              disabled={isSubmitting}
              className={cn('pr-20', isDuplicate && 'border-destructive focus-visible:ring-destructive')}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!canSubmit}
                aria-label={`Crear ${label.toLowerCase()}`}
                title={`Crear ${label.toLowerCase()}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-success hover:bg-success-muted hover:text-success-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-success transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                disabled={isSubmitting}
                aria-label="Cancelar"
                title="Cancelar"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
          {isDuplicate && (
            <p className="text-xs text-destructive mt-1">Ya existe {label.toLowerCase()} con ese nombre</p>
          )}
        </div>
      ) : (
        <Combobox
          options={comboboxOptions}
          value={value ?? ''}
          onValueChange={handleValueChange}
          placeholder=""
          searchPlaceholder=""
          emptyMessage={options.length === 0 ? emptyMessage : 'Sin coincidencias'}
          renderItem={({ option, isHighlighted, isSelected, onSelect, onMouseEnter, setItemRef }) => {
            if (option.value === '__clear__') {
              return (
                <div
                  ref={setItemRef}
                  onClick={onSelect}
                  onMouseEnter={onMouseEnter}
                  className={cn(
                    'relative flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm select-none mx-1 text-muted-foreground',
                    isHighlighted && 'bg-accent',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                </div>
              );
            }
            const optionId = Number(option.value);
            return (
              <div
                ref={setItemRef}
                onClick={onSelect}
                onMouseEnter={onMouseEnter}
                className={cn(
                  'relative flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm select-none mx-1 pr-10',
                  isHighlighted && 'bg-accent',
                  option.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                )}
              >
                <span className="truncate">{option.label}</span>
                <button
                  type="button"
                  aria-label={`Eliminar ${label.toLowerCase()} ${option.label}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(e, optionId, option.label);
                  }}
                  className="absolute right-2 p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {isSelected && !isHighlighted && <Check className="absolute right-9 h-4 w-4 text-primary" />}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
