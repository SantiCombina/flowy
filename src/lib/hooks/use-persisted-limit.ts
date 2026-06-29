'use client';

import { useEffect, useState } from 'react';

import { DEFAULT_ITEMS_PER_PAGE, ITEMS_PER_PAGE_OPTIONS, type ItemsPerPageOption } from '@/lib/constants/table-columns';

export function usePersistedLimit(
  key: string,
  defaultValue: ItemsPerPageOption = DEFAULT_ITEMS_PER_PAGE,
): [ItemsPerPageOption, (value: ItemsPerPageOption) => void] {
  const [limit, setLimit] = useState<ItemsPerPageOption>(defaultValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(key);
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if (!isNaN(parsed) && ITEMS_PER_PAGE_OPTIONS.includes(parsed as ItemsPerPageOption)) {
        setLimit(parsed as ItemsPerPageOption);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);

  const updateLimit = (value: ItemsPerPageOption) => {
    setLimit(value);
    localStorage.setItem(key, String(value));
  };

  return [limit, updateLimit];
}
