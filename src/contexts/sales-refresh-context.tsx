'use client';

import { createContext, useContext, useState } from 'react';

interface SalesRefreshContextValue {
  refreshCount: number;
  triggerRefresh: () => void;
}

const SalesRefreshContext = createContext<SalesRefreshContextValue | null>(null);

export function SalesRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshCount, setRefreshCount] = useState(0);
  return (
    <SalesRefreshContext.Provider value={{ refreshCount, triggerRefresh: () => setRefreshCount((c) => c + 1) }}>
      {children}
    </SalesRefreshContext.Provider>
  );
}

export function useSalesRefresh() {
  const ctx = useContext(SalesRefreshContext);
  if (!ctx) throw new Error('useSalesRefresh must be used within SalesRefreshProvider');
  return ctx;
}
