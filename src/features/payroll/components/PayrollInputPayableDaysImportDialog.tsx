"use client";

import { useRef, useState, type ChangeEvent } from "react";

import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  payableDaysImportService,
  type PayableDaysImportPreviewResult,
  type PayableDaysImportPreviewRow,
  type PayableDaysImportStatus,
} from "@/features/payroll/services/payableDaysImportService";

type Translate = (strKey: string, strFallback: string) => string;

type PayrollInputPayableDaysImportDialogProps = {
  blnOpen: boolean;
  intPayrollRunID: number;
  strRunLabel: string;
  objStatus: PayableDaysImportStatus | null;
  t: Translate;
  onClose: () => void;
  onImported: (strMessage: string) => void;
};

function formatDays(strValue: string | null) {
  if (strValue === null || strValue === undefined || strValue === "") return "-";
  const decValue = Number(strValue);
  return Number.isFinite(decValue)
    ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(decValue)
    : strValue;
}

function toNumberOrNull(strValue: string | null) {
  if (strValue === null || strValue === undefined || strValue === "") return null;
  const decValue = Number(strValue);
  return Number.isFinite(decValue) ? decValue : null;
}

export default function PayrollInputPayableDaysImportDialog({
  blnOpen,
  intPayrollRunID,
  strRunLabel,
  objStatus,
  t,
  onClose,
  onImported,
}: PayrollInputPayableDaysImportDialogProps) {
  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strFileName, setStrFileName] = useState<string | null>(null);
  const [objPreview, setObjPreview] = useState<PayableDaysImportPreviewResult | null>(null);
  const [setSelectedRows, setSetSelectedRows] = useState<Set<number>>(new Set());
  const [strError, setStrError] = useState("");

  function resetState() {
    setStrFileName(null);
    setObjPreview(null);
    setSetSelectedRows(new Set());
    setStrError("");
  }

  function handleClose() {
    if (blnBusy) return;
    resetState();
    onClose();
  }

  async function handleDownloadTemplate() {
    setStrError("");
    try {
      setBlnBusy(true);
      await payableDaysImportService.downloadImportTemplate(intPayrollRunID);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("payable_days_import_template_failed", "Failed to download the template."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleFileSelected(objEvent: ChangeEvent<HTMLInputElement>) {
    const objFile = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objFile) return;
    setStrFileName(objFile.name);
    setObjPreview(null);
    setStrError("");
    try {
      setBlnBusy(true);
      const objResult = await payableDaysImportService.previewImport(intPayrollRunID, objFile);
      setObjPreview(objResult);
      setSetSelectedRows(new Set(objResult.lstRows.filter((objRow) => objRow.blnValid).map((objRow) => objRow.intExcelRowNumber)));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("payable_days_import_preview_failed", "Failed to read the uploaded file."));
    } finally {
      setBlnBusy(false);
    }
  }

  function toggleRow(intExcelRowNumber: number, blnChecked: boolean) {
    setSetSelectedRows((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (blnChecked) objNext.add(intExcelRowNumber);
      else objNext.delete(intExcelRowNumber);
      return objNext;
    });
  }

  function toggleAll(blnChecked: boolean) {
    if (!objPreview) return;
    setSetSelectedRows(
      blnChecked
        ? new Set(objPreview.lstRows.filter((objRow) => objRow.blnValid).map((objRow) => objRow.intExcelRowNumber))
        : new Set()
    );
  }

  async function handleConfirm() {
    if (!objPreview) return;
    // The preview already holds the normalized values (defaults filled in), so the commit
    // saves exactly what was shown.
    const lstRows = objPreview.lstRows
      .filter((objRow) => objRow.blnValid && setSelectedRows.has(objRow.intExcelRowNumber))
      .map((objRow) => ({
        intExcelRowNumber: objRow.intExcelRowNumber,
        strEmployeeCode: objRow.strEmployeeCode,
        decCalendarDays: toNumberOrNull(objRow.decCalendarDays),
        decWorkingDays: toNumberOrNull(objRow.decWorkingDays),
        decPayableDays: toNumberOrNull(objRow.decPayableDays) ?? 0,
        decLwpDays: toNumberOrNull(objRow.decLwpDays),
        decLopDays: toNumberOrNull(objRow.decLopDays),
        decPaidDays: toNumberOrNull(objRow.decPaidDays),
        strRemarks: objRow.strRemarks,
      }));
    if (lstRows.length === 0) {
      setStrError(t("payable_days_import_no_rows", "Select at least one valid row to import."));
      return;
    }
    setStrError("");
    try {
      setBlnBusy(true);
      const objResult = await payableDaysImportService.commitImport({
        intPayrollRunID,
        strFileName,
        strFileChecksum: objPreview.strFileChecksum,
        lstRows,
      });
      let strMessage = t(
        "payable_days_import_done",
        "Payable days imported: {{created}} added, {{updated}} updated, {{skipped}} skipped."
      )
        .replace("{{created}}", String(objResult.intCreated))
        .replace("{{updated}}", String(objResult.intUpdated))
        .replace("{{skipped}}", String(objResult.intSkipped));
      if (objResult.blnReprocessRequired) {
        strMessage += ` ${t("payable_days_import_reprocess", "Reprocess the payroll run to apply it.")}`;
      }
      resetState();
      onImported(strMessage);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("payable_days_import_failed", "Failed to import payable days."));
    } finally {
      setBlnBusy(false);
    }
  }

  const intSelectedCount = setSelectedRows.size;
  const blnAllSelected = !!objPreview && objPreview.intValidRows > 0 && intSelectedCount === objPreview.intValidRows;

  function renderResult(objRow: PayableDaysImportPreviewRow) {
    if (!objRow.blnValid) {
      return (
        <Tooltip title={objRow.strErrorMessage ?? ""}>
          <Chip size="small" color="error" label={objRow.strErrorMessage ?? t("error", "Error")} sx={{ maxWidth: 280 }} />
        </Tooltip>
      );
    }
    if (objRow.lstWarnings.length > 0) {
      return (
        <Tooltip title={objRow.lstWarnings.join(" ")}>
          <Chip size="small" color="warning" icon={<WarningAmberRoundedIcon />} label={t("valid_with_warning", "Valid - see note")} />
        </Tooltip>
      );
    }
    return <Chip size="small" color="success" label={t("valid", "Valid")} />;
  }

  return (
    <Dialog open={blnOpen} onClose={handleClose} maxWidth="xl" fullWidth data-controlid="employee-payroll-input.payable-days-import.dialog">
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t("payable_days_import_title", "Import Payable Days")} - {strRunLabel}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(
            "payable_days_import_help",
            "Upload the payable days sheet for this run. Each row sets the employee's Calendar, Working, Payable, LWP, LOP and Paid days in Payroll Input. Blank optional columns are filled in (Calendar = days of the month, Working = Calendar, LWP/LOP = 0, Paid = Payable - LWP - LOP). Only employees in the sheet change, adjustment lines such as TDS are not touched, and imported days are not overwritten by an attendance refresh."
          )}
        </Alert>
        {objStatus && objStatus.intEmployeesWithImportedDays > 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("payable_days_import_last", "Employees with imported payable days")}: {objStatus.intEmployeesWithImportedDays}
            {objStatus.dtLastImportedOn
              ? ` · ${t("payable_days_import_last_on", "Last import")}: ${new Date(objStatus.dtLastImportedOn).toLocaleString("en-IN")}`
              : ""}
          </Typography>
        ) : null}

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} data-controlid="employee-payroll-input.payable-days-import.template.button">
            {t("payable_days_import_download_template", "Download Template")}
          </Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => objFileInputRef.current?.click()} data-controlid="employee-payroll-input.payable-days-import.upload.button">
            {t("payable_days_import_upload", "Upload Sheet")}
          </Button>
          <input ref={objFileInputRef} type="file" accept=".xlsx" hidden onChange={handleFileSelected} data-controlid="employee-payroll-input.payable-days-import.file-input" />
          {strFileName ? <Typography variant="body2" color="text.secondary">{strFileName}</Typography> : null}
        </Box>

        {strError ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStrError("")}>{strError}</Alert> : null}

        {objPreview ? (
          <>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <Chip label={`${t("total", "Total")}: ${objPreview.intTotalRows}`} />
              <Chip color="success" label={`${t("valid", "Valid")}: ${objPreview.intValidRows}`} />
              <Chip color="error" label={`${t("errors", "Errors")}: ${objPreview.intErrorRows}`} />
              {objPreview.intWarningRows > 0 ? (
                <Chip color="warning" label={`${t("warnings", "With notes")}: ${objPreview.intWarningRows}`} />
              ) : null}
              <Chip label={`${t("payable_days_import_run_employees", "Employees in run")}: ${objPreview.intRunEmployeeCount}`} />
              <Chip label={`${t("payable_days_import_not_in_sheet", "Not in sheet (unchanged)")}: ${objPreview.intEmployeesNotInSheet}`} />
              <Chip label={`${t("payable_days_import_month_days", "Days in month")}: ${formatDays(objPreview.decMonthCalendarDays)}`} />
            </Box>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={blnAllSelected}
                        indeterminate={intSelectedCount > 0 && !blnAllSelected}
                        disabled={objPreview.intValidRows === 0}
                        onChange={(objEvent) => toggleAll(objEvent.target.checked)}
                        data-controlid="employee-payroll-input.payable-days-import.select-all.checkbox"
                      />
                    </TableCell>
                    <TableCell>{t("row", "Row")}</TableCell>
                    <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                    <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                    <TableCell align="right">{t("current_payable_days", "Current Payable")}</TableCell>
                    <TableCell align="right">{t("calendar_days", "Calendar Days")}</TableCell>
                    <TableCell align="right">{t("working_days", "Working Days")}</TableCell>
                    <TableCell align="right">{t("payable_days", "Payable Days")}</TableCell>
                    <TableCell align="right">{t("lwp", "LWP")}</TableCell>
                    <TableCell align="right">{t("lop", "LOP")}</TableCell>
                    <TableCell align="right">{t("paid_days", "Paid Days")}</TableCell>
                    <TableCell>{t("remarks", "Remarks")}</TableCell>
                    <TableCell>{t("result", "Result")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {objPreview.lstRows.map((objRow) => {
                    const blnChanged =
                      objRow.decCurrentPayableDays !== null && objRow.decPayableDays !== null
                        ? Number(objRow.decCurrentPayableDays) !== Number(objRow.decPayableDays)
                        : false;
                    return (
                      <TableRow key={objRow.intExcelRowNumber} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            disabled={!objRow.blnValid}
                            checked={setSelectedRows.has(objRow.intExcelRowNumber)}
                            onChange={(objEvent) => toggleRow(objRow.intExcelRowNumber, objEvent.target.checked)}
                            data-controlid={`employee-payroll-input.payable-days-import.row-${objRow.intExcelRowNumber}.checkbox`}
                          />
                        </TableCell>
                        <TableCell>{objRow.intExcelRowNumber}</TableCell>
                        <TableCell>{objRow.strEmployeeCode || "-"}</TableCell>
                        <TableCell>{objRow.strEmployeeName ?? "-"}</TableCell>
                        <TableCell align="right">{formatDays(objRow.decCurrentPayableDays)}</TableCell>
                        <TableCell align="right">{formatDays(objRow.decCalendarDays)}</TableCell>
                        <TableCell align="right">{formatDays(objRow.decWorkingDays)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: blnChanged ? "#b45309" : undefined }}>
                          {formatDays(objRow.decPayableDays)}
                        </TableCell>
                        <TableCell align="right">{formatDays(objRow.decLwpDays)}</TableCell>
                        <TableCell align="right">{formatDays(objRow.decLopDays)}</TableCell>
                        <TableCell align="right">{formatDays(objRow.decPaidDays)}</TableCell>
                        <TableCell>{objRow.strRemarks ?? "-"}</TableCell>
                        <TableCell>{renderResult(objRow)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={blnBusy} data-controlid="employee-payroll-input.payable-days-import.cancel.button">
          {t("cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={blnBusy || !objPreview || intSelectedCount === 0}
          data-controlid="employee-payroll-input.payable-days-import.confirm.button"
        >
          {t("payable_days_import_confirm", "Import")} {objPreview ? `(${intSelectedCount})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
