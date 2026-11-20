"use client";

import { createContext, useContext, type ReactNode } from "react";

const RamsLabNavigationContext = createContext(false);

export function RamsLabNavigationProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <RamsLabNavigationContext.Provider value={enabled}>
      {children}
    </RamsLabNavigationContext.Provider>
  );
}

export function useRamsLabNavigation() {
  return useContext(RamsLabNavigationContext);
}
