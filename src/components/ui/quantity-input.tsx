'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

import { Input } from '@/components/ui/input';
import { commitQuantityInputValue, getQuantityInputValue, parseQuantityInputValue } from '@/lib/quantity-input';
import { cn } from '@/lib/utils';

type QuantityInputElement = Pick<HTMLInputElement, 'value'>;
type QuantityInputForm = Pick<HTMLFormElement, 'addEventListener' | 'removeEventListener'>;
type QuantityInputKeyEvent = KeyboardEvent<HTMLInputElement> | Pick<KeyboardEvent<HTMLInputElement>, 'key'>;

function isReactQuantityInputKeyEvent(event: QuantityInputKeyEvent): event is KeyboardEvent<HTMLInputElement> {
  return 'nativeEvent' in event;
}

interface QuantityInputControlOptions {
  getInput: () => QuantityInputElement | null;
  onChange: (value: number) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  min: number;
  max?: number;
}

export function createQuantityInputControl({
  getInput,
  onChange,
  onBlur,
  onKeyDown,
  min,
  max,
}: QuantityInputControlOptions) {
  const commitValue = () => {
    const input = getInput();
    if (!input) return;

    const committedValue = commitQuantityInputValue(input.value, max, min);
    input.value = getQuantityInputValue(committedValue);
    onChange(committedValue);
  };

  return {
    commitValue,
    handleChange(value: string) {
      onChange(parseQuantityInputValue(value));
    },
    handleBlur(value: string) {
      onChange(commitQuantityInputValue(value, max, min));
      onBlur?.();
    },
    handleKeyDown(event: QuantityInputKeyEvent) {
      if (event.key === 'Enter') commitValue();
      if (isReactQuantityInputKeyEvent(event)) onKeyDown?.(event);
    },
    attachFormSubmit(form: QuantityInputForm) {
      form.addEventListener('submit', commitValue, { capture: true });

      return () => {
        form.removeEventListener('submit', commitValue, { capture: true });
      };
    },
  };
}

interface QuantityInputProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'onBlur' | 'type' | 'inputMode' | 'min' | 'max' | 'step'
> {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
}

export const QuantityInput = forwardRef<HTMLInputElement, QuantityInputProps>(function QuantityInput(
  { value, onChange, onBlur, onKeyDown, min = 1, max, placeholder = '1', className, ...props },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;

      if (typeof ref === 'function') {
        ref(node);
        return;
      }

      if (ref) ref.current = node;
    },
    [ref],
  );

  const control = useMemo(
    () =>
      createQuantityInputControl({
        getInput: () => inputRef.current,
        max,
        min,
        onBlur,
        onChange,
        onKeyDown,
      }),
    [max, min, onBlur, onChange, onKeyDown],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    control.handleChange(event.target.value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    control.handleBlur(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    control.handleKeyDown(event);
  };

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form) return;

    return control.attachFormSubmit(form);
  }, [control]);

  return (
    <Input
      ref={setRefs}
      type="text"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      placeholder={placeholder}
      value={getQuantityInputValue(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn('tabular-nums', className)}
      {...props}
    />
  );
});
