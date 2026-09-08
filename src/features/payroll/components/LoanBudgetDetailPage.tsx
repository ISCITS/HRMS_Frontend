"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, FormControlLabel, MenuItem, Pagination, Radio, RadioGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { createInitialLoanBudgetForm, loanBudgetService, toLoanBudgetForm } from "@/features/payroll/services/loanBudgetService";
import type { LoanBudgetDesignationScope, LoanBudgetFormValues, LoanBudgetSummaryRecord } from "@/features/payroll/types";

const lstModuleCodes = ["LOAN_BUDGET", "PAYROLL_LOAN_BUDGET"];

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function currentFinancialYearStart() {
  const objToday = new Date();
  return objToday.getMonth() < 3 ? objToday.getFullYear() - 1 : objToday.getFullYear();
}

function defaultNextFinancialYear() {
  const intStartYear = currentFinancialYearStart();
  return `${intStartYear}-${String(intStartYear + 1).slice(-2)}`;
}

// A handful of years around "now" is enough for the header dropdown -- always includes
// whichever FY is currently being viewed/edited even if it falls outside that window.
function buildFinancialYearOptions(strIncludeFinancialYear?: string): string[] {
  const intCurrentStartYear = currentFinancialYearStart();
  const objYears = new Set<string>();
  for (let intOffset = -5; intOffset <= 2; intOffset++) {
    const intStartYear = intCurrentStartYear + intOffset;
    objYears.add(`${intStartYear}-${String(intStartYear + 1).slice(-2)}`);
  }
  if (strIncludeFinancialYear) {
    objYears.add(strIncludeFinancialYear);
  }
  return Array.from(objYears).sort();
}

// Same rule the backend re-checks on save: an employee-specific override may adjust within its
// designation's own limit, never past it. Returns the first offending row + employee, if any.
function findExceedingEmployeeOverride(lstRows: LoanBudgetFormValues["lstDesignationLimits"]) {
  for (const objRow of lstRows) {
    if (objRow.strEmployeeScope !== "specific") continue;
    const decDesignationLimit = Number(objRow.decLimitAmount || 0);
    const objEmployee = objRow.lstEmployees.find((objCandidate) => Number(objCandidate.decLimitAmount || 0) > decDesignationLimit);
    if (objEmployee) {
      return { objRow, objEmployee, decDesignationLimit, decEmployeeLimit: Number(objEmployee.decLimitAmount || 0) };
    }
  }
  return null;
}

// Same rule the backend re-checks on save: each row contributes either its own limit, or --
// when it's carrying employee-specific overrides -- the sum of those overrides instead.
function computeConfiguredLimitTotal(lstRows: LoanBudgetFormValues["lstDesignationLimits"]): number {
  return lstRows.reduce((decTotal, objRow) => {
    if (objRow.strEmployeeScope === "specific" && objRow.lstEmployees.length > 0) {
      return decTotal + objRow.lstEmployees.reduce((decSum, objEmployee) => decSum + Number(objEmployee.decLimitAmount || 0), 0);
    }
    return decTotal + Number(objRow.decLimitAmount || 0);
  }, 0);
}

function mirrorSharedLimit(lstRows: LoanBudgetFormValues["lstDesignationLimits"], strValue: string) {
  return lstRows.map((objRow) => ({
    ...objRow,
    decLimitAmount: strValue,
    lstEmployees: objRow.strEmployeeScope === "all" ? objRow.lstEmployees.map((objEmployee) => ({ ...objEmployee, decLimitAmount: strValue })) : objRow.lstEmployees,
  }));
}

export default function LoanBudgetDetailPage({
  strFinancialYear,
  onBack,
  onSaved,
}: {
  strFinancialYear?: string;
  onBack: () => void;
  onSaved: (strFinancialYear: string) => void;
}) {
  const blnEditMode = Boolean(strFinancialYear);
  const { t, blnLoadingLabels } = useModuleLabels("loan-budget");
  const { canDoAny, blnLoading: blnRightsLoading } = useModuleActionAccess(lstModuleCodes);
  const blnCanEdit = ["loan_budget_create", "loan_budget_edit"].some((strAlias) => canDoAny(strAlias));

  const [dicValues, setDicValues] = useState<LoanBudgetFormValues>(createInitialLoanBudgetForm(strFinancialYear || defaultNextFinancialYear()));
  const [objSummary, setObjSummary] = useState<LoanBudgetSummaryRecord | null>(null);
  const [lstDesignationOptions, setLstDesignationOptions] = useState<{ intID: number; strDesignationName: string }[]>([]);
  const [blnBudgetStarted, setBlnBudgetStarted] = useState(blnEditMode);
  // Tracks which rows' employee lists are expanded -- empty by default so every row starts
  // collapsed, including ones added later by the designation auto-fill effect.
  const [objExpandedDesignationRows, setObjExpandedDesignationRows] = useState<Set<number>>(new Set());
  const [blnLoading, setBlnLoading] = useState(blnEditMode);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  // Gates the designation auto-fill effect below until the existing record (if any) has finished
  // loading -- otherwise it would race the record load and fill in designations using the still-
  // empty initial form, only to have that load immediately overwrite them.
  const [blnRecordLoaded, setBlnRecordLoaded] = useState(!blnEditMode);
  const blnPopulatingDesignationsRef = useRef(false);
  const lstFinancialYearOptions = useMemo(() => buildFinancialYearOptions(strFinancialYear), [strFinancialYear]);
  const [strDesignationSortBy, setStrDesignationSortBy] = useState<"designation" | "limit" | null>(null);
  const [strDesignationSortDirection, setStrDesignationSortDirection] = useState<"asc" | "desc">("asc");

  function handleDesignationSort(strColumn: "designation" | "limit") {
    if (strDesignationSortBy === strColumn) {
      setStrDesignationSortDirection((strPrev) => (strPrev === "asc" ? "desc" : "asc"));
    } else {
      setStrDesignationSortBy(strColumn);
      setStrDesignationSortDirection("asc");
    }
  }

  // Sorts by display order only -- each entry keeps its original array index, so every handler
  // below (which addresses rows/employees by that index) and the expand/collapse state (also
  // keyed by index) stay correctly attached to their row regardless of sort order.
  const lstSortedDesignationLimits = useMemo(() => {
    const lstIndexed = dicValues.lstDesignationLimits.map((objRow, intIndex) => ({ objRow, intIndex }));
    if (!strDesignationSortBy) return lstIndexed;
    const intDirection = strDesignationSortDirection === "asc" ? 1 : -1;
    return [...lstIndexed].sort((objA, objB) => {
      if (strDesignationSortBy === "limit") {
        return (Number(objA.objRow.decLimitAmount || 0) - Number(objB.objRow.decLimitAmount || 0)) * intDirection;
      }
      const strNameA = lstDesignationOptions.find((objOption) => objOption.intID === objA.objRow.intDesignationID)?.strDesignationName || "";
      const strNameB = lstDesignationOptions.find((objOption) => objOption.intID === objB.objRow.intDesignationID)?.strDesignationName || "";
      return strNameA.localeCompare(strNameB) * intDirection;
    });
  }, [dicValues.lstDesignationLimits, strDesignationSortBy, strDesignationSortDirection, lstDesignationOptions]);

  // Pagination is over designation rows only -- each page still renders every employee sub-row
  // for the designations on it, exactly like sort keeps them, so a designation is never split
  // from its own employees across a page boundary.
  const [intDesignationPage, setIntDesignationPage] = useState(0);
  const [intDesignationRowsPerPage, setIntDesignationRowsPerPage] = useState(5);
  const intDesignationPageCount = Math.max(1, Math.ceil(lstSortedDesignationLimits.length / intDesignationRowsPerPage));
  const intClampedDesignationPage = Math.min(intDesignationPage, intDesignationPageCount - 1);
  const lstPagedDesignationLimits = useMemo(
    () => lstSortedDesignationLimits.slice(intClampedDesignationPage * intDesignationRowsPerPage, (intClampedDesignationPage + 1) * intDesignationRowsPerPage),
    [lstSortedDesignationLimits, intClampedDesignationPage, intDesignationRowsPerPage]
  );

  useEffect(() => {
    loanBudgetService.listDesignationOptions().then(setLstDesignationOptions).catch(() => setLstDesignationOptions([]));
  }, []);

  useEffect(() => {
    if (!blnEditMode || !strFinancialYear) return;
    setBlnLoading(true);
    loanBudgetService
      .getBudget(strFinancialYear)
      .then((objRecord) => {
        setDicValues(toLoanBudgetForm(objRecord));
        setObjSummary(objRecord.objBudget);
        setBlnBudgetStarted(true);
      })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : t("error_load", "Unable to load this budget.")))
      .finally(() => {
        setBlnLoading(false);
        setBlnRecordLoaded(true);
      });
  }, [blnEditMode, strFinancialYear]);

  // Every real designation belongs in the Designation Limits section, whichever scope is picked --
  // there's no more "Add Designation" picker. Runs once budget-started + designation options +
  // (for an existing record) the saved rows are all in hand, and only adds whatever's still
  // missing -- so a budget saved before this feature existed, or before some designation existed,
  // gets topped up on load instead of silently showing a partial list.
  useEffect(() => {
    if (!blnBudgetStarted || !blnRecordLoaded || lstDesignationOptions.length === 0 || blnPopulatingDesignationsRef.current) return;
    const objExistingIDs = new Set(dicValues.lstDesignationLimits.map((objRow) => objRow.intDesignationID));
    const lstMissing = lstDesignationOptions.filter((objOption) => !objExistingIDs.has(objOption.intID));
    if (lstMissing.length === 0) return;
    blnPopulatingDesignationsRef.current = true;
    setBlnLoading(true);
    const strMirroredLimit = dicValues.strDesignationScope === "all" ? dicValues.lstDesignationLimits[0]?.decLimitAmount || "" : "";
    (async () => {
      try {
        const lstNewRows = await Promise.all(
          lstMissing.map(async (objOption) => {
            const lstEmployees = await loanBudgetService.listEmployeesInDesignation(objOption.intID).catch(() => []);
            return {
              intDesignationID: objOption.intID as number | "",
              decLimitAmount: strMirroredLimit,
              strEmployeeScope: "all" as const,
              lstEmployees: lstEmployees.map((objEmployee) => ({ ...objEmployee, decLimitAmount: strMirroredLimit })),
            };
          })
        );
        setDicValues((dicPrev) => ({ ...dicPrev, lstDesignationLimits: [...dicPrev.lstDesignationLimits, ...lstNewRows] }));
      } finally {
        blnPopulatingDesignationsRef.current = false;
        setBlnLoading(false);
      }
    })();
  }, [blnBudgetStarted, blnRecordLoaded, lstDesignationOptions]);

  // "Set Budget" just validates and opens up the designation-limits step -- the effect above does
  // the actual populating. The header Save button is the one and only place a request is written.
  function startBudgetProcess() {
    setStrError("");
    setStrSuccess("");
    if (!dicValues.strFinancialYear.trim()) {
      setStrError(t("error_fy_required", "Financial year is required."));
      return;
    }
    if (!dicValues.decTotalBudgetAmount || Number(dicValues.decTotalBudgetAmount) <= 0) {
      setStrError(t("error_amount_required", "Enter a budget amount greater than zero."));
      return;
    }
    setBlnBudgetStarted(true);
  }

  async function handleSave() {
    setStrError("");
    setStrSuccess("");
    const objExceeding = findExceedingEmployeeOverride(dicValues.lstDesignationLimits);
    if (objExceeding) {
      const strDesignationName = lstDesignationOptions.find((objOption) => objOption.intID === objExceeding.objRow.intDesignationID)?.strDesignationName || t("field_designation", "Designation");
      setStrError(
        t(
          "error_employee_limit_exceeds_designation",
          `${objExceeding.objEmployee.strEmployeeName}'s limit (${formatCurrency(objExceeding.decEmployeeLimit)}) exceeds the ${strDesignationName} designation limit (${formatCurrency(objExceeding.decDesignationLimit)}). Reduce the employee limit or raise the designation limit first.`
        )
      );
      return;
    }
    const decConfiguredTotal = computeConfiguredLimitTotal(dicValues.lstDesignationLimits);
    const decBudget = Number(dicValues.decTotalBudgetAmount || 0);
    if (decConfiguredTotal > decBudget) {
      setStrError(
        t(
          "error_limits_exceed_budget",
          `Configured designation/employee limits total ${formatCurrency(decConfiguredTotal)}, which exceeds the company budget amount ${formatCurrency(decBudget)}. Reduce the limits or increase the budget before saving.`
        )
      );
      return;
    }
    setBlnSaving(true);
    try {
      const objRecord = await loanBudgetService.saveBudget(dicValues);
      setObjSummary(objRecord.objBudget);
      setStrSuccess(t("message_saved", "Budget saved successfully."));
      onSaved(objRecord.objBudget.strFinancialYear);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_save", "Unable to save this budget."));
    } finally {
      setBlnSaving(false);
    }
  }

  // Company-level scope: "all" mirrors one shared limit across every designation row; "specific"
  // lets each designation keep its own. Switching to "all" mirrors the first row's current
  // amount (or blank) across the rest; switching to "specific" leaves whatever is there editable.
  function onDesignationScopeChange(strScope: LoanBudgetDesignationScope) {
    setDicValues((dicPrev) => ({
      ...dicPrev,
      strDesignationScope: strScope,
      lstDesignationLimits: strScope === "all" ? mirrorSharedLimit(dicPrev.lstDesignationLimits, dicPrev.lstDesignationLimits[0]?.decLimitAmount || "") : dicPrev.lstDesignationLimits,
    }));
  }

  function onSharedDesignationLimitChange(strValue: string) {
    setDicValues((dicPrev) => ({ ...dicPrev, lstDesignationLimits: mirrorSharedLimit(dicPrev.lstDesignationLimits, strValue) }));
  }

  function toggleDesignationRowEmployees(intIndex: number) {
    setObjExpandedDesignationRows((objPrev) => {
      const objNext = new Set(objPrev);
      if (objNext.has(intIndex)) {
        objNext.delete(intIndex);
      } else {
        objNext.add(intIndex);
      }
      return objNext;
    });
  }

  function onDesignationLimitChange(intIndex: number, strValue: string) {
    setDicValues((dicPrev) => ({
      ...dicPrev,
      lstDesignationLimits: dicPrev.lstDesignationLimits.map((objRow, i) =>
        i === intIndex
          ? { ...objRow, decLimitAmount: strValue, lstEmployees: objRow.strEmployeeScope === "all" ? objRow.lstEmployees.map((objEmployee) => ({ ...objEmployee, decLimitAmount: strValue })) : objRow.lstEmployees }
          : objRow
      ),
    }));
  }

  function onScopeChange(intIndex: number, strScope: "all" | "specific") {
    setDicValues((dicPrev) => ({
      ...dicPrev,
      lstDesignationLimits: dicPrev.lstDesignationLimits.map((objRow, i) =>
        i === intIndex ? { ...objRow, strEmployeeScope: strScope, lstEmployees: strScope === "all" ? objRow.lstEmployees.map((objEmployee) => ({ ...objEmployee, decLimitAmount: objRow.decLimitAmount })) : objRow.lstEmployees } : objRow
      ),
    }));
  }

  function onEmployeeLimitChange(intIndex: number, intEmployeeID: number, strValue: string) {
    setDicValues((dicPrev) => ({
      ...dicPrev,
      lstDesignationLimits: dicPrev.lstDesignationLimits.map((objRow, i) =>
        i === intIndex ? { ...objRow, lstEmployees: objRow.lstEmployees.map((objEmployee) => (objEmployee.intEmployeeID === intEmployeeID ? { ...objEmployee, decLimitAmount: strValue } : objEmployee)) } : objRow
      ),
    }));
  }

  return (
    <Box className={styles.page}>
      {/* Fixed header: compact inline summary on the left (edit mode only), Back + Save grouped
          on the right -- one row, never scrolls. No page title here by design; the sidebar/menu
          already names the screen. */}
      <Box className={styles.controlsCard} sx={{ py: 1, minHeight: 0 }}>
        <Box className={`${styles.controlsHeader} ${styles.detailHeader}`} sx={{ alignItems: "center", minHeight: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", flex: "1 1 auto", flexWrap: "wrap", gap: 3, pl: 2 }}>
            <TextField
              select
              size="small"
              label={t("field_financial_year", "Financial Year")}
              value={dicValues.strFinancialYear}
              onChange={(e) => setDicValues((d) => ({ ...d, strFinancialYear: e.target.value }))}
              disabled={blnEditMode}
              sx={{ minWidth: 150 }}
              controlId="loan-budget.detail.financial-year.select"
            >
              {lstFinancialYearOptions.map((strYear) => (
                <MenuItem key={strYear} value={strYear}>
                  {strYear}
                </MenuItem>
              ))}
            </TextField>
            {objSummary ? (
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 3.5, pr: 3 }}>
                {[
                  [t("summary_budget", "Total Company Budget"), formatCurrency(objSummary.decTotalBudgetAmount)],
                  [t("summary_outstanding", "Outstanding (this FY)"), formatCurrency(objSummary.decOutstandingTotal)],
                  [t("summary_approved", "Approved (this FY)"), formatCurrency(objSummary.decApprovedTotal)],
                  [t("summary_remaining", "Remaining"), formatCurrency(objSummary.decRemaining)],
                ].map(([strLabel, strValue], intIndex, lstAll) => (
                  <Box
                    key={strLabel}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.3,
                      pr: intIndex < lstAll.length - 1 ? 3.5 : 0,
                      borderRight: intIndex < lstAll.length - 1 ? "1px solid var(--app-divider-color)" : "none",
                    }}
                  >
                    <Typography sx={{ fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#64748b", m: 0, lineHeight: 1.3, whiteSpace: "nowrap" }}>{strLabel}</Typography>
                    <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", m: 0, lineHeight: 1.3, whiteSpace: "nowrap" }}>{strValue}</Typography>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
          <Box className={styles.detailHeaderActions} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={onBack} controlId="loan-budget.detail.back.button">
              {t("back_button", "Back")}
            </Button>
            {blnCanEdit ? (
              <Button
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={handleSave}
                disabled={blnSaving || !blnBudgetStarted}
                controlId="loan-budget.detail.save.button"
              >
                {t("save_button", "Save")}
              </Button>
            ) : null}
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error" sx={{ flex: "0 0 auto" }} onClose={() => setStrError("")}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" sx={{ flex: "0 0 auto" }} onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
      {!blnCanEdit ? <Alert severity="warning" sx={{ flex: "0 0 auto" }}>{t("read_only", "You have view-only access to loan budgets.")}</Alert> : null}

      {/* Company budget: fixed, small form */}
      <Box className={styles.controlsCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.2 }}>
          <Typography className={`${styles.sectionBar} ${styles.sectionBarTight} ${styles.sectionBarCompact}`}>{t("section_company_budget", "Company budget")}</Typography>
          <RadioGroup row value={dicValues.strDesignationScope} onChange={(e) => onDesignationScopeChange(e.target.value as LoanBudgetDesignationScope)}>
            <FormControlLabel value="all" control={<Radio size="small" disabled={!blnCanEdit} sx={{ p: 0.4 }} />} label={t("designation_scope_all", "Apply for all Designations")} />
            <FormControlLabel value="specific" control={<Radio size="small" disabled={!blnCanEdit} sx={{ p: 0.4 }} />} label={t("designation_scope_specific", "Designation Specific")} />
          </RadioGroup>
        </Box>
        <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "flex-end" }}>
          <TextField
            label={t("field_budget_amount", "Budget Amount")}
            type="number"
            value={dicValues.decTotalBudgetAmount}
            onChange={(e) => setDicValues((d) => ({ ...d, decTotalBudgetAmount: e.target.value }))}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <TextField
            label={t("field_remarks", "Remarks")}
            value={dicValues.strRemarks}
            onChange={(e) => setDicValues((d) => ({ ...d, strRemarks: e.target.value }))}
            size="small"
            sx={{ minWidth: 220, flex: 1 }}
          />
          {blnCanEdit && !blnBudgetStarted ? (
            <Button className={styles.primaryButton} onClick={startBudgetProcess} controlId="loan-budget.detail.set-budget.button">
              {t("set_budget_button", "Set Budget")}
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* Designation limits: grows to fill remaining height, its row list scrolls internally */}
      {blnBudgetStarted ? (
        <Box className={styles.tableCard}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flex: "0 0 auto", mb: 1.2, gap: 1.2, flexWrap: "wrap" }}>
            <Typography className={`${styles.sectionBar} ${styles.sectionBarTight} ${styles.sectionBarCompact}`}>
              {t("section_designation_limits", "Designation limits")}
            </Typography>
            {dicValues.strDesignationScope === "all" && blnCanEdit ? (
              <TextField
                label={t("field_shared_limit", "Limit Amount (applies to all designations)")}
                type="number"
                size="small"
                value={dicValues.lstDesignationLimits[0]?.decLimitAmount || ""}
                onChange={(e) => onSharedDesignationLimitChange(e.target.value)}
                sx={{ minWidth: 280 }}
                controlId="loan-budget.detail.shared-limit.input"
              />
            ) : null}
          </Box>

          {/* One continuous table: each designation is a row (expandable in-place, chevron and
              all, only when it's carrying employee-specific overrides) followed directly by its
              employee sub-rows -- no separate "Employees in this designation" header row. */}
          <TableContainer
            sx={{
              flex: "1 1 auto",
              overflowY: "auto",
              minHeight: 0,
              border: "1px solid var(--app-card-border-color)",
              borderRadius: "var(--app-card-radius)",
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{
                "& .MuiTableCell-root": { borderBottom: "1px solid var(--app-card-border-color)" },
                "& .MuiTableRow-root:last-of-type .MuiTableCell-root": { borderBottom: "none" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background: "var(--app-grid-header-background, #f8fafc)", borderBottom: "2px solid var(--app-card-border-color) !important", fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#64748b" }}>
                    <TableSortLabel active={strDesignationSortBy === "designation"} direction={strDesignationSortBy === "designation" ? strDesignationSortDirection : "asc"} onClick={() => handleDesignationSort("designation")}>
                      {t("field_designation", "Designation")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ background: "var(--app-grid-header-background, #f8fafc)", borderBottom: "2px solid var(--app-card-border-color) !important", fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#64748b" }}>{t("table_employee_code", "Employee ID")}</TableCell>
                  <TableCell sx={{ background: "var(--app-grid-header-background, #f8fafc)", borderBottom: "2px solid var(--app-card-border-color) !important", fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#64748b" }}>
                    <TableSortLabel active={strDesignationSortBy === "limit"} direction={strDesignationSortBy === "limit" ? strDesignationSortDirection : "asc"} onClick={() => handleDesignationSort("limit")}>
                      {t("field_limit", "Limit")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ background: "var(--app-grid-header-background, #f8fafc)", borderBottom: "2px solid var(--app-card-border-color) !important", fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em", color: "#64748b" }}>{t("field_scope", "Scope")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dicValues.lstDesignationLimits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: "#94a3b8", textAlign: "center", py: 3 }}>
                      {t("no_designation_limits", "No designation limits configured yet.")}
                    </TableCell>
                  </TableRow>
                ) : null}

                {lstPagedDesignationLimits.map(({ objRow, intIndex }) => {
                  const blnExpandable = objRow.strEmployeeScope === "specific" && objRow.lstEmployees.length > 0;
                  const blnExpanded = blnExpandable && objExpandedDesignationRows.has(intIndex);
                  const strDesignationName = lstDesignationOptions.find((objOption) => objOption.intID === objRow.intDesignationID)?.strDesignationName || "";
                  return (
                    <Fragment key={intIndex}>
                      <TableRow
                        hover={blnExpandable}
                        sx={{ cursor: blnExpandable ? "pointer" : "default", background: "var(--app-grid-header-background, #f8fafc)" }}
                        onClick={() => blnExpandable && toggleDesignationRowEmployees(intIndex)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <ExpandMoreRoundedIcon
                              fontSize="small"
                              sx={{ color: blnExpandable ? "#64748b" : "transparent", transform: blnExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s ease" }}
                            />
                            <Typography sx={{ fontWeight: 700, fontSize: ".88rem" }}>{strDesignationName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell />
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField
                            type="number"
                            size="small"
                            value={objRow.decLimitAmount}
                            onChange={(e) => onDesignationLimitChange(intIndex, e.target.value)}
                            disabled={!blnCanEdit || dicValues.strDesignationScope === "all"}
                            sx={{ maxWidth: 160 }}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <RadioGroup row value={objRow.strEmployeeScope} onChange={(e) => onScopeChange(intIndex, e.target.value as "all" | "specific")}>
                            <FormControlLabel value="all" control={<Radio size="small" disabled={!blnCanEdit} sx={{ p: 0.4 }} />} label={t("scope_all", "Applicable for all")} />
                            <FormControlLabel value="specific" control={<Radio size="small" disabled={!blnCanEdit} sx={{ p: 0.4 }} />} label={t("scope_specific", "Employee specific")} />
                          </RadioGroup>
                        </TableCell>
                      </TableRow>
                      {blnExpanded
                        ? objRow.lstEmployees.map((objEmployee) => (
                            <TableRow key={objEmployee.intEmployeeID} hover>
                              <TableCell sx={{ pl: 5, fontSize: ".86rem" }}>{objEmployee.strEmployeeName}</TableCell>
                              <TableCell sx={{ color: "#64748b", fontSize: ".82rem" }}>{objEmployee.strEmployeeCode}</TableCell>
                              <TableCell colSpan={2}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={objEmployee.decLimitAmount}
                                  onChange={(e) => onEmployeeLimitChange(intIndex, objEmployee.intEmployeeID, e.target.value)}
                                  disabled={!blnCanEdit || objRow.strEmployeeScope !== "specific"}
                                  sx={{ maxWidth: 160 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {dicValues.lstDesignationLimits.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 1.25, mt: 1, flex: "0 0 auto" }}>
              <TextField
                select
                size="small"
                value={String(intDesignationRowsPerPage)}
                onChange={(e) => {
                  setIntDesignationRowsPerPage(Number(e.target.value));
                  setIntDesignationPage(0);
                }}
                sx={{ width: 86 }}
                controlId="loan-budget.detail.designation-rows-per-page.select"
              >
                {[5, 10, 20].map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
              <Typography sx={{ fontSize: ".82rem", color: "#64748b" }}>
                {`${intClampedDesignationPage * intDesignationRowsPerPage + 1}-${Math.min((intClampedDesignationPage + 1) * intDesignationRowsPerPage, lstSortedDesignationLimits.length)} of ${lstSortedDesignationLimits.length}`}
              </Typography>
              <Pagination
                count={intDesignationPageCount}
                page={intClampedDesignationPage + 1}
                onChange={(_, intNextPage) => setIntDesignationPage(intNextPage - 1)}
                size="small"
                color="primary"
                showFirstButton
                showLastButton
                controlId="loan-budget.detail.designation-pagination"
              />
            </Box>
          ) : null}
        </Box>
      ) : null}

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels || blnSaving} strLabel={t("loading", "Loading...")} />
    </Box>
  );
}
