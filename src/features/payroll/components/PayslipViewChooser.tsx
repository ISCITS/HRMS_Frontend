"use client";

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { payslipService, type PayslipView } from "@/features/payroll/services/payslipService";
import {
  getPayslipViewChoice,
  loadAllowedPayslipViews,
  NO_PAYSLIP_VIEW_MESSAGE,
  PAYSLIP_VIEW_OPTIONS,
} from "@/features/payroll/utils/payslipViewChoice";

/**
 * Asks which payslip to open - Monthly or Detailed (YTD & annual) - offering only the views the
 * user's group holds (Payroll Runs rights "Payslip - Monthly" / "Payslip - Detailed"). With one
 * view it opens that one without asking. Render objPayslipViewChooser once on the page.
 */
export function usePayslipViewChooser() {
  const [lstAllowedViews, setLstAllowedViews] = useState<PayslipView[] | null>(null);
  const [blnOpen, setBlnOpen] = useState(false);
  const refResolve = useRef<((strView: PayslipView | null) => void) | null>(null);

  useEffect(() => {
    let blnCancelled = false;
    loadAllowedPayslipViews(payslipService.getAllowedViews)
      .then((lstViews) => {
        if (!blnCancelled) setLstAllowedViews(lstViews);
      })
      .catch(() => undefined);
    return () => {
      blnCancelled = true;
    };
  }, []);

  /** Resolves the chosen view, null when the user closes the question; throws when no view is allowed. */
  const choosePayslipView = useCallback(async (): Promise<PayslipView | null> => {
    const lstViews = await loadAllowedPayslipViews(payslipService.getAllowedViews);
    setLstAllowedViews(lstViews);
    const objChoice = getPayslipViewChoice(lstViews);
    if (objChoice === "none") {
      throw new Error(NO_PAYSLIP_VIEW_MESSAGE);
    }
    if (objChoice !== "ask") {
      return objChoice.strView;
    }
    refResolve.current?.(null);
    return new Promise<PayslipView | null>((resolve) => {
      refResolve.current = resolve;
      setBlnOpen(true);
    });
  }, []);

  function finish(strView: PayslipView | null) {
    setBlnOpen(false);
    refResolve.current?.(strView);
    refResolve.current = null;
  }

  const objPayslipViewChooser = (
    <Dialog open={blnOpen} onClose={() => finish(null)} maxWidth="xs" fullWidth data-testid="payslip.view-chooser">
      <DialogTitle sx={{ fontWeight: 800 }}>Open payslip</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Which payslip do you want to see?
        </Typography>
        <Box sx={{ display: "grid", gap: 1 }}>
          {PAYSLIP_VIEW_OPTIONS.filter((objOption) => lstAllowedViews?.includes(objOption.strView)).map((objOption, intIndex) => (
            <Button
              key={objOption.strView}
              variant={intIndex === 0 ? "contained" : "outlined"}
              autoFocus={intIndex === 0}
              onClick={() => finish(objOption.strView)}
              sx={{ alignItems: "flex-start", flexDirection: "column", px: 2, py: 1.25, textAlign: "left", textTransform: "none" }}
              data-controlid={`payslip.view-chooser.${objOption.strView}`}
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

  return {
    choosePayslipView,
    /** Both views allowed: the payslip may offer its Monthly / Detailed switch. */
    blnCanSwitchView: (lstAllowedViews?.length ?? 0) > 1,
    lstAllowedViews,
    objPayslipViewChooser,
  };
}
