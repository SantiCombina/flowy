'use client';

import { Check, X, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  footer?: React.ReactNode;
}

function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  disabled,
  className,
  footer,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const selected = options.find((o) => o.value === value);
  const displayValue = selected ? selected.label : '';

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = normalize(search);
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, search]);

  React.useEffect(() => {
    if (open && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const handleSelect = (optionValue: string) => {
    const option = options.find((o) => o.value === optionValue);
    if (option?.disabled) return;
    onValueChange(optionValue === value ? '' : optionValue);
    setOpen(false);
    setSearch('');
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key.length === 1)) {
      e.preventDefault();
      setSearch(displayValue);
      setHighlightedIndex(0);
      setOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        break;
      case 'Tab':
        setOpen(false);
        setSearch('');
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setHighlightedIndex(0);
    if (!open) setOpen(true);
  };

  const handleContainerClick = () => {
    if (!open && !disabled) {
      setSearch(displayValue);
      setHighlightedIndex(0);
      setOpen(true);
      inputRef.current?.focus();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
    setSearch('');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn('relative', className)} onClick={handleContainerClick}>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              disabled={disabled}
              placeholder={open ? searchPlaceholder : placeholder}
              value={open ? search : displayValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="pr-16"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              {selected && !open && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="pointer-events-auto text-muted-foreground hover:text-foreground p-1"
                  tabIndex={-1}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </div>
          </div>
        </div>
      </PopoverAnchor>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-[min(300px,40svh)] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            filtered.map((option, index) => (
              <div
                key={option.value}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm select-none',
                  index === highlightedIndex && 'bg-accent',
                  option.disabled && 'pointer-events-none opacity-50',
                )}
              >
                {option.label}
                {value === option.value && <Check className="h-4 w-4 text-primary" />}
              </div>
            ))
          )}
          {footer && (
            <>
              <div className="my-1 h-px bg-border" />
              <div className="p-1">{footer}</div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
