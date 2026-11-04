"use client";

import { useCallback } from "react";

import type { PayslipFormat } from "@/features/payroll/services/payslipService";
import { loadPayrollDocumentFormats } from "@/features/payroll/utils/payrollDocumentFormat";
import { settingsService } from "@/features/settings/services/settingsService";

/**
 * The format F&F reports (and the payslips shown with them) open in: our format or the client
 * format, set once in Settings > Payroll (our format by default). Nothing is asked on open.
 * objFormatChooser is kept for the pages that render it; it renders nothing.
 */
export function useReportFormatChooser() {
  /** Resolves the configured F&F report format. */
  const chooseFormat = useCallback(async (): Promise<PayslipFormat | null> => {
    const objFormats = await loadPayrollDocumentFormats(settingsService.getEffectivePayrollDocumentFormat);
    return objFormats.strFNFReportFormat;
  }, []);

  return { chooseFormat, objFormatChooser: null };
}
