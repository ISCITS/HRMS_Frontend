"use client";

import { createContext, useContext } from "react";

export const DashboardHeaderModeContext = createContext<((blnEss: boolean) => void) | null>(null);

export function useSetEssDashboardHeaderMode() {
  return useContext(DashboardHeaderModeContext);
}
