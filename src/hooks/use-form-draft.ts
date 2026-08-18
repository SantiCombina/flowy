'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

interface UseFormDraftOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  storageKey: string;
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseFormDraftReturn {
  hasDraft: boolean;
  clearDraft: () => void;
}

export function useFormDraft<T extends FieldValues>({
  form,
  storageKey,
  enabled = true,
  debounceMs = 400,
}: UseFormDraftOptions<T>): UseFormDraftReturn {
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed !== null && typeof parsed === 'object';
    } catch {
      return false;
    }
  });
  const hasHydratedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {}
    }
    setHasDraft(false);
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        if (parsed && typeof parsed === 'object') {
          form.reset(parsed);
        }
      }
    } catch {}
    hasHydratedRef.current = true;
  }, [enabled, form, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = form.watch((value) => {
      if (!hasHydratedRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(value));
          setHasDraft(true);
        } catch {}
      }, debounceMs);
    });
    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, form, storageKey, debounceMs]);

  return { hasDraft, clearDraft };
}
