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
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createInitialPayrollCycleForm,
  payrollCycleService,
  toPayrollCycleFormValues
} from "@/features/payroll-cycles/services/payrollCycleService";
import type {
  PayrollCycleFormOptions,
  PayrollCycleFormValues
} from "@/features/payroll-cycles/types";
import { setPayrollScheduleSelectedID } from "@/features/payroll-cycles/utils/payrollScheduleRouteState";
import CommonEditModeBanner from "@/Common/components/CommonEditModeBanner";
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
  const { t } = useModuleLabels("payroll-cycles");
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
  // The screen opens read-only and offers Edit only when the server grants the right, so
  // nothing about the mode travels in the URL for a user to change.
  const [blnEditRequested, setBlnEditRequested] = useState(strMode === "add");
  const blnReadOnly = !blnEditRequested || (strMode === "edit" && blnCanView && !blnCanEdit);
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = blnEditRequested && (strMode === "add" ? blnCanAdd : blnCanEdit);
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
          setStrError(objError instanceof Error ? objError.message : t("schedule_load_workspace_failed"));
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
    if (!dicForm.strCycleName.trim() || !dicForm.strPeriodType.trim() || dicForm.intPayrollGroupID === "") {
      setStrError(t("schedule_validation_required_fields"));
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
      setPayrollScheduleSelectedID(dicSavedRecord.intID);
      setStrSuccess(
        strMode === "edit"
          ? t("schedule_update_success")
          : t("schedule_create_success")
      );
      if (strMode === "add") {
        objRouter.push("/payroll/schedules/edit");
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("schedule_save_failed"));
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("schedule_loading_workspace")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
            {strMode === "add"
            ? t("schedule_access_denied_add")
            : t("schedule_access_denied")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("schedule_access_denied_help")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef7f4 48%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "view"
                  ? t("schedule_view_title")
                  : strMode === "edit"
                    ? t("schedule_edit_title")
                    : t("schedule_add_title")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("schedule_subtitle")}
              </Typography>
            </Box>
            <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  controlId="payroll-cycles.editor.back.button"
                  className={styles.secondaryButton}
                  startIcon={<ArrowBackRoundedIcon />}
                  onClick={() => objRouter.push("/payroll/schedules")}
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
                  {t("schedule_back_to_list")}
                </Button>
                {blnCanSave ? (
                  <Button
                    controlId="payroll-cycles.editor.save.button"
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
                    {blnSaving ? t("schedule_saving") : t("schedule_save")}
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
            <Paper sx={{ p: "10px", borderRadius: "var(--app-card-radius)", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_group")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicPayrollGroupByID.get(Number(dicForm.intPayrollGroupID))?.strLabel ?? t("not_selected")}
              </Typography>
            </Paper>
            <Paper sx={{ p: "10px", borderRadius: "var(--app-card-radius)", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_period")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicForm.strPeriodType || t("not_selected")}
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      <CommonEditModeBanner
        blnReadOnly={blnReadOnly}
        blnCanEdit={strMode === "edit" && blnCanEdit}
        fnOnEdit={() => setBlnEditRequested(true)}
        strReadOnlyMessage={t("schedule_read_only_mode")}
      />

      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)"
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "flex-start" }} spacing={1.5}>
            <Box>
              <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("basic_information")}</Typography>
              <Typography sx={{ color: "#64748b", mt: 0.5 }}>
                {t("schedule_basic_information_help")}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", md: "flex-end" } }}>
              <FormControlLabel
                control={<ActiveStatusSwitch testId="payroll-cycles.editor.active.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
                label={dicForm.blnIsActive ? t("active") : t("inactive")}
                sx={{
                  m: 0,
                  gap: 1,
                  color: "#0f172a",
                  "& .MuiFormControlLabel-label": {
                    fontWeight: 700
                  }
                }}
              />
              <Typography sx={{ color: "#64748b", fontSize: "0.78rem", mt: 0.25, textAlign: { xs: "left", md: "right" } }}>
                {t("active_help")}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 1.25
            }}
          >
            <TextField
              label={t("schedule_name", "Payroll Schedule Name")}
              inputProps={{ "controlId": "payroll-cycles.editor.cycle-name.input" }}
              required
              value={dicForm.strCycleName}
              onChange={(objEvent) => updateField("strCycleName", objEvent.target.value)}
              disabled={blnFieldDisabled}
              helperText={t("cycle_name_help")}
              fullWidth
            />

            <TextField
              label={t("period_type")}
              inputProps={{ "controlId": "payroll-cycles.editor.period-type.select" }}
              required
              select
              value={dicForm.strPeriodType}
              onChange={(objEvent) => updateField("strPeriodType", objEvent.target.value)}
              disabled={blnFieldDisabled}
              helperText={t("period_type_help")}
              fullWidth
            >
              {(objFormOptions?.lstPeriodTypes ?? []).map((strOption) => (
                <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
              ))}
            </TextField>

            <TextField
              label={t("payroll_group")}
              inputProps={{ "controlId": "payroll-cycles.editor.payroll-group.select" }}
              required
              select
              value={dicForm.intPayrollGroupID}
              onChange={(objEvent) => updateField("intPayrollGroupID", objEvent.target.value ? Number(objEvent.target.value) : "")}
              disabled={blnFieldDisabled}
              helperText={t("payroll_group_help")}
              fullWidth
            >
              {(objFormOptions?.lstPayrollGroups ?? []).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID}>
                  {dicOption.strLabel}{dicOption.strCode ? ` (${dicOption.strCode})` : ""}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
