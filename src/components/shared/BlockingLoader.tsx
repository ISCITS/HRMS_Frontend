"use client";

import { Backdrop, CircularProgress, Stack, Typography } from "@mui/material";

type BlockingLoaderProps = {
  blnOpen: boolean;
  strLabel?: string;
  intZIndex?: number;
};

export default function BlockingLoader({
  blnOpen,
  strLabel = "Loading...",
  intZIndex,
}: BlockingLoaderProps) {
  return (
    <Backdrop
      open={blnOpen}
      sx={{
        backgroundColor: "rgba(15, 23, 42, 0.34)",
        backdropFilter: "blur(4px)",
        zIndex: intZIndex,
      }}
    >
      <Stack
        spacing={1.25}
        alignItems="center"
        sx={{
          px: 1.5,
          textAlign: "center",
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
            fontWeight: 800,
            color: "#e2e8f0",
            letterSpacing: "-0.02em",
            textShadow: "0 2px 12px rgba(15, 23, 42, 0.45)",
          }}
        >
          {strLabel}
        </Typography>
      </Stack>
    </Backdrop>
  );
}
