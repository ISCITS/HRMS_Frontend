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
  Stack,
  TextField,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import {
  hrItDeclarationService,
  type HrEmployeeItDeclarationListRecord,
  type HrItDeclarationEmployeeOption,
  type ItDeclarationRegime,
} from "@/features/it-declaration/services/itDeclarationService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstRegimeOptions: ItDeclarationRegime[] = ["Old Regime", "New Regime"];
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
  const { t } = useModuleLabels("it-declaration", "Unable to load IT declaration labels.");
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(["HR_IT_DECLARATION"]);

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
  const [blnFiltersHydrated, setBlnFiltersHydrated] = useState(false);

  const strQueryEmployeeId = (objSearchParams.get("employeeId") || "").trim();
  const strQueryEmployeeCode = (objSearchParams.get("employeeCode") || "").trim();
  const strQueryEmployeeName = (objSearchParams.get("employeeName") || "").trim();
  const strQueryFinancialYearCode = (objSearchParams.get("fy") || "").trim();
  const strQueryRegime = (objSearchParams.get("regime") || "").trim();
  const blnQueryAutoload = (objSearchParams.get("autoload") || "").trim() === "1";

  const blnCanView = canViewAny() || canDoAny("view");
  const blnCanAdd = canDoAny("add");

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

  function getRegimeLabel(strRegime: ItDeclarationRegime) {
    return strRegime === "New Regime"
      ? t("IT_DECLARATION_NEW_REGIME", "New Regime")
      : t("IT_DECLARATION_OLD_REGIME", "Old Regime");
  }

  function getStatusLabel(strStatus?: string | null) {
    const strNormalized = String(strStatus || "draft").trim().toLowerCase().replace(/\s+/g, "_");
    const dicStatusKeys: Record<string, [string, string]> = {
      submitted: ["IT_DECLARATION_SUBMITTED", "Submitted"],
      under_review: ["IT_DECLARATION_UNDER_REVIEW", "Under Review"],
      proof_pending: ["IT_DECLARATION_PROOF_PENDING", "Proof Pending"],
      approved: ["IT_DECLARATION_APPROVED", "Approved"],
      partially_approved: ["IT_DECLARATION_PARTIALLY_APPROVED", "Partially Approved"],
      released: ["IT_DECLARATION_RELEASED", "Released"],
      resubmitted: ["IT_DECLARATION_RESUBMITTED", "Resubmitted"],
      locked: ["IT_DECLARATION_LOCKED", "Locked"],
      rejected: ["IT_DECLARATION_REJECTED", "Rejected"],
      draft: ["IT_DECLARATION_DRAFT", "Draft"],
    };
    const [strKey, strFallback] = dicStatusKeys[strNormalized] ?? ["IT_DECLARATION_DRAFT", "Draft"];
    return t(strKey, strFallback);
  }

  async function loadEmployees() {
    setBlnEmployeeLoading(true);
    try {
      const lstData = await hrItDeclarationService.listEmployees({ strSearch: strEmployeeLookup });
      setLstEmployees(lstData);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("IT_DECLARATION_UNABLE_LOAD_EMPLOYEES", "Unable to load employees."));
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
    setBlnListLoading(true);
    setBlnHasSearched(true);
    setStrError("");
    try {
      const objData = await hrItDeclarationService.getEmployeeDeclarations(
        objEmployee?.intEmployeeID,
        strFinancialYearCode.trim() || undefined,
        strRegime,
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(strHrListFilterStorageKey, JSON.stringify({
          objEmployee,
          strFinancialYearCode,
          strRegime,
        }));
      }
      setLstRows(objData.lstRows ?? []);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("IT_DECLARATION_UNABLE_LOAD_IT_DECLARATIONS", "Unable to load IT declarations."));
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
    const intEmployeeID = Number(objRow.intEmployeeID || objSearchEmployee?.intEmployeeID || 0);
    if (!intEmployeeID) return;
    const strParams = new URLSearchParams({
      employeeId: String(intEmployeeID),
      declarationId: String(objRow.intDeclarationID),
      fy: normalizeFinancialYearCode(objRow.strFinancialYearCode || strSearchFinancialYearCode),
      regime: strSearchRegime,
      returnTo: buildReturnTo(
        {
          intEmployeeID,
          strEmployeeCode: String(objRow.strEmployeeCode || objSearchEmployee?.strEmployeeCode || ""),
          strFullName: String(objRow.strFullName || objSearchEmployee?.strFullName || ""),
          boolHasDeclaration: true,
        },
        strSearchFinancialYearCode || objRow.strFinancialYearCode,
        strSearchRegime,
      ),
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
    if (blnRightsLoading || !blnCanView) return;
    const intTimer = window.setTimeout(() => {
      void loadEmployees();
    }, 250);
    return () => window.clearTimeout(intTimer);
  }, [blnCanView, blnRightsLoading, strEmployeeLookup]);

  useEffect(() => {
    const hydrateFromFilters = (objEmployeeOption: HrItDeclarationEmployeeOption | null, strFinancialYearCode: string, strRegime: ItDeclarationRegime, blnAutoload: boolean) => {
      setObjSearchEmployee(objEmployeeOption);
      setObjAddEmployee(objEmployeeOption);
      setStrSearchFinancialYearCode(strFinancialYearCode);
      setStrAddFinancialYearCode(strFinancialYearCode || lstFyOptions[0] || normalizeFinancialYearCode(getCurrentFinancialYearCode()));
      setStrSearchRegime(strRegime);
      setStrAddRegime(strRegime);
      setBlnFiltersHydrated(true);
      if (blnAutoload && !blnRightsLoading && blnCanView) {
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
        boolHasDeclaration: false,
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
      hydrateFromFilters(objEmployeeOption, strNormalizedFy, strNormalizedRegime, true);
    } catch {
      window.sessionStorage.removeItem(strHrListFilterStorageKey);
      setBlnFiltersHydrated(true);
    }
  }, [blnCanView, blnQueryAutoload, blnRightsLoading, lstFyOptions, strQueryEmployeeCode, strQueryEmployeeId, strQueryEmployeeName, strQueryFinancialYearCode, strQueryRegime]);

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => ({
        id: objRow.intDeclarationID,
        strDeclaration: objRow.strDeclarationCode,
        strEmployee: [objRow.strEmployeeCode, objRow.strFullName].filter(Boolean).join(" - ") || "-",
        strFinancialYearCode: objRow.strFinancialYearCode,
        strTaxRegime: objRow.strTaxRegime === "New Regime" ? getRegimeLabel("New Regime") : objRow.strTaxRegime === "Old Regime" ? getRegimeLabel("Old Regime") : "-",
        decDeclared: formatCurrency(objRow.decDeclaredTotalAmount),
        decApproved: formatCurrency(objRow.decApprovedTotalAmount),
        intProofPendingCount: objRow.intProofPendingCount,
        strStatus: <ITDeclarationStatusBadge strStatus={objRow.strStatus || "draft"} strLabel={getStatusLabel(objRow.strStatus)} />,
        strStatusSort: objRow.strStatus || "",
        strLastUpdated: formatDateLabel(objRow.strLastUpdated),
        strLastUpdatedSort: objRow.strLastUpdated || "",
        action: (
          <Button
            size="small"
            startIcon={<VisibilityRoundedIcon />}
            disabled={!blnCanView}
            onClick={() => openDeclaration(objRow)}
            controlId="hr-it-declaration.list.row.view.button"
            data-row-key={objRow.intDeclarationID}
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {t("IT_DECLARATION_VIEW", "View")}
          </Button>
        ),
      })),
    [lstRows, blnCanView, t, getRegimeLabel, getStatusLabel, openDeclaration]
  );

  const lstTableColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
    { field: "strDeclaration", headerName: t("IT_DECLARATION_DECLARATION", "Declaration"), width: 150 },
    { field: "strEmployee", headerName: t("IT_DECLARATION_EMPLOYEE", "Employee"), width: 220 },
    { field: "strFinancialYearCode", headerName: t("IT_DECLARATION_FINANCIAL_YEAR", "Financial Year"), width: 140 },
    { field: "strTaxRegime", headerName: t("IT_DECLARATION_TAX_REGIME", "Tax Regime"), width: 140 },
    { field: "decDeclared", headerName: t("IT_DECLARATION_DECLARED", "Declared"), align: "right", width: 150 },
    { field: "decApproved", headerName: t("IT_DECLARATION_APPROVED", "Approved"), align: "right", width: 150 },
    { field: "intProofPendingCount", headerName: t("IT_DECLARATION_PROOF_PENDING", "Proof Pending"), align: "right", width: 140 },
    { field: "strStatus", headerName: t("IT_DECLARATION_STATUS", "Status"), filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strStatusSort) },
    { field: "strLastUpdated", headerName: t("IT_DECLARATION_LAST_UPDATED", "Last Updated"), width: 150, sortAccessor: (objRow) => String(objRow.strLastUpdatedSort) },
    { field: "action", headerName: t("IT_DECLARATION_ACTION", "Action"), align: "center", sortable: false, filterable: false, exportable: false, width: 110 },
  ];

  return (
    <Box className={styles.page}>
      {(blnListLoading || blnRightsLoading) ? <BlockingLoader blnOpen strLabel={t("IT_DECLARATION_LOADING_IT_DECLARATIONS", "Loading IT declarations...")} /> : null}
      {!blnRightsLoading && !blnCanView ? <Alert severity="warning">{t("IT_DECLARATION_NO_PERMISSION", "You do not have permission to view this screen.")}</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Box className={styles.controlsCard}>
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
                data-controlid="salary.hr-it-declarations.search.employee.select"
                size="small"
                required
                label={t("IT_DECLARATION_EMPLOYEE", "Employee")}
                fullWidth
                inputProps={{
                  ...objParams.inputProps,
                  "data-controlid": "salary.hr-it-declarations.search.employee.select",
                }}
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
            data-controlid="salary.hr-it-declarations.search.financial-year.select"
            select
            size="small"
            label={t("IT_DECLARATION_FINANCIAL_YEAR", "Financial Year")}
            value={strSearchFinancialYearCode}
            onChange={(objEvent) => setStrSearchFinancialYearCode(objEvent.target.value)}
            fullWidth
            inputProps={{ "data-controlid": "salary.hr-it-declarations.search.financial-year.select" }}
          >
            {lstFyOptions.map((strFy) => (
              <MenuItem key={strFy} value={strFy}>{strFy}</MenuItem>
            ))}
          </TextField>
          <TextField
            data-controlid="salary.hr-it-declarations.search.regime.select"
            select
            size="small"
            label={t("IT_DECLARATION_TAX_REGIME", "Tax Regime")}
            value={strSearchRegime}
            onChange={(objEvent) => setStrSearchRegime(objEvent.target.value as ItDeclarationRegime)}
            fullWidth
            inputProps={{ "data-controlid": "salary.hr-it-declarations.search.regime.select" }}
          >
            {lstRegimeOptions.map((strRegime) => (
              <MenuItem key={strRegime} value={strRegime}>{getRegimeLabel(strRegime)}</MenuItem>
            ))}
          </TextField>
          <Box className={styles.searchActions}>
            {blnCanView ? (
              <Button
                className={styles.primaryButton}
                variant="contained"
                startIcon={<SearchRoundedIcon />}
                onClick={() => void loadDeclarations()}
              >
                {t("IT_DECLARATION_SEARCH", "Search")}
              </Button>
            ) : null}
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          showPaginationSummary
          minTableWidth={1400}
          toolbarLeft={(
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              {blnCanAdd ? (
                <Button
                  className={styles.primaryButton}
                  startIcon={<AddCircleOutlineRoundedIcon />}
                  onClick={openAddDeclarationDialog}
                  controlId="hr-it-declaration.list.add.button"
                >
                  {t("IT_DECLARATION_ADD_DECLARATION", "Add Declaration")}
                </Button>
              ) : null}
            </Box>
          )}
          emptyMessage={
            blnHasSearched || blnFiltersHydrated
              ? t("IT_DECLARATION_NO_RECORDS_SELECTED_FILTERS", "No IT declarations found for the selected filters.")
              : t("IT_DECLARATION_SELECT_FILTERS_AND_SEARCH", "Select filters and click Search.")
          }
          testIdPrefix="hr-it-declaration.list"
          withPaper={false}
        />
      </Box>

      <Dialog open={blnAddDialogOpen} onClose={() => setBlnAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("IT_DECLARATION_ADD_DECLARATION", "Add Declaration")}</DialogTitle>
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
                  label={t("IT_DECLARATION_EMPLOYEE", "Employee")}
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
              label={t("IT_DECLARATION_FINANCIAL_YEAR", "Financial Year")}
              value={strAddFinancialYearCode}
              onChange={(objEvent) => setStrAddFinancialYearCode(objEvent.target.value)}
              size="small"
              fullWidth
            >
              {lstFyOptions.map((strFy) => (
                <MenuItem key={strFy} value={strFy} disabled={setDeclaredFyForSelectedEmployee.has(strFy)}>
                  {strFy} {setDeclaredFyForSelectedEmployee.has(strFy) ? t("IT_DECLARATION_ALREADY_EXISTS", "(Already exists)") : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("IT_DECLARATION_TAX_REGIME", "Tax Regime")}
              value={strAddRegime}
              onChange={(objEvent) => setStrAddRegime(objEvent.target.value as ItDeclarationRegime)}
              size="small"
              fullWidth
            >
              {lstRegimeOptions.map((strRegime) => (
                <MenuItem key={strRegime} value={strRegime}>{getRegimeLabel(strRegime)}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setBlnAddDialogOpen(false)}>{t("IT_DECLARATION_CANCEL", "Cancel")}</Button>
          <Button className={styles.primaryButton} variant="contained" disabled={!objAddEmployee?.intEmployeeID || !strAddFinancialYearCode} onClick={() => void createFromDialog()}>
            {t("IT_DECLARATION_CREATE", "Create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
