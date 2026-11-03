"use client";

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { payslipService, type PayslipFormat, type PayslipView } from "@/features/payroll/services/payslipService";
import {
  canUseClientPayslipFormat,
  getPayslipViewChoice,
  loadAllowedPayslipViews,
  NO_PAYSLIP_VIEW_MESSAGE,
  PAYSLIP_FORMAT_OPTIONS,
  PAYSLIP_VIEW_OPTIONS,
} from "@/features/payroll/utils/payslipViewChoice";

type PayslipChooserOptions = {
  /** Offers the Client format (PDF) next to the default one; called when the user picks it. */
  onOpenClientFormat?: () => Promise<void> | void;
};

const CLIENT_FORMAT_CHOICE = "client";

/**
 * Asks which payslip to open - the format (Default / Client PDF, when the screen offers the client
 * format) and, for the default format, Monthly or Detailed (YTD & annual) - offering only the views
 * the user's group holds (Payroll Runs rights "Payslip - Monthly" / "Payslip - Detailed"; the client
 * format is a monthly payslip). With a single choice it opens that one without asking. Render
 * objPayslipViewChooser once on the page.
 */
export function usePayslipViewChooser() {
  const [lstAllowedViews, setLstAllowedViews] = useState<PayslipView[] | null>(null);
  const [blnOpen, setBlnOpen] = useState(false);
  const [blnOfferClientFormat, setBlnOfferClientFormat] = useState(false);
  const [strFormat, setStrFormat] = useState<PayslipFormat>("default");
  const refResolve = useRef<((strChoice: PayslipView | typeof CLIENT_FORMAT_CHOICE | null) => void) | null>(null);

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

  /**
   * Resolves the chosen view, null when the user closes the question - or when they pick the client
   * format, which onOpenClientFormat then opens. Throws when no view is allowed.
   */
  const choosePayslipView = useCallback(async (objOptions: PayslipChooserOptions = {}): Promise<PayslipView | null> => {
    const lstViews = await loadAllowedPayslipViews(payslipService.getAllowedViews);
    setLstAllowedViews(lstViews);
    const blnClientFormat = Boolean(objOptions.onOpenClientFormat);
    const objChoice = getPayslipViewChoice(lstViews, blnClientFormat);
    if (objChoice === "none") {
      throw new Error(NO_PAYSLIP_VIEW_MESSAGE);
    }
    if (objChoice !== "ask") {
      return objChoice.strView;
    }
    refResolve.current?.(null);
    const strChoice = await new Promise<PayslipView | typeof CLIENT_FORMAT_CHOICE | null>((resolve) => {
      refResolve.current = resolve;
      setBlnOfferClientFormat(blnClientFormat && canUseClientPayslipFormat(lstViews));
      setStrFormat("default");
      setBlnOpen(true);
    });
    if (strChoice === CLIENT_FORMAT_CHOICE) {
      await objOptions.onOpenClientFormat?.();
      return null;
    }
    return strChoice;
  }, []);

  function finish(strChoice: PayslipView | typeof CLIENT_FORMAT_CHOICE | null) {
    setBlnOpen(false);
    refResolve.current?.(strChoice);
    refResolve.current = null;
  }

  const objClientOption = PAYSLIP_FORMAT_OPTIONS.find((objOption) => objOption.strFormat === "client");
  const objPayslipViewChooser = (
    <Dialog open={blnOpen} onClose={() => finish(null)} maxWidth="xs" fullWidth data-testid="payslip.view-chooser">
      <DialogTitle sx={{ fontWeight: 800 }}>Open payslip</DialogTitle>
      <DialogContent>
        {blnOfferClientFormat ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              In which format do you want your payslip?
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              color="primary"
              value={strFormat}
              onChange={(_objEvent, strNext: PayslipFormat | null) => strNext && setStrFormat(strNext)}
              sx={{ mb: 2 }}
              data-controlid="payslip.view-chooser.format"
            >
              {PAYSLIP_FORMAT_OPTIONS.map((objOption) => (
                <ToggleButton
                  key={objOption.strFormat}
                  value={objOption.strFormat}
                  sx={{ fontWeight: 700, textTransform: "none" }}
                  data-controlid={`payslip.view-chooser.format.${objOption.strFormat}`}
                >
                  {objOption.strLabel}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </>
        ) : null}
        {blnOfferClientFormat && strFormat === "client" ? (
          <Button
            variant="contained"
            fullWidth
            autoFocus
            onClick={() => finish(CLIENT_FORMAT_CHOICE)}
            sx={{ alignItems: "flex-start", flexDirection: "column", px: 2, py: 1.25, textAlign: "left", textTransform: "none" }}
            data-controlid="payslip.view-chooser.client"
          >
            <Typography component="span" sx={{ fontWeight: 800 }}>Open client format (PDF)</Typography>
            <Typography component="span" variant="caption" sx={{ opacity: 0.85 }}>{objClientOption?.strDescription}</Typography>
          </Button>
        ) : (
          <>
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
          </>
        )}
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
