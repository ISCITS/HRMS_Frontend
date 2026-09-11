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
        // A faint scrim, never fully transparent: this element captures pointer events, and an
        // invisible blocker makes controls silently stop responding with nothing to explain why.
        background: "rgba(15, 23, 42, 0.08)",
        // This overlay is portalled INSIDE the content viewport, so it covers the page - never a
        // dialog. Callers pass values above MUI's modal layer (1400 vs 1300) meaning to sit above
        // page content; taken literally that also paints it over any open dialog and swallows
        // every click on it. Clamp below the modal layer so a modal always stays reachable.
        zIndex: (objTheme) =>
          Math.min(intZIndex ?? objTheme.zIndex.modal - 1, objTheme.zIndex.modal - 1),
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
      // A faint scrim rather than a transparent one. Callers place this above the modal layer
      // (z-index 1400 vs MUI's 1300 for Dialog), so a fully transparent backdrop reads as a normal
      // interactive screen while silently swallowing every click - controls simply stop responding
      // with nothing on screen to explain why. Blocking must always be visible.
      sx={{
        background: "rgba(15, 23, 42, 0.08)",
        // Same reasoning as the portalled overlay: never above the modal layer, so an open dialog
        // is always reachable.
        zIndex: (objTheme) =>
          Math.min(intZIndex ?? objTheme.zIndex.modal - 1, objTheme.zIndex.modal - 1),
      }}
    >
      {objSpinnerContent}
    </Backdrop>
  );
}
