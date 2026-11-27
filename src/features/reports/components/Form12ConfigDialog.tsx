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
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { form12ReportService, type Form12ConfigValue } from "@/features/reports/services/form12ReportService";

type Form12ConfigDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

// text: one value; lines: one value per line (header text, may contain commas); list: comma-separated codes.
type FieldKind = "text" | "lines" | "list" | "bool";
type FieldDef = { strKey: string; strLabel: string; strKind: FieldKind; strHelp?: string; blnFull?: boolean };

const lstFields: FieldDef[] = [
  { strKey: "factory_name", strLabel: "Factory name", strKind: "text", strHelp: "Printed in the register heading and the payable-days title." },
  { strKey: "state", strLabel: "State", strKind: "text" },
  { strKey: "rule_reference", strLabel: "Rule reference", strKind: "text", strHelp: "For example Rule 78." },
  { strKey: "section_reference", strLabel: "Section reference", strKind: "text", strHelp: "For example Section 62." },
  { strKey: "commencement_lines", strLabel: "Time of commencement of work", strKind: "lines", strHelp: "One line per shift group." },
  { strKey: "completion_lines", strLabel: "Time of completion", strKind: "lines", strHelp: "One line per shift." },
  { strKey: "rest_period_lines", strLabel: "Rest period", strKind: "lines", strHelp: "One line per rest period." },
  { strKey: "include_staff", strLabel: "Include staff (non-workers)", strKind: "bool", strHelp: "Staff are listed first in the register." },
  { strKey: "consultant_employment_type_codes", strLabel: "Consultant employment types", strKind: "list", strHelp: "Comma-separated employment type codes." },
  { strKey: "permanent_employment_type_codes", strLabel: "Permanent worker employment types", strKind: "list", strHelp: "Workers with any other type also appear under Worker P." },
  { strKey: "temporary_employment_type_codes", strLabel: "Temporary worker employment types", strKind: "list" },
  { strKey: "apprentice_employment_type_codes", strLabel: "Apprentice employment types", strKind: "list" },
  { strKey: "national_holiday_type_codes", strLabel: "National holiday types (NH)", strKind: "list", strHelp: "Holiday-master types printed as NH; every other holiday prints HD." },
  { strKey: "el_leave_type_codes", strLabel: "EL leave type codes", strKind: "list", strHelp: "Comma-separated. A leave type can feed only one column." },
  { strKey: "cl_leave_type_codes", strLabel: "CL leave type codes", strKind: "list" },
  { strKey: "sl_leave_type_codes", strLabel: "SL leave type codes", strKind: "list" },
  { strKey: "rh_leave_type_codes", strLabel: "RH leave type codes", strKind: "list" },
  { strKey: "cpl_leave_type_codes", strLabel: "CPL leave type codes", strKind: "list" },
];

type Draft = Record<string, string | boolean>;

function toDraft(dicSettings: Record<string, Form12ConfigValue>): Draft {
  const dicDraft: Draft = {};
  lstFields.forEach((dicField) => {
    const objValue = dicSettings[dicField.strKey];
    if (dicField.strKind === "bool") {
      dicDraft[dicField.strKey] = Boolean(objValue);
    } else if (dicField.strKind === "list") {
      dicDraft[dicField.strKey] = Array.isArray(objValue) ? objValue.join(", ") : "";
    } else if (dicField.strKind === "lines") {
      dicDraft[dicField.strKey] = Array.isArray(objValue) ? objValue.join("\n") : "";
    } else {
      dicDraft[dicField.strKey] = typeof objValue === "string" ? objValue : "";
    }
  });
  return dicDraft;
}

function draftToSettings(dicDraft: Draft): Record<string, Form12ConfigValue> {
  const dicSettings: Record<string, Form12ConfigValue> = {};
  lstFields.forEach((dicField) => {
    const objValue = dicDraft[dicField.strKey];
    if (dicField.strKind === "bool") {
      dicSettings[dicField.strKey] = Boolean(objValue);
    } else if (dicField.strKind === "list" || dicField.strKind === "lines") {
      const strSeparator = dicField.strKind === "list" ? "," : "\n";
      dicSettings[dicField.strKey] = String(objValue).split(strSeparator).map((strPart) => strPart.trim()).filter(Boolean);
    } else {
      dicSettings[dicField.strKey] = String(objValue).trim();
    }
  });
  return dicSettings;
}

export default function Form12ConfigDialog({ onClose, onSaved }: Form12ConfigDialogProps) {
  const [dicDraft, setDicDraft] = useState<Draft | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnActive = true;
    form12ReportService.getConfig()
      .then((dicConfig) => {
        if (blnActive) {
          setDicDraft(toDraft(dicConfig.dicSettings));
        }
      })
      .catch((objError) => {
        if (blnActive) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load the Form 12 configuration.");
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
      await form12ReportService.saveConfig(draftToSettings(dicDraft));
      onSaved();
      onClose();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save the configuration.");
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Dialog open onClose={blnSaving ? undefined : onClose} fullWidth maxWidth="md" controlId="reports.form12.config.dialog">
      <DialogTitle>Form 12 configuration</DialogTitle>
      <DialogContent dividers>
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
        {blnLoading ? <Typography>Loading configuration…</Typography> : null}
        {dicDraft ? (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, pt: 1 }}>
            {lstFields.map((dicField) => {
              const strControlId = `reports.form12.config.${dicField.strKey.replace(/_/g, "-")}`;
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
                  multiline={dicField.strKind === "lines"}
                  minRows={dicField.strKind === "lines" ? 2 : undefined}
                  label={dicField.strLabel}
                  value={String(dicDraft[dicField.strKey] ?? "")}
                  onChange={(objEvent) => setValue(dicField.strKey, objEvent.target.value)}
                  helperText={dicField.strHelp}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  controlId={`${strControlId}.input`}
                />
              );
            })}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={blnSaving} controlId="reports.form12.config.cancel.button">Cancel</Button>
        <Button variant="contained" onClick={() => save().catch(() => undefined)} disabled={blnLoading || blnSaving || !dicDraft} controlId="reports.form12.config.save.button">
          {blnSaving ? "Saving…" : "Save configuration"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
