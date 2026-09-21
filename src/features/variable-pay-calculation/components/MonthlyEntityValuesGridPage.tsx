"use client";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  allocationMasterService,
  type AllocationEntityApiRecord,
} from "@/features/allocation-masters/services/allocationMasterService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { variablePayCalculationService } from "@/features/variable-pay-calculation/services/variablePayCalculationService";
import type {
  AllocationBasedComponentOption,
  MonthlyEntityValueRecord,
  MonthlyEntityValueStatus,
} from "@/features/variable-pay-calculation/types";
import { authHelpers } from "@/lib/auth";

const lstMonthlyEntityValueModuleCodes = ["VARIABLE_PAY_MONTHLY_ENTITY_VALUES", "MONTHLY_ALLOCATION_ENTITY_VALUES"];

// Mirrors VariablePayGridPage's LOCKED_STATUSES pattern: once a month is approved or locked
// the grid becomes read-only and the backend rejects further saves.
const LOCKED_STATUSES = new Set(["APPROVED", "LOCKED"]);

function toMonthInputValue(strPayrollMonth: string) {
  return strPayrollMonth ? strPayrollMonth.slice(0, 7) : "";
}

function toPayrollMonth(strMonthInputValue: string) {
  return strMonthInputValue ? `${strMonthInputValue}-01` : "";
}

function currentMonthInputValue() {
  const objNow = new Date();
  return `${objNow.getFullYear()}-${String(objNow.getMonth() + 1).padStart(2, "0")}`;
}

// Monthly Allocation Entity Values: the per-entity adjustment % for one
// Company + Payroll Month + Allocation-Based Salary Component.
export default function MonthlyEntityValuesGridPage() {
  const { t } = useModuleLabels(
    "variable-pay-monthly-entity-values",
    "Unable to load Monthly Allocation Entity Value labels.",
  );
  const objAccess = useModuleActionAccess(lstMonthlyEntityValueModuleCodes);
  const blnCanEdit = objAccess.canDoAny("edit") || objAccess.canDoAny("add");
  const blnCanApprove = objAccess.canDoAny("approve");

  const [lstComponents, setLstComponents] = useState<AllocationBasedComponentOption[]>([]);
  const [lstEntities, setLstEntities] = useState<AllocationEntityApiRecord[]>([]);
  const [lstValues, setLstValues] = useState<MonthlyEntityValueRecord[]>([]);
  const [dicPendingPercent, setDicPendingPercent] = useState<Record<number, string>>({});
  const [dicPendingRemarks, setDicPendingRemarks] = useState<Record<number, string>>({});

  // No company-list service exists in this codebase, so the signed-in company from
  // authHelpers is used and shown as an editable override for multi-company testing.
  const [intCompanyID, setIntCompanyID] = useState<number | "">("");
  const [strMonthInputValue, setStrMonthInputValue] = useState<string>(currentMonthInputValue());
  const [intSalaryComponentID, setIntSalaryComponentID] = useState<number | "">("");
  const [blnLoaded, setBlnLoaded] = useState(false);

  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);
  const [strSuccess, setStrSuccess] = useState<string | null>(null);

  useEffect(() => {
    setIntCompanyID(authHelpers.getCompanyID() ?? "");
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
          (objErr as Error)?.message ?? t("load_components_failed", "Unable to load Allocation-Based salary components."),
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objAccess.blnLoading]);

  const objSelectedComponent = useMemo(
    () => lstComponents.find((dicComponent) => dicComponent.intID === intSalaryComponentID) ?? null,
    [lstComponents, intSalaryComponentID],
  );

  const dicValueByEntityID = useMemo(() => {
    const dicMap: Record<number, MonthlyEntityValueRecord> = {};
    for (const dicValue of lstValues) {
      dicMap[dicValue.intAllocationEntityID] = dicValue;
    }
    return dicMap;
  }, [lstValues]);

  // All rows for a month/component share one status, so the first saved row drives the grid.
  const strCurrentStatus = lstValues[0]?.strStatus ?? "DRAFT";
  const blnLocked = LOCKED_STATUSES.has(strCurrentStatus);

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

  async function handleLoad() {
    const dicFilters = resolveFilters();
    if (!dicFilters) {
      return;
    }
    const objComponent = lstComponents.find((dicComponent) => dicComponent.intID === dicFilters.intSalaryComponentID);
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const [lstSavedValues, lstActiveEntities] = await Promise.all([
        variablePayCalculationService.listMonthlyEntityValues(dicFilters),
        objComponent?.intAllocationEntityTypeID
          ? allocationMasterService.listEntities(objComponent.intAllocationEntityTypeID, true)
          : Promise.resolve([] as AllocationEntityApiRecord[]),
      ]);
      setLstValues(lstSavedValues);
      setLstEntities(lstActiveEntities);
      setDicPendingPercent({});
      setDicPendingRemarks({});
      setBlnLoaded(true);
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("load_failed", "Unable to load monthly allocation entity values."));
      setLstValues([]);
      setLstEntities([]);
      setBlnLoaded(false);
    } finally {
      setBlnBusy(false);
    }
  }

  function percentFor(intEntityID: number) {
    if (intEntityID in dicPendingPercent) {
      return dicPendingPercent[intEntityID];
    }
    return dicValueByEntityID[intEntityID]?.decAdjustmentPercent ?? "";
  }

  function remarksFor(intEntityID: number) {
    if (intEntityID in dicPendingRemarks) {
      return dicPendingRemarks[intEntityID];
    }
    return dicValueByEntityID[intEntityID]?.strRemarks ?? "";
  }

  async function handleSave() {
    const dicFilters = resolveFilters();
    if (!dicFilters) {
      return;
    }
    const lstPayloadValues = lstEntities
      .map((dicEntity) => ({
        intAllocationEntityID: dicEntity.intID,
        strPercent: percentFor(dicEntity.intID),
        strRemarks: remarksFor(dicEntity.intID),
      }))
      .filter((dicRow) => dicRow.strPercent.trim() !== "" && !Number.isNaN(Number(dicRow.strPercent)))
      .map((dicRow) => ({
        intAllocationEntityID: dicRow.intAllocationEntityID,
        decAdjustmentPercent: Number(dicRow.strPercent),
        strRemarks: dicRow.strRemarks.trim() || null,
      }));

    if (lstPayloadValues.length === 0) {
      setStrError(t("no_values_entered", "Enter at least one adjustment percentage before saving."));
      return;
    }

    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      await variablePayCalculationService.saveMonthlyEntityValues({ ...dicFilters, lstValues: lstPayloadValues });
      setStrSuccess(t("save_success", "Monthly allocation entity values saved."));
      await handleLoad();
    } catch (objErr) {
      // Surfaces the backend's "already APPROVED/LOCKED" block verbatim.
      setStrError((objErr as Error)?.message ?? t("save_failed", "Unable to save monthly allocation entity values."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleStatusTransition(strStatus: MonthlyEntityValueStatus) {
    const dicFilters = resolveFilters();
    if (!dicFilters) {
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      await variablePayCalculationService.setMonthlyEntityValueStatus({ ...dicFilters, strStatus });
      setStrSuccess(
        t("status_success", "Monthly allocation entity values moved to {{status}}.").replace("{{status}}", strStatus),
      );
      await handleLoad();
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("status_failed", "Unable to update the status."));
    } finally {
      setBlnBusy(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />

      <Typography variant="h5" fontWeight={800}>
        {t("page_title", "Monthly Allocation Entity Values")}
      </Typography>

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
          {t("access_denied", "Monthly Allocation Entity Values access is not available for your user group.")}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ xs: "stretch", md: "flex-end" }}>
          <TextField
            label={t("company", "Company ID")}
            type="number"
            value={intCompanyID}
            onChange={(objEvent) =>
              setIntCompanyID(objEvent.target.value === "" ? "" : Number(objEvent.target.value))
            }
            inputProps={{ controlId: "variable-pay-monthly-values.filter.company.input", min: 1 }}
            helperText={t("company_help", "Defaults to your signed-in company.")}
            sx={{ minWidth: { xs: "100%", md: 180 } }}
          />
          <TextField
            label={t("payroll_month", "Payroll Month")}
            type="month"
            value={strMonthInputValue}
            onChange={(objEvent) => setStrMonthInputValue(objEvent.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ controlId: "variable-pay-monthly-values.filter.month.input" }}
            sx={{ minWidth: { xs: "100%", md: 200 } }}
          />
          <TextField
            select
            label={t("salary_component", "Salary Component")}
            value={intSalaryComponentID}
            onChange={(objEvent) =>
              setIntSalaryComponentID(objEvent.target.value === "" ? "" : Number(objEvent.target.value))
            }
            inputProps={{ controlId: "variable-pay-monthly-values.filter.component.select" }}
            sx={{ minWidth: { xs: "100%", md: 320 } }}
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
          <Button
            variant="contained"
            onClick={() => void handleLoad()}
            disabled={blnBusy || !objAccess.canViewAny()}
            data-control-id="variable-pay-monthly-values.filter.load.button"
            sx={{ minHeight: 40 }}
          >
            {t("load", "Load")}
          </Button>
        </Stack>

        {blnLoaded ? (
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Chip
              color={blnLocked ? "success" : "default"}
              label={`${t("status", "Status")}: ${strCurrentStatus}`}
              data-control-id="variable-pay-monthly-values.summary.status.chip"
            />
            <Chip label={`${t("entities", "Entities")}: ${lstEntities.length}`} />
            <Chip label={`${t("saved_rows", "Saved Rows")}: ${lstValues.length}`} />
            {objSelectedComponent && !objSelectedComponent.blnMonthlyAdjustmentApplicable ? (
              <Chip
                color="warning"
                label={t("adjustment_not_applicable", "Monthly adjustment is not applicable for this component")}
              />
            ) : null}
            {objSelectedComponent?.decMonthlyAdjustmentMinPercent != null ||
            objSelectedComponent?.decMonthlyAdjustmentMaxPercent != null ? (
              <Chip
                label={`${t("allowed_range", "Allowed Range")}: ${
                  objSelectedComponent?.decMonthlyAdjustmentMinPercent ?? "-"
                } % .. ${objSelectedComponent?.decMonthlyAdjustmentMaxPercent ?? "-"} %`}
              />
            ) : null}
          </Box>
        ) : null}
      </Paper>

      {blnLoaded ? (
        <Paper sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{ mb: 1.5 }}
          >
            <Typography variant="h6">{t("entity_grid", "Entity Adjustment Grid")}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void handleLoad()}
                disabled={blnBusy}
                data-control-id="variable-pay-monthly-values.grid.refresh.button"
              >
                {t("refresh", "Refresh")}
              </Button>
              {blnCanEdit ? (
                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={() => void handleSave()}
                  disabled={blnBusy || blnLocked}
                  data-control-id="variable-pay-monthly-values.grid.save.button"
                >
                  {t("save", "Save")}
                </Button>
              ) : null}
              {blnCanApprove ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => void handleStatusTransition("VALIDATED")}
                    disabled={blnBusy || blnLocked || lstValues.length === 0}
                    data-control-id="variable-pay-monthly-values.grid.validate.button"
                  >
                    {t("validate", "Validate")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => void handleStatusTransition("APPROVED")}
                    disabled={blnBusy || lstValues.length === 0 || strCurrentStatus === "LOCKED"}
                    data-control-id="variable-pay-monthly-values.grid.approve.button"
                  >
                    {t("approve", "Approve")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => void handleStatusTransition("LOCKED")}
                    disabled={blnBusy || lstValues.length === 0}
                    data-control-id="variable-pay-monthly-values.grid.lock.button"
                  >
                    {t("lock", "Lock")}
                  </Button>
                </>
              ) : null}
            </Stack>
          </Stack>

          {blnLocked ? (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              {t("locked_notice", "This month is approved or locked, so the adjustment values are read-only.")}
            </Alert>
          ) : null}

          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t("entity_code", "Entity Code")}</TableCell>
                  <TableCell>{t("entity_name", "Entity Name")}</TableCell>
                  <TableCell align="right">{t("adjustment_percent", "Adjustment %")}</TableCell>
                  <TableCell>{t("row_status", "Status")}</TableCell>
                  <TableCell>{t("source", "Source")}</TableCell>
                  <TableCell>{t("remarks", "Remarks")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstEntities.map((dicEntity) => {
                  const dicSavedValue = dicValueByEntityID[dicEntity.intID];
                  return (
                    <TableRow key={dicEntity.intID} hover>
                      <TableCell>{dicEntity.strEntityCode}</TableCell>
                      <TableCell>{dicEntity.strEntityName}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={percentFor(dicEntity.intID)}
                          onChange={(objEvent) =>
                            setDicPendingPercent((dicPrevious) => ({
                              ...dicPrevious,
                              [dicEntity.intID]: objEvent.target.value,
                            }))
                          }
                          disabled={!blnCanEdit || blnLocked || blnBusy}
                          inputProps={{
                            controlId: `variable-pay-monthly-values.grid.percent-${dicEntity.intID}.input`,
                            step: "0.0001",
                            style: { textAlign: "right" },
                          }}
                          sx={{ width: 140 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={dicSavedValue?.strStatus ?? t("not_saved", "Not Saved")}
                          color={dicSavedValue && LOCKED_STATUSES.has(dicSavedValue.strStatus) ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell>{dicSavedValue?.strSourceType ?? "-"}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={remarksFor(dicEntity.intID)}
                          onChange={(objEvent) =>
                            setDicPendingRemarks((dicPrevious) => ({
                              ...dicPrevious,
                              [dicEntity.intID]: objEvent.target.value,
                            }))
                          }
                          disabled={!blnCanEdit || blnLocked || blnBusy}
                          inputProps={{ controlId: `variable-pay-monthly-values.grid.remarks-${dicEntity.intID}.input` }}
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lstEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      {t("no_entities", "No active Allocation Entities found for this component's entity type.")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}
    </Stack>
  );
}
