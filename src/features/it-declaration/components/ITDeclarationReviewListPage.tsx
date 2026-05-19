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
    <Stack spacing={2.5} className={styles.page}>
      {!blnCanView ? <Alert severity="warning">You do not have permission to view this screen.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={styles.controlsCard}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <TextField size="small" label="Financial Year" value={dicFiltersDraft.strFinancialYearCode} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strFinancialYearCode: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 140 } }} />
          <TextField size="small" label="Employee Code/Name" value={dicFiltersDraft.strEmployee} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strEmployee: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 170 } }} />
          <TextField select size="small" label="Tax Regime" value={dicFiltersDraft.strTaxRegime} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strTaxRegime: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 130 } }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="old">Old</MenuItem>
            <MenuItem value="new">New</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={dicFiltersDraft.strStatus} onChange={(e) => setDicFiltersDraft((d) => ({ ...d, strStatus: e.target.value }))} sx={{ minWidth: { xs: "100%", sm: 140 } }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="under_review">Under Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="released">Released</MenuItem>
            <MenuItem value="locked">Locked</MenuItem>
          </TextField>
          <Box className={styles.searchActions} sx={{ ml: { md: "auto" } }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadData(dicFiltersDraft)}>Search</Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicFiltersDraft(dicEmptyFilters);
                void loadData(dicEmptyFilters);
              }}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {lstSummary.map(([strLabel, intCount]) => (
          <Box key={strLabel} sx={{ border: "1px solid #dbe3ef", borderRadius: 999, px: 1.4, py: 0.8, minWidth: 130 }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{strLabel}</Typography>
            <Typography sx={{ fontWeight: 800 }}>{intCount}</Typography>
          </Box>
        ))}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("it_declaration_review.csv", lstRows)}>
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
                      <Button size="small" disabled={!blnCanView} onClick={() => objRouter.push(`/payroll/it-declaration-review/${objRow.intDeclarationID}`)}>
                        View
                      </Button>
                    </td>
                    <td>{objRow.strEmployeeCode}</td>
                    <td>{objRow.strEmployeeName}</td>
                    <td>{objRow.strFinancialYearCode}</td>
                    <td>{objRow.strTaxRegime}</td>
                    <td>{objRow.decDeclaredTotalAmount}</td>
                    <td>{objRow.decApprovedTotalAmount}</td>
                    <td>{objRow.intProofPendingCount}</td>
                    <td><ITDeclarationStatusBadge strStatus={objRow.strStatus} /></td>
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
