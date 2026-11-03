"use client";

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useCallback, useRef, useState } from "react";

import type { PayslipFormat } from "@/features/payroll/services/payslipService";

export const FNF_REPORT_FORMAT_OPTIONS: Array<{ strFormat: PayslipFormat; strLabel: string; strDescription: string }> = [
  { strFormat: "default", strLabel: "Our format", strDescription: "The application's F&F report with this settlement's earnings, deductions and net amount." },
  {
    strFormat: "client",
    strLabel: "Client format",
    strDescription: "The client's Full and Final Settlement Report with sign-off and receipt. Download saves it as a PDF.",
  },
];

/**
 * Asks in which format to open an F&F report (or the payslips shown with it): our format or the
 * client format. Render objFormatChooser once on the page.
 */
export function useReportFormatChooser(strTitle = "Open F&F report") {
  const [blnOpen, setBlnOpen] = useState(false);
  const [strDialogTitle, setStrDialogTitle] = useState(strTitle);
  const refResolve = useRef<((strFormat: PayslipFormat | null) => void) | null>(null);

  /** Resolves the chosen format, or null when the user closes the question. */
  const chooseFormat = useCallback((strAskTitle?: string): Promise<PayslipFormat | null> => {
    refResolve.current?.(null);
    return new Promise<PayslipFormat | null>((resolve) => {
      refResolve.current = resolve;
      setStrDialogTitle(strAskTitle || strTitle);
      setBlnOpen(true);
    });
  }, [strTitle]);

  function finish(strFormat: PayslipFormat | null) {
    setBlnOpen(false);
    refResolve.current?.(strFormat);
    refResolve.current = null;
  }

  const objFormatChooser = (
    <Dialog open={blnOpen} onClose={() => finish(null)} maxWidth="xs" fullWidth data-testid="payroll.fnf.format-chooser">
      <DialogTitle sx={{ fontWeight: 800 }}>{strDialogTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          In which format do you want it?
        </Typography>
        <Box sx={{ display: "grid", gap: 1 }}>
          {FNF_REPORT_FORMAT_OPTIONS.map((objOption, intIndex) => (
            <Button
              key={objOption.strFormat}
              variant={intIndex === 0 ? "contained" : "outlined"}
              autoFocus={intIndex === 0}
              onClick={() => finish(objOption.strFormat)}
              sx={{ alignItems: "flex-start", flexDirection: "column", px: 2, py: 1.25, textAlign: "left", textTransform: "none" }}
              data-controlid={`payroll.fnf.format-chooser.${objOption.strFormat}`}
            >
              <Typography component="span" sx={{ fontWeight: 800 }}>{objOption.strLabel}</Typography>
              <Typography component="span" variant="caption" sx={{ opacity: 0.85 }}>{objOption.strDescription}</Typography>
            </Button>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => finish(null)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );

  return { chooseFormat, objFormatChooser };
}
