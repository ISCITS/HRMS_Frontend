"use client";

import { createContext, useContext } from "react";
import type { CurrentUserContext, DashboardResponse } from "@/models/AuthModels";

export const DashboardHeaderModeContext = createContext<((blnEss: boolean) => void) | null>(null);
export const DashboardContentLoadingContext = createContext<((blnLoading: boolean) => void) | null>(null);
export const DashboardBootstrapDataContext = createContext<{
  objUserContext: CurrentUserContext | null;
  objDashboard: DashboardResponse | null;
} | null>(null);

export function useSetEssDashboardHeaderMode() {
  return useContext(DashboardHeaderModeContext);
}

export function useSetDashboardContentLoading() {
  return useContext(DashboardContentLoadingContext);
}

export function useDashboardBootstrapData() {
  return useContext(DashboardBootstrapDataContext);
}
