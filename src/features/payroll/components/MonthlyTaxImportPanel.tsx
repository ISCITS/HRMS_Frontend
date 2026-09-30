"use client";

import { useRef, useState, type ReactNode, type ChangeEvent } from "react";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert, Box, Button, Checkbox, Chip, Paper, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";

import payrollStyles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  employeeMonthlyTaxService, type MonthlyTaxImportPreviewResult,
} from "@/features/payroll/services/employeeMonthlyTaxService";

export default function MonthlyTaxImportPanel({ onImported, objToolbarLeft }: { onImported?: () => void; objToolbarLeft?: ReactNode }) {
  const { t } = useModuleLabels("employee_monthly_tax");

  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strFileName, setStrFileName] = useState<string | null>(null);
  const [objPreview, setObjPreview] = useState<MonthlyTaxImportPreviewResult | null>(null);
  const [setSelectedRows, setSetSelectedRows] = useState<Set<number>>(new Set());
  const [strError, setStrError] = useState<string | null>(null);
  const [strCommitSummary, setStrCommitSummary] = useState<string | null>(null);

  async function handleDownloadTemplate() {
    try {
      setBlnBusy(true);
      await employeeMonthlyTaxService.downloadImportTemplate();
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("import_template_download_failed", "Failed to download the import template."));
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
    setStrCommitSummary(null);
    setStrError(null);
    try {
      setBlnBusy(true);
      const objResult = await employeeMonthlyTaxService.previewImport(objFile);
      setObjPreview(objResult);
      setSetSelectedRows(new Set(objResult.lstRows.filter((objRow) => objRow.blnValid).map((objRow) => objRow.intExcelRowNumber)));
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("import_preview_failed", "Failed to read the uploaded file."));
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

  async function handleConfirmImport() {
    if (!objPreview) return;
    const lstRowsToCommit = objPreview.lstRows.filter(
      (objRow) => objRow.blnValid && setSelectedRows.has(objRow.intExcelRowNumber),
    );
    if (lstRowsToCommit.length === 0) {
      setStrError(t("import_no_rows_selected", "Select at least one valid row to import."));
      return;
    }
    try {
      setBlnBusy(true);
      const objResult = await employeeMonthlyTaxService.commitImport(lstRowsToCommit);
      setStrCommitSummary(
        t("import_commit_summary", "Import complete: {created} created, {skipped} skipped.")
          .replace("{created}", String(objResult.intCreated))
          .replace("{skipped}", String(objResult.intSkipped)),
      );
      setObjPreview(null);
      setStrFileName(null);
      onImported?.();
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("import_commit_failed", "Failed to import monthly tax history."));
    } finally {
      setBlnBusy(false);
    }
  }

  const lstRows = objPreview?.lstRows ?? [];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
        {objToolbarLeft}
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", ml: "auto" }}>
          <Button className={payrollStyles.secondaryButton} disabled={blnBusy} variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} controlId="employee-monthly-tax.import.download-template.button">
            {t("download_template", "Download Template")}
          </Button>
          <Button className={payrollStyles.primaryButton} disabled={blnBusy} variant="contained" startIcon={<UploadFileIcon />} onClick={handlePickFile} controlId="employee-monthly-tax.import.import-data.button">
            {t("import_data", "Import Data")}
          </Button>
          <input ref={objFileInputRef} type="file" data-control-id="employee-monthly-tax.import.file.input" accept=".xlsx" hidden onChange={handleFileSelected} />
        </Box>
      </Box>
      {strFileName ? (
          <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
            {strFileName}
          </Typography>
        ) : null}

      {strCommitSummary ? (
        <Alert componentsProps={{ closeButton: { controlId: "employee-monthly-tax.import.success.close.button" } }} severity="success" sx={{ mt: 2 }} onClose={() => setStrCommitSummary(null)}>
          {strCommitSummary}
        </Alert>
      ) : null}

      {objPreview ? (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            {t("import_title", "Import Monthly Tax History")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
            <Chip label={`${t("total", "Total")}: ${objPreview.intTotalRows}`} />
            <Chip color="success" label={`${t("valid", "Valid")}: ${objPreview.intValidRows}`} />
            <Chip color="error" label={`${t("errors", "Errors")}: ${objPreview.intErrorRows}`} />
          </Box>
          <TableContainer sx={{ mb: 2, maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>{t("row", "Row")}</TableCell>
                  <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                  <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                  <TableCell>{t("month", "Month")}</TableCell>
                  <TableCell>{t("taxable", "Taxable")}</TableCell>
                  <TableCell>{t("tds", "TDS")}</TableCell>
                  <TableCell>{t("source_type", "Source Type")}</TableCell>
                  <TableCell>{t("result", "Result")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstRows.map((objRow) => (
                  <TableRow key={objRow.intExcelRowNumber} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        controlId={`employee-monthly-tax.import.row.${objRow.intExcelRowNumber}.checkbox`}
                        disabled={!objRow.blnValid}
                        checked={setSelectedRows.has(objRow.intExcelRowNumber)}
                        onChange={(objEvent) => toggleRow(objRow.intExcelRowNumber, objEvent.target.checked)}
                      />
                    </TableCell>
                    <TableCell>{objRow.intExcelRowNumber}</TableCell>
                    <TableCell>{objRow.strEmployeeCode}</TableCell>
                    <TableCell>{objRow.strEmployeeName ?? "-"}</TableCell>
                    <TableCell>{objRow.dtPeriodMonth ?? "-"}</TableCell>
                    <TableCell>{objRow.decTaxableIncome ?? "-"}</TableCell>
                    <TableCell>{objRow.decTds ?? "-"}</TableCell>
                    <TableCell>{objRow.strSourceType}</TableCell>
                    <TableCell>
                      {objRow.blnValid ? (
                        <Chip size="small" color="success" label={t("valid", "Valid")} />
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
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmImport}
            disabled={setSelectedRows.size === 0 || blnBusy}
            controlId="employee-monthly-tax.import.confirm.button"
          >
            {t("confirm_import", "Confirm Import")}
          </Button>
        </Paper>
      ) : null}

      <Snackbar open={Boolean(strError)} autoHideDuration={6000} onClose={() => setStrError(null)}>
        <Alert componentsProps={{ closeButton: { controlId: "employee-monthly-tax.import.error.close.button" } }} severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
