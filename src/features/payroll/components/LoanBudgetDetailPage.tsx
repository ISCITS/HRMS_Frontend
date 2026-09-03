"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, FormControlLabel, IconButton, MenuItem, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { createInitialLoanBudgetForm, loanBudgetService, toLoanBudgetForm } from "@/features/payroll/services/loanBudgetService";
import type { LoanBudgetFormValues, LoanBudgetSummaryRecord } from "@/features/payroll/types";

const lstModuleCodes = ["LOAN_BUDGET", "PAYROLL_LOAN_BUDGET"];

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function defaultNextFinancialYear() {
  const objToday = new Date();
  const intStartYear = objToday.getMonth() < 3 ? objToday.getFullYear() - 1 : objToday.getFullYear();
  return `${intStartYear}-${String(intStartYear + 1).slice(-2)}`;
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
  const [blnLoading, setBlnLoading] = useState(blnEditMode);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

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
      .finally(() => setBlnLoading(false));
  }, [blnEditMode, strFinancialYear]);

  // "Set Budget" only opens up the designation-limits step -- it never talks to the backend.
  // The header Save button is the one and only place a request gets written.
  function startBudgetProcess() {
    setStrError("");
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
    setBlnSaving(true);
    setStrError("");
    try {
      const objRecord = await loanBudgetService.saveBudget(dicValues);
      setObjSummary(objRecord.objBudget);
      onSaved(objRecord.objBudget.strFinancialYear);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_save", "Unable to save this budget."));
    } finally {
      setBlnSaving(false);
    }
  }

  function addDesignationRow() {
    setDicValues((dicPrev) => ({
      ...dicPrev,
      lstDesignationLimits: [...dicPrev.lstDesignationLimits, { intDesignationID: "", decLimitAmount: "", strEmployeeScope: "all", lstEmployees: [] }],
    }));
  }

  function removeDesignationRow(intIndex: number) {
    setDicValues((dicPrev) => ({ ...dicPrev, lstDesignationLimits: dicPrev.lstDesignationLimits.filter((_, i) => i !== intIndex) }));
  }

  async function onDesignationChange(intIndex: number, intDesignationID: number) {
    const lstEmployees = await loanBudgetService.listEmployeesInDesignation(intDesignationID).catch(() => []);
    setDicValues((dicPrev) => ({
      ...dicPrev,
      lstDesignationLimits: dicPrev.lstDesignationLimits.map((objRow, i) =>
        i === intIndex
          ? { ...objRow, intDesignationID, lstEmployees: lstEmployees.map((objEmployee) => ({ ...objEmployee, decLimitAmount: objRow.decLimitAmount })) }
          : objRow
      ),
    }));
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
          {objSummary ? (
            <Box sx={{ display: "flex", alignItems: "center", flex: "1 1 auto", flexWrap: "wrap", gap: 3.5, pl: 2, pr: 3 }}>
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

      {strError ? <Alert severity="error" sx={{ flex: "0 0 auto" }}>{strError}</Alert> : null}
      {!blnCanEdit ? <Alert severity="warning" sx={{ flex: "0 0 auto" }}>{t("read_only", "You have view-only access to loan budgets.")}</Alert> : null}

      {/* Company budget: fixed, small form */}
      <Box className={styles.controlsCard}>
        <Typography className={styles.sectionBar}>{t("section_company_budget", "Company budget")}</Typography>
        <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "flex-end" }}>
          <TextField
            label={t("field_financial_year", "Financial Year")}
            value={dicValues.strFinancialYear}
            onChange={(e) => setDicValues((d) => ({ ...d, strFinancialYear: e.target.value }))}
            placeholder="2026-27"
            size="small"
            disabled={blnEditMode}
            sx={{ minWidth: 160 }}
          />
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
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flex: "0 0 auto", mb: 1.2 }}>
            <Typography className={`${styles.sectionBar} ${styles.sectionBarTight}`}>
              {t("section_designation_limits", "Designation limits")}
            </Typography>
            {blnCanEdit ? (
              <Button size="small" startIcon={<AddRoundedIcon />} className={styles.secondaryButton} onClick={addDesignationRow} controlId="loan-budget.detail.add-designation.button">
                {t("add_designation_button", "Add Designation")}
              </Button>
            ) : null}
          </Box>

          <Box sx={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0, pr: 0.5 }}>
            {dicValues.lstDesignationLimits.length === 0 ? (
              <Typography sx={{ color: "#94a3b8", fontSize: ".88rem", py: 2 }}>{t("no_designation_limits", "No designation limits configured yet.")}</Typography>
            ) : null}

            {dicValues.lstDesignationLimits.map((objRow, intIndex) => (
              <Box
                key={intIndex}
                sx={{
                  border: "1px solid var(--app-card-border-color)",
                  borderRadius: "var(--app-card-radius)",
                  boxShadow: "var(--app-shadow-soft)",
                  background: "var(--app-surface-color)",
                  p: 1.6,
                  mb: 1.4,
                }}
              >
                <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <TextField
                    select
                    label={t("field_designation", "Designation")}
                    value={objRow.intDesignationID}
                    onChange={(e) => onDesignationChange(intIndex, Number(e.target.value))}
                    size="small"
                    sx={{ minWidth: 220 }}
                    disabled={!blnCanEdit}
                  >
                    {lstDesignationOptions.map((objOption) => (
                      <MenuItem key={objOption.intID} value={objOption.intID}>
                        {objOption.strDesignationName}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={t("field_limit", "Limit")}
                    type="number"
                    value={objRow.decLimitAmount}
                    onChange={(e) => onDesignationLimitChange(intIndex, e.target.value)}
                    size="small"
                    sx={{ minWidth: 160 }}
                    disabled={!blnCanEdit}
                  />
                  <RadioGroup row value={objRow.strEmployeeScope} onChange={(e) => onScopeChange(intIndex, e.target.value as "all" | "specific")}>
                    <FormControlLabel value="all" control={<Radio size="small" disabled={!blnCanEdit} />} label={t("scope_all", "Applicable for all")} />
                    <FormControlLabel value="specific" control={<Radio size="small" disabled={!blnCanEdit} />} label={t("scope_specific", "Employee specific")} />
                  </RadioGroup>
                  {blnCanEdit ? (
                    <IconButton size="small" color="error" onClick={() => removeDesignationRow(intIndex)} sx={{ ml: "auto" }} controlId="loan-budget.detail.remove-designation.button">
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Box>

                {objRow.lstEmployees.length > 0 ? (
                  <Box sx={{ mt: 1.4, border: "1px solid var(--app-card-border-color)", borderRadius: "8px", overflow: "hidden" }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 170px", background: "var(--app-grid-header-background, #f8fafc)", px: 1.4, py: 0.7 }}>
                      <Typography sx={{ fontSize: ".68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".03em" }}>
                        {t("employees_in_designation", "Employees in this designation")} ({objRow.lstEmployees.length})
                      </Typography>
                      <Typography sx={{ fontSize: ".68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".03em" }}>
                        {t("field_limit", "Limit")}
                      </Typography>
                    </Box>
                    {objRow.lstEmployees.map((objEmployee) => (
                      <Box
                        key={objEmployee.intEmployeeID}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 170px",
                          alignItems: "center",
                          px: 1.4,
                          py: 0.9,
                          borderTop: "1px solid var(--app-card-border-color)",
                          "&:hover": { background: "var(--app-grid-row-hover-background, #f8fafc)" },
                        }}
                      >
                        <Typography sx={{ fontSize: ".86rem", fontWeight: 600 }}>
                          {objEmployee.strEmployeeName} <Typography component="span" sx={{ color: "#94a3b8", fontSize: ".82rem", fontWeight: 400 }}>({objEmployee.strEmployeeCode})</Typography>
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={objEmployee.decLimitAmount}
                          onChange={(e) => onEmployeeLimitChange(intIndex, objEmployee.intEmployeeID, e.target.value)}
                          disabled={!blnCanEdit || objRow.strEmployeeScope !== "specific"}
                          sx={{ maxWidth: 150 }}
                        />
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels || blnSaving} strLabel={t("loading", "Loading...")} />
    </Box>
  );
}
