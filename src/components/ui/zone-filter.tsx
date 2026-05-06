'use client';

import { Check, Settings2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ZoneFilterProps {
  zones: { id: number; name: string }[];
  value: string;
  onChange: (value: string) => void;
  onManageZones: () => void;
}

export function ZoneFilter({ zones, value, onChange, onManageZones }: ZoneFilterProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedZone = zones.find((z) => String(z.id) === value);
  const selectedLabel = selectedZone?.name ?? 'Zona';

  const handleSelect = (id: string) => {
    onChange(id === value ? '' : id);
    if (!isMobile) setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    if (!isMobile) setOpen(false);
  };

  const handleManage = () => {
    setOpen(false);
    onManageZones();
  };

  const trigger = (
    <Button variant="outline" className="w-28 sm:w-44 justify-between overflow-hidden font-normal">
      <span className="min-w-0 truncate">{selectedLabel}</span>
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-xl p-0 gap-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Filtrar por zona</SheetTitle>
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Zona</p>
            </div>
            <div className="pb-2">
              <Button
                variant="ghost"
                onClick={handleClear}
                className={cn(
                  'flex w-full items-center gap-4 px-4 py-4 text-left text-base transition-colors active:bg-muted h-auto justify-start rounded-none',
                  !value && 'font-medium',
                )}
              >
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    !value ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                  )}
                >
                  {!value && <Check className="h-3 w-3" />}
                </div>
                Todas
              </Button>
              {zones.map((zone) => {
                const isSelected = String(zone.id) === value;
                return (
                  <Button
                    key={zone.id}
                    variant="ghost"
                    onClick={() => handleSelect(String(zone.id))}
                    className={cn(
                      'flex w-full items-center gap-4 px-4 py-4 text-left text-base transition-colors active:bg-muted h-auto justify-start rounded-none',
                      isSelected && 'font-medium',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    {zone.name}
                  </Button>
                );
              })}
            </div>
            <div className="border-t px-2 py-1">
              <Button
                variant="ghost"
                onClick={handleManage}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-primary hover:text-accent-foreground h-auto justify-start rounded-lg"
              >
                <Settings2 className="h-4 w-4" />
                Gestionar zonas
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={handleClear} className={cn(!value && 'bg-accent')}>
          Todas
        </DropdownMenuItem>
        {zones.map((zone) => {
          const isSelected = String(zone.id) === value;
          return (
            <DropdownMenuItem
              key={zone.id}
              onClick={() => handleSelect(String(zone.id))}
              className={cn(isSelected && 'bg-accent')}
            >
              {zone.name}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManage} className="text-primary">
          <Settings2 className="mr-2 h-4 w-4" />
          Gestionar zonas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
