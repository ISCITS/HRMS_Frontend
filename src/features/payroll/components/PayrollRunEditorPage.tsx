"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import masterStyles from "@/components/master/MasterScreen.module.css";
import payrollStyles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createInitialPayrollRunForm,
  payrollRunService,
} from "@/features/payroll/services/payrollRunService";
import type {
  PayrollRunFormOptions,
  PayrollRunFormValues,
  PayrollRunStatus,
} from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];
const lstEditableRunStatuses: PayrollRunStatus[] = ["Open", "Submitted", "Approved"];

function formatPayrollMonthLabel(strDate: string) {
  if (!strDate) {
    return "";
  }
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

export default function PayrollRunEditorPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { t: tCommon } = useModuleLabels("common");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny } = useModuleActionAccess(lstPayrollRunModuleCodes);
  const [dicForm, setDicForm] = useState<PayrollRunFormValues>(
    createInitialPayrollRunForm()
  );
  const [objOptions, setObjOptions] = useState<PayrollRunFormOptions | null>(null);
  const [blnLoadingOptions, setBlnLoadingOptions] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const blnCanAdd = canDoAny("add");
  const blnFieldDisabled = blnSaving || blnLoadingOptions || blnRightsLoading || !blnCanAdd;

  function updateField<TKey extends keyof PayrollRunFormValues>(
    strField: TKey,
    objValue: PayrollRunFormValues[TKey]
  ) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function buildSuggestedRunName(
    strPayrollMonth: string,
    intPayrollCycleID: number | "",
    strProcessFor: PayrollRunFormValues["strProcessFor"]
  ) {
    const strMonthLabel = formatPayrollMonthLabel(strPayrollMonth);
    if (!strMonthLabel) {
      return "";
    }
    const dicCycle = objOptions?.lstPayrollCycles.find(
      (dicItem) => dicItem.intID === intPayrollCycleID
    );
    const strCycleLabel = dicCycle?.strLabel?.trim() ?? "";
    const blnUseCycleLabel =
      strProcessFor === "PayrollGroup" &&
      strCycleLabel &&
      !/monthly payroll schedule/i.test(strCycleLabel) &&
      !/^monthly$/i.test(strCycleLabel);
    return blnUseCycleLabel ? `${strMonthLabel} ${strCycleLabel}` : `${strMonthLabel} Payroll`;
  }

  function validateForm() {
    if (!dicForm.intPayrollCycleID) {
      return t("payroll_cycle_required", "Payroll cycle is required.");
    }
    if (!dicForm.strRunName.trim()) {
      return t("run_name_required", "Run name is required.");
    }
    if (!dicForm.dtPayrollMonth) {
      return t("payroll_month_required", "Payroll month is required.");
    }
    if (dicForm.strScopeType === "SelectedEmployee" && !dicForm.intScopedEmployeeID) {
      return t("scoped_employee_required", "Employee is required for selected employee payroll run.");
    }
    return "";
  }

  useEffect(() => {
    if (blnRightsLoading || !blnCanAdd) {
      setBlnLoadingOptions(false);
      return;
    }

    let blnMounted = true;
    setBlnLoadingOptions(true);
    payrollRunService
      .getFormOptions()
      .then((dicOptions) => {
        if (!blnMounted) {
          return;
        }
        setObjOptions(dicOptions);
        const intMonthlyCycleID =
          dicOptions.lstPayrollCycles.find(
            (dicCycle) => dicCycle.strCode === "MONTHLY_APR_01"
          )?.intID ?? dicOptions.lstPayrollCycles[0]?.intID ?? "";
        setDicForm((dicPrevious) => ({
          ...dicPrevious,
          intPayrollCycleID: intMonthlyCycleID,
        }));
      })
      .catch((objError) => {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : "Unable to load payroll run options."
          );
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoadingOptions(false);
        }
      });
    return () => {
      blnMounted = false;
    };
  }, [blnRightsLoading, blnCanAdd]);

  useEffect(() => {
    setDicForm((dicPrevious) => {
      const strSuggestedName = buildSuggestedRunName(
        dicPrevious.dtPayrollMonth,
        dicPrevious.intPayrollCycleID,
        dicPrevious.strProcessFor
      );
      if (!strSuggestedName) {
        return dicPrevious;
      }
      if (!dicPrevious.strRunName.trim() || dicPrevious.strRunName === strSuggestedName) {
        return { ...dicPrevious, strRunName: strSuggestedName };
      }
      return dicPrevious;
    });
  }, [dicForm.dtPayrollMonth, dicForm.intPayrollCycleID, dicForm.strProcessFor, objOptions]);

  async function saveRun() {
    if (!blnCanAdd) {
      return;
    }

    const strValidationError = validateForm();
    if (strValidationError) {
      setStrError(strValidationError);
      return;
    }

    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.createPayrollRun(dicForm);
      setStrSuccess(t("save_success", "Payroll run saved successfully."));
      window.setTimeout(() => {
        objRouter.push(`/payroll/runs/${dicRun.intID}`);
      }, 500);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to save payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Stack
      spacing={2.5}
      className={payrollStyles.page}
      sx={{
        minHeight: "100%",
        height: "auto",
        overflowX: "hidden",
        overflowY: "visible",
        pb: 3,
      }}
    >
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef7f4 45%, #f8fafc 100%)",
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {t("add_title", "Create Payroll Run")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("subtitle", "Open payroll run creation in a dedicated screen instead of a modal dialog.")}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                alignSelf: { md: "flex-start" },
              }}
            >
              <Button
                className={masterStyles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/payroll/runs")}
                disabled={blnSaving}
                controlId="payroll.run-editor.back.button"
              >
                {t("back_to_list", "Back to List")}
              </Button>
              {blnCanAdd ? <Button
                className={masterStyles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={saveRun}
                disabled={blnFieldDisabled}
                controlId="payroll.run-editor.save.button"
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button> : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {!blnCanAdd ? <Alert severity="warning">{t("add_access_denied", "Payroll run add access is not available for your user group.")}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      <Paper
        sx={{
          borderRadius: "24px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)",
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>
              {t("basic_information", "Basic Information")}
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {t("basic_information_help", "Set the payroll schedule, payroll month, and employee scope for this payroll run.")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <TextField
              select
              label={t("payroll_cycle", "Payroll Schedule")}
              value={dicForm.intPayrollCycleID}
              controlId="payroll.run-editor.payroll-cycle.select"
              onChange={(objEvent) =>
                updateField(
                  "intPayrollCycleID",
                  objEvent.target.value ? Number(objEvent.target.value) : ""
                )
              }
              disabled={blnFieldDisabled}
              fullWidth
              helperText={t(
                "payroll_cycle_help",
                "Select the payroll schedule that defines the employee group, payroll frequency and payroll cut-off day for this payroll run."
              )}
            >
              <MenuItem value="">{t("select_payroll_cycle", "Select payroll schedule")}</MenuItem>
              {(objOptions?.lstPayrollCycles ?? []).map((dicCycle) => (
                <MenuItem key={dicCycle.intID} value={dicCycle.intID}>
                  {dicCycle.strCode} - {dicCycle.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t("run_name", "Payroll Run")}
              value={dicForm.strRunName}
              onChange={(objEvent) => updateField("strRunName", objEvent.target.value)}
              disabled={blnFieldDisabled}
              controlId="payroll.run-editor.run-name.input"
              fullWidth
            />
            <TextField
              select
              label={t("status", "Status")}
              value={dicForm.strRunStatus}
              onChange={(objEvent) =>
                updateField("strRunStatus", objEvent.target.value as PayrollRunStatus)
              }
              disabled={blnFieldDisabled}
              controlId="payroll.run-editor.status.select"
              fullWidth
            >
              {lstEditableRunStatuses.map((strStatus) => (
                <MenuItem key={strStatus} value={strStatus}>
                  {strStatus}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("run_scope", "Process For")}
              value={dicForm.strProcessFor}
              controlId="payroll.run-editor.process-for.select"
              onChange={(objEvent) =>
                setDicForm((dicPrevious) => ({
                  ...dicPrevious,
                  strProcessFor: objEvent.target.value as PayrollRunFormValues["strProcessFor"],
                  strScopeType:
                    objEvent.target.value === "SelectedEmployees" ? "SelectedEmployee" : "All",
                  intScopedEmployeeID: objEvent.target.value === "SelectedEmployees" ? dicPrevious.intScopedEmployeeID : "",
                }))
              }
              disabled={blnFieldDisabled}
              fullWidth
            >
              <MenuItem value="AllEmployees">{t("scope_all", "All Employees")}</MenuItem>
              <MenuItem value="SelectedEmployees">{t("scope_selected_employee", "Selected Employees")}</MenuItem>
              <MenuItem value="PayrollGroup">{t("scope_payroll_group", "Payroll Group")}</MenuItem>
            </TextField>
            {dicForm.strProcessFor === "SelectedEmployees" ? <TextField
              select
              label={t("scope_employee", "Employee")}
              value={dicForm.intScopedEmployeeID}
              controlId="payroll.run-editor.employee.select"
              onChange={(objEvent) =>
                updateField(
                  "intScopedEmployeeID",
                  objEvent.target.value ? Number(objEvent.target.value) : ""
                )
              }
              disabled={blnFieldDisabled || dicForm.strScopeType !== "SelectedEmployee"}
              fullWidth
            >
              <MenuItem value="">{t("select_employee", "Select employee")}</MenuItem>
              {(objOptions?.lstEmployees ?? []).map((dicEmployee) => (
                <MenuItem key={dicEmployee.intID} value={dicEmployee.intID}>
                  {dicEmployee.strCode} - {dicEmployee.strLabel}
                </MenuItem>
              ))}
            </TextField> : null}
            <TextField
              type="date"
              label={t("payroll_month", "Payroll Month")}
              value={dicForm.dtPayrollMonth}
              onChange={(objEvent) => updateField("dtPayrollMonth", objEvent.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={blnFieldDisabled}
              controlId="payroll.run-editor.payroll-month.input"
              fullWidth
            />
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
