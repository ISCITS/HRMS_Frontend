"use client";

import { useRef, useState, type ChangeEvent } from "react";

import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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
import { tdsService, type TdsImportPreviewResult, type TdsImportStatus } from "@/features/payroll/services/tdsService";

type Translate = (strKey: string, strFallback: string) => string;

type PayrollInputTdsImportDialogProps = {
  blnOpen: boolean;
  intPayrollRunID: number;
  strRunLabel: string;
  objStatus: TdsImportStatus | null;
  t: Translate;
  onClose: () => void;
  onImported: (strMessage: string) => void;
};

function formatAmount(strValue: string | null) {
  if (strValue === null || strValue === undefined || strValue === "") return "-";
  const decValue = Number(strValue);
  return Number.isFinite(decValue)
    ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(decValue)
    : strValue;
}

export default function PayrollInputTdsImportDialog({
  blnOpen,
  intPayrollRunID,
  strRunLabel,
  objStatus,
  t,
  onClose,
  onImported,
}: PayrollInputTdsImportDialogProps) {
  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strFileName, setStrFileName] = useState<string | null>(null);
  const [objPreview, setObjPreview] = useState<TdsImportPreviewResult | null>(null);
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
      await tdsService.downloadImportTemplate(intPayrollRunID);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("tds_import_template_failed", "Failed to download the template."));
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
      const objResult = await tdsService.previewImport(intPayrollRunID, objFile);
      setObjPreview(objResult);
      setSetSelectedRows(new Set(objResult.lstRows.filter((objRow) => objRow.blnValid).map((objRow) => objRow.intExcelRowNumber)));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("tds_import_preview_failed", "Failed to read the uploaded file."));
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

  async function handleConfirm() {
    if (!objPreview) return;
    const lstRows = objPreview.lstRows
      .filter((objRow) => objRow.blnValid && setSelectedRows.has(objRow.intExcelRowNumber))
      .map((objRow) => ({
        intExcelRowNumber: objRow.intExcelRowNumber,
        strEmployeeCode: objRow.strEmployeeCode,
        decTdsAmount: Number(objRow.decTdsAmount),
        strRemarks: objRow.strRemarks,
      }));
    if (lstRows.length === 0) {
      setStrError(t("tds_import_no_rows", "Select at least one valid row to import."));
      return;
    }
    setStrError("");
    try {
      setBlnBusy(true);
      const objResult = await tdsService.commitImport({
        intPayrollRunID,
        strFileName,
        strFileChecksum: objPreview.strFileChecksum,
        lstRows,
      });
      let strMessage = t(
        "tds_import_done",
        "TDS imported: {{created}} added, {{updated}} updated, {{removed}} removed (now 0), {{skipped}} skipped."
      )
        .replace("{{created}}", String(objResult.intCreated))
        .replace("{{updated}}", String(objResult.intUpdated))
        .replace("{{removed}}", String(objResult.intRemoved))
        .replace("{{skipped}}", String(objResult.intSkipped));
      if (objResult.blnReprocessRequired) {
        strMessage += ` ${t("tds_import_reprocess", "Reprocess the payroll run to apply it.")}`;
      }
      resetState();
      onImported(strMessage);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("tds_import_failed", "Failed to import TDS."));
    } finally {
      setBlnBusy(false);
    }
  }

  const intSelectedCount = setSelectedRows.size;
  const intUnselectedValidCount = objPreview ? objPreview.intValidRows - intSelectedCount : 0;

  return (
    <Dialog open={blnOpen} onClose={handleClose} maxWidth="lg" fullWidth data-controlid="employee-payroll-input.tds-import.dialog">
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t("tds_import_title", "Import TDS")} - {strRunLabel}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t(
            "tds_import_help",
            "This month's TDS mode is Client provided. The sheet is the complete client TDS list for this run: the TDS Amount is deducted exactly as given, employees not in the sheet get 0 TDS, and importing again replaces the previous import. The system still calculates its own TDS for comparison."
          )}
        </Alert>
        {objStatus?.objLastImport ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("tds_import_last", "Last import")}: {objStatus.objLastImport.strFileName ?? "-"} ·{" "}
            {objStatus.objLastImport.dtImportedOn ? new Date(objStatus.objLastImport.dtImportedOn).toLocaleString("en-IN") : "-"} ·{" "}
            {objStatus.objLastImport.intImportedRowCount} {t("tds_import_rows", "rows")} · {t("tds_import_total", "Total")}{" "}
            {formatAmount(objStatus.objLastImport.decTotalTdsAmount)}
          </Typography>
        ) : null}

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} data-controlid="employee-payroll-input.tds-import.template.button">
            {t("tds_import_download_template", "Download Template")}
          </Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => objFileInputRef.current?.click()} data-controlid="employee-payroll-input.tds-import.upload.button">
            {t("tds_import_upload", "Upload Sheet")}
          </Button>
          <input ref={objFileInputRef} type="file" accept=".xlsx" hidden onChange={handleFileSelected} data-controlid="employee-payroll-input.tds-import.file-input" />
          {strFileName ? <Typography variant="body2" color="text.secondary">{strFileName}</Typography> : null}
        </Box>

        {strError ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStrError("")}>{strError}</Alert> : null}

        {objPreview ? (
          <>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <Chip label={`${t("total", "Total")}: ${objPreview.intTotalRows}`} />
              <Chip color="success" label={`${t("valid", "Valid")}: ${objPreview.intValidRows}`} />
              <Chip color="error" label={`${t("errors", "Errors")}: ${objPreview.intErrorRows}`} />
              <Chip label={`${t("tds_import_run_employees", "Employees in run")}: ${objPreview.intRunEmployeeCount}`} />
              <Chip
                color={objPreview.intEmployeesWithoutClientTds > 0 ? "warning" : "default"}
                label={`${t("tds_import_without_tds", "Will get 0 TDS (not in sheet)")}: ${objPreview.intEmployeesWithoutClientTds}`}
              />
            </Box>
            {objPreview.lstRemovedEmployees.length > 0 ? (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {t("tds_import_removed", "Previously imported TDS will be removed (back to 0) for")} {objPreview.lstRemovedEmployees.length}{" "}
                {t("tds_import_employees", "employee(s)")}:{" "}
                {objPreview.lstRemovedEmployees.slice(0, 15).map((objRow) => objRow.strEmployeeCode).join(", ")}
                {objPreview.lstRemovedEmployees.length > 15 ? ` (+${objPreview.lstRemovedEmployees.length - 15})` : ""}
              </Alert>
            ) : null}
            {intUnselectedValidCount > 0 ? (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {t("tds_import_unselected", "Unticked valid rows are not imported, so those employees will have 0 TDS:")} {intUnselectedValidCount}
              </Alert>
            ) : null}
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>{t("row", "Row")}</TableCell>
                    <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                    <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                    <TableCell align="right">{t("tds_import_client_tds", "Client TDS")}</TableCell>
                    <TableCell align="right">{t("tds_import_system_tds", "System TDS")}</TableCell>
                    <TableCell align="right">{t("tds_import_difference", "Difference")}</TableCell>
                    <TableCell align="right">{t("tds_import_current", "Current Input")}</TableCell>
                    <TableCell>{t("remarks", "Remarks")}</TableCell>
                    <TableCell>{t("result", "Result")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {objPreview.lstRows.map((objRow) => {
                    const decDifference = Number(objRow.decDifference ?? 0);
                    return (
                      <TableRow key={objRow.intExcelRowNumber} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            disabled={!objRow.blnValid}
                            checked={setSelectedRows.has(objRow.intExcelRowNumber)}
                            onChange={(objEvent) => toggleRow(objRow.intExcelRowNumber, objEvent.target.checked)}
                            data-controlid={`employee-payroll-input.tds-import.row-${objRow.intExcelRowNumber}.checkbox`}
                          />
                        </TableCell>
                        <TableCell>{objRow.intExcelRowNumber}</TableCell>
                        <TableCell>{objRow.strEmployeeCode || "-"}</TableCell>
                        <TableCell>{objRow.strEmployeeName ?? "-"}</TableCell>
                        <TableCell align="right">{formatAmount(objRow.decTdsAmount)}</TableCell>
                        <TableCell align="right">{formatAmount(objRow.decSystemTds)}</TableCell>
                        <TableCell align="right" sx={{ color: decDifference > 0 ? "#b45309" : decDifference < 0 ? "#b91c1c" : undefined }}>
                          {formatAmount(objRow.decDifference)}
                        </TableCell>
                        <TableCell align="right">{formatAmount(objRow.decCurrentTds)}</TableCell>
                        <TableCell>{objRow.strRemarks ?? "-"}</TableCell>
                        <TableCell>
                          {objRow.blnValid ? (
                            <Chip size="small" color="success" label={t("valid", "Valid")} />
                          ) : (
                            <Tooltip title={objRow.strErrorMessage ?? ""}>
                              <Chip size="small" color="error" label={objRow.strErrorMessage ?? t("error", "Error")} sx={{ maxWidth: 260 }} />
                            </Tooltip>
                          )}
                        </TableCell>
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
        <Button onClick={handleClose} disabled={blnBusy} data-controlid="employee-payroll-input.tds-import.cancel.button">
          {t("cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={blnBusy || !objPreview || intSelectedCount === 0}
          data-controlid="employee-payroll-input.tds-import.confirm.button"
        >
          {t("tds_import_confirm", "Import")} {objPreview ? `(${intSelectedCount})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
