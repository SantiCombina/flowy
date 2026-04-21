'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardOffset } from '@/hooks/use-keyboard-offset';
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
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const keyboardOffset = useKeyboardOffset();

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
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
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
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-xl p-0 flex flex-col"
          style={{
            bottom: keyboardOffset,
            maxHeight: `min(60dvh, calc(100dvh - ${keyboardOffset}px - 48px))`,
          }}
          onOpenAutoFocus={() => undefined}
        >
          <Command filter={filter}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="flex-1 overflow-y-auto min-h-0">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>{renderItems()}</CommandGroup>
            </CommandList>
          </Command>
        </SheetContent>
      </Sheet>
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
