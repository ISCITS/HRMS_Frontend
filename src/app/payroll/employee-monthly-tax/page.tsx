"use client";

import { useSearchParams } from "next/navigation";

import EmployeeMonthlyTaxPage from "@/features/payroll/components/EmployeeMonthlyTaxPage";

export default function Page() {
  const objSearchParams = useSearchParams();
  const strEmployeeID = objSearchParams.get("employeeId");
  const strFinancialYearCode = objSearchParams.get("financialYearCode");

  return (
    <EmployeeMonthlyTaxPage
      intInitialEmployeeID={strEmployeeID ? Number(strEmployeeID) : undefined}
      strInitialFinancialYearCode={strFinancialYearCode || undefined}
    />
  );
}
