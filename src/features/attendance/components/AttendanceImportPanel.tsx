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
  Snackbar,
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
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import { dicMasterRowSx, MasterBreadcrumbs } from "@/components/master/MasterListUi";

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
    resultText: objRow.blnValid ? (objRow.blnWillOverwrite ? "Overwrite" : "New") : "Error",
    result: objRow.blnValid ? (
      <Chip size="small" color={objRow.blnWillOverwrite ? "warning" : "success"} label={objRow.blnWillOverwrite ? t("overwrite", "Overwrite") : t("new", "New")} />
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
                accept=".xlsx"
                hidden
                onChange={handleFileSelected}
                data-control-id="attendance.import.file-input"
              />
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

      {objPreview && (
        <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <CommonTable
            columns={lstPreviewColumns}
            rows={lstPreviewRows}
            rowIdField="id"
            showPaginationSummary
            hideRowClickHint
            minTableWidth={950}
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
                <Chip size="small" color="error" label={`${t("errors", "Errors")}: ${objPreview.intErrors}`} />
                <Chip size="small" color="warning" label={`${t("will_overwrite", "Will overwrite")}: ${objPreview.intWillOverwrite}`} />
              </Box>
            }
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      )}

      <Snackbar open={Boolean(strError)} autoHideDuration={6000} onClose={() => setStrError(null)}>
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
