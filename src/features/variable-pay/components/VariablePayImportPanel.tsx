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

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { variablePayService } from "@/features/variable-pay/services/variablePayService";
import type { VariablePayImportPreviewResult } from "@/features/variable-pay/types";

type VariablePayImportPanelProps = {
  intRunID: number;
  onImported?: () => void;
  blnInlineActions?: boolean;
};

export default function VariablePayImportPanel({ intRunID, onImported, blnInlineActions = false }: VariablePayImportPanelProps) {
  const { t } = useModuleLabels("variable-pay", "Unable to load Monthly Variable Pay labels.");

  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strFileName, setStrFileName] = useState<string | null>(null);
  const [objPreview, setObjPreview] = useState<VariablePayImportPreviewResult | null>(null);
  const [setSelectedRows, setSetSelectedRows] = useState<Set<number>>(new Set());
  const [strError, setStrError] = useState<string | null>(null);
  const [strCommitSummary, setStrCommitSummary] = useState<string | null>(null);

  async function handleDownloadTemplate() {
    try {
      setBlnBusy(true);
      await variablePayService.downloadImportTemplate(intRunID);
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
      const objResult = await variablePayService.previewImport(intRunID, objFile);
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
    const lstRowsToCommit = objPreview.lstRows
      .filter((objRow) => objRow.blnValid && setSelectedRows.has(objRow.intExcelRowNumber))
      .map((objRow) => ({
        strEmployeeCode: objRow.strEmployeeCode,
        decAmount: Number(objRow.decAmount),
        strRemarks: objRow.strRemarks,
        strExternalReference: objRow.strExternalReference,
      }));
    if (lstRowsToCommit.length === 0) {
      setStrError(t("import_no_rows_selected", "Select at least one valid row to import."));
      return;
    }
    try {
      setBlnBusy(true);
      const objResult = await variablePayService.commitImport(intRunID, lstRowsToCommit);
      setStrCommitSummary(
        t("import_commit_summary", "Import complete: {{created}} created, {{updated}} updated, {{skipped}} skipped.")
          .replace("{{created}}", String(objResult.intCreated))
          .replace("{{updated}}", String(objResult.intUpdated))
          .replace("{{skipped}}", String(objResult.intSkipped)),
      );
      setObjPreview(null);
      setStrFileName(null);
      onImported?.();
    } catch (objErr) {
      setStrError((objErr as Error)?.message ?? t("import_commit_failed", "Failed to import Variable Pay data."));
    } finally {
      setBlnBusy(false);
    }
  }

  const lstRows = objPreview?.lstRows ?? [];

  const objPanelContent = (
    <>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
      {!blnInlineActions ? (
        <>
          <Typography variant="h6" gutterBottom>
            {t("import_title", "Import Variable Pay")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t(
              "import_description",
              "Bulk-load Variable Pay amounts. Download the template, fill it in, then upload it below for review before committing.",
            )}
          </Typography>
        </>
      ) : null}

      <Box sx={{ display: "flex", gap: 2, mb: objPreview || strCommitSummary ? 2 : 0, flexWrap: "wrap", justifyContent: blnInlineActions ? "flex-end" : "flex-start" }}>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} data-controlid="variable-pay.import.download-template.button">
          {t("download_template", "Download Template")}
        </Button>
        <Button variant="contained" startIcon={<UploadFileIcon />} onClick={handlePickFile} data-controlid="variable-pay.import.import-data.button">
          {t("import_data", "Import Data")}
        </Button>
        <input ref={objFileInputRef} type="file" accept=".xlsx" hidden onChange={handleFileSelected} data-controlid="variable-pay.import.file-input" />
        {strFileName ? (
          <Typography variant="body2" sx={{ alignSelf: "center" }} color="text.secondary">
            {strFileName}
          </Typography>
        ) : null}
      </Box>

      {strCommitSummary ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setStrCommitSummary(null)}>
          {strCommitSummary}
        </Alert>
      ) : null}

      {objPreview ? (
        <>
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
                  <TableCell>{t("amount", "Amount")}</TableCell>
                  <TableCell>{t("remarks", "Remarks")}</TableCell>
                  <TableCell>{t("result", "Result")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstRows.map((objRow) => (
                  <TableRow key={objRow.intExcelRowNumber} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        data-controlid={`variable-pay.import.row-${objRow.intExcelRowNumber}.checkbox`}
                        disabled={!objRow.blnValid}
                        checked={setSelectedRows.has(objRow.intExcelRowNumber)}
                        onChange={(objEvent) => toggleRow(objRow.intExcelRowNumber, objEvent.target.checked)}
                      />
                    </TableCell>
                    <TableCell>{objRow.intExcelRowNumber}</TableCell>
                    <TableCell>{objRow.strEmployeeCode}</TableCell>
                    <TableCell>{objRow.strEmployeeName ?? "-"}</TableCell>
                    <TableCell>{objRow.decAmount}</TableCell>
                    <TableCell>{objRow.strRemarks ?? "-"}</TableCell>
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
            disabled={setSelectedRows.size === 0}
            data-controlid="variable-pay.import.confirm.button"
          >
            {t("confirm_import", "Confirm Import")}
          </Button>
        </>
      ) : null}

      <Snackbar open={Boolean(strError)} autoHideDuration={6000} onClose={() => setStrError(null)}>
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      </Snackbar>
    </>
  );

  if (blnInlineActions) {
    return <Box sx={{ width: "100%" }}>{objPanelContent}</Box>;
  }

  return (
    <Paper sx={{ p: 2 }}>
      {objPanelContent}
    </Paper>
  );
}
