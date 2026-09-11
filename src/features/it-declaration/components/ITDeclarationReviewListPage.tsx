"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/components/master/MasterScreen.module.css";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import {
  hrItDeclarationReviewService,
  type HrItDeclarationListRecord,
} from "@/features/it-declaration/services/itDeclarationService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const objInrFormatter = new Intl.NumberFormat("en-IN");

type ItDeclarationFilters = {
  strFinancialYearCode: string;
  strEmployee: string;
  strTaxRegime: string;
  strStatus: string;
};

const dicEmptyFilters: ItDeclarationFilters = {
  strFinancialYearCode: "",
  strEmployee: "",
  strTaxRegime: "",
  strStatus: "",
};

function formatDisplayLabel(strValue: string) {
  return String(strValue || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

export default function ITDeclarationReviewListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("it-declaration-review", "Unable to load IT declaration review labels.");
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny, objRights } =
    useModuleActionAccess(["it_declaration_review", "PAYROLL_IT_DECLARATION_REVIEW", "PAYROLL_IT_DECLARATION"]);
  const [lstRows, setLstRows] = useState<HrItDeclarationListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [blnDismissNoPermission, setBlnDismissNoPermission] = useState(false);
  const [dicFiltersDraft, setDicFiltersDraft] = useState<ItDeclarationFilters>(dicEmptyFilters);

  function hasPermissionCode(strCode: string) {
    const strNormalized = strCode.trim().toUpperCase();
    return Object.entries(objRights.dicAllowedActions || {}).some(
      ([strModuleCode, lstActions]) =>
        strModuleCode.trim().toUpperCase() === strNormalized ||
        lstActions.some((strAction) => strAction.trim().toUpperCase() === strNormalized),
    );
  }

  async function loadData(objFilters: ItDeclarationFilters = dicFiltersDraft) {
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await hrItDeclarationReviewService.getList(objFilters);
      setLstRows(objData.lstRows || []);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("IT_DECLARATION_REVIEW_UNABLE_LOAD_LIST", "Unable to load IT declaration review list."));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadData(dicEmptyFilters);
  }, [blnRightsLoading]);

  const blnCanView =
    canViewAny() ||
    canDoAny("view") ||
    hasPermissionCode("PAYROLL_IT_DECLARATION_VIEW") ||
    hasPermissionCode("PAYROLL_IT_DECLARATION_REVIEW");
  const blnCanExport = canDoAny("export");
  function getStatusLabel(strStatus: string) {
    const strNormalized = String(strStatus || "").trim().toLowerCase().replace(/\s+/g, "_");
    const dicStatusKeys: Record<string, [string, string]> = {
      draft: ["IT_DECLARATION_REVIEW_DRAFT", "Draft"],
      submitted: ["IT_DECLARATION_REVIEW_SUBMITTED", "Submitted"],
      under_review: ["IT_DECLARATION_REVIEW_UNDER_REVIEW", "Under Review"],
      approved: ["IT_DECLARATION_REVIEW_APPROVED", "Approved"],
      released: ["IT_DECLARATION_REVIEW_RELEASED", "Released"],
      locked: ["IT_DECLARATION_REVIEW_LOCKED", "Locked"],
      proof_pending: ["IT_DECLARATION_REVIEW_PROOF_PENDING", "Proof Pending"],
      partially_approved: ["IT_DECLARATION_REVIEW_PARTIALLY_APPROVED", "Partially Approved"],
      resubmitted: ["IT_DECLARATION_REVIEW_RESUBMITTED", "Resubmitted"],
      rejected: ["IT_DECLARATION_REVIEW_REJECTED", "Rejected"],
    };
    const [strKey, strFallback] = dicStatusKeys[strNormalized] ?? ["IT_DECLARATION_REVIEW_DRAFT", "Draft"];
    return t(strKey, strFallback);
  }
  function getTaxRegimeLabel(strRegime: string) {
    const strNormalized = String(strRegime || "").trim().toLowerCase();
    if (strNormalized === "new" || strNormalized === "new regime") {
      return t("IT_DECLARATION_REVIEW_NEW_REGIME", "New Regime");
    }
    if (strNormalized === "old" || strNormalized === "old regime") {
      return t("IT_DECLARATION_REVIEW_OLD_REGIME", "Old Regime");
    }
    return formatDisplayLabel(strRegime);
  }
  const lstTableRows = useMemo(
    () => lstRows.map((objRow) => ({
      id: objRow.strRecordUUID,
      action: (
        <Button
          size="small"
          disabled={!blnCanView}
          onClick={() => objRouter.push(`/payroll/it-declaration-review/${objRow.strRecordUUID}`)}
          controlId="it-declaration.review-list.row.view.button"
          data-row-key={objRow.strRecordUUID}
        >
          {t("IT_DECLARATION_REVIEW_VIEW", "View")}
        </Button>
      ),
      strEmployeeCode: objRow.strEmployeeCode || "-",
      strEmployeeName: objRow.strEmployeeName || "-",
      strFinancialYearCode: objRow.strFinancialYearCode || "-",
      strTaxRegime: getTaxRegimeLabel(objRow.strTaxRegime),
      strTaxRegimeSort: objRow.strTaxRegime || "",
      decDeclaredTotalAmount: `INR ${objInrFormatter.format(Number(objRow.decDeclaredTotalAmount || 0))}`,
      decDeclaredTotalAmountSort: Number(objRow.decDeclaredTotalAmount || 0),
      decApprovedTotalAmount: `INR ${objInrFormatter.format(Number(objRow.decApprovedTotalAmount || 0))}`,
      decApprovedTotalAmountSort: Number(objRow.decApprovedTotalAmount || 0),
      intProofPendingCount: String(objRow.intProofPendingCount ?? 0),
      intProofPendingCountSort: Number(objRow.intProofPendingCount ?? 0),
      strStatus: <ITDeclarationStatusBadge strStatus={objRow.strStatus} strLabel={getStatusLabel(objRow.strStatus)} />,
      strStatusSort: getStatusLabel(objRow.strStatus),
      strSubmittedOn: objRow.strSubmittedOn || "-",
      strLastUpdated: objRow.strLastUpdated || "-",
    })),
    [blnCanView, lstRows, objRouter, t],
  );
  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("IT_DECLARATION_REVIEW_ACTIONS", "Actions"), align: "center", sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strEmployeeCode", headerName: t("IT_DECLARATION_REVIEW_EMPLOYEE_CODE", "Employee Code"), width: 140 },
      { field: "strEmployeeName", headerName: t("IT_DECLARATION_REVIEW_EMPLOYEE_NAME", "Employee Name"), width: 220 },
      { field: "strFinancialYearCode", headerName: t("IT_DECLARATION_REVIEW_FINANCIAL_YEAR", "Financial Year"), width: 150 },
      { field: "strTaxRegime", headerName: t("IT_DECLARATION_REVIEW_TAX_REGIME", "Tax Regime"), width: 150, sortAccessor: (objRow) => String(objRow.strTaxRegimeSort) },
      { field: "decDeclaredTotalAmount", headerName: t("IT_DECLARATION_REVIEW_DECLARED_TOTAL", "Declared Total"), align: "right", width: 160, sortAccessor: (objRow) => objRow.decDeclaredTotalAmountSort },
      { field: "decApprovedTotalAmount", headerName: t("IT_DECLARATION_REVIEW_APPROVED_TOTAL", "Approved Total"), align: "right", width: 160, sortAccessor: (objRow) => objRow.decApprovedTotalAmountSort },
      { field: "intProofPendingCount", headerName: t("IT_DECLARATION_REVIEW_PROOF_PENDING", "Proof Pending"), align: "center", width: 130, sortAccessor: (objRow) => objRow.intProofPendingCountSort },
      { field: "strStatus", headerName: t("IT_DECLARATION_REVIEW_STATUS", "Status"), sortable: false, filterable: false, exportable: false, width: 160 },
      { field: "strSubmittedOn", headerName: t("IT_DECLARATION_REVIEW_SUBMITTED_ON", "Submitted On"), width: 140 },
      { field: "strLastUpdated", headerName: t("IT_DECLARATION_REVIEW_LAST_UPDATED", "Last Updated"), width: 140 },
    ],
    [lstTableRows, t],
  );

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("IT_DECLARATION_REVIEW_LOADING", "Loading IT declaration review...")} />;
  }

  return (
    <Box className={styles.page}>
      {!blnCanView && !blnDismissNoPermission ? <Alert severity="warning" onClose={() => setBlnDismissNoPermission(true)}>{t("IT_DECLARATION_REVIEW_NO_PERMISSION", "You do not have permission to view this screen.")}</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Box className={styles.controlsCard}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <TextField size="small" label={t("IT_DECLARATION_REVIEW_FINANCIAL_YEAR", "Financial Year")} value={dicFiltersDraft.strFinancialYearCode} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strFinancialYearCode: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 140 } }} controlId="it-declaration.review-list.financial-year.input" />
          <TextField size="small" label={t("IT_DECLARATION_REVIEW_EMPLOYEE_CODE_NAME", "Employee Code/Name")} value={dicFiltersDraft.strEmployee} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strEmployee: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 170 } }} controlId="it-declaration.review-list.employee.input" />
          <TextField select size="small" label={t("IT_DECLARATION_REVIEW_TAX_REGIME", "Tax Regime")} value={dicFiltersDraft.strTaxRegime} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strTaxRegime: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 130 } }} controlId="it-declaration.review-list.tax-regime.select">
            <MenuItem value="">{t("IT_DECLARATION_REVIEW_ALL", "All")}</MenuItem>
            <MenuItem value="old">{t("IT_DECLARATION_REVIEW_OLD", "Old")}</MenuItem>
            <MenuItem value="new">{t("IT_DECLARATION_REVIEW_NEW", "New")}</MenuItem>
          </TextField>
          <TextField select size="small" label={t("IT_DECLARATION_REVIEW_STATUS", "Status")} value={dicFiltersDraft.strStatus} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strStatus: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 140 } }} controlId="it-declaration.review-list.status.select">
            <MenuItem value="">{t("IT_DECLARATION_REVIEW_ALL", "All")}</MenuItem>
            <MenuItem value="submitted">{t("IT_DECLARATION_REVIEW_SUBMITTED", "Submitted")}</MenuItem>
            <MenuItem value="under_review">{t("IT_DECLARATION_REVIEW_UNDER_REVIEW", "Under Review")}</MenuItem>
            <MenuItem value="approved">{t("IT_DECLARATION_REVIEW_APPROVED", "Approved")}</MenuItem>
            <MenuItem value="released">{t("IT_DECLARATION_REVIEW_RELEASED", "Released")}</MenuItem>
            <MenuItem value="locked">{t("IT_DECLARATION_REVIEW_LOCKED", "Locked")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions} sx={{ ml: { md: "auto" } }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadData(dicFiltersDraft)} controlId="it-declaration.review-list.search.button">{t("IT_DECLARATION_REVIEW_SEARCH", "Search")}</Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicFiltersDraft(dicEmptyFilters);
                void loadData(dicEmptyFilters);
              }}
              controlId="it-declaration.review-list.clear.button"
            >
              {t("IT_DECLARATION_REVIEW_CLEAR", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ mt: 0 }}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          exportFileName="it_declaration_review"
          showExportOptions={blnCanExport}
          showPaginationSummary
          emptyMessage={t("IT_DECLARATION_REVIEW_NO_RECORDS_FOUND", "No records found.")}
          testIdPrefix="it-declaration.review-list"
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Box>
  );
}
