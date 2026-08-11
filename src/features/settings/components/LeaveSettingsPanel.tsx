"use client";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { settingsService } from "@/features/settings/services/settingsService";
import type {
  ApproverEmployeeDto,
  ApproverSnapshotDto,
  DefaultApproverSource,
  LeaveSettingsConfigDto,
} from "@/features/settings/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const lstMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const lstApproverSourceOptions: { strValue: DefaultApproverSource; strLabel: string }[] = [
  { strValue: "LINE_MANAGER", strLabel: "Line Manager" },
  { strValue: "REPORTING_MANAGER", strLabel: "Reporting Manager" },
  { strValue: "HR", strLabel: "HR Approver" },
];

// Non-leap day counts so an annually recurring start is always a real date (February caps at 28).
const lstDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function snapshotToOption(objSnapshot: ApproverSnapshotDto | null): ApproverEmployeeDto | null {
  if (!objSnapshot) return null;
  return {
    intEmployeeID: objSnapshot.intEmployeeID,
    strFullName: objSnapshot.strFullName ?? `Employee #${objSnapshot.intEmployeeID}`,
    strEmployeeCode: objSnapshot.strEmployeeCode ?? "",
    intUserID: objSnapshot.blnHasActiveUser ? 1 : null,
  };
}

function optionLabel(objOption: ApproverEmployeeDto): string {
  return objOption.strEmployeeCode
    ? `${objOption.strFullName} (${objOption.strEmployeeCode})`
    : objOption.strFullName;
}

export default function LeaveSettingsPanel() {
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const blnCanEdit = canDo("settings", "EDIT");
  const blnReadOnly = !blnCanEdit;

  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const [intDay, setIntDay] = useState(1);
  const [intMonth, setIntMonth] = useState(1);
  const [strSource, setStrSource] = useState<DefaultApproverSource>("REPORTING_MANAGER");
  const [objPrimary, setObjPrimary] = useState<ApproverEmployeeDto | null>(null);
  const [objAlternate, setObjAlternate] = useState<ApproverEmployeeDto | null>(null);
  const [objPrimarySnapshot, setObjPrimarySnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [objAlternateSnapshot, setObjAlternateSnapshot] = useState<ApproverSnapshotDto | null>(null);

  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<ApproverEmployeeDto[]>([]);
  const [blnSearching, setBlnSearching] = useState(false);
  const refSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function applyConfig(objConfig: LeaveSettingsConfigDto) {
    setIntDay(objConfig.intLeaveYearStartDay ?? 1);
    setIntMonth(objConfig.intLeaveYearStartMonth ?? 1);
    setStrSource(objConfig.strDefaultApproverSource ?? "REPORTING_MANAGER");
    setObjPrimarySnapshot(objConfig.objPrimaryHrApprover);
    setObjAlternateSnapshot(objConfig.objAlternateHrApprover);
    setObjPrimary(snapshotToOption(objConfig.objPrimaryHrApprover));
    setObjAlternate(snapshotToOption(objConfig.objAlternateHrApprover));
  }

  async function loadConfig() {
    setBlnLoading(true);
    try {
      applyConfig(await settingsService.getLeaveConfig());
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  function runEmployeeSearch(strText: string) {
    if (refSearchTimer.current) clearTimeout(refSearchTimer.current);
    refSearchTimer.current = setTimeout(async () => {
      setBlnSearching(true);
      try {
        setLstEmployeeOptions(await settingsService.searchApproverEmployees(strText));
      } catch {
        setLstEmployeeOptions([]);
      } finally {
        setBlnSearching(false);
      }
    }, 300);
  }

  const intMaxDay = lstDaysInMonth[intMonth - 1] ?? 31;
  const lstDayOptions = useMemo(() => Array.from({ length: intMaxDay }, (_, i) => i + 1), [intMaxDay]);
  const strYearStartPreview = `${String(Math.min(intDay, intMaxDay)).padStart(2, "0")} ${lstMonths[intMonth - 1]}`;

  async function handleSave() {
    setBlnSaving(true);
    try {
      const objConfig = await settingsService.saveLeaveConfig({
        intLeaveYearStartDay: intDay,
        intLeaveYearStartMonth: intMonth,
        strDefaultApproverSource: strSource,
        intPrimaryHrApproverEmployeeID: objPrimary?.intEmployeeID ?? null,
        intAlternateHrApproverEmployeeID: objAlternate?.intEmployeeID ?? null,
      });
      applyConfig(objConfig);
      showToast("Settings saved successfully.", "success");
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  const blnBusy = blnLoading || blnRightsLoading;

  function renderApproverField(
    strLabel: string,
    strControlId: string,
    objValue: ApproverEmployeeDto | null,
    fnSetValue: (objNext: ApproverEmployeeDto | null) => void,
    objSnapshot: ApproverSnapshotDto | null,
    blnRequired: boolean,
  ) {
    const blnSavedInactive = Boolean(objSnapshot) && (!objSnapshot!.blnIsActive || !objSnapshot!.blnHasActiveUser);
    return (
      <Box>
        <Autocomplete
          disabled={blnReadOnly}
          value={objValue}
          options={lstEmployeeOptions}
          loading={blnSearching}
          isOptionEqualToValue={(objA, objB) => objA.intEmployeeID === objB.intEmployeeID}
          getOptionLabel={optionLabel}
          filterOptions={(objOptions) => objOptions}
          onChange={(_objEvent, objNext) => fnSetValue(objNext)}
          onInputChange={(_objEvent, strText, strReason) => {
            if (strReason === "input") runEmployeeSearch(strText);
          }}
          onOpen={() => runEmployeeSearch("")}
          renderInput={(objParams) => (
            <TextField
              {...objParams}
              label={blnRequired ? `${strLabel} *` : strLabel}
              placeholder="Search by name or code"
              controlId={strControlId}
              InputProps={{
                ...objParams.InputProps,
                endAdornment: (
                  <>
                    {blnSearching ? <CircularProgress color="inherit" size={16} /> : null}
                    {objParams.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        {blnSavedInactive ? (
          <Chip size="small" color="warning" variant="outlined" label="Saved approver is inactive — reselect a valid employee" sx={{ mt: 0.75 }} />
        ) : null}
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.05rem" }}>Leave</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
              Configure the leave calendar and default leave approvers for your company.
            </Typography>
          </Box>
          {blnReadOnly && !blnBusy ? (
            <Chip size="small" color="info" variant="outlined" label="View only" />
          ) : null}
        </Box>

        {blnBusy ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 620 }}>
            {/* ---- Leave Calendar ---- */}
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>Leave Calendar</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 1.25 }}>Leave Year Starts On</Typography>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  select
                  label="Day"
                  size="small"
                  value={String(Math.min(intDay, intMaxDay))}
                  onChange={(objEvent) => setIntDay(Number(objEvent.target.value))}
                  disabled={blnReadOnly}
                  sx={{ minWidth: 110 }}
                  controlId="settings.leave.year-day.select"
                >
                  {lstDayOptions.map((intOption) => (
                    <MenuItem key={intOption} value={String(intOption)}>{String(intOption).padStart(2, "0")}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Month"
                  size="small"
                  value={String(intMonth)}
                  onChange={(objEvent) => setIntMonth(Number(objEvent.target.value))}
                  disabled={blnReadOnly}
                  sx={{ minWidth: 160 }}
                  controlId="settings.leave.year-month.select"
                >
                  {lstMonths.map((strName, intIndex) => (
                    <MenuItem key={strName} value={String(intIndex + 1)}>{strName}</MenuItem>
                  ))}
                </TextField>
                <Chip label={`Starts on ${strYearStartPreview}`} color="primary" variant="outlined" />
              </Stack>
            </Box>

            <Divider />

            {/* ---- Approval Defaults ---- */}
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1.25 }}>Approval Defaults</Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Default Leave Approver"
                  value={strSource}
                  onChange={(objEvent) => setStrSource(objEvent.target.value as DefaultApproverSource)}
                  disabled={blnReadOnly}
                  helperText="Used when a Leave Policy has no configured approval steps."
                  controlId="settings.leave.default-approver.select"
                  fullWidth
                >
                  {lstApproverSourceOptions.map((objOption) => (
                    <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>
                  ))}
                </TextField>

                {renderApproverField(
                  "Primary HR Leave Approver",
                  "settings.leave.primary-hr.autocomplete",
                  objPrimary,
                  setObjPrimary,
                  objPrimarySnapshot,
                  strSource === "HR",
                )}
                {renderApproverField(
                  "Alternate HR Leave Approver",
                  "settings.leave.alternate-hr.autocomplete",
                  objAlternate,
                  setObjAlternate,
                  objAlternateSnapshot,
                  false,
                )}
              </Stack>
            </Box>

            {!blnReadOnly ? (
              <Box>
                <Button
                  variant="contained"
                  className={styles.primaryButton}
                  startIcon={<SaveRoundedIcon />}
                  onClick={() => void handleSave()}
                  disabled={blnSaving}
                  controlId="settings.leave.save.button"
                >
                  {blnSaving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            ) : null}
          </Stack>
        )}
      </Box>

      <BlockingLoader blnOpen={blnSaving} strLabel="Processing..." intZIndex={1400} />

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={4000}
        onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }} onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
