"use client";

import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import {
  allocationMasterService,
  type AllocationEntityApiRecord,
} from "@/features/allocation-masters/services/allocationMasterService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollValidationResultRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import VariablePayImportPanel from "@/features/variable-pay/components/VariablePayImportPanel";
import { variablePayService } from "@/features/variable-pay/services/variablePayService";
import { variablePayCalculationService } from "@/features/variable-pay-calculation/services/variablePayCalculationService";
import type {
  VariablePayEmployeeCalculation,
  VariablePayRunWorkspace,
} from "@/features/variable-pay-calculation/types";

const lstCalculationModuleCodes = ["VARIABLE_PAY_CALCULATION", "PAYROLL_VARIABLE_PAY_CALCULATION"];
const lstMonthlyValueModuleCodes = ["VARIABLE_PAY_MONTHLY_ENTITY_VALUES", "MONTHLY_ALLOCATION_ENTITY_VALUES"];
const lstManualModuleCodes = ["PAYROLL_VARIABLE_PAY", "MONTHLY_VARIABLE_PAY", "VARIABLE_PAY"];

const ENTITY_VALUE_LOCKED_STATUSES = new Set(["APPROVED", "LOCKED"]);
const CALCULATION_LOCKED_STATUSES = new Set(["APPROVED", "POSTED"]);

function formatAmount(objValue: string | number | null | undefined): string {
  if (objValue === null || objValue === undefined || objValue === "") {
    return "-";
  }
  const decParsed = Number(objValue);
  if (!Number.isFinite(decParsed)) {
    return "-";
  }
  return decParsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function entityKey(intEmployeeSalaryComponentID: number, intAllocationEntityID: number): string {
  return `${intEmployeeSalaryComponentID}:${intAllocationEntityID}`;
}

type ComponentEmployeeRow = {
  intEmployeeID: number;
  strEmployeeName: string;
  strEmployeeCode: string;
  intEmployeeSalaryComponentID: number;
  decBaseAmount: string;
  dicAllocationPercentByEntityID: Record<number, string>;
  objCalc: VariablePayEmployeeCalculation | null;
};

type PayrollRunVariablePayTabProps = {
  intPayrollRunID: number;
  strView: "declaration" | "grid";
  onRunRefreshNeeded?: () => void;
  onValidationIssuesChanged?: (lstIssues: PayrollValidationResultRecord[]) => void;
};

// Consolidated Variable Pay workspace for one Separate Payroll run - folds what used to be 3
// separate screens (Monthly Allocation Entity Values, Variable Pay Calculation, Monthly
// Variable Pay) into this one tab, with Company/Month/Component all derived from the run
// itself. Only employees who actually carry this run's Incentive/Variable-Pay component in
// their salary are shown in the main grid; the Import panel below stays available for the
// rarer ad-hoc/manual case outside the allocation formula.
//
// Each employee's entity adjustment % is their own - declaring/approving it for one employee's
// payroll run never affects any other employee or run, even if they're mapped to the same
// allocation entity (see VariablePayRunWorkspace/ComponentAllocationRow -
// intEmployeeSalaryComponentID is the real scoping key, not the entity alone).
export default function PayrollRunVariablePayTab({
  intPayrollRunID,
  strView,
  onRunRefreshNeeded,
  onValidationIssuesChanged,
}: PayrollRunVariablePayTabProps) {
  const { t } = useModuleLabels("variable-pay-calculation", "Unable to load Variable Pay labels.");
  const objCalcAccess = useModuleActionAccess(lstCalculationModuleCodes);
  const objEntityValueAccess = useModuleActionAccess(lstMonthlyValueModuleCodes);
  const objManualAccess = useModuleActionAccess(lstManualModuleCodes);
  const blnCanCalculate = objCalcAccess.canDoAny("edit") || objCalcAccess.canDoAny("add");
  const blnCanApprove = objCalcAccess.canDoAny("approve");
  const blnCanEditEntityValues = objEntityValueAccess.canDoAny("edit") || objEntityValueAccess.canDoAny("add");
  const blnCanApproveEntityValues = objEntityValueAccess.canDoAny("approve");
  const blnCanEditManual = objManualAccess.canDoAny("edit") || objManualAccess.canDoAny("add");

  const [objWorkspace, setObjWorkspace] = useState<VariablePayRunWorkspace | null>(null);
  const [lstEntities, setLstEntities] = useState<AllocationEntityApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);
  const [strSuccess, setStrSuccess] = useState<string | null>(null);

  // Keyed by `${intEmployeeSalaryComponentID}:${intAllocationEntityID}` - every cell is that one
  // employee's own value, never shared with another row.
  const [dicPendingAdjustmentByKey, setDicPendingAdjustmentByKey] = useState<Record<string, string>>({});
  const [dicPendingRemarksByKey, setDicPendingRemarksByKey] = useState<Record<string, string>>({});
  const [dicBulkValueByEntityID, setDicBulkValueByEntityID] = useState<Record<number, string>>({});
  const [setDirtyEmployeeSalaryComponentIDs, setSetDirtyEmployeeSalaryComponentIDs] = useState<Set<number>>(new Set());
  const [setExpandedEmployeeIDs, setSetExpandedEmployeeIDs] = useState<Set<number>>(new Set());
  const [setExpandedEntityIDs, setSetExpandedEntityIDs] = useState<Set<number>>(new Set());
  const [objOverrideTarget, setObjOverrideTarget] = useState<VariablePayEmployeeCalculation | null>(null);
  const [strOverrideReason, setStrOverrideReason] = useState("");
  const [strOverrideError, setStrOverrideError] = useState<string | null>(null);

  async function loadWorkspace() {
    setBlnLoading(true);
    setStrError(null);
    try {
      const objData = await variablePayCalculationService.getRunWorkspace(intPayrollRunID);
      setObjWorkspace(objData);

      const dicAdjustment: Record<string, string> = {};
      const dicRemarks: Record<string, string> = {};
      for (const objValue of objData.lstMonthlyEntityValues) {
        if (objValue.intEmployeeSalaryComponentID == null) {
          continue;
        }
        const strKey = entityKey(objValue.intEmployeeSalaryComponentID, objValue.intAllocationEntityID);
        dicAdjustment[strKey] = objValue.decAdjustmentPercent;
        dicRemarks[strKey] = objValue.strRemarks ?? "";
      }
      setDicPendingAdjustmentByKey(dicAdjustment);
      setDicPendingRemarksByKey(dicRemarks);
      setSetDirtyEmployeeSalaryComponentIDs(new Set());

      setLstEntities(
        objData.objSalaryComponent?.intAllocationEntityTypeID
          ? await allocationMasterService.listEntities(objData.objSalaryComponent.intAllocationEntityTypeID, true)
          : [],
      );
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("load_failed", "Unable to load the Variable Pay workspace."));
      setObjWorkspace(null);
      setLstEntities([]);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intPayrollRunID]);

  const strEntityStatusByKey = useMemo(() => {
    const dicStatus: Record<string, string> = {};
    for (const objValue of objWorkspace?.lstMonthlyEntityValues ?? []) {
      if (objValue.intEmployeeSalaryComponentID == null) {
        continue;
      }
      dicStatus[entityKey(objValue.intEmployeeSalaryComponentID, objValue.intAllocationEntityID)] = objValue.strStatus;
    }
    return dicStatus;
  }, [objWorkspace]);

  // One row per employee who actually carries this component - built from the allocation rows
  // (present even before a batch is calculated), overlaid with the batch's calculation result
  // once Calculate has been run. Employees without the component never appear here.
  const lstComponentRows = useMemo<ComponentEmployeeRow[]>(() => {
    if (!objWorkspace) {
      return [];
    }
    const dicCalcByEmployeeID = new Map<number, VariablePayEmployeeCalculation>();
    for (const objCalc of objWorkspace.lstEmployeeCalculations) {
      dicCalcByEmployeeID.set(objCalc.intEmployeeID, objCalc);
    }
    const dicRowByEmployeeID = new Map<number, ComponentEmployeeRow>();
    for (const objAlloc of objWorkspace.lstAllocationsForComponent) {
      let objRow = dicRowByEmployeeID.get(objAlloc.intEmployeeID);
      if (!objRow) {
        objRow = {
          intEmployeeID: objAlloc.intEmployeeID,
          strEmployeeName: objAlloc.strEmployeeName,
          strEmployeeCode: objAlloc.strEmployeeCode,
          intEmployeeSalaryComponentID: objAlloc.intEmployeeSalaryComponentID,
          decBaseAmount: objAlloc.decBaseAmount,
          dicAllocationPercentByEntityID: {},
          objCalc: dicCalcByEmployeeID.get(objAlloc.intEmployeeID) ?? null,
        };
        dicRowByEmployeeID.set(objAlloc.intEmployeeID, objRow);
      }
      if (objAlloc.intAllocationEntityID != null && objAlloc.decAllocationPercent != null) {
        objRow.dicAllocationPercentByEntityID[objAlloc.intAllocationEntityID] = objAlloc.decAllocationPercent;
      }
    }
    return Array.from(dicRowByEmployeeID.values()).sort((objA, objB) =>
      objA.strEmployeeName.localeCompare(objB.strEmployeeName),
    );
  }, [objWorkspace]);

  // Entity-first grouping for the Declaration view: one group per allocation entity, listing
  // only the employees actually mapped to it, each with their own allocation %/allocated amount
  // (derived, read-only) alongside their own editable adjustment % - the same
  // dicPendingAdjustmentByKey state the grid view reads, so declaring here and reviewing on the
  // Variable Pay tab is the same data, not a separate copy.
  const lstEntityGroups = useMemo(
    () =>
      lstEntities.map((objEntity) => ({
        objEntity,
        lstEmployeeRows: lstComponentRows
          .filter((objRow) => objEntity.intID in objRow.dicAllocationPercentByEntityID)
          .map((objRow) => ({
            objRow,
            decAllocationPercent: objRow.dicAllocationPercentByEntityID[objEntity.intID],
            decAllocatedAmount:
              (Number(objRow.decBaseAmount) * Number(objRow.dicAllocationPercentByEntityID[objEntity.intID])) / 100,
          })),
      })),
    [lstEntities, lstComponentRows],
  );

  // Surface below-threshold/exception rows in the run's own Validation Summary tab too, not
  // just inline here - purely a display-layer merge, nothing is written to the shared payroll
  // validation pipeline, so Regular Payroll's validation results are untouched.
  useEffect(() => {
    if (!onValidationIssuesChanged) {
      return;
    }
    const lstIssues: PayrollValidationResultRecord[] = lstComponentRows
      .filter((objRow) => objRow.objCalc && objRow.objCalc.strStatus === "EXCEPTION")
      .map((objRow) => ({
        intEmployeeID: objRow.intEmployeeID,
        strEmployeeCode: objRow.strEmployeeCode,
        strEmployeeName: objRow.strEmployeeName,
        strValidationCode: "PAY_VARIABLE_PAY_EXCEPTION",
        strValidationLevel: "BLOCKING",
        strValidationMessage: t(
          "exception_validation_message",
          `${objRow.strEmployeeName}'s Incentive could not be calculated - check the Variable Pay tab for details.`,
        ),
        blnIsBlocking: true,
        strCategory: t("variable_pay_category", "Variable Pay"),
        objNavigationTarget: { strEntityName: "variable_pay_tab", intEntityID: null },
      }))
      .concat(
        lstComponentRows
          .filter(
            (objRow) =>
              objRow.objCalc &&
              objRow.objCalc.strStatus !== "EXCEPTION" &&
              !objRow.objCalc.blnIsEligible &&
              !objRow.objCalc.blnEligibilityOverride,
          )
          .map((objRow) => ({
            intEmployeeID: objRow.intEmployeeID,
            strEmployeeCode: objRow.strEmployeeCode,
            strEmployeeName: objRow.strEmployeeName,
            strValidationCode: "PAY_VARIABLE_PAY_INELIGIBLE",
            strValidationLevel: "WARNING",
            strValidationMessage: t(
              "ineligible_validation_message",
              `${objRow.strEmployeeName} is below the attendance threshold for this Incentive component (${
                objRow.objCalc?.decPayableDaysPercent ? `${Number(objRow.objCalc.decPayableDaysPercent).toFixed(2)}%` : "-"
              }) - Override on the Variable Pay tab, or they stay at ₹0.`,
            ),
            blnIsBlocking: false,
            strCategory: t("variable_pay_category", "Variable Pay"),
            objNavigationTarget: { strEntityName: "variable_pay_tab", intEntityID: null },
          })),
      );
    onValidationIssuesChanged(lstIssues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lstComponentRows]);

  function adjustmentPercentFor(intEmployeeSalaryComponentID: number, intEntityID: number): string {
    return dicPendingAdjustmentByKey[entityKey(intEmployeeSalaryComponentID, intEntityID)] ?? "";
  }

  function updateAdjustmentPercent(intEmployeeSalaryComponentID: number, intEntityID: number, strValue: string) {
    setDicPendingAdjustmentByKey((dicPrevious) => ({
      ...dicPrevious,
      [entityKey(intEmployeeSalaryComponentID, intEntityID)]: strValue,
    }));
    setSetDirtyEmployeeSalaryComponentIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      objNext.add(intEmployeeSalaryComponentID);
      return objNext;
    });
  }

  // Convenience bulk-fill for the Declaration view's per-entity header input: fills every
  // employee mapped to this entity with the same starting %, still individually editable/
  // overridable afterward in either view (same state, same cells).
  function applyBulkAdjustmentToEntity(intEntityID: number, strValue: string, lstEmployeeRowsForEntity: ComponentEmployeeRow[]) {
    for (const objRow of lstEmployeeRowsForEntity) {
      if (!ENTITY_VALUE_LOCKED_STATUSES.has(strEntityStatusByKey[entityKey(objRow.intEmployeeSalaryComponentID, intEntityID)] ?? "DRAFT")) {
        updateAdjustmentPercent(objRow.intEmployeeSalaryComponentID, intEntityID, strValue);
      }
    }
  }

  async function handleSaveAndCalculate() {
    const blnSaveOk = await handleSaveDeclarations();
    if (blnSaveOk) {
      await handleCalculate();
    }
  }

  // Saves this employee's full entity-adjustment set (every entity they're mapped to, not just
  // the one just edited - the backend replaces the whole set per employee) and immediately
  // approves it in the same action, since there's no more shared/cross-run state to protect by
  // keeping those as separate steps.
  async function saveAndApproveEmployeeDeclaration(objRow: ComponentEmployeeRow) {
    if (!objWorkspace?.intSalaryComponentID) {
      return;
    }
    const lstValues = Object.keys(objRow.dicAllocationPercentByEntityID)
      .map((strEntityID) => Number(strEntityID))
      .map((intEntityID) => ({
        intAllocationEntityID: intEntityID,
        strPercent: adjustmentPercentFor(objRow.intEmployeeSalaryComponentID, intEntityID),
        strRemarks: dicPendingRemarksByKey[entityKey(objRow.intEmployeeSalaryComponentID, intEntityID)] ?? "",
      }))
      .filter((dicRow) => dicRow.strPercent.trim() !== "" && !Number.isNaN(Number(dicRow.strPercent)))
      .map((dicRow) => ({
        intAllocationEntityID: dicRow.intAllocationEntityID,
        decAdjustmentPercent: Number(dicRow.strPercent),
        strRemarks: dicRow.strRemarks.trim() || null,
      }));
    if (lstValues.length === 0) {
      throw new Error(
        t(
          "no_adjustment_entered_for_employee",
          `Enter at least one entity adjustment percentage for ${objRow.strEmployeeName} before saving.`,
        ),
      );
    }
    await variablePayCalculationService.saveMonthlyEntityValues({
      intCompanyID: objWorkspace.intCompanyID,
      dtPayrollMonth: objWorkspace.dtPayrollMonth,
      intSalaryComponentID: objWorkspace.intSalaryComponentID,
      intEmployeeSalaryComponentID: objRow.intEmployeeSalaryComponentID,
      lstValues,
    });
    if (blnCanApproveEntityValues) {
      await variablePayCalculationService.setMonthlyEntityValueStatus({
        intCompanyID: objWorkspace.intCompanyID,
        dtPayrollMonth: objWorkspace.dtPayrollMonth,
        intSalaryComponentID: objWorkspace.intSalaryComponentID,
        intEmployeeSalaryComponentID: objRow.intEmployeeSalaryComponentID,
        strStatus: "APPROVED",
      });
    }
  }

  // Returns whether it's safe for a caller (e.g. "Save & Calculate") to proceed - true both on
  // an actual successful save and when there was nothing dirty to save (values already
  // committed from an earlier action), false only on a real save failure.
  async function handleSaveDeclarations(): Promise<boolean> {
    if (!objWorkspace?.intSalaryComponentID) {
      return false;
    }
    const lstDirtyRows = lstComponentRows.filter((objRow) =>
      setDirtyEmployeeSalaryComponentIDs.has(objRow.intEmployeeSalaryComponentID),
    );
    if (lstDirtyRows.length === 0) {
      return true;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      for (const objRow of lstDirtyRows) {
        await saveAndApproveEmployeeDeclaration(objRow);
      }
      setStrSuccess(
        lstDirtyRows.length === 1
          ? t("entity_values_save_success_one", "Entity adjustment saved.")
          : t("entity_values_save_success_many", `Entity adjustments saved for ${lstDirtyRows.length} employees.`),
      );
      await loadWorkspace();
      return true;
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("entity_values_save_failed", "Unable to save entity adjustments."));
      return false;
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleUnlockEmployeeDeclaration(objRow: ComponentEmployeeRow) {
    if (!objWorkspace?.intSalaryComponentID) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      await variablePayCalculationService.setMonthlyEntityValueStatus({
        intCompanyID: objWorkspace.intCompanyID,
        dtPayrollMonth: objWorkspace.dtPayrollMonth,
        intSalaryComponentID: objWorkspace.intSalaryComponentID,
        intEmployeeSalaryComponentID: objRow.intEmployeeSalaryComponentID,
        strStatus: "DRAFT",
      });
      setStrSuccess(t("entity_values_unlock_success", `${objRow.strEmployeeName}'s entity adjustments unlocked for editing.`));
      await loadWorkspace();
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("entity_values_unlock_failed", "Unable to unlock entity adjustments."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleCalculate() {
    if (!objWorkspace?.intSalaryComponentID) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objBatch =
        objWorkspace.objBatch ??
        (await variablePayCalculationService.createBatch({
          intCompanyID: objWorkspace.intCompanyID,
          dtPayrollMonth: objWorkspace.dtPayrollMonth,
          intSalaryComponentID: objWorkspace.intSalaryComponentID,
          intTargetPayrollRunID: intPayrollRunID,
        }));
      await variablePayCalculationService.calculateBatch(objBatch.intID);
      setStrSuccess(t("calculate_success", "Calculation completed."));
      await loadWorkspace();
    } catch (objErr) {
      // A 409 here usually means the component needs attendance data from a finalized Regular
      // Payroll run that hasn't been linked as this batch's Source Payroll Run yet.
      setStrError((objErr as Error)?.message ?? t("calculate_failed", "Unable to calculate this batch."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleApproveRow(objCalc: VariablePayEmployeeCalculation) {
    if (!objWorkspace?.objBatch) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      await variablePayCalculationService.approveEmployeeCalculation(objCalc.intID, null);
      // This run is only ever processed through itself, so approving here also does what used
      // to be two separate manual steps elsewhere: Post (writes the transaction) and Fetch
      // Variable Pay (pulls that transaction into this run's own payroll input lines, which is
      // what Validate/Process actually reads). Both are idempotent/safe to call every time -
      // postBatch only posts rows in APPROVED status, and fetch only pulls APPROVED transactions
      // not yet fetched.
      await variablePayCalculationService.postBatch(objWorkspace.objBatch.intID);
      await variablePayService.fetchVariablePay(intPayrollRunID);
      setStrSuccess(t("approve_success", "Employee calculation approved and added to this payroll run."));
      await loadWorkspace();
      onRunRefreshNeeded?.();
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("approve_failed", "Unable to approve this employee calculation."));
    } finally {
      setBlnBusy(false);
    }
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
      await variablePayCalculationService.overrideEmployeeCalculation(objOverrideTarget.intID, strOverrideReason.trim());
      setObjOverrideTarget(null);
      setStrOverrideReason("");
      setStrSuccess(t("override_success", "Eligibility override applied."));
      await loadWorkspace();
    } catch (objErr) {
      setStrOverrideError((objErr as Error)?.message ?? t("override_failed", "Unable to apply the override."));
    } finally {
      setBlnBusy(false);
    }
  }

  function toggleExpanded(intEmployeeID: number) {
    setSetExpandedEmployeeIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (objNext.has(intEmployeeID)) {
        objNext.delete(intEmployeeID);
      } else {
        objNext.add(intEmployeeID);
      }
      return objNext;
    });
  }

  function toggleExpandedEntity(intEntityID: number) {
    setSetExpandedEntityIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (objNext.has(intEntityID)) {
        objNext.delete(intEntityID);
      } else {
        objNext.add(intEntityID);
      }
      return objNext;
    });
  }

  function eligibilityTooltipFor(objCalc: VariablePayEmployeeCalculation, objComponent: VariablePayRunWorkspace["objSalaryComponent"]): string {
    if (objCalc.blnIsEligible || objCalc.blnEligibilityOverride) {
      return "";
    }
    const strThreshold = objComponent?.decAttendanceEligibilityPercent
      ? `${objComponent.decAttendanceEligibilityPercent}%`
      : t("threshold_unset", "the configured threshold");
    const strActual = objCalc.decPayableDaysPercent ? `${Number(objCalc.decPayableDaysPercent).toFixed(2)}%` : "-";
    return t(
      "below_attendance_threshold_tooltip",
      `Attendance is ${strActual}, below the ${strThreshold} required for this component. Use Override to proceed, or this employee stays at ₹0.`,
    )
      .replace("{{actual}}", strActual)
      .replace("{{threshold}}", strThreshold);
  }

  if (blnLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <BlockingLoader blnOpen strLabel={t("loading", "Loading Variable Pay workspace...")} />
      </Box>
    );
  }

  if (!objWorkspace) {
    return (
      <Box sx={{ p: 2 }}>
        {strError ? <Alert severity="error">{strError}</Alert> : null}
      </Box>
    );
  }

  const objComponent = objWorkspace.objSalaryComponent;
  const blnComponentConfigured = Boolean(objWorkspace.intSalaryComponentID && objComponent);
  const blnAttendanceApplicable = Boolean(
    objComponent?.blnAttendanceEligibilityApplicable || objComponent?.blnAttendanceProrationApplicable,
  );
  // expand + employee + base + (attendance?) + eligible + calculated + status + actions
  const intTotalColumnCount = 7 + (blnAttendanceApplicable ? 1 : 0);
  const intDirtyCount = setDirtyEmployeeSalaryComponentIDs.size;

  return (
    <Stack spacing={1.5}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      {strError ? <Alert severity="error" onClose={() => setStrError(null)}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess(null)}>{strSuccess}</Alert> : null}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        <Chip label={`${t("variable_pay_type", "Variable Pay Type")}: ${objWorkspace.strVariablePayTypeName}`} />
        <Chip label={`${t("payroll_month", "Payroll Month")}: ${objWorkspace.dtPayrollMonth}`} />
        {objComponent ? <Chip color="primary" label={`${t("salary_component", "Salary Component")}: ${objComponent.strComponentName}`} /> : null}
        {objComponent?.blnAttendanceEligibilityApplicable ? (
          <Chip
            color="warning"
            label={`${t("eligibility_threshold", "Attendance Eligibility")}: >= ${objComponent.decAttendanceEligibilityPercent ?? "-"}%`}
          />
        ) : null}
      </Box>

      {!blnComponentConfigured ? (
        <Alert severity="info">
          {t(
            "no_component_configured",
            "This run's Variable Pay Type has no Allocation-Based salary component linked, so there is nothing to calculate here. Use the Manual / Import section below for ad-hoc amounts.",
          )}
        </Alert>
      ) : strView === "declaration" ? (
        <Paper sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>{t("declaration_title", "Entity Declarations")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", mt: 0.25 }}>
                {t(
                  "declaration_help",
                  "Declare each entity's adjustment % for the employee(s) mapped to it. Use \"Apply to all\" to fill everyone at once, then fine-tune any employee individually - each stays their own value.",
                )}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                size="small"
                label={t("declaring_for_month", "Declaring For")}
                type="month"
                value={objWorkspace.dtPayrollMonth.slice(0, 7)}
                disabled
                helperText={t("declaring_for_month_help", "This run's own payroll month")}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 170 }}
              />
              <Button
                size="small"
                variant="contained"
                startIcon={<CalculateRoundedIcon />}
                onClick={() => void handleSaveAndCalculate()}
                disabled={blnBusy || lstComponentRows.length === 0}
                data-control-id="payroll.run-detail.variable-pay.save-and-calculate.button"
              >
                {t("save_and_calculate", "Save & Calculate")}
              </Button>
            </Stack>
          </Stack>

          {lstEntityGroups.length === 0 ? (
            <Typography sx={{ color: "#94a3b8" }}>
              {t("no_entities_configured", "No allocation entities are configured for this component's entity type.")}
            </Typography>
          ) : (
            <TableContainer sx={{ maxWidth: 300 }}>
              <Table size="small" sx={{ width: "auto", tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 36, p: "6px 4px" }} />
                    <TableCell sx={{ width: 110 }}>{t("unit", "Unit")}</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>{t("declare_percentage", "Declare Percentage")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstEntityGroups.map(({ objEntity, lstEmployeeRows }) => {
                    const blnMultiEmployee = lstEmployeeRows.length > 1;
                    const blnExpanded = setExpandedEntityIDs.has(objEntity.intID);
                    const objSingle = lstEmployeeRows[0];
                    const blnSingleLocked =
                      objSingle &&
                      ENTITY_VALUE_LOCKED_STATUSES.has(
                        strEntityStatusByKey[entityKey(objSingle.objRow.intEmployeeSalaryComponentID, objEntity.intID)] ?? "DRAFT",
                      );
                    return (
                      <Fragment key={objEntity.intID}>
                        <TableRow hover>
                          <TableCell>
                            {blnMultiEmployee ? (
                              <IconButton size="small" onClick={() => toggleExpandedEntity(objEntity.intID)}>
                                {blnExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                              </IconButton>
                            ) : null}
                          </TableCell>
                          <TableCell>{objEntity.strEntityCode}</TableCell>
                          {blnMultiEmployee ? (
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                                <TextField
                                  size="small"
                                  type="number"
                                  placeholder={t("apply_to_all_percent", "% for all")}
                                  value={dicBulkValueByEntityID[objEntity.intID] ?? ""}
                                  onChange={(objEvent) =>
                                    setDicBulkValueByEntityID((dicPrevious) => ({ ...dicPrevious, [objEntity.intID]: objEvent.target.value }))
                                  }
                                  disabled={!blnCanEditEntityValues || blnBusy}
                                  inputProps={{
                                    controlId: `payroll.run-detail.variable-pay.declaration-bulk-${objEntity.intID}.input`,
                                    step: "0.0001",
                                    style: { textAlign: "right" },
                                  }}
                                  sx={{ width: 100 }}
                                />
                                <Button
                                  size="small"
                                  disabled={!blnCanEditEntityValues || blnBusy || (dicBulkValueByEntityID[objEntity.intID] ?? "").trim() === ""}
                                  onClick={() =>
                                    applyBulkAdjustmentToEntity(
                                      objEntity.intID,
                                      dicBulkValueByEntityID[objEntity.intID] ?? "",
                                      lstEmployeeRows.map((dicItem) => dicItem.objRow),
                                    )
                                  }
                                  data-control-id={`payroll.run-detail.variable-pay.declaration-bulk-apply-${objEntity.intID}.button`}
                                >
                                  {t("apply_to_all", "Apply to all")}
                                </Button>
                              </Stack>
                            </TableCell>
                          ) : objSingle ? (
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={adjustmentPercentFor(objSingle.objRow.intEmployeeSalaryComponentID, objEntity.intID)}
                                onChange={(objEvent) =>
                                  updateAdjustmentPercent(objSingle.objRow.intEmployeeSalaryComponentID, objEntity.intID, objEvent.target.value)
                                }
                                disabled={!blnCanEditEntityValues || blnBusy || blnSingleLocked}
                                inputProps={{
                                  controlId: `payroll.run-detail.variable-pay.declaration-${objEntity.intID}-employee-${objSingle.objRow.intEmployeeID}.input`,
                                  step: "0.0001",
                                  style: { textAlign: "right" },
                                }}
                                sx={{ width: 110 }}
                                InputProps={
                                  blnSingleLocked
                                    ? {
                                        endAdornment: blnCanApproveEntityValues ? (
                                          <Tooltip title={t("unlock_tooltip", "Unlock to edit again")} arrow>
                                            <IconButton
                                              size="small"
                                              onClick={() => void handleUnlockEmployeeDeclaration(objSingle.objRow)}
                                              disabled={blnBusy}
                                              sx={{ p: 0.25 }}
                                              data-control-id={`payroll.run-detail.variable-pay.declaration-unlock-${objEntity.intID}-employee-${objSingle.objRow.intEmployeeID}.button`}
                                            >
                                              <LockRoundedIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                          </Tooltip>
                                        ) : (
                                          <LockRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                                        ),
                                      }
                                    : undefined
                                }
                              />
                            </TableCell>
                          ) : null}
                        </TableRow>
                        {blnMultiEmployee ? (
                          <TableRow>
                            <TableCell colSpan={3} sx={{ p: 0, border: 0 }}>
                              <Collapse in={blnExpanded} unmountOnExit>
                                <Box sx={{ pl: 5, pr: 1.5, pb: 1, backgroundColor: "#f8fafc" }}>
                                  <Table size="small" sx={{ width: "auto", tableLayout: "fixed" }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ width: 200 }}>{t("employee", "Employee")}</TableCell>
                                        <TableCell align="right" sx={{ width: 150 }}>{t("declare_percentage", "Declare Percentage")}</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {lstEmployeeRows.map(({ objRow }) => {
                                        const blnLocked = ENTITY_VALUE_LOCKED_STATUSES.has(
                                          strEntityStatusByKey[entityKey(objRow.intEmployeeSalaryComponentID, objEntity.intID)] ?? "DRAFT",
                                        );
                                        return (
                                          <TableRow key={objRow.intEmployeeID}>
                                            <TableCell>
                                              {objRow.strEmployeeName}
                                              <Typography component="span" sx={{ color: "#94a3b8", fontSize: "0.75rem", ml: 0.5 }}>
                                                ({objRow.strEmployeeCode})
                                              </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                              <TextField
                                                size="small"
                                                type="number"
                                                value={adjustmentPercentFor(objRow.intEmployeeSalaryComponentID, objEntity.intID)}
                                                onChange={(objEvent) =>
                                                  updateAdjustmentPercent(objRow.intEmployeeSalaryComponentID, objEntity.intID, objEvent.target.value)
                                                }
                                                disabled={!blnCanEditEntityValues || blnBusy || blnLocked}
                                                inputProps={{
                                                  controlId: `payroll.run-detail.variable-pay.declaration-${objEntity.intID}-employee-${objRow.intEmployeeID}.input`,
                                                  step: "0.0001",
                                                  style: { textAlign: "right" },
                                                }}
                                                sx={{ width: 110 }}
                                                InputProps={
                                                  blnLocked
                                                    ? {
                                                        endAdornment: blnCanApproveEntityValues ? (
                                                          <Tooltip title={t("unlock_tooltip", "Unlock to edit again")} arrow>
                                                            <IconButton
                                                              size="small"
                                                              onClick={() => void handleUnlockEmployeeDeclaration(objRow)}
                                                              disabled={blnBusy}
                                                              sx={{ p: 0.25 }}
                                                              data-control-id={`payroll.run-detail.variable-pay.declaration-unlock-${objEntity.intID}-employee-${objRow.intEmployeeID}.button`}
                                                            >
                                                              <LockRoundedIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                          </Tooltip>
                                                        ) : (
                                                          <LockRoundedIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
                                                        ),
                                                      }
                                                    : undefined
                                                }
                                              />
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ) : (
        <Paper sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>
              {t("employee_grid_title", "Employees with this Incentive Component")}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void loadWorkspace()}
                disabled={blnBusy}
                data-control-id="payroll.run-detail.variable-pay.refresh.button"
              >
                {t("refresh", "Refresh")}
              </Button>
              {blnCanEditEntityValues && lstEntities.length > 0 ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveRoundedIcon />}
                  onClick={() => void handleSaveDeclarations()}
                  disabled={blnBusy || intDirtyCount === 0}
                  data-control-id="payroll.run-detail.variable-pay.save-declarations.button"
                >
                  {intDirtyCount > 0
                    ? t("save_declarations_count", `Save (${intDirtyCount})`)
                    : t("save_declarations", "Save")}
                </Button>
              ) : null}
              {blnCanCalculate ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CalculateRoundedIcon />}
                  onClick={() => void handleCalculate()}
                  disabled={blnBusy || lstComponentRows.length === 0}
                  data-control-id="payroll.run-detail.variable-pay.calculate.button"
                >
                  {t("calculate", "Calculate")}
                </Button>
              ) : null}
            </Stack>
          </Stack>
          {lstEntities.length > 0 ? (
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem", mb: 1 }}>
              {t(
                "entity_adjustments_help",
                "Declare each employee's own adjustment % per entity directly in their row below, then Save - it only ever applies to that employee.",
              )}
            </Typography>
          ) : null}

          <TableContainer sx={{ maxHeight: 560, maxWidth: 1050 }}>
            <Table size="small" stickyHeader sx={{ width: "auto", tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36, p: "6px 4px" }} />
                  <TableCell sx={{ width: 220 }}>{t("employee", "Employee")}</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>{t("base_amount", "Base Amount")}</TableCell>
                  {blnAttendanceApplicable ? (
                    <TableCell align="right" sx={{ width: 120 }}>{t("attendance_percent", "Attendance %")}</TableCell>
                  ) : null}
                  <TableCell sx={{ width: 110 }}>{t("eligible", "Eligible")}</TableCell>
                  <TableCell align="right" sx={{ width: 150 }}>{t("calculated_amount", "Calculated Amount")}</TableCell>
                  <TableCell sx={{ width: 120 }}>{t("status", "Status")}</TableCell>
                  <TableCell sx={{ width: 170 }}>{t("actions", "Actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstComponentRows.map((objRow) => {
                  const objCalc = objRow.objCalc;
                  const blnIneligible = Boolean(objCalc && !objCalc.blnIsEligible && !objCalc.blnEligibilityOverride);
                  const blnApproveDisabled =
                    blnBusy ||
                    !objCalc ||
                    CALCULATION_LOCKED_STATUSES.has(objCalc.strStatus) ||
                    blnIneligible;
                  const strApproveTooltip = objCalc ? eligibilityTooltipFor(objCalc, objComponent) : "";
                  const blnExpanded = setExpandedEmployeeIDs.has(objRow.intEmployeeID);
                  return (
                    <Fragment key={objRow.intEmployeeID}>
                      <TableRow hover>
                        <TableCell>
                          {objCalc && objCalc.lstDetails.length > 0 ? (
                            <IconButton size="small" onClick={() => toggleExpanded(objRow.intEmployeeID)}>
                              {blnExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                            </IconButton>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {objRow.strEmployeeName}
                          <Typography component="span" sx={{ color: "#94a3b8", fontSize: "0.75rem", ml: 0.5 }}>
                            ({objRow.strEmployeeCode})
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatAmount(objRow.decBaseAmount)}</TableCell>
                        {blnAttendanceApplicable ? (
                          <TableCell align="right">
                            {objCalc?.decPayableDaysPercent ? `${Number(objCalc.decPayableDaysPercent).toFixed(2)}%` : "-"}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          {objCalc ? (
                            <Chip
                              size="small"
                              label={
                                objCalc.blnIsEligible
                                  ? t("yes", "Yes")
                                  : objCalc.blnEligibilityOverride
                                    ? t("overridden", "Overridden")
                                    : t("no", "No")
                              }
                              color={objCalc.blnIsEligible || objCalc.blnEligibilityOverride ? "success" : "error"}
                            />
                          ) : (
                            <Typography sx={{ color: "#94a3b8" }}>-</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{objCalc ? formatAmount(objCalc.decCalculatedAmount) : "-"}</TableCell>
                        <TableCell>
                          {objCalc ? <Chip size="small" label={objCalc.strStatus} /> : <Chip size="small" label={t("not_calculated", "Not Calculated")} />}
                        </TableCell>
                        <TableCell>
                          {objCalc ? (
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title={strApproveTooltip} arrow disableHoverListener={!strApproveTooltip}>
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() => void handleApproveRow(objCalc)}
                                    disabled={blnApproveDisabled || !blnCanApprove}
                                    data-control-id={`payroll.run-detail.variable-pay.approve-${objCalc.intID}.button`}
                                  >
                                    {t("approve", "Approve")}
                                  </Button>
                                </span>
                              </Tooltip>
                              {blnIneligible && objComponent?.blnEligibilityOverrideAllowed && blnCanApprove ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setObjOverrideTarget(objCalc);
                                    setStrOverrideReason("");
                                    setStrOverrideError(null);
                                  }}
                                  disabled={blnBusy}
                                  data-control-id={`payroll.run-detail.variable-pay.override-${objCalc.intID}.button`}
                                >
                                  {t("override", "Override")}
                                </Button>
                              ) : null}
                            </Stack>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {objCalc && objCalc.lstDetails.length > 0 ? (
                        <TableRow>
                          <TableCell colSpan={intTotalColumnCount} sx={{ p: 0, border: 0 }}>
                            <Collapse in={blnExpanded} unmountOnExit>
                              <Box sx={{ p: 1.5, backgroundColor: "#f8fafc" }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>{t("entity", "Entity")}</TableCell>
                                      <TableCell align="right">{t("allocation_percent", "Allocation %")}</TableCell>
                                      <TableCell align="right">{t("base_share", "Base Share")}</TableCell>
                                      <TableCell align="right">{t("monthly_adjustment_percent", "Adjustment %")}</TableCell>
                                      <TableCell align="right">{t("adjusted_amount", "Adjusted")}</TableCell>
                                      <TableCell align="right">{t("prorated_amount", "Prorated")}</TableCell>
                                      <TableCell align="right">{t("final_detail_amount", "Final")}</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {objCalc.lstDetails.map((objDetail) => {
                                      const objEntity = lstEntities.find((objE) => objE.intID === objDetail.intAllocationEntityID);
                                      return (
                                        <TableRow key={objDetail.intAllocationEntityID}>
                                          <TableCell>{objEntity?.strEntityName ?? `#${objDetail.intAllocationEntityID}`}</TableCell>
                                          <TableCell align="right">{formatAmount(objDetail.decAllocationPercent)}</TableCell>
                                          <TableCell align="right">{formatAmount(objDetail.decBaseShareAmount)}</TableCell>
                                          <TableCell align="right">{formatAmount(objDetail.decMonthlyAdjustmentPercent)}</TableCell>
                                          <TableCell align="right">{formatAmount(objDetail.decAdjustedAmount)}</TableCell>
                                          <TableCell align="right">{formatAmount(objDetail.decProratedAmount)}</TableCell>
                                          <TableCell align="right">{formatAmount(objDetail.decFinalDetailAmount)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
                {lstComponentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={intTotalColumnCount}>
                      {t(
                        "no_component_employees",
                        "No employees for this payroll month have this Incentive component in their salary.",
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Manual / Import - unchanged from the standalone Monthly Variable Pay screen, just
          embedded here so nothing needs a separate page for the ad-hoc/import case. Only shown
          on the Variable Pay (grid) view - Declaration is entity-adjustment-only. */}
      {strView === "grid" && blnCanEditManual ? (
        <Paper sx={{ p: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", mb: 1 }}>
            {t("manual_import_title", "Manual Entry / Import")}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.8rem", mb: 1.5 }}>
            {t(
              "manual_import_help",
              "For amounts outside the allocation formula above - a one-off addition, or a bulk import for employees not covered by this component.",
            )}
          </Typography>
          <VariablePayImportPanel intRunID={intPayrollRunID} onImported={() => void loadWorkspace()} blnInlineActions />
        </Paper>
      ) : null}

      <CommonMasterDialog
        blnOpen={Boolean(objOverrideTarget)}
        onClose={() => {
          setObjOverrideTarget(null);
          setStrOverrideError(null);
        }}
        rootTestId="payroll.run-detail.variable-pay.override-dialog"
        cancelButtonTestId="payroll.run-detail.variable-pay.override-dialog.cancel.button"
        primaryButtonTestId="payroll.run-detail.variable-pay.override-dialog.save.button"
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
              inputProps={{ controlId: "payroll.run-detail.variable-pay.override-dialog.reason.input", maxLength: 500 }}
              multiline
              minRows={3}
              fullWidth
              sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
            />
          </Box>
        }
      />

    </Stack>
  );
}
