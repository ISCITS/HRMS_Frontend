"use client";

import { useRef, useState, type ChangeEvent } from "react";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
  AttendanceImportCommitRow,
  AttendanceImportMapping,
  AttendanceImportPreviewResult,
  ScheduledImportRunResult,
} from "@/features/attendance/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/components/master/MasterScreen.module.css";

type SkippedRow = { intRow: number; strCode: string; strDate: string; strMessage: string };

type ImportSummary = {
  strFileName: string;
  intTotal: number;
  intCreated: number;
  intUpdated: number;
  lstSkipped: SkippedRow[];
};

type AttendanceImportPanelProps = {
  blnCanManage: boolean;
  /** Called after rows were written to attendance (file import or folder import). */
  onImported?: (strLatestDate: string | null) => void;
};

/**
 * Import / folder-import controls shown on the Daily Attendance screen.
 *
 * Flow: pick a file -> columns are auto-mapped (or the user aligns them) -> every row that
 * maps cleanly is imported straight away, the rest are reported in a "skipped rows" list.
 */
export default function AttendanceImportPanel({ blnCanManage, onImported }: AttendanceImportPanelProps) {
  const { t } = useModuleLabels("attendance", "Unable to load attendance labels.");
  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blnBusy, setBlnBusy] = useState(false);
  const [objFile, setObjFile] = useState<File | null>(null);
  const [objMappingPreview, setObjMappingPreview] = useState<AttendanceImportPreviewResult | null>(null);
  const [dicMappingDraft, setDicMappingDraft] = useState<AttendanceImportMapping>({});
  const [objSummary, setObjSummary] = useState<ImportSummary | null>(null);
  const [strError, setStrError] = useState<string | null>(null);
  const [blnSkippedOpen, setBlnSkippedOpen] = useState(false);
  const [objScheduledResult, setObjScheduledResult] = useState<ScheduledImportRunResult | null>(null);

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
      const objResult = await attendanceService.runScheduledImport();
      setObjScheduledResult(objResult);
      if (objResult.intCreated + objResult.intUpdated > 0) onImported?.(null);
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("scheduled_import_failed", "Failed to run the folder import."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleFileSelected(objEvent: ChangeEvent<HTMLInputElement>) {
    const objPicked = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objPicked) return;
    setObjFile(objPicked);
    setObjSummary(null);
    setObjMappingPreview(null);
    setStrError(null);
    await runImport(objPicked);
  }

  // Auto-maps when no mapping is given; re-runs with the user's chosen mapping otherwise.
  async function runImport(objSource: File, dicMapping?: AttendanceImportMapping) {
    try {
      setBlnBusy(true);
      const objPreview = await attendanceService.previewImport(objSource, dicMapping);
      setDicMappingDraft(objPreview.dicMapping);
      if (objPreview.blnNeedsMapping) {
        setObjMappingPreview(objPreview);
        return;
      }
      setObjMappingPreview(null);

      const lstSkipped: SkippedRow[] = objPreview.lstRows
        .filter((objRow) => !objRow.blnValid)
        .map((objRow) => ({
          intRow: objRow.intExcelRowNumber,
          strCode: objRow.strEmployeeCode,
          strDate: objRow.dtWorkDate ?? objRow.strRawDate,
          strMessage: objRow.strErrorMessage ?? "-",
        }));
      const lstValid = objPreview.lstRows.filter((objRow) => objRow.blnValid && objRow.intEmployeeID && objRow.dtWorkDate);
      const lstCommitRows: AttendanceImportCommitRow[] = lstValid.map((objRow) => ({
        intExcelRowNumber: objRow.intExcelRowNumber,
        intEmployeeID: objRow.intEmployeeID as number,
        dtWorkDate: objRow.dtWorkDate as string,
        strStatus: objRow.strStatus,
        tmFirstIn: objRow.strFirstIn,
        tmLastOut: objRow.strLastOut,
        intShiftID: objRow.intShiftID,
      }));

      let intCreated = 0;
      let intUpdated = 0;
      if (lstCommitRows.length > 0) {
        const objCommit = await attendanceService.commitImport(lstCommitRows);
        intCreated = objCommit.intCreated;
        intUpdated = objCommit.intUpdated;
        const dicRowByNumber = new Map(lstValid.map((objRow) => [objRow.intExcelRowNumber, objRow]));
        for (const objFailure of objCommit.lstFailures) {
          const objRow = dicRowByNumber.get(objFailure.intExcelRowNumber);
          lstSkipped.push({
            intRow: objFailure.intExcelRowNumber,
            strCode: objRow?.strEmployeeCode ?? "-",
            strDate: objRow?.dtWorkDate ?? "-",
            strMessage: objFailure.strMessage,
          });
        }
      }
      lstSkipped.sort((objA, objB) => objA.intRow - objB.intRow);
      setObjSummary({ strFileName: objSource.name, intTotal: objPreview.intTotal, intCreated, intUpdated, lstSkipped });
      setObjFile(null);
      if (intCreated + intUpdated > 0) {
        const lstDates = lstValid.map((objRow) => objRow.dtWorkDate as string).sort();
        onImported?.(lstDates[lstDates.length - 1] ?? null);
      }
    } catch (objErr) {
      setStrError((objErr as Error)?.message || t("import_commit_failed", "Failed to import attendance data."));
    } finally {
      setBlnBusy(false);
    }
  }

  function handleMappingChange(strFieldKey: string, strValue: string) {
    setDicMappingDraft((objPrev) => ({ ...objPrev, [strFieldKey]: strValue === "" ? null : Number(strValue) }));
  }

  return (
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: 1 }}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />

      <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
        <Button
          data-control-id="attendance.daily.import.download-template.button"
          className={styles.secondaryButton}
          startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
        >
          {t("download_template", "Download Template")}
        </Button>
        {blnCanManage && (
          <>
            <Button
              data-control-id="attendance.daily.import.import-data.button"
              className={styles.primaryButton}
              startIcon={<UploadFileIcon />}
              onClick={() => objFileInputRef.current?.click()}
            >
              {t("import_data", "Import Data")}
            </Button>
            <input
              ref={objFileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls,.csv"
              hidden
              onChange={handleFileSelected}
              data-control-id="attendance.daily.import.file-input"
            />
            <Tooltip title={t("run_folder_import_hint", "Imports the files waiting in the configured inbox folder now - the same job that runs automatically every day at 11:00 AM.")}>
              <span>
                <Button
                  data-control-id="attendance.daily.import.run-folder-import.button"
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
      </Box>

      {strError && (
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      )}

      {objSummary && (
        <Alert
          severity={objSummary.lstSkipped.length > 0 ? "warning" : "success"}
          onClose={() => setObjSummary(null)}
          data-control-id="attendance.daily.import.result"
          action={
            objSummary.lstSkipped.length > 0 ? (
              <Button color="inherit" size="small" onClick={() => setBlnSkippedOpen(true)} data-control-id="attendance.daily.import.skipped.button">
                {t("view_skipped_rows", "View skipped rows")}
              </Button>
            ) : undefined
          }
        >
          {objSummary.strFileName}: {t("import_commit_summary", "Import complete")} - {objSummary.intCreated} {t("created", "created")}, {objSummary.intUpdated} {t("updated", "updated")}, {objSummary.lstSkipped.length} {t("skipped", "skipped")} ({t("total", "Total")}: {objSummary.intTotal}).
        </Alert>
      )}

      {objScheduledResult && (
        <Alert
          severity={objScheduledResult.intFilesFailed > 0 ? "warning" : objScheduledResult.intFilesFound === 0 ? "info" : "success"}
          onClose={() => setObjScheduledResult(null)}
          data-control-id="attendance.daily.import.scheduled-result"
        >
          {objScheduledResult.strNote
            ? objScheduledResult.strNote
            : objScheduledResult.intFilesFound === 0
              ? t("scheduled_no_files", "No files were waiting in the inbox folder.")
              : `${t("folder_import_complete", "Folder import complete")}: ${objScheduledResult.intFilesProcessed} ${t("files_processed", "file(s) processed")}, ${objScheduledResult.intFilesFailed} ${t("files_failed", "failed")}, ${objScheduledResult.intFilesDeferred} ${t("files_deferred", "deferred")}; ${objScheduledResult.intCreated} ${t("created", "created")}, ${objScheduledResult.intUpdated} ${t("updated", "updated")}, ${objScheduledResult.intSkipped} ${t("skipped", "skipped")}.`}
          {objScheduledResult.lstFiles.length > 0 && (
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {objScheduledResult.lstFiles.map((objScheduledFile) => (
                <li key={objScheduledFile.strFile}>
                  {objScheduledFile.strFile}: {objScheduledFile.strOutcome}
                  {objScheduledFile.strOutcome === "processed"
                    ? ` (${objScheduledFile.intCreated ?? 0} ${t("created", "created")}, ${objScheduledFile.intUpdated ?? 0} ${t("updated", "updated")}, ${objScheduledFile.intSkipped ?? 0} ${t("skipped", "skipped")}) - ${t("see_report", "row-level report saved in the processed folder")}`
                    : objScheduledFile.strMessage
                      ? ` - ${objScheduledFile.strMessage}`
                      : ""}
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {objMappingPreview && (
        <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {t("import_columns_mismatch", "The columns in this file do not match the expected fields. Align them below and apply.")}
            <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
              {objMappingPreview.lstMappingIssues.map((objIssue) => (
                <li key={`${objIssue.strFieldKey}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>
              ))}
            </Box>
          </Alert>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            {objMappingPreview.lstFields.map((objField) => (
              <TextField
                key={objField.strKey}
                select
                size="small"
                sx={{ minWidth: 190 }}
                label={`${objField.strLabel}${objField.blnRequired ? " *" : ""}`}
                error={objMappingPreview.lstMappingIssues.some((objIssue) => objIssue.strFieldKey === objField.strKey)}
                value={dicMappingDraft[objField.strKey] ?? ""}
                onChange={(objEvent) => handleMappingChange(objField.strKey, objEvent.target.value)}
                inputProps={{ "data-control-id": `attendance.daily.import.mapping.${objField.strKey}` }}
              >
                <MenuItem value="">{t("not_mapped", "— Not mapped —")}</MenuItem>
                {objMappingPreview.lstSourceColumns.map((objColumn) => (
                  <MenuItem key={objColumn.intIndex} value={objColumn.intIndex}>
                    {objColumn.strName}
                  </MenuItem>
                ))}
              </TextField>
            ))}
            <Button
              data-control-id="attendance.daily.import.apply-mapping.button"
              className={styles.primaryButton}
              disabled={!objFile}
              onClick={() => objFile && runImport(objFile, dicMappingDraft)}
            >
              {t("apply_mapping", "Apply Mapping & Import")}
            </Button>
            <Button className={styles.secondaryButton} onClick={() => { setObjMappingPreview(null); setObjFile(null); }}>
              {t("cancel", "Cancel")}
            </Button>
          </Box>
        </Box>
      )}

      <Dialog open={blnSkippedOpen} onClose={() => setBlnSkippedOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{`${t("skipped_rows", "Skipped rows")}: ${objSummary?.lstSkipped.length ?? 0}`}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {t("skipped_rows_hint", "These rows were not imported. Everything else in the file was imported.")}
          </Typography>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{t("row", "Row")}</TableCell>
                <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                <TableCell>{t("date", "Date")}</TableCell>
                <TableCell>{t("error", "Error")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(objSummary?.lstSkipped ?? []).map((objRow) => (
                <TableRow key={`${objRow.intRow}-${objRow.strMessage}`}>
                  <TableCell>{objRow.intRow}</TableCell>
                  <TableCell>{objRow.strCode}</TableCell>
                  <TableCell>{objRow.strDate}</TableCell>
                  <TableCell>{objRow.strMessage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnSkippedOpen(false)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
