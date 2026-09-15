"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Box, Button, Chip } from "@mui/material";
import { useEffect, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
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
    action: (
      <CommonRowActions
        testIdPrefix="loan-budget.list.row"
        rowKey={objRow.intID}
        blnCanView
        blnCanEdit={blnCanCreate}
        onView={() => onOpenBudget(objRow.strFinancialYear)}
        onEdit={() => onOpenBudget(objRow.strFinancialYear)}
      />
    ),
    strFinancialYear: objRow.strFinancialYear,
    decTotalBudgetAmount: formatCurrency(objRow.decTotalBudgetAmount),
    decApprovedTotal: formatCurrency(objRow.decApprovedTotal),
    decOutstandingTotal: formatCurrency(objRow.decOutstandingTotal),
    decRemaining: formatCurrency(objRow.decRemaining),
    status: <Chip size="small" label={objRow.blnIsActive ? t("active", "Active") : t("closed", "Closed")} color={objRow.blnIsActive ? "success" : "default"} />,
  }));

  const lstTableColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
    { field: "action", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 100 },
    { field: "strFinancialYear", headerName: t("table_financial_year", "Financial Year"), width: 150 },
    { field: "decTotalBudgetAmount", headerName: t("table_budget", "Company Budget"), align: "right", width: 170 },
    { field: "decApprovedTotal", headerName: t("table_approved", "Approved"), align: "right", width: 160 },
    { field: "decOutstandingTotal", headerName: t("table_outstanding", "Outstanding"), align: "right", width: 160 },
    { field: "decRemaining", headerName: t("table_remaining", "Remaining"), align: "right", width: 160 },
    { field: "status", headerName: t("table_status", "Status"), sortable: false, filterable: false, width: 120 },
  ];

  return (
    <Box className={styles.page}>
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? <Alert severity="warning">{t("no_access", "Loan budget access is not available for your user group.")}</Alert> : null}
      {blnCanView ? (
        <Box className={styles.tableCard}>
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
                <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={onCreateBudget}>
                  {t("add_button", "Add Budget")}
                </Button>
              ) : undefined
            }
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      ) : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels} strLabel={t("loading", "Loading loan budgets...")} />
    </Box>
  );
}
