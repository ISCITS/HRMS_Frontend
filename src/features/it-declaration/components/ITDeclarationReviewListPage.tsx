"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/components/master/MasterScreen.module.css";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import {
  hrItDeclarationReviewService,
  type HrItDeclarationListRecord,
} from "@/features/it-declaration/services/itDeclarationService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstRowsPerPageOptions = [10, 20, 50];
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

function downloadCsv(strFileName: string, lstRows: HrItDeclarationListRecord[], lstHeaders: string[]) {
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((objRow) =>
      [
        objRow.strEmployeeCode,
        objRow.strEmployeeName,
        objRow.strFinancialYearCode,
        objRow.strTaxRegime,
        objRow.decDeclaredTotalAmount,
        objRow.decApprovedTotalAmount,
        objRow.intProofPendingCount,
        objRow.strStatus,
        objRow.strSubmittedOn ?? "",
        objRow.strLastUpdated ?? "",
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

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
    useModuleActionAccess(["PAYROLL_IT_DECLARATION_REVIEW", "PAYROLL_IT_DECLARATION"]);
  const [lstRows, setLstRows] = useState<HrItDeclarationListRecord[]>([]);
  const [objSummary, setObjSummary] = useState<Record<string, number>>({});
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicFiltersDraft, setDicFiltersDraft] = useState<ItDeclarationFilters>(dicEmptyFilters);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);

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
      setObjSummary(objData.objSummary || {});
      setIntPage(1);
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
  const lstCsvHeaders = useMemo(
    () => [
      t("IT_DECLARATION_REVIEW_EMPLOYEE_CODE", "Employee Code"),
      t("IT_DECLARATION_REVIEW_EMPLOYEE_NAME", "Employee Name"),
      t("IT_DECLARATION_REVIEW_FINANCIAL_YEAR", "Financial Year"),
      t("IT_DECLARATION_REVIEW_TAX_REGIME", "Tax Regime"),
      t("IT_DECLARATION_REVIEW_DECLARED_TOTAL", "Declared Total"),
      t("IT_DECLARATION_REVIEW_APPROVED_TOTAL", "Approved Total"),
      t("IT_DECLARATION_REVIEW_PROOF_PENDING", "Proof Pending"),
      t("IT_DECLARATION_REVIEW_STATUS", "Status"),
      t("IT_DECLARATION_REVIEW_SUBMITTED_ON", "Submitted On"),
      t("IT_DECLARATION_REVIEW_LAST_UPDATED", "Last Updated"),
    ],
    [t],
  );
  const lstSummary = useMemo(
    () => [
      [t("IT_DECLARATION_REVIEW_DRAFT", "Draft"), objSummary.draft || 0],
      [t("IT_DECLARATION_REVIEW_SUBMITTED", "Submitted"), objSummary.submitted || 0],
      [t("IT_DECLARATION_REVIEW_UNDER_REVIEW", "Under Review"), objSummary.under_review || 0],
      [t("IT_DECLARATION_REVIEW_APPROVED", "Approved"), objSummary.approved || 0],
      [t("IT_DECLARATION_REVIEW_RELEASED", "Released"), objSummary.released || 0],
      [t("IT_DECLARATION_REVIEW_LOCKED", "Locked"), objSummary.locked || 0],
      [t("IT_DECLARATION_REVIEW_PROOF_PENDING", "Proof Pending"), objSummary.proof_pending || 0],
    ],
    [objSummary, t],
  );
  const intPageCount = Math.max(1, Math.ceil(lstRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = useMemo(
    () => lstRows.slice(intStartIndex, intStartIndex + intRowsPerPage),
    [intStartIndex, intRowsPerPage, lstRows],
  );

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("IT_DECLARATION_REVIEW_LOADING", "Loading IT declaration review...")} />;
  }

  return (
    <Stack spacing={0.8} className={styles.page}>
      {!blnCanView ? <Alert severity="warning">{t("IT_DECLARATION_REVIEW_NO_PERMISSION", "You do not have permission to view this screen.")}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box sx={{ borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", overflow: "hidden" }}>
        <Box sx={{ p: 1.1, background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>{t("IT_DECLARATION_REVIEW_TITLE", "IT Declaration Review")}</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem" }}>{t("IT_DECLARATION_REVIEW_SUBTITLE", "All declaration records load by default. Use filters only when you want to narrow the queue.")}</Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 0.8,
                width: "100%",
                maxWidth: { xs: "100%", md: 760 },
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                justifyContent: { xs: "stretch", md: "flex-end" },
              }}
            >
            {lstSummary.map(([strLabel, intCount]) => (
              <Box
                key={strLabel}
                sx={{
                  border: "1px solid rgba(255,255,255,0.45)",
                  borderRadius: "8px",
                  px: 1,
                  py: 0.75,
                  minHeight: 62,
                  backgroundColor: "rgba(8,47,73,0.28)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ color: "rgba(226,232,240,0.95)", fontSize: "0.72rem", lineHeight: 1 }}>{strLabel}</Typography>
                <Typography sx={{ color: "#ffffff", fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.2, mt: 0.2 }}>{intCount}</Typography>
              </Box>
            ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className={styles.controlsCard} sx={{ mt: 0, mb: 0 }}>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("it_declaration_review.csv", lstRows, lstCsvHeaders)} controlId="it-declaration.review-list.export-excel.button">
                {t("IT_DECLARATION_REVIEW_EXPORT_EXCEL", "Export Excel")}
              </Button>
            ) : null}
          </Box>
          {lstRows.length > 0 ? (
            <Box className={styles.paginationBar} sx={{ p: 0 }}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{t("IT_DECLARATION_REVIEW_ROWS_PER_PAGE", "Rows per page")}</Typography>
                <TextField
                  select
                  size="small"
                  value={String(intRowsPerPage)}
                  onChange={(e) => {
                    setIntRowsPerPage(Number(e.target.value));
                    setIntPage(1);
                  }}
                  className={styles.rowsPerPageSelect}
                  controlId="it-declaration.review-list.rows-per-page.select"
                >
                  {lstRowsPerPageOptions.map((intOption) => (
                    <MenuItem key={intOption} value={String(intOption)}>
                      {intOption}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstRows.length)} {t("IT_DECLARATION_REVIEW_OF", "of")} {lstRows.length}
                </Typography>
              </Box>
              <Pagination count={intPageCount} page={intCurrentPage} onChange={(_e, intValue) => setIntPage(intValue)} size="small" color="primary" showFirstButton showLastButton />
            </Box>
          ) : null}
        </Box>

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("IT_DECLARATION_REVIEW_ACTIONS", "Actions")}</th>
                <th>{t("IT_DECLARATION_REVIEW_EMPLOYEE_CODE", "Employee Code")}</th>
                <th>{t("IT_DECLARATION_REVIEW_EMPLOYEE_NAME", "Employee Name")}</th>
                <th>{t("IT_DECLARATION_REVIEW_FINANCIAL_YEAR", "Financial Year")}</th>
                <th>{t("IT_DECLARATION_REVIEW_TAX_REGIME", "Tax Regime")}</th>
                <th>{t("IT_DECLARATION_REVIEW_DECLARED_TOTAL", "Declared Total")}</th>
                <th>{t("IT_DECLARATION_REVIEW_APPROVED_TOTAL", "Approved Total")}</th>
                <th>{t("IT_DECLARATION_REVIEW_PROOF_PENDING", "Proof Pending")}</th>
                <th>{t("IT_DECLARATION_REVIEW_STATUS", "Status")}</th>
                <th>{t("IT_DECLARATION_REVIEW_SUBMITTED_ON", "Submitted On")}</th>
                <th>{t("IT_DECLARATION_REVIEW_LAST_UPDATED", "Last Updated")}</th>
              </tr>
            </thead>
            <tbody>
              {lstRows.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={11}>{t("IT_DECLARATION_REVIEW_NO_RECORDS_FOUND", "No records found.")}</td>
                </tr>
              ) : (
                lstVisibleRows.map((objRow) => (
                  <tr key={objRow.strDeclarationCode}>
                    <td>
                      <Button size="small" disabled={!blnCanView} onClick={() => objRouter.push(`/payroll/it-declaration-review/${objRow.intDeclarationID}`)} controlId="it-declaration.review-list.row.view.button" data-row-key={objRow.intDeclarationID}>
                        {t("IT_DECLARATION_REVIEW_VIEW", "View")}
                      </Button>
                    </td>
                    <td>{objRow.strEmployeeCode}</td>
                    <td>{objRow.strEmployeeName}</td>
                    <td>{objRow.strFinancialYearCode}</td>
                      <td>{getTaxRegimeLabel(objRow.strTaxRegime)}</td>
                      <td>{`INR ${objInrFormatter.format(Number(objRow.decDeclaredTotalAmount || 0))}`}</td>
                      <td>{`INR ${objInrFormatter.format(Number(objRow.decApprovedTotalAmount || 0))}`}</td>
                      <td>{objRow.intProofPendingCount}</td>
                      <td><ITDeclarationStatusBadge strStatus={objRow.strStatus} strLabel={getStatusLabel(objRow.strStatus)} /></td>
                    <td>{objRow.strSubmittedOn || "-"}</td>
                    <td>{objRow.strLastUpdated || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>
    </Stack>
  );
}
