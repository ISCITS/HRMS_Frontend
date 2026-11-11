"use client";

import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { resetPayrollDocumentFormats } from "@/features/payroll/utils/payrollDocumentFormat";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { settingsService } from "@/features/settings/services/settingsService";
import type { PayrollDocumentFormatConfigDto, PayrollDocumentFormatSaveRequest, PayrollDocumentTemplateDto } from "@/features/settings/types";

type DocumentKind = "payslip" | "fnf" | "ctc";
type DocumentFormat = PayrollDocumentTemplateDto["strFormat"];
type PayslipView = PayrollDocumentFormatSaveRequest["strPayslipView"];
type CtcPeriod = PayrollDocumentFormatSaveRequest["strCtcPeriod"];
type PreviewView = PayslipView | CtcPeriod;
type PreviewState = { strDocument: DocumentKind; objTemplate: PayrollDocumentTemplateDto; strView: PreviewView } | null;

const PAYROLL_FORMAT_VIEW = "payroll_format_view";
const PAYROLL_FORMAT_EDIT = "payroll_format_edit";
const lstViewOptions: { strView: PayslipView; strLabel: string }[] = [
  { strView: "monthly", strLabel: "Monthly" },
  { strView: "detailed", strLabel: "Detailed (YTD & annual)" },
];
const lstCtcPeriodOptions: { strView: CtcPeriod; strLabel: string }[] = [
  { strView: "monthly", strLabel: "Monthly" },
  { strView: "annual", strLabel: "Annual" },
];
const DIC_DOCUMENT_LABEL: Record<DocumentKind, string> = { payslip: "Payslip", fnf: "F&F report", ctc: "CTC statement" };
type CtcFormat = PayrollDocumentFormatSaveRequest["strCtcFormat"];

/** The CTC formats a setting offers: one of them, or both ("both"). */
function ctcFormats(strCtcFormat: CtcFormat): DocumentFormat[] {
  return strCtcFormat === "both" ? ["default", "client"] : [strCtcFormat];
}

/** Ticks or unticks one CTC format; at least one always stays offered. */
function toggleCtcFormat(strCtcFormat: CtcFormat, strFormat: DocumentFormat): CtcFormat {
  const lstCurrent = ctcFormats(strCtcFormat);
  const lstNext = lstCurrent.includes(strFormat) ? lstCurrent.filter((strItem) => strItem !== strFormat) : [...lstCurrent, strFormat];
  if (lstNext.length === 0) return strCtcFormat;
  return lstNext.length === 2 ? "both" : lstNext[0];
}

type Props = {
  onMessage: (strMessage: string, strSeverity: "success" | "error") => void;
};

/**
 * Settings > Payroll: the payslip, F&F report and CTC statement formats every screen opens (payroll
 * run, results, payslips, ESS, F&F, Reports > CTC Statement). Rights: "Payslip & F&F Format - View"
 * to see, "- Edit" to change.
 */
export default function PayrollDocumentFormatSettings({ onMessage }: Props) {
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const blnCanView = canDo("settings", PAYROLL_FORMAT_VIEW);
  const blnCanEdit = canDo("settings", PAYROLL_FORMAT_EDIT);
  const [objConfig, setObjConfig] = useState<PayrollDocumentFormatConfigDto | null>(null);
  const [objDraft, setObjDraft] = useState<PayrollDocumentFormatSaveRequest | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objPreview, setObjPreview] = useState<PreviewState>(null);
  const [strPreviewHtml, setStrPreviewHtml] = useState("");
  const [blnPreviewLoading, setBlnPreviewLoading] = useState(false);

  function applyConfig(objNext: PayrollDocumentFormatConfigDto) {
    setObjConfig(objNext);
    setObjDraft({
      strPayslipFormat: objNext.strPayslipFormat,
      strPayslipView: objNext.strPayslipView,
      strFNFReportFormat: objNext.strFNFReportFormat,
      strCtcFormat: objNext.strCtcFormat,
      strCtcPeriod: objNext.strCtcPeriod,
    });
  }

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    let blnCancelled = false;
    settingsService
      .getPayrollDocumentFormat()
      .then((objResult) => {
        if (!blnCancelled) applyConfig(objResult);
      })
      .catch(async (objError) => {
        if (!blnCancelled) onMessage((await createApiRequestError(objError)).message, "error");
      })
      .finally(() => {
        if (!blnCancelled) setBlnLoading(false);
      });
    return () => {
      blnCancelled = true;
    };
    // onMessage is the parent's toast setter; loading once per right change is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (!objPreview) return;
    let blnCancelled = false;
    settingsService
      .previewPayrollDocumentFormat(objPreview.strDocument, objPreview.objTemplate.strFormat, objPreview.strView)
      .then((strHtml) => {
        if (!blnCancelled) setStrPreviewHtml(strHtml);
      })
      .catch(async (objError) => {
        if (!blnCancelled) onMessage((await createApiRequestError(objError)).message, "error");
      })
      .finally(() => {
        if (!blnCancelled) setBlnPreviewLoading(false);
      });
    return () => {
      blnCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objPreview]);

  async function handleSave() {
    if (!objDraft) return;
    setBlnSaving(true);
    try {
      applyConfig(await settingsService.savePayrollDocumentFormat(objDraft));
      // Screens opened from here on use the new formats.
      resetPayrollDocumentFormats();
      onMessage("Payslip, F&F report and CTC statement formats saved. Every screen now opens these formats.", "success");
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  function openPreview(objNext: NonNullable<PreviewState>) {
    setBlnPreviewLoading(true);
    setStrPreviewHtml("");
    setObjPreview(objNext);
  }

  function handleCancel() {
    if (objConfig) applyConfig(objConfig);
  }

  if (blnRightsLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>;
  }
  if (!blnCanView) {
    return (
      <Alert severity="info" data-testid="settings.payroll-format.no-right">
        Your user group cannot see the payslip and F&amp;F report formats. Ask an administrator to grant &quot;Payslip &amp; F&amp;F Format - View&quot; under Settings in User Group Rights.
      </Alert>
    );
  }
  if (blnLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>;
  }
  if (!objConfig || !objDraft) {
    return null;
  }

  const blnReadOnly = !blnCanEdit;
  const blnDirty =
    objDraft.strPayslipFormat !== objConfig.strPayslipFormat ||
    objDraft.strPayslipView !== objConfig.strPayslipView ||
    objDraft.strFNFReportFormat !== objConfig.strFNFReportFormat ||
    objDraft.strCtcFormat !== objConfig.strCtcFormat ||
    objDraft.strCtcPeriod !== objConfig.strCtcPeriod;
  const objSelectedPayslipTemplate = objConfig.lstPayslipTemplates.find((objTemplate) => objTemplate.strFormat === objDraft.strPayslipFormat);
  const sxCard = { p: { xs: 2, md: 2.25 }, borderRadius: "8px", border: "1px solid #dfe9f5", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)", backgroundColor: "#fff" } as const;
  const sxSubHeading = { fontWeight: 800, color: "#172033", fontSize: "0.98rem", lineHeight: 1.2 } as const;
  const sxSubCaption = { color: "#48638d", fontSize: "0.78rem", mb: 1.25, lineHeight: 1.25 } as const;

  function renderTemplates(strDocument: DocumentKind, lstTemplates: PayrollDocumentTemplateDto[], lstSelected: DocumentFormat[], fnSelect: (strFormat: DocumentFormat) => void, blnMultiple = false) {
    return (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(260px, 1fr))" }, gap: 1.5 }}>
        {lstTemplates.map((objTemplate) => {
          const blnSelected = lstSelected.includes(objTemplate.strFormat);
          return (
            <Paper
              key={objTemplate.strFormat}
              variant="outlined"
              role={blnMultiple ? "checkbox" : "radio"}
              aria-checked={blnSelected}
              tabIndex={blnReadOnly ? -1 : 0}
              onClick={() => !blnReadOnly && fnSelect(objTemplate.strFormat)}
              onKeyDown={(objEvent) => {
                if (!blnReadOnly && (objEvent.key === "Enter" || objEvent.key === " ")) {
                  objEvent.preventDefault();
                  fnSelect(objTemplate.strFormat);
                }
              }}
              data-controlid={`settings.payroll-format.${strDocument}.${objTemplate.strFormat}`}
              sx={{
                p: 1.75,
                borderRadius: "8px",
                cursor: blnReadOnly ? "default" : "pointer",
                borderWidth: blnSelected ? 2 : 1,
                borderColor: blnSelected ? "var(--app-primary-color, #1d5d96)" : "#dce8f6",
                backgroundColor: blnSelected ? "var(--app-primary-soft, #eef5ff)" : "#fff",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {blnSelected ? <CheckCircleRoundedIcon sx={{ color: "var(--app-primary-color, #1d5d96)", fontSize: 20 }} /> : null}
                <Typography sx={{ fontWeight: 800, color: "#172033" }}>{objTemplate.strName}</Typography>
                {objTemplate.blnIsDefault ? <Chip size="small" label="Default" color="primary" variant="outlined" /> : null}
              </Stack>
              <Typography sx={{ color: "#48638d", fontSize: "0.8rem", flex: 1 }}>{objTemplate.strDescription}</Typography>
              <Box>
                <Button
                  size="small"
                  className="app-btn app-btn-outline"
                  startIcon={<VisibilityRoundedIcon />}
                  onClick={(objEvent) => {
                    objEvent.stopPropagation();
                    const strView = strDocument === "payslip" ? objDraft!.strPayslipView : strDocument === "ctc" ? objDraft!.strCtcPeriod : "monthly";
                    openPreview({ strDocument, objTemplate, strView });
                  }}
                  controlId={`settings.payroll-format.${strDocument}.${objTemplate.strFormat}.preview`}
                >
                  View template
                </Button>
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  }

  return (
    <>
      {blnReadOnly ? (
        <Alert severity="info">You can view these formats. Changing them needs the &quot;Payslip &amp; F&amp;F Format - Edit&quot; right.</Alert>
      ) : null}

      <Paper id="settings-section-payslip-format" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Payslip Format</Typography>
        <Typography sx={sxSubCaption}>Every payslip opens in this format - payroll run, results, payslips and employee self-service. Nothing is asked on open.</Typography>
        {renderTemplates("payslip", objConfig.lstPayslipTemplates, [objDraft.strPayslipFormat], (strFormat) => setObjDraft({ ...objDraft, strPayslipFormat: strFormat }))}
        {objSelectedPayslipTemplate?.blnHasViews ? (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ ...sxSubCaption, mb: 0.75 }}>Open payslips as</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={objDraft.strPayslipView}
              disabled={blnReadOnly}
              onChange={(_objEvent, strNext: PayslipView | null) => strNext && setObjDraft({ ...objDraft, strPayslipView: strNext })}
              data-controlid="settings.payroll-format.payslip.view"
            >
              {lstViewOptions.map((objOption) => (
                <ToggleButton key={objOption.strView} value={objOption.strView} sx={{ fontWeight: 700, textTransform: "none", px: 2 }}>
                  {objOption.strLabel}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 0.75 }}>
              A user whose group holds only one of the &quot;Payslip - Monthly&quot; / &quot;Payslip - Detailed&quot; rights gets that one.
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 1.5 }}>
            Format 1 is a monthly payslip (needs the &quot;Payslip - Monthly&quot; right; others get our Detailed payslip).
          </Typography>
        )}
      </Paper>

      <Paper id="settings-section-fnf-format" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>F&amp;F Report Format</Typography>
        <Typography sx={sxSubCaption}>F&amp;F reports - Generate FNF Report, F&amp;F Reports tab and its downloads - open in this format.</Typography>
        {renderTemplates("fnf", objConfig.lstFNFTemplates, [objDraft.strFNFReportFormat], (strFormat) => setObjDraft({ ...objDraft, strFNFReportFormat: strFormat }))}
      </Paper>

      <Paper id="settings-section-ctc-format" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>CTC Format</Typography>
        <Typography sx={sxSubCaption}>Reports - CTC Statement, its Excel and PDF downloads - offer the formats ticked here. Tick both to switch between them on the CTC Statement screen.</Typography>
        {renderTemplates("ctc", objConfig.lstCtcTemplates, ctcFormats(objDraft.strCtcFormat), (strFormat) => setObjDraft({ ...objDraft, strCtcFormat: toggleCtcFormat(objDraft.strCtcFormat, strFormat) }), true)}
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ ...sxSubCaption, mb: 0.75 }}>Open CTC statements as</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={objDraft.strCtcPeriod}
            disabled={blnReadOnly}
            onChange={(_objEvent, strNext: CtcPeriod | null) => strNext && setObjDraft({ ...objDraft, strCtcPeriod: strNext })}
            data-controlid="settings.payroll-format.ctc.period"
          >
            {lstCtcPeriodOptions.map((objOption) => (
              <ToggleButton key={objOption.strView} value={objOption.strView} sx={{ fontWeight: 700, textTransform: "none", px: 2 }}>
                {objOption.strLabel}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 0.75 }}>
            The statement opens in this period; Monthly shows amounts per month, Annual per year, and the screen can switch between them.
          </Typography>
        </Box>
      </Paper>

      {!blnReadOnly ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button className="app-btn app-btn-outline" startIcon={<CancelRoundedIcon />} onClick={handleCancel} disabled={blnSaving || !blnDirty} controlId="settings.payroll-format.cancel.button">Cancel</Button>
          <Button className="app-btn app-btn-primary" startIcon={<SaveRoundedIcon />} onClick={() => void handleSave()} disabled={blnSaving || !blnDirty} controlId="settings.payroll-format.save.button">
            {blnSaving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      ) : null}

      <Dialog open={Boolean(objPreview)} onClose={() => setObjPreview(null)} maxWidth="lg" fullWidth data-testid="settings.payroll-format.preview">
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box component="span" sx={{ flex: 1 }}>
            {objPreview ? `${DIC_DOCUMENT_LABEL[objPreview.strDocument]} - ${objPreview.objTemplate.strName}` : ""}
          </Box>
          {objPreview?.strDocument === "payslip" && objPreview.objTemplate.blnHasViews ? (
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={objPreview.strView}
              onChange={(_objEvent, strNext: PayslipView | null) => strNext && openPreview({ ...objPreview, strView: strNext })}
            >
              {lstViewOptions.map((objOption) => (
                <ToggleButton key={objOption.strView} value={objOption.strView} sx={{ fontWeight: 700, textTransform: "none" }}>{objOption.strLabel}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          ) : null}
          {objPreview?.strDocument === "ctc" ? (
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={objPreview.strView}
              onChange={(_objEvent, strNext: CtcPeriod | null) => strNext && openPreview({ ...objPreview, strView: strNext })}
            >
              {lstCtcPeriodOptions.map((objOption) => (
                <ToggleButton key={objOption.strView} value={objOption.strView} sx={{ fontWeight: 700, textTransform: "none" }}>{objOption.strLabel}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          ) : null}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: "70vh", backgroundColor: "#eef3f8" }}>
          <Typography sx={{ color: "#60749b", fontSize: "0.75rem", px: 2, py: 0.75 }}>Sample figures - shows the layout only.</Typography>
          {blnPreviewLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>
          ) : (
            <Box component="iframe" title="Template preview" sandbox="" srcDoc={strPreviewHtml} sx={{ border: 0, width: "100%", height: "calc(100% - 32px)", backgroundColor: "#fff" }} />
          )}
        </DialogContent>
        <DialogActions>
          {!blnReadOnly && objPreview ? (
            <Button
              className="app-btn app-btn-primary"
              onClick={() => {
                if (objPreview.strDocument === "payslip") {
                  setObjDraft({ ...objDraft, strPayslipFormat: objPreview.objTemplate.strFormat, ...(objPreview.objTemplate.blnHasViews ? { strPayslipView: objPreview.strView as PayslipView } : {}) });
                } else if (objPreview.strDocument === "ctc") {
                  const lstOffered = ctcFormats(objDraft.strCtcFormat);
                  setObjDraft({
                    ...objDraft,
                    strCtcFormat: lstOffered.includes(objPreview.objTemplate.strFormat) ? objDraft.strCtcFormat : toggleCtcFormat(objDraft.strCtcFormat, objPreview.objTemplate.strFormat),
                    strCtcPeriod: objPreview.strView as CtcPeriod,
                  });
                } else {
                  setObjDraft({ ...objDraft, strFNFReportFormat: objPreview.objTemplate.strFormat });
                }
                setObjPreview(null);
              }}
              controlId="settings.payroll-format.preview.select"
            >
              Use this template
            </Button>
          ) : null}
          <Button onClick={() => setObjPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
