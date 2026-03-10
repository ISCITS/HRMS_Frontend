"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { getTheme, ThemePreset } from "@/lib/theme";

type ThemeModeContextValue = {
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return context;
}

type ThemeModeProviderProps = {
  children: ReactNode;
};

// Provides global MUI theme mode/preset state to the entire app tree.
export default function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  // Functional responsibility:
  // - Own global theme state (mode + preset) and expose it via context.
  // Inputs:
  // - children UI tree to be wrapped.
  // Output:
  // - Renders ThemeProvider + CssBaseline with computed MUI theme.
  // Failure behavior:
  // - If consumer uses useThemeMode outside provider, hook throws explicit error.
  const [preset, setPreset] = useState<ThemePreset>("ocean");

  const value = useMemo(
    () => ({
      preset,
      setPreset
    }),
    [preset]
  );

  const theme = useMemo(() => getTheme("light", preset), [preset]);

  return (
    <ThemeModeContext.Provider value={value}>
      {/* CssBaseline normalizes default browser styles across pages */}
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
