export const ESS_SHORTCUT_ROUTES = {
  myProfile: "/ess/my-profile",
  myAttendance: "/ess/attendance",
  applyLeave: "/ess/leave",
  myCompensation: "/ess/my-compensation",
  myPayslips: "/ess/my-payslips",
  itDeclaration: "/salary/it-declaration",
  flexiPay: "/salary/flexi-pay-declaration",
  reimbursements: "/ess/reimbursements",
} as const;

const dicComplianceCheckTab: Record<string, string> = {
  pan: "statutory",
  uan: "statutory",
  esi: "statutory",
  address: "address",
  nominee: "family",
  emergency_contact: "family",
};

export function resolveComplianceCheckHref(strCode: string, intEmployeeID: number | null): string | null {
  if (!intEmployeeID) {
    return ESS_SHORTCUT_ROUTES.myProfile;
  }
  if (strCode === "bank") {
    return "/ess/my-bank-details";
  }
  const strTab = dicComplianceCheckTab[strCode];
  if (!strTab) {
    return `/ess/my-profile/edit/${intEmployeeID}`;
  }
  return `/ess/my-profile/edit/${intEmployeeID}?tab=${strTab}`;
}

export function getTodayIsoDate(objDate: Date = new Date()): string {
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}

export type EssPayslipHrefRow = {
  payroll_month?: string;
  payslip_id?: number | null;
  result_id?: number;
  payslip_generated_on?: string | null;
};

function getRowSortTime(objRow: EssPayslipHrefRow): number {
  const strDate = objRow.payslip_generated_on || objRow.payroll_month || "";
  const intTime = new Date(strDate).getTime();
  return Number.isNaN(intTime) ? 0 : intTime;
}

export function resolveCurrentMonthPayslipHref(
  lstPayslips: EssPayslipHrefRow[],
  blnHasPayrollResult: boolean,
  objToday: Date = new Date()
): string | null {
  if (!blnHasPayrollResult) {
    return null;
  }

  const lstSortedPayslips = [...lstPayslips].sort((objA, objB) => getRowSortTime(objB) - getRowSortTime(objA));
  const strTargetYearMonth = `${objToday.getFullYear()}-${String(objToday.getMonth() + 1).padStart(2, "0")}`;
  const objMatch = lstSortedPayslips.find((objRow) => {
    if (!objRow.payroll_month) {
      return false;
    }
    const objDate = new Date(objRow.payroll_month);
    if (Number.isNaN(objDate.getTime())) {
      return false;
    }
    const strRowYearMonth = `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}`;
    return strRowYearMonth === strTargetYearMonth;
  });

  const objTarget = objMatch || lstSortedPayslips[0] || null;
  if (objTarget?.payslip_id) {
    return `/ess/my-payslips/document/${objTarget.payslip_id}`;
  }
  if (objTarget?.result_id) {
    return `/ess/my-payslips/${objTarget.result_id}`;
  }
  return "/ess/my-payslips";
}

export type PunchOverviewLikePunch = {
  dtPunchAt: string;
  strDirection: "in" | "out";
};

export type PunchOverviewLike = {
  blnCanPunch: boolean;
  strNextPunchDirection: "in" | "out";
  lstPunches?: PunchOverviewLikePunch[];
} | null | undefined;

export function resolveNextPunchDirection(objOverview: PunchOverviewLike): "in" | "out" {
  const lstPunches = objOverview?.lstPunches ?? [];
  if (!lstPunches.length) {
    return objOverview?.strNextPunchDirection ?? "in";
  }
  const objLastPunch = [...lstPunches].sort(
    (objA, objB) => new Date(objA.dtPunchAt).getTime() - new Date(objB.dtPunchAt).getTime()
  )[lstPunches.length - 1];
  return objLastPunch.strDirection === "in" ? "out" : "in";
}

export function resolvePunchButtonState(objOverview: PunchOverviewLike, blnPunching: boolean) {
  return {
    strDirection: resolveNextPunchDirection(objOverview),
    blnDisabled: blnPunching || !objOverview?.blnCanPunch,
  };
}
