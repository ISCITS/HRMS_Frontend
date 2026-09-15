"use client";

import PayrollResultListPage from "@/features/payroll/components/PayrollResultListPage";

type PayslipListPageProps = {
  blnSelfOnly?: boolean;
  blnEssMode?: boolean;
};

export default function PayslipListPage({ blnSelfOnly = false, blnEssMode = false }: PayslipListPageProps) {
  return <PayrollResultListPage blnPayslipScreen blnSelfOnly={blnSelfOnly} blnEssMode={blnEssMode} />;
}
