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

function downloadCsv(strFileName: string, lstRows: HrItDeclarationListRecord[]) {
  const lstHeaders = [
    "Employee Code",
    "Employee Name",
    "Financial Year",
    "Tax Regime",
    "Declared Total",
    "Approved Total",
    "Proof Pending",
    "Status",
    "Submitted On",
    "Last Updated",
  ];
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
      setStrError(objError instanceof Error ? objError.message : "Unable to load IT declaration review list.");
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
  const lstSummary = useMemo(
    () => [
      ["Submitted", objSummary.submitted || 0],
      ["Under Review", objSummary.under_review || 0],
      ["Approved", objSummary.approved || 0],
      ["Released", objSummary.released || 0],
      ["Locked", objSummary.locked || 0],
      ["Proof Pending", objSummary.proof_pending || 0],
    ],
    [objSummary],
  );
  const intPageCount = Math.max(1, Math.ceil(lstRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = useMemo(
    () => lstRows.slice(intStartIndex, intStartIndex + intRowsPerPage),
    [intStartIndex, intRowsPerPage, lstRows],
  );

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel="Loading IT declaration review..." />;
  }

  return (
    <Stack spacing={0.8} className={styles.page}>
      {!blnCanView ? <Alert severity="warning">You do not have permission to view this screen.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box sx={{ borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", overflow: "hidden" }}>
        <Box sx={{ p: 1.1, background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>IT Declaration Review</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem" }}>Financial Year Dashboard</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            {lstSummary.map(([strLabel, intCount]) => (
              <Box key={strLabel} sx={{ border: "1px solid rgba(255,255,255,0.45)", borderRadius: "8px", px: 1, py: 0.55, minWidth: 104, backgroundColor: "rgba(8,47,73,0.28)" }}>
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
          <TextField size="small" label="Financial Year" value={dicFiltersDraft.strFinancialYearCode} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strFinancialYearCode: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 140 } }} data-testid="it-declaration.review-list.financial-year.input" />
          <TextField size="small" label="Employee Code/Name" value={dicFiltersDraft.strEmployee} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strEmployee: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 170 } }} data-testid="it-declaration.review-list.employee.input" />
          <TextField select size="small" label="Tax Regime" value={dicFiltersDraft.strTaxRegime} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strTaxRegime: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 130 } }} data-testid="it-declaration.review-list.tax-regime.select">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="old">Old</MenuItem>
            <MenuItem value="new">New</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={dicFiltersDraft.strStatus} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strStatus: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 140 } }} data-testid="it-declaration.review-list.status.select">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="under_review">Under Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="released">Released</MenuItem>
            <MenuItem value="locked">Locked</MenuItem>
          </TextField>
          <Box className={styles.searchActions} sx={{ ml: { md: "auto" } }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadData(dicFiltersDraft)} data-testid="it-declaration.review-list.search.button">Search</Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicFiltersDraft(dicEmptyFilters);
                void loadData(dicEmptyFilters);
              }}
              data-testid="it-declaration.review-list.clear.button"
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ mt: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("it_declaration_review.csv", lstRows)} data-testid="it-declaration.review-list.export-excel.button">
                Export Excel
              </Button>
            ) : null}
          </Box>
          {lstRows.length > 0 ? (
            <Box className={styles.paginationBar} sx={{ p: 0 }}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>Rows per page</Typography>
                <TextField
                  select
                  size="small"
                  value={String(intRowsPerPage)}
                  onChange={(e) => {
                    setIntRowsPerPage(Number(e.target.value));
                    setIntPage(1);
                  }}
                  className={styles.rowsPerPageSelect}
                  data-testid="it-declaration.review-list.rows-per-page.select"
                >
                  {lstRowsPerPageOptions.map((intOption) => (
                    <MenuItem key={intOption} value={String(intOption)}>
                      {intOption}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstRows.length)} of {lstRows.length}
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
                <th>Actions</th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Financial Year</th>
                <th>Tax Regime</th>
                <th>Declared Total</th>
                <th>Approved Total</th>
                <th>Proof Pending</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {lstRows.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={11}>No records found.</td>
                </tr>
              ) : (
                lstVisibleRows.map((objRow) => (
                  <tr key={objRow.strDeclarationCode}>
                    <td>
                      <Button size="small" disabled={!blnCanView} onClick={() => objRouter.push(`/payroll/it-declaration-review/${objRow.intDeclarationID}`)} data-testid="it-declaration.review-list.row.view.button" data-row-key={objRow.intDeclarationID}>
                        View
                      </Button>
                    </td>
                    <td>{objRow.strEmployeeCode}</td>
                    <td>{objRow.strEmployeeName}</td>
                    <td>{objRow.strFinancialYearCode}</td>
                      <td>{formatDisplayLabel(objRow.strTaxRegime)}</td>
                      <td>{`INR ${objInrFormatter.format(Number(objRow.decDeclaredTotalAmount || 0))}`}</td>
                      <td>{`INR ${objInrFormatter.format(Number(objRow.decApprovedTotalAmount || 0))}`}</td>
                      <td>{objRow.intProofPendingCount}</td>
                      <td><ITDeclarationStatusBadge strStatus={formatDisplayLabel(objRow.strStatus)} /></td>
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
