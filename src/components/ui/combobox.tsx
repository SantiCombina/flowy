'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
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
}

function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const selected = options.find((o) => o.value === value);
  const filter = (val: string, search: string) => (normalize(val).includes(normalize(search)) ? 1 : 0);

  const renderItems = () =>
    options.map((option) => (
      <CommandItem
        key={option.value}
        value={option.label}
        disabled={option.disabled}
        onSelect={() => {
          if (option.disabled) return;
          onValueChange(option.value === value ? '' : option.value);
          setOpen(false);
        }}
      >
        {option.label}
        <Check className={cn('ml-auto h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
      </CommandItem>
    ));

  if (isMobile) {
    if (open) {
      return (
        <Command filter={filter} className="border rounded-md">
          <div className="flex items-center border-b px-1">
            <CommandInput
              placeholder={searchPlaceholder}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CommandList className="max-h-48 overflow-y-auto">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>{renderItems()}</CommandGroup>
          </CommandList>
        </Command>
      );
    }

    return (
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          'w-full justify-between overflow-hidden font-normal',
          !selected && 'text-muted-foreground',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between overflow-hidden font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start" collisionPadding={16}>
        <Command filter={filter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[min(300px,40svh)]">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>{renderItems()}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
