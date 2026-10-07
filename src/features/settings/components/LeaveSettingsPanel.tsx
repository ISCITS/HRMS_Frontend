"use client";

import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import { Alert, Autocomplete, Box, Breadcrumbs, Button, Chip, Divider, InputAdornment, Menu, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import BlockingLoader, { DottedLoader } from "@/components/shared/BlockingLoader";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { settingsService } from "@/features/settings/services/settingsService";
import type { ApproverEmployeeDto, ApproverSnapshotDto, DefaultApproverSource, LeaveSettingsConfigDto } from "@/features/settings/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type SettingsCategoryKey = "leave" | "attendance" | "payroll" | "employee" | "security" | "notifications";
type SearchOption = { strLabel: string; strCategory: SettingsCategoryKey; strAnchor: string };

const lstMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const lstApproverSourceOptions: { strValue: DefaultApproverSource; strLabel: string }[] = [
  { strValue: "LINE_MANAGER", strLabel: "Line Manager" },
  { strValue: "REPORTING_MANAGER", strLabel: "Reporting Manager" },
  { strValue: "HR", strLabel: "HR Approver" },
];
const lstDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const lstCategories: { strKey: SettingsCategoryKey; strLabel: string; objIcon: ReactNode; strSubtitle: string }[] = [
  { strKey: "leave", strLabel: "Leave", objIcon: <SpaRoundedIcon />, strSubtitle: "Configure leave calendar and default approval behaviour." },
  { strKey: "attendance", strLabel: "Attendance", objIcon: <CalendarMonthRoundedIcon />, strSubtitle: "Configure default approval behaviour for attendance related requests." },
  { strKey: "payroll", strLabel: "Payroll", objIcon: <PaymentsRoundedIcon />, strSubtitle: "Payroll settings will appear here when enabled." },
  { strKey: "employee", strLabel: "Employee", objIcon: <GroupsRoundedIcon />, strSubtitle: "Employee settings will appear here when enabled." },
  { strKey: "security", strLabel: "Security", objIcon: <SecurityRoundedIcon />, strSubtitle: "Security settings will appear here when enabled." },
  { strKey: "notifications", strLabel: "Notifications", objIcon: <NotificationsRoundedIcon />, strSubtitle: "Notification settings will appear here when enabled." },
];
const lstSearchOptions: SearchOption[] = [
  { strLabel: "Leave Year", strCategory: "leave", strAnchor: "settings-section-leave-calendar" },
  { strLabel: "Leave Calendar", strCategory: "leave", strAnchor: "settings-section-leave-calendar" },
  { strLabel: "Leave Approver", strCategory: "leave", strAnchor: "settings-section-leave-approval" },
  { strLabel: "Regularization", strCategory: "attendance", strAnchor: "settings-section-regularization" },
  { strLabel: "Attendance Approver", strCategory: "attendance", strAnchor: "settings-section-regularization" },
  { strLabel: "Work on Holiday Approver", strCategory: "attendance", strAnchor: "settings-section-work-holiday" },
  { strLabel: "Payroll Cut-off", strCategory: "payroll", strAnchor: "settings-section-placeholder" },
];

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
  return objOption.strEmployeeCode ? `${objOption.strFullName} (${objOption.strEmployeeCode})` : objOption.strFullName;
}

export default function LeaveSettingsPanel() {
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const blnCanEdit = canDo("settings", "EDIT");
  const blnReadOnly = !blnCanEdit;
  const [strActiveCategory, setStrActiveCategory] = useState<SettingsCategoryKey>("leave");
  const [elMoreAnchor, setElMoreAnchor] = useState<HTMLElement | null>(null);
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
  const [strAttSource, setStrAttSource] = useState<DefaultApproverSource>("REPORTING_MANAGER");
  const [objAttPrimary, setObjAttPrimary] = useState<ApproverEmployeeDto | null>(null);
  const [objAttAlternate, setObjAttAlternate] = useState<ApproverEmployeeDto | null>(null);
  const [objAttPrimarySnapshot, setObjAttPrimarySnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [objAttAlternateSnapshot, setObjAttAlternateSnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [strWorkHolidaySource, setStrWorkHolidaySource] = useState<DefaultApproverSource>("REPORTING_MANAGER");
  const [objWorkHolidayPrimary, setObjWorkHolidayPrimary] = useState<ApproverEmployeeDto | null>(null);
  const [objWorkHolidayAlternate, setObjWorkHolidayAlternate] = useState<ApproverEmployeeDto | null>(null);
  const [objWorkHolidayPrimarySnapshot, setObjWorkHolidayPrimarySnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [objWorkHolidayAlternateSnapshot, setObjWorkHolidayAlternateSnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<ApproverEmployeeDto[]>([]);
  const [blnSearching, setBlnSearching] = useState(false);
  const refSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lstAttendanceEmployeeOptions, setLstAttendanceEmployeeOptions] = useState<ApproverEmployeeDto[]>([]);
  const [blnAttendanceSearching, setBlnAttendanceSearching] = useState(false);
  const refAttendanceSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refSavedConfig = useRef<LeaveSettingsConfigDto | null>(null);

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function applyConfig(objConfig: LeaveSettingsConfigDto, blnUpdateSavedSnapshot = false) {
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
    if (blnUpdateSavedSnapshot) refSavedConfig.current = objConfig;
  }

  async function loadConfig() {
    setBlnLoading(true);
    try {
      applyConfig(await settingsService.getLeaveConfig(), true);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
    return () => {
      if (refSearchTimer.current) clearTimeout(refSearchTimer.current);
      if (refAttendanceSearchTimer.current) clearTimeout(refAttendanceSearchTimer.current);
    };
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

  function runAttendanceEmployeeSearch(strText: string) {
    if (refAttendanceSearchTimer.current) clearTimeout(refAttendanceSearchTimer.current);
    refAttendanceSearchTimer.current = setTimeout(async () => {
      setBlnAttendanceSearching(true);
      try {
        setLstAttendanceEmployeeOptions(await settingsService.searchAttendanceApproverEmployees(strText));
      } catch {
        setLstAttendanceEmployeeOptions([]);
      } finally {
        setBlnAttendanceSearching(false);
      }
    }, 300);
  }

  const intMaxDay = lstDaysInMonth[intMonth - 1] ?? 31;
  const lstDayOptions = useMemo(() => Array.from({ length: intMaxDay }, (_, i) => i + 1), [intMaxDay]);
  const strYearStartPreview = `${String(Math.min(intDay, intMaxDay)).padStart(2, "0")} ${lstMonths[intMonth - 1]}`;
  const objActiveCategory = lstCategories.find((objCategory) => objCategory.strKey === strActiveCategory) ?? lstCategories[0];
  const lstVisibleCategories = lstCategories.slice(0, 6);
  const lstOverflowCategories = lstCategories.slice(6);
  const blnBusy = blnLoading || blnRightsLoading;

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
      applyConfig(objConfig, true);
      showToast("Settings saved successfully.", "success");
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  function handleCancel() {
    if (!refSavedConfig.current) return;
    applyConfig(refSavedConfig.current);
    showToast("Unsaved changes restored to the last saved values.", "success");
  }

  function handleSearchSelect(objOption: SearchOption | null) {
    if (!objOption) return;
    setStrActiveCategory(objOption.strCategory);
    window.setTimeout(() => document.getElementById(objOption.strAnchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function renderApproverField(strLabel: string, strControlId: string, objValue: ApproverEmployeeDto | null, fnSetValue: (objNext: ApproverEmployeeDto | null) => void, objSnapshot: ApproverSnapshotDto | null, blnRequired: boolean, blnAttendanceScope = false) {
    const blnSavedInactive = Boolean(objSnapshot) && (!objSnapshot!.blnIsActive || !objSnapshot!.blnHasActiveUser);
    const lstOptions = blnAttendanceScope ? lstAttendanceEmployeeOptions : lstEmployeeOptions;
    const blnIsSearching = blnAttendanceScope ? blnAttendanceSearching : blnSearching;
    const fnRunSearch = blnAttendanceScope ? runAttendanceEmployeeSearch : runEmployeeSearch;
    return (
      <Box>
        <Autocomplete
          disabled={blnReadOnly}
          value={objValue}
          options={lstOptions}
          loading={blnIsSearching}
          isOptionEqualToValue={(objA, objB) => objA.intEmployeeID === objB.intEmployeeID}
          getOptionLabel={optionLabel}
          filterOptions={(objOptions) => objOptions}
          onChange={(_objEvent, objNext) => fnSetValue(objNext)}
          onInputChange={(_objEvent, strText, strReason) => {
            if (strReason === "input") fnRunSearch(strText);
          }}
          onOpen={() => fnRunSearch("")}
          renderInput={(objParams) => (
            <TextField
              {...objParams}
              className="app-mui-text-field"
              label={blnRequired ? `${strLabel} *` : strLabel}
              placeholder="Search by name or code"
              controlId={strControlId}
              InputProps={{
                ...objParams.InputProps,
                endAdornment: (
                  <>
                    {blnIsSearching ? <DottedLoader color="inherit" intSize={16} /> : null}
                    {objParams.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        {blnSavedInactive ? <Chip size="small" color="warning" variant="outlined" label="Saved approver is inactive - reselect a valid employee" sx={{ mt: 0.75 }} /> : null}
      </Box>
    );
  }

  const sxCard = { p: { xs: 2, md: 2.25 }, borderRadius: "8px", border: "1px solid #dfe9f5", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)", backgroundColor: "#fff" } as const;
  const sxFieldGrid = { display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(220px, 1fr))" }, gap: 2, alignItems: "start" } as const;
  const sxCalendarGrid = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "250px 305px 160px" }, gap: 2, alignItems: "center" } as const;
  const sxSubHeading = { fontWeight: 800, color: "#172033", fontSize: "0.98rem", lineHeight: 1.2 } as const;
  const sxSubCaption = { color: "#48638d", fontSize: "0.78rem", mb: 1.25, lineHeight: 1.25 } as const;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, minHeight: "calc(100vh - 96px)", pb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
            <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Administration</Typography>
            <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>Settings</Typography>
          </Breadcrumbs>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography sx={{ color: "#64748b", fontSize: "11px" }}>
            Required fields are marked <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
          </Typography>
          {!blnReadOnly ? (
            <>
              <Button variant="outlined" startIcon={<CancelRoundedIcon />} onClick={handleCancel} disabled={blnSaving || blnBusy} controlId="settings.cancel.button" sx={{ height: 36, px: 2.25, borderRadius: "8px", fontWeight: 800 }}>Cancel</Button>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => void handleSave()} disabled={blnSaving || blnBusy} controlId="settings.save.button" sx={{ height: 36, px: 2.75, borderRadius: "8px", fontWeight: 800, boxShadow: "none" }}>{blnSaving ? "Saving..." : "Save"}</Button>
            </>
          ) : null}
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ display: "flex", flexWrap: { xs: "wrap", lg: "nowrap" }, alignItems: "stretch", minHeight: 64, borderRadius: "8px", borderColor: "#dce8f6", overflow: "hidden", boxShadow: "0 8px 20px rgba(37, 99, 235, 0.05)" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3, minmax(92px, 1fr))", md: `repeat(${lstVisibleCategories.length + 1}, 138px)` }, flex: "0 1 auto", width: { xs: "100%", lg: "auto" } }}>
          {lstVisibleCategories.map((objCategory) => {
            const blnActive = objCategory.strKey === strActiveCategory;
            return (
              <Button
                key={objCategory.strKey}
                onClick={() => setStrActiveCategory(objCategory.strKey)}
                controlId={`settings.category-${objCategory.strKey}.button`}
                sx={{
                  position: "relative",
                  minHeight: 64,
                  borderRadius: 0,
                  borderRight: "1px solid #dce8f6",
                  backgroundColor: blnActive ? "var(--app-primary-soft, #eef5ff)" : "#fff",
                  color: blnActive ? "var(--app-primary-color, #1d5d96)" : "#2f4a73",
                  textTransform: "none",
                  fontWeight: blnActive ? 800 : 700,
                  flexDirection: "column",
                  gap: 0.25,
                  overflow: "hidden",
                  transition: "color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
                  "& svg": { fontSize: 23, color: "var(--app-primary-color, #1d5d96)", transition: "transform 180ms ease, color 180ms ease" },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: blnActive ? 18 : "50%",
                    right: blnActive ? 18 : "50%",
                    bottom: 0,
                    height: 3,
                    borderRadius: "999px 999px 0 0",
                    backgroundColor: "var(--app-primary-color, #1d5d96)",
                    opacity: blnActive ? 1 : 0,
                    transition: "left 260ms cubic-bezier(0.4, 0, 0.2, 1), right 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 190ms ease, background-color 180ms ease",
                  },
                  "&:hover": {
                    color: "var(--app-primary-color, #1d5d96)",
                    backgroundColor: "#f3f4f6",
                    boxShadow: "inset 0 -1px 0 #d1d5db",
                    transform: "translateY(-1px)",
                    "& svg": { transform: "translateY(-1px)" },
                    "&::after": { left: blnActive ? 4 : "50%", right: blnActive ? 4 : "50%", opacity: blnActive ? 1 : 0 },
                  },
                  "&:focus-visible": {
                    outline: "2px solid var(--app-primary-color, #1d5d96)",
                    outlineOffset: -2,
                  },
                }}
              >
                {objCategory.objIcon}
                <Box component="span" sx={{ fontSize: "0.78rem" }}>{objCategory.strLabel}</Box>
              </Button>
            );
          })}
          <Button
            onClick={(objEvent) => setElMoreAnchor(objEvent.currentTarget)}
            controlId="settings.category-more.button"
            sx={{
              position: "relative",
              minHeight: 64,
              borderRadius: 0,
              borderRight: "1px solid #dce8f6",
              color: "#2f4a73",
              textTransform: "none",
              fontWeight: 700,
              flexDirection: "column",
              gap: 0.25,
              overflow: "hidden",
              transition: "color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
              "& svg": { fontSize: 23, color: "var(--app-primary-color, #1d5d96)", transition: "transform 180ms ease" },
              "&::after": {
                content: '""',
                position: "absolute",
                left: "50%",
                right: "50%",
                bottom: 0,
                height: 3,
                borderRadius: "999px 999px 0 0",
                backgroundColor: "var(--app-primary-color, #1d5d96)",
                opacity: 0,
                transition: "left 260ms cubic-bezier(0.4, 0, 0.2, 1), right 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 190ms ease",
              },
              "&:hover": {
                color: "var(--app-primary-color, #1d5d96)",
                backgroundColor: "#f3f4f6",
                boxShadow: "inset 0 -1px 0 #d1d5db",
                transform: "translateY(-1px)",
                "& svg": { transform: "translateY(-1px)" },
                "&::after": { left: "50%", right: "50%", opacity: 0 },
              },
              "&:focus-visible": {
                outline: "2px solid var(--app-primary-color, #1d5d96)",
                outlineOffset: -2,
              },
            }}
          >
            <MoreHorizRoundedIcon />
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontSize: "0.78rem" }}>More <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} /></Box>
          </Button>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0, lg: 2 }, display: { xs: "none", lg: "block" } }} />
        <Box sx={{ flex: 1, minWidth: { xs: "100%", lg: 280 }, display: "flex", alignItems: "center", px: { xs: 1.25, md: 2 }, py: 1 }}>
          <Autocomplete
            fullWidth
            options={lstSearchOptions}
            getOptionLabel={(objOption) => objOption.strLabel}
            groupBy={(objOption) => lstCategories.find((objCategory) => objCategory.strKey === objOption.strCategory)?.strLabel ?? "Settings"}
            onChange={(_objEvent, objOption) => handleSearchSelect(objOption)}
            renderInput={(objParams) => (
              <TextField
                {...objParams}
                className="app-mui-text-field"
                placeholder="Search settings..."
                controlId="settings.search.input"
                InputProps={{ ...objParams.InputProps, startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "var(--app-primary-color, #1d5d96)" }} /></InputAdornment> }}
              />
            )}
          />
        </Box>
      </Paper>

      <Menu anchorEl={elMoreAnchor} open={Boolean(elMoreAnchor)} onClose={() => setElMoreAnchor(null)}>
        {lstOverflowCategories.length ? lstOverflowCategories.map((objCategory) => (
          <MenuItem key={objCategory.strKey} onClick={() => { setStrActiveCategory(objCategory.strKey); setElMoreAnchor(null); }}>{objCategory.strLabel}</MenuItem>
        )) : <MenuItem disabled>No additional categories</MenuItem>}
      </Menu>

      <Paper variant="outlined" sx={{ ...sxCard, display: "flex", alignItems: "center", gap: 1.75, py: 1.5 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "var(--app-primary-soft, #eaf2ff)", color: "var(--app-primary-color, #1d5d96)", display: "grid", placeItems: "center", "& svg": { fontSize: 28, color: "var(--app-primary-color, #1d5d96)" } }}>{objActiveCategory.objIcon}</Box>
        <Box>
          <Typography sx={{ color: "#111b31", fontSize: "1.18rem", fontWeight: 800, lineHeight: 1.1 }}>{objActiveCategory.strLabel}</Typography>
          <Typography sx={{ color: "#48638d", fontSize: "0.8rem", mt: 0.5 }}>{objActiveCategory.strSubtitle}</Typography>
        </Box>
      </Paper>

      {blnBusy ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>
      ) : strActiveCategory === "leave" ? (
        <>
          <Paper id="settings-section-leave-calendar" variant="outlined" sx={sxCard}>
            <Typography sx={sxSubHeading}>Leave Calendar</Typography>
            <Typography sx={sxSubCaption}>Leave Year Starts On.</Typography>
            <Box sx={sxCalendarGrid}>
              <CommonSearchableSelect className="app-mui-text-field" label="Day" value={Math.min(intDay, intMaxDay)} options={lstDayOptions.map((intOption) => ({ intID: intOption, strLabel: String(intOption).padStart(2, "0") }))} onChange={(intValue) => setIntDay(intValue === "" ? 1 : Number(intValue))} disabled={blnReadOnly} controlId="settings.leave.year-day.select" />
              <CommonSearchableSelect className="app-mui-text-field" label="Month" value={intMonth} options={lstMonths.map((strName, intIndex) => ({ intID: intIndex + 1, strLabel: strName }))} onChange={(intValue) => setIntMonth(intValue === "" ? 1 : Number(intValue))} disabled={blnReadOnly} controlId="settings.leave.year-month.select" />
              <Chip label={`Starts on ${strYearStartPreview}`} color="primary" variant="outlined" sx={{ height: 38, borderRadius: "8px", fontWeight: 800, backgroundColor: "#eef5ff" }} />
            </Box>
          </Paper>
          <Paper id="settings-section-leave-approval" variant="outlined" sx={sxCard}>
            <Typography sx={sxSubHeading}>Approval Defaults</Typography>
            <Typography sx={sxSubCaption}>Used when a Leave Policy has no configured approval steps.</Typography>
            <Box sx={sxFieldGrid}>
              <TextField className="app-mui-text-field" select label="Default Leave Approver" value={strSource} onChange={(objEvent) => setStrSource(objEvent.target.value as DefaultApproverSource)} disabled={blnReadOnly} controlId="settings.leave.default-approver.select">
                {lstApproverSourceOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
              </TextField>
              {renderApproverField("Primary HR Leave Approver", "settings.leave.primary-hr.autocomplete", objPrimary, setObjPrimary, objPrimarySnapshot, strSource === "HR")}
              {renderApproverField("Alternate HR Leave Approver", "settings.leave.alternate-hr.autocomplete", objAlternate, setObjAlternate, objAlternateSnapshot, false)}
            </Box>
          </Paper>
        </>
      ) : strActiveCategory === "attendance" ? (
        <>
          <Paper id="settings-section-regularization" variant="outlined" sx={sxCard}>
            <Typography sx={sxSubHeading}>Regularization Approval Flow</Typography>
            <Typography sx={sxSubCaption}>Used when an Attendance Regularization request has no configured approval steps.</Typography>
            <Box sx={sxFieldGrid}>
              <TextField className="app-mui-text-field" select label="Default Attendance Approver" value={strAttSource} onChange={(objEvent) => setStrAttSource(objEvent.target.value as DefaultApproverSource)} disabled={blnReadOnly} controlId="settings.attendance.default-approver.select">
                {lstApproverSourceOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
              </TextField>
              {renderApproverField("Primary HR Attendance Approver", "settings.attendance.primary-hr.autocomplete", objAttPrimary, setObjAttPrimary, objAttPrimarySnapshot, strAttSource === "HR", true)}
              {renderApproverField("Alternate HR Attendance Approver", "settings.attendance.alternate-hr.autocomplete", objAttAlternate, setObjAttAlternate, objAttAlternateSnapshot, false, true)}
            </Box>
          </Paper>
          <Paper id="settings-section-work-holiday" variant="outlined" sx={sxCard}>
            <Typography sx={sxSubHeading}>Work on Holiday Approval Flow</Typography>
            <Typography sx={sxSubCaption}>Used when a Work on Holiday request has no configured approval steps.</Typography>
            <Box sx={sxFieldGrid}>
              <TextField className="app-mui-text-field" select label="Default Work on Holiday Approver" value={strWorkHolidaySource} onChange={(objEvent) => setStrWorkHolidaySource(objEvent.target.value as DefaultApproverSource)} disabled={blnReadOnly} controlId="settings.work-holiday.default-approver.select">
                {lstApproverSourceOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
              </TextField>
              {renderApproverField("Primary HR Work on Holiday Approver", "settings.work-holiday.primary-hr.autocomplete", objWorkHolidayPrimary, setObjWorkHolidayPrimary, objWorkHolidayPrimarySnapshot, strWorkHolidaySource === "HR")}
              {renderApproverField("Alternate HR Work on Holiday Approver", "settings.work-holiday.alternate-hr.autocomplete", objWorkHolidayAlternate, setObjWorkHolidayAlternate, objWorkHolidayAlternateSnapshot, false)}
            </Box>
          </Paper>
        </>
      ) : (
        <Paper id="settings-section-placeholder" variant="outlined" sx={{ ...sxCard, py: 5, textAlign: "center" }}>
          <Typography sx={{ color: "#172033", fontWeight: 800, fontSize: "1rem" }}>{objActiveCategory.strLabel} settings are coming soon.</Typography>
          <Typography sx={{ color: "#60749b", fontSize: "0.82rem", mt: 0.5 }}>This category is reserved for future settings.</Typography>
        </Paper>
      )}

      <BlockingLoader blnOpen={blnSaving} strLabel="Processing..." intZIndex={1400} />
      <Snackbar open={objToast.blnOpen} autoHideDuration={4000} onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }} onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
