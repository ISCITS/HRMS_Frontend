"use client";

import { useCallback } from "react";

import type { PayslipFormat } from "@/features/payroll/services/payslipService";
import { loadPayrollDocumentFormats, type FNFReportFormat } from "@/features/payroll/utils/payrollDocumentFormat";
import { settingsService } from "@/features/settings/services/settingsService";

export type FNFDocumentFormats = {
  /** F&F reports: our format or Format 1. */
  strFNFReportFormat: FNFReportFormat;
  /** Regular payslips shown with them: our format, Format 1 or Format 3 (Settings > Payroll > Payslip Format). */
  strPayslipFormat: PayslipFormat;
};

/**
 * The formats the F&F module opens documents in, set once in Settings > Payroll (our format by
 * default): F&F reports in the F&F Report Format, regular payslips in the Payslip Format. Nothing is
 * asked on open. objFormatChooser is kept for the pages that render it; it renders nothing.
 */
export function useReportFormatChooser() {
  /** Resolves the configured F&F report format. */
  const chooseFormat = useCallback(async (): Promise<FNFReportFormat | null> => {
    const objFormats = await loadPayrollDocumentFormats(settingsService.getEffectivePayrollDocumentFormat);
    return objFormats.strFNFReportFormat;
  }, []);

  /** Resolves both the F&F report format and the regular payslip format. */
  const chooseFormats = useCallback(async (): Promise<FNFDocumentFormats> => {
    const objFormats = await loadPayrollDocumentFormats(settingsService.getEffectivePayrollDocumentFormat);
    return { strFNFReportFormat: objFormats.strFNFReportFormat, strPayslipFormat: objFormats.strPayslipFormat };
  }, []);

  return { chooseFormat, chooseFormats, objFormatChooser: null };
}
