"use client";

import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Drawer, Grid, IconButton, InputAdornment, LinearProgress, MenuItem, Paper, Skeleton,
  Snackbar, Stack, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow,
  Tabs, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { useLeaveWorkflowPermissions } from "@/features/leave/hooks/useLeaveWorkflowPermissions";
import { leaveService } from "@/features/leave/services/leaveService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  formatLeaveDate, getLeaveTypeBadge, LEAVE_STATUS_COLORS,
  type LeaveQueueItemDto, type LeaveRouteStepDto, type LeaveTimelineEntryDto,
  type LeaveWorkflowExceptionDto,
} from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type ActionKind = "approve" | "reject" | "send_back" | "reassign" | "override";
type ActionState = { strKind: ActionKind; objItem: LeaveQueueItemDto } | null;
type LabelFn = (strKey: string, strFallback?: string) => string;

const HISTORY_STATUSES = ["approved", "rejected", "cancelled", "withdrawn"];
const ALL_STATUSES = ["pending", ...HISTORY_STATUSES];

function fnEmployeeName(objItem: LeaveQueueItemDto): string {
  return objItem.strEmployeeName ?? `Employee #${objItem.intEmployeeID}`;
}

async function fnLoadMergedStatuses(lstStatuses: string[]): Promise<LeaveQueueItemDto[]> {
  const lstResults = await Promise.all(lstStatuses.map((strStatus) => leaveService.listApplicationQueue(strStatus).catch(() => [] as LeaveQueueItemDto[])));
  const dicById = new Map<number, LeaveQueueItemDto>();
  lstResults.flat().forEach((objItem) => dicById.set(objItem.intID, objItem));
  return [...dicById.values()].sort((objA, objB) => String(objB.dtAppliedOn ?? "").localeCompare(String(objA.dtAppliedOn ?? "")));
}

export default function LeaveApprovalPanel() {
  const objTheme = useTheme();
  const blnMobile = useMediaQuery(objTheme.breakpoints.down("sm"));
  const { t } = useModuleLabels("hr-leave-workbench", "Unable to load Leave Workbench labels.");
  const {
    blnLoading: blnRightsLoading, blnCanView, blnCanApprove, blnCanReject, blnCanSendBack,
    blnCanReassign, blnCanOverride, blnCanViewConfidential, blnCanViewExceptions,
  } = useLeaveWorkflowPermissions();

  const [intTab, setIntTab] = useState(0);
  const [dicTabRows, setDicTabRows] = useState<Record<number, LeaveQueueItemDto[]>>({});
  const [lstExceptions, setLstExceptions] = useState<LeaveWorkflowExceptionDto[]>([]);
  const [dicTabLoaded, setDicTabLoaded] = useState<Record<number, boolean>>({});
  const [blnTabLoading, setBlnTabLoading] = useState(false);
  const [strTabError, setStrTabError] = useState<string | null>(null);
  const [strSearch, setStrSearch] = useState("");
  const [intPage, setIntPage] = useState(0);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);

  const [objDetail, setObjDetail] = useState<LeaveQueueItemDto | null>(null);
  const [lstTimeline, setLstTimeline] = useState<LeaveTimelineEntryDto[]>([]);
  const [lstRoute, setLstRoute] = useState<LeaveRouteStepDto[]>([]);
  const [blnDetailLoading, setBlnDetailLoading] = useState(false);
  const [objAction, setObjAction] = useState<ActionState>(null);
  const [strRemark, setStrRemark] = useState("");
  const [strReassignTo, setStrReassignTo] = useState("");
  const [strOverrideDecision, setStrOverrideDecision] = useState<"approve" | "reject">("approve");
  const [intProcessingID, setIntProcessingID] = useState<number | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  function fnShowToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  const fnLoadTab = useCallback(async (intTargetTab: number, blnForce = false) => {
    if (!blnCanView) return;
    if (dicTabLoaded[intTargetTab] && !blnForce) return;
    setBlnTabLoading(true);
    setStrTabError(null);
    try {
      if (intTargetTab === 4) {
        setLstExceptions(await leaveService.listWorkflowExceptions(false));
      } else {
        const lstRows = intTargetTab === 0 ? await leaveService.listApplicationQueue("pending")
          : intTargetTab === 1 ? await fnLoadMergedStatuses(ALL_STATUSES)
          : intTargetTab === 2 ? await leaveService.listOnBehalfApplications()
          : intTargetTab === 3 ? await leaveService.listAutoDecidedApplications()
          : (await fnLoadMergedStatuses(HISTORY_STATUSES));
        setDicTabRows((objPrev) => ({ ...objPrev, [intTargetTab]: lstRows }));
      }
      setDicTabLoaded((objPrev) => ({ ...objPrev, [intTargetTab]: true }));
    } catch (objError) {
      setStrTabError((await createApiRequestError(objError)).message);
    } finally {
      setBlnTabLoading(false);
    }
  }, [blnCanView, dicTabLoaded]);

  useEffect(() => {
    if (!blnRightsLoading && blnCanView) void fnLoadTab(intTab);
  }, [blnRightsLoading, blnCanView, intTab, fnLoadTab]);
  useEffect(() => { setIntPage(0); setStrSearch(""); }, [intTab]);

  const lstRows = dicTabRows[intTab] ?? [];
  const lstFiltered = useMemo(() => {
    const strNeedle = strSearch.trim().toLowerCase();
    if (!strNeedle) return lstRows;
    return lstRows.filter((objItem) => [fnEmployeeName(objItem), objItem.strEmployeeCode, objItem.strTypeName, objItem.strStatus].some((objValue) => String(objValue ?? "").toLowerCase().includes(strNeedle)));
  }, [lstRows, strSearch]);
  const lstPaged = useMemo(() => lstFiltered.slice(intPage * intRowsPerPage, intPage * intRowsPerPage + intRowsPerPage), [lstFiltered, intPage, intRowsPerPage]);

  const fnOpenDetail = useCallback(async (objItem: LeaveQueueItemDto) => {
    setObjDetail(objItem);
    setLstTimeline([]);
    setLstRoute([]);
    setBlnDetailLoading(true);
    try {
      const [objTimeline, lstRouteResult] = await Promise.all([
        leaveService.getApplicationTimeline(objItem.intID).catch(() => ({ intApplicationID: objItem.intID, lstTimeline: [] })),
        leaveService.getApplicationRouteSnapshot(objItem.intID).catch(() => [] as LeaveRouteStepDto[]),
      ]);
      setLstTimeline(objTimeline.lstTimeline ?? []);
      setLstRoute(lstRouteResult);
    } finally {
      setBlnDetailLoading(false);
    }
  }, []);

  function fnOpenAction(strKind: ActionKind) {
    if (!objDetail) return;
    setStrRemark("");
    setStrReassignTo("");
    setStrOverrideDecision("approve");
    setObjAction({ strKind, objItem: objDetail });
  }

  const blnActionValid = useMemo(() => {
    if (!objAction) return false;
    if (objAction.strKind === "approve") return true;
    if (objAction.strKind === "reassign") return Boolean(strReassignTo.trim()) && Number(strReassignTo) > 0 && Boolean(strRemark.trim());
    return Boolean(strRemark.trim()); // reject / send_back / override require a reason
  }, [objAction, strReassignTo, strRemark]);

  async function fnRunAction() {
    if (!objAction || !blnActionValid) return;
    const { strKind, objItem } = objAction;
    setIntProcessingID(objItem.intID);
    try {
      // The workflow decision (_act/_checkVersion) is versioned by the workflow instance's
      // row_version, not the application's request_version — send objWorkflow.intVersionNo.
      const intVersionNo = objItem.objWorkflow?.intVersionNo ?? null;
      if (strKind === "approve") {
        await leaveService.approveApplication(objItem.intID, { strComment: strRemark.trim() || null, intVersionNo });
      } else if (strKind === "reject") {
        await leaveService.rejectApplication(objItem.intID, { strComment: strRemark.trim(), intVersionNo });
      } else if (strKind === "send_back") {
        await leaveService.sendBackApplication(objItem.intID, { strComment: strRemark.trim(), intVersionNo });
      } else if (strKind === "reassign") {
        await leaveService.reassignApplication(objItem.intID, { intReassignToUserID: Number(strReassignTo), strComment: strRemark.trim(), intVersionNo });
      } else {
        await leaveService.overrideApplication(objItem.intID, { strAction: strOverrideDecision, strComment: strRemark.trim(), intVersionNo });
      }
      fnShowToast(t(`done_${strKind}`, "Action completed successfully."), "success");
      setObjAction(null);
      setObjDetail(null);
      await fnLoadTab(intTab, true);
    } catch (objError) {
      fnShowToast((await createApiRequestError(objError)).message, "error");
    } finally {
      setIntProcessingID(null);
    }
  }

  if (blnRightsLoading) return <Box sx={{ p: 2 }}><LinearProgress /></Box>;
  if (!blnCanView) return <Box sx={{ p: 3 }}><Alert severity="warning">{t("access_denied", "Leave Requests & Approvals access is not available for your user group.")}</Alert></Box>;

  const lstTabs = [
    { strLabel: t("tab_pending", "Pending HR Approval"), blnShow: true },
    { strLabel: t("tab_all", "All Requests"), blnShow: true },
    { strLabel: t("tab_on_behalf", "HR On Behalf"), blnShow: true },
    { strLabel: t("tab_auto", "Auto Decisions"), blnShow: true },
    { strLabel: t("tab_exceptions", "Workflow Exceptions"), blnShow: blnCanViewExceptions },
    { strLabel: t("tab_history", "Completed / History"), blnShow: true },
  ];

  return <Stack spacing={2}>
    <Paper sx={{ p: { xs: 1.75, md: 2.25 }, borderRadius: "20px", background: "linear-gradient(135deg,#0b3f70 0%,#0a66a3 52%,#0e7490 100%)", color: "white", boxShadow: "0 14px 28px rgba(2,6,23,.18)" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
        <Stack direction="row" spacing={1.4} alignItems="center"><Box sx={{ width: 48, height: 48, borderRadius: "14px", bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><FactCheckRoundedIcon /></Box><Box><Typography component="h1" sx={{ fontWeight: 800, fontSize: "1.08rem" }}>{t("page_title", "Leave Requests & Approvals")}</Typography><Typography sx={{ fontSize: ".82rem", color: "rgba(241,245,249,.92)" }}>{t("page_subtitle", "The HR workbench for every leave request and workflow action.")}</Typography></Box></Stack>
        <Button data-controlid="hr.leave.workbench.refresh" variant="contained" startIcon={<RefreshRoundedIcon />} onClick={() => void fnLoadTab(intTab, true)} sx={{ bgcolor: "white", color: "#0b3f70", fontWeight: 800, "&:hover": { bgcolor: "#e2e8f0" } }}>{t("refresh", "Refresh")}</Button>
      </Stack>
    </Paper>

    <Paper sx={{ borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Tabs value={intTab} onChange={(_objEvent, intValue) => setIntTab(intValue)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: "1px solid #e2e8f0", px: 1 }}>
        {lstTabs.map((objTab) => <Tab key={objTab.strLabel} label={objTab.strLabel} disabled={!objTab.blnShow} sx={{ fontWeight: 700, textTransform: "none", display: objTab.blnShow ? "inline-flex" : "none" }} />)}
      </Tabs>

      {strTabError ? <Box sx={{ p: 2 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void fnLoadTab(intTab, true)}>{t("retry", "Retry")}</Button>}>{strTabError}</Alert></Box> : null}

      {intTab === 4 ? (
        <ExceptionsTable lstExceptions={lstExceptions} blnLoading={blnTabLoading} fnOnOpen={(intApplicationID) => { const objItem = { intID: intApplicationID } as LeaveQueueItemDto; void fnOpenDetail(objItem); }} fnLabel={t} />
      ) : <>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ p: 2 }} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Typography sx={{ fontSize: ".8rem", color: "#64748b" }}>{lstFiltered.length} {t("requests", "request(s)")}</Typography>
          <TextField data-controlid="hr.leave.workbench.search" size="small" value={strSearch} onChange={(objEvent) => setStrSearch(objEvent.target.value)} placeholder={t("search_placeholder", "Search by employee or type")} InputProps={{ startAdornment: <InputAdornment position="start"><FactCheckRoundedIcon fontSize="small" /></InputAdornment> }} sx={{ minWidth: { sm: 280 } }} />
        </Stack>
        <Divider />
        {blnTabLoading ? <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={280} /></Box>
          : lstPaged.length === 0 ? <EmptyState strMessage={t("empty", "No requests to show here.")} />
          : <WorkbenchTable lstItems={lstPaged} intTab={intTab} blnMobile={blnMobile} blnCanViewConfidential={blnCanViewConfidential} fnOnOpen={(objItem) => void fnOpenDetail(objItem)} fnLabel={t} />}
        <TablePagination component="div" count={lstFiltered.length} page={intPage} onPageChange={(_objEvent, intNext) => setIntPage(intNext)} rowsPerPage={intRowsPerPage} onRowsPerPageChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(0); }} rowsPerPageOptions={[5, 10, 25]} />
      </>}
    </Paper>

    <HrDetailDrawer
      objItem={objDetail} lstTimeline={lstTimeline} lstRoute={lstRoute} blnLoading={blnDetailLoading}
      blnCanViewConfidential={blnCanViewConfidential} blnCanApprove={blnCanApprove} blnCanReject={blnCanReject}
      blnCanSendBack={blnCanSendBack} blnCanReassign={blnCanReassign} blnCanOverride={blnCanOverride}
      blnProcessing={intProcessingID === objDetail?.intID} fnOnClose={() => setObjDetail(null)} fnOnAction={fnOpenAction} fnLabel={t}
    />

    <Dialog open={Boolean(objAction)} onClose={() => intProcessingID === null && setObjAction(null)} maxWidth="xs" fullWidth>
      {objAction ? <>
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>{objAction.strKind === "override" ? <GavelRoundedIcon color="warning" /> : null}{t(`title_${objAction.strKind}`, actionTitle(objAction.strKind))}</DialogTitle>
        {intProcessingID !== null ? <LinearProgress /> : null}
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {objAction.strKind === "override" ? <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>{t("override_warning", "Override bypasses the remaining approval chain and applies your decision immediately. This is audit-logged.")}</Alert> : null}
            {objAction.strKind === "override" ? <TextField data-controlid="hr.leave.workbench.override.decision" select size="small" label={t("decision", "Decision")} value={strOverrideDecision} onChange={(objEvent) => setStrOverrideDecision(objEvent.target.value as "approve" | "reject")}><MenuItem value="approve">{t("approve", "Approve")}</MenuItem><MenuItem value="reject">{t("reject", "Reject")}</MenuItem></TextField> : null}
            {objAction.strKind === "reassign" ? <TextField data-controlid="hr.leave.workbench.reassign.user" size="small" type="number" label={t("reassign_to_user", "Reassign to (User ID)")} value={strReassignTo} onChange={(objEvent) => setStrReassignTo(objEvent.target.value)} helperText={t("reassign_hint", "Enter the user ID of the new approver.")} /> : null}
            <TextField data-controlid="hr.leave.workbench.remark" autoFocus fullWidth multiline minRows={2}
              label={objAction.strKind === "approve" ? t("remark_optional", "Remark (optional)") : t("reason_required", "Reason (required)")}
              value={strRemark} onChange={(objEvent) => setStrRemark(objEvent.target.value)}
              error={objAction.strKind !== "approve" && !strRemark.trim()}
              helperText={objAction.strKind !== "approve" && !strRemark.trim() ? t("reason_required_hint", "A reason is required for this action.") : ""} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjAction(null)} disabled={intProcessingID !== null}>{t("cancel", "Cancel")}</Button>
          <Button variant="contained" color={objAction.strKind === "reject" ? "error" : objAction.strKind === "override" ? "warning" : "primary"} disabled={!blnActionValid || intProcessingID !== null} onClick={() => void fnRunAction()}>{t("submit", "Submit")}</Button>
        </DialogActions>
      </> : null}
    </Dialog>

    <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert></Snackbar>
  </Stack>;
}

function actionTitle(strKind: ActionKind): string {
  return strKind === "approve" ? "Approve Application" : strKind === "reject" ? "Reject Application"
    : strKind === "send_back" ? "Send Back Application" : strKind === "reassign" ? "Reassign Approval" : "Override Workflow";
}

function EmptyState({ strMessage }: { strMessage: string }) {
  return <Box sx={{ p: 5, textAlign: "center" }}><FactCheckRoundedIcon sx={{ color: "#94a3b8", fontSize: 40, mb: .5 }} /><Typography sx={{ color: "#64748b", fontWeight: 600 }}>{strMessage}</Typography></Box>;
}

function StatusChip({ strStatus }: { strStatus: string }) {
  const objColor = LEAVE_STATUS_COLORS[strStatus] ?? { bg: "#f1f5f9", fg: "#475569" };
  return <Chip size="small" label={strStatus.replaceAll("_", " ")} sx={{ fontWeight: 700, textTransform: "capitalize", bgcolor: objColor.bg, color: objColor.fg }} />;
}

function TypeText({ objItem, blnCanViewConfidential, fnLabel }: { objItem: LeaveQueueItemDto; blnCanViewConfidential: boolean; fnLabel: LabelFn }) {
  if (objItem.blnIsMasked && !blnCanViewConfidential) return <Typography sx={{ fontSize: ".82rem", color: "#64748b", fontStyle: "italic" }}>{fnLabel("confidential", "Confidential")}</Typography>;
  const objBadge = getLeaveTypeBadge(objItem.strTypeCode, objItem.strTypeName);
  return <Stack direction="row" spacing={1} alignItems="center"><Box aria-hidden sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: objBadge.bg, color: objBadge.fg, display: "grid", placeItems: "center", fontWeight: 800, fontSize: ".66rem" }}>{objBadge.strLabel}</Box><Typography sx={{ fontWeight: 700, fontSize: ".82rem" }}>{objItem.strTypeName ?? `#${objItem.intLeaveTypeID}`}</Typography></Stack>;
}

function WorkbenchTable({ lstItems, intTab, blnMobile, blnCanViewConfidential, fnOnOpen, fnLabel }: {
  lstItems: LeaveQueueItemDto[]; intTab: number; blnMobile: boolean; blnCanViewConfidential: boolean; fnOnOpen: (objItem: LeaveQueueItemDto) => void; fnLabel: LabelFn;
}) {
  const blnActionedTab = intTab === 2 || intTab === 3 || intTab === 5;
  if (blnMobile) {
    return <Stack spacing={1} sx={{ p: 1.5 }}>{lstItems.map((objItem) => <Paper key={objItem.intID} variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }} onClick={() => fnOnOpen(objItem)}><Stack direction="row" justifyContent="space-between"><Box><Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>{fnEmployeeName(objItem)}</Typography><Box sx={{ mt: .5 }}><TypeText objItem={objItem} blnCanViewConfidential={blnCanViewConfidential} fnLabel={fnLabel} /></Box><Typography sx={{ fontSize: ".74rem", color: "#64748b", mt: .5 }}>{formatLeaveDate(objItem.dtFromDate)} – {formatLeaveDate(objItem.dtToDate)} · {objItem.decDays}</Typography></Box><StatusChip strStatus={objItem.strStatus} /></Stack></Paper>)}</Stack>;
  }
  return <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#f8fafc", whiteSpace: "nowrap" } }}>
    <TableCell>{fnLabel("employee", "Employee")}</TableCell>
    <TableCell>{fnLabel("leave_type", "Leave Type")}</TableCell>
    <TableCell>{fnLabel("from_date", "From")}</TableCell>
    <TableCell>{fnLabel("to_date", "To")}</TableCell>
    <TableCell>{fnLabel("days", "Days")}</TableCell>
    <TableCell>{blnActionedTab ? fnLabel("actioned_on", "Actioned On") : fnLabel("applied_on", "Applied On")}</TableCell>
    <TableCell>{fnLabel("status", "Status")}</TableCell>
    <TableCell align="right">{fnLabel("actions", "Actions")}</TableCell>
  </TableRow></TableHead><TableBody>
    {lstItems.map((objItem) => <TableRow key={objItem.intID} hover>
      <TableCell><Typography sx={{ fontWeight: 700, fontSize: ".82rem" }}>{fnEmployeeName(objItem)}</Typography><Typography sx={{ fontSize: ".7rem", color: "#64748b" }}>{objItem.strEmployeeCode ?? ""}</Typography></TableCell>
      <TableCell><TypeText objItem={objItem} blnCanViewConfidential={blnCanViewConfidential} fnLabel={fnLabel} /></TableCell>
      <TableCell>{formatLeaveDate(objItem.dtFromDate)}</TableCell>
      <TableCell>{formatLeaveDate(objItem.dtToDate)}</TableCell>
      <TableCell>{objItem.decDays}</TableCell>
      <TableCell>{formatLeaveDate(blnActionedTab ? (objItem.dtLastActionOn ?? objItem.dtDecidedOn) : objItem.dtAppliedOn)}</TableCell>
      <TableCell><StatusChip strStatus={objItem.strStatus} /></TableCell>
      <TableCell align="right"><Button data-controlid={`hr.leave.workbench.view.${objItem.intID}`} size="small" variant="outlined" onClick={() => fnOnOpen(objItem)}>{fnLabel("review", "Review")}</Button></TableCell>
    </TableRow>)}
  </TableBody></Table></Box>;
}

function ExceptionsTable({ lstExceptions, blnLoading, fnOnOpen, fnLabel }: { lstExceptions: LeaveWorkflowExceptionDto[]; blnLoading: boolean; fnOnOpen: (intApplicationID: number) => void; fnLabel: LabelFn }) {
  if (blnLoading) return <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={220} /></Box>;
  if (lstExceptions.length === 0) return <EmptyState strMessage={fnLabel("no_exceptions", "No workflow exceptions.")} />;
  return <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#f8fafc", whiteSpace: "nowrap" } }}>
    <TableCell>{fnLabel("application", "Application")}</TableCell>
    <TableCell>{fnLabel("exception_code", "Exception")}</TableCell>
    <TableCell>{fnLabel("detail", "Detail")}</TableCell>
    <TableCell>{fnLabel("resolved", "Resolved")}</TableCell>
    <TableCell>{fnLabel("raised_on", "Raised On")}</TableCell>
    <TableCell align="right">{fnLabel("actions", "Actions")}</TableCell>
  </TableRow></TableHead><TableBody>
    {lstExceptions.map((objException) => <TableRow key={objException.intID} hover>
      <TableCell>#{objException.intApplicationID}</TableCell>
      <TableCell><Chip size="small" label={(objException.strExceptionCode ?? "—").replaceAll("_", " ")} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700, textTransform: "capitalize" }} /></TableCell>
      <TableCell sx={{ maxWidth: 320 }}><Typography sx={{ fontSize: ".8rem" }}>{objException.strExceptionDetail ?? "—"}</Typography></TableCell>
      <TableCell>{objException.blnIsResolved ? <Chip size="small" color="success" label={fnLabel("yes", "Yes")} /> : <Chip size="small" color="warning" label={fnLabel("open", "Open")} />}</TableCell>
      <TableCell>{formatLeaveDate(objException.dtAddedOn)}</TableCell>
      <TableCell align="right"><Button data-controlid={`hr.leave.workbench.exception.view.${objException.intID}`} size="small" variant="outlined" onClick={() => fnOnOpen(objException.intApplicationID)}>{fnLabel("open_request", "Open")}</Button></TableCell>
    </TableRow>)}
  </TableBody></Table></Box>;
}

function KeyValue({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return <Box><Typography sx={{ fontSize: ".68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{strLabel}</Typography><Typography sx={{ fontWeight: 600, fontSize: ".86rem" }}>{strValue}</Typography></Box>;
}

function HrDetailDrawer({ objItem, lstTimeline, lstRoute, blnLoading, blnCanViewConfidential, blnCanApprove, blnCanReject, blnCanSendBack, blnCanReassign, blnCanOverride, blnProcessing, fnOnClose, fnOnAction, fnLabel }: {
  objItem: LeaveQueueItemDto | null; lstTimeline: LeaveTimelineEntryDto[]; lstRoute: LeaveRouteStepDto[]; blnLoading: boolean;
  blnCanViewConfidential: boolean; blnCanApprove: boolean; blnCanReject: boolean; blnCanSendBack: boolean; blnCanReassign: boolean; blnCanOverride: boolean;
  blnProcessing: boolean; fnOnClose: () => void; fnOnAction: (strKind: ActionKind) => void; fnLabel: LabelFn;
}) {
  const blnMasked = Boolean(objItem?.blnIsMasked && !blnCanViewConfidential);
  const blnPending = objItem?.strStatus === "pending";
  return <Drawer anchor="right" open={Boolean(objItem)} onClose={fnOnClose} PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, maxWidth: "100%" } }}>
    {objItem ? <Stack sx={{ height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}><Typography sx={{ fontWeight: 800 }}>{fnLabel("request_details", "Request Details")}</Typography><IconButton aria-label={fnLabel("close", "Close")} onClick={fnOnClose}><CloseRoundedIcon /></IconButton></Stack>
      {blnProcessing ? <LinearProgress /> : null}
      <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}><Stack spacing={2}>
        <Box><Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{objItem.strEmployeeName ?? (objItem.intEmployeeID ? `Employee #${objItem.intEmployeeID}` : fnLabel("application", "Application") + ` #${objItem.intID}`)}</Typography><Typography sx={{ fontSize: ".76rem", color: "#64748b" }}>{objItem.strEmployeeCode ?? ""}</Typography><Box sx={{ mt: .75 }}>{objItem.strStatus ? <StatusChip strStatus={objItem.strStatus} /> : null}</Box></Box>
        <Grid container spacing={1.5}>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("leave_type", "Leave Type")} strValue={blnMasked ? fnLabel("confidential", "Confidential") : (objItem.strTypeName ?? "—")} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("days", "Days")} strValue={String(objItem.decDays ?? "—")} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("from_date", "From")} strValue={formatLeaveDate(objItem.dtFromDate)} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("to_date", "To")} strValue={formatLeaveDate(objItem.dtToDate)} /></Grid>
          <Grid item xs={12}><KeyValue strLabel={fnLabel("reason", "Reason")} strValue={blnMasked ? fnLabel("confidential", "Confidential") : (objItem.strReason || "—")} /></Grid>
        </Grid>
        <Box><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: .75 }}>{fnLabel("approval_route", "Approval Route")}</Typography>{blnLoading ? <Skeleton variant="rounded" height={50} /> : lstRoute.length === 0 ? <Typography sx={{ fontSize: ".78rem", color: "#94a3b8" }}>{fnLabel("route_unavailable", "Route not available.")}</Typography> : <Stack spacing={.5}>{lstRoute.map((objStep) => <Stack key={objStep.intStepNo} direction="row" spacing={1} alignItems="center"><Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: objStep.strStepStatus === "approved" ? "#dcfce7" : objStep.strStepStatus === "pending" ? "#fef3c7" : "#f1f5f9", display: "grid", placeItems: "center", fontSize: ".68rem", fontWeight: 800 }}>{objStep.intStepNo}</Box><Typography sx={{ fontSize: ".8rem" }}>{objStep.strApproverName || objStep.strApproverSourceCode?.replaceAll("_", " ")}</Typography>{objStep.strStepStatus ? <Chip size="small" label={objStep.strStepStatus} sx={{ height: 20, textTransform: "capitalize" }} /> : null}</Stack>)}</Stack>}</Box>
        <Box><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: .75 }}>{fnLabel("timeline", "Timeline")}</Typography>{blnLoading ? <Skeleton variant="rounded" height={50} /> : lstTimeline.length === 0 ? <Typography sx={{ fontSize: ".78rem", color: "#94a3b8" }}>{fnLabel("timeline_empty", "No actions recorded yet.")}</Typography> : <Stack spacing={1}>{lstTimeline.map((objEntry, intIndex) => <Stack key={objEntry.intID ?? intIndex} direction="row" spacing={1.25}><Box sx={{ width: 9, height: 9, mt: .6, borderRadius: "50%", bgcolor: intIndex === 0 ? "#0a66a3" : "#94a3b8", flexShrink: 0 }} /><Box><Typography sx={{ fontWeight: 800, fontSize: ".78rem", textTransform: "capitalize" }}>{(objEntry.strActionCode ?? "").replaceAll("_", " ")}</Typography><Typography sx={{ fontSize: ".72rem", color: "#64748b" }}>{formatLeaveDate(objEntry.dtActionOn)}{objEntry.strComment ? ` — ${objEntry.strComment}` : ""}</Typography></Box></Stack>)}</Stack>}</Box>
      </Stack></Box>
      <Stack spacing={1} sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        {blnPending && (blnCanApprove || blnCanReject || blnCanSendBack) ? <Stack direction="row" spacing={1}>
          {blnCanSendBack ? <Button data-controlid="hr.leave.workbench.sendback" fullWidth variant="outlined" color="warning" startIcon={<ReplayRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnAction("send_back")}>{fnLabel("send_back", "Send Back")}</Button> : null}
          {blnCanReject ? <Button data-controlid="hr.leave.workbench.reject" fullWidth variant="outlined" color="error" startIcon={<CancelRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnAction("reject")}>{fnLabel("reject", "Reject")}</Button> : null}
          {blnCanApprove ? <Button data-controlid="hr.leave.workbench.approve" fullWidth variant="contained" color="success" startIcon={<CheckCircleRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnAction("approve")}>{fnLabel("approve", "Approve")}</Button> : null}
        </Stack> : null}
        {blnPending && (blnCanReassign || blnCanOverride) ? <Stack direction="row" spacing={1}>
          {blnCanReassign ? <Button data-controlid="hr.leave.workbench.reassign" fullWidth variant="outlined" startIcon={<SwapHorizRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnAction("reassign")}>{fnLabel("reassign", "Reassign")}</Button> : null}
          {blnCanOverride ? <Button data-controlid="hr.leave.workbench.override" fullWidth variant="outlined" color="warning" startIcon={<GavelRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnAction("override")}>{fnLabel("override", "Override")}</Button> : null}
        </Stack> : null}
      </Stack>
    </Stack> : null}
  </Drawer>;
}
