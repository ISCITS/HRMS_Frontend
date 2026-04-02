"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { usePayrollCycleLabels } from "@/features/payroll-cycles/hooks/usePayrollCycleLabels";
import {
  createInitialPayrollCycleForm,
  payrollCycleService,
  toPayrollCycleFormValues
} from "@/features/payroll-cycles/services/payrollCycleService";
import type {
  PayrollCycleFormOptions,
  PayrollCycleFormValues
} from "@/features/payroll-cycles/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type PayrollCycleEditorPageProps = {
  strMode: "add" | "edit" | "view";
  intPayrollCycleID?: number;
};

const lstPayrollCycleModuleCodes = ["PAYROLL_CYCLE", "PAYROLL_CYCLES", "MASTER_PAYROLL_CYCLE"];

export default function PayrollCycleEditorPage({
  strMode,
  intPayrollCycleID
}: PayrollCycleEditorPageProps) {
  const objRouter = useRouter();
  const { t } = usePayrollCycleLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstPayrollCycleModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<PayrollCycleFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<PayrollCycleFormValues>(createInitialPayrollCycleForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnForcedView = strMode === "view";
  const blnReadOnly = blnForcedView || (strMode === "edit" && blnCanView && !blnCanEdit);
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = !blnForcedView && (strMode === "add" ? blnCanAdd : blnCanEdit);
  const blnFieldDisabled = blnSaving || blnReadOnly || !blnCanSave;

  useEffect(() => {
    let blnMounted = true;

    async function loadData() {
      if (blnRightsLoading) {
        return;
      }
      if (!blnCanLoadWorkspace) {
        if (blnMounted) {
          setBlnLoading(false);
        }
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const objOptions = await payrollCycleService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);
        if ((strMode === "edit" || strMode === "view") && intPayrollCycleID) {
          const dicDetail = await payrollCycleService.getPayrollCycleById(intPayrollCycleID);
          if (!blnMounted) {
            return;
          }
          setDicForm(toPayrollCycleFormValues(dicDetail));
        } else {
          setDicForm((dicPrevious) => ({
            ...dicPrevious,
            strPeriodType: objOptions.lstPeriodTypes[0] ?? dicPrevious.strPeriodType
          }));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load payroll cycle workspace.");
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [blnCanLoadWorkspace, blnRightsLoading, intPayrollCycleID, strMode]);

  const dicPayrollGroupByID = useMemo(() => {
    return new Map((objFormOptions?.lstPayrollGroups ?? []).map((dicOption) => [dicOption.intID, dicOption]));
  }, [objFormOptions]);

  function updateField<TKey extends keyof PayrollCycleFormValues>(strField: TKey, objValue: PayrollCycleFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strCycleCode.trim() || !dicForm.strCycleName.trim() || !dicForm.strPeriodType.trim() || dicForm.intPayrollGroupID === "") {
      setStrError("Cycle code, cycle name, period type, and payroll group are required.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSavedRecord = strMode === "edit" && intPayrollCycleID
        ? await payrollCycleService.updatePayrollCycle(intPayrollCycleID, dicForm)
        : await payrollCycleService.createPayrollCycle(dicForm);
      setDicForm(toPayrollCycleFormValues(dicSavedRecord));
      setStrSuccess(`Payroll cycle ${strMode === "edit" ? "updated" : "created"} successfully.`);
      if (strMode === "add") {
        objRouter.push(`/payroll/cycles/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save payroll cycle.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_workspace", "Loading payroll cycle workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Payroll cycle create access is not available for your user group.")
            : t("access_denied", "Payroll cycle access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need payroll cycle access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef7f4 48%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "view"
                  ? t("view_title", "View Payroll Cycle")
                  : strMode === "edit"
                    ? t("edit_title", "Edit Payroll Cycle")
                    : t("add_title", "Add Payroll Cycle")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("subtitle", "Define period cadence, group ownership, and cutoff timing without exposing internal system metadata.")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/payroll/cycles")}
                sx={{
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 1.5,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {t("back_to_list", "Back to list")}
              </Button>
              {blnCanSave ? (
                <Button
                  className={styles.primaryButton}
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSave}
                  disabled={blnSaving}
                  sx={{
                    height: 38,
                    minHeight: 38,
                    py: 0,
                    px: 1.75,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                    "& .MuiButton-startIcon": {
                      mr: 0.75,
                      "& svg": {
                        fontSize: "1rem"
                      }
                    }
                  }}
                >
                  {blnSaving ? t("saving", "Saving...") : t("save", "Save Payroll Cycle")}
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_group", "Assigned Group")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicPayrollGroupByID.get(Number(dicForm.intPayrollGroupID))?.strLabel ?? t("not_selected", "Not selected")}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_period", "Period Type")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicForm.strPeriodType || t("not_selected", "Not selected")}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_cutoff", "Cutoff Rule")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicForm.intCutoffDay.trim() ? `Day ${dicForm.intCutoffDay.trim()}` : t("cutoff_open", "No cutoff day set")}
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Payroll Cycles.")}</Alert> : null}

      <Paper
        sx={{
          borderRadius: "24px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)"
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("basic_information", "Basic Information")}</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {t("basic_information_help", "Keep the code concise, the name business-friendly, and tie the cycle to the right payroll group.")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2
            }}
          >
            <TextField
              label={t("payroll_group", "Payroll Group")}
              select
              value={dicForm.intPayrollGroupID}
              onChange={(objEvent) => updateField("intPayrollGroupID", objEvent.target.value ? Number(objEvent.target.value) : "")}
              disabled={blnFieldDisabled}
              fullWidth
            >
              {(objFormOptions?.lstPayrollGroups ?? []).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID}>
                  {dicOption.strLabel}{dicOption.strCode ? ` (${dicOption.strCode})` : ""}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={t("period_type", "Period Type")}
              select
              value={dicForm.strPeriodType}
              onChange={(objEvent) => updateField("strPeriodType", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
            >
              {(objFormOptions?.lstPeriodTypes ?? []).map((strOption) => (
                <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
              ))}
            </TextField>

            <TextField
              label={t("cycle_code", "Cycle Code")}
              value={dicForm.strCycleCode}
              onChange={(objEvent) => updateField("strCycleCode", objEvent.target.value.toUpperCase())}
              disabled={blnFieldDisabled}
              fullWidth
            />

            <TextField
              label={t("cycle_name", "Cycle Name")}
              value={dicForm.strCycleName}
              onChange={(objEvent) => updateField("strCycleName", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
            />

            <TextField
              label={t("cutoff_day", "Cutoff Day")}
              value={dicForm.intCutoffDay}
              onChange={(objEvent) => updateField("intCutoffDay", objEvent.target.value.replace(/[^\d]/g, ""))}
              disabled={blnFieldDisabled}
              helperText={t("cutoff_day_help", "Optional. Enter a day from 1 to 31 based on the payroll closure policy.")}
              fullWidth
            />

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={<Switch checked={dicForm.blnIsActive} onChange={(objEvent) => updateField("blnIsActive", objEvent.target.checked)} disabled={blnFieldDisabled} />}
                label={dicForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
              />
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
