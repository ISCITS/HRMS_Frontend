import { isPayslipLayoutView, type PayslipDocumentView, type PayslipFormat, type PayslipView } from "@/features/payroll/services/payslipService";

/** F&F reports have our format and Format 1 only. */
export type FNFReportFormat = "default" | "client";

/**
 * Settings > Payroll: the formats every screen opens a payslip / F&F report in, set once instead of
 * asked on each open. Our own format (Monthly payslip) is the default.
 */
export type PayrollDocumentFormats = {
  strPayslipFormat: PayslipFormat;
  strPayslipView: PayslipView;
  strFNFReportFormat: FNFReportFormat;
};

export const DEFAULT_PAYROLL_DOCUMENT_FORMATS: PayrollDocumentFormats = {
  strPayslipFormat: "default",
  strPayslipView: "monthly",
  strFNFReportFormat: "default",
};

/** Anything not recognised falls back to our format / Monthly. */
export function normalizePayrollDocumentFormats(objValue: Partial<Record<keyof PayrollDocumentFormats, unknown>> | null | undefined): PayrollDocumentFormats {
  const objPayslipFormat = objValue?.strPayslipFormat;
  return {
    strPayslipFormat: isPayslipLayoutView(objPayslipFormat) ? objPayslipFormat : "default",
    strPayslipView: objValue?.strPayslipView === "detailed" ? "detailed" : "monthly",
    strFNFReportFormat: objValue?.strFNFReportFormat === "client" ? "client" : "default",
  };
}

/**
 * The payslip a screen opens, from the configured format and view and the views the user's group
 * holds ("Payslip - Monthly" / "Payslip - Detailed"):
 * - no view allowed -> "none";
 * - Format 1 / Format 3 (the screen offers layouts, and Monthly is allowed - they are monthly
 *   payslips) -> "client" / "format3";
 * - otherwise the configured view when allowed, else the view the user does hold.
 */
export function resolveConfiguredPayslipView(
  objFormats: PayrollDocumentFormats,
  lstAllowedViews: PayslipView[],
  blnClientFormat = true,
): PayslipDocumentView | "none" {
  const lstAllowed = (["monthly", "detailed"] as PayslipView[]).filter((strView) => lstAllowedViews.includes(strView));
  if (lstAllowed.length === 0) {
    return "none";
  }
  if (blnClientFormat && isPayslipLayoutView(objFormats.strPayslipFormat) && lstAllowed.includes("monthly")) {
    return objFormats.strPayslipFormat;
  }
  return lstAllowed.includes(objFormats.strPayslipView) ? objFormats.strPayslipView : lstAllowed[0];
}

let objFormatsRequest: Promise<PayrollDocumentFormats> | null = null;

/**
 * The configured formats, fetched once per page load. A failed fetch opens our format (and is
 * retried next time) so a payslip never fails to open over this setting.
 */
export function loadPayrollDocumentFormats(fnLoad: () => Promise<unknown>): Promise<PayrollDocumentFormats> {
  if (!objFormatsRequest) {
    objFormatsRequest = fnLoad()
      .then((objValue) => normalizePayrollDocumentFormats(objValue as Partial<PayrollDocumentFormats>))
      .catch(() => {
        objFormatsRequest = null;
        return DEFAULT_PAYROLL_DOCUMENT_FORMATS;
      });
  }
  return objFormatsRequest;
}

/** Forget the fetched formats (after Settings saves new ones). */
export function resetPayrollDocumentFormats() {
  objFormatsRequest = null;
}
