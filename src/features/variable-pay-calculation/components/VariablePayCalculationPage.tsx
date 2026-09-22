"use client";

import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useMemo, useState } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  allocationMasterService,
  type AllocationEntityApiRecord,
} from "@/features/allocation-masters/services/allocationMasterService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { PayrollRunListRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { variablePayCalculationService } from "@/features/variable-pay-calculation/services/variablePayCalculationService";
import type {
  AllocationBasedComponentOption,
  EmployeeNameOption,
  VariablePayCalculationBatch,
  VariablePayEmployeeCalculation,
} from "@/features/variable-pay-calculation/types";
import { authHelpers } from "@/lib/auth";

const lstCalculationModuleCodes = ["VARIABLE_PAY_CALCULATION", "PAYROLL_VARIABLE_PAY_CALCULATION"];

function toPayrollMonth(strMonthInputValue: string) {
  return strMonthInputValue ? `${strMonthInputValue}-01` : "";
}

function currentMonthInputValue() {
  const objNow = new Date();
  return `${objNow.getFullYear()}-${String(objNow.getMonth() + 1).padStart(2, "0")}`;
}

function formatAmount(strValue: string | null | undefined) {
  if (strValue === null || strValue === undefined || strValue === "") {
    return "-";
  }
  const decParsed = Number(strValue);
  if (!Number.isFinite(decParsed)) {
    return String(strValue);
  }
  return decParsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(strStatus: string): "success" | "error" | "warning" | "default" {
  if (strStatus === "APPROVED" || strStatus === "POSTED") {
    return "success";
  }
  if (strStatus === "EXCEPTION") {
    return "error";
  }
  if (strStatus === "CALCULATED") {
    return "warning";
  }
  return "default";
}

// Variable Pay Calculation workspace: create/load a batch for a
// Company + Payroll Month + Allocation-Based Salary Component, calculate it, review the
// per-employee and per-entity breakup, override/approve rows, then post into Monthly Variable Pay.
export default function VariablePayCalculationPage() {
  const { t } = useModuleLabels("variable-pay-calculation", "Unable to load Variable Pay Calculation labels.");
  const objAccess = useModuleActionAccess(lstCalculationModuleCodes);
  const blnCanCreate = objAccess.canDoAny("add");
  const blnCanCalculate = objAccess.canDoAny("edit");
  const blnCanApprove = objAccess.canDoAny("approve");
  // The backend gates the override endpoint on the same "approve" action right as
  // approving a calculation (not a separate "override" action code, which is tenant-scoped
  // and can't be guaranteed to exist for every tenant).
  const blnCanOverride = blnCanApprove;

  const [lstComponents, setLstComponents] = useState<AllocationBasedComponentOption[]>([]);
  const [lstRuns, setLstRuns] = useState<PayrollRunListRecord[]>([]);
  const [lstRegularRuns, setLstRegularRuns] = useState<PayrollRunListRecord[]>([]);
  const [lstEntities, setLstEntities] = useState<AllocationEntityApiRecord[]>([]);
  const [lstEmployeeNames, setLstEmployeeNames] = useState<EmployeeNameOption[]>([]);

  const [intCompanyID, setIntCompanyID] = useState<number | "">("");
  const [strMonthInputValue, setStrMonthInputValue] = useState<string>(currentMonthInputValue());
  const [intSalaryComponentID, setIntSalaryComponentID] = useState<number | "">("");
  const [intTargetPayrollRunID, setIntTargetPayrollRunID] = useState<number | "">("");
  const [intSourcePayrollRunID, setIntSourcePayrollRunID] = useState<number | "">("");

  const [objBatch, setObjBatch] = useState<VariablePayCalculationBatch | null>(null);
  const [lstCalculations, setLstCalculations] = useState<VariablePayEmployeeCalculation[]>([]);
  const [setExpandedRowIDs, setSetExpandedRowIDs] = useState<Set<number>>(new Set());

  const [objOverrideTarget, setObjOverrideTarget] = useState<VariablePayEmployeeCalculation | null>(null);
  const [strOverrideReason, setStrOverrideReason] = useState("");
  const [strOverrideError, setStrOverrideError] = useState<string | null>(null);
  const [blnPostConfirmOpen, setBlnPostConfirmOpen] = useState(false);

  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);
  const [strSuccess, setStrSuccess] = useState<string | null>(null);
  const [blnCompanyAutoDetected, setBlnCompanyAutoDetected] = useState(true);

  useEffect(() => {
    const intDetectedCompanyID = authHelpers.getCompanyID();
    setIntCompanyID(intDetectedCompanyID ?? "");
    // Every screen in this app derives company from session silently - this field is normally
    // read-only. But this endpoint (unlike most others) requires the company id explicitly, so
    // if the session genuinely has none on file, fall back to letting the user type it rather
    // than leaving the feature permanently blocked with no way to proceed.
    setBlnCompanyAutoDetected(intDetectedCompanyID != null);
  }, []);

  useEffect(() => {
    if (objAccess.blnLoading) {
      return;
    }
    variablePayCalculationService
      .listAllocationBasedComponents()
      .then((lstRecords) => setLstComponents(lstRecords))
      .catch((objErr) =>
        setStrError(
          (objErr as Error)?.message ??
            t("load_components_failed", "Unable to load Allocation-Based salary components."),
        ),
      );
    // The optional target run for posting is a Separate Payroll (Variable Pay) run; the source
    // run (for components with attendance eligibility/proration) is a Regular Payroll run whose
    // attendance has been finalized.
    payrollRunService
      .getPayrollRuns()
      .then((lstAllRuns) => {
        setLstRuns(lstAllRuns.filter((objRun) => objRun.strRunTypeCode === "VARIABLE_PAY"));
        setLstRegularRuns(lstAllRuns.filter((objRun) => objRun.strRunTypeCode === "REGULAR"));
      })
      .catch(() => undefined);
    variablePayCalculationService
      .listEmployeeNameOptions()
      .then((lstRecords) => setLstEmployeeNames(lstRecords))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objAccess.blnLoading]);

  const objSelectedComponent = useMemo(
    () => lstComponents.find((dicComponent) => dicComponent.intID === intSalaryComponentID) ?? null,
    [lstComponents, intSalaryComponentID],
  );

  // The backend only requires a Source Payroll Run when the component has attendance
  // eligibility or proration enabled - the field is hidden otherwise so it doesn't look
  // mandatory for components that never need it.
  const blnAttendanceSourceNeeded = Boolean(
    objSelectedComponent?.blnAttendanceEligibilityApplicable || objSelectedComponent?.blnAttendanceProrationApplicable,
  );

  useEffect(() => {
    if (!blnAttendanceSourceNeeded && intSourcePayrollRunID !== "") {
      setIntSourcePayrollRunID("");
    }
  }, [blnAttendanceSourceNeeded, intSourcePayrollRunID]);

  const dicEntityNameByID = useMemo(() => {
    const dicMap: Record<number, string> = {};
    for (const dicEntity of lstEntities) {
      dicMap[dicEntity.intID] = `${dicEntity.strEntityCode} - ${dicEntity.strEntityName}`;
    }
    return dicMap;
  }, [lstEntities]);

  const dicEmployeeByID = useMemo(() => {
    const dicMap: Record<number, EmployeeNameOption> = {};
    for (const dicEmployee of lstEmployeeNames) {
      dicMap[dicEmployee.intEmployeeID] = dicEmployee;
    }
    return dicMap;
  }, [lstEmployeeNames]);

  const blnHasApprovedRow = useMemo(
    () => lstCalculations.some((objCalc) => objCalc.strStatus === "APPROVED"),
    [lstCalculations],
  );

  function resolveFilters() {
    if (intCompanyID === "" || !strMonthInputValue || intSalaryComponentID === "") {
      setStrError(t("filters_required", "Select Company, Payroll Month and Salary Component first."));
      return null;
    }
    return {
      intCompanyID: Number(intCompanyID),
      dtPayrollMonth: toPayrollMonth(strMonthInputValue),
      intSalaryComponentID: Number(intSalaryComponentID),
    };
  }

  async function loadEmployeeCalculations(intBatchID: number) {
    const lstRecords = await variablePayCalculationService.listEmployeeCalculations(intBatchID);
    setLstCalculations(lstRecords);
  }

  async function handleCreateOrLoadBatch() {
    const dicFilters = resolveFilters();
    if (!dicFilters) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objNewBatch = await variablePayCalculationService.createBatch({
        ...dicFilters,
        intTargetPayrollRunID: intTargetPayrollRunID === "" ? null : Number(intTargetPayrollRunID),
        intSourcePayrollRunID: intSourcePayrollRunID === "" ? null : Number(intSourcePayrollRunID),
      });
      setObjBatch(objNewBatch);
      setSetExpandedRowIDs(new Set());

      const objComponent = lstComponents.find((dicComponent) => dicComponent.intID === dicFilters.intSalaryComponentID);
      const [lstActiveEntities] = await Promise.all([
        objComponent?.intAllocationEntityTypeID
          ? allocationMasterService.listEntities(objComponent.intAllocationEntityTypeID, true)
          : Promise.resolve([] as AllocationEntityApiRecord[]),
        loadEmployeeCalculations(objNewBatch.intID),
      ]);
      setLstEntities(lstActiveEntities);
      setStrSuccess(t("batch_ready", "Calculation batch ready."));
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("batch_failed", "Unable to create or load the calculation batch."));
      setObjBatch(null);
      setLstCalculations([]);
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleSetSourceRun() {
    if (!objBatch || intSourcePayrollRunID === "") {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objUpdatedBatch = await variablePayCalculationService.setBatchSourcePayrollRun(
        objBatch.intID,
        Number(intSourcePayrollRunID),
      );
      setObjBatch(objUpdatedBatch);
      setStrSuccess(t("source_run_set_success", "Source Payroll Run set on the batch."));
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("source_run_set_failed", "Unable to set the Source Payroll Run."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleCalculate() {
    if (!objBatch) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objUpdatedBatch = await variablePayCalculationService.calculateBatch(objBatch.intID);
      setObjBatch(objUpdatedBatch);
      await loadEmployeeCalculations(objUpdatedBatch.intID);
      setStrSuccess(t("calculate_success", "Calculation completed."));
    } catch (objErr) {
      // A 409 here usually means the component needs attendance data and the batch has no
      // Source Payroll Run linked yet; the backend message explains which.
      setStrError((objErr as Error)?.message ?? t("calculate_failed", "Unable to calculate this batch."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleRefresh() {
    if (!objBatch) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    try {
      await loadEmployeeCalculations(objBatch.intID);
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("load_failed", "Unable to reload employee calculations."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleApproveRow(objCalc: VariablePayEmployeeCalculation) {
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      await variablePayCalculationService.approveEmployeeCalculation(objCalc.intID, null);
      await handleRefreshAfterMutation();
      setStrSuccess(t("approve_success", "Employee calculation approved."));
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("approve_failed", "Unable to approve this employee calculation."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleRefreshAfterMutation() {
    if (!objBatch) {
      return;
    }
    await loadEmployeeCalculations(objBatch.intID);
  }

  async function handleSubmitOverride() {
    if (!objOverrideTarget) {
      return;
    }
    if (!strOverrideReason.trim()) {
      setStrOverrideError(t("override_reason_required", "Override reason is required."));
      return;
    }
    setBlnBusy(true);
    setStrOverrideError(null);
    setStrError(null);
    setStrSuccess(null);
    try {
      await variablePayCalculationService.overrideEmployeeCalculation(
        objOverrideTarget.intID,
        strOverrideReason.trim(),
      );
      await handleRefreshAfterMutation();
      setObjOverrideTarget(null);
      setStrOverrideReason("");
      setStrSuccess(t("override_success", "Eligibility override applied."));
    } catch (objErr) {
      setStrOverrideError((objErr as Error)?.message ?? t("override_failed", "Unable to apply the override."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handlePost() {
    if (!objBatch) {
      return;
    }
    setBlnPostConfirmOpen(false);
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objUpdatedBatch = await variablePayCalculationService.postBatch(objBatch.intID);
      setObjBatch(objUpdatedBatch);
      await loadEmployeeCalculations(objUpdatedBatch.intID);
      setStrSuccess(t("post_success", "Approved calculations posted to Monthly Variable Pay."));
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("post_failed", "Unable to post this batch."));
    } finally {
      setBlnBusy(false);
    }
  }

  function toggleExpanded(intCalculationID: number) {
    setSetExpandedRowIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (objNext.has(intCalculationID)) {
        objNext.delete(intCalculationID);
      } else {
        objNext.add(intCalculationID);
      }
      return objNext;
    });
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />

      {objAccess.strError ? <Alert severity="warning">{objAccess.strError}</Alert> : null}
      {strError ? (
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      ) : null}
      {strSuccess ? (
        <Alert severity="success" onClose={() => setStrSuccess(null)}>
          {strSuccess}
        </Alert>
      ) : null}

      {!objAccess.blnLoading && !objAccess.canViewAny() ? (
        <Alert severity="info">
          {t("access_denied", "Variable Pay Calculation access is not available for your user group.")}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ xs: "stretch", md: "center" }} flexWrap="wrap">
          <TextField
            label={t("company", "Company")}
            type={blnCompanyAutoDetected ? "text" : "number"}
            value={intCompanyID}
            onChange={
              blnCompanyAutoDetected
                ? undefined
                : (objEvent) => setIntCompanyID(objEvent.target.value === "" ? "" : Number(objEvent.target.value))
            }
            InputLabelProps={{ shrink: true }}
            InputProps={{ readOnly: blnCompanyAutoDetected }}
            inputProps={{ controlId: "variable-pay-calculation.filter.company.input", min: 1 }}
            sx={{ minWidth: { xs: "100%", md: 160 } }}
          />
          <TextField
            label={t("payroll_month", "Payroll Month")}
            type="month"
            value={strMonthInputValue}
            onChange={(objEvent) => setStrMonthInputValue(objEvent.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ controlId: "variable-pay-calculation.filter.month.input" }}
            sx={{ minWidth: { xs: "100%", md: 190 } }}
          />
          <TextField
            select
            label={t("salary_component", "Salary Component")}
            value={intSalaryComponentID}
            onChange={(objEvent) =>
              setIntSalaryComponentID(objEvent.target.value === "" ? "" : Number(objEvent.target.value))
            }
            inputProps={{ controlId: "variable-pay-calculation.filter.component.select" }}
            sx={{ minWidth: { xs: "100%", md: 300 } }}
          >
            {lstComponents.length === 0 ? (
              <MenuItem value="" disabled>
                {t("no_components", "No Allocation-Based salary components found.")}
              </MenuItem>
            ) : null}
            {lstComponents.map((dicComponent) => (
              <MenuItem key={dicComponent.intID} value={dicComponent.intID}>
                {`${dicComponent.strComponentCode} - ${dicComponent.strComponentName}`}
              </MenuItem>
            ))}
          </TextField>
          {blnAttendanceSourceNeeded ? (
            <TextField
              select
              label={t("source_run", "Source Payroll Run")}
              value={intSourcePayrollRunID}
              onChange={(objEvent) =>
                setIntSourcePayrollRunID(objEvent.target.value === "" ? "" : Number(objEvent.target.value))
              }
              inputProps={{ controlId: "variable-pay-calculation.filter.source-run.select" }}
              sx={{ minWidth: { xs: "100%", md: 280 } }}
            >
              <MenuItem value="">{t("none", "None")}</MenuItem>
              {lstRegularRuns.map((objRun) => (
                <MenuItem key={objRun.intID} value={objRun.intID}>
                  {`${objRun.strRunCode} - ${objRun.strRunName}`}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            select
            label={t("target_run", "Target Payroll Run")}
            value={intTargetPayrollRunID}
            onChange={(objEvent) =>
              setIntTargetPayrollRunID(objEvent.target.value === "" ? "" : Number(objEvent.target.value))
            }
            inputProps={{ controlId: "variable-pay-calculation.filter.target-run.select" }}
            sx={{ minWidth: { xs: "100%", md: 280 } }}
          >
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {lstRuns.map((objRun) => (
              <MenuItem key={objRun.intID} value={objRun.intID}>
                {`${objRun.strRunCode} - ${objRun.strRunName}`}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={() => void handleCreateOrLoadBatch()}
            disabled={blnBusy || !blnCanCreate}
            data-control-id="variable-pay-calculation.filter.create-batch.button"
            sx={{ height: 40, alignSelf: { xs: "stretch", md: "center" } }}
          >
            {t("create_batch", "Create / Load Batch")}
          </Button>
        </Stack>

        <Typography sx={{ mt: 1, color: "#64748b", fontSize: "0.78rem" }}>
          {blnCompanyAutoDetected
            ? t(
                "filter_row_help",
                "Company defaults to your signed-in company. Target Payroll Run is optional - the Separate Payroll run to post into.",
              )
            : t(
                "filter_row_help_manual",
                "Your session has no company on file - enter it manually. Target Payroll Run is optional - the Separate Payroll run to post into.",
              )}
        </Typography>

        {objSelectedComponent?.blnAttendanceEligibilityApplicable ||
        objSelectedComponent?.blnAttendanceProrationApplicable ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t(
              "attendance_notice",
              "This component uses attendance-based eligibility or proration, so the batch needs a Source Payroll Run before calculating - select the finalized Regular Payroll run to read payable days from.",
            )}
          </Alert>
        ) : null}
      </Paper>

      {objBatch ? (
        <>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="h6">{t("batch_summary", "Batch Summary")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => void handleRefresh()}
                  disabled={blnBusy}
                  data-control-id="variable-pay-calculation.batch.refresh.button"
                >
                  {t("refresh", "Refresh")}
                </Button>
                {blnCanCalculate ? (
                  <Button
                    variant="contained"
                    startIcon={<CalculateRoundedIcon />}
                    onClick={() => void handleCalculate()}
                    disabled={blnBusy}
                    data-control-id="variable-pay-calculation.batch.calculate.button"
                  >
                    {t("calculate", "Calculate")}
                  </Button>
                ) : null}
                {blnCanApprove ? (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PublishRoundedIcon />}
                    onClick={() => setBlnPostConfirmOpen(true)}
                    disabled={blnBusy || !blnHasApprovedRow}
                    data-control-id="variable-pay-calculation.batch.post.button"
                  >
                    {t("post", "Post to Variable Pay")}
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <Chip label={`${t("batch_id", "Batch")}: ${objBatch.intID}`} />
              <Chip
                color={statusColor(objBatch.strCalculationStatus)}
                label={`${t("status", "Status")}: ${objBatch.strCalculationStatus}`}
                data-control-id="variable-pay-calculation.batch.status.chip"
              />
              <Chip label={`${t("payroll_month", "Payroll Month")}: ${objBatch.dtPayrollMonth}`} />
              <Chip label={`${t("employees", "Employees")}: ${objBatch.intEmployeeCount}`} />
              <Chip color="success" label={`${t("eligible", "Eligible")}: ${objBatch.intEligibleCount}`} />
              <Chip
                color={objBatch.intExceptionCount > 0 ? "error" : "default"}
                label={`${t("exceptions", "Exceptions")}: ${objBatch.intExceptionCount}`}
              />
              <Chip
                label={`${t("total_calculated", "Total Calculated")}: ${formatAmount(objBatch.decTotalCalculatedAmount)}`}
              />
              <Chip
                label={`${t("total_approved", "Total Approved")}: ${formatAmount(objBatch.decTotalApprovedAmount)}`}
              />
              <Chip
                color={!objBatch.intSourcePayrollRunID && blnAttendanceSourceNeeded ? "warning" : "default"}
                label={`${t("source_run", "Source Payroll Run")}: ${objBatch.intSourcePayrollRunID ?? t("not_set", "Not set")}`}
                data-control-id="variable-pay-calculation.batch.source-run.chip"
              />
              {!objBatch.intSourcePayrollRunID && blnAttendanceSourceNeeded && blnCanCalculate ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => void handleSetSourceRun()}
                  disabled={blnBusy || intSourcePayrollRunID === ""}
                  data-control-id="variable-pay-calculation.batch.set-source-run.button"
                >
                  {t("set_source_run", "Set Source Run")}
                </Button>
              ) : null}
              <Chip
                label={`${t("target_run", "Target Payroll Run")}: ${objBatch.intTargetPayrollRunID ?? t("not_set", "Not set")}`}
              />
              <Chip
                label={`${t("variable_pay_type", "Variable Pay Type")}: ${objBatch.intVariablePayTypeID ?? t("not_set", "Not set")}`}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t("employee_grid", "Employee Calculations")}
            </Typography>

            <TableContainer sx={{ maxHeight: 640 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width={48} />
                    <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                    <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                    <TableCell align="right">{t("base_amount", "Base Amount")}</TableCell>
                    <TableCell align="right">{t("payable_days_percent", "Payable Days %")}</TableCell>
                    <TableCell>{t("eligible", "Eligible")}</TableCell>
                    <TableCell align="right">{t("calculated_amount", "Calculated")}</TableCell>
                    <TableCell align="right">{t("approved_amount", "Approved")}</TableCell>
                    <TableCell align="right">{t("final_amount", "Final")}</TableCell>
                    <TableCell>{t("status", "Status")}</TableCell>
                    <TableCell>{t("actions", "Actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstCalculations.map((objCalc) => {
                    const blnExpanded = setExpandedRowIDs.has(objCalc.intID);
                    const dicEmployee = dicEmployeeByID[objCalc.intEmployeeID];
                    return (
                      <Fragment key={objCalc.intID}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => toggleExpanded(objCalc.intID)}
                              data-control-id={`variable-pay-calculation.grid.expand-${objCalc.intID}.button`}
                              aria-label={t("view_breakup", "View Breakup")}
                            >
                              {blnExpanded ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowRightRoundedIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{dicEmployee?.strEmployeeCode ?? `#${objCalc.intEmployeeID}`}</TableCell>
                          <TableCell>{dicEmployee?.strEmployeeName ?? `#${objCalc.intEmployeeID}`}</TableCell>
                          <TableCell align="right">{formatAmount(objCalc.decBaseAmount)}</TableCell>
                          <TableCell align="right">{objCalc.decPayableDaysPercent ?? "-"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={objCalc.blnIsEligible ? "success" : "error"}
                              label={objCalc.blnIsEligible ? t("yes", "Yes") : t("no", "No")}
                            />
                            {objCalc.blnEligibilityOverride ? (
                              <Chip
                                size="small"
                                sx={{ ml: 0.5 }}
                                color="info"
                                label={t("overridden", "Overridden")}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell align="right">{formatAmount(objCalc.decCalculatedAmount)}</TableCell>
                          <TableCell align="right">{formatAmount(objCalc.decApprovedAmount)}</TableCell>
                          <TableCell align="right">{formatAmount(objCalc.decFinalAmount)}</TableCell>
                          <TableCell>
                            <Chip size="small" color={statusColor(objCalc.strStatus)} label={objCalc.strStatus} />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              {blnCanOverride ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setObjOverrideTarget(objCalc);
                                    setStrOverrideReason(objCalc.strOverrideReason ?? "");
                                    setStrOverrideError(null);
                                  }}
                                  // Overrides only make sense for below-threshold / ineligible rows.
                                  disabled={blnBusy || objCalc.blnIsEligible}
                                  data-control-id={`variable-pay-calculation.grid.override-${objCalc.intID}.button`}
                                >
                                  {t("override", "Override")}
                                </Button>
                              ) : null}
                              {blnCanApprove ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => void handleApproveRow(objCalc)}
                                  disabled={blnBusy || objCalc.strStatus === "APPROVED" || objCalc.strStatus === "POSTED"}
                                  data-control-id={`variable-pay-calculation.grid.approve-${objCalc.intID}.button`}
                                >
                                  {t("approve", "Approve")}
                                </Button>
                              ) : null}
                            </Stack>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={11} sx={{ py: 0, borderBottom: blnExpanded ? undefined : "none" }}>
                            <Collapse in={blnExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 1.5, background: "#f8fafc", borderRadius: 2, my: 1 }}>
                                {objCalc.strOverrideReason ? (
                                  <Alert severity="info" sx={{ mb: 1 }}>
                                    {`${t("override_reason", "Override Reason")}: ${objCalc.strOverrideReason}`}
                                  </Alert>
                                ) : null}
                                <Typography sx={{ fontWeight: 800, mb: 1 }}>
                                  {t("entity_breakup", "Entity Breakup")}
                                </Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>{t("entity", "Entity")}</TableCell>
                                      <TableCell align="right">{t("allocation_percent", "Allocation %")}</TableCell>
                                      <TableCell align="right">{t("base_share", "Base Share")}</TableCell>
                                      <TableCell align="right">
                                        {t("monthly_adjustment_percent", "Monthly Adjustment %")}
                                      </TableCell>
                                      <TableCell align="right">{t("adjusted_amount", "Adjusted")}</TableCell>
                                      <TableCell align="right">{t("prorated_amount", "Prorated")}</TableCell>
                                      <TableCell align="right">{t("final_detail_amount", "Final")}</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {objCalc.lstDetails.map((objDetail) => (
                                      <TableRow key={`${objCalc.intID}-${objDetail.intAllocationEntityID}`}>
                                        <TableCell>
                                          {dicEntityNameByID[objDetail.intAllocationEntityID] ??
                                            `#${objDetail.intAllocationEntityID}`}
                                        </TableCell>
                                        <TableCell align="right">{objDetail.decAllocationPercent}</TableCell>
                                        <TableCell align="right">{formatAmount(objDetail.decBaseShareAmount)}</TableCell>
                                        <TableCell align="right">{objDetail.decMonthlyAdjustmentPercent}</TableCell>
                                        <TableCell align="right">{formatAmount(objDetail.decAdjustedAmount)}</TableCell>
                                        <TableCell align="right">{formatAmount(objDetail.decProratedAmount)}</TableCell>
                                        <TableCell align="right">
                                          {formatAmount(objDetail.decFinalDetailAmount)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {objCalc.lstDetails.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={7}>
                                          {t("no_details", "No entity breakup is available for this employee.")}
                                        </TableCell>
                                      </TableRow>
                                    ) : null}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                  {lstCalculations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        {t("no_calculations", "No employee calculations yet. Run Calculate to populate this batch.")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : null}

      <CommonMasterDialog
        blnOpen={Boolean(objOverrideTarget)}
        onClose={() => {
          setObjOverrideTarget(null);
          setStrOverrideError(null);
        }}
        rootTestId="variable-pay-calculation.override-dialog"
        cancelButtonTestId="variable-pay-calculation.override-dialog.cancel.button"
        primaryButtonTestId="variable-pay-calculation.override-dialog.save.button"
        strTitle={t("override_dialog_title", "Override Eligibility")}
        strSecondaryLabel={t("cancel", "Cancel")}
        strPrimaryLabel={blnBusy ? t("saving", "Saving...") : t("apply_override", "Apply Override")}
        onPrimaryAction={() => void handleSubmitOverride()}
        blnPrimaryDisabled={blnBusy || !strOverrideReason.trim()}
        nodeContent={
          <Box sx={{ display: "grid", gap: 1.5, pt: 0.5 }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
              {t(
                "override_help",
                "Overriding marks this below-threshold employee as eligible and restores the calculated amount. A reason is mandatory and is stored on the audit trail.",
              )}
            </Typography>
            {strOverrideError ? <Alert severity="error">{strOverrideError}</Alert> : null}
            <TextField
              label={t("override_reason", "Override Reason")}
              required
              value={strOverrideReason}
              onChange={(objEvent) => {
                setStrOverrideReason(objEvent.target.value);
                setStrOverrideError(null);
              }}
              inputProps={{ controlId: "variable-pay-calculation.override-dialog.reason.input", maxLength: 500 }}
              multiline
              minRows={3}
              fullWidth
              sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
            />
          </Box>
        }
      />

      <CommonConfirmDialog
        blnOpen={blnPostConfirmOpen}
        strTitle={t("post_confirm_title", "Post to Monthly Variable Pay")}
        strMessage={t(
          "post_confirm_message",
          "This creates Monthly Variable Pay transactions for every approved employee in this batch. Posting again is safe and will not duplicate transactions. Continue?",
        )}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={t("post", "Post")}
        blnConfirmDisabled={blnBusy}
        onClose={() => setBlnPostConfirmOpen(false)}
        onConfirm={() => void handlePost()}
      />
    </Stack>
  );
}
