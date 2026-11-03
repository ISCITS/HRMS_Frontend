import type { PayslipDocumentView, PayslipFormat, PayslipView } from "@/features/payroll/services/payslipService";

export const PAYSLIP_FORMAT_OPTIONS: Array<{ strFormat: PayslipFormat; strLabel: string; strDescription: string }> = [
  { strFormat: "default", strLabel: "Default format", strDescription: "The application's payslip, monthly or with year-to-date figures." },
  {
    strFormat: "client",
    strLabel: "Client format",
    strDescription: "The client's payslip layout: each head with rate, current, arrears and adjustment. Download saves it as a PDF.",
  },
];

/**
 * The page to fetch for the payslip tab: with both views allowed the default format comes as the
 * detailed payslip, so the tab's own Monthly / Detailed switch works; the client format as chosen.
 */
export function getPayslipTabRequestView(strView: PayslipDocumentView, blnCanSwitchView: boolean): PayslipDocumentView {
  return strView !== "client" && blnCanSwitchView ? "detailed" : strView;
}

/** The Monthly / Detailed switch above an on-screen payslip: the default format's views only. */
export function getPayslipSwitchView(strView: PayslipDocumentView | null | undefined, blnCanSwitchView: boolean): PayslipView | undefined {
  return blnCanSwitchView && strView && strView !== "client" ? strView : undefined;
}

/** The client format is a monthly payslip, so it is offered with the Monthly view right. */
export function canUseClientPayslipFormat(lstViews: PayslipView[]) {
  return lstViews.includes("monthly");
}

export const PAYSLIP_VIEW_OPTIONS: Array<{ strView: PayslipView; strLabel: string; strDescription: string }> = [
  { strView: "monthly", strLabel: "Monthly", strDescription: "This month's earnings, deductions, net pay and attendance." },
  {
    strView: "detailed",
    strLabel: "Detailed (YTD & annual)",
    strDescription: "Adds year-to-date totals and the annual tax summary (tax for the year, balance tax, months left).",
  },
];

export const NO_PAYSLIP_VIEW_MESSAGE =
  "Your user group has no payslip view right. Ask an administrator to grant \"Payslip - Monthly\" or \"Payslip - Detailed\" under Payroll Runs in User Group Rights.";

/**
 * No allowed view -> "none"; one -> open it straight away; both -> ask the user. When the screen
 * offers the client format too (blnClientFormat) and it is allowed, there is always a choice to ask.
 */
export function getPayslipViewChoice(lstViews: PayslipView[], blnClientFormat = false): { strView: PayslipView } | "ask" | "none" {
  const lstAllowed = PAYSLIP_VIEW_OPTIONS.map((objOption) => objOption.strView).filter((strView) => lstViews.includes(strView));
  if (lstAllowed.length === 0) {
    return "none";
  }
  if (blnClientFormat && canUseClientPayslipFormat(lstAllowed)) {
    return "ask";
  }
  return lstAllowed.length === 1 ? { strView: lstAllowed[0] } : "ask";
}

let objAllowedViewsRequest: Promise<PayslipView[]> | null = null;

/** The user's payslip views, fetched once per page load (a failed fetch is retried next time). */
export function loadAllowedPayslipViews(fnLoad: () => Promise<PayslipView[]>): Promise<PayslipView[]> {
  if (!objAllowedViewsRequest) {
    objAllowedViewsRequest = fnLoad().catch((objError: unknown) => {
      objAllowedViewsRequest = null;
      throw objError;
    });
  }
  return objAllowedViewsRequest;
}

export function resetAllowedPayslipViews() {
  objAllowedViewsRequest = null;
}
