"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import BlockingLoader from "@/components/shared/BlockingLoader";
import EmployeeSalaryImportChangesDialog, {
  SalaryImportActionChip,
  formatImportAmount,
  formatImportDate,
} from "@/features/employee-salary/components/EmployeeSalaryImportChangesDialog";
import {
  SALARY_IMPORT_MAX_FILE_BYTES,
  SALARY_IMPORT_SAVE_ACTIONS,
  employeeSalaryImportService,
  rowKey,
  type SalaryImportCommitResult,
  type SalaryImportPreview,
  type SalaryImportStatus,
} from "@/features/employee-salary/services/employeeSalaryImportService";

type Translate = (strKey: string, strFallback: string) => string;

type Props = {
  blnOpen: boolean;
  objStatus: SalaryImportStatus | null;
  t: Translate;
  onClose: () => void;
  onImported: (strMessage: string) => void;
};

function defaultMonth(objStatus: SalaryImportStatus | null) {
  return (objStatus?.dtDefaultSalaryMonth ?? new Date().toISOString()).slice(0, 7);
}

function monthLabel(strMonth: string) {
  const objDate = new Date(`${strMonth.slice(0, 7)}-01T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strMonth : new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(objDate);
}

function SummaryCard({ strLabel, intValue, strTone, strHint }: { strLabel: string; intValue: number | string; strTone: string; strHint?: string }) {
  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${strTone}`, borderRadius: "8px", px: 1.5, py: 1, bgcolor: "#fff", minWidth: 0 }}>
      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{strLabel}</Typography>
      <Typography sx={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{intValue}</Typography>
      {strHint ? <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>{strHint}</Typography> : null}
    </Box>
  );
}

export default function EmployeeSalaryImportDialog({ blnOpen, objStatus, t, onClose, onImported }: Props) {
  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [strSalaryMonth, setStrSalaryMonth] = useState(defaultMonth(objStatus));
  const [blnBusy, setBlnBusy] = useState(false);
  const [strFileName, setStrFileName] = useState<string | null>(null);
  const [objPreview, setObjPreview] = useState<SalaryImportPreview | null>(null);
  const [setSelectedRows, setSetSelectedRows] = useState<Set<number>>(new Set());
  const [strError, setStrError] = useState("");
  const [blnChangesOpen, setBlnChangesOpen] = useState(false);
  const [blnConfirmOpen, setBlnConfirmOpen] = useState(false);
  const [objResult, setObjResult] = useState<SalaryImportCommitResult | null>(null);

  const lstChangeRows = useMemo(
    () => (objPreview ? objPreview.lstRows.filter((objRow) => SALARY_IMPORT_SAVE_ACTIONS.includes(objRow.strAction)) : []),
    [objPreview]
  );
  const lstErrorRows = useMemo(() => (objPreview ? objPreview.lstRows.filter((objRow) => objRow.strAction === "ERROR") : []), [objPreview]);
  const intSelected = lstChangeRows.filter((objRow) => setSelectedRows.has(rowKey(objRow))).length;
  const intConfirmPending = lstChangeRows.filter((objRow) => objRow.blnNeedsConfirmation && !setSelectedRows.has(rowKey(objRow))).length;
  const intConfirmed = lstChangeRows.filter((objRow) => objRow.blnNeedsConfirmation && setSelectedRows.has(rowKey(objRow))).length;

  function resetPreview() {
    setStrFileName(null);
    setObjPreview(null);
    setSetSelectedRows(new Set());
    setStrError("");
    setObjResult(null);
  }

  function handleClose() {
    if (blnBusy) return;
    const objDone = objResult;
    resetPreview();
    setStrSalaryMonth(defaultMonth(objStatus));
    if (objDone) {
      let strMessage = t("employee_salary_import_done_message", "Salary import saved: {{saved}} employee(s) updated.").replace("{{saved}}", String(objDone.intSaved));
      if (objDone.lstPaidPayrollMonths.length > 0) {
        strMessage += ` ${t("employee_salary_import_reprocess_hint", "Reprocess payroll for")} ${objDone.lstPaidPayrollMonths.join(", ")}.`;
      }
      onImported(strMessage);
      return;
    }
    onClose();
  }

  async function handleDownloadTemplate() {
    setStrError("");
    try {
      setBlnBusy(true);
      await employeeSalaryImportService.downloadTemplate(strSalaryMonth);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("employee_salary_import_template_failed", "Failed to download the template."));
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleFileSelected(objEvent: ChangeEvent<HTMLInputElement>) {
    const objFile = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objFile) return;
    resetPreview();
    if (!objFile.name.toLowerCase().endsWith(".xlsx")) {
      setStrError(t("employee_salary_import_only_xlsx", "Only .xlsx files can be imported. Use the template downloaded from this screen."));
      return;
    }
    if (objFile.size > SALARY_IMPORT_MAX_FILE_BYTES) {
      setStrError(t("employee_salary_import_too_large", "The file is larger than 5 MB."));
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(strSalaryMonth)) {
      setStrError(t("employee_salary_import_month_required", "Select the salary month first."));
      return;
    }
    setStrFileName(objFile.name);
    try {
      setBlnBusy(true);
      const objResultPreview = await employeeSalaryImportService.previewImport(strSalaryMonth, objFile);
      setObjPreview(objResultPreview);
      // Clean changes are pre-selected; anything with a warning waits for an explicit tick.
      setSetSelectedRows(
        new Set(
          objResultPreview.lstRows
            .filter((objRow) => SALARY_IMPORT_SAVE_ACTIONS.includes(objRow.strAction) && !objRow.blnNeedsConfirmation)
            .map(rowKey)
        )
      );
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("employee_salary_import_preview_failed", "Failed to read the uploaded file."));
    } finally {
      setBlnBusy(false);
    }
  }

  function toggleRows(lstKeys: number[], blnChecked: boolean) {
    setSetSelectedRows((objPrevious) => {
      const objNext = new Set(objPrevious);
      lstKeys.forEach((intKey) => (blnChecked ? objNext.add(intKey) : objNext.delete(intKey)));
      return objNext;
    });
  }

  async function handleImport() {
    if (!objPreview) return;
    setBlnConfirmOpen(false);
    setStrError("");
    try {
      setBlnBusy(true);
      // A ticked row that needs confirmation is the user's confirmation of its warning.
      setObjResult(await employeeSalaryImportService.commitImport(objPreview, setSelectedRows, setSelectedRows));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("employee_salary_import_failed", "Salary import failed. Nothing was saved."));
    } finally {
      setBlnBusy(false);
    }
  }

  const objSummary = objPreview?.objSummary;
  const decGrossDiff = objSummary ? objSummary.decNewGrossTotal - objSummary.decCurrentGrossTotal : 0;

  return (
    <>
      <Dialog open={blnOpen} onClose={handleClose} maxWidth="lg" fullWidth data-controlid="employee-salary.import.dialog">
        <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />
        <DialogTitle sx={{ fontWeight: 800 }}>{t("employee_salary_import_title", "Import Salary")}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc" }}>
          {objResult ? (
            <Box data-controlid="employee-salary.import.result">
              <Alert icon={<CheckCircleRoundedIcon />} severity="success" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {t("employee_salary_import_saved", "Salary import saved for")} {monthLabel(strSalaryMonth)}
                </Typography>
                {objResult.intRevision} {t("employee_salary_import_revisions", "revision(s)")} · {objResult.intNew}{" "}
                {t("employee_salary_import_new_salaries", "new salary(ies)")} · {objResult.intCorrection}{" "}
                {t("employee_salary_import_corrections", "correction(s)")} · {t("employee_salary_import_reference", "Import reference")} #{objResult.intImportBatchID}
              </Alert>
              {objResult.lstPaidPayrollMonths.length > 0 ? (
                <Alert severity="warning">
                  {t("employee_salary_import_paid_after", "Payroll was already processed for")} {objResult.lstPaidPayrollMonths.join(", ")}.{" "}
                  {t("employee_salary_import_paid_after_hint", "Reprocess those runs (or check arrears) so the new salaries are paid.")}
                </Alert>
              ) : null}
            </Box>
          ) : (
            <>
              {objStatus?.objLastImport ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t("employee_salary_import_last", "Last import")}: {monthLabel(objStatus.objLastImport.dtSalaryMonth)} ·{" "}
                  {objStatus.objLastImport.strFileName ?? "-"} · {objStatus.objLastImport.intSavedCount}{" "}
                  {t("employee_salary_import_employees_updated", "employee(s) updated")} ·{" "}
                  {objStatus.objLastImport.dtImportedOn ? new Date(objStatus.objLastImport.dtImportedOn).toLocaleString("en-IN") : "-"}
                </Typography>
              ) : null}

              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#fff", p: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>1. {t("employee_salary_import_step_template", "Salary month and template")}</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                  <TextField
                    type="month"
                    size="small"
                    label={t("employee_salary_import_month", "Salary month")}
                    value={strSalaryMonth}
                    onChange={(objEvent) => {
                      setStrSalaryMonth(objEvent.target.value);
                      resetPreview();
                    }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ "data-controlid": "employee-salary.import.month.input" }}
                    sx={{ width: 200 }}
                  />
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} disabled={!strSalaryMonth} data-controlid="employee-salary.import.template.button">
                    {t("employee_salary_import_download_template", "Download Template")}
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 280px" }}>
                    {t(
                      "employee_salary_import_template_help",
                      "The template lists every employee active in the month with their current salary. Change only what changed and upload it."
                    )}
                  </Typography>
                </Box>
                <Accordion disableGutters elevation={0} sx={{ mt: 1.5, border: "1px solid #e8eef5", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} data-controlid="employee-salary.import.howto.toggle">
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{t("employee_salary_import_howto", "How to fill the template")}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ fontSize: "0.85rem", color: "#334155" }}>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
                      <li>{t("employee_salary_import_rule_code", "Employee Code: one row per employee; do not repeat a code.")}</li>
                      <li>{t("employee_salary_import_rule_structure", "Salary Structure Code: pre-filled with the current structure. Change it to move the employee (codes are on the Structures sheet).")}</li>
                      <li>{t("employee_salary_import_rule_from", "Effective From: blank means the 1st of the salary month. An earlier date is a backdated change and needs confirmation.")}</li>
                      <li>{t("employee_salary_import_rule_amounts", "Green amount columns are monthly amounts. Pre-filled values are today's fixed amounts; a blank cell lets the salary structure calculate it.")}</li>
                      <li>{t("employee_salary_import_rule_nochange", "Rows that are the same as today's salary are skipped, so you can upload the whole template.")}</li>
                      <li>{t("employee_salary_import_rule_format", "Only .xlsx files made from this template (max 5 MB). Do not rename sheets or column headers.")}</li>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Box>

              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#fff", p: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>2. {t("employee_salary_import_step_upload", "Upload the filled template")}</Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                  <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => objFileInputRef.current?.click()} data-controlid="employee-salary.import.upload.button">
                    {t("employee_salary_import_upload", "Upload File")}
                  </Button>
                  <input
                    ref={objFileInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    hidden
                    onChange={handleFileSelected}
                    data-controlid="employee-salary.import.file-input"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {strFileName ?? t("employee_salary_import_no_file", "No file selected (.xlsx only)")}
                  </Typography>
                </Box>
              </Box>

              {strError ? (
                <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-line" }} onClose={() => setStrError("")} data-controlid="employee-salary.import.error.alert">
                  {strError}
                </Alert>
              ) : null}

              {objPreview && objSummary ? (
                <Box sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#fff", p: 2 }} data-controlid="employee-salary.import.summary">
                  <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
                    3. {t("employee_salary_import_step_summary", "Summary")} · {monthLabel(objPreview.dtSalaryMonth)}
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1.25, mb: 2 }}>
                    <SummaryCard strLabel={t("employee_salary_import_card_rows", "Rows in file")} intValue={objSummary.intTotalRows} strTone="#64748b" />
                    <SummaryCard strLabel={t("employee_salary_import_card_no_change", "No change")} intValue={objSummary.intNoChange} strTone="#94a3b8" strHint={t("employee_salary_import_card_no_change_hint", "skipped")} />
                    <SummaryCard strLabel={t("employee_salary_import_card_revisions", "Revisions")} intValue={objSummary.intRevision} strTone="#0284c7" />
                    <SummaryCard strLabel={t("employee_salary_import_card_new", "New salaries")} intValue={objSummary.intNew} strTone="#16a34a" />
                    <SummaryCard strLabel={t("employee_salary_import_card_corrections", "Corrections")} intValue={objSummary.intCorrection} strTone="#d97706" strHint={t("employee_salary_import_card_corrections_hint", "replace current salary")} />
                    <SummaryCard strLabel={t("employee_salary_import_card_confirm", "Need confirmation")} intValue={objSummary.intNeedsConfirmation} strTone="#f59e0b" />
                    <SummaryCard strLabel={t("employee_salary_import_card_errors", "Errors")} intValue={objSummary.intError} strTone="#dc2626" strHint={t("employee_salary_import_card_errors_hint", "not imported")} />
                    <SummaryCard strLabel={t("employee_salary_import_card_not_in_file", "Active, not in file")} intValue={objSummary.intActiveNotInFile} strTone="#7c3aed" strHint={t("employee_salary_import_card_not_in_file_hint", "salary unchanged")} />
                  </Box>

                  {objSummary.intToSave > 0 ? (
                    <Typography sx={{ fontSize: "0.88rem", mb: 1.5 }}>
                      {t("employee_salary_import_gross_impact", "Gross monthly of changed employees")}: <b>{formatImportAmount(objSummary.decCurrentGrossTotal)}</b> →{" "}
                      <b>{formatImportAmount(objSummary.decNewGrossTotal)}</b>{" "}
                      <Box component="span" sx={{ color: decGrossDiff >= 0 ? "#15803d" : "#b91c1c", fontWeight: 700 }}>
                        ({decGrossDiff >= 0 ? "+" : ""}{formatImportAmount(decGrossDiff)})
                      </Box>
                    </Typography>
                  ) : null}

                  {objSummary.lstPaidPayrollMonths.length > 0 ? (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      {t("employee_salary_import_paid_warning", "Some changes start in months whose payroll is already processed")}: {objSummary.lstPaidPayrollMonths.join(", ")}.{" "}
                      {t("employee_salary_import_paid_warning_hint", "Those rows need confirmation; the difference may come as arrears.")}
                    </Alert>
                  ) : null}

                  {lstErrorRows.length > 0 ? (
                    <Alert
                      severity="error"
                      sx={{ mb: 1.5 }}
                      action={(
                        <Button color="inherit" size="small" onClick={() => employeeSalaryImportService.downloadErrorRows(objPreview)} data-controlid="employee-salary.import.errors.download.button">
                          {t("employee_salary_import_download_errors", "Download errors")}
                        </Button>
                      )}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
                        {lstErrorRows.length} {t("employee_salary_import_error_rows", "row(s) have errors and will not be imported")}:
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: "0.82rem" }}>
                        {lstErrorRows.slice(0, 8).map((objRow) => (
                          <li key={rowKey(objRow)}>
                            {t("employee_salary_import_row", "Row")} {objRow.intExcelRowNumber ?? "-"} · {objRow.strEmployeeCode || "-"}: {objRow.lstErrors.join(" ")}
                          </li>
                        ))}
                      </Box>
                      {lstErrorRows.length > 8 ? (
                        <Typography sx={{ fontSize: "0.8rem" }}>+{lstErrorRows.length - 8} {t("employee_salary_import_more", "more")}</Typography>
                      ) : null}
                    </Alert>
                  ) : null}

                  {lstChangeRows.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                      <Button variant="outlined" startIcon={<ListAltRoundedIcon />} onClick={() => setBlnChangesOpen(true)} data-controlid="employee-salary.import.view-changes.button">
                        {t("employee_salary_import_view_changes", "View employee changes")} ({lstChangeRows.length})
                      </Button>
                      <Typography sx={{ fontSize: "0.88rem" }}>
                        <b>{intSelected}</b> {t("employee_salary_import_of", "of")} {lstChangeRows.length} {t("employee_salary_import_selected_to_import", "selected to import")}
                        {intConfirmed > 0 ? ` · ${intConfirmed} ${t("employee_salary_import_confirmed", "confirmed")}` : ""}
                      </Typography>
                      {intConfirmPending > 0 ? (
                        <Alert severity="warning" sx={{ py: 0, flex: "1 1 100%" }}>
                          {intConfirmPending} {t("employee_salary_import_confirm_pending", "row(s) need confirmation and are not selected. Open the employee changes, check the warning and tick them to include them.")}
                        </Alert>
                      ) : null}
                    </Box>
                  ) : (
                    <Alert severity="info">{t("employee_salary_import_nothing", "No employee in this file has a salary change. Nothing to import.")}</Alert>
                  )}
                </Box>
              ) : null}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={blnBusy} data-controlid="employee-salary.import.cancel.button">
            {objResult ? t("close", "Close") : t("cancel", "Cancel")}
          </Button>
          {!objResult ? (
            <Button
              variant="contained"
              onClick={() => setBlnConfirmOpen(true)}
              disabled={blnBusy || !objPreview || intSelected === 0}
              data-controlid="employee-salary.import.confirm.button"
            >
              {t("employee_salary_import_import", "Import")} {objPreview ? `(${intSelected})` : ""}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      {objPreview ? (
        <EmployeeSalaryImportChangesDialog
          blnOpen={blnChangesOpen}
          lstRows={objPreview.lstRows}
          setSelectedRows={setSelectedRows}
          t={t}
          onToggle={(intKey, blnChecked) => toggleRows([intKey], blnChecked)}
          onToggleMany={toggleRows}
          onClose={() => setBlnChangesOpen(false)}
        />
      ) : null}

      <Dialog open={blnConfirmOpen} onClose={() => setBlnConfirmOpen(false)} maxWidth="sm" fullWidth data-controlid="employee-salary.import.final-confirm.dialog">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("employee_salary_import_confirm_title", "Import salaries?")}</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ fontSize: "0.9rem" }}>
            {t("employee_salary_import_confirm_text", "This saves new salary records for {{count}} employee(s) for {{month}}. All are saved together; if one fails, nothing is saved.")
              .replace("{{count}}", String(intSelected))
              .replace("{{month}}", monthLabel(strSalaryMonth))}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
              {(["REVISION", "NEW", "CORRECTION"] as const).map((strAction) => {
                const intCount = lstChangeRows.filter((objRow) => objRow.strAction === strAction && setSelectedRows.has(rowKey(objRow))).length;
                return intCount > 0 ? (
                  <Box key={strAction} sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    <SalaryImportActionChip strAction={strAction} t={t} /> <b>{intCount}</b>
                  </Box>
                ) : null;
              })}
            </Box>
            {objPreview ? (
              <Typography sx={{ mt: 1.5, fontSize: "0.8rem", color: "text.secondary" }}>
                {t("employee_salary_import_effective_note", "Effective from")}: {formatImportDate(objPreview.dtSalaryMonth)}{" "}
                {t("employee_salary_import_effective_note_hint", "unless the row gives its own date.")}
              </Typography>
            ) : null}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnConfirmOpen(false)} data-controlid="employee-salary.import.final-confirm.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button variant="contained" onClick={handleImport} data-controlid="employee-salary.import.final-confirm.ok.button">
            {t("employee_salary_import_import", "Import")} ({intSelected})
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
