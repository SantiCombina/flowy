'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  min?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  min,
  step,
  disabled,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const displayValue = isFocused ? localValue : value === 0 ? '' : String(value);

  return (
    <Input
      type="number"
      min={min}
      step={step}
      placeholder={placeholder}
      className={cn('tabular-nums', className)}
      value={displayValue}
      disabled={disabled}
      onFocus={() => {
        setLocalValue(value === 0 ? '' : String(value));
        setIsFocused(true);
      }}
      onChange={(e) => {
        setLocalValue(e.target.value);
        const parsed = e.target.valueAsNumber;
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      onBlur={() => {
        setIsFocused(false);
        onBlur?.();
      }}
    />
  );
}
