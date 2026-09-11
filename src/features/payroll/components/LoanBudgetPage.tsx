"use client";

import { useState } from "react";

import LoanBudgetDetailPage from "@/features/payroll/components/LoanBudgetDetailPage";
import LoanBudgetListPage from "@/features/payroll/components/LoanBudgetListPage";

type LoanBudgetView = { mode: "list" } | { mode: "edit"; strFinancialYear: string } | { mode: "new" };

// Everything lives at /payroll/loan-budget -- the financial year being viewed/edited is plain
// in-page state, never a URL segment, so there's no id/FY in the address bar and no per-route
// header-title entry to maintain for this screen.
export default function LoanBudgetPage() {
  const [objView, setObjView] = useState<LoanBudgetView>({ mode: "list" });
  const [intListRefreshKey, setIntListRefreshKey] = useState(0);

  function backToList() {
    setIntListRefreshKey((intKey) => intKey + 1);
    setObjView({ mode: "list" });
  }

  if (objView.mode === "list") {
    return (
      <LoanBudgetListPage
        intRefreshKey={intListRefreshKey}
        onOpenBudget={(strFinancialYear) => setObjView({ mode: "edit", strFinancialYear })}
        onCreateBudget={() => setObjView({ mode: "new" })}
      />
    );
  }

  return (
    <LoanBudgetDetailPage
      strFinancialYear={objView.mode === "edit" ? objView.strFinancialYear : undefined}
      onBack={backToList}
      onSaved={(strFinancialYear) => setObjView({ mode: "edit", strFinancialYear })}
    />
  );
}
