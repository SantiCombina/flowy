'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext } from 'react';

interface SalesRefreshContextValue {
  triggerRefresh: () => void;
}

const SalesRefreshContext = createContext<SalesRefreshContextValue | null>(null);

export function SalesRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <SalesRefreshContext.Provider value={{ triggerRefresh: () => router.refresh() }}>
      {children}
    </SalesRefreshContext.Provider>
  );
}

export function useSalesRefresh() {
  const ctx = useContext(SalesRefreshContext);
  if (!ctx) throw new Error('useSalesRefresh must be used within SalesRefreshProvider');
  return ctx;
}
