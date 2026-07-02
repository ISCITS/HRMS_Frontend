"use client";

import { createContext, type ReactNode, useContext } from "react";
import { Backdrop, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { createPortal } from "react-dom";

type BlockingLoaderProps = {
  blnOpen: boolean;
  strLabel?: string;
  intZIndex?: number;
  blnLocal?: boolean;
};

type BlockingLoaderViewportContextValue = {
  getViewportElement: () => HTMLElement | null;
};

const objBlockingLoaderViewportContext = createContext<BlockingLoaderViewportContextValue | null>(null);

type BlockingLoaderViewportProviderProps = {
  children: ReactNode;
  getViewportElement: () => HTMLElement | null;
};

export function BlockingLoaderViewportProvider({
  children,
  getViewportElement,
}: BlockingLoaderViewportProviderProps) {
  return (
    <objBlockingLoaderViewportContext.Provider value={{ getViewportElement }}>
      {children}
    </objBlockingLoaderViewportContext.Provider>
  );
}

export default function BlockingLoader({
  blnOpen,
  strLabel = "Loading...",
  intZIndex,
  blnLocal = false,
}: BlockingLoaderProps) {
  const objViewportContext = useContext(objBlockingLoaderViewportContext);
  const objSpinnerContent = (
    <Stack
      spacing={1.5}
      alignItems="center"
      sx={{
        px: 2,
        py: 1.5,
        textAlign: "center",
        borderRadius: "20px",
      }}
    >
      <CircularProgress
        size={36}
        thickness={4.4}
        sx={{
          color: "#2563eb",
        }}
      />
      <Typography
        sx={{
          fontWeight: 500,
          color: "#5b7497",
          fontSize: "1rem",
        }}
      >
        {strLabel}
      </Typography>
    </Stack>
  );

  const objLocalOverlay = (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "transparent",
        zIndex: (objTheme) => intZIndex ?? (objTheme.zIndex.modal + 1),
        pointerEvents: "auto",
      }}
    >
      {objSpinnerContent}
    </Box>
  );

  if (blnLocal || objViewportContext) {
    if (!blnOpen) {
      return null;
    }

    const objViewportElement = objViewportContext?.getViewportElement() ?? null;

    if (objViewportElement) {
      return createPortal(objLocalOverlay, objViewportElement);
    }

    if (blnLocal) {
      return objLocalOverlay;
    }
  }

  return (
    <Backdrop
      open={blnOpen}
      sx={{
        background: "transparent",
        zIndex: (objTheme) => intZIndex ?? (objTheme.zIndex.modal + 1),
      }}
    >
      {objSpinnerContent}
    </Backdrop>
  );
}
