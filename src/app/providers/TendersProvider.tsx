'use client';

import { createContext, useContext, ReactNode } from 'react';

const TendersContext = createContext<boolean>(false);

export function useTendersPage() {
  return useContext(TendersContext);
}

export function TendersProvider({ children }: { children: ReactNode }) {
  return (
    <TendersContext.Provider value={true}>
      {children}
    </TendersContext.Provider>
  );
}
