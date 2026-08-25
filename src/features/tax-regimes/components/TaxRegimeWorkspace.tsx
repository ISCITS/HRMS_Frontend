"use client";

import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

import styles from "@/components/master/MasterScreen.module.css";

export type TaxRegimeSaveBridge = {
  strLabel: string;
  blnVisible: boolean;
  blnDisabled: boolean;
  fnSave: () => void;
} | null;

export const objTaxRegimeCommonTableSx: SxProps<Theme> = {
  p: 0,
  minHeight: 0,
  overflow: "hidden",
  background: "var(--app-surface-color)",
  border: "1px solid var(--app-card-border-color)",
  borderRadius: "var(--app-card-radius)",
  boxShadow: "var(--app-shadow-soft)",
};

type TaxRegimeWorkspaceHeaderProps = {
  strTitle: string;
  strSubtitle?: string;
  nodeActions?: ReactNode;
};

export function TaxRegimeWorkspaceHeader({ strTitle, strSubtitle, nodeActions }: TaxRegimeWorkspaceHeaderProps) {
  return (
    <Paper className={styles.controlsCard} elevation={0}>
      <Box className={styles.controlsHeader}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" className={styles.title}>{strTitle}</Typography>
          {strSubtitle ? (
            <Typography sx={{ color: "#64748b", fontSize: "0.875rem", mt: 0.5 }}>{strSubtitle}</Typography>
          ) : null}
        </Box>
        {nodeActions ? <Box className={styles.headerActions}>{nodeActions}</Box> : null}
      </Box>
    </Paper>
  );
}

export function TaxRegimeActionGroup({ children }: { children: ReactNode }) {
  return <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">{children}</Stack>;
}
