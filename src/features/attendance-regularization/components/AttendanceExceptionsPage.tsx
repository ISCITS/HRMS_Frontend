"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import LookupChip, {
  lookupLabel,
} from "@/features/attendance-regularization/components/LookupChip";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/components/master/MasterScreen.module.css";
import { attendanceRegularizationService } from "@/features/attendance-regularization/services/attendanceRegularizationService";
import type {
  BulkActionResult,
  DateContext,
  ExceptionFilters,
  ExceptionList,
  ExceptionRecord,
  RegularizationFormValues,
  RegularizationLookups,
} from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";

const intExceptionGridFetchSize = 100;

function monthStart() {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayIso() {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}

export default function AttendanceExceptionsPage() {
  const objRouter = useRouter();
  const { t, intLanguageID } = useModuleLabels("attendance_exceptions");
  const {
    blnLoading: blnRightsLoading,
    canViewAny,
    canDoAny,
  } = useModuleActionAccess(["ATTENDANCE_EXCEPTIONS"]);
  const [objLookups, setObjLookups] = useState<RegularizationLookups>({});
  const [objList, setObjList] = useState<ExceptionList | null>(null);
  const [objFilters, setObjFilters] = useState<ExceptionFilters>({
    strFromDate: monthStart(),
    strToDate: todayIso(),
  });
  const [setSelected, setSetSelected] = useState<Set<number>>(new Set());
  const [objSelected, setObjSelected] = useState<ExceptionRecord | null>(null);
  const [objDetail, setObjDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [objDialog, setObjDialog] = useState<{
    strAction: "ignore" | "resolve" | "bulk-ignore" | "create-request";
    objException?: ExceptionRecord;
  } | null>(null);
  const [strReason, setStrReason] = useState("");
  const [strResolutionCode, setStrResolutionCode] = useState("");
  const [objRequestDraft, setObjRequestDraft] =
    useState<RegularizationFormValues>({
      dtWorkDate: "",
      strRequestTypeCode: "",
      strProposedStatus: "",
      tmProposedFirstIn: "",
      tmProposedLastOut: "",
      decProposedWorkedHours: null,
      blnProposedIsPaid: null,
      strProposedRemark: "",
      strEmployeeReason: "",
    });
  const [objBulkResult, setObjBulkResult] = useState<BulkActionResult | null>(
    null,
  );
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnWorking, setBlnWorking] = useState(false);
  const [strError, setStrError] = useState("");
  const [objSnackbar, setObjSnackbar] = useState<{
    strSeverity: "success" | "error";
    strMessage: string;
  } | null>(null);

  const loadQueue = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const [objLookupResult, objQueueResult] = await Promise.all([
        attendanceRegularizationService.getHrLookups(
          intLanguageID || authHelpers.getLanguageID() || undefined,
        ),
        attendanceRegularizationService.listExceptions(objFilters, 1, intExceptionGridFetchSize),
      ]);
      setObjLookups(objLookupResult);
      setObjList(objQueueResult);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : t("load_failed", "Unable to load attendance exceptions."),
      );
    } finally {
      setBlnLoading(false);
    }
  }, [intLanguageID, objFilters, t]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);
  const lstTypes = objLookups["ATTENDANCE_EXCEPTION_TYPE"] ?? [];
  const lstStatuses = objLookups["ATTENDANCE_EXCEPTION_STATUS"] ?? [];
  const lstSeverities = objLookups["ATTENDANCE_EXCEPTION_SEVERITY"] ?? [];
  const lstActions = objLookups["ATTENDANCE_REGULARIZATION_ACTION"] ?? [];
  const lstRequestTypes =
    objLookups["ATTENDANCE_REGULARIZATION_REQUEST_TYPE"] ?? [];
  const lstAttendanceStatuses = objLookups["ATTENDANCE_STATUS"] ?? [];
  const objDrilldownContext = objDetail?.objContext as DateContext | undefined;
  const blnCanGenerate = canDoAny("ATT_EXCEPTION_GENERATE");
  const blnCanExport = canDoAny("ATT_EXCEPTION_EXPORT");
  const blnCanReview = canDoAny("ATT_EXCEPTION_REVIEW");
  const blnCanResolve = canDoAny("ATT_EXCEPTION_RESOLVE");
  const blnCanIgnore = canDoAny("ATT_EXCEPTION_IGNORE");
  const blnCanBulkIgnore = canDoAny("ATT_EXCEPTION_BULK_IGNORE");
  const blnCanCreateRequest = canDoAny("ATT_EXCEPTION_CREATE_REQUEST");

  async function runDialogAction() {
    if (!objDialog) return;
    setBlnWorking(true);
    setObjBulkResult(null);
    try {
      if (
        objDialog.strAction === "ignore" &&
        objDialog.objException &&
        strReason.trim()
      ) {
        await attendanceRegularizationService.exceptionAction(
          objDialog.objException.intID,
          "ignore",
          { strIgnoreReason: strReason.trim() },
        );
      } else if (
        objDialog.strAction === "resolve" &&
        objDialog.objException &&
        strReason.trim() &&
        strResolutionCode.trim()
      ) {
        await attendanceRegularizationService.exceptionAction(
          objDialog.objException.intID,
          "resolve",
          {
            strResolutionCode: strResolutionCode.trim(),
            strResolutionRemarks: strReason.trim(),
          },
        );
      } else if (objDialog.strAction === "bulk-ignore" && strReason.trim()) {
        const objResult = await attendanceRegularizationService.bulkIgnore(
          Array.from(setSelected),
          strReason.trim(),
        );
        setObjBulkResult(objResult);
        setSetSelected(
          new Set(
            objResult.lstResults
              .filter((objItem) => !objItem.blnSuccess)
              .map((objItem) => objItem.intExceptionID),
          ),
        );
      } else if (
        objDialog.strAction === "create-request" &&
        objDialog.objException &&
        objRequestDraft.strRequestTypeCode &&
        objRequestDraft.strProposedStatus &&
        objRequestDraft.strEmployeeReason.trim()
      ) {
        const objRequest =
          await attendanceRegularizationService.createFromException(
            objDialog.objException.intID,
            {
              ...objRequestDraft,
              strEmployeeReason: objRequestDraft.strEmployeeReason.trim(),
            },
          );
        setObjDialog(null);
        const intRequestID =
          "intID" in objRequest ? objRequest.intID : objRequest.intRequestID;
        objRouter.push(`/attendance/regularization-requests?request=${intRequestID}`);
        return;
      } else return;
      setObjDialog(null);
      setStrReason("");
      setStrResolutionCode("");
      setObjDetail(null);
      setObjSelected(null);
      await loadQueue();
      setObjSnackbar({
        strSeverity: "success",
        strMessage: t("action_success", "Action completed successfully."),
      });
    } catch (objError) {
      setObjSnackbar({
        strSeverity: "error",
        strMessage:
          objError instanceof Error
            ? objError.message
            : t("action_failed", "Unable to complete exception action."),
      });
    } finally {
      setBlnWorking(false);
    }
  }

  async function openDetail(objException: ExceptionRecord) {
    setObjSelected(objException);
    setBlnWorking(true);
    try {
      setObjDetail(
        await attendanceRegularizationService.getException(objException.intID),
      );
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : t("detail_failed", "Unable to load exception context."),
      );
    } finally {
      setBlnWorking(false);
    }
  }

  function openCreateRequest(objException: ExceptionRecord) {
    setObjRequestDraft({
      dtWorkDate: objException.dtWorkDate,
      strRequestTypeCode: lstRequestTypes[0]?.strValueCode ?? "",
      strProposedStatus: lstAttendanceStatuses[0]?.strValueCode ?? "",
      tmProposedFirstIn: "",
      tmProposedLastOut: "",
      decProposedWorkedHours: null,
      blnProposedIsPaid: null,
      strProposedRemark: "",
      strEmployeeReason: "",
    });
    setObjDialog({ strAction: "create-request", objException });
  }

  function clearFilters() {
    setObjFilters({ strFromDate: monthStart(), strToDate: todayIso() });
    setSetSelected(new Set());
  }

  const blnAllPageSelected =
    Boolean(objList?.lstItems.length) &&
    (objList?.lstItems.every((objItem) => setSelected.has(objItem.intID)) ?? false);

  const lstTableRows = useMemo(
    () =>
      (objList?.lstItems ?? []).map((objItem) => ({
        id: objItem.intID,
        rowSelect: (
          <Checkbox
            data-control-id={`attendance-exceptions.${objItem.intID}.select.checkbox`}
            checked={setSelected.has(objItem.intID)}
            onChange={(objEvent) =>
              setSetSelected((setValue) => {
                const setNext = new Set(setValue);
                if (objEvent.target.checked) setNext.add(objItem.intID);
                else setNext.delete(objItem.intID);
                return setNext;
              })
            }
            inputProps={
              {
                "data-control-id": `attendance-exceptions.${objItem.intID}.select.checkbox`,
              } as InputHTMLAttributes<HTMLInputElement>
            }
          />
        ),
        action: (
          <CommonRowActions
            testIdPrefix={`attendance-exceptions.${objItem.intID}`}
            rowKey={objItem.intID}
            blnCanView
            onView={() => void openDetail(objItem)}
          />
        ),
        employee: objItem.strEmployeeName ?? objItem.strEmployeeCode,
        date: objItem.dtWorkDate,
        type: lookupLabel(lstTypes, objItem.strExceptionTypeCode, t("unavailable", "Unavailable")),
        severity: (
          <LookupChip
            lstOptions={lstSeverities}
            strCode={objItem.strSeverityCode}
            strFallback={t("unavailable", "Unavailable")}
            blnHideIcon
          />
        ),
        exceptionStatus: (
          <LookupChip
            lstOptions={lstStatuses}
            strCode={objItem.strExceptionStatus}
            strFallback={t("unavailable", "Unavailable")}
            blnHideIcon
          />
        ),
        punchRequest: objItem.intRequestID
          ? `${t("request", "Request")} #${objItem.intRequestID}`
          : objItem.strExceptionMessage,
        age: `${objItem.intAgeingDays} ${t("days", "days")}`,
      })),
    [objList, setSelected, lstTypes, lstSeverities, lstStatuses, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const lstTableColumns = useMemo<DataGridColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "rowSelect",
        headerName: (
          <Checkbox
            data-control-id="attendance-exceptions.select-page.checkbox"
            checked={blnAllPageSelected}
            onChange={(objEvent) =>
              setSetSelected(
                objEvent.target.checked
                  ? new Set(objList?.lstItems.map((objItem) => objItem.intID))
                  : new Set(),
              )
            }
            inputProps={
              {
                "data-control-id": "attendance-exceptions.select-page.checkbox",
              } as InputHTMLAttributes<HTMLInputElement>
            }
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56,
      },
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 90 },
      { field: "employee", headerName: t("employee", "Employee"), width: 170 },
      { field: "date", headerName: t("date", "Date"), width: 120 },
      { field: "type", headerName: t("type", "Type"), width: 160 },
      { field: "severity", headerName: t("severity", "Severity"), sortable: false, width: 120 },
      { field: "exceptionStatus", headerName: t("status", "Status"), sortable: false, width: 120 },
      { field: "punchRequest", headerName: t("punch_request", "Punch / Request"), width: 240 },
      { field: "age", headerName: t("age", "Age"), width: 110 },
    ],
    [blnAllPageSelected, objList, t],
  );

  if (blnRightsLoading) return <BlockingLoader blnOpen strLabel={t("loading", "Loading...")} />;
  if (!canViewAny())
    return (
      <Alert severity="warning">
        {t("access_denied", "Attendance Exceptions access is not available.")}
      </Alert>
    );
  // Use restrained severity accents so the summary is scannable without dominating the filters.
  const dicSeverityTone: Record<string, { strAccent: string; strSurface: string }> = {
    BLOCKING: { strAccent: "#c62828", strSurface: "#ffebee" },
    ERROR: { strAccent: "#e65100", strSurface: "#fff3e0" },
    WARNING: { strAccent: "#a16207", strSurface: "#fef9c3" },
    INFO: { strAccent: "#1565c0", strSurface: "#e3f2fd" },
  };
  return (
    <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px" }, "& .MuiAlert-root": { borderRadius: "9px" } }}>
      <BlockingLoader blnOpen={blnWorking} strLabel={t("working", "Please wait...")} />
      {/* Keep actions and severity summaries in one row so the queue begins below a single toolbar. */}
      <Paper className={styles.controlsCard}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="stretch">
          {blnCanGenerate ? (
            <>
            {blnCanGenerate ? (
              <Button
                data-control-id="attendance-exceptions.generate.button"
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                disabled={blnWorking}
                sx={{ minWidth: 144, minHeight: 48, flex: "0 0 auto" }}
                onClick={() =>
                  void attendanceRegularizationService
                    .generateExceptions(
                      objFilters.strFromDate,
                      objFilters.strToDate,
                    )
                    .then(loadQueue)
                }
              >
                {t("generate", "Generate")}
              </Button>
            ) : null}
            </>
          ) : null}
          {["BLOCKING", "ERROR", "WARNING", "INFO"].map((strSeverity) => {
          const objTone = dicSeverityTone[strSeverity];
          const blnSelected = objFilters.strSeverityCode === strSeverity;
          return (
            <Button
              key={strSeverity}
              data-control-id={`attendance-exceptions.card.${strSeverity.toLowerCase()}.button`}
              onClick={() =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strSeverityCode:
                    objValue.strSeverityCode === strSeverity ? undefined : strSeverity,
                }))
              }
              sx={{
                px: 1.5,
                minWidth: 150,
                minHeight: 48,
                flex: "1 1 150px",
                borderRadius: "9px",
                border: "1px solid",
                borderColor: blnSelected ? objTone.strAccent : "divider",
                justifyContent: "space-between",
                color: "text.primary",
                backgroundColor: blnSelected ? objTone.strSurface : "transparent",
                "&:hover": { backgroundColor: objTone.strSurface },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: objTone.strAccent,
                  }}
                />
                <Typography variant="body2" fontWeight={650}>
                  {lookupLabel(
                    lstSeverities,
                    strSeverity,
                    t("severity", "Severity"),
                  )}
                </Typography>
              </Stack>
              <Box
                sx={{
                  minWidth: 28,
                  height: 28,
                  px: 0.75,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "7px",
                  color: objTone.strAccent,
                  backgroundColor: objTone.strSurface,
                  fontWeight: 850,
                }}
              >
                {objList?.objSummary.dicBySeverity[strSeverity] ?? 0}
              </Box>
            </Button>
          );
        })}
        </Stack>
      </Paper>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Paper className={styles.controlsCard}>
        <Grid container spacing={1}>
          {/* Content-sized controls and actions share one toolbar row on desktop. */}
          <Grid item xs={12} sm={6} md={2} lg={1.45}>
            <TextField
              data-control-id="attendance-exceptions.from-date.input"
              fullWidth
              type="date"
              label={t("from_date", "From Date")}
              InputLabelProps={{ shrink: true }}
              value={objFilters.strFromDate}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strFromDate: objEvent.target.value,
                }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2} lg={1.45}>
            <TextField
              data-control-id="attendance-exceptions.to-date.input"
              fullWidth
              type="date"
              label={t("to_date", "To Date")}
              InputLabelProps={{ shrink: true }}
              value={objFilters.strToDate}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strToDate: objEvent.target.value,
                }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2} lg={1.3}>
            <TextField
              data-control-id="attendance-exceptions.type.select"
              fullWidth
              select
              label={t("type", "Type")}
              value={objFilters.strExceptionTypeCode ?? ""}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strExceptionTypeCode: objEvent.target.value || undefined,
                }))
              }
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">{t("all", "All")}</MenuItem>
              {lstTypes.map((objOption) => (
                <MenuItem
                  key={objOption.strValueCode}
                  value={objOption.strValueCode}
                >
                  {objOption.strDisplayName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2} lg={1.3}>
            <TextField
              data-control-id="attendance-exceptions.status.select"
              fullWidth
              select
              label={t("status", "Status")}
              value={objFilters.strExceptionStatus ?? ""}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strExceptionStatus: objEvent.target.value || undefined,
                }))
              }
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">{t("all", "All")}</MenuItem>
              {lstStatuses.map((objOption) => (
                <MenuItem
                  key={objOption.strValueCode}
                  value={objOption.strValueCode}
                >
                  {objOption.strDisplayName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2} lg={1.05}>
            <TextField
              data-control-id="attendance-exceptions.ageing.input"
              fullWidth
              type="number"
              label={t("minimum_age", "Minimum Age")}
              value={objFilters.intMinAgeingDays ?? ""}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  intMinAgeingDays: objEvent.target.value
                    ? Number(objEvent.target.value)
                    : undefined,
                }))
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2} lg={1.4}>
            <TextField
              data-control-id="attendance-exceptions.sort-by.select"
              fullWidth
              select
              label={t("sort_by", "Sort By")}
              value={objFilters.strSortBy ?? ""}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strSortBy: (objEvent.target.value || undefined) as ExceptionFilters["strSortBy"],
                }))
              }
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">{t("default_priority", "Default Priority")}</MenuItem>
              <MenuItem value="severity">{t("severity", "Severity")}</MenuItem>
              <MenuItem value="status">{t("status", "Status")}</MenuItem>
              <MenuItem value="detected_on">{t("detected_on", "Detected On")}</MenuItem>
              <MenuItem value="work_date">{t("work_date", "Work Date")}</MenuItem>
              <MenuItem value="employee">{t("employee", "Employee")}</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2} lg={1.55}>
            <TextField
              data-control-id="attendance-exceptions.sort-direction.select"
              fullWidth
              select
              disabled={!objFilters.strSortBy}
              label={t("sort_direction", "Sort Direction")}
              value={objFilters.strSortDirection ?? "asc"}
              onChange={(objEvent) =>
                setObjFilters((objValue) => ({
                  ...objValue,
                  strSortDirection: objEvent.target.value as "asc" | "desc",
                }))
              }
            >
              <MenuItem value="asc">{t("ascending", "Ascending")}</MenuItem>
              <MenuItem value="desc">{t("descending", "Descending")}</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} lg="auto" sx={{ ml: { lg: "auto" } }}>
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              alignItems="stretch"
              className={styles.filterActions}
              sx={{
                height: "100%",
                minWidth: { lg: 224 },
                "& .MuiButton-root": {
                  flex: "0 0 auto",
                  minWidth: 104,
                  px: 2,
                },
              }}
            >
              <Button
                data-control-id="attendance-exceptions.search.button"
                className={styles.primaryButton}
                startIcon={<SearchRoundedIcon />}
                onClick={() => {
                  void loadQueue();
                }}
              >
                {t("search", "Search")}
              </Button>
              <Button
                data-control-id="attendance-exceptions.clear.button"
                className={styles.secondaryButton}
                startIcon={<ClearRoundedIcon />}
                onClick={clearFilters}
              >
                {t("clear", "Clear")}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      {setSelected.size > 0 ? (
        <Alert
          severity="info"
          action={
            <Stack direction="row">
              {blnCanBulkIgnore ? (
                <Button
                  data-control-id="attendance-exceptions.bulk-ignore.button"
                  onClick={() => setObjDialog({ strAction: "bulk-ignore" })}
                >
                  {t("bulk_ignore", "Bulk Ignore")}
                </Button>
              ) : null}
            </Stack>
          }
        >
          {t("selected_count", "Selected")}: {setSelected.size}
        </Alert>
      ) : null}
      {objBulkResult ? (
        <Alert severity={objBulkResult.intFailureCount ? "warning" : "success"}>
          {t("bulk_result", "Bulk action completed")}:{" "}
          {objBulkResult.intSuccessCount} {t("succeeded", "succeeded")},{" "}
          {objBulkResult.intFailureCount} {t("failed", "failed")}.
        </Alert>
      ) : null}
      <Paper className={styles.tableCard} sx={{ position: "relative", minHeight: blnLoading ? 160 : undefined }}>
        <BlockingLoader blnOpen={blnLoading} blnLocal strLabel={t("loading", "Loading...")} />
        {blnLoading ? null : (
          <CommonDataGrid
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={25}
            pageSizeOptions={[25, 50, 100]}
            showExportOptions={blnCanExport}
            showPaginationSummary
            minTableWidth={1250}
            exportFileName="attendance_exceptions"
            emptyMessage={t("no_exceptions", "No exceptions found.")}
            testIdPrefix="attendance-exceptions.list"
            withPaper={false}
            onRowDoubleClick={(objRow) => {
              const objException = objList?.lstItems.find((objItem) => objItem.intID === objRow.id);
              if (objException) void openDetail(objException);
            }}
          />
        )}
      </Paper>
      <Dialog
        data-control-id="attendance-exceptions.detail.dialog"
        open={Boolean(objDetail)}
        onClose={() => {
          setObjDetail(null);
          setObjSelected(null);
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{t("exception_detail", "Exception Detail")}</DialogTitle>
        <DialogContent dividers>
          <Typography fontWeight={850}>
            {objSelected
              ? lookupLabel(
                  lstTypes,
                  objSelected.strExceptionTypeCode,
                  t("exception", "Exception"),
                )
              : ""}
          </Typography>
          <Typography>{objSelected?.strExceptionMessage}</Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={800}>
                {t("attendance", "Attendance")}
              </Typography>
              <Typography>
                {t("status", "Status")}:{" "}
                {lookupLabel(
                  objLookups["ATTENDANCE_STATUS"] ?? [],
                  objDrilldownContext?.objAttendanceDay.strStatus,
                  t("not_recorded", "Not recorded"),
                )}
              </Typography>
              <Typography>
                {t("worked_hours", "Worked Hours")}:{" "}
                {objDrilldownContext?.objAttendanceDay.decWorkedHours ?? "—"}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={800}>
                {t("punches", "Punches")}
              </Typography>
              {objDrilldownContext?.lstPunches.length ? (
                objDrilldownContext.lstPunches.map((objPunch) => (
                  <Typography key={objPunch.intID}>
                    {lookupLabel(
                      objLookups["ATTENDANCE_PUNCH_DIRECTION"] ?? [],
                      objPunch.strDirection,
                      t("punch", "Punch"),
                    )}
                    : {new Date(objPunch.dtPunchAt).toLocaleString()}
                  </Typography>
                ))
              ) : (
                <Typography>{t("no_punches", "No punches.")}</Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={800}>
                {t("day_context", "Day Context")}
              </Typography>
              <Typography>
                {objDrilldownContext?.objHoliday
                  ? t("holiday_exists", "Holiday applies.")
                  : t("no_holiday", "No holiday.")}
              </Typography>
              <Typography>
                {objDrilldownContext?.objApprovedLeave
                  ? t("leave_exists", "Approved leave applies.")
                  : t("no_leave", "No approved leave.")}
              </Typography>
            </Grid>
          </Grid>
          <Typography fontWeight={850} sx={{ mt: 2 }}>
            {t("timeline", "Timeline")}
          </Typography>
          {Array.isArray(objDetail?.lstTimeline)
            ? (objDetail.lstTimeline as Array<Record<string, unknown>>).map(
                (objItem, intIndex) => (
                  <Box
                    key={intIndex}
                    sx={{
                      borderLeft: "3px solid",
                      borderColor: "primary.main",
                      pl: 1,
                      my: 1,
                    }}
                  >
                    {lookupLabel(
                      lstActions,
                      String(objItem.strActionCode ?? ""),
                      t("action", "Action"),
                    )}{" "}
                    ·{" "}
                    {new Date(
                      String(objItem.dtActionOn ?? ""),
                    ).toLocaleString()}
                  </Box>
                ),
              )
            : null}
        </DialogContent>
        <DialogActions>
          <Button
            data-control-id="attendance-exceptions.detail.close.button"
            onClick={() => {
              setObjDetail(null);
              setObjSelected(null);
            }}
          >
            {t("close", "Close")}
          </Button>
          {objSelected ? (
            <>
              {objSelected.intRequestID || blnCanCreateRequest ? (
                <Button
                  data-control-id="attendance-exceptions.detail.regularization.button"
                  onClick={() =>
                    objSelected.intRequestID
                      ? objRouter.push(
                          `/attendance/regularization-requests?request=${objSelected.intRequestID}`,
                        )
                      : openCreateRequest(objSelected)
                  }
                >
                  {objSelected.intRequestID
                    ? t("open_request", "Open Request")
                    : t("create_regularization", "Create Regularization")}
                </Button>
              ) : null}
              {blnCanReview ? (
                <Button
                  data-control-id="attendance-exceptions.detail.review.button"
                  disabled={blnWorking}
                  onClick={async () => {
                    setBlnWorking(true);
                    try {
                      await attendanceRegularizationService.exceptionAction(
                        objSelected.intID,
                        "under-review",
                      );
                      setObjDetail(null);
                      setObjSelected(null);
                      await loadQueue();
                      setObjSnackbar({
                        strSeverity: "success",
                        strMessage: t(
                          "action_success",
                          "Action completed successfully.",
                        ),
                      });
                    } catch (objError) {
                      setObjSnackbar({
                        strSeverity: "error",
                        strMessage:
                          objError instanceof Error
                            ? objError.message
                            : t(
                                "action_failed",
                                "Unable to complete exception action.",
                              ),
                      });
                    } finally {
                      setBlnWorking(false);
                    }
                  }}
                >
                  {t("mark_under_review", "Mark Under Review")}
                </Button>
              ) : null}
              {blnCanIgnore ? (
                <Button
                  data-control-id="attendance-exceptions.detail.ignore.button"
                  onClick={() =>
                    setObjDialog({
                      strAction: "ignore",
                      objException: objSelected,
                    })
                  }
                >
                  {t("ignore", "Ignore")}
                </Button>
              ) : null}
              {blnCanResolve ? (
                <Button
                  data-control-id="attendance-exceptions.detail.resolve.button"
                  onClick={() =>
                    setObjDialog({
                      strAction: "resolve",
                      objException: objSelected,
                    })
                  }
                >
                  {t("resolve", "Resolve")}
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogActions>
      </Dialog>
      <Dialog
        data-control-id="attendance-exceptions.action.dialog"
        open={Boolean(objDialog)}
        onClose={() => setObjDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {t(`action_${objDialog?.strAction ?? "manage"}`, "Exception Action")}
        </DialogTitle>
        <DialogContent>
          {objDialog?.strAction === "create-request" ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                data-control-id="attendance-exceptions.request.type.select"
                select
                required
                label={t("request_type", "Request Type")}
                value={objRequestDraft.strRequestTypeCode}
                onChange={(objEvent) =>
                  setObjRequestDraft((objValue) => ({
                    ...objValue,
                    strRequestTypeCode: objEvent.target.value,
                  }))
                }
              >
                {lstRequestTypes.map((objOption) => (
                  <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>
                    {objOption.strDisplayName}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                data-control-id="attendance-exceptions.request.status.select"
                select
                required
                label={t("proposed_status", "Proposed Status")}
                value={objRequestDraft.strProposedStatus}
                onChange={(objEvent) =>
                  setObjRequestDraft((objValue) => ({
                    ...objValue,
                    strProposedStatus: objEvent.target.value,
                  }))
                }
              >
                {lstAttendanceStatuses.map((objOption) => (
                  <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>
                    {objOption.strDisplayName}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  data-control-id="attendance-exceptions.request.in-time.input"
                  fullWidth
                  type="time"
                  label={t("in_time", "IN Time")}
                  InputLabelProps={{ shrink: true }}
                  value={objRequestDraft.tmProposedFirstIn}
                  onChange={(objEvent) =>
                    setObjRequestDraft((objValue) => ({
                      ...objValue,
                      tmProposedFirstIn: objEvent.target.value,
                    }))
                  }
                />
                <TextField
                  data-control-id="attendance-exceptions.request.out-time.input"
                  fullWidth
                  type="time"
                  label={t("out_time", "OUT Time")}
                  InputLabelProps={{ shrink: true }}
                  value={objRequestDraft.tmProposedLastOut}
                  onChange={(objEvent) =>
                    setObjRequestDraft((objValue) => ({
                      ...objValue,
                      tmProposedLastOut: objEvent.target.value,
                    }))
                  }
                />
              </Stack>
              <TextField
                data-control-id="attendance-exceptions.request.reason.input"
                required
                multiline
                minRows={3}
                label={t("reason", "Reason")}
                value={objRequestDraft.strEmployeeReason}
                onChange={(objEvent) =>
                  setObjRequestDraft((objValue) => ({
                    ...objValue,
                    strEmployeeReason: objEvent.target.value,
                  }))
                }
              />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {objDialog?.strAction === "resolve" ? (
                <TextField
                  data-control-id="attendance-exceptions.action.resolution-code.input"
                  required
                  label={t("resolution_code", "Resolution Code")}
                  value={strResolutionCode}
                  onChange={(objEvent) =>
                    setStrResolutionCode(objEvent.target.value)
                  }
                />
              ) : null}
              <TextField
                data-control-id="attendance-exceptions.action.reason.input"
                required
                multiline
                minRows={3}
                label={t("reason", "Reason")}
                value={strReason}
                onChange={(objEvent) => setStrReason(objEvent.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            data-control-id="attendance-exceptions.action.cancel.button"
            onClick={() => setObjDialog(null)}
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            data-control-id="attendance-exceptions.action.confirm.button"
            variant="contained"
            disabled={blnWorking}
            onClick={() => void runDialogAction()}
          >
            {t("confirm", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        data-control-id="attendance-exceptions.feedback.snackbar"
        open={Boolean(objSnackbar)}
        autoHideDuration={4000}
        onClose={() => setObjSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setObjSnackbar(null)}
          severity={objSnackbar?.strSeverity ?? "success"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {objSnackbar?.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
