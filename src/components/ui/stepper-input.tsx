'use client';

import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { QuantityInput } from '@/components/ui/quantity-input';
import { cn } from '@/lib/utils';

export interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
  id?: string;
}

export function StepperInput({
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled,
  className,
  size = 'default',
  id,
}: StepperInputProps) {
  const minimum = min ?? 1;
  const canDecrease = !disabled && value > minimum;
  const canIncrease = !disabled && (max === undefined || value < max);
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const inputHeight = size === 'sm' ? 'h-8' : 'h-10';

  return (
    <div
      className={cn(
        'flex items-stretch rounded-xl has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px]',
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(Math.max(minimum, value - 1))}
        disabled={!canDecrease}
        aria-label="Disminuir cantidad"
        className={cn('rounded-r-none border-r-0', buttonSize)}
      >
        <Minus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </Button>
      <QuantityInput
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        max={max}
        min={min}
        disabled={disabled}
        placeholder=""
        className={cn(
          'rounded-none border-x-0 text-center focus-visible:border-input focus-visible:ring-0',
          inputHeight,
        )}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
        disabled={!canIncrease}
        aria-label="Aumentar cantidad"
        className={cn('rounded-l-none border-l-0', buttonSize)}
      >
        <Plus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </Button>
    </div>
  );
}
