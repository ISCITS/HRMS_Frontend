"use client";

import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { itDeclarationService, type ItDeclarationDashboardCardDto, type ItDeclarationRegime } from "@/features/it-declaration/services/itDeclarationService";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";

function formatCurrency(decValue: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(decValue || 0)}`;
}

function formatDateLabel(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${intFyStartYear + 1}`;
}

export default function SalaryEssDeclarationsPage() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strCurrentFy, setStrCurrentFy] = useState("");
  const [lstRows, setLstRows] = useState<ItDeclarationDashboardCardDto[]>([]);
  const [strBusyKey, setStrBusyKey] = useState("");
  const [blnAddDialogOpen, setBlnAddDialogOpen] = useState(false);
  const [strAddFy, setStrAddFy] = useState("");
  const [strAddRegime, setStrAddRegime] = useState<ItDeclarationRegime>("Old Regime");
  const [strSearchFy, setStrSearchFy] = useState("");
  const [strSearchRegime, setStrSearchRegime] = useState("");
  const [strSearchStatus, setStrSearchStatus] = useState("All");
  const [dicAppliedFilters, setDicAppliedFilters] = useState({ fy: "", regime: "", status: "All" });

  async function loadDashboard() {
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await itDeclarationService.getDashboard();
      const lstDashboardRows = objData.lstDeclarations || [];
      setStrCurrentFy(objData.strCurrentFinancialYearCode || "");
      if (lstDashboardRows.length > 0) {
        setLstRows(lstDashboardRows);
        return;
      }
      throw new Error("Dashboard returned empty declaration list.");
    } catch (objError) {
      const strFallbackFy = getCurrentFinancialYearCode();
      setStrCurrentFy(strFallbackFy);
      let blnFallbackBound = false;
      try {
        const intStartYear = Number(strFallbackFy.split("-")[0] || new Date().getFullYear());
        const lstFyCandidates = [
          `${intStartYear}-${intStartYear + 1}`,
          `${intStartYear - 1}-${intStartYear}`,
          `${intStartYear - 2}-${intStartYear - 1}`,
        ];
        const lstRecovered: ItDeclarationDashboardCardDto[] = [];
        for (const strFy of lstFyCandidates) {
          try {
            const objLegacy = await itDeclarationService.getDeclaration(strFy);
            if (!objLegacy?.intDeclarationID) continue;
            const decDeclaredAmount = (objLegacy.lstItems || []).reduce(
              (decTotal, objItem) => decTotal + Number(objItem.decDeclaredAmount || 0),
              0,
            );
            const strStatus = String(objLegacy.strDeclarationStatus || "draft").toLowerCase();
            lstRecovered.push({
              intDeclarationID: objLegacy.intDeclarationID,
              strFinancialYearCode: objLegacy.strFinancialYearCode || strFy,
              strTaxRegime: objLegacy.strSelectedRegime || "Old Regime",
              strStatus,
              decDeclaredAmount,
              decApprovedAmount: 0,
              strLastUpdated: objLegacy.strLastUpdated || null,
              blnReadOnly: !["draft", "released", "resubmitted"].includes(strStatus),
              strPrimaryAction: ["draft", "released", "resubmitted"].includes(strStatus) ? "continue" : "view",
            });
          } catch {
            // Ignore missing FY declarations.
          }
        }
        const dicByKey = new Map<string, ItDeclarationDashboardCardDto>();
        for (const objRow of lstRecovered) {
          dicByKey.set(`${objRow.intDeclarationID}-${objRow.strFinancialYearCode}`, objRow);
        }
        setLstRows(Array.from(dicByKey.values()).sort((a, b) => b.strFinancialYearCode.localeCompare(a.strFinancialYearCode)));
        blnFallbackBound = true;
      } catch {
        setLstRows([]);
      }
      if (!blnFallbackBound) {
        setStrError(
          objError instanceof Error
            ? objError.message
            : "Unable to load IT declaration dashboard."
        );
      }
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const lstCurrentFyRows = useMemo(
    () => lstRows.filter((objRow) => strCurrentFy && objRow.strFinancialYearCode.toUpperCase() === strCurrentFy.toUpperCase()),
    [lstRows, strCurrentFy]
  );
  const lstFilteredRows = useMemo(() => {
    const strFy = dicAppliedFilters.fy.trim().toLowerCase();
    const strRegime = dicAppliedFilters.regime.trim().toLowerCase();
    const strStatus = dicAppliedFilters.status.trim().toLowerCase();
    return lstRows.filter((objRow) => {
      const blnFy = !strFy || objRow.strFinancialYearCode.toLowerCase().includes(strFy);
      const blnRegime = !strRegime || objRow.strTaxRegime.toLowerCase().includes(strRegime);
      const blnStatus = strStatus === "all" || (objRow.strStatus || "").toLowerCase() === strStatus;
      return blnFy && blnRegime && blnStatus;
    });
  }, [lstRows, dicAppliedFilters]);
  const lstFyOptions = useMemo(() => {
    const setCodes = new Set<string>();
    if (strCurrentFy) setCodes.add(strCurrentFy);
    const intNow = new Date().getFullYear();
    const intMonth = new Date().getMonth();
    const intStart = intMonth >= 3 ? intNow : intNow - 1;
    setCodes.add(`${intStart}-${intStart + 1}`);
    setCodes.add(`${intStart - 1}-${intStart}`);
    setCodes.add(`${intStart - 2}-${intStart - 1}`);
    for (const objRow of lstRows) setCodes.add(objRow.strFinancialYearCode);
    return Array.from(setCodes).filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [strCurrentFy, lstRows]);

  const setDeclaredFy = useMemo(() => {
    const setData = new Set<string>();
    for (const objRow of lstRows) {
      setData.add(objRow.strFinancialYearCode);
    }
    return setData;
  }, [lstRows]);

  async function openDeclaration(strFinancialYearCode: string, strRegime: string) {
    const strRegimeValue: ItDeclarationRegime = strRegime.toLowerCase().includes("new") ? "New Regime" : "Old Regime";
    objRouter.push(`/salary/it-declaration?fy=${encodeURIComponent(strFinancialYearCode)}&regime=${encodeURIComponent(strRegimeValue)}`);
  }

  async function openCompare(strFinancialYearCode: string, strRegime: string) {
    const strRegimeValue: ItDeclarationRegime = strRegime.toLowerCase().includes("new") ? "New Regime" : "Old Regime";
    objRouter.push(`/salary/it-declaration?fy=${encodeURIComponent(strFinancialYearCode)}&regime=${encodeURIComponent(strRegimeValue)}&compare=1`);
  }

  async function createDeclaration(strRegime: ItDeclarationRegime, strFinancialYearCode?: string) {
    const strFy = strFinancialYearCode || strCurrentFy;
    if (!strFy) return;
    const strKey = `create-${strRegime}-${strFy}`;
    setStrBusyKey(strKey);
    setStrError("");
    try {
      await itDeclarationService.startDeclaration(strFy, strRegime);
      await openDeclaration(strFy, strRegime);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to create IT declaration.");
    } finally {
      setStrBusyKey("");
    }
  }

  function openAddDeclarationDialog() {
    setStrAddRegime("Old Regime");
    const strDefaultFy = lstFyOptions.find((strFy) => !setDeclaredFy.has(strFy))
      || (lstFyOptions[0] || strCurrentFy || getCurrentFinancialYearCode());
    setStrAddFy(strDefaultFy);
    setBlnAddDialogOpen(true);
  }

  async function createFromDialog() {
    if (!strAddFy) return;
    if (setDeclaredFy.has(strAddFy)) return;
    await createDeclaration(strAddRegime, strAddFy);
  }

  const lstGridRows = useMemo(() => {
    return lstFilteredRows.map((objRow) => ({
      id: objRow.intDeclarationID,
      fy: objRow.strFinancialYearCode,
      regime: objRow.strTaxRegime,
      status: (
        <Typography sx={{ fontSize: "0.78rem", textTransform: "capitalize", fontWeight: 700, color: "#0f172a" }}>
          {objRow.strStatus}
        </Typography>
      ),
      declared: formatCurrency(objRow.decDeclaredAmount),
      approved: formatCurrency(objRow.decApprovedAmount),
      lastUpdated: formatDateLabel(objRow.strLastUpdated),
      action: (
        <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" onClick={() => void openDeclaration(objRow.strFinancialYearCode, objRow.strTaxRegime)}>
            {objRow.blnReadOnly ? "View" : "Continue"}
          </Button>
          <Button size="small" variant="text" onClick={() => void openCompare(objRow.strFinancialYearCode, objRow.strTaxRegime)}>
            Compare Tax
          </Button>
        </Stack>
      ),
    }));
  }, [lstFilteredRows, strBusyKey]);

  const lstColumns: CommonTableColumn<(typeof lstGridRows)[number]>[] = [
    { field: "action", headerName: "Action", width: 240, sortable: false, exportable: false, align: "center" },
    { field: "fy", headerName: "FY", width: 160 },
    { field: "regime", headerName: "Regime", width: 180 },
    { field: "status", headerName: "Status", width: 140, sortable: false },
    { field: "declared", headerName: "Declared", width: 150, align: "right" },
    { field: "approved", headerName: "Approved", width: 150, align: "right" },
    { field: "lastUpdated", headerName: "Last Updated", width: 160 },
  ];

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Paper
        className={styles.controlsCard}
        sx={{
          p: 1.4,
          borderRadius: "12px",
          border: "1px solid #1e3a8a !important",
          background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%) !important",
          boxShadow: "0 8px 20px rgba(11, 47, 99, 0.22)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.08rem", color: "#f8fcff" }}>IT Declaration</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
                Financial Year Dashboard
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Paper className={styles.controlsCard} sx={{ p: 1.2, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
        <Box className={styles.searchRow}>
          <TextField
            value={strSearchFy}
            onChange={(objEvent) => setStrSearchFy(objEvent.target.value)}
            placeholder="Search FY"
            size="small"
            fullWidth
          />
          <TextField
            value={strSearchRegime}
            onChange={(objEvent) => setStrSearchRegime(objEvent.target.value)}
            placeholder="Search Regime"
            size="small"
            fullWidth
          />
          <TextField
            select
            value={strSearchStatus}
            onChange={(objEvent) => setStrSearchStatus(objEvent.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="under_review">Under Review</MenuItem>
            <MenuItem value="released">Released</MenuItem>
            <MenuItem value="resubmitted">Resubmitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="locked">Locked</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              onClick={() => setDicAppliedFilters({ fy: strSearchFy, regime: strSearchRegime, status: strSearchStatus })}
            >
              Search
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              variant="outlined"
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setStrSearchFy("");
                setStrSearchRegime("");
                setStrSearchStatus("All");
                setDicAppliedFilters({ fy: "", regime: "", status: "All" });
              }}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box className={styles.tableCard}>
        <CommonTable
          columns={lstColumns}
          rows={lstGridRows}
          rowIdField={"id"}
          toolbarLeft={(
            <Button className={styles.primaryButton} variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={openAddDeclarationDialog}>
              Add Declaration
            </Button>
          )}
          showExportOptions
          showPaginationSummary
          exportFileName="it-declaration-list"
          emptyMessage="No IT declarations found for this employee."
          withPaper={false}
        />
      </Box>

      {strCurrentFy && lstCurrentFyRows.length === 0 ? (
        <Alert severity="info">No declaration started for current FY {strCurrentFy}. Use Add Declaration.</Alert>
      ) : null}

      <Dialog open={blnAddDialogOpen} onClose={() => setBlnAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Declaration</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.2}>
            <TextField
              select
              label="Financial Year"
              value={strAddFy}
              onChange={(objEvent) => setStrAddFy(objEvent.target.value)}
              size="small"
              fullWidth
            >
              {lstFyOptions.map((strFy) => (
                <MenuItem key={strFy} value={strFy} disabled={setDeclaredFy.has(strFy)}>
                  {strFy} {setDeclaredFy.has(strFy) ? "(Already declared)" : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Tax Regime"
              value={strAddRegime}
              onChange={(objEvent) => setStrAddRegime(objEvent.target.value as ItDeclarationRegime)}
              size="small"
              fullWidth
            >
              <MenuItem value="Old Regime">
                Old Regime
              </MenuItem>
              <MenuItem value="New Regime">
                New Regime
              </MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!strAddFy || !!strBusyKey || setDeclaredFy.has(strAddFy)}
            onClick={() => void createFromDialog()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
