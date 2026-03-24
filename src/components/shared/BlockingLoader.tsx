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
        color: "#fff",
        backgroundColor: "rgba(15, 23, 42, 0.28)",
        zIndex: intZIndex,
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <CircularProgress color="inherit" />
        <Typography sx={{ fontWeight: 700 }}>{strLabel}</Typography>
      </Stack>
    </Backdrop>
  );
}
