'use client';

import { createContext, useContext } from 'react';

interface UserContextValue {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'seller';
  businessName?: string | null;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: React.ReactNode;
  user: UserContextValue;
}

export function UserProvider({ children, user }: UserProviderProps) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}

export function useUserOptional() {
  return useContext(UserContext);
}
