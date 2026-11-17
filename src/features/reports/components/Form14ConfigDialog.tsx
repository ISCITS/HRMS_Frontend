"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { form14ReportService, type Form14ConfigValue } from "@/features/reports/services/form14ReportService";

type Form14ConfigDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

type FieldKind = "text" | "int" | "decimal" | "bool" | "list" | "select";
type FieldDef = { strKey: string; strLabel: string; strKind: FieldKind; strHelp?: string };

const lstFields: FieldDef[] = [
  { strKey: "state", strLabel: "State", strKind: "text", strHelp: "Printed as “<State> Factories Rules”." },
  { strKey: "regime", strLabel: "Regime", strKind: "select" },
  { strKey: "rule_reference", strLabel: "Rule reference", strKind: "text", strHelp: "For example Rule 102." },
  { strKey: "factory_name", strLabel: "Factory name", strKind: "text" },
  { strKey: "eligibility_days", strLabel: "Eligibility days", strKind: "int", strHelp: "Days worked needed to earn leave." },
  { strKey: "earning_ratio_adult", strLabel: "Earning ratio – adult (1 day per n)", strKind: "int" },
  { strKey: "earning_ratio_child", strLabel: "Earning ratio – child (1 day per n)", strKind: "int" },
  { strKey: "carry_forward_cap_adult", strLabel: "Carry-forward cap – adult (days)", strKind: "decimal" },
  { strKey: "carry_forward_cap_child", strLabel: "Carry-forward cap – child (days)", strKind: "decimal" },
  { strKey: "child_age_below", strLabel: "Child worker below age", strKind: "int" },
  { strKey: "maternity_cap_days", strLabel: "Maternity cap (days)", strKind: "int" },
  { strKey: "joiner_fraction_numerator", strLabel: "Joiner fraction – numerator", strKind: "int" },
  { strKey: "joiner_fraction_denominator", strLabel: "Joiner fraction – denominator", strKind: "int" },
  { strKey: "show_additional_columns", strLabel: "Show additional columns by default", strKind: "bool" },
  { strKey: "workers_only", strLabel: "Workers only", strKind: "bool", strHelp: "Leave out employees who are not workers." },
  { strKey: "additional_leave_types", strLabel: "Additional leave types", strKind: "list", strHelp: "Comma-separated leave type codes shown in the additional block." },
  { strKey: "el_leave_type_codes", strLabel: "EL leave type codes", strKind: "list", strHelp: "Comma-separated. Required for the EL columns." },
  { strKey: "maternity_leave_type_codes", strLabel: "Maternity leave type codes", strKind: "list", strHelp: "Comma-separated." },
  { strKey: "layoff_leave_type_codes", strLabel: "Lay-off leave type codes", strKind: "list", strHelp: "Comma-separated." },
  { strKey: "basic_da_component_codes", strLabel: "Basic + DA component codes", strKind: "list", strHelp: "Comma-separated salary component codes." },
  { strKey: "concession_component_codes", strLabel: "Concession component codes", strKind: "list", strHelp: "Comma-separated salary component codes." },
  { strKey: "exclude_component_codes", strLabel: "Excluded component codes", strKind: "list", strHelp: "Comma-separated salary component codes." },
];

type Draft = Record<string, string | boolean>;

function toDraft(dicSettings: Record<string, Form14ConfigValue>): Draft {
  const dicDraft: Draft = {};
  lstFields.forEach((dicField) => {
    const objValue = dicSettings[dicField.strKey];
    if (dicField.strKind === "bool") {
      dicDraft[dicField.strKey] = Boolean(objValue);
    } else if (dicField.strKind === "list") {
      dicDraft[dicField.strKey] = Array.isArray(objValue) ? objValue.join(", ") : "";
    } else {
      dicDraft[dicField.strKey] = objValue === undefined || objValue === null ? "" : String(objValue);
    }
  });
  return dicDraft;
}

// Draft strings back to the typed values the API validates; a blank or non-numeric number is
// sent as the raw text so the server can name the offending key.
function draftToSettings(dicDraft: Draft): Record<string, Form14ConfigValue> {
  const dicSettings: Record<string, Form14ConfigValue> = {};
  lstFields.forEach((dicField) => {
    const objValue = dicDraft[dicField.strKey];
    if (dicField.strKind === "bool") {
      dicSettings[dicField.strKey] = Boolean(objValue);
    } else if (dicField.strKind === "list") {
      dicSettings[dicField.strKey] = String(objValue).split(",").map((strPart) => strPart.trim()).filter(Boolean);
    } else if (dicField.strKind === "int" || dicField.strKind === "decimal") {
      const strText = String(objValue).trim();
      dicSettings[dicField.strKey] = strText !== "" && !Number.isNaN(Number(strText)) ? Number(strText) : strText;
    } else {
      dicSettings[dicField.strKey] = String(objValue).trim();
    }
  });
  return dicSettings;
}

export default function Form14ConfigDialog({ onClose, onSaved }: Form14ConfigDialogProps) {
  const [dicDraft, setDicDraft] = useState<Draft | null>(null);
  const [lstRegimes, setLstRegimes] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnActive = true;
    form14ReportService.getConfig()
      .then((dicConfig) => {
        if (!blnActive) {
          return;
        }
        setDicDraft(toDraft(dicConfig.dicSettings));
        setLstRegimes(dicConfig.dicAllowedValues?.regime ?? []);
      })
      .catch((objError) => {
        if (blnActive) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load the Form 14 configuration.");
        }
      })
      .finally(() => {
        if (blnActive) {
          setBlnLoading(false);
        }
      });
    return () => {
      blnActive = false;
    };
  }, []);

  function setValue(strKey: string, objValue: string | boolean) {
    setDicDraft((dicPrevious) => (dicPrevious ? { ...dicPrevious, [strKey]: objValue } : dicPrevious));
  }

  async function save() {
    if (!dicDraft) {
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSaved = await form14ReportService.saveConfig(draftToSettings(dicDraft));
      setDicDraft(toDraft(dicSaved.dicSettings));
      onSaved();
      onClose();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save the configuration.");
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Dialog open onClose={blnSaving ? undefined : onClose} fullWidth maxWidth="md" controlId="reports.form14.config.dialog">
      <DialogTitle>Form 14 configuration</DialogTitle>
      <DialogContent dividers>
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
        {blnLoading ? <Typography>Loading configuration…</Typography> : null}
        {dicDraft ? (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, pt: 1 }}>
            {lstFields.map((dicField) => {
              const strControlId = `reports.form14.config.${dicField.strKey.replace(/_/g, "-")}`;
              if (dicField.strKind === "bool") {
                return (
                  <Box key={dicField.strKey}>
                    <FormControlLabel
                      control={<Switch checked={Boolean(dicDraft[dicField.strKey])} onChange={(objEvent) => setValue(dicField.strKey, objEvent.target.checked)} controlId={`${strControlId}.switch`} />}
                      label={dicField.strLabel}
                    />
                    {dicField.strHelp ? <Typography variant="caption" display="block" color="text.secondary">{dicField.strHelp}</Typography> : null}
                  </Box>
                );
              }
              return (
                <TextField
                  key={dicField.strKey}
                  className="app-mui-text-field"
                  size="small"
                  select={dicField.strKind === "select"}
                  type={dicField.strKind === "int" || dicField.strKind === "decimal" ? "number" : "text"}
                  label={dicField.strLabel}
                  value={String(dicDraft[dicField.strKey] ?? "")}
                  onChange={(objEvent) => setValue(dicField.strKey, objEvent.target.value)}
                  helperText={dicField.strHelp}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={dicField.strKind === "int" ? { step: 1 } : dicField.strKind === "decimal" ? { step: 0.5 } : undefined}
                  controlId={`${strControlId}.${dicField.strKind === "select" ? "select" : "input"}`}
                >
                  {dicField.strKind === "select"
                    ? lstRegimes.map((strRegime) => <MenuItem key={strRegime} value={strRegime}>{strRegime}</MenuItem>)
                    : null}
                </TextField>
              );
            })}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={blnSaving} controlId="reports.form14.config.cancel.button">Cancel</Button>
        <Button variant="contained" onClick={() => save().catch(() => undefined)} disabled={blnLoading || blnSaving || !dicDraft} controlId="reports.form14.config.save.button">
          {blnSaving ? "Saving…" : "Save configuration"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
