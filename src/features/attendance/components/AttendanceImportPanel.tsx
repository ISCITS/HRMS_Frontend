"use client";

import { useRef, useState, type ChangeEvent } from "react";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import { attendanceService } from "@/features/attendance/services/attendanceService";
import type {
  AttendanceImportCommitResult,
  AttendanceImportCommitRow,
  AttendanceImportPreviewResult,
  AttendanceImportRow,
} from "@/features/attendance/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import BlockingLoader from "@/components/shared/BlockingLoader";

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

  if (objAccess.blnLoading) return <BlockingLoader blnOpen strLabel={t("loading", "Loading...")} />;
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

  function handlePickFile() {
    objFileInputRef.current?.click();
  }

  async function handleFileSelected(objEvent: ChangeEvent<HTMLInputElement>) {
    const objFile = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objFile) return;
    setStrFileName(objFile.name);
    setObjPreview(null);
    setObjCommitResult(null);
    setStrError(null);
    try {
      setBlnBusy(true);
      const objResult = await attendanceService.previewImport(objFile);
      setObjPreview(objResult);
      setSetSelectedRows(new Set(objResult.lstRows.filter((objRow) => objRow.blnValid).map((objRow) => objRow.intExcelRowNumber)));
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("import_preview_failed", "Failed to read the uploaded file."));
    } finally {
      setBlnBusy(false);
    }
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
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("import_commit_failed", "Failed to import attendance data."));
    } finally {
      setBlnBusy(false);
    }
  }

  const lstRows: AttendanceImportRow[] = objPreview?.lstRows ?? [];

  return (
    <Box>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      <Typography variant="h6" gutterBottom>
        {t("import_attendance_title", "Import Attendance")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          "import_attendance_description",
          "Bulk-load attendance for employees who do not punch through this application. Download the template, fill it in, then upload it below for review before committing.",
        )}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button
          data-control-id="attendance.import.download-template.button"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
        >
          {t("download_template", "Download Template")}
        </Button>
        {blnCanManage && (
          <>
            <Button
              data-control-id="attendance.import.import-data.button"
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handlePickFile}
            >
              {t("import_data", "Import Data")}
            </Button>
            <input
              ref={objFileInputRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={handleFileSelected}
              data-control-id="attendance.import.file-input"
            />
          </>
        )}
        {strFileName && (
          <Typography variant="body2" sx={{ alignSelf: "center" }} color="text.secondary">
            {strFileName}
          </Typography>
        )}
      </Box>

      {objCommitResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setObjCommitResult(null)}>
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

      {objPreview && (
        <>
          <Box sx={{ display: "flex", gap: 3, mb: 1 }}>
            <Chip label={`${t("total", "Total")}: ${objPreview.intTotal}`} />
            <Chip color="success" label={`${t("valid", "Valid")}: ${objPreview.intValid}`} />
            <Chip color="error" label={`${t("errors", "Errors")}: ${objPreview.intErrors}`} />
            <Chip color="warning" label={`${t("will_overwrite", "Will overwrite")}: ${objPreview.intWillOverwrite}`} />
          </Box>
          <TableContainer component={Paper} sx={{ mb: 2, maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>{t("row", "Row")}</TableCell>
                  <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                  <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                  <TableCell>{t("date", "Date")}</TableCell>
                  <TableCell>{t("status", "Status")}</TableCell>
                  <TableCell>{t("in_time", "In Time")}</TableCell>
                  <TableCell>{t("out_time", "Out Time")}</TableCell>
                  <TableCell>{t("result", "Result")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstRows.map((objRow) => (
                  <TableRow key={objRow.intExcelRowNumber} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        data-control-id={`attendance.import.row-${objRow.intExcelRowNumber}.checkbox`}
                        disabled={!objRow.blnValid}
                        checked={setSelectedRows.has(objRow.intExcelRowNumber)}
                        onChange={(objEvent) => toggleRow(objRow.intExcelRowNumber, objEvent.target.checked)}
                      />
                    </TableCell>
                    <TableCell>{objRow.intExcelRowNumber}</TableCell>
                    <TableCell>{objRow.strEmployeeCode}</TableCell>
                    <TableCell>{objRow.strEmployeeName ?? "-"}</TableCell>
                    <TableCell>{objRow.dtWorkDate ?? objRow.strRawDate}</TableCell>
                    <TableCell>{objRow.strStatus}</TableCell>
                    <TableCell>{objRow.strFirstIn ?? "-"}</TableCell>
                    <TableCell>{objRow.strLastOut ?? "-"}</TableCell>
                    <TableCell>
                      {objRow.blnValid ? (
                        <Chip size="small" color={objRow.blnWillOverwrite ? "warning" : "success"} label={objRow.blnWillOverwrite ? t("overwrite", "Overwrite") : t("new", "New")} />
                      ) : (
                        <Tooltip title={objRow.strErrorMessage ?? ""}>
                          <Chip size="small" color="error" label={t("error", "Error")} />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {blnCanManage && (
            <Button
              data-control-id="attendance.import.confirm.button"
              variant="contained"
              color="primary"
              onClick={handleConfirmImport}
              disabled={setSelectedRows.size === 0}
            >
              {t("confirm_import", "Confirm Import")}
            </Button>
          )}
        </>
      )}

      <Snackbar open={Boolean(strError)} autoHideDuration={6000} onClose={() => setStrError(null)}>
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
