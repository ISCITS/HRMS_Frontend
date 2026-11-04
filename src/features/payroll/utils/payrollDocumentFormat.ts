import type { PayslipDocumentView, PayslipFormat, PayslipView } from "@/features/payroll/services/payslipService";

/**
 * Settings > Payroll: the formats every screen opens a payslip / F&F report in, set once instead of
 * asked on each open. Our own format (Monthly payslip) is the default.
 */
export type PayrollDocumentFormats = {
  strPayslipFormat: PayslipFormat;
  strPayslipView: PayslipView;
  strFNFReportFormat: PayslipFormat;
};

export const DEFAULT_PAYROLL_DOCUMENT_FORMATS: PayrollDocumentFormats = {
  strPayslipFormat: "default",
  strPayslipView: "monthly",
  strFNFReportFormat: "default",
};

function pickFormat(objValue: unknown): PayslipFormat {
  return objValue === "client" ? "client" : "default";
}

/** Anything not recognised falls back to our format / Monthly. */
export function normalizePayrollDocumentFormats(objValue: Partial<Record<keyof PayrollDocumentFormats, unknown>> | null | undefined): PayrollDocumentFormats {
  return {
    strPayslipFormat: pickFormat(objValue?.strPayslipFormat),
    strPayslipView: objValue?.strPayslipView === "detailed" ? "detailed" : "monthly",
    strFNFReportFormat: pickFormat(objValue?.strFNFReportFormat),
  };
}

/**
 * The payslip a screen opens, from the configured format and view and the views the user's group
 * holds ("Payslip - Monthly" / "Payslip - Detailed"):
 * - no view allowed -> "none";
 * - client format (the screen offers it, and Monthly is allowed - it is a monthly payslip) -> "client";
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
  if (blnClientFormat && objFormats.strPayslipFormat === "client" && lstAllowed.includes("monthly")) {
    return "client";
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
