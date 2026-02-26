'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function formatDisplay(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '');
  const commaIndex = cleaned.indexOf(',');

  let intPart: string;
  let decPart: string | null = null;

  if (commaIndex === -1) {
    intPart = cleaned;
  } else {
    intPart = cleaned.slice(0, commaIndex);
    decPart = cleaned.slice(commaIndex + 1, commaIndex + 3);
  }

  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+/, '') || '0';
  }

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decPart !== null) {
    return `${formattedInt},${decPart}`;
  }
  return formattedInt;
}

function parseToNumber(display: string): number {
  const normalized = display.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function numberToDisplay(value: number): string {
  if (!value) return '';
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function PriceInput({ value, onChange, onBlur, placeholder = '0,00', className }: PriceInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const displayValue = isFocused ? localValue : numberToDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDisplay(e.target.value);
    setLocalValue(formatted);
    onChange(parseToNumber(formatted));
  };

  const handleFocus = () => {
    setLocalValue(numberToDisplay(value));
    setIsFocused(true);
  };

  const handleBlur = () => {
    const num = parseToNumber(localValue);
    onChange(num);
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn('tabular-nums', className)}
    />
  );
}
