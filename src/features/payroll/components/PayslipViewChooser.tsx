"use client";

import { useCallback, useEffect, useState } from "react";

import { payslipService, type PayslipDocumentView, type PayslipView } from "@/features/payroll/services/payslipService";
import { loadPayrollDocumentFormats, resolveConfiguredPayslipView } from "@/features/payroll/utils/payrollDocumentFormat";
import { loadAllowedPayslipViews, NO_PAYSLIP_VIEW_MESSAGE } from "@/features/payroll/utils/payslipViewChoice";
import { settingsService } from "@/features/settings/services/settingsService";

type PayslipChooserOptions = {
  /** The screen can open the client format (resolves "client" when that is the configured format). */
  blnClientFormat?: boolean;
};

/**
 * Which payslip to open: the format and view set once in Settings > Payroll (our format, Monthly,
 * by default), limited to the views the user's group holds (Payroll Runs rights "Payslip - Monthly"
 * / "Payslip - Detailed"; the client format is a monthly payslip). Nothing is asked on open.
 * objPayslipViewChooser is kept for the pages that render it; it renders nothing.
 */
export function usePayslipViewChooser() {
  const [lstAllowedViews, setLstAllowedViews] = useState<PayslipView[] | null>(null);

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
   * Resolves the configured payslip - "monthly", "detailed" or (client format) "client". Throws when
   * no view is allowed.
   */
  const choosePayslipView = useCallback(async (objOptions: PayslipChooserOptions = {}): Promise<PayslipDocumentView | null> => {
    const [lstViews, objFormats] = await Promise.all([
      loadAllowedPayslipViews(payslipService.getAllowedViews),
      loadPayrollDocumentFormats(settingsService.getEffectivePayrollDocumentFormat),
    ]);
    setLstAllowedViews(lstViews);
    const strView = resolveConfiguredPayslipView(objFormats, lstViews, Boolean(objOptions.blnClientFormat));
    if (strView === "none") {
      throw new Error(NO_PAYSLIP_VIEW_MESSAGE);
    }
    return strView;
  }, []);

  return {
    choosePayslipView,
    /** Both views allowed: the payslip may offer its Monthly / Detailed switch. */
    blnCanSwitchView: (lstAllowedViews?.length ?? 0) > 1,
    lstAllowedViews,
    objPayslipViewChooser: null,
  };
}
