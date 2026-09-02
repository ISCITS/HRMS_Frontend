"use client";

import { useEffect, useMemo, useState } from "react";

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

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { PayrollRunListRecord } from "@/features/payroll/types";
import { variablePayService } from "@/features/variable-pay/services/variablePayService";
import type { VariablePayEmployeeRow, VariablePayRunContext } from "@/features/variable-pay/types";
import VariablePayImportPanel from "@/features/variable-pay/components/VariablePayImportPanel";

const lstVariablePayModuleCodes = ["PAYROLL_VARIABLE_PAY", "MONTHLY_VARIABLE_PAY", "VARIABLE_PAY"];

const LOCKED_STATUSES = new Set(["APPROVED", "LOCKED", "POSTED"]);

export default function VariablePayGridPage() {
  const { t } = useModuleLabels("variable-pay", "Unable to load Monthly Variable Pay labels.");
  const objAccess = useModuleActionAccess(lstVariablePayModuleCodes);
  const blnCanEdit = objAccess.canDoAny("edit") || objAccess.canDoAny("add");
  const blnCanApprove = objAccess.canDoAny("approve");

  const [lstRuns, setLstRuns] = useState<PayrollRunListRecord[]>([]);
  const [intSelectedRunID, setIntSelectedRunID] = useState<number | "">("");
  const [objContext, setObjContext] = useState<VariablePayRunContext | null>(null);
  const [lstEmployees, setLstEmployees] = useState<VariablePayEmployeeRow[]>([]);
  const [dicPendingAmounts, setDicPendingAmounts] = useState<Record<number, string>>({});
  const [setSelectedEmployeeIDs, setSetSelectedEmployeeIDs] = useState<Set<number>>(new Set());
  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);
  const [strSuccess, setStrSuccess] = useState<string | null>(null);

  useEffect(() => {
    let blnMounted = true;
    if (objAccess.blnLoading) return;
    payrollRunService
      .getPayrollRuns()
      .then((lstAllRuns) => {
        if (!blnMounted) return;
        setLstRuns(lstAllRuns.filter((objRun) => objRun.strRunTypeCode === "VARIABLE_PAY"));
      })
      .catch((objErr) => {
        if (blnMounted) setStrError((objErr as Error)?.message ?? t("load_runs_failed", "Unable to load Variable Pay runs."));
      });
    return () => {
      blnMounted = false;
    };
  }, [objAccess.blnLoading, t]);

  async function loadRun(intRunID: number) {
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const [objRunContext, lstRows] = await Promise.all([
        variablePayService.getRunContext(intRunID),
        variablePayService.listEligibleEmployees(intRunID),
      ]);
      setObjContext(objRunContext);
      setLstEmployees(lstRows);
      setDicPendingAmounts({});
      setSetSelectedEmployeeIDs(new Set());
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("load_context_failed", "Unable to load the selected Variable Pay run."));
      setObjContext(null);
      setLstEmployees([]);
    } finally {
      setBlnBusy(false);
    }
  }

  function handleSelectRun(intRunID: number | "") {
    setIntSelectedRunID(intRunID);
    if (intRunID) {
      void loadRun(intRunID);
    } else {
      setObjContext(null);
      setLstEmployees([]);
    }
  }

  function amountFor(objRow: VariablePayEmployeeRow): string {
    if (objRow.intEmployeeID in dicPendingAmounts) {
      return dicPendingAmounts[objRow.intEmployeeID];
    }
    return objRow.decAmount != null ? String(objRow.decAmount) : "";
  }

  function updateAmount(intEmployeeID: number, strValue: string) {
    setDicPendingAmounts((dicPrevious) => ({ ...dicPrevious, [intEmployeeID]: strValue }));
  }

  function toggleEmployee(intEmployeeID: number, blnChecked: boolean) {
    setSetSelectedEmployeeIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (blnChecked) objNext.add(intEmployeeID);
      else objNext.delete(intEmployeeID);
      return objNext;
    });
  }

  const lstEditableRows = useMemo(
    () => lstEmployees.filter((objRow) => !LOCKED_STATUSES.has(objRow.strStatus)),
    [lstEmployees],
  );

  async function handleBulkSave() {
    if (!intSelectedRunID) return;
    const lstTransactions = Object.entries(dicPendingAmounts)
      .map(([strEmployeeID, strAmount]) => ({ intEmployeeID: Number(strEmployeeID), strAmount }))
      .filter((dicEntry) => dicEntry.strAmount.trim() !== "" && !Number.isNaN(Number(dicEntry.strAmount)))
      .map((dicEntry) => ({ intEmployeeID: dicEntry.intEmployeeID, decInputAmount: Number(dicEntry.strAmount) }));
    if (lstTransactions.length === 0) {
      setStrError(t("no_amounts_entered", "Enter at least one amount before saving."));
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objResult = await variablePayService.saveManualTransactions(intSelectedRunID, lstTransactions);
      setStrSuccess(t("save_success", "Saved {{count}} transaction(s).").replace("{{count}}", String(objResult.intSaved)));
      await loadRun(intSelectedRunID);
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("save_failed", "Unable to save Variable Pay transactions."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleTransition(strAction: "validate" | "approve") {
    if (!intSelectedRunID || setSelectedEmployeeIDs.size === 0) {
      setStrError(t("no_rows_selected", "Select at least one row first."));
      return;
    }
    const lstTransactionIDs = lstEmployees
      .filter((objRow) => setSelectedEmployeeIDs.has(objRow.intEmployeeID) && objRow.intTransactionID)
      .map((objRow) => objRow.intTransactionID as number);
    if (lstTransactionIDs.length === 0) {
      setStrError(t("no_saved_rows_selected", "Selected rows have no saved transaction yet."));
      return;
    }
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objResult =
        strAction === "validate"
          ? await variablePayService.validateTransactions(intSelectedRunID, lstTransactionIDs)
          : await variablePayService.approveTransactions(intSelectedRunID, lstTransactionIDs);
      setStrSuccess(
        strAction === "validate"
          ? t("validate_success", "Validated {{count}} transaction(s).").replace("{{count}}", String(objResult.intUpdatedCount))
          : t("approve_success", "Approved {{count}} transaction(s).").replace("{{count}}", String(objResult.intUpdatedCount)),
      );
      await loadRun(intSelectedRunID);
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("transition_failed", "Unable to update selected transactions."));
    } finally {
      setBlnBusy(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      <Typography variant="h5" fontWeight={800}>
        {t("page_title", "Monthly Variable Pay")}
      </Typography>

      {strError ? <Alert severity="error" onClose={() => setStrError(null)}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess(null)}>{strSuccess}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }} gap={2}>
          <TextField
            select
            required
            label={t("select_run", "Variable Pay Run")}
            value={intSelectedRunID}
            onChange={(objEvent) => handleSelectRun(objEvent.target.value ? Number(objEvent.target.value) : "")}
            fullWidth
            sx={{ maxWidth: { xs: "100%", md: 480 } }}
            data-controlid="variable-pay.grid.run-select"
          >
            <MenuItem value="">{t("select_run_placeholder", "Select a Variable Pay run")}</MenuItem>
            {lstRuns.map((objRun) => (
              <MenuItem key={objRun.intID} value={objRun.intID}>
                {objRun.strRunCode} - {objRun.strRunName}
              </MenuItem>
            ))}
          </TextField>
          {objContext && blnCanEdit ? (
            <Box sx={{ minWidth: { xs: "100%", md: "auto" } }}>
              <VariablePayImportPanel
                intRunID={intSelectedRunID as number}
                onImported={() => intSelectedRunID && loadRun(intSelectedRunID)}
                blnInlineActions
              />
            </Box>
          ) : null}
        </Stack>

        {objContext ? (
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Chip label={`${t("schedule", "Schedule")}: ${objContext.strScheduleName ?? "-"}`} />
            <Chip label={`${t("payroll_group", "Payroll Group")}: ${objContext.strPayrollGroupName ?? "-"}`} />
            <Chip label={`${t("payroll_month", "Payroll Month")}: ${objContext.dtPayrollMonth ?? "-"}`} />
            <Chip label={`${t("payment_date", "Payment Date")}: ${objContext.dtPaymentDate ?? "-"}`} />
            <Chip label={`${t("variable_pay_type", "Variable Pay Type")}: ${objContext.strVariablePayTypeName}`} />
            <Chip label={`${t("scope", "Scope")}: ${objContext.strScopeType}`} />
          </Box>
        ) : null}
      </Paper>

      {objContext ? (
        <>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="h6">{t("employee_grid", "Employee Grid")}</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => intSelectedRunID && loadRun(intSelectedRunID)}
                  data-controlid="variable-pay.grid.refresh.button"
                >
                  {t("refresh", "Refresh")}
                </Button>
                {blnCanEdit ? (
                  <Button
                    variant="contained"
                    startIcon={<SaveRoundedIcon />}
                    onClick={handleBulkSave}
                    data-controlid="variable-pay.grid.save.button"
                  >
                    {t("save_amounts", "Save Amounts")}
                  </Button>
                ) : null}
                <Button
                  variant="outlined"
                  onClick={() => handleTransition("validate")}
                  disabled={!blnCanEdit}
                  data-controlid="variable-pay.grid.validate.button"
                >
                  {t("validate", "Validate")}
                </Button>
                {blnCanApprove ? (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handleTransition("approve")}
                    data-controlid="variable-pay.grid.approve.button"
                  >
                    {t("approve", "Approve")}
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <TableContainer sx={{ maxHeight: 520 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                    <TableCell>{t("employee_name", "Name")}</TableCell>
                    <TableCell>{t("department", "Department")}</TableCell>
                    <TableCell>{t("location", "Location")}</TableCell>
                    <TableCell>{t("variable_pay_type", "Variable Pay Type")}</TableCell>
                    <TableCell>{t("amount", "Amount")}</TableCell>
                    <TableCell>{t("source", "Source")}</TableCell>
                    <TableCell>{t("status", "Status")}</TableCell>
                    <TableCell>{t("remarks", "Remarks")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstEmployees.map((objRow) => {
                    const blnLocked = LOCKED_STATUSES.has(objRow.strStatus);
                    return (
                      <TableRow key={objRow.intEmployeeID} hover>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={setSelectedEmployeeIDs.has(objRow.intEmployeeID)}
                            onChange={(objEvent) => toggleEmployee(objRow.intEmployeeID, objEvent.target.checked)}
                            disabled={!objRow.intTransactionID}
                          />
                        </TableCell>
                        <TableCell>{objRow.strEmployeeCode}</TableCell>
                        <TableCell>{objRow.strEmployeeName}</TableCell>
                        <TableCell>{objRow.strDepartment ?? "-"}</TableCell>
                        <TableCell>{objRow.strLocation ?? "-"}</TableCell>
                        <TableCell>{objContext?.strVariablePayTypeName ?? "-"}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={amountFor(objRow)}
                            onChange={(objEvent) => updateAmount(objRow.intEmployeeID, objEvent.target.value)}
                            disabled={!blnCanEdit || blnLocked}
                            data-controlid={`variable-pay.grid.amount-${objRow.intEmployeeID}.input`}
                          />
                        </TableCell>
                        <TableCell>{objRow.strSourceType ?? "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={objRow.strStatus}
                            color={blnLocked ? "success" : "default"}
                          />
                        </TableCell>
                        <TableCell>{objRow.strRemarks ?? "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {lstEditableRows.length === 0 && lstEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10}>{t("no_employees", "No eligible employees found for this run.")}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

        </>
      ) : null}
    </Stack>
  );
}
