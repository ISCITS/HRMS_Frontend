"use client";

import { useRef, useState, type ChangeEvent } from "react";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { attendanceService } from "@/features/attendance/services/attendanceService";
import type {
  AttendanceImportCommitResult,
  AttendanceImportCommitRow,
  AttendanceImportMapping,
  AttendanceImportPreviewResult,
  AttendanceImportRow,
  ScheduledImportRunResult,
} from "@/features/attendance/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import { dicMasterRowSx, MasterBreadcrumbs, MasterGridSkeleton } from "@/components/master/MasterListUi";

export default function AttendanceImportPanel() {
  const { t } = useModuleLabels("attendance", "Unable to load attendance labels.");
  const objAccess = useModuleActionAccess(["ATTENDANCE_MANAGEMENT", "ATTENDANCE_POLICY", "DAILY_ATTENDANCE", "ATTENDANCE"]);
  const lstManagementActions = Array.from(
    new Set([
      ...(objAccess.objRights.dicAllowedActions.ATTENDANCE_MANAGEMENT ?? []),
      ...(objAccess.objRights.dicAllowedActions.ATTENDANCE_POLICY ?? []),
      ...(objAccess.objRights.dicAllowedActions.DAILY_ATTENDANCE ?? []),
      ...(objAccess.objRights.dicAllowedActions.ATTENDANCE ?? []),
    ]),
  );
  const setManagementActions = new Set(lstManagementActions.map((strAction) => strAction.trim().toLowerCase()));
  const blnCanManage = ["manage", "add", "create", "edit", "update", "save", "attendance_manage"].some((strAction) =>
    setManagementActions.has(strAction),
  );

  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strFileName, setStrFileName] = useState<string | null>(null);
  const [objPreview, setObjPreview] = useState<AttendanceImportPreviewResult | null>(null);
  const [setSelectedRows, setSetSelectedRows] = useState<Set<number>>(new Set());
  const [strError, setStrError] = useState<string | null>(null);
  const [objCommitResult, setObjCommitResult] = useState<AttendanceImportCommitResult | null>(null);
  const [objFile, setObjFile] = useState<File | null>(null);
  const [dicMappingDraft, setDicMappingDraft] = useState<AttendanceImportMapping>({});
  const [blnErrorsOpen, setBlnErrorsOpen] = useState(false);
  const [objScheduledResult, setObjScheduledResult] = useState<ScheduledImportRunResult | null>(null);

  if (objAccess.blnLoading) return <Box className={styles.page}><MasterBreadcrumbs strSection={t("breadcrumb_attendance", "Attendance")} strTitle={t("import_attendance_title", "Import Attendance")} /><MasterGridSkeleton strControlId="attendance.import.skeleton" intColumns={7} /></Box>;
  if (!objAccess.canViewAny())
    return (
      <Alert severity="warning">
        {t("permission_denied", "Attendance Management access is not available for your user group. Sign in with an HR or Administrator account.")}
      </Alert>
    );

  async function handleDownloadTemplate() {
    try {
      setBlnBusy(true);
      await attendanceService.downloadImportTemplate();
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("import_template_download_failed", "Failed to download the import template."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleRunScheduledImport() {
    try {
      setBlnBusy(true);
      setStrError(null);
      setObjScheduledResult(await attendanceService.runScheduledImport());
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("scheduled_import_failed", "Failed to run the folder import."));
    } finally {
      setBlnBusy(false);
    }
  }

  function handlePickFile() {
    objFileInputRef.current?.click();
  }

  async function handleFileSelected(objEvent: ChangeEvent<HTMLInputElement>) {
    const objPicked = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objPicked) return;
    setStrFileName(objPicked.name);
    setObjFile(objPicked);
    setObjPreview(null);
    setObjCommitResult(null);
    setStrError(null);
    await runPreview(objPicked);
  }

  // Auto-maps when no mapping is given; re-runs with the user's chosen mapping otherwise.
  async function runPreview(objSource: File, dicMapping?: AttendanceImportMapping) {
    try {
      setBlnBusy(true);
      const objResult = await attendanceService.previewImport(objSource, dicMapping);
      setObjPreview(objResult);
      setDicMappingDraft(objResult.dicMapping);
      setSetSelectedRows(new Set(objResult.lstRows.filter((objRow) => objRow.blnValid).map((objRow) => objRow.intExcelRowNumber)));
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("import_preview_failed", "Failed to read the uploaded file."));
    } finally {
      setBlnBusy(false);
    }
  }

  function handleMappingChange(strFieldKey: string, strValue: string) {
    setDicMappingDraft((objPrev) => ({ ...objPrev, [strFieldKey]: strValue === "" ? null : Number(strValue) }));
  }

  function toggleRow(intExcelRowNumber: number, blnChecked: boolean) {
    setSetSelectedRows((objPrev) => {
      const objNext = new Set(objPrev);
      if (blnChecked) objNext.add(intExcelRowNumber);
      else objNext.delete(intExcelRowNumber);
      return objNext;
    });
  }

  async function handleConfirmImport() {
    if (!objPreview) return;
    const lstRowsToCommit: AttendanceImportCommitRow[] = objPreview.lstRows
      .filter((objRow) => objRow.blnValid && setSelectedRows.has(objRow.intExcelRowNumber) && objRow.intEmployeeID && objRow.dtWorkDate)
      .map((objRow) => ({
        intExcelRowNumber: objRow.intExcelRowNumber,
        intEmployeeID: objRow.intEmployeeID as number,
        dtWorkDate: objRow.dtWorkDate as string,
        strStatus: objRow.strStatus,
        tmFirstIn: objRow.strFirstIn,
        tmLastOut: objRow.strLastOut,
        intShiftID: objRow.intShiftID,
      }));
    if (lstRowsToCommit.length === 0) {
      setStrError(t("import_no_rows_selected", "Select at least one valid row to import."));
      return;
    }
    try {
      setBlnBusy(true);
      const objResult = await attendanceService.commitImport(lstRowsToCommit);
      setObjCommitResult(objResult);
      setObjPreview(null);
      setStrFileName(null);
      setObjFile(null);
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("import_commit_failed", "Failed to import attendance data."));
    } finally {
      setBlnBusy(false);
    }
  }

  const lstRows: AttendanceImportRow[] = objPreview?.lstRows ?? [];
  const lstErrorRows = lstRows.filter((objRow) => !objRow.blnValid);

  const lstPreviewRows = lstRows.map((objRow) => ({
    id: objRow.intExcelRowNumber,
    select: (
      <Checkbox
        data-control-id={`attendance.import.row-${objRow.intExcelRowNumber}.checkbox`}
        disabled={!objRow.blnValid}
        checked={setSelectedRows.has(objRow.intExcelRowNumber)}
        onChange={(objEvent) => toggleRow(objRow.intExcelRowNumber, objEvent.target.checked)}
      />
    ),
    row: objRow.intExcelRowNumber,
    employeeCode: objRow.strEmployeeCode,
    employeeName: objRow.strEmployeeName ?? "-",
    workDate: objRow.dtWorkDate ?? objRow.strRawDate,
    status: objRow.strStatus,
    firstIn: objRow.strFirstIn ?? "-",
    lastOut: objRow.strLastOut ?? "-",
    shift: objRow.strRawShift ?? "-",
    lateMinutes: objRow.intLateMinutes > 0 ? `${objRow.intLateMinutes} min` : "-",
    earlyMinutes: objRow.intEarlyMinutes > 0 ? `${objRow.intEarlyMinutes} min` : "-",
    resultText: objRow.blnValid ? (objRow.blnWillOverwrite ? "Overwrite" : "New") : "Error",
    result: objRow.blnValid ? (
      <Tooltip title={objRow.strWarning ?? ""}>
        <Chip
          size="small"
          color={objRow.strWarning ? "warning" : objRow.blnWillOverwrite ? "warning" : "success"}
          label={objRow.blnWillOverwrite ? t("overwrite", "Overwrite") : t("new", "New")}
          variant={objRow.strWarning ? "outlined" : "filled"}
        />
      </Tooltip>
    ) : (
      <Tooltip title={objRow.strErrorMessage ?? ""}>
        <Chip size="small" color="error" label={t("error", "Error")} />
      </Tooltip>
    ),
  }));
  const lstPreviewColumns: CommonTableColumn<(typeof lstPreviewRows)[number]>[] = [
    { field: "select", headerName: "", sortable: false, filterable: false, exportable: false, width: 56 },
    { field: "row", headerName: t("row", "Row"), width: 80 },
    { field: "employeeCode", headerName: t("employee_code", "Employee Code"), width: 140 },
    { field: "employeeName", headerName: t("employee_name", "Employee Name"), width: 180 },
    { field: "workDate", headerName: t("date", "Date"), width: 130 },
    { field: "status", headerName: t("status", "Status"), width: 120 },
    { field: "firstIn", headerName: t("in_time", "In Time"), width: 110 },
    { field: "lastOut", headerName: t("out_time", "Out Time"), width: 110 },
    { field: "shift", headerName: t("shift", "Shift"), width: 150 },
    { field: "lateMinutes", headerName: t("late_by", "Late By"), width: 100 },
    { field: "earlyMinutes", headerName: t("early_by", "Early By"), width: 100 },
    { field: "result", headerName: t("result", "Result"), filterable: false, width: 120, sortAccessor: (row) => row.resultText },
  ];

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      <MasterBreadcrumbs strSection={t("breadcrumb_attendance", "Attendance")} strTitle={t("import_attendance_title", "Import Attendance")} />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Typography sx={{ fontSize: "11px", color: "#64748b", mb: 1.25 }}>
          {t(
            "import_attendance_description",
            "Bulk-load attendance for employees who do not punch through this application. Download the template, fill it in, then upload it below for review before committing.",
          )}
        </Typography>
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            data-control-id="attendance.import.download-template.button"
            className={styles.secondaryButton}
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            {t("download_template", "Download Template")}
          </Button>
          {blnCanManage && (
            <>
              <Button
                data-control-id="attendance.import.import-data.button"
                className={styles.primaryButton}
                startIcon={<UploadFileIcon />}
                onClick={handlePickFile}
              >
                {t("import_data", "Import Data")}
              </Button>
              <input
                ref={objFileInputRef}
                type="file"
                accept=".xlsx,.xlsm,.xls,.csv"
                hidden
                onChange={handleFileSelected}
                data-control-id="attendance.import.file-input"
              />
              <Tooltip title={t("run_folder_import_hint", "Imports the files waiting in the configured inbox folder now - the same job that runs automatically every day at 11:00 AM.")}>
                <span>
                  <Button
                    data-control-id="attendance.import.run-folder-import.button"
                    className={styles.secondaryButton}
                    startIcon={<FolderOpenIcon />}
                    onClick={handleRunScheduledImport}
                    disabled={blnBusy}
                  >
                    {t("run_folder_import", "Run Folder Import Now")}
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          {strFileName && (
            <Typography variant="body2" color="text.secondary">
              {strFileName}
            </Typography>
          )}
        </Box>
      </Box>

      {objCommitResult && (
        <Alert severity="success" onClose={() => setObjCommitResult(null)}>
          {t("import_commit_summary", "Import complete")}: {objCommitResult.intCreated} {t("created", "created")}, {objCommitResult.intUpdated} {t("updated", "updated")}, {objCommitResult.intSkipped} {t("skipped", "skipped")}.
          {objCommitResult.lstFailures.length > 0 && (
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {objCommitResult.lstFailures.map((objFailure) => (
                <li key={objFailure.intExcelRowNumber}>
                  {t("row", "Row")} {objFailure.intExcelRowNumber}: {objFailure.strMessage}
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {objScheduledResult && (
        <Alert
          severity={objScheduledResult.intFilesFailed > 0 ? "warning" : objScheduledResult.intFilesFound === 0 ? "info" : "success"}
          onClose={() => setObjScheduledResult(null)}
          data-control-id="attendance.import.scheduled-result"
        >
          {objScheduledResult.strNote
            ? objScheduledResult.strNote
            : objScheduledResult.intFilesFound === 0
              ? t("scheduled_no_files", "No files were waiting in the inbox folder.")
              : `${t("folder_import_complete", "Folder import complete")}: ${objScheduledResult.intFilesProcessed} ${t("files_processed", "file(s) processed")}, ${objScheduledResult.intFilesFailed} ${t("files_failed", "failed")}, ${objScheduledResult.intFilesDeferred} ${t("files_deferred", "deferred")}; ${objScheduledResult.intCreated} ${t("created", "created")}, ${objScheduledResult.intUpdated} ${t("updated", "updated")}, ${objScheduledResult.intSkipped} ${t("skipped", "skipped")}.`}
          {objScheduledResult.lstFiles.length > 0 && (
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {objScheduledResult.lstFiles.map((objFile) => (
                <li key={objFile.strFile}>
                  {objFile.strFile}: {objFile.strOutcome}
                  {objFile.strOutcome === "processed"
                    ? ` (${objFile.intCreated ?? 0} ${t("created", "created")}, ${objFile.intUpdated ?? 0} ${t("updated", "updated")}, ${objFile.intSkipped ?? 0} ${t("skipped", "skipped")}) - ${t("see_report", "row-level report saved in the processed folder")}`
                    : objFile.strMessage
                      ? ` - ${objFile.strMessage}`
                      : ""}
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {objPreview && (
        <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
          {objPreview.blnNeedsMapping ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {t("import_columns_mismatch", "The columns in this file do not match the expected fields. Align them below and apply.")}
              <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                {objPreview.lstMappingIssues.map((objIssue) => (
                  <li key={`${objIssue.strFieldKey}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>
                ))}
              </Box>
            </Alert>
          ) : (
            <Typography sx={{ fontSize: "11px", color: "#64748b", mb: 1 }}>
              {t("import_columns_matched", "Columns were matched automatically. Change any mapping below if it is wrong.")}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            {objPreview.lstFields.map((objField) => {
              const blnMissing = objPreview.lstMappingIssues.some((objIssue) => objIssue.strFieldKey === objField.strKey);
              return (
                <TextField
                  key={objField.strKey}
                  select
                  size="small"
                  sx={{ minWidth: 190 }}
                  label={`${objField.strLabel}${objField.blnRequired ? " *" : ""}`}
                  error={blnMissing}
                  value={dicMappingDraft[objField.strKey] ?? ""}
                  onChange={(objEvent) => handleMappingChange(objField.strKey, objEvent.target.value)}
                  inputProps={{ "data-control-id": `attendance.import.mapping.${objField.strKey}` }}
                >
                  <MenuItem value="">{t("not_mapped", "— Not mapped —")}</MenuItem>
                  {objPreview.lstSourceColumns.map((objColumn) => (
                    <MenuItem key={objColumn.intIndex} value={objColumn.intIndex}>
                      {objColumn.strName}
                    </MenuItem>
                  ))}
                </TextField>
              );
            })}
            <Button
              data-control-id="attendance.import.apply-mapping.button"
              className={styles.primaryButton}
              disabled={!objFile}
              onClick={() => objFile && runPreview(objFile, dicMappingDraft)}
            >
              {t("apply_mapping", "Apply Mapping")}
            </Button>
          </Box>
        </Box>
      )}

      {objPreview && !objPreview.blnNeedsMapping && (
        <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <CommonTable
            columns={lstPreviewColumns}
            rows={lstPreviewRows}
            rowIdField="id"
            showPaginationSummary
            hideRowClickHint
            minTableWidth={1250}
            emptyMessage={t("import_no_rows", "No rows found in the uploaded file.")}
            testIdPrefix="attendance.import.preview"
            toolbarLeft={
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanManage && (
                  <Button
                    data-control-id="attendance.import.confirm.button"
                    className={styles.primaryButton}
                    onClick={handleConfirmImport}
                    disabled={setSelectedRows.size === 0}
                  >
                    {t("confirm_import", "Confirm Import")}
                  </Button>
                )}
                <Chip size="small" label={`${t("total", "Total")}: ${objPreview.intTotal}`} />
                <Chip size="small" color="success" label={`${t("valid", "Valid")}: ${objPreview.intValid}`} />
                <Chip
                  size="small"
                  color="error"
                  clickable={objPreview.intErrors > 0}
                  onClick={objPreview.intErrors > 0 ? () => setBlnErrorsOpen(true) : undefined}
                  data-control-id="attendance.import.errors.chip"
                  label={`${t("errors", "Errors")}: ${objPreview.intErrors}`}
                />
                <Chip size="small" color="warning" label={`${t("will_overwrite", "Will overwrite")}: ${objPreview.intWillOverwrite}`} />
              </Box>
            }
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      )}

      <Dialog open={blnErrorsOpen} onClose={() => setBlnErrorsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{`${t("errors", "Errors")}: ${lstErrorRows.length}`}</DialogTitle>
        <DialogContent dividers>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t("row", "Row")}</TableCell>
                <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                <TableCell>{t("date", "Date")}</TableCell>
                <TableCell>{t("error", "Error")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstErrorRows.map((objRow) => (
                <TableRow key={objRow.intExcelRowNumber}>
                  <TableCell>{objRow.intExcelRowNumber}</TableCell>
                  <TableCell>{objRow.strEmployeeCode}</TableCell>
                  <TableCell>{objRow.strEmployeeName ?? "-"}</TableCell>
                  <TableCell>{objRow.dtWorkDate ?? objRow.strRawDate}</TableCell>
                  <TableCell>{objRow.strErrorMessage ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnErrorsOpen(false)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strError)} autoHideDuration={6000} onClose={() => setStrError(null)}>
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
