'use client';

import { useEffect, useState } from 'react';

export function usePersistedLimit(key: string, defaultValue: number): [number, (value: number) => void] {
  const [limit, setLimit] = useState(defaultValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(key);
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if (!isNaN(parsed)) setLimit(parsed);
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);

  const updateLimit = (value: number) => {
    setLimit(value);
    localStorage.setItem(key, String(value));
  };

  return [limit, updateLimit];
}
