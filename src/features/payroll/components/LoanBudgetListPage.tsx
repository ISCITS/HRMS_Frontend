"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Box, Button, Link } from "@mui/material";
import { useEffect, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterStatusPill, dicMasterRowSx } from "@/components/master/MasterListUi";
import masterStyles from "@/components/master/MasterScreen.module.css";
import { loanBudgetService } from "@/features/payroll/services/loanBudgetService";
import type { LoanBudgetSummaryRecord } from "@/features/payroll/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstModuleCodes = ["LOAN_BUDGET", "PAYROLL_LOAN_BUDGET"];

const dicActionAliases: Record<string, string[]> = {
  view: ["loan_budget_view"],
  create: ["loan_budget_create"],
};

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

export default function LoanBudgetListPage({ intRefreshKey, onOpenBudget, onCreateBudget }: { intRefreshKey?: number; onOpenBudget: (strFinancialYear: string) => void; onCreateBudget: () => void }) {
  const { t, blnLoadingLabels, strLabelError } = useModuleLabels("loan-budget");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny } = useModuleActionAccess(lstModuleCodes);
  const [lstRows, setLstRows] = useState<LoanBudgetSummaryRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const canView = () => dicActionAliases.view.some((strAlias) => canDoAny(strAlias));
  const canCreate = () => dicActionAliases.create.some((strAlias) => canDoAny(strAlias));
  const blnCanView = canView();
  const blnCanCreate = canCreate();

  async function loadRows() {
    if (!blnCanView) {
      setLstRows([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await loanBudgetService.listBudgets());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_load_list", "Unable to load loan budgets."));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadRows();
  }, [blnRightsLoading, blnCanView, intRefreshKey]);

  const lstTableRows = lstRows.map((objRow) => ({
    id: objRow.intID,
    strFinancialYearText: objRow.strFinancialYear,
    strFinancialYear: (
      <Link
        className="app-master-first-column-link"
        component="button"
        type="button"
        underline="none"
        data-controlid="loan-budget.list.row.financial-year.link"
        data-row-key={String(objRow.intID)}
        onClick={(objEvent) => { objEvent.stopPropagation(); onOpenBudget(objRow.strFinancialYear); }}
      >
        {objRow.strFinancialYear}
      </Link>
    ),
    decTotalBudgetAmount: formatCurrency(objRow.decTotalBudgetAmount),
    decApprovedTotal: formatCurrency(objRow.decApprovedTotal),
    decOutstandingTotal: formatCurrency(objRow.decOutstandingTotal),
    decRemaining: formatCurrency(objRow.decRemaining),
    status: <MasterStatusPill blnActive={objRow.blnIsActive} strActiveLabel={t("active", "Active")} strInactiveLabel={t("closed", "Closed")} />,
  }));

  const lstTableColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
    { field: "strFinancialYear", headerName: t("table_financial_year", "Financial Year"), width: 150, sortAccessor: (dicRow) => dicRow.strFinancialYearText },
    { field: "decTotalBudgetAmount", headerName: t("table_budget", "Company Budget"), align: "right", width: 170 },
    { field: "decApprovedTotal", headerName: t("table_approved", "Approved"), align: "right", width: 160 },
    { field: "decOutstandingTotal", headerName: t("table_outstanding", "Outstanding"), align: "right", width: 160 },
    { field: "decRemaining", headerName: t("table_remaining", "Remaining"), align: "right", width: 160 },
    { field: "status", headerName: t("table_status", "Status"), sortable: false, filterable: false, width: 120 },
  ];

  const blnBusy = blnLoading || blnRightsLoading || blnLoadingLabels;

  return (
    <Box className={masterStyles.page}>
      <MasterBreadcrumbs strSection={t("breadcrumb_section", "Payroll")} strTitle={t("breadcrumb_title", "Loan Budget")} />
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnCanView && !blnBusy ? <Alert severity="warning">{t("no_access", "Loan budget access is not available for your user group.")}</Alert> : null}
      {blnBusy ? (
        <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <MasterGridSkeleton strControlId="loan-budget.list.skeleton" intColumns={6} />
        </Box>
      ) : blnCanView ? (
        <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="loan-budget"
            showPaginationSummary
            emptyMessage={t("empty_message", "No loan budgets configured yet.")}
            testIdPrefix="loan-budget.list"
            toolbarLeft={
              blnCanCreate ? (
                <Button className={masterStyles.primaryButton} startIcon={<AddRoundedIcon />} onClick={onCreateBudget}>
                  {t("add_button", "Add Budget")}
                </Button>
              ) : undefined
            }
            onRowClick={(dicRow) => onOpenBudget(dicRow.strFinancialYearText)}
            minTableWidth={900}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      ) : null}
    </Box>
  );
}
