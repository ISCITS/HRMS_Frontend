import type { PayslipView } from "@/features/payroll/services/payslipService";

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

/** No allowed view -> "none"; one -> open it straight away; both -> ask the user. */
export function getPayslipViewChoice(lstViews: PayslipView[]): { strView: PayslipView } | "ask" | "none" {
  const lstAllowed = PAYSLIP_VIEW_OPTIONS.map((objOption) => objOption.strView).filter((strView) => lstViews.includes(strView));
  if (lstAllowed.length === 0) {
    return "none";
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
