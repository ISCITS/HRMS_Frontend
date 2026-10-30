"use client";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import * as yup from "yup";

import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import LookupChip, { actionLabel, lookupLabel } from "@/features/attendance-regularization/components/LookupChip";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { onSearchEnter, dicMasterNameLinkSx, dicMasterRowSx, MasterBreadcrumbs, MasterGridSkeleton } from "@/components/master/MasterListUi";
import FileRowActions from "@/components/shared/files/FileRowActions";
import { attendanceRegularizationService } from "@/features/attendance-regularization/services/attendanceRegularizationService";
import type {
  AttendanceSnapshot, DateContext, LookupOption, PreviewResult, RegularizationDetail, RegularizationFormValues,
  RegularizationLookups, RegularizationRequest, RequestAttachment,
} from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { MAX_UPLOAD_SIZE_LABEL } from "@/lib/fileUploadConstants";

const strTypeDomain = "ATTENDANCE_REGULARIZATION_REQUEST_TYPE";
const strStatusDomain = "ATTENDANCE_REGULARIZATION_STATUS";
const strActionDomain = "ATTENDANCE_REGULARIZATION_ACTION";
const strAttendanceStatusDomain = "ATTENDANCE_STATUS";
const setHiddenEssRequestTypeCodes = new Set(["MISSING_IN", "OTHER"]);
const setAutoCalculatedRequestTypeCodes = new Set(["MISSING_OUT", "MISSING_BOTH"]);
type PunchRecord = DateContext["lstPunches"][number];
type RequestGridRow = Record<string, ReactNode> & {
  intID: number;
  actions: ReactNode;
  requestNumberText: string;
  statusText: string;
  requestNumber: ReactNode;
  workDate: ReactNode;
  requestType: ReactNode;
  proposedStatus: ReactNode;
  status: ReactNode;
};

// No backend lookup domain exists for regularization reasons yet (verified — no seeded domain in
// db_scripts, no ATTENDANCE_REGULARIZATION_REASON key in getEssLookups' response). This is a
// frontend-only bounded option list per the spec; strEmployeeReason stays a free-text string field
// on the backend (no schema change) and simply gets one of these fixed codes as its value.
const strOtherReasonCode = "OTHER";
const lstReasonOptions = [
  { strValueCode: "MISSED_PUNCH", strLabelKey: "reason_missed_punch", strFallback: "Missed punch" },
  { strValueCode: "DEVICE_ISSUE", strLabelKey: "reason_device_issue", strFallback: "Device issue" },
  { strValueCode: "OFFICIAL_DUTY", strLabelKey: "reason_official_duty", strFallback: "Official duty" },
  { strValueCode: "APPROVED_WORK", strLabelKey: "reason_approved_work", strFallback: "Approved work" },
  { strValueCode: "DATA_CORRECTION", strLabelKey: "reason_data_correction", strFallback: "Data correction" },
  { strValueCode: strOtherReasonCode, strLabelKey: "reason_other", strFallback: "Other" },
];

function todayIso() {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}

function initialValues(strDate: string): RegularizationFormValues {
  return {
    dtWorkDate: strDate, strRequestTypeCode: "", strProposedStatus: "",
    tmProposedFirstIn: "", tmProposedLastOut: "", decProposedWorkedHours: null,
    blnProposedIsPaid: null, strProposedRemark: "", strEmployeeReason: "",
  };
}

function formatActionDateTime(strValue?: string | null) {
  if (!strValue) return "—";
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) return strValue;
  const strDate = objDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const strTime = objDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${strDate} at ${strTime}`;
}

function formatDdMmmYyyy(strValue?: string | null) {
  if (!strValue) return "";
  const objDate = new Date(`${strValue}T00:00:00`);
  if (Number.isNaN(objDate.getTime())) return strValue;
  const strDay = String(objDate.getDate()).padStart(2, "0");
  const strMonth = objDate.toLocaleDateString("en-GB", { month: "short" });
  return `${strDay}-${strMonth}-${objDate.getFullYear()}`;
}

function formatTime(strValue?: string | null) {
  if (!strValue) return "—";
  const objDate = new Date(strValue);
  if (!Number.isNaN(objDate.getTime())) {
    return objDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return strValue.slice(0, 5);
}

function formatInputTime(strValue?: string | null) {
  if (!strValue) return "";
  const objDate = new Date(strValue);
  if (!Number.isNaN(objDate.getTime())) {
    return `${String(objDate.getHours()).padStart(2, "0")}:${String(objDate.getMinutes()).padStart(2, "0")}`;
  }
  return strValue.slice(0, 5);
}

function addOneMinuteToTime(strValue?: string | null) {
  if (!strValue || !/^\d{2}:\d{2}$/.test(strValue)) return undefined;
  const [strHour, strMinute] = strValue.split(":");
  const intTotalMinutes = Number(strHour) * 60 + Number(strMinute) + 1;
  if (!Number.isFinite(intTotalMinutes) || intTotalMinutes >= 24 * 60) return undefined;
  return `${String(Math.floor(intTotalMinutes / 60)).padStart(2, "0")}:${String(intTotalMinutes % 60).padStart(2, "0")}`;
}

function getSnapshotFirstIn(objDay?: AttendanceSnapshot | null) {
  return objDay?.strFirstIn ?? objDay?.tmFirstIn ?? null;
}

function getSnapshotLastOut(objDay?: AttendanceSnapshot | null) {
  return objDay?.strLastOut ?? objDay?.tmLastOut ?? null;
}

function formatDuration(decHours?: number | null) {
  const intMinutes = Math.max(0, Math.round(Number(decHours ?? 0) * 60));
  return formatMinutesDuration(intMinutes);
}

function formatMinutesDuration(intMinutes?: number | null) {
  const intSafeMinutes = Math.max(0, Math.round(Number(intMinutes ?? 0)));
  if (intSafeMinutes < 60) return `${intSafeMinutes} m`;
  const intHours = Math.floor(intSafeMinutes / 60);
  const intRemainingMinutes = intSafeMinutes % 60;
  return intRemainingMinutes > 0 ? `${intHours} hr ${intRemainingMinutes} m` : `${intHours} hr`;
}

function parseTimeToMinutes(strValue?: string | null) {
  if (!strValue) return null;
  const [strHours, strMinutes] = strValue.slice(0, 5).split(":");
  const intHours = Number(strHours);
  const intMinutes = Number(strMinutes);
  if (!Number.isInteger(intHours) || !Number.isInteger(intMinutes) || intHours < 0 || intHours > 23 || intMinutes < 0 || intMinutes > 59) return null;
  return intHours * 60 + intMinutes;
}

function calculateWorkedHours(strFirstIn?: string | null, strLastOut?: string | null) {
  const intFirstInMinutes = parseTimeToMinutes(strFirstIn);
  const intLastOutMinutes = parseTimeToMinutes(strLastOut);
  if (intFirstInMinutes === null || intLastOutMinutes === null || intLastOutMinutes <= intFirstInMinutes) return null;
  return Math.round(((intLastOutMinutes - intFirstInMinutes) / 60) * 100) / 100;
}

function deriveProposedStatus(decWorkedHours?: number | null) {
  const decHours = Number(decWorkedHours ?? 0);
  if (decHours >= 8) return "present";
  if (decHours >= 4) return "half_day";
  return "absent";
}

function formatDisplayDate(strValue?: string | null) {
  if (!strValue) return "";
  const objDate = new Date(`${strValue}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function punchTimeToMinutes(strValue?: string | null) {
  if (!strValue) return null;
  const objDate = new Date(strValue);
  if (!Number.isNaN(objDate.getTime())) return objDate.getHours() * 60 + objDate.getMinutes();
  return parseTimeToMinutes(formatInputTime(strValue));
}

function buildPunchLogRows(lstPunches: PunchRecord[]) {
  let intOpenInMinutes: number | null = null;
  let intTotalMinutes = 0;
  const lstRows = [...lstPunches]
    .sort((objLeft, objRight) => new Date(objLeft.dtPunchAt).getTime() - new Date(objRight.dtPunchAt).getTime())
    .map((objPunch) => {
      const strDirection = objPunch.strDirection.toLowerCase();
      const intPunchMinutes = punchTimeToMinutes(objPunch.dtPunchAt);
      let intPeriodMinutes: number | null = null;
      if (strDirection === "in") {
        intOpenInMinutes = intPunchMinutes;
      } else if (intOpenInMinutes !== null && intPunchMinutes !== null && intPunchMinutes >= intOpenInMinutes) {
        intPeriodMinutes = intPunchMinutes - intOpenInMinutes;
        intTotalMinutes += intPeriodMinutes;
        intOpenInMinutes = null;
      }
      return { ...objPunch, intPeriodMinutes };
    });
  return { lstRows, intTotalMinutes };
}

function punchSourceLabel(strSource: string) {
  const strNormalized = strSource.trim().toLowerCase();
  if (["mobile", "app", "phone"].includes(strNormalized)) return "Mobile App";
  if (strNormalized === "web") return "Web";
  if (strNormalized === "biometric") return "Biometric";
  return strSource;
}

function requestStatusTone(strStatus: string) {
  if (["APPROVED", "COMPLETED", "POSTED"].includes(strStatus)) return { strDot: "#22c55e", strBg: "#dcfce7", strText: "#166534" };
  if (["REJECTED", "FAILED"].includes(strStatus)) return { strDot: "#ef4444", strBg: "#fee2e2", strText: "#991b1b" };
  if (["WITHDRAWN", "DRAFT", "CANCELLED"].includes(strStatus)) return { strDot: "#cbd5e1", strBg: "#e5e7eb", strText: "#374151" };
  return { strDot: "#f59e0b", strBg: "#fef3c7", strText: "#92400e" };
}

function DetailCard({ strTitle, lstRows, children }: { strTitle: string; lstRows?: Array<[string, string]>; children?: ReactNode }) {
  return (
    <Box sx={{ height: "100%", border: "1px solid #dbe7f5", borderRadius: "10px", p: 2, bgcolor: "#ffffff" }}>
      <Typography sx={{ fontWeight: 900, color: "#0f2f55", mb: 1.25 }}>{strTitle}</Typography>
      {lstRows?.map(([strLabel, strValue]) => (
        <Box key={strLabel} sx={{ display: "grid", gridTemplateColumns: "140px 1fr", columnGap: 1, py: 0.35 }}>
          <Typography variant="body2" color="text.secondary">{strLabel}</Typography>
          <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 500, overflowWrap: "anywhere" }}>{strValue}</Typography>
        </Box>
      ))}
      {children}
    </Box>
  );
}

export default function AttendanceRegularizationPage() {
  const { t, intLanguageID } = useModuleLabels("attendance_regularization", "Unable to load attendance regularization labels.");
  const { blnLoading: blnRightsLoading, canViewAny } = useModuleActionAccess(["ESS_ATTENDANCE_REGULARIZATION"]);
  const objSearchParams = useSearchParams();
  const strInitialDate = objSearchParams.get("date") ?? todayIso();
  const [intTab, setIntTab] = useState(objSearchParams.get("tab") === "requests" ? 1 : 0);
  const [objLookups, setObjLookups] = useState<RegularizationLookups>({});
  const [objContext, setObjContext] = useState<DateContext | null>(null);
  const [objPreview, setObjPreview] = useState<PreviewResult | null>(null);
  const [lstRequests, setLstRequests] = useState<RegularizationRequest[]>([]);
  const [strRequestSearch, setStrRequestSearch] = useState("");
  const [strRequestStatusFilter, setStrRequestStatusFilter] = useState("");
  const [strAppliedRequestSearch, setStrAppliedRequestSearch] = useState("");
  const [strAppliedRequestStatus, setStrAppliedRequestStatus] = useState("");
  const [strRequestFromDate, setStrRequestFromDate] = useState("");
  const [strRequestToDate, setStrRequestToDate] = useState("");
  const [strAppliedFromDate, setStrAppliedFromDate] = useState("");
  const [strAppliedToDate, setStrAppliedToDate] = useState("");
  const [objEditing, setObjEditing] = useState<RegularizationRequest | null>(null);
  const [objDetail, setObjDetail] = useState<RegularizationDetail | null>(null);
  const [blnPunchLogOpen, setBlnPunchLogOpen] = useState(false);
  const [lstFiles, setLstFiles] = useState<File[]>([]);
  // Attachments already persisted on the request being edited (server-side, have an intID). Kept
  // separate from lstFiles (locally-picked, not-yet-uploaded File objects) so each can render its
  // own Preview/Replace/Delete row — the "New Request" form previously showed newly-picked files
  // as bare filename text with no actions at all.
  const [lstEditingAttachments, setLstEditingAttachments] = useState<RequestAttachment[]>([]);
  const [intAttachmentBusyID, setIntAttachmentBusyID] = useState<number | null>(null);
  const [intAttachmentReplacingID, setIntAttachmentReplacingID] = useState<number | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [objConfirm, setObjConfirm] = useState<
    { strAction: "submit"; objValues: RegularizationFormValues } | { strAction: "withdraw"; objRequest: RegularizationRequest } | null
  >(null);
  const [intDetailAttachmentBusyID, setIntDetailAttachmentBusyID] = useState<number | null>(null);
  const [objToast, setObjToast] = useState({ blnOpen: false, strMessage: "", strSeverity: "success" as "success" | "error" });
  const objActionRowRef = useRef<HTMLDivElement | null>(null);

  const objSchema = useMemo(() => yup.object({
    dtWorkDate: yup.string().required(t("validation_date", "Work date is required.")).test("not-future", t("validation_future_date", "Future dates are not allowed."), (strValue) => !strValue || strValue <= todayIso()),
    strRequestTypeCode: yup.string().required(t("validation_type", "Request type is required.")),
    strProposedStatus: yup.string().required(t("validation_status", "Proposed status is required.")),
    tmProposedFirstIn: yup.string().default(""),
    tmProposedLastOut: yup.string().default(""),
    decProposedWorkedHours: yup.number().nullable().min(0).max(24),
    blnProposedIsPaid: yup.boolean().nullable(),
    strProposedRemark: yup.string().max(500).default("").when("strEmployeeReason", {
      is: (strValue: string) => strValue === strOtherReasonCode,
      then: (objFieldSchema) => objFieldSchema.trim().required(t("validation_remark_required_other", "Additional remarks are required when reason is Other.")),
      otherwise: (objFieldSchema) => objFieldSchema,
    }),
    strEmployeeReason: yup.string().trim().required(t("validation_reason", "Correction reason is required.")).max(1000),
  }), [t]);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors: objErrors } } = useForm<RegularizationFormValues>({
    resolver: yupResolver(objSchema) as Resolver<RegularizationFormValues>,
    defaultValues: initialValues(strInitialDate),
  });
  const strWorkDate = watch("dtWorkDate");
  const strRequestTypeCode = watch("strRequestTypeCode");
  const strProposedStatus = watch("strProposedStatus");
  const strProposedFirstInTime = watch("tmProposedFirstIn");
  const strProposedLastOutTime = watch("tmProposedLastOut");
  const strEmployeeReasonValue = watch("strEmployeeReason");
  const blnRemarkRequired = strEmployeeReasonValue === strOtherReasonCode;
  const blnNeedsTimes = ["MISSING_IN", "MISSING_OUT", "MISSING_BOTH"].includes(strRequestTypeCode) || ["present", "half_day", "on_duty"].includes(strProposedStatus);
  const blnMissingOutOnly = strRequestTypeCode === "MISSING_OUT";
  const blnAutoCalculatedRequest = setAutoCalculatedRequestTypeCodes.has(strRequestTypeCode);
  const strMinimumProposedOutTime = useMemo(() => addOneMinuteToTime(strProposedFirstInTime), [strProposedFirstInTime]);
  const lstAllTypes = useMemo(() => objLookups[strTypeDomain] ?? [], [objLookups]);
  const lstTypes = useMemo(() => lstAllTypes.filter((objOption) => !setHiddenEssRequestTypeCodes.has(objOption.strValueCode)), [lstAllTypes]);
  const lstRequestStatuses = useMemo(() => objLookups[strStatusDomain] ?? [], [objLookups]);
  const lstActions = objLookups[strActionDomain] ?? [];
  const lstAttendanceStatuses = objLookups[strAttendanceStatusDomain] ?? objLookups["ATTENDANCE_DAY_STATUS"] ?? [];
  const objPunchLog = useMemo(() => buildPunchLogRows(objContext?.lstPunches ?? []), [objContext?.lstPunches]);
  const lstFilteredRequests = useMemo(() => {
    const strSearch = strAppliedRequestSearch.trim().toLowerCase();
    return lstRequests.filter((objRequest) => {
      const blnMatchesStatus =
        !strAppliedRequestStatus ||
        objRequest.strRequestStatus === strAppliedRequestStatus;
      const blnMatchesSearch =
        !strSearch ||
        [
          objRequest.strRequestNumber,
          objRequest.dtWorkDate,
          lookupLabel(lstAllTypes, objRequest.strRequestTypeCode, ""),
          lookupLabel(lstRequestStatuses, objRequest.strRequestStatus, ""),
        ].some((strValue) => String(strValue ?? "").toLowerCase().includes(strSearch));
      const blnMatchesDates =
        (!strAppliedFromDate || objRequest.dtWorkDate >= strAppliedFromDate) &&
        (!strAppliedToDate || objRequest.dtWorkDate <= strAppliedToDate);
      return blnMatchesStatus && blnMatchesSearch && blnMatchesDates;
    });
  }, [lstAllTypes, lstRequests, lstRequestStatuses, strAppliedRequestSearch, strAppliedRequestStatus, strAppliedFromDate, strAppliedToDate]);
  const lstRequestGridRows: RequestGridRow[] = lstFilteredRequests.map((objRequest) => ({
    intID: objRequest.intID,
    requestNumberText: objRequest.strRequestNumber ?? objRequest.dtWorkDate,
    actions: (
      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
        {["DRAFT", "SENT_BACK"].includes(objRequest.strRequestStatus) ? <Button data-control-id={`attendance-regularization.request.${objRequest.intID}.edit.button`} size="small" onClick={() => editRequest(objRequest)}>{t("edit", "Edit")}</Button> : null}
        {objRequest.strRequestStatus === "PENDING_APPROVAL" ? <Button data-control-id={`attendance-regularization.request.${objRequest.intID}.withdraw.button`} size="small" color="error" onClick={() => setObjConfirm({ strAction: "withdraw", objRequest })}>{t("withdraw", "Withdraw")}</Button> : null}
      </Stack>
    ),
    requestNumber: (
      <Link
        component="button"
        type="button"
        underline="none"
        className="app-master-first-column-link"
        data-control-id={`attendance-regularization.request.${objRequest.intID}.number.button`}
        onClick={(objEvent) => {
          if (window.getSelection()?.toString()) { objEvent.stopPropagation(); return; }
          void attendanceRegularizationService.getMyDetail(objRequest.intID).then(setObjDetail);
        }}
        sx={dicMasterNameLinkSx}
      >
        {objRequest.strRequestNumber ?? objRequest.dtWorkDate}
      </Link>
    ),
    statusText: lookupLabel(lstRequestStatuses, objRequest.strRequestStatus, objRequest.strRequestStatus),
    workDate: formatDdMmmYyyy(objRequest.dtWorkDate),
    requestType: lookupLabel(lstAllTypes, objRequest.strRequestTypeCode, t("request", "Request")),
    proposedStatus: lookupLabel(lstAttendanceStatuses, objRequest.objProposalSnapshot.strProposedStatus, "—"),
    status: (() => {
      const dicTone = requestStatusTone(objRequest.strRequestStatus);
      return (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: dicTone.strDot, flexShrink: 0 }} />
          <Chip size="small" label={lookupLabel(lstRequestStatuses, objRequest.strRequestStatus, t("status_unavailable", "Status unavailable"))} sx={{ fontWeight: 700, bgcolor: dicTone.strBg, color: dicTone.strText }} />
        </Stack>
      );
    })(),
  }));
  const lstRequestGridColumns: DataGridColumn<RequestGridRow>[] = useMemo(() => [
    { field: "requestNumber", headerName: t("request_number", "Request Number"), sortAccessor: (objRow) => objRow.requestNumberText, width: 190 },
    { field: "workDate", headerName: t("work_date", "Work Date"), width: 130 },
    { field: "requestType", headerName: t("request_type", "Request Type"), width: 220 },
    { field: "proposedStatus", headerName: t("proposed_status", "Proposed Status"), width: 150 },
    { field: "status", headerName: t("status", "Status"), filterable: false, width: 170, sortAccessor: (objRow) => objRow.statusText },
  ], [t]);

  const loadLookups = useCallback(async () => {
    setObjLookups(await attendanceRegularizationService.getEssLookups(intLanguageID || authHelpers.getLanguageID() || undefined));
  }, [intLanguageID]);
  const loadContext = useCallback(async (strDate: string) => {
    if (!strDate) return;
    setObjContext(await attendanceRegularizationService.getMyContext(strDate));
  }, []);
  const loadRequests = useCallback(async () => {
    const objResult = await attendanceRegularizationService.listMyRequests();
    setLstRequests(objResult.lstItems);
  }, []);

  useEffect(() => {
    let blnMounted = true;
    setBlnLoading(true);
    Promise.all([loadLookups(), loadContext(strInitialDate), loadRequests()])
      .catch((objError: unknown) => blnMounted && setStrError(objError instanceof Error ? objError.message : t("load_failed", "Unable to load requests.")))
      .finally(() => blnMounted && setBlnLoading(false));
    return () => { blnMounted = false; };
  }, [loadContext, loadLookups, loadRequests, strInitialDate, t]);

  useEffect(() => {
    const intTimer = window.setTimeout(() => void loadContext(strWorkDate).catch(() => undefined), 250);
    return () => window.clearTimeout(intTimer);
  }, [loadContext, strWorkDate]);

  useEffect(() => {
    if (strRequestTypeCode !== "MISSING_OUT") return;
    const strFirstIn =
      formatInputTime(objContext?.lstPunches.find((objPunch) => objPunch.strDirection.toLowerCase() === "in")?.dtPunchAt) ||
      formatInputTime(getSnapshotFirstIn(objContext?.objAttendanceDay));
    setValue("tmProposedFirstIn", strFirstIn, { shouldDirty: true, shouldValidate: true });
  }, [objContext, setValue, strRequestTypeCode]);

  useEffect(() => {
    if (!blnAutoCalculatedRequest) return;
    const decWorkedHours = calculateWorkedHours(strProposedFirstInTime, strProposedLastOutTime);
    setValue("decProposedWorkedHours", decWorkedHours, { shouldDirty: true, shouldValidate: true });
    setValue("strProposedStatus", deriveProposedStatus(decWorkedHours), { shouldDirty: true, shouldValidate: true });
  }, [blnAutoCalculatedRequest, setValue, strProposedFirstInTime, strProposedLastOutTime]);

  useEffect(() => {
    if (!strMinimumProposedOutTime || !strProposedLastOutTime || strProposedLastOutTime >= strMinimumProposedOutTime) return;
    setValue("tmProposedLastOut", "", { shouldDirty: true, shouldValidate: true });
  }, [setValue, strMinimumProposedOutTime, strProposedLastOutTime]);

  useEffect(() => {
    if (intTab !== 0 || (!strError && (objPreview?.blnValid ?? true))) return;
    // Error and validation banners add height, so restore access to the actions they can push below the viewport.
    const intFrame = window.requestAnimationFrame(() => {
      objActionRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(intFrame);
  }, [intTab, objPreview?.blnValid, strError]);

  async function previewForm(objValues: RegularizationFormValues) {
    const { dtWorkDate, ...objPayload } = objValues;
    const objResult = await attendanceRegularizationService.preview(dtWorkDate, objPayload);
    setObjPreview(objResult);
    return objResult;
  }

  async function refreshEditingAttachments(intRequestID: number) {
    try {
      const objDetail = await attendanceRegularizationService.getMyDetail(intRequestID);
      setLstEditingAttachments(objDetail.lstAttachments ?? []);
    } catch {
      // Non-fatal: the attachment row list simply won't refresh; previously loaded rows stay visible.
    }
  }

  // There is no draft stage on this screen: Submit validates the proposal first and only asks for
  // confirmation when it is valid, so a blocked request never gets persisted.
  async function requestSubmit(objValues: RegularizationFormValues) {
    setBlnSaving(true); setStrError("");
    try {
      const objResult = await previewForm(objValues);
      if (objResult.blnValid) setObjConfirm({ strAction: "submit", objValues });
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("submit_failed", "Unable to submit request."));
    } finally { setBlnSaving(false); }
  }

  async function saveAndSubmit(objValues: RegularizationFormValues) {
    const objSaved = objEditing
      ? await attendanceRegularizationService.updateDraft(objEditing.intID, objEditing.intRowVersion, objValues)
      : await attendanceRegularizationService.createDraft(objValues);
    // Track the saved row before the remaining calls so a failed upload/submit is retried as an
    // update of this request instead of colliding with it as a second request for the same date.
    setObjEditing(objSaved);
    for (const objFile of lstFiles) await attendanceRegularizationService.uploadAttachment(objSaved.intID, objFile);
    setLstFiles([]);
    if (lstFiles.length > 0) void refreshEditingAttachments(objSaved.intID);
    await attendanceRegularizationService.submit(objSaved.intID, objSaved.intRowVersion);
  }

  async function previewAttachment(intAttachmentID: number) {
    if (!objEditing) return;
    setIntAttachmentBusyID(intAttachmentID);
    try {
      await attendanceRegularizationService.previewAttachment(objEditing.intID, intAttachmentID);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("attachment_preview_failed", "Unable to open attachment."));
    } finally {
      setIntAttachmentBusyID(null);
    }
  }

  async function deleteExistingAttachment(intAttachmentID: number) {
    if (!objEditing) return;
    setIntAttachmentBusyID(intAttachmentID);
    try {
      await attendanceRegularizationService.deleteAttachment(objEditing.intID, intAttachmentID);
      setLstEditingAttachments((lstPrevious) => lstPrevious.filter((objAttachment) => objAttachment.intID !== intAttachmentID));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("attachment_delete_failed", "Unable to delete attachment."));
    } finally {
      setIntAttachmentBusyID(null);
    }
  }

  async function replaceExistingAttachment(objAttachment: RequestAttachment, objNewFile: File) {
    if (!objEditing) return;
    setIntAttachmentReplacingID(objAttachment.intID);
    try {
      await attendanceRegularizationService.deleteAttachment(objEditing.intID, objAttachment.intID);
      await attendanceRegularizationService.uploadAttachment(objEditing.intID, objNewFile);
      await refreshEditingAttachments(objEditing.intID);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("attachment_replace_failed", "Unable to replace attachment."));
    } finally {
      setIntAttachmentReplacingID(null);
    }
  }

  function editRequest(objRequest: RegularizationRequest) {
    setObjEditing(objRequest); setIntTab(0); setObjPreview(null);
    reset({
      dtWorkDate: objRequest.dtWorkDate,
      strRequestTypeCode: objRequest.strRequestTypeCode,
      strProposedStatus: objRequest.objProposalSnapshot.strProposedStatus,
      tmProposedFirstIn: objRequest.objProposalSnapshot.tmProposedFirstIn?.slice(0, 5) ?? "",
      tmProposedLastOut: objRequest.objProposalSnapshot.tmProposedLastOut?.slice(0, 5) ?? "",
      decProposedWorkedHours: objRequest.objProposalSnapshot.decProposedWorkedHours ?? null,
      blnProposedIsPaid: objRequest.objProposalSnapshot.blnProposedIsPaid ?? null,
      strProposedRemark: objRequest.objProposalSnapshot.strProposedRemark ?? "",
      strEmployeeReason: objRequest.strEmployeeReason,
    });
    setLstFiles([]);
    setLstEditingAttachments([]);
    void refreshEditingAttachments(objRequest.intID);
  }

  function clearRequestForm() {
    reset(initialValues(objEditing?.dtWorkDate ?? strInitialDate));
    setObjPreview(null);
    setLstFiles([]);
    setStrError("");
  }

  async function runConfirmedAction() {
    if (!objConfirm) return;
    const blnWasSubmit = objConfirm.strAction === "submit";
    setBlnSaving(true);
    try {
      if (objConfirm.strAction === "submit") await saveAndSubmit(objConfirm.objValues);
      else await attendanceRegularizationService.withdraw(objConfirm.objRequest.intID, objConfirm.objRequest.intRowVersion, t("withdrawal_reason_default", "Withdrawn by employee."));
      setObjConfirm(null); await loadRequests();
      if (blnWasSubmit) {
        // Land on My Requests so the submitted request is visibly there, not left behind on a stale New Request form.
        reset(initialValues(strInitialDate));
        setObjPreview(null);
        setLstFiles([]);
        setObjEditing(null);
        setLstEditingAttachments([]);
        setIntTab(1);
      }
      setObjToast({ blnOpen: true, strMessage: blnWasSubmit ? t("submitted_success", "Request submitted successfully.") : t("action_completed", "Action completed."), strSeverity: "success" });
    } catch (objError) {
      setObjConfirm(null);
      if (blnWasSubmit) void loadRequests().catch(() => undefined);
      setStrError(objError instanceof Error ? objError.message : t("action_failed", "Unable to complete action."));
    }
    finally { setBlnSaving(false); }
  }

  const strConfirmMessage = objConfirm
    ? objConfirm.strAction === "submit"
      ? t("confirm_submit_message", `Submit attendance correction for ${formatDdMmmYyyy(objConfirm.objValues.dtWorkDate)}? It will be sent to your current approver for review.`)
      : t("confirm_withdraw_message", `Withdraw the attendance correction request for ${formatDdMmmYyyy(objConfirm.objRequest.dtWorkDate)}? This will remove it from the approval queue.`)
    : "";

  if (blnRightsLoading || blnLoading) {
    return (
      <Box className={styles.page} sx={{ position: "relative" }}>
        <MasterBreadcrumbs strSection={t("breadcrumb_attendance", "Attendance")} strTitle={t("breadcrumb_regularization", "Attendance Regularization")} />
        <MasterGridSkeleton strControlId="attendance-regularization.skeleton" intColumns={5} />
      </Box>
    );
  }
  if (!canViewAny()) return <Alert severity="warning">{t("access_denied", "Attendance Regularization access is not available.")}</Alert>;

  return (
    <Box className={styles.page} sx={{ overflowX: "hidden", overflowY: "scroll", pb: 2, pr: 0.5, scrollbarGutter: "stable", scrollbarWidth: "thin", "&::-webkit-scrollbar": { width: 9 }, "&::-webkit-scrollbar-track": { backgroundColor: "#eef4f8", borderRadius: 8 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#9aabb9", borderRadius: 8, border: "2px solid #eef4f8" }, "& .MuiOutlinedInput-root": { borderRadius: "9px" }, "& .MuiAlert-root": { borderRadius: "9px" } }}>
      <BlockingLoader blnOpen={blnSaving} strLabel={t("working", "Please wait...")} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
        <MasterBreadcrumbs strSection={t("breadcrumb_attendance", "Attendance")} strTitle={t("breadcrumb_regularization", "Attendance Regularization")} />
        {intTab === 0 ? (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="caption" color="text.secondary">{t("required_fields_note", "Required fields are marked")} <Box component="span" sx={{ color: "error.main" }}>*</Box></Typography>
            <Button data-control-id="attendance-regularization.clear.button" variant="outlined" disabled={blnSaving} onClick={clearRequestForm} sx={{ minWidth: 96, borderRadius: "8px" }}>{t("cancel", "Cancel")}</Button>
            <Button data-control-id="attendance-regularization.submit.button" type="submit" form="attendance-regularization-form" variant="contained" disabled={blnSaving} sx={{ minWidth: 96, borderRadius: "8px" }}>{t("save", "Save")}</Button>
          </Stack>
        ) : null}
      </Stack>
      <Paper className={styles.controlsCard} sx={{ pt: "0 !important", pb: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Tabs value={intTab} onChange={(_, intValue) => setIntTab(intValue)}>
          <Tab data-control-id="attendance-regularization.new-request.tab" label={t("new_request_tab", "New Request")} />
          <Tab data-control-id="attendance-regularization.my-requests.tab" label={t("my_requests_tab", "My Requests")} />
        </Tabs>
      </Paper>
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {intTab === 0 ? (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper className={styles.controlsCard} sx={{ borderRadius: "10px !important", boxShadow: "none", border: "1px solid #e8eef5" }}>
              <Stack spacing={1.5}>
                <Typography fontWeight={850} sx={{ color: "#0f2f55" }}>{t("original_attendance", "Original Attendance")}</Typography>
                <Box sx={{ display: "flex", alignItems: "stretch", flexWrap: "wrap", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1, minWidth: 190, borderRadius: "8px", bgcolor: objContext?.objAttendanceDay?.strStatus === "present" ? "#ecfdf3" : "#f1f5f9" }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: objContext?.objAttendanceDay?.strStatus === "present" ? "#22c55e" : "#94a3b8", flexShrink: 0 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>{t("status", "Status")}</Typography>
                      <Typography fontWeight={800}>{lookupLabel(lstAttendanceStatuses, objContext?.objAttendanceDay?.strStatus, t("not_recorded", "No attendance record"))}</Typography>
                    </Box>
                  </Box>
                  {([
                    [t("worked_hours", "Worked Hours"), objContext?.objAttendanceDay ? formatDuration(objContext.objAttendanceDay.decWorkedHours) : "—"],
                    [t("first_in", "First IN"), formatInputTime(getSnapshotFirstIn(objContext?.objAttendanceDay)) || "-"],
                    [t("last_out", "Last OUT"), formatInputTime(getSnapshotLastOut(objContext?.objAttendanceDay)) || "-"],
                  ] as [string, string][]).map(([strLabel, strValue]) => (
                    <Box key={strLabel} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ width: "1px", alignSelf: "stretch", bgcolor: "#dbe3ef" }} />
                      <Box sx={{ minWidth: 90 }}>
                        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>{strLabel}</Typography>
                        <Typography fontWeight={800}>{strValue}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Button data-control-id="attendance-regularization.punch-log.button" variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => setBlnPunchLogOpen(true)} sx={{ minHeight: 38, px: 2.25, borderRadius: "8px", fontWeight: 800, whiteSpace: "nowrap" }}>
                      {t("view_punch_log", "View Original Punches")}
                    </Button>
                  </Box>
                </Box>
                {objContext?.objHoliday ? <Alert severity="info">{t("holiday_context", "This date is a holiday.")}</Alert> : null}
                {objContext?.objApprovedLeave ? <Alert severity="info">{t("leave_context", "Approved leave exists for this date.")}</Alert> : null}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper component="form" id="attendance-regularization-form" onSubmit={handleSubmit(requestSubmit)} className={styles.controlsCard} sx={{ borderRadius: "10px !important", boxShadow: "none", border: "1px solid #e8eef5" }}>
              <Typography fontWeight={850} sx={{ color: "#0f2f55", mb: 1.5 }}>{t("regularization_request", "Regularization Request")}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}><Controller name="dtWorkDate" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.work-date.input" fullWidth size="small" type="date" label={`${t("work_date", "Work Date")} *`} InputLabelProps={{ shrink: true }} inputProps={{ max: todayIso() }} error={Boolean(objErrors.dtWorkDate)} helperText={objErrors.dtWorkDate?.message} disabled={Boolean(objEditing)} />} /></Grid>
                <Grid item xs={12} sm={6} md={4}><Controller name="strRequestTypeCode" control={control} render={({ field }) => <CommonSearchableSelect controlId="attendance-regularization.request-type.select" fullWidth label={`${t("request_type", "Request Type")} *`} value={field.value} onChange={field.onChange} options={lstTypes.map((objOption) => ({ intID: objOption.strValueCode, strLabel: objOption.strDisplayName }))} error={Boolean(objErrors.strRequestTypeCode)} helperText={objErrors.strRequestTypeCode?.message} />} /></Grid>
                <Grid item xs={12} sm={6} md={4}><Controller name="strProposedStatus" control={control} render={({ field }) => <CommonSearchableSelect controlId="attendance-regularization.proposed-status.select" fullWidth label={`${t("proposed_status", "Proposed Status")} *`} value={field.value} onChange={field.onChange} disabled={blnAutoCalculatedRequest} options={lstAttendanceStatuses.map((objOption) => ({ intID: objOption.strValueCode, strLabel: objOption.strDisplayName }))} error={Boolean(objErrors.strProposedStatus)} helperText={objErrors.strProposedStatus?.message ?? (blnAutoCalculatedRequest ? t("status_auto_from_time", "Calculated from proposed timings") : undefined)} />} /></Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#f3f6fb", border: "1px solid #e2e8f0" }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 1.25 }}>{t("proposed_attendance", "Proposed Attendance")}</Typography>
                    <Grid container spacing={2}>
                      {blnNeedsTimes ? <><Grid item xs={12} sm={6} md={4}><Controller name="tmProposedFirstIn" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.first-in.input" fullWidth size="small" type="time" label={`${t("proposed_first_in", "First IN")} *`} InputLabelProps={{ shrink: true }} disabled={blnMissingOutOnly} helperText={blnMissingOutOnly ? t("first_in_from_logs", "Fetched from punch log") : undefined} />} /></Grid><Grid item xs={12} sm={6} md={4}><Controller name="tmProposedLastOut" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.last-out.input" fullWidth size="small" type="time" label={`${t("proposed_last_out", "Last OUT")} *`} InputLabelProps={{ shrink: true }} inputProps={{ min: strMinimumProposedOutTime }} helperText={strMinimumProposedOutTime ? t("out_after_in_hint", `Must be after ${strProposedFirstInTime}`) : undefined} />} /></Grid></> : null}
                      <Grid item xs={12} sm={6} md={4}><Controller name="decProposedWorkedHours" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} onChange={(objEvent) => field.onChange(objEvent.target.value === "" ? null : Number(objEvent.target.value))} data-control-id="attendance-regularization.worked-hours.input" fullWidth size="small" type="number" disabled={blnAutoCalculatedRequest} inputProps={{ step: 0.25, min: 0, max: 24 }} label={t("proposed_worked_hours", "Proposed Worked Hours")} InputLabelProps={{ shrink: true }} error={Boolean(objErrors.decProposedWorkedHours)} helperText={objErrors.decProposedWorkedHours?.message} />} /></Grid>
                    </Grid>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Controller
                    name="strEmployeeReason"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        data-control-id="attendance-regularization.reason.input"
                        select
                        fullWidth
                        size="small"
                        label={`${t("reason", "Correction Reason")} *`}
                        SelectProps={{ displayEmpty: true, renderValue: (objValue) => (objValue ? (lstReasonOptions.find((objOption) => objOption.strValueCode === objValue) ? t(lstReasonOptions.find((objOption) => objOption.strValueCode === objValue)!.strLabelKey, lstReasonOptions.find((objOption) => objOption.strValueCode === objValue)!.strFallback) : String(objValue)) : <Typography component="span" sx={{ color: "text.disabled" }}>{t("select_reason", "Select reason")}</Typography>) }}
                        InputLabelProps={{ shrink: true }}
                        error={Boolean(objErrors.strEmployeeReason)}
                        helperText={objErrors.strEmployeeReason?.message}
                      >
                        {lstReasonOptions.map((objOption) => (
                          <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{t(objOption.strLabelKey, objOption.strFallback)}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={8}>
                  <Controller
                    name="strProposedRemark"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        data-control-id="attendance-regularization.remark.input"
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        label={blnRemarkRequired ? `${t("remark", "Additional Remarks")} *` : t("remark", "Additional Remarks")}
                        placeholder={t("remark_placeholder", "Enter remarks (optional)")}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ maxLength: 500 }}
                        error={Boolean(objErrors.strProposedRemark)}
                        helperText={(
                          <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                            <span>{objErrors.strProposedRemark?.message ?? ""}</span>
                            <span>{(field.value ?? "").length} / 500</span>
                          </Box>
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{t("attachments", "Attachments")}</Typography>
                      <Button data-control-id="attendance-regularization.attachments.button" component="label" size="small" variant="outlined" startIcon={<AttachFileRoundedIcon />}>
                        {t("add_attachments", "Add Attachments")}
                        <input hidden multiple type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(objEvent) => { const lstSelected = Array.from(objEvent.target.files ?? []); objEvent.target.value = ""; setLstFiles((lstPrevious) => [...lstPrevious, ...lstSelected]); }} />
                      </Button>
                    </Stack>
                    {lstEditingAttachments.length === 0 && lstFiles.length === 0 ? (
                      <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("attachment_hint", `You can upload images or documents (PDF, JPG, PNG). Max file size ${MAX_UPLOAD_SIZE_LABEL} each.`)}</Typography>
                    ) : (
                      <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                        {lstEditingAttachments.map((objAttachment) => (
                          <Stack key={objAttachment.intID} direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={0.8} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.75, minWidth: 0 }}>
                            <Typography title={objAttachment.strFileName} sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{objAttachment.strFileName}</Typography>
                            <FileRowActions
                              strFileName={objAttachment.strFileName}
                              controlIdPrefix={`attendance-regularization.attachment.${objAttachment.intID}`}
                              busy={intAttachmentBusyID === objAttachment.intID}
                              onPreview={() => void previewAttachment(objAttachment.intID)}
                              onReplace={(objNewFile) => void replaceExistingAttachment(objAttachment, objNewFile)}
                              onDelete={() => void deleteExistingAttachment(objAttachment.intID)}
                              isReplacing={intAttachmentReplacingID === objAttachment.intID}
                            />
                          </Stack>
                        ))}
                        {lstFiles.map((objFile, intIndex) => (
                          <Stack key={`${objFile.name}-${intIndex}`} direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={0.8} sx={{ border: "1px dashed #cbd5e1", borderRadius: "8px", px: 1, py: 0.75, minWidth: 0 }}>
                            <Typography title={objFile.name} sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                              {objFile.name} <Typography component="span" sx={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>({t("pending_upload", "pending upload")})</Typography>
                            </Typography>
                            <FileRowActions
                              strFileName={objFile.name}
                              controlIdPrefix={`attendance-regularization.pending-attachment.${intIndex}`}
                              onPreview={() => {
                                const strUrl = URL.createObjectURL(objFile);
                                window.open(strUrl, "_blank", "noopener,noreferrer");
                                window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
                              }}
                              onReplace={(objNewFile) => setLstFiles((lstPrevious) => lstPrevious.map((objCurrent, intCurrentIndex) => (intCurrentIndex === intIndex ? objNewFile : objCurrent)))}
                              onDelete={() => setLstFiles((lstPrevious) => lstPrevious.filter((_objCurrent, intCurrentIndex) => intCurrentIndex !== intIndex))}
                            />
                          </Stack>
                        ))}
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>
              <Box ref={objActionRowRef} sx={{ scrollMarginBottom: 16 }} />
              {objPreview && !objPreview.blnValid ? <Alert severity="warning" sx={{ mt: 2 }}>{objPreview.lstErrors.map((objItem) => t(`validation_${objItem.strCode.toLowerCase()}`, objItem.strCode)).join(" · ")}{objPreview.objPayrollConflict ? ` · ${t("payroll_conflict", "Payroll is locked or processed.")}` : ""}</Alert> : null}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Stack spacing={1.25}>
          <Paper className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
            <Grid container spacing={1} alignItems="center" onKeyDown={onSearchEnter(() => { setStrAppliedRequestSearch(strRequestSearch); setStrAppliedRequestStatus(strRequestStatusFilter); setStrAppliedFromDate(strRequestFromDate); setStrAppliedToDate(strRequestToDate); })}>
              <Grid item xs={12} md={3}>
                <TextField className="app-mui-text-field" size="small" data-control-id="attendance-regularization.requests.search.input" fullWidth label={t("search_requests_label", "Request")} value={strRequestSearch} onChange={(objEvent) => setStrRequestSearch(objEvent.target.value)} placeholder={t("search_requests", "Search request number, date or type")} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField className="app-mui-text-field" size="small" data-control-id="attendance-regularization.requests.status.select" select fullWidth label={t("status", "Status")} value={strRequestStatusFilter} onChange={(objEvent) => setStrRequestStatusFilter(objEvent.target.value)} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}><MenuItem value="">{t("all", "All")}</MenuItem>{lstRequestStatuses.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField className="app-mui-text-field" size="small" data-control-id="attendance-regularization.requests.from-date.input" type="date" fullWidth label={t("from_date", "From Date")} value={strRequestFromDate} onChange={(objEvent) => setStrRequestFromDate(objEvent.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField className="app-mui-text-field" size="small" data-control-id="attendance-regularization.requests.to-date.input" type="date" fullWidth label={t("to_date", "To Date")} value={strRequestToDate} onChange={(objEvent) => setStrRequestToDate(objEvent.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: strRequestFromDate || undefined }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1} className={styles.filterActions}>
                  <Button fullWidth data-control-id="attendance-regularization.requests.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setStrAppliedRequestSearch(strRequestSearch); setStrAppliedRequestStatus(strRequestStatusFilter); setStrAppliedFromDate(strRequestFromDate); setStrAppliedToDate(strRequestToDate); }}>{t("search", "Search")}</Button>
                  <Button fullWidth data-control-id="attendance-regularization.requests.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setStrRequestSearch(""); setStrRequestStatusFilter(""); setStrAppliedRequestSearch(""); setStrAppliedRequestStatus(""); setStrRequestFromDate(""); setStrRequestToDate(""); setStrAppliedFromDate(""); setStrAppliedToDate(""); }}>{t("clear", "Clear")}</Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          <CommonDataGrid
            columns={lstRequestGridColumns}
            rows={lstRequestGridRows}
            rowIdField="intID"
            showExportOptions
            exportFileName="attendance_regularization_my_requests"
            showPaginationSummary
            defaultPageSize={20}
            pageSizeOptions={[20, 50, 100]}
            minTableWidth={800}
            emptyMessage={t("no_requests", "No regularization requests found.")}
            testIdPrefix="attendance-regularization.my-requests.list"
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            onRowClick={(objRow) => void attendanceRegularizationService.getMyDetail(Number(objRow.intID)).then(setObjDetail)}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Stack>
      )}

      <Dialog
        data-control-id="attendance-regularization.detail.dialog"
        open={Boolean(objDetail)}
        onClose={() => setObjDetail(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: "14px", overflow: "hidden", "& .MuiDialogContent-root": { p: 2.5, bgcolor: "#f8fafc" }, "& .MuiDivider-root": { my: 1.5 } } }}
      >
        <DialogTitle sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e2e8f0", bgcolor: "#fff" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography component="span" sx={{ fontWeight: 900, fontSize: "1.25rem", color: "#0f2f55" }}>{t("request_detail", "Request Detail")}</Typography>
            <IconButton data-control-id="attendance-regularization.detail.close.icon" aria-label={t("close", "Close")} onClick={() => setObjDetail(null)} size="small"><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <DetailCard strTitle={t("original_attendance", "Original Attendance")} lstRows={[
                [t("status", "Status"), lookupLabel(lstAttendanceStatuses, objDetail?.objOriginalSnapshot.strStatus, t("not_recorded", "No attendance record"))],
                [t("first_in", "First IN"), formatInputTime(objDetail?.objOriginalSnapshot.tmFirstIn) || "—"],
                [t("last_out", "Last OUT"), formatInputTime(objDetail?.objOriginalSnapshot.tmLastOut) || "—"],
                [t("worked_hours", "Worked Hours"), objDetail?.objOriginalSnapshot.decWorkedHours != null ? formatDuration(objDetail.objOriginalSnapshot.decWorkedHours) : "—"],
              ]} />
            </Grid>
            <Grid item xs={12} md={6}>
              <DetailCard strTitle={t("proposed_attendance", "Proposed Attendance")} lstRows={[
                [t("status", "Status"), lookupLabel(lstAttendanceStatuses, objDetail?.objProposalSnapshot.strProposedStatus, t("unavailable", "Unavailable"))],
                [t("first_in", "First IN"), formatInputTime(objDetail?.objProposalSnapshot.tmProposedFirstIn) || "—"],
                [t("last_out", "Last OUT"), formatInputTime(objDetail?.objProposalSnapshot.tmProposedLastOut) || "—"],
                [t("worked_hours", "Worked Hours"), objDetail?.objProposalSnapshot.decProposedWorkedHours != null ? formatDuration(objDetail.objProposalSnapshot.decProposedWorkedHours) : "—"],
              ]} />
            </Grid>
            <Grid item xs={12} md={7}>
              <DetailCard strTitle={t("request_information", "Request Information")} lstRows={[
                [t("request_number", "Request Number"), objDetail?.strRequestNumber ?? "—"],
                [t("work_date", "Work Date"), objDetail ? formatDdMmmYyyy(objDetail.dtWorkDate) : "—"],
                [t("request_type", "Request Type"), lookupLabel(lstTypes, objDetail?.strRequestTypeCode, "—")],
                [t("proposed_status", "Proposed Status"), lookupLabel(lstAttendanceStatuses, objDetail?.objProposalSnapshot.strProposedStatus, "—")],
                [t("reason", "Correction Reason"), (() => { const objReason = lstReasonOptions.find((objOption) => objOption.strValueCode === objDetail?.strEmployeeReason); return objReason ? t(objReason.strLabelKey, objReason.strFallback) : objDetail?.strEmployeeReason ?? "—"; })()],
                [t("remark", "Additional Remarks"), objDetail?.objProposalSnapshot.strProposedRemark || "—"],
              ]}>
                <Divider />
                <Typography sx={{ fontWeight: 800, color: "#0f2f55", mb: 0.75 }}>{t("attachments", "Attachments")}</Typography>
                {objDetail?.lstAttachments.length ? (
                  <Box sx={{ display: "grid", gap: 0.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                    {objDetail.lstAttachments.map((objAttachment) => (
                      <Stack key={objAttachment.intID} direction="row" alignItems="center" justifyContent="space-between" spacing={0.8} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.75, minWidth: 0 }}>
                        <Typography sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{objAttachment.strFileName}</Typography>
                        <FileRowActions strFileName={objAttachment.strFileName} controlIdPrefix={`attendance-regularization.attachment.${objAttachment.intID}`} busy={intDetailAttachmentBusyID === objAttachment.intID} onPreview={() => { setIntDetailAttachmentBusyID(objAttachment.intID); void attendanceRegularizationService.previewAttachment(objDetail.intID, objAttachment.intID).finally(() => setIntDetailAttachmentBusyID(null)); }} onDelete={["DRAFT", "SENT_BACK"].includes(objDetail.strRequestStatus) ? () => { setIntDetailAttachmentBusyID(objAttachment.intID); void attendanceRegularizationService.deleteAttachment(objDetail.intID, objAttachment.intID).then(() => attendanceRegularizationService.getMyDetail(objDetail.intID)).then(setObjDetail).finally(() => setIntDetailAttachmentBusyID(null)); } : undefined} />
                      </Stack>
                    ))}
                  </Box>
                ) : <Typography color="text.secondary">{t("no_attachments", "No attachments.")}</Typography>}
              </DetailCard>
            </Grid>
            <Grid item xs={12} md={5}>
              <DetailCard strTitle={t("request_timeline", "Request Timeline")}>
                {objDetail?.lstActions.map((objAction, intIndex, lstAll) => (
                  <Box key={objAction.intID} sx={{ position: "relative", pl: 3, pb: intIndex === lstAll.length - 1 ? 0 : 2, "&::before": { content: '""', position: "absolute", left: 0, top: 5, width: 10, height: 10, borderRadius: "50%", bgcolor: intIndex === 0 ? "#2563eb" : "#22c55e" }, ...(intIndex === lstAll.length - 1 ? {} : { "&::after": { content: '""', position: "absolute", left: 4, top: 18, bottom: 0, width: 2, bgcolor: intIndex === 0 ? "#93b4f5" : "#86d9a3" } }) }}>
                    <Typography fontWeight={800} sx={{ color: "#0f2f55" }}>{actionLabel(lstActions, objAction.strActionCode, t)}</Typography>
                    <Typography variant="body2" color="text.secondary" display="block">{formatActionDateTime(objAction.dtActionOn)}</Typography>
                    {objAction.strActionByName ? <Typography variant="body2" color="text.secondary" display="block">{t("by", "By")} {objAction.strActionByName}{objAction.strActionByCode ? ` (${objAction.strActionByCode})` : ""}</Typography> : null}
                    {objAction.strRemarks ? <Typography variant="body2" color="text.secondary" display="block">{objAction.strRemarks}</Typography> : null}
                  </Box>
                ))}
              </DetailCard>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          <Button data-control-id="attendance-regularization.detail.close.button" variant="outlined" onClick={() => setObjDetail(null)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>
      <Dialog data-control-id="attendance-regularization.punch-log.dialog" open={blnPunchLogOpen} onClose={() => setBlnPunchLogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("punch_log", "Original Punches")} - {formatDisplayDate(strWorkDate)}</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "55vh", overflowY: "auto", scrollbarWidth: "thin", "&::-webkit-scrollbar": { width: 8 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#9aabb9", borderRadius: 8 } }}>
          {objPunchLog.lstRows.length ? (
            <Stack spacing={0.75}>
              {objPunchLog.lstRows.map((objPunch) => (
                <Box key={objPunch.intID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "128px 1fr 92px 88px" }, alignItems: "center", gap: 1, px: 1.25, py: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "6px", bgcolor: "background.paper" }}>
                  <Chip
                    size="small"
                    label={objPunch.strDirection === "in" ? t("punch_in", "Punch In") : t("punch_out", "Punch Out")}
                    color={objPunch.strDirection === "in" ? "success" : "warning"}
                    sx={{ justifySelf: "start", fontWeight: 800 }}
                  />
                  <Typography fontWeight={800}>{formatTime(objPunch.dtPunchAt)}</Typography>
                  <Typography color="text.secondary" sx={{ textAlign: { xs: "left", sm: "right" } }}>{t(`source_${objPunch.strSource}`, punchSourceLabel(objPunch.strSource))}</Typography>
                  <Typography fontWeight={850} color={objPunch.intPeriodMinutes !== null ? "primary.main" : "text.disabled"} sx={{ textAlign: "right" }}>
                    {objPunch.intPeriodMinutes !== null ? formatMinutesDuration(objPunch.intPeriodMinutes) : "-"}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ pt: 0.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.25, pt: 0.5 }}>
                <Typography fontWeight={900}>{t("total_time", "Total Time")}</Typography>
                <Typography fontWeight={900} color="primary.main">{formatMinutesDuration(objPunchLog.intTotalMinutes)}</Typography>
              </Stack>
            </Stack>
          ) : <Typography color="text.secondary">{t("no_punches", "No punch log is available for this date.")}</Typography>}
        </DialogContent>
        <DialogActions><Button data-control-id="attendance-regularization.punch-log.close.button" onClick={() => setBlnPunchLogOpen(false)}>{t("close", "Close")}</Button></DialogActions>
      </Dialog>
      <Dialog data-control-id="attendance-regularization.confirm.dialog" open={Boolean(objConfirm)} onClose={() => setObjConfirm(null)}>
        <DialogTitle>{objConfirm?.strAction === "submit" ? t("confirm_submit_title", "Submit Request") : t("confirm_withdraw_title", "Withdraw Request")}</DialogTitle>
        <DialogContent><Typography>{strConfirmMessage}</Typography></DialogContent>
        <DialogActions><Button data-control-id="attendance-regularization.confirm.cancel.button" onClick={() => setObjConfirm(null)}>{t("cancel", "Cancel")}</Button><Button data-control-id="attendance-regularization.confirm.continue.button" variant="contained" disabled={blnSaving} onClick={() => void runConfirmedAction()}>{t("confirm", "Confirm")}</Button></DialogActions>
      </Dialog>
      <Snackbar data-control-id="attendance-regularization.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objValue) => ({ ...objValue, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
