import { isPayslipLayoutView, type PayslipDocumentView, type PayslipView } from "@/features/payroll/services/payslipService";

/**
 * The page to fetch for the payslip tab: with both views allowed the default format comes as the
 * detailed payslip, so the tab's own Monthly / Detailed switch works; Format 1 / Format 3 as chosen.
 */
export function getPayslipTabRequestView(strView: PayslipDocumentView, blnCanSwitchView: boolean): PayslipDocumentView {
  return !isPayslipLayoutView(strView) && blnCanSwitchView ? "detailed" : strView;
}

/** The Monthly / Detailed switch above an on-screen payslip: the default format's views only. */
export function getPayslipSwitchView(strView: PayslipDocumentView | null | undefined, blnCanSwitchView: boolean): PayslipView | undefined {
  return blnCanSwitchView && strView && !isPayslipLayoutView(strView) ? strView : undefined;
}

export const NO_PAYSLIP_VIEW_MESSAGE =
  "Your user group has no payslip view right. Ask an administrator to grant \"Payslip - Monthly\" or \"Payslip - Detailed\" under Payroll Runs in User Group Rights.";

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
