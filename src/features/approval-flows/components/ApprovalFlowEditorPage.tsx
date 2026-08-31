"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import CommonEditModeBanner from "@/Common/components/CommonEditModeBanner";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { approvalFlowService } from "@/features/approval-flows/services/approvalFlowService";
import { lstApprovalFlowModules, type ApprovalFlowModuleCode, type ApprovalFlowRecord } from "@/features/approval-flows/types";
import { settingsService } from "@/features/settings/services/settingsService";
import type { ApproverEmployeeDto, ApproverSnapshotDto, DefaultApproverSource } from "@/features/settings/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const lstApproverRoles = [
  { strValue: "LINE_MANAGER", strLabel: "Line Manager" },
  { strValue: "REPORTING_MANAGER", strLabel: "Reporting Manager" },
  { strValue: "HR_APPROVER", strLabel: "HR Approver" },
];

const lstMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
  return objOption.strEmployeeCode ? `${objOption.strFullName} (${objOption.strEmployeeCode})` : objOption.strFullName;
}

type ApprovalFlowEditorPageProps = {
  intApprovalFlowID?: number;
};

export default function ApprovalFlowEditorPage({ intApprovalFlowID }: ApprovalFlowEditorPageProps) {
  const objRouter = useRouter();
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  // Opens read-only; Edit appears only when the server grants it, so no mode is in the URL.
  const [blnEditRequested, setBlnEditRequested] = useState(false);
  const blnCanEditRight = canDo("settings", "EDIT");
  const blnReadOnly = !blnEditRequested || !blnCanEditRight;
  const blnCanEdit = !blnReadOnly;
  const blnIsEdit = Boolean(intApprovalFlowID);

  const [blnLoading, setBlnLoading] = useState(blnIsEdit);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [intRowVersion, setIntRowVersion] = useState<number | null>(null);

  const [strWorkflowName, setStrWorkflowName] = useState("");
  const [strModuleCode, setStrModuleCode] = useState<ApprovalFlowModuleCode>("LEAVE");
  const [strEffectiveFrom, setStrEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [blnIsActive, setBlnIsActive] = useState(true);
  const [strDescription, setStrDescription] = useState("");

  const [strApproverRole, setStrApproverRole] = useState("HR_APPROVER");
  const [objPrimary, setObjPrimary] = useState<ApproverEmployeeDto | null>(null);
  const [objAlternate, setObjAlternate] = useState<ApproverEmployeeDto | null>(null);
  const [objPrimarySnapshot, setObjPrimarySnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [objAlternateSnapshot, setObjAlternateSnapshot] = useState<ApproverSnapshotDto | null>(null);
  const [strEscalationDays, setStrEscalationDays] = useState("");

  const [blnAllowAutoFallback, setBlnAllowAutoFallback] = useState(true);
  const [blnRequireRemarksOnRejection, setBlnRequireRemarksOnRejection] = useState(true);
  const [blnNotifyByEmail, setBlnNotifyByEmail] = useState(true);
  const [strApprovalNotes, setStrApprovalNotes] = useState("");

  const [blnLeaveCalendarLoading, setBlnLeaveCalendarLoading] = useState(true);
  const [intLeaveYearDay, setIntLeaveYearDay] = useState(1);
  const [intLeaveYearMonth, setIntLeaveYearMonth] = useState(1);
  const [strDefaultApproverSource, setStrDefaultApproverSource] = useState<DefaultApproverSource>("REPORTING_MANAGER");
  const [intPrimaryHrApproverEmployeeID, setIntPrimaryHrApproverEmployeeID] = useState<number | null>(null);
  const [intAlternateHrApproverEmployeeID, setIntAlternateHrApproverEmployeeID] = useState<number | null>(null);

  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<ApproverEmployeeDto[]>([]);
  const [blnSearching, setBlnSearching] = useState(false);
  const refSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function applyRecord(objRecord: ApprovalFlowRecord) {
    setStrWorkflowName(objRecord.strWorkflowName);
    setStrModuleCode(objRecord.strModuleCode);
    setStrEffectiveFrom(objRecord.dtEffectiveFrom.slice(0, 10));
    setBlnIsActive(objRecord.blnIsActive);
    setStrDescription(objRecord.strDescription ?? "");
    setStrApproverRole(objRecord.strApproverRole);
    setObjPrimarySnapshot(objRecord.objPrimaryApprover);
    setObjAlternateSnapshot(objRecord.objAlternateApprover);
    setObjPrimary(snapshotToOption(objRecord.objPrimaryApprover));
    setObjAlternate(snapshotToOption(objRecord.objAlternateApprover));
    setStrEscalationDays(objRecord.intEscalationDays != null ? String(objRecord.intEscalationDays) : "");
    setBlnAllowAutoFallback(objRecord.blnAllowAutoFallback);
    setBlnRequireRemarksOnRejection(objRecord.blnRequireRemarksOnRejection);
    setBlnNotifyByEmail(objRecord.blnNotifyByEmail);
    setStrApprovalNotes(objRecord.strApprovalNotes ?? "");
    setIntRowVersion(objRecord.intRowVersion);
  }

  useEffect(() => {
    if (!intApprovalFlowID) return;
    (async () => {
      setBlnLoading(true);
      try {
        applyRecord(await approvalFlowService.getFlow(intApprovalFlowID));
      } catch (objError) {
        const objHandled = await createApiRequestError(objError);
        showToast(objHandled.message, "error");
      } finally {
        setBlnLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intApprovalFlowID]);

  useEffect(() => {
    (async () => {
      setBlnLeaveCalendarLoading(true);
      try {
        const objConfig = await settingsService.getLeaveConfig();
        setIntLeaveYearDay(objConfig.intLeaveYearStartDay ?? 1);
        setIntLeaveYearMonth(objConfig.intLeaveYearStartMonth ?? 1);
        setStrDefaultApproverSource(objConfig.strDefaultApproverSource ?? "REPORTING_MANAGER");
        setIntPrimaryHrApproverEmployeeID(objConfig.objPrimaryHrApprover?.intEmployeeID ?? null);
        setIntAlternateHrApproverEmployeeID(objConfig.objAlternateHrApprover?.intEmployeeID ?? null);
      } catch (objError) {
        const objHandled = await createApiRequestError(objError);
        showToast(objHandled.message, "error");
      } finally {
        setBlnLeaveCalendarLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleSave() {
    if (!strWorkflowName.trim()) {
      showToast("Workflow Name is required.", "error");
      return;
    }
    if (!objPrimary) {
      showToast("Primary Approver is required.", "error");
      return;
    }
    setBlnSaving(true);
    try {
      const objPayload = {
        strModuleCode,
        strWorkflowName: strWorkflowName.trim(),
        strDescription: strDescription.trim() || null,
        dtEffectiveFrom: strEffectiveFrom,
        blnIsActive,
        strApproverRole,
        intPrimaryApproverEmployeeID: objPrimary.intEmployeeID,
        intAlternateApproverEmployeeID: objAlternate?.intEmployeeID ?? null,
        intEscalationDays: strEscalationDays.trim() ? Number(strEscalationDays) : null,
        blnAllowAutoFallback,
        blnRequireRemarksOnRejection,
        blnNotifyByEmail,
        strApprovalNotes: strApprovalNotes.trim() || null,
        intRowVersion,
      };
      const objSaved = blnIsEdit && intApprovalFlowID
        ? await approvalFlowService.updateFlow(intApprovalFlowID, objPayload)
        : await approvalFlowService.createFlow(objPayload);
      await settingsService.saveLeaveConfig({
        intLeaveYearStartDay: intLeaveYearDay,
        intLeaveYearStartMonth: intLeaveYearMonth,
        strDefaultApproverSource,
        intPrimaryHrApproverEmployeeID: intPrimaryHrApproverEmployeeID,
        intAlternateHrApproverEmployeeID: intAlternateHrApproverEmployeeID,
      });
      showToast("Approval workflow saved successfully.", "success");
      applyRecord(objSaved);
      objRouter.push("/settings");
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  const blnBusy = blnLoading || blnRightsLoading || blnLeaveCalendarLoading;
  const intMaxLeaveYearDay = lstDaysInMonth[intLeaveYearMonth - 1] ?? 31;
  const lstLeaveYearDayOptions = useMemo(
    () => Array.from({ length: intMaxLeaveYearDay }, (_, i) => i + 1),
    [intMaxLeaveYearDay],
  );
  const strLeaveYearStartPreview = `${String(Math.min(intLeaveYearDay, intMaxLeaveYearDay)).padStart(2, "0")} ${lstMonths[intLeaveYearMonth - 1]}`;

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
      <Box sx={{ flex: 1, minWidth: 240 }}>
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

  function renderToggle(strLabel: string, strHelp: string, blnValue: boolean, fnSetValue: (blnNext: boolean) => void) {
    return (
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flex: 1, minWidth: 240 }}>
        <Switch checked={blnValue} disabled={blnReadOnly} onChange={(objEvent) => fnSetValue(objEvent.target.checked)} />
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{strLabel}</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{strHelp}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
              {blnIsEdit ? (blnReadOnly ? "View Approval Workflow" : "Edit Approval Workflow") : "Add Approval Workflow"}
            </Typography>
            <Chip size="small" color="success" variant="outlined" label={lstApprovalFlowModules.find((m) => m.strValue === strModuleCode)?.strLabel ?? strModuleCode} />
          </Box>
          <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
            Configure approvers and workflow details for Leave, Attendance Regularisation and Work on Holiday modules.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/settings")} controlId="approval-flow-editor.back.button">
            Back
          </Button>
          {!blnReadOnly ? (
            <Button variant="contained" className={styles.primaryButton} startIcon={<SaveRoundedIcon />} disabled={blnSaving} onClick={() => void handleSave()} controlId="approval-flow-editor.save.button">
              {blnSaving ? "Saving..." : "Save Changes"}
            </Button>
          ) : null}
        </Stack>
      </Box>
      <Box sx={{ pb: 2 }}>
        <CommonEditModeBanner
          blnReadOnly={blnReadOnly}
          blnCanEdit={blnCanEditRight}
          fnOnEdit={() => setBlnEditRequested(true)}
          strReadOnlyMessage="You have view-only access to Approval Workflows."
        />
      </Box>

      {blnBusy ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <Box className={styles.tableCard}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>Basic Information</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                label="Workflow Name *"
                value={strWorkflowName}
                disabled={blnReadOnly}
                onChange={(objEvent) => setStrWorkflowName(objEvent.target.value)}
                helperText="Enter a unique name to identify this approval workflow."
                sx={{ flex: 1, minWidth: 240 }}
                controlId="approval-flow-editor.name.input"
              />
              <TextField
                select
                label="Module *"
                value={strModuleCode}
                disabled={blnReadOnly}
                onChange={(objEvent) => setStrModuleCode(objEvent.target.value as ApprovalFlowModuleCode)}
                helperText="Select the module this workflow applies to."
                sx={{ flex: 1, minWidth: 200 }}
                controlId="approval-flow-editor.module.select"
              >
                {lstApprovalFlowModules.map((objModule) => (
                  <MenuItem key={objModule.strValue} value={objModule.strValue}>{objModule.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Effective From *"
                type="date"
                value={strEffectiveFrom}
                disabled={blnReadOnly}
                onChange={(objEvent) => setStrEffectiveFrom(objEvent.target.value)}
                helperText="Workflow will be effective from this date."
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 200 }}
                controlId="approval-flow-editor.effective-from.input"
              />
              {renderToggle("Active Workflow", "Active workflows can be used for approvals.", blnIsActive, setBlnIsActive)}
            </Stack>
            <TextField
              label="Description (Optional)"
              value={strDescription}
              disabled={blnReadOnly}
              onChange={(objEvent) => setStrDescription(objEvent.target.value)}
              helperText="Add a short description to explain the purpose of this workflow."
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 2 }}
              controlId="approval-flow-editor.description.input"
            />
          </Box>

          <Box className={styles.tableCard}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>Leave Calendar</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 1.25 }}>Leave Year Starts On</Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                select
                label="Day"
                size="small"
                value={String(Math.min(intLeaveYearDay, intMaxLeaveYearDay))}
                onChange={(objEvent) => setIntLeaveYearDay(Number(objEvent.target.value))}
                disabled={blnReadOnly}
                sx={{ minWidth: 110 }}
                controlId="approval-flow-editor.leave-calendar.day.select"
              >
                {lstLeaveYearDayOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{String(intOption).padStart(2, "0")}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Month"
                size="small"
                value={String(intLeaveYearMonth)}
                onChange={(objEvent) => setIntLeaveYearMonth(Number(objEvent.target.value))}
                disabled={blnReadOnly}
                sx={{ minWidth: 160 }}
                controlId="approval-flow-editor.leave-calendar.month.select"
              >
                {lstMonths.map((strName, intIndex) => (
                  <MenuItem key={strName} value={String(intIndex + 1)}>{strName}</MenuItem>
                ))}
              </TextField>
              <Chip label={`Starts on ${strLeaveYearStartPreview}`} color="primary" variant="outlined" />
            </Stack>
          </Box>

          <Box className={styles.tableCard}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>Approver Configuration</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                select
                label="Default Approval Type / Approver Role *"
                value={strApproverRole}
                disabled={blnReadOnly}
                onChange={(objEvent) => setStrApproverRole(objEvent.target.value)}
                helperText="Defines the default role or approver category."
                sx={{ flex: 1, minWidth: 220 }}
                controlId="approval-flow-editor.approver-role.select"
              >
                {lstApproverRoles.map((objRole) => (
                  <MenuItem key={objRole.strValue} value={objRole.strValue}>{objRole.strLabel}</MenuItem>
                ))}
              </TextField>
              {renderApproverField("Primary Approver", "approval-flow-editor.primary-approver.autocomplete", objPrimary, setObjPrimary, objPrimarySnapshot, true)}
              {renderApproverField("Alternate Approver", "approval-flow-editor.alternate-approver.autocomplete", objAlternate, setObjAlternate, objAlternateSnapshot, false)}
              <TextField
                label="Escalation Days (Optional)"
                type="number"
                value={strEscalationDays}
                disabled={blnReadOnly}
                onChange={(objEvent) => setStrEscalationDays(objEvent.target.value)}
                helperText="Days before request escalates if not approved."
                sx={{ flex: 1, minWidth: 200 }}
                controlId="approval-flow-editor.escalation-days.input"
              />
            </Stack>
            <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
              If the primary approver is unavailable for the specified days, the request will be automatically routed to the alternate approver.
            </Alert>
          </Box>

          <Box className={styles.tableCard}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>Workflow Settings</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {renderToggle("Allow auto fallback to alternate approver", "Automatically route to alternate approver if primary approver is unavailable.", blnAllowAutoFallback, setBlnAllowAutoFallback)}
              {renderToggle("Require remarks on rejection", "Approvers must add remarks when rejecting a request.", blnRequireRemarksOnRejection, setBlnRequireRemarksOnRejection)}
              {renderToggle("Notify approvers by email", "Send email notifications to approvers for pending requests.", blnNotifyByEmail, setBlnNotifyByEmail)}
            </Stack>
            <TextField
              label="Approval Notes (Optional)"
              value={strApprovalNotes}
              disabled={blnReadOnly}
              onChange={(objEvent) => setStrApprovalNotes(objEvent.target.value)}
              helperText="Add notes or instructions for approvers (visible during approval)."
              multiline
              minRows={2}
              fullWidth
              controlId="approval-flow-editor.notes.input"
            />
          </Box>
        </Stack>
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