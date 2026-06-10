"use client";

import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import {
  hrItDeclarationService,
  type HrEmployeeItDeclarationListRecord,
  type HrItDeclarationEmployeeOption,
  type ItDeclarationRegime,
} from "@/features/it-declaration/services/itDeclarationService";

const lstRegimeOptions: ItDeclarationRegime[] = ["Old Regime", "New Regime"];
const lstRowsPerPageOptions = [10, 20, 50];
const strHrListFilterStorageKey = "hrms.hr-it-declaration.list-filters";

function normalizeFinancialYearCode(strValue?: string | null) {
  const strCode = String(strValue || "").trim().toUpperCase().replace("/", "-");
  if (!strCode) return "";
  const strWithoutPrefix = strCode.startsWith("FY ") ? strCode.slice(3).trim() : (strCode.startsWith("FY") ? strCode.slice(2).trim() : strCode);
  const lstParts = strWithoutPrefix.split("-").map((strPart) => strPart.trim()).filter(Boolean);
  if (lstParts.length !== 2) return strWithoutPrefix;
  const [strStart, strEnd] = lstParts;
  if (!/^\d{4}$/.test(strStart) || !/^\d{2,4}$/.test(strEnd)) return strWithoutPrefix;
  if (strEnd.length === 2) return `${strStart}-${strEnd}`;
  return `${strStart}-${strEnd.slice(-2)}`;
}

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${String(intFyStartYear + 1).slice(-2)}`;
}

function getNextFinancialYearCode() {
  const strCurrentFy = getCurrentFinancialYearCode();
  const intStartYear = Number(strCurrentFy.split("-")[0] || new Date().getFullYear());
  return `${intStartYear + 1}-${String(intStartYear + 2).slice(-2)}`;
}

function formatCurrency(decValue: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(decValue || 0)}`;
}

function formatDateLabel(strValue?: string | null) {
  if (!strValue) return "-";
  const dtValue = new Date(strValue);
  if (Number.isNaN(dtValue.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(dtValue);
}

function matchesRegime(objRow: HrEmployeeItDeclarationListRecord, strRegime: string) {
  const strNormalizedFilter = String(strRegime || "").trim().toLowerCase();
  if (!strNormalizedFilter) return true;
  return String(objRow.strTaxRegime || "").trim().toLowerCase().includes(strNormalizedFilter.split(" ")[0]);
}

export default function HrItDeclarationListPage() {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();

  const [lstEmployees, setLstEmployees] = useState<HrItDeclarationEmployeeOption[]>([]);
  const [blnEmployeeLoading, setBlnEmployeeLoading] = useState(false);
  const [strEmployeeLookup, setStrEmployeeLookup] = useState("");

  const [objSearchEmployee, setObjSearchEmployee] = useState<HrItDeclarationEmployeeOption | null>(null);
  const [strSearchFinancialYearCode, setStrSearchFinancialYearCode] = useState("");
  const [strSearchRegime, setStrSearchRegime] = useState<ItDeclarationRegime>("Old Regime");

  const [objAddEmployee, setObjAddEmployee] = useState<HrItDeclarationEmployeeOption | null>(null);
  const [strAddFinancialYearCode, setStrAddFinancialYearCode] = useState("");
  const [strAddRegime, setStrAddRegime] = useState<ItDeclarationRegime>("Old Regime");
  const [blnAddDialogOpen, setBlnAddDialogOpen] = useState(false);

  const [lstRows, setLstRows] = useState<HrEmployeeItDeclarationListRecord[]>([]);
  const [blnListLoading, setBlnListLoading] = useState(false);
  const [blnHasSearched, setBlnHasSearched] = useState(false);
  const [strError, setStrError] = useState("");
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [blnFiltersHydrated, setBlnFiltersHydrated] = useState(false);

  const strQueryEmployeeId = (objSearchParams.get("employeeId") || "").trim();
  const strQueryEmployeeCode = (objSearchParams.get("employeeCode") || "").trim();
  const strQueryEmployeeName = (objSearchParams.get("employeeName") || "").trim();
  const strQueryFinancialYearCode = (objSearchParams.get("fy") || "").trim();
  const strQueryRegime = (objSearchParams.get("regime") || "").trim();
  const blnQueryAutoload = (objSearchParams.get("autoload") || "").trim() === "1";

  const intPageCount = Math.max(1, Math.ceil(lstRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = useMemo(
    () => lstRows.slice(intStartIndex, intStartIndex + intRowsPerPage),
    [intStartIndex, intRowsPerPage, lstRows],
  );

  const lstFyOptions = useMemo(() => {
    return [
      normalizeFinancialYearCode(getCurrentFinancialYearCode()),
      normalizeFinancialYearCode(getNextFinancialYearCode()),
    ];
  }, []);
  const setDeclaredFyForSelectedEmployee = useMemo(() => {
    const setCodes = new Set<string>();
    for (const objRow of lstRows) {
      setCodes.add(normalizeFinancialYearCode(objRow.strFinancialYearCode));
    }
    return setCodes;
  }, [lstRows]);

  async function loadEmployees() {
    setBlnEmployeeLoading(true);
    try {
      const lstData = await hrItDeclarationService.listEmployees({ strSearch: strEmployeeLookup });
      setLstEmployees(lstData);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load employees.");
    } finally {
      setBlnEmployeeLoading(false);
    }
  }

  async function loadDeclarations(objFilters?: {
    objEmployee?: HrItDeclarationEmployeeOption | null;
    strFinancialYearCode?: string;
    strRegime?: ItDeclarationRegime;
  }) {
    const objEmployee = objFilters?.objEmployee ?? objSearchEmployee;
    const strFinancialYearCode = objFilters?.strFinancialYearCode ?? strSearchFinancialYearCode;
    const strRegime = objFilters?.strRegime ?? strSearchRegime;
    if (!objEmployee?.intEmployeeID) {
      setBlnHasSearched(true);
      setLstRows([]);
      return;
    }
    setBlnListLoading(true);
    setBlnHasSearched(true);
    setStrError("");
    try {
      const objData = await hrItDeclarationService.getEmployeeDeclarations(
        objEmployee.intEmployeeID,
        strFinancialYearCode.trim() || undefined,
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(strHrListFilterStorageKey, JSON.stringify({
          objEmployee,
          strFinancialYearCode,
          strRegime,
        }));
      }
      setLstRows((objData.lstRows ?? []).filter((objRow) => matchesRegime(objRow, strRegime)));
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load IT declarations.");
      setLstRows([]);
    } finally {
      setBlnListLoading(false);
    }
  }

  function buildReturnTo(objEmployee: HrItDeclarationEmployeeOption, strFinancialYearCode: string, strRegime: ItDeclarationRegime) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(strHrListFilterStorageKey, JSON.stringify({
        objEmployee,
        strFinancialYearCode: normalizeFinancialYearCode(strFinancialYearCode),
        strRegime,
      }));
    }
    const objReturnParams = new URLSearchParams({
      employeeId: String(objEmployee.intEmployeeID),
      employeeCode: objEmployee.strEmployeeCode || "",
      employeeName: objEmployee.strFullName || "",
      fy: normalizeFinancialYearCode(strFinancialYearCode),
      regime: strRegime,
      autoload: "1",
    });
    return `/hr/it-declaration?${objReturnParams.toString()}`;
  }

  function openDeclaration(objRow: HrEmployeeItDeclarationListRecord) {
    if (!objSearchEmployee?.intEmployeeID) return;
    const strParams = new URLSearchParams({
      employeeId: String(objSearchEmployee.intEmployeeID),
      declarationId: String(objRow.intDeclarationID),
      fy: normalizeFinancialYearCode(objRow.strFinancialYearCode || strSearchFinancialYearCode),
      regime: strSearchRegime,
      returnTo: buildReturnTo(objSearchEmployee, strSearchFinancialYearCode || objRow.strFinancialYearCode, strSearchRegime),
    });
    objRouter.push(`/hr/it-declaration/declaration?${strParams.toString()}`);
  }

  function openAddDeclarationDialog() {
    setObjAddEmployee(objSearchEmployee);
    setStrAddRegime(strSearchRegime || "Old Regime");
    setStrAddFinancialYearCode(strSearchFinancialYearCode || lstFyOptions[0] || normalizeFinancialYearCode(getCurrentFinancialYearCode()));
    setBlnAddDialogOpen(true);
  }

  async function createFromDialog() {
    if (!objAddEmployee?.intEmployeeID || !strAddFinancialYearCode) return;
    const strNormalizedFy = normalizeFinancialYearCode(strAddFinancialYearCode);
    const objExistingDeclaration = lstRows.find((objRow) =>
      normalizeFinancialYearCode(objRow.strFinancialYearCode) === strNormalizedFy && matchesRegime(objRow, strAddRegime),
    );
    const strReturnTo = buildReturnTo(objAddEmployee, strNormalizedFy, strAddRegime);
    if (objExistingDeclaration) {
      const strParams = new URLSearchParams({
        employeeId: String(objAddEmployee.intEmployeeID),
        declarationId: String(objExistingDeclaration.intDeclarationID),
        fy: strNormalizedFy,
        regime: strAddRegime,
        returnTo: strReturnTo,
      });
      objRouter.push(`/hr/it-declaration/declaration?${strParams.toString()}`);
      return;
    }
    const strParams = new URLSearchParams({
      employeeId: String(objAddEmployee.intEmployeeID),
      fy: strNormalizedFy,
      regime: strAddRegime,
      returnTo: strReturnTo,
    });
    objRouter.push(`/hr/it-declaration/declaration?${strParams.toString()}`);
  }

  useEffect(() => {
    const intTimer = window.setTimeout(() => {
      void loadEmployees();
    }, 250);
    return () => window.clearTimeout(intTimer);
  }, [strEmployeeLookup]);

  useEffect(() => {
    const hydrateFromFilters = (objEmployeeOption: HrItDeclarationEmployeeOption | null, strFinancialYearCode: string, strRegime: ItDeclarationRegime, blnAutoload: boolean) => {
      setObjSearchEmployee(objEmployeeOption);
      setObjAddEmployee(objEmployeeOption);
      setStrSearchFinancialYearCode(strFinancialYearCode);
      setStrAddFinancialYearCode(strFinancialYearCode || lstFyOptions[0] || normalizeFinancialYearCode(getCurrentFinancialYearCode()));
      setStrSearchRegime(strRegime);
      setStrAddRegime(strRegime);
      setBlnFiltersHydrated(true);
      if (blnAutoload && objEmployeeOption?.intEmployeeID) {
        void loadDeclarations({
          objEmployee: objEmployeeOption,
          strFinancialYearCode,
          strRegime,
        });
      }
    };

    const intEmployeeID = Number(strQueryEmployeeId || 0);
    if (intEmployeeID) {
      const objEmployeeOption: HrItDeclarationEmployeeOption = {
        intEmployeeID,
        strEmployeeCode: strQueryEmployeeCode,
        strFullName: strQueryEmployeeName,
      };
      const strNormalizedFy = normalizeFinancialYearCode(strQueryFinancialYearCode);
      const strNormalizedRegime: ItDeclarationRegime = strQueryRegime === "New Regime" ? "New Regime" : "Old Regime";
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(strHrListFilterStorageKey, JSON.stringify({
          objEmployee: objEmployeeOption,
          strFinancialYearCode: strNormalizedFy,
          strRegime: strNormalizedRegime,
        }));
      }
      hydrateFromFilters(objEmployeeOption, strNormalizedFy, strNormalizedRegime, blnQueryAutoload);
      return;
    }
    if (typeof window === "undefined") {
      setBlnFiltersHydrated(true);
      return;
    }
    const strStoredFilters = window.sessionStorage.getItem(strHrListFilterStorageKey);
    if (!strStoredFilters) {
      setBlnFiltersHydrated(true);
      return;
    }
    try {
      const objStoredFilters = JSON.parse(strStoredFilters) as {
        objEmployee?: HrItDeclarationEmployeeOption | null;
        strFinancialYearCode?: string;
        strRegime?: ItDeclarationRegime;
      };
      const objEmployeeOption = objStoredFilters.objEmployee ?? null;
      const strNormalizedFy = normalizeFinancialYearCode(objStoredFilters.strFinancialYearCode);
      const strNormalizedRegime: ItDeclarationRegime = objStoredFilters.strRegime === "New Regime" ? "New Regime" : "Old Regime";
      hydrateFromFilters(objEmployeeOption, strNormalizedFy, strNormalizedRegime, Boolean(objEmployeeOption?.intEmployeeID));
    } catch {
      window.sessionStorage.removeItem(strHrListFilterStorageKey);
      setBlnFiltersHydrated(true);
    }
  }, [blnQueryAutoload, lstFyOptions, strQueryEmployeeCode, strQueryEmployeeId, strQueryEmployeeName, strQueryFinancialYearCode, strQueryRegime]);

  return (
    <Stack spacing={0.8} className={styles.page}>
      {blnListLoading ? <BlockingLoader blnOpen strLabel="Loading IT declarations..." /> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Paper
        className={styles.controlsCard}
        sx={{
          p: 1.2,
          borderRadius: "12px",
          border: "1px solid #1e3a8a !important",
          background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%) !important",
          boxShadow: "0 8px 20px rgba(11, 47, 99, 0.22)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.08rem", color: "#f8fcff" }}>IT Declaration</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              HR employee declaration workspace
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineRoundedIcon />}
              onClick={openAddDeclarationDialog}
              sx={{
                minHeight: 34,
                px: 1.6,
                borderRadius: "9px",
                textTransform: "none",
                fontWeight: 800,
                color: "#111827",
                backgroundColor: "#f59e0b",
                boxShadow: "none",
                "&:hover": { backgroundColor: "#d97706", boxShadow: "none" },
              }}
            >
              Add Declaration
            </Button>
            <Box sx={{ border: "1px solid rgba(255,255,255,0.45)", borderRadius: "8px", px: 1, py: 0.55, minWidth: 112, backgroundColor: "rgba(8,47,73,0.28)" }}>
              <Typography sx={{ color: "rgba(226,232,240,0.95)", fontSize: "0.72rem", lineHeight: 1 }}>Records</Typography>
              <Typography sx={{ color: "#ffffff", fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.2, mt: 0.2 }}>{lstRows.length}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Paper className={styles.controlsCard} sx={{ p: 1.2, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
        <Box className={styles.searchRow}>
          <Autocomplete
            options={lstEmployees}
            value={objSearchEmployee}
            loading={blnEmployeeLoading}
            onInputChange={(_, strValue) => setStrEmployeeLookup(strValue)}
            onChange={(_, objValue) => setObjSearchEmployee(objValue)}
            getOptionLabel={(objOption) => [objOption.strEmployeeCode, objOption.strFullName].filter(Boolean).join(" - ")}
            isOptionEqualToValue={(objOption, objValue) => objOption.intEmployeeID === objValue.intEmployeeID}
            renderInput={(objParams) => (
              <TextField
                {...objParams}
                data-testid="salary.hr-it-declarations.search.employee.select"
                size="small"
                required
                label="Employee"
                fullWidth
                InputProps={{
                  ...objParams.InputProps,
                  endAdornment: (
                    <>
                      {blnEmployeeLoading ? <CircularProgress color="inherit" size={16} /> : null}
                      {objParams.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
          <TextField
            data-testid="salary.hr-it-declarations.search.financial-year.select"
            select
            size="small"
            label="Financial Year"
            value={strSearchFinancialYearCode}
            onChange={(objEvent) => setStrSearchFinancialYearCode(objEvent.target.value)}
            fullWidth
          >
            {lstFyOptions.map((strFy) => (
              <MenuItem key={strFy} value={strFy}>{strFy}</MenuItem>
            ))}
          </TextField>
          <TextField
            data-testid="salary.hr-it-declarations.search.regime.select"
            select
            size="small"
            label="Tax Regime"
            value={strSearchRegime}
            onChange={(objEvent) => setStrSearchRegime(objEvent.target.value as ItDeclarationRegime)}
            fullWidth
          >
            {lstRegimeOptions.map((strRegime) => (
              <MenuItem key={strRegime} value={strRegime}>{strRegime}</MenuItem>
            ))}
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              disabled={!objSearchEmployee?.intEmployeeID}
              onClick={() => void loadDeclarations()}
            >
              Search
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box className={styles.tableCard} sx={{ mt: 0 }}>
        {lstRows.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, pb: 1, justifyContent: "flex-end" }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>Rows per page</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstRows.length)} of {lstRows.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_objEvent, intValue) => setIntPage(intValue)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Declaration</th>
                <th>Financial Year</th>
                <th>Tax Regime</th>
                <th>Declared</th>
                <th>Approved</th>
                <th>Proof Pending</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lstRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <Typography sx={{ py: 3, textAlign: "center", color: "#64748b", fontSize: "0.86rem" }}>
                      {blnHasSearched || (blnFiltersHydrated && objSearchEmployee?.intEmployeeID) ? "No IT declarations found for the selected filters." : "Select employee, financial year, tax regime and click Search."}
                    </Typography>
                  </td>
                </tr>
              ) : (
                lstVisibleRows.map((objRow) => (
                  <tr key={objRow.intDeclarationID}>
                    <td>{objRow.strDeclarationCode}</td>
                    <td>{objRow.strFinancialYearCode}</td>
                    <td>{objRow.strTaxRegime || "-"}</td>
                    <td>{formatCurrency(objRow.decDeclaredTotalAmount)}</td>
                    <td>{formatCurrency(objRow.decApprovedTotalAmount)}</td>
                    <td>{objRow.intProofPendingCount}</td>
                    <td><ITDeclarationStatusBadge strStatus={objRow.strStatus || "draft"} /></td>
                    <td>{formatDateLabel(objRow.strLastUpdated)}</td>
                    <td>
                      <Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => openDeclaration(objRow)} sx={{ textTransform: "none", fontWeight: 800 }}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      <Dialog open={blnAddDialogOpen} onClose={() => setBlnAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Declaration</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.2}>
            <Autocomplete
              options={lstEmployees}
              value={objAddEmployee}
              loading={blnEmployeeLoading}
              onInputChange={(_, strValue) => setStrEmployeeLookup(strValue)}
              onChange={(_, objValue) => setObjAddEmployee(objValue)}
              getOptionLabel={(objOption) => [objOption.strEmployeeCode, objOption.strFullName].filter(Boolean).join(" - ")}
              isOptionEqualToValue={(objOption, objValue) => objOption.intEmployeeID === objValue.intEmployeeID}
              renderInput={(objParams) => (
                <TextField
                  {...objParams}
                  size="small"
                  required
                  label="Employee"
                  InputProps={{
                    ...objParams.InputProps,
                    endAdornment: (
                      <>
                        {blnEmployeeLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {objParams.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              select
              label="Financial Year"
              value={strAddFinancialYearCode}
              onChange={(objEvent) => setStrAddFinancialYearCode(objEvent.target.value)}
              size="small"
              fullWidth
            >
              {lstFyOptions.map((strFy) => (
                <MenuItem key={strFy} value={strFy} disabled={setDeclaredFyForSelectedEmployee.has(strFy)}>
                  {strFy} {setDeclaredFyForSelectedEmployee.has(strFy) ? "(Already exists)" : ""}
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
              {lstRegimeOptions.map((strRegime) => (
                <MenuItem key={strRegime} value={strRegime}>{strRegime}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!objAddEmployee?.intEmployeeID || !strAddFinancialYearCode} onClick={() => void createFromDialog()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
