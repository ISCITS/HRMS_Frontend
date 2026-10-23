"use client";

import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFPolicy, FNFPolicySection } from "@/features/payroll/types";

type SectionKey = "salary" | "leave_encashment" | "notice" | "gratuity" | "approval" | "closure";
type FieldSpec =
  | { strKey: string; strLabel: string; strKind: "number"; strHelp?: string }
  | { strKey: string; strLabel: string; strKind: "switch"; strHelp?: string }
  | { strKey: string; strLabel: string; strKind: "select"; lstOptions: { strValue: string; strLabel: string }[]; strHelp?: string }
  | { strKey: string; strLabel: string; strKind: "list"; strHelp?: string };

const lstBasisOptions = [
  { strValue: "GRATUITY_COMPONENTS", strLabel: "Components marked 'include in gratuity' (Basic + DA)" },
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

export default function FNFPolicyDialog({ blnOpen, blnCanEdit, onClose }: { blnOpen: boolean; blnCanEdit: boolean; onClose: () => void }) {
  const [objPolicy, setObjPolicy] = useState<FNFPolicy | null>(null);
  const [objDefaults, setObjDefaults] = useState<FNFPolicy | null>(null);
  const [blnIsDefault, setBlnIsDefault] = useState(true);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);

  useEffect(() => {
    if (!blnOpen) return;
    setStrError("");
    setStrSuccess("");
    fnfSettlementService.getPolicy()
      .then((objResponse) => { setObjPolicy(objResponse.objPolicy); setObjDefaults(objResponse.objDefaults); setBlnIsDefault(objResponse.blnIsDefault); })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load F&F rules."));
  }, [blnOpen]);

  function updateValue(strSection: SectionKey, strKey: string, objValue: FNFPolicySection[string]) {
    setObjPolicy((objCurrent) => objCurrent ? { ...objCurrent, [strSection]: { ...objCurrent[strSection], [strKey]: objValue } } : objCurrent);
  }

  async function handleSave() {
    if (!objPolicy) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const objResponse = await fnfSettlementService.savePolicy(objPolicy);
      setObjPolicy(objResponse.objPolicy);
      setBlnIsDefault(objResponse.blnIsDefault);
      setStrSuccess("F&F rules saved. They apply the next time a settlement is calculated.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save F&F rules.");
    } finally {
      setBlnSaving(false);
    }
  }

  function renderField(strSection: SectionKey, objField: FieldSpec) {
    const objValue = objPolicy?.[strSection]?.[objField.strKey];
    const strControlId = `payroll.fnf-policy.${strSection}.${objField.strKey}`;
    if (objField.strKind === "switch") {
      return <FormControlLabel key={objField.strKey} control={<Switch checked={Boolean(objValue)} disabled={!blnCanEdit} onChange={(_, blnChecked) => updateValue(strSection, objField.strKey, blnChecked)} />} label={objField.strLabel} />;
    }
    if (objField.strKind === "select") {
      return (
        <TextField key={objField.strKey} select size="small" label={objField.strLabel} value={String(objValue ?? "")} disabled={!blnCanEdit} onChange={(e) => updateValue(strSection, objField.strKey, e.target.value)} helperText={objField.strHelp} fullWidth controlId={strControlId}>
          {objField.lstOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
        </TextField>
      );
    }
    if (objField.strKind === "list") {
      if (objField.strKey === "component_codes" && String(objPolicy?.[strSection]?.basis) !== "COMPONENT_CODES") return null;
      return <TextField key={objField.strKey} size="small" label={objField.strLabel} value={Array.isArray(objValue) ? objValue.join(", ") : ""} disabled={!blnCanEdit} onChange={(e) => updateValue(strSection, objField.strKey, e.target.value.split(",").map((strItem) => strItem.trim()).filter(Boolean))} helperText={objField.strHelp} fullWidth controlId={strControlId} />;
    }
    return <TextField key={objField.strKey} size="small" type="number" label={objField.strLabel} value={objValue ?? ""} disabled={!blnCanEdit} onChange={(e) => updateValue(strSection, objField.strKey, Number(e.target.value))} helperText={objField.strHelp} fullWidth controlId={strControlId} />;
  }

  return (
    <Dialog open={blnOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>F&amp;F Calculation Rules</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {strError ? <Alert severity="error">{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
          {blnIsDefault ? <Alert severity="info">These are the recommended defaults. Confirm the amounts and limits with your compliance team, then save to make them your company&apos;s rules.</Alert> : null}
          {!blnCanEdit ? <Alert severity="info">Only F&amp;F approvers can change these rules.</Alert> : null}
          {objPolicy ? lstSections.map((objSection) => (
            <Box key={objSection.strKey} sx={{ borderTop: "1px solid #d9e6ef", pt: 2 }}>
              <Typography sx={{ fontWeight: 800, mb: 1.5 }}>{objSection.strTitle}</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                {objSection.lstFields.map((objField) => renderField(objSection.strKey, objField))}
              </Box>
            </Box>
          )) : <Typography sx={{ color: "#64748b" }}>Loading…</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {blnCanEdit && objDefaults ? <Button startIcon={<RestartAltRoundedIcon />} onClick={() => setObjPolicy(objDefaults)} disabled={blnSaving} controlId="payroll.fnf-policy.reset.button">Reset to defaults</Button> : null}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={blnSaving} controlId="payroll.fnf-policy.close.button">Close</Button>
        {blnCanEdit ? <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => handleSave().catch(() => undefined)} disabled={blnSaving || !objPolicy} controlId="payroll.fnf-policy.save.button">Save Rules</Button> : null}
      </DialogActions>
    </Dialog>
  );
}
