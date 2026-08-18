"use client";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
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

  // Attendance Regularization Approval Defaults
  const [strAttSource, setStrAttSource] = useState<DefaultApproverSource>("REPORTING_MANAGER");
  const [objAttPrimary, setObjAttPrimary] = useState<ApproverEmployeeDto | null>(null);
  const [objAttAlternate, setObjAttAlternate] = useState<ApproverEmployeeDto | null>(null);
  const [objAttPrimarySnapshot, setObjAttPrimarySnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [objAttAlternateSnapshot, setObjAttAlternateSnapshot] = useState<ApproverSnapshotDto | null>(null);

  // Work on Holiday Approval Defaults
  const [strWorkHolidaySource, setStrWorkHolidaySource] = useState<DefaultApproverSource>("REPORTING_MANAGER");
  const [objWorkHolidayPrimary, setObjWorkHolidayPrimary] = useState<ApproverEmployeeDto | null>(null);
  const [objWorkHolidayAlternate, setObjWorkHolidayAlternate] = useState<ApproverEmployeeDto | null>(null);
  const [objWorkHolidayPrimarySnapshot, setObjWorkHolidayPrimarySnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [objWorkHolidayAlternateSnapshot, setObjWorkHolidayAlternateSnapshot] = useState<ApproverSnapshotDto | null>(null);

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
    setStrAttSource(objConfig.strAttendanceDefaultApproverSource ?? "REPORTING_MANAGER");
    setObjAttPrimarySnapshot(objConfig.objAttendancePrimaryHrApprover);
    setObjAttAlternateSnapshot(objConfig.objAttendanceAlternateHrApprover);
    setObjAttPrimary(snapshotToOption(objConfig.objAttendancePrimaryHrApprover));
    setObjAttAlternate(snapshotToOption(objConfig.objAttendanceAlternateHrApprover));
    setStrWorkHolidaySource(objConfig.strWorkHolidayDefaultApproverSource ?? "REPORTING_MANAGER");
    setObjWorkHolidayPrimarySnapshot(objConfig.objWorkHolidayPrimaryHrApprover);
    setObjWorkHolidayAlternateSnapshot(objConfig.objWorkHolidayAlternateHrApprover);
    setObjWorkHolidayPrimary(snapshotToOption(objConfig.objWorkHolidayPrimaryHrApprover));
    setObjWorkHolidayAlternate(snapshotToOption(objConfig.objWorkHolidayAlternateHrApprover));
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
        strAttendanceDefaultApproverSource: strAttSource,
        intAttendancePrimaryHrApproverEmployeeID: objAttPrimary?.intEmployeeID ?? null,
        intAttendanceAlternateHrApproverEmployeeID: objAttAlternate?.intEmployeeID ?? null,
        strWorkHolidayDefaultApproverSource: strWorkHolidaySource,
        intWorkHolidayPrimaryHrApproverEmployeeID: objWorkHolidayPrimary?.intEmployeeID ?? null,
        intWorkHolidayAlternateHrApproverEmployeeID: objWorkHolidayAlternate?.intEmployeeID ?? null,
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

  const nodeHeaderBar = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", md: "center" },
        gap: 1.25,
        flexWrap: "wrap",
        p: 2,
        borderRadius: "14px",
        background: "linear-gradient(135deg, #eaf2fc 0%, #eef6fb 100%)",
        border: "1px solid #dce9f7",
      }}
    >
      <Typography sx={{ color: "#345a80", fontSize: "0.92rem", fontWeight: 500 }}>
        Enterprise leave &amp; attendance approval configuration.
      </Typography>
      <Stack direction="row" spacing={1.25} alignItems="center">
        {blnReadOnly && !blnBusy ? (
          <Chip size="small" color="info" variant="outlined" label="View only" />
        ) : null}
        {!blnReadOnly ? (
          <Button
            variant="contained"
            className={styles.primaryButton}
            startIcon={<SaveRoundedIcon />}
            onClick={() => void handleSave()}
            disabled={blnSaving || blnBusy}
            controlId="settings.leave.save.button"
            sx={{ borderRadius: "10px", boxShadow: "none" }}
          >
            {blnSaving ? "Saving..." : "Save Changes"}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );

  const sxCard = {
    p: 2.5,
    borderRadius: "14px",
    border: "1px solid #e6edf5",
    boxShadow: "none",
  } as const;
  const sxFieldGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 360px))",
    gap: 2,
    alignItems: "start",
  } as const;
  const sxCalendarGrid = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "160px 300px auto" },
    gap: 2,
    alignItems: "center",
  } as const;
  const sxSubHeading = { fontWeight: 700, color: "#0f172a", fontSize: "0.92rem" } as const;
  const sxSubCaption = { color: "#64748b", fontSize: "0.78rem", mb: 1.5 } as const;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "calc(100vh - 124px)", overflowY: "auto", pb: 2, pr: 0.5 }}>
      {nodeHeaderBar}

      {blnBusy ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ---- Card 1: Leave ---- */}
          <Paper variant="outlined" sx={sxCard}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", mb: 2 }}>Leave</Typography>

            <Typography sx={sxSubHeading}>Leave Calendar</Typography>
            <Typography sx={sxSubCaption}>Leave Year Starts On.</Typography>
            <Box sx={{ ...sxCalendarGrid, mb: 3 }}>
              <TextField
                select
                label="Day"
                size="small"
                value={String(Math.min(intDay, intMaxDay))}
                onChange={(objEvent) => setIntDay(Number(objEvent.target.value))}
                disabled={blnReadOnly}
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
                controlId="settings.leave.year-month.select"
              >
                {lstMonths.map((strName, intIndex) => (
                  <MenuItem key={strName} value={String(intIndex + 1)}>{strName}</MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Chip label={`Starts on ${strYearStartPreview}`} color="primary" variant="outlined" />
              </Box>
            </Box>

            <Typography sx={sxSubHeading}>Approval Defaults</Typography>
            <Typography sx={sxSubCaption}>Used when a Leave Policy has no configured approval steps.</Typography>
            <Box sx={sxFieldGrid}>
              <TextField
                select
                label="Default Leave Approver"
                value={strSource}
                onChange={(objEvent) => setStrSource(objEvent.target.value as DefaultApproverSource)}
                disabled={blnReadOnly}
                controlId="settings.leave.default-approver.select"
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
            </Box>
          </Paper>

          {/* ---- Card 2: Attendance (Regularization + Work on Holiday approval flows) ---- */}
          <Paper variant="outlined" sx={sxCard}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", mb: 2 }}>Attendance</Typography>

            <Typography sx={sxSubHeading}>Regularization Approval Flow</Typography>
            <Typography sx={sxSubCaption}>Used when an Attendance Regularization request has no configured approval steps.</Typography>
            <Box sx={{ ...sxFieldGrid, mb: 3 }}>
              <TextField
                select
                label="Default Attendance Approver"
                value={strAttSource}
                onChange={(objEvent) => setStrAttSource(objEvent.target.value as DefaultApproverSource)}
                disabled={blnReadOnly}
                controlId="settings.attendance.default-approver.select"
              >
                {lstApproverSourceOptions.map((objOption) => (
                  <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>
                ))}
              </TextField>

              {renderApproverField(
                "Primary HR Attendance Approver",
                "settings.attendance.primary-hr.autocomplete",
                objAttPrimary,
                setObjAttPrimary,
                objAttPrimarySnapshot,
                strAttSource === "HR",
              )}
              {renderApproverField(
                "Alternate HR Attendance Approver",
                "settings.attendance.alternate-hr.autocomplete",
                objAttAlternate,
                setObjAttAlternate,
                objAttAlternateSnapshot,
                false,
              )}
            </Box>

            <Box sx={{ borderTop: "1px solid #eef2f7", pt: 2.5 }}>
              <Typography sx={sxSubHeading}>Work on Holiday Approval Flow</Typography>
              <Typography sx={sxSubCaption}>Used when a Work on Holiday request has no configured approval steps.</Typography>
              <Box sx={sxFieldGrid}>
                <TextField
                  select
                  label="Default Work on Holiday Approver"
                  value={strWorkHolidaySource}
                  onChange={(objEvent) => setStrWorkHolidaySource(objEvent.target.value as DefaultApproverSource)}
                  disabled={blnReadOnly}
                  controlId="settings.work-holiday.default-approver.select"
                >
                  {lstApproverSourceOptions.map((objOption) => (
                    <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>
                  ))}
                </TextField>

                {renderApproverField(
                  "Primary HR Work on Holiday Approver",
                  "settings.work-holiday.primary-hr.autocomplete",
                  objWorkHolidayPrimary,
                  setObjWorkHolidayPrimary,
                  objWorkHolidayPrimarySnapshot,
                  strWorkHolidaySource === "HR",
                )}
                {renderApproverField(
                  "Alternate HR Work on Holiday Approver",
                  "settings.work-holiday.alternate-hr.autocomplete",
                  objWorkHolidayAlternate,
                  setObjWorkHolidayAlternate,
                  objWorkHolidayAlternateSnapshot,
                  false,
                )}
              </Box>
            </Box>
          </Paper>
        </>
      )}

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
