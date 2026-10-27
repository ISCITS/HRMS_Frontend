"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { DottedLoader } from "@/components/shared/BlockingLoader";
import {
  TDS_MODE_LABELS,
  tdsService,
  type TdsMode,
  type TdsModeOverview,
  type TdsModeSwitchPreview,
} from "@/features/payroll/services/tdsService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Translate = (strKey: string, strFallback: string) => string;

const lstStatutoryRuleModuleCodes = ["STATUTORY_RULE", "STATUTORY_RULES", "PAYROLL_STATUTORY_RULE", "PAYROLL_STATUTORY_RULES"];

function currentMonthValue() {
  const dtNow = new Date();
  return `${dtNow.getFullYear()}-${String(dtNow.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(strIsoDate: string) {
  const dtValue = new Date(`${strIsoDate.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(dtValue);
}

function formatAmount(strValue: string | null) {
  if (strValue === null || strValue === undefined || strValue === "") return "-";
  const decValue = Number(strValue);
  return Number.isFinite(decValue)
    ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(decValue)
    : strValue;
}

/** TDS mode (Automatic / Client provided) by month - shown on the TDS salary component. The tax
 * calculation itself is unchanged; the mode decides whether the system TDS or the client TDS
 * imported in Payroll Input is deducted. */
export default function TdsModeSection({ t }: { t: Translate }) {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(lstStatutoryRuleModuleCodes);
  const blnCanView = canViewAny() || canDoAny("view");
  const blnCanChange = canDoAny("edit");

  const [objOverview, setObjOverview] = useState<TdsModeOverview | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [strNewMode, setStrNewMode] = useState<TdsMode>("CLIENT_PROVIDED");
  const [strEffectiveMonth, setStrEffectiveMonth] = useState(currentMonthValue());
  const [strReason, setStrReason] = useState("");
  const [objPreview, setObjPreview] = useState<TdsModeSwitchPreview | null>(null);
  const [blnWorking, setBlnWorking] = useState(false);

  const loadOverview = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await tdsService.getModeOverview();
      setObjOverview(objResult);
      setStrNewMode(objResult.strCurrentMode === "AUTOMATIC" ? "CLIENT_PROVIDED" : "AUTOMATIC");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("tds_mode_load_failed", "Unable to load the TDS mode."));
    } finally {
      setBlnLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    loadOverview().catch(() => undefined);
  }, [blnRightsLoading, blnCanView, loadOverview]);

  async function openPreview() {
    setStrError("");
    setStrSuccess("");
    if (strReason.trim().length < 3) {
      setStrError(t("tds_mode_reason_required", "Enter a reason for changing the TDS mode."));
      return;
    }
    try {
      setBlnWorking(true);
      setObjPreview(await tdsService.getSwitchPreview(strNewMode, `${strEffectiveMonth}-01`));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("tds_mode_preview_failed", "Unable to preview the change."));
    } finally {
      setBlnWorking(false);
    }
  }

  async function confirmChange() {
    try {
      setBlnWorking(true);
      const objResult = await tdsService.saveModeVersion(strNewMode, `${strEffectiveMonth}-01`, strReason.trim());
      let strMessage = t("tds_mode_saved", "TDS mode set to {{mode}} from {{month}}.")
        .replace("{{mode}}", TDS_MODE_LABELS[objResult.strMode])
        .replace("{{month}}", formatMonth(objResult.dtEffectiveFrom));
      if (objResult.lstRunsToReprocess.length > 0) {
        strMessage += ` ${t("tds_mode_reprocess", "Reprocess these payroll runs before finalizing:")} ${objResult.lstRunsToReprocess
          .map((objRun) => objRun.strRunName)
          .join(", ")}.`;
      }
      setObjPreview(null);
      setStrReason("");
      setStrSuccess(strMessage);
      await loadOverview();
    } catch (objError) {
      setObjPreview(null);
      setStrError(objError instanceof Error ? objError.message : t("tds_mode_save_failed", "Unable to change the TDS mode."));
    } finally {
      setBlnWorking(false);
    }
  }

  return (
    <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }} data-controlid="salary-components.editor.tds-mode.section">
      <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("tds_mode_title", "TDS Mode")}</Typography>
      <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.4, mb: 1.5 }}>
        {t(
          "tds_mode_help",
          "Automatic: the system's TDS is deducted. Client provided: the TDS imported from the client sheet in Payroll Input > Import TDS is deducted (employees not in the sheet get 0). The system always calculates and records its own TDS, and year-to-date tax always uses the TDS actually deducted, so switching is safe. The mode applies to every payroll run of the month."
        )}
      </Typography>

      {blnRightsLoading || (blnCanView && blnLoading) ? <DottedLoader /> : null}
      {!blnRightsLoading && !blnCanView ? (
        <Alert severity="info">{t("tds_mode_no_access", "Viewing the TDS mode needs Statutory Rule access.")}</Alert>
      ) : null}
      {strError ? <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}

      {objOverview ? (
        <>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>{t("tds_mode_current", "Current mode")}:</Typography>
            <Chip
              color={objOverview.strCurrentMode === "CLIENT_PROVIDED" ? "warning" : "success"}
              label={objOverview.strCurrentModeLabel}
              data-controlid="salary-components.editor.tds-mode.current.chip"
            />
          </Box>

          {blnCanChange ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label={t("tds_mode_new", "Change to")}
                value={strNewMode}
                onChange={(objEvent) => setStrNewMode(objEvent.target.value as TdsMode)}
                sx={{ minWidth: 200 }}
                inputProps={{ "data-controlid": "salary-components.editor.tds-mode.mode.select" }}
              >
                <MenuItem value="AUTOMATIC">{TDS_MODE_LABELS.AUTOMATIC}</MenuItem>
                <MenuItem value="CLIENT_PROVIDED">{TDS_MODE_LABELS.CLIENT_PROVIDED}</MenuItem>
              </TextField>
              <TextField
                type="month"
                size="small"
                label={t("tds_mode_from_month", "From month")}
                value={strEffectiveMonth}
                onChange={(objEvent) => setStrEffectiveMonth(objEvent.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "data-controlid": "salary-components.editor.tds-mode.month.input" }}
              />
              <TextField
                size="small"
                label={t("tds_mode_reason", "Reason")}
                value={strReason}
                onChange={(objEvent) => setStrReason(objEvent.target.value)}
                sx={{ flex: 1 }}
                inputProps={{ maxLength: 500, "data-controlid": "salary-components.editor.tds-mode.reason.input" }}
              />
              <Button
                variant="contained"
                onClick={openPreview}
                disabled={blnWorking || !strEffectiveMonth}
                data-controlid="salary-components.editor.tds-mode.preview.button"
              >
                {t("tds_mode_review", "Review change")}
              </Button>
            </Stack>
          ) : null}

          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t("tds_mode_history", "History")}</Typography>
          {objOverview.lstHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("tds_mode_history_empty", "No changes yet - TDS has always been Automatic.")}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("tds_mode_from", "From")}</TableCell>
                    <TableCell>{t("tds_mode_mode", "Mode")}</TableCell>
                    <TableCell>{t("tds_mode_reason", "Reason")}</TableCell>
                    <TableCell>{t("tds_mode_changed_on", "Changed on")}</TableCell>
                    <TableCell>{t("status", "Status")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {objOverview.lstHistory.map((objRow) => (
                    <TableRow key={objRow.intID}>
                      <TableCell>{formatMonth(objRow.dtEffectiveFrom)}</TableCell>
                      <TableCell>{TDS_MODE_LABELS[objRow.strMode]}</TableCell>
                      <TableCell>{objRow.strReason ?? "-"}</TableCell>
                      <TableCell>{objRow.dtAddedOn ? new Date(objRow.dtAddedOn).toLocaleString("en-IN") : "-"}</TableCell>
                      <TableCell>{objRow.blnIsActive ? t("active", "Active") : t("tds_mode_replaced", "Replaced")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      ) : null}

      <Dialog open={Boolean(objPreview)} onClose={() => !blnWorking && setObjPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t("tds_mode_confirm_title", "Change TDS mode")}: {objPreview ? TDS_MODE_LABELS[objPreview.strMode] : ""}{" "}
          {t("tds_mode_from_lower", "from")} {objPreview ? formatMonth(objPreview.dtEffectiveFrom) : ""}
        </DialogTitle>
        <DialogContent dividers>
          {objPreview ? (
            <>
              {objPreview.strCurrentModeForMonth === objPreview.strMode ? (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  {t("tds_mode_already", "This month is already in this mode; saving adds a new version from this month.")}
                </Alert>
              ) : null}
              {objPreview.strNote ? <Alert severity="info" sx={{ mb: 1.5 }}>{objPreview.strNote}</Alert> : null}
              {objPreview.lstAffectedRuns.length > 0 ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  {t("tds_mode_affected_runs", "Payroll runs in these months will follow the new mode:")}{" "}
                  {objPreview.lstAffectedRuns.map((objRun) => `${objRun.strRunName} (${objRun.strRunStatus})`).join(", ")}.{" "}
                  {t("tds_mode_affected_runs_help", "Processed runs must be reprocessed; finalized months cannot be changed.")}
                </Alert>
              ) : null}
              {objPreview.lstRows.length > 0 ? (
                <TableContainer sx={{ maxHeight: 380 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("employee_code", "Employee Code")}</TableCell>
                        <TableCell>{t("employee_name", "Employee Name")}</TableCell>
                        <TableCell align="right">{t("tds_mode_last_tds", "Last TDS deducted")}</TableCell>
                        <TableCell align="right">{t("tds_mode_last_system", "Last system TDS")}</TableCell>
                        {objPreview.strMode === "AUTOMATIC" ? (
                          <>
                            <TableCell align="right">{t("tds_mode_deducted_so_far", "Deducted so far")}</TableCell>
                            <TableCell align="right">{t("tds_mode_estimated", "Estimated monthly TDS")}</TableCell>
                            <TableCell align="right">{t("tds_mode_change", "Change")}</TableCell>
                          </>
                        ) : null}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {objPreview.lstRows.map((objRow) => (
                        <TableRow key={objRow.intEmployeeID}>
                          <TableCell>{objRow.strEmployeeCode}</TableCell>
                          <TableCell>{objRow.strEmployeeName}</TableCell>
                          <TableCell align="right">{formatAmount(objRow.decLastFinalTds)}</TableCell>
                          <TableCell align="right">{formatAmount(objRow.decLastSystemTds)}</TableCell>
                          {objPreview.strMode === "AUTOMATIC" ? (
                            <>
                              <TableCell align="right">{formatAmount(objRow.decTdsDeductedSoFar)}</TableCell>
                              <TableCell align="right">{formatAmount(objRow.decEstimatedMonthlyTds)}</TableCell>
                              <TableCell align="right" sx={{ color: Number(objRow.decChange ?? 0) > 0 ? "#b45309" : undefined }}>
                                {formatAmount(objRow.decChange)}
                              </TableCell>
                            </>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjPreview(null)} disabled={blnWorking} data-controlid="salary-components.editor.tds-mode.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button variant="contained" onClick={confirmChange} disabled={blnWorking} data-controlid="salary-components.editor.tds-mode.confirm.button">
            {t("tds_mode_confirm", "Confirm change")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
