"use client";

import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, FormControlLabel, MenuItem, Snackbar, Stack, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { resetPayrollDocumentFormats } from "@/features/payroll/utils/payrollDocumentFormat";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import PayslipHeaderEditor from "@/features/settings/components/PayslipHeaderEditor";
import { settingsService } from "@/features/settings/services/settingsService";
import type { PayrollDocumentFormatConfigDto, PayslipHeaderLine } from "@/features/settings/types";
import { cloneHeaderLines, sameHeaderLines, toSaveHeaderLines, validateHeaderLines } from "@/features/settings/utils/payslipHeader";

const PAYROLL_FORMAT_VIEW = "payroll_format_view";
const PAYROLL_FORMAT_EDIT = "payroll_format_edit";

type HeaderDraft = { lstHeaderLines: PayslipHeaderLine[]; blnShowLeaveBalance: boolean; strLogoSource: string };
type ToastState = { strMessage: string; strSeverity: "success" | "error" } | null;

function toDraft(objConfig: PayrollDocumentFormatConfigDto): HeaderDraft {
  return {
    lstHeaderLines: cloneHeaderLines(objConfig.lstHeaderLines ?? []),
    blnShowLeaveBalance: objConfig.blnShowLeaveBalance ?? true,
    strLogoSource: objConfig.strLogoSource ?? "none",
  };
}

type Props = {
  /** The salary component screen is in view mode: show the settings, never change them. */
  blnReadOnly?: boolean;
};

/**
 * Salary Component > Payslip Configuration: the payslip / F&F header lines, logo and the
 * leave-balance switch. They are one company-wide setting (every payslip of the company, in every
 * format), not per component, so they save on their own Save button - the component's Save does
 * not touch them. Loaded when first expanded. Rights: "Payslip & F&F Format - View" / "- Edit".
 */
export default function PayslipHeaderSettingsSection({ blnReadOnly: blnPageReadOnly = false }: Props) {
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const blnCanView = canDo("settings", PAYROLL_FORMAT_VIEW);
  const blnCanEdit = canDo("settings", PAYROLL_FORMAT_EDIT);
  const [blnExpanded, setBlnExpanded] = useState(false);
  const [objConfig, setObjConfig] = useState<PayrollDocumentFormatConfigDto | null>(null);
  const [objDraft, setObjDraft] = useState<HeaderDraft | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strLoadError, setStrLoadError] = useState<string | null>(null);
  const [objToast, setObjToast] = useState<ToastState>(null);

  function applyConfig(objNext: PayrollDocumentFormatConfigDto) {
    setObjConfig(objNext);
    setObjDraft(toDraft(objNext));
  }

  useEffect(() => {
    if (!blnExpanded || objConfig || blnRightsLoading || !blnCanView) return;
    let blnCancelled = false;
    setBlnLoading(true);
    setStrLoadError(null);
    settingsService
      .getPayrollDocumentFormat()
      .then((objResult) => {
        if (!blnCancelled) applyConfig(objResult);
      })
      .catch(async (objError) => {
        if (!blnCancelled) setStrLoadError((await createApiRequestError(objError)).message);
      })
      .finally(() => {
        if (!blnCancelled) setBlnLoading(false);
      });
    return () => {
      blnCancelled = true;
    };
  }, [blnExpanded, objConfig, blnRightsLoading, blnCanView]);

  if (blnRightsLoading || !blnCanView) return null;

  const blnReadOnly = blnPageReadOnly || !blnCanEdit;
  const blnDirty = Boolean(
    objConfig &&
      objDraft &&
      (objDraft.blnShowLeaveBalance !== (objConfig.blnShowLeaveBalance ?? true) ||
        objDraft.strLogoSource !== (objConfig.strLogoSource ?? "none") ||
        !sameHeaderLines(objDraft.lstHeaderLines, objConfig.lstHeaderLines ?? [])),
  );
  const strHeaderError = objConfig && objDraft ? validateHeaderLines(objDraft.lstHeaderLines, objConfig.dicHeaderLimits) : null;

  async function handleSave() {
    if (!objConfig || !objDraft || strHeaderError) return;
    setBlnSaving(true);
    try {
      // The formats are sent as saved, so only the header, logo and leave switch change.
      const objSaved = await settingsService.savePayrollDocumentFormat({
        strPayslipFormat: objConfig.strPayslipFormat,
        strPayslipView: objConfig.strPayslipView,
        strFNFReportFormat: objConfig.strFNFReportFormat,
        strCtcFormat: objConfig.strCtcFormat,
        strCtcPeriod: objConfig.strCtcPeriod,
        lstHeaderLines: toSaveHeaderLines(objDraft.lstHeaderLines),
        blnShowLeaveBalance: objDraft.blnShowLeaveBalance,
        strLogoSource: objDraft.strLogoSource,
      });
      applyConfig(objSaved);
      resetPayrollDocumentFormats();
      setObjToast({ strMessage: "Payslip header and leave balance saved. Every payslip and F&F report uses them.", strSeverity: "success" });
    } catch (objError) {
      setObjToast({ strMessage: (await createApiRequestError(objError)).message, strSeverity: "error" });
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <>
      <Accordion
        disableGutters
        expanded={blnExpanded}
        onChange={(_objEvent, blnNext) => setBlnExpanded(blnNext)}
        sx={{ mt: 1, border: "1px solid #dfe9f5", borderRadius: "12px !important", boxShadow: "none", "&:before": { display: "none" } }}
        data-testid="salary-components.editor.payslip-header.section"
      >
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} data-controlid="salary-components.editor.payslip-header.toggle">
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>Payslip Header, Logo &amp; Leave</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Applies to every payslip and F&amp;F report of the company, not only this component.</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {blnLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><DottedLoader /></Box>
          ) : strLoadError ? (
            <Alert severity="error">{strLoadError}</Alert>
          ) : objConfig && objDraft ? (
            <Stack spacing={1.5}>
              {!blnPageReadOnly && !blnCanEdit ? (
                <Alert severity="info">Changing these needs the &quot;Payslip &amp; F&amp;F Format - Edit&quot; right.</Alert>
              ) : null}
              <TextField
                select
                size="small"
                label="Logo"
                value={objDraft.strLogoSource}
                disabled={blnReadOnly}
                onChange={(objEvent) => setObjDraft({ ...objDraft, strLogoSource: objEvent.target.value })}
                inputProps={{ "data-controlid": "salary-components.editor.payslip-header.logo.select" }}
                sx={{ width: { xs: "100%", sm: 420 } }}
              >
                {(objConfig.lstLogoSources ?? [{ strKey: "none", strLabel: "No logo" }]).map((objSource) => (
                  <MenuItem key={objSource.strKey} value={objSource.strKey}>{objSource.strLabel}</MenuItem>
                ))}
              </TextField>
              <PayslipHeaderEditor
                blnShowLogo={objDraft.strLogoSource !== "none"}
                lstLines={objDraft.lstHeaderLines}
                lstFields={objConfig.lstHeaderFields ?? []}
                lstStyles={objConfig.lstHeaderStyles ?? ["heading", "bold", "normal"]}
                lstDefaultLines={objConfig.lstDefaultHeaderLines ?? []}
                objLimits={objConfig.dicHeaderLimits}
                blnReadOnly={blnReadOnly}
                strError={blnDirty ? strHeaderError : null}
                onChange={(lstHeaderLines) => setObjDraft({ ...objDraft, lstHeaderLines })}
              />
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={objDraft.blnShowLeaveBalance}
                      disabled={blnReadOnly}
                      onChange={(objEvent) => setObjDraft({ ...objDraft, blnShowLeaveBalance: objEvent.target.checked })}
                      inputProps={{ "aria-label": "Show leave balance on payslip" }}
                      data-controlid="salary-components.editor.payslip-header.show-leave.switch"
                    />
                  }
                  label={<Typography sx={{ fontWeight: 700, color: "#172033", fontSize: "0.9rem" }}>Show leave balance on payslip</Typography>}
                />
                <Typography sx={{ color: "#60749b", fontSize: "0.75rem" }}>
                  Leave availed and balance per leave type on Format 1 (Leave Balance row) and Format 3 (Leave Balance panel) payslips. Our format has no leave section.
                </Typography>
              </Box>
              {!blnReadOnly ? (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button className="app-btn app-btn-outline" startIcon={<CancelRoundedIcon />} onClick={() => setObjDraft(toDraft(objConfig))} disabled={blnSaving || !blnDirty} data-controlid="salary-components.editor.payslip-header.cancel.button">
                    Cancel
                  </Button>
                  <Button className="app-btn app-btn-primary" startIcon={<SaveRoundedIcon />} onClick={() => void handleSave()} disabled={blnSaving || !blnDirty || Boolean(strHeaderError)} data-controlid="salary-components.editor.payslip-header.save.button">
                    {blnSaving ? "Saving..." : "Save header"}
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          ) : null}
        </AccordionDetails>
      </Accordion>
      <Snackbar open={Boolean(objToast)} autoHideDuration={5000} onClose={() => setObjToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        {objToast ? <Alert severity={objToast.strSeverity} onClose={() => setObjToast(null)} variant="filled">{objToast.strMessage}</Alert> : undefined}
      </Snackbar>
    </>
  );
}
