"use client";

import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFPolicy, FNFPolicySection } from "@/features/payroll/types";

type SectionKey = "salary" | "leave_encashment" | "notice" | "gratuity" | "rounding" | "approval" | "closure";
type FieldSpec =
  | { strKey: string; strLabel: string; strKind: "number"; strHelp?: string }
  | { strKey: string; strLabel: string; strKind: "switch"; strHelp?: string }
  | { strKey: string; strLabel: string; strKind: "select"; lstOptions: { strValue: string; strLabel: string }[]; strHelp?: string }
  | { strKey: string; strLabel: string; strKind: "list"; strHelp?: string };

const lstBasisOptions = [
  { strValue: "GRATUITY_COMPONENTS", strLabel: "Components marked 'include in gratuity' (Basic + DA if none marked)" },
  { strValue: "GROSS", strLabel: "All earning components (gross)" },
  { strValue: "COMPONENT_CODES", strLabel: "Specific component codes" },
];

const lstSections: { strKey: SectionKey; strTitle: string; lstFields: FieldSpec[] }[] = [
  {
    strKey: "salary",
    strTitle: "Salary up to last working date",
    lstFields: [
      { strKey: "max_unpaid_months_lookback", strLabel: "Months to check for unpaid salary", strKind: "number", strHelp: "Earlier months with no processed payroll are paid in the F&F." },
      { strKey: "attendance_fallback", strLabel: "When attendance is incomplete", strKind: "select", lstOptions: [{ strValue: "FULL_PRESENCE", strLabel: "Pay the days and ask for an override reason" }, { strValue: "ATTENDANCE", strLabel: "Treat missing days as unpaid (like payroll)" }] },
    ],
  },
  {
    strKey: "leave_encashment",
    strTitle: "Leave encashment",
    lstFields: [
      { strKey: "enabled", strLabel: "Calculate leave encashment", strKind: "switch" },
      { strKey: "basis", strLabel: "Per-day basis", strKind: "select", lstOptions: lstBasisOptions },
      { strKey: "component_codes", strLabel: "Component codes (comma separated)", strKind: "list" },
      { strKey: "divisor", strLabel: "Divisor (days)", strKind: "number", strHelp: "Per day = basis ÷ divisor, e.g. 30 or 26." },
      { strKey: "recover_excess_leave", strLabel: "Recover leave taken beyond the accrued balance", strKind: "switch" },
      { strKey: "apply_section_10_10aa", strLabel: "Apply section 10(10AA) exemption", strKind: "switch" },
      { strKey: "exempt_limit", strLabel: "Exemption limit (₹)", strKind: "number" },
      { strKey: "exempt_months_of_salary", strLabel: "Exemption cap in months of basis salary", strKind: "number" },
    ],
  },
  {
    strKey: "notice",
    strTitle: "Notice period",
    lstFields: [
      { strKey: "enabled", strLabel: "Calculate notice pay / recovery", strKind: "switch" },
      { strKey: "basis", strLabel: "Per-day basis", strKind: "select", lstOptions: lstBasisOptions },
      { strKey: "component_codes", strLabel: "Component codes (comma separated)", strKind: "list" },
      { strKey: "divisor", strLabel: "Divisor (days)", strKind: "number" },
      { strKey: "recovery_exit_types", strLabel: "Exit types where shortfall is recovered", strKind: "list" },
      { strKey: "payable_exit_types", strLabel: "Exit types where notice pay is paid", strKind: "list" },
      { strKey: "recovery_reduces_taxable_income", strLabel: "Notice recovery reduces taxable income", strKind: "switch" },
    ],
  },
  {
    strKey: "gratuity",
    strTitle: "Gratuity",
    lstFields: [
      { strKey: "enabled", strLabel: "Calculate gratuity", strKind: "switch" },
      { strKey: "basis", strLabel: "Last drawn wages basis", strKind: "select", lstOptions: lstBasisOptions },
      { strKey: "component_codes", strLabel: "Component codes (comma separated)", strKind: "list" },
      { strKey: "min_service_years", strLabel: "Minimum years of service", strKind: "number" },
      { strKey: "round_up_after_months", strLabel: "Part-year counts as a full year above (months)", strKind: "number" },
      { strKey: "days_factor", strLabel: "Days of wages per year", strKind: "number" },
      { strKey: "divisor", strLabel: "Divisor (days)", strKind: "number" },
      { strKey: "payout_cap", strLabel: "Maximum payout (₹)", strKind: "number" },
      { strKey: "exempt_limit", strLabel: "Tax exemption limit (₹)", strKind: "number" },
      { strKey: "no_minimum_exit_types", strLabel: "Exit types with no minimum service", strKind: "list" },
      { strKey: "require_statutory_flag", strLabel: "Only employees marked gratuity applicable", strKind: "switch" },
    ],
  },
  {
    strKey: "rounding",
    strTitle: "Rounding",
    lstFields: [
      { strKey: "component_rounding", strLabel: "Leave encashment, notice and gratuity amounts", strKind: "select", lstOptions: [{ strValue: "NEAREST", strLabel: "Nearest rupee" }, { strValue: "CEIL", strLabel: "Round up to the rupee" }, { strValue: "FLOOR", strLabel: "Round down to the rupee" }, { strValue: "NONE", strLabel: "No rounding (keep paise)" }], strHelp: "Salary and statutory lines follow each salary component's own rounding rule." },
    ],
  },
  {
    strKey: "approval",
    strTitle: "Approval",
    lstFields: [
      { strKey: "allow_self_approval", strLabel: "Allow the person who submitted a settlement to approve it", strKind: "switch", strHelp: "Off = maker-checker: a different user must approve." },
    ],
  },
  {
    strKey: "closure",
    strTitle: "When a settlement is marked paid / recovered",
    lstFields: [
      { strKey: "post_tax_ledger", strLabel: "Post F&F income and TDS to the employee tax ledger (Form 16)", strKind: "switch" },
      { strKey: "close_leave_balances", strLabel: "Record encashed / recovered leave in the leave ledger", strKind: "switch" },
      { strKey: "set_employee_inactive", strLabel: "Set the employee Inactive with date of exit = last working date", strKind: "switch" },
    ],
  },
];

type Props = {
  onMessage: (strMessage: string, strSeverity: "success" | "error") => void;
};

/**
 * Settings > Payroll > F&F Rules: the company's Full & Final calculation rules (moved here from the
 * F&F Settlement screen). Same API and rights as before: F&F "View" to see, F&F "Approve" to change.
 * Saved rules apply the next time a settlement is calculated.
 */
export default function FNFRulesSettingsPanel({ onMessage }: Props) {
  const { blnLoading: blnRightsLoading, can, canView } = useFNFRights();
  const blnCanView = canView() || can("edit");
  const blnCanEdit = can("approve");
  const [objSaved, setObjSaved] = useState<FNFPolicy | null>(null);
  const [objDraft, setObjDraft] = useState<FNFPolicy | null>(null);
  const [objDefaults, setObjDefaults] = useState<FNFPolicy | null>(null);
  const [blnIsDefault, setBlnIsDefault] = useState(true);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    let blnCancelled = false;
    fnfSettlementService
      .getPolicy()
      .then((objResponse) => {
        if (blnCancelled) return;
        setObjSaved(objResponse.objPolicy);
        setObjDraft(objResponse.objPolicy);
        setObjDefaults(objResponse.objDefaults);
        setBlnIsDefault(objResponse.blnIsDefault);
      })
      .catch(async (objError) => {
        if (!blnCancelled) onMessage((await createApiRequestError(objError)).message || "Unable to load F&F rules.", "error");
      })
      .finally(() => {
        if (!blnCancelled) setBlnLoading(false);
      });
    return () => {
      blnCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnRightsLoading, blnCanView]);

  const blnDirty = useMemo(
    () => Boolean(objSaved && objDraft && JSON.stringify(objSaved) !== JSON.stringify(objDraft)),
    [objSaved, objDraft]
  );

  function updateValue(strSection: SectionKey, strKey: string, objValue: FNFPolicySection[string]) {
    setObjDraft((objCurrent) => (objCurrent ? { ...objCurrent, [strSection]: { ...objCurrent[strSection], [strKey]: objValue } } : objCurrent));
  }

  async function handleSave() {
    if (!objDraft) return;
    setBlnSaving(true);
    try {
      const objResponse = await fnfSettlementService.savePolicy(objDraft);
      setObjSaved(objResponse.objPolicy);
      setObjDraft(objResponse.objPolicy);
      setBlnIsDefault(objResponse.blnIsDefault);
      onMessage("F&F rules saved. They apply the next time a settlement is calculated.", "success");
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message || "Unable to save F&F rules.", "error");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnRightsLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>;
  }
  if (!blnCanView) {
    return (
      <Alert severity="info" data-testid="settings.fnf-rules.no-right">
        Your user group cannot see the F&amp;F rules. Ask an administrator to grant F&amp;F Settlement &quot;View&quot; in User Group Rights.
      </Alert>
    );
  }
  if (blnLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>;
  }
  if (!objDraft) return null;

  const blnReadOnly = !blnCanEdit;
  const sxCard = { p: { xs: 2, md: 2.25 }, borderRadius: "8px", border: "1px solid #dfe9f5", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)", backgroundColor: "#fff" } as const;
  const sxSubHeading = { fontWeight: 800, color: "#172033", fontSize: "0.98rem", lineHeight: 1.2 } as const;
  const sxGrid = { display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(240px, 1fr))" }, gap: 1.5, mt: 1.25 } as const;

  function renderField(strSection: SectionKey, objField: FieldSpec) {
    const objValue = objDraft?.[strSection]?.[objField.strKey];
    const strControlId = `settings.fnf-rules.${strSection}.${objField.strKey}`;
    if (objField.strKind === "switch") {
      return (
        <FormControlLabel
          key={objField.strKey}
          control={<Switch checked={Boolean(objValue)} disabled={blnReadOnly} onChange={(_, blnChecked) => updateValue(strSection, objField.strKey, blnChecked)} inputProps={{ "data-controlid": strControlId } as never} />}
          label={<Typography sx={{ fontSize: "0.85rem" }}>{objField.strLabel}</Typography>}
        />
      );
    }
    if (objField.strKind === "select") {
      return (
        <TextField key={objField.strKey} select size="small" label={objField.strLabel} value={String(objValue ?? "")} disabled={blnReadOnly} onChange={(e) => updateValue(strSection, objField.strKey, e.target.value)} helperText={objField.strHelp} fullWidth inputProps={{ "data-controlid": strControlId }}>
          {objField.lstOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
        </TextField>
      );
    }
    if (objField.strKind === "list") {
      if (objField.strKey === "component_codes" && String(objDraft?.[strSection]?.basis) !== "COMPONENT_CODES") return null;
      return <TextField key={objField.strKey} size="small" label={objField.strLabel} value={Array.isArray(objValue) ? objValue.join(", ") : ""} disabled={blnReadOnly} onChange={(e) => updateValue(strSection, objField.strKey, e.target.value.split(",").map((strItem) => strItem.trim()).filter(Boolean))} helperText={objField.strHelp} fullWidth inputProps={{ "data-controlid": strControlId }} />;
    }
    return <TextField key={objField.strKey} size="small" type="number" label={objField.strLabel} value={objValue ?? ""} disabled={blnReadOnly} onChange={(e) => updateValue(strSection, objField.strKey, Number(e.target.value))} helperText={objField.strHelp} fullWidth inputProps={{ "data-controlid": strControlId }} />;
  }

  return (
    <>
      <Paper id="settings-section-fnf-rules" variant="outlined" sx={sxCard}>
        <Typography sx={{ ...sxSubHeading, fontSize: "1.05rem" }}>F&amp;F Rules</Typography>
        <Typography sx={{ color: "#48638d", fontSize: "0.78rem", mt: 0.5, lineHeight: 1.25 }}>
          How a Full &amp; Final settlement is calculated. Changes apply the next time a settlement is calculated.
        </Typography>
        {blnIsDefault ? (
          <Alert severity="info" sx={{ mt: 1.25 }}>
            These are the recommended defaults. Confirm the amounts and limits with your compliance team, then save to make them your company&apos;s rules.
          </Alert>
        ) : null}
        {blnReadOnly ? (
          <Alert severity="info" sx={{ mt: 1.25 }}>You can view the F&amp;F rules. Changing them needs the F&amp;F Settlement &quot;Approve&quot; right.</Alert>
        ) : null}
      </Paper>

      {lstSections.map((objSection) => (
        <Paper key={objSection.strKey} id={`settings-section-fnf-${objSection.strKey}`} variant="outlined" sx={sxCard}>
          <Typography sx={sxSubHeading}>{objSection.strTitle}</Typography>
          <Box sx={sxGrid}>{objSection.lstFields.map((objField) => renderField(objSection.strKey, objField))}</Box>
        </Paper>
      ))}

      {!blnReadOnly ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {objDefaults ? (
            <Button className="app-btn app-btn-outline" startIcon={<RestartAltRoundedIcon />} onClick={() => setObjDraft(objDefaults)} disabled={blnSaving} controlId="settings.fnf-rules.reset.button" sx={{ mr: "auto !important" }}>
              Reset to defaults
            </Button>
          ) : null}
          <Button className="app-btn app-btn-outline" startIcon={<CancelRoundedIcon />} onClick={() => setObjDraft(objSaved)} disabled={blnSaving || !blnDirty} controlId="settings.fnf-rules.cancel.button">Cancel</Button>
          <Button className="app-btn app-btn-primary" startIcon={<SaveRoundedIcon />} onClick={() => void handleSave()} disabled={blnSaving || !blnDirty} controlId="settings.fnf-rules.save.button">
            {blnSaving ? "Saving..." : "Save F&F Rules"}
          </Button>
        </Stack>
      ) : null}
    </>
  );
}
