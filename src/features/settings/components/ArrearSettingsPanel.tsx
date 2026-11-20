"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { settingsService } from "@/features/settings/services/settingsService";
import type {
  ArrearExclusionDto,
  ArrearExclusionEmployeeDto,
  ArrearExclusionListDto,
  ArrearSettings,
  ArrearSettingsConfigDto,
} from "@/features/settings/types";

const ARREAR_SETTINGS_VIEW = "payroll_arrear_settings_view";
const ARREAR_SETTINGS_EDIT = "payroll_arrear_settings_edit";

const DIC_TRIGGER_LABEL: Record<string, string> = {
  SALARY_REVISION: "Salary revision (backdated)",
  PROMOTION: "Promotion / structure change",
  ATTENDANCE: "Attendance / leave correction",
  MISSED_MONTH: "Missed month (no salary paid)",
};

const DIC_MODE_TEXT: Record<ArrearSettings["arrear_mode"], string> = {
  off: "Arrears are not calculated. Payroll works exactly as before.",
  shadow:
    "Preview: arrears are calculated and shown on the payroll run as 'Preview - not paid'. Net pay, TDS, PF, ESI, payslips and registers do not change.",
  on: "Arrears are calculated and paid in the payroll run, with PF, ESI and TDS on them. Only employees with an arrear are affected.",
};

type SelectOption = { strValue: string; strLabel: string };
const DIC_SELECT_OPTIONS: Partial<Record<keyof ArrearSettings, SelectOption[]>> = {
  arrear_pf_mode: [
    { strValue: "ORIGINAL_MONTH", strLabel: "Original month's PF rules (ceiling, basis, rounding)" },
    { strValue: "NONE", strLabel: "No PF on arrears" },
  ],
  arrear_esi_mode: [
    { strValue: "ORIGINAL_MONTH", strLabel: "Only if covered by ESI in the original month" },
    { strValue: "NONE", strLabel: "No ESI on arrears" },
  ],
  arrear_wage_test_mode: [
    { strValue: "ORIGINAL_MONTH", strLabel: "Re-test the original month" },
    { strValue: "NONE", strLabel: "Do not re-test" },
  ],
  arrear_pt_mode: [
    { strValue: "REGULAR_ONLY", strLabel: "PT on regular salary only" },
    { strValue: "ORIGINAL_MONTH", strLabel: "Recalculate PT of the original month" },
  ],
  arrear_tds_mode: [
    { strValue: "ONE_TIME_SAME_MONTH", strLabel: "Tax on the arrear deducted in the month it is paid" },
    { strValue: "SPREAD", strLabel: "Tax on the arrear spread over the remaining months" },
  ],
  arrear_payslip_style: [
    { strValue: "SECTION", strLabel: "Separate Arrears section" },
    { strValue: "COLUMN", strLabel: "Arrears column next to each component" },
    { strValue: "SINGLE_LINE", strLabel: "One 'Arrears' line" },
  ],
  arrear_import_statutory: [
    { strValue: "CALCULATE", strLabel: "System calculates PF/ESI for the original month" },
    { strValue: "FROM_FILE", strLabel: "Take PF/ESI from the file" },
    { strValue: "CURRENT_MONTH", strLabel: "Treat as a current-month line (as today)" },
  ],
  arrear_import_conflict: [
    { strValue: "IMPORT_WINS", strLabel: "Imported amount replaces the automatic one" },
    { strValue: "BLOCK", strLabel: "Reject the imported row" },
    { strValue: "ADD", strLabel: "Pay both" },
  ],
  arrear_import_mode: [
    { strValue: "REPLACE_BATCH", strLabel: "Re-import replaces the earlier import of the run" },
    { strValue: "APPEND", strLabel: "Re-import adds to the earlier import" },
  ],
};

type Props = {
  onMessage: (strMessage: string, strSeverity: "success" | "error") => void;
};

/**
 * Settings > Payroll > Arrears: every control of arrear automation, per company. Rights:
 * "Arrear Settings - View" to see, "Arrear Settings - Edit" to change. Default is Off, which keeps
 * payroll exactly as it is today.
 */
export default function ArrearSettingsPanel({ onMessage }: Props) {
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const blnCanView = canDo("settings", ARREAR_SETTINGS_VIEW);
  const blnCanEdit = canDo("settings", ARREAR_SETTINGS_EDIT);
  const [objConfig, setObjConfig] = useState<ArrearSettingsConfigDto | null>(null);
  const [objDraft, setObjDraft] = useState<ArrearSettings | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strNewComponentCode, setStrNewComponentCode] = useState("");
  const [strNewComponentFlag, setStrNewComponentFlag] = useState<"YES" | "NO">("NO");

  function applyConfig(objNext: ArrearSettingsConfigDto) {
    setObjConfig(objNext);
    setObjDraft({ ...objNext.dicSettings, arrear_component_overrides: { ...objNext.dicSettings.arrear_component_overrides } });
  }

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    let blnCancelled = false;
    settingsService
      .getArrearSettings()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnRightsLoading, blnCanView]);

  const blnDirty = useMemo(
    () => Boolean(objConfig && objDraft && JSON.stringify(objConfig.dicSettings) !== JSON.stringify(objDraft)),
    [objConfig, objDraft]
  );

  async function handleSave() {
    if (!objDraft) return;
    setBlnSaving(true);
    try {
      applyConfig(await settingsService.saveArrearSettings(objDraft));
      onMessage("Arrear settings saved. They apply the next time a payroll run is processed.", "success");
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnRightsLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>;
  }
  if (!blnCanView) {
    return (
      <Alert severity="info" data-testid="settings.arrears.no-right">
        Your user group cannot see the arrear settings. Ask an administrator to grant &quot;Arrear Settings - View&quot; under Settings in User Group Rights.
      </Alert>
    );
  }
  if (blnLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><DottedLoader /></Box>;
  }
  if (!objConfig || !objDraft) return null;

  const blnReadOnly = !blnCanEdit;
  const blnTablesMissing = objConfig.lstMissingTables.length > 0;
  const sxCard = { p: { xs: 2, md: 2.25 }, borderRadius: "8px", border: "1px solid #dfe9f5", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)", backgroundColor: "#fff" } as const;
  const sxSubHeading = { fontWeight: 800, color: "#172033", fontSize: "0.98rem", lineHeight: 1.2 } as const;
  const sxSubCaption = { color: "#48638d", fontSize: "0.78rem", mb: 1.25, lineHeight: 1.25 } as const;
  const sxGrid = { display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(240px, 1fr))" }, gap: 1.5 } as const;

  function setValue<K extends keyof ArrearSettings>(strKey: K, objValue: ArrearSettings[K]) {
    setObjDraft((objPrevious) => (objPrevious ? { ...objPrevious, [strKey]: objValue } : objPrevious));
  }

  function renderSelect(strKey: keyof ArrearSettings, strLabel: string) {
    const lstOptions = DIC_SELECT_OPTIONS[strKey] ?? [];
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={strLabel}
        value={String(objDraft![strKey] ?? "")}
        disabled={blnReadOnly}
        onChange={(objEvent) => setValue(strKey, objEvent.target.value as never)}
        inputProps={{ "data-controlid": `settings.arrears.${strKey}` }}
      >
        {lstOptions.map((objOption) => (
          <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>
        ))}
      </TextField>
    );
  }

  function renderNumber(strKey: keyof ArrearSettings, strLabel: string, strHelp?: string) {
    return (
      <TextField
        size="small"
        fullWidth
        type="number"
        label={strLabel}
        helperText={strHelp}
        value={String(objDraft![strKey] ?? "")}
        disabled={blnReadOnly}
        onChange={(objEvent) => setValue(strKey, Number(objEvent.target.value) as never)}
        inputProps={{ "data-controlid": `settings.arrears.${strKey}` }}
      />
    );
  }

  function renderSwitch(strKey: keyof ArrearSettings, strLabel: string) {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(objDraft![strKey])}
            disabled={blnReadOnly}
            onChange={(objEvent) => setValue(strKey, objEvent.target.checked as never)}
            inputProps={{ "data-controlid": `settings.arrears.${strKey}` } as never}
          />
        }
        label={<Typography sx={{ fontSize: "0.85rem" }}>{strLabel}</Typography>}
      />
    );
  }

  function toggleTrigger(strCode: string, blnChecked: boolean) {
    const lstNext = blnChecked
      ? Array.from(new Set([...objDraft!.arrear_triggers, strCode]))
      : objDraft!.arrear_triggers.filter((strItem) => strItem !== strCode);
    setValue("arrear_triggers", lstNext);
  }

  function addComponentOverride() {
    const strCode = strNewComponentCode.trim().toUpperCase();
    if (!strCode) return;
    setValue("arrear_component_overrides", { ...objDraft!.arrear_component_overrides, [strCode]: strNewComponentFlag });
    setStrNewComponentCode("");
  }

  function removeComponentOverride(strCode: string) {
    const dicNext = { ...objDraft!.arrear_component_overrides };
    delete dicNext[strCode];
    setValue("arrear_component_overrides", dicNext);
  }

  return (
    <>
      {blnReadOnly ? (
        <Alert severity="info">You can view the arrear settings. Changing them needs the &quot;Arrear Settings - Edit&quot; right.</Alert>
      ) : null}
      {blnTablesMissing ? (
        <Alert severity="warning" data-testid="settings.arrears.tables-missing">
          The arrear database script has not been applied yet, so arrears can stay Off only. Ask the administrator to run docs/apply_arrear_automation.sql.
        </Alert>
      ) : null}

      <Paper id="settings-section-arrear-mode" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Arrears</Typography>
        <Typography sx={sxSubCaption}>
          Arrears for earlier months (backdated revisions, promotions, corrections) are calculated when a payroll run is processed and paid when it is finalized.
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={objDraft.arrear_mode}
          disabled={blnReadOnly}
          onChange={(_objEvent, strNext: ArrearSettings["arrear_mode"] | null) => strNext && setValue("arrear_mode", strNext)}
          data-controlid="settings.arrears.mode"
        >
          <ToggleButton value="off" sx={{ fontWeight: 700, textTransform: "none", px: 2 }}>Off</ToggleButton>
          <ToggleButton value="shadow" disabled={blnTablesMissing} sx={{ fontWeight: 700, textTransform: "none", px: 2 }}>Preview only</ToggleButton>
          <ToggleButton value="on" disabled={blnTablesMissing} sx={{ fontWeight: 700, textTransform: "none", px: 2 }}>On (pay arrears)</ToggleButton>
        </ToggleButtonGroup>
        <Typography sx={{ color: "#60749b", fontSize: "0.78rem", mt: 1 }}>{DIC_MODE_TEXT[objDraft.arrear_mode]}</Typography>
      </Paper>

      <Paper id="settings-section-arrear-scope" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>What is checked</Typography>
        <Typography sx={sxSubCaption}>Earlier months are examined only from the start month and within the look-back. Months before the start month are never touched (use Import Arrears for them).</Typography>
        <Box sx={sxGrid}>
          <TextField
            size="small"
            fullWidth
            type="month"
            label="Start month"
            InputLabelProps={{ shrink: true }}
            value={objDraft.arrear_start_month ?? ""}
            disabled={blnReadOnly}
            onChange={(objEvent) => setValue("arrear_start_month", objEvent.target.value || null)}
            helperText={
              objDraft.arrear_start_month
                ? undefined
                : `Blank = earliest finalized payroll month${objConfig.strEarliestFinalizedMonth ? ` (${objConfig.strEarliestFinalizedMonth})` : ""}`
            }
            inputProps={{ "data-controlid": "settings.arrears.arrear_start_month" }}
          />
          {renderNumber("arrear_max_lookback_months", "Look-back (months)", "1 to 24")}
        </Box>
        <Typography sx={{ ...sxSubCaption, mt: 2, mb: 0.5 }}>Causes of arrears</Typography>
        <Stack>
          {objConfig.lstTriggers.map((objTrigger) => (
            <FormControlLabel
              key={objTrigger.strCode}
              control={
                <Checkbox
                  checked={objDraft.arrear_triggers.includes(objTrigger.strCode)}
                  disabled={blnReadOnly || objTrigger.blnBlocked}
                  onChange={(objEvent) => toggleTrigger(objTrigger.strCode, objEvent.target.checked)}
                />
              }
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontSize: "0.85rem" }}>{DIC_TRIGGER_LABEL[objTrigger.strCode] ?? objTrigger.strCode}</Typography>
                  {objTrigger.blnBlocked ? <Chip size="small" label={objTrigger.strBlockedReason ?? "Not available yet"} /> : null}
                </Stack>
              }
            />
          ))}
        </Stack>
      </Paper>

      <Paper id="settings-section-arrear-amounts" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Amounts and recoveries</Typography>
        <Typography sx={sxSubCaption}>Smaller arrears are not paid; larger ones are flagged for review (warning only).</Typography>
        <Box sx={sxGrid}>
          {renderNumber("arrear_min_amount", "Minimum arrear per employee (Rs)")}
          {renderNumber("arrear_max_amount_alert", "Review alert above (Rs)")}
        </Box>
        <Box sx={{ mt: 1 }}>{renderSwitch("allow_negative_arrear", "Recover downward differences (recoveries)")}</Box>
        {objDraft.allow_negative_arrear ? (
          <Box sx={{ ...sxGrid, mt: 1 }}>{renderNumber("arrear_recovery_max_percent_of_net", "Recovery limit (% of net pay)", "The rest is carried to the next run")}</Box>
        ) : null}
      </Paper>

      <Paper id="settings-section-arrear-statutory" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>PF, ESI, PT and income tax on arrears</Typography>
        <Typography sx={sxSubCaption}>PF, ESI, PT and the 50% wage test use the rules of the month the arrear belongs to, with the same calculation as regular payroll.</Typography>
        <Box sx={sxGrid}>
          {renderSelect("arrear_pf_mode", "PF")}
          {renderSelect("arrear_esi_mode", "ESI")}
          {renderSelect("arrear_wage_test_mode", "50% wage test")}
          {renderSelect("arrear_pt_mode", "Professional tax")}
          {renderSelect("arrear_tds_mode", "Income tax (TDS)")}
        </Box>
        <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 1 }}>When TDS mode is Client (imported TDS), the imported TDS is used as it is.</Typography>
      </Paper>

      <Paper id="settings-section-arrear-review" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Review and payslip</Typography>
        <Box sx={{ mt: 0.5 }}>{renderSwitch("arrear_requires_review_ack", "Ask for 'Arrears reviewed' on Finalize when a run has arrears")}</Box>
        <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 0.5 }}>
          Payslips show each arrear as its own line (e.g. &quot;Basic Arrear (Jul 2026 - Sep 2026)&quot;) after the regular earnings; Format 1 payslips show them in their Arrears column. The salary register gets separate arrear columns.
        </Typography>
      </Paper>

      <Paper id="settings-section-arrear-fnf" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Full and final settlement</Typography>
        <Box sx={{ mt: 0.5 }}>{renderSwitch("arrear_include_in_fnf", "Include arrears in F&F settlement")}</Box>
        <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 0.5 }}>
          Arrears for months already paid by payroll are added to the F&amp;F (only when arrear mode is On; in Preview only they are shown as information).
        </Typography>
      </Paper>

      <Paper id="settings-section-arrear-import" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Import Arrears (Excel)</Typography>
        <Typography sx={sxSubCaption}>Manual arrears can be imported from Excel on the payroll run, even while automatic arrears are Off.</Typography>
        {renderSwitch("arrear_import_enabled", "Allow Import Arrears on payroll runs")}
        {objDraft.arrear_import_enabled ? (
          <Box sx={{ ...sxGrid, mt: 1 }}>
            {renderSelect("arrear_import_statutory", "PF / ESI on imported arrears")}
            {renderSelect("arrear_import_conflict", "Imported and automatic arrear for the same month")}
            {renderSelect("arrear_import_mode", "Importing again for the same run")}
          </Box>
        ) : null}
      </Paper>

      <Paper id="settings-section-arrear-components" variant="outlined" sx={sxCard}>
        <Typography sx={sxSubHeading}>Components</Typography>
        <Typography sx={sxSubCaption}>
          By default fixed earnings get arrears; reimbursements, flexi, variable pay / incentives, loan perquisites and one-time payments never do. List a component code here to change that.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {Object.entries(objDraft.arrear_component_overrides).length === 0 ? (
            <Typography sx={{ color: "#60749b", fontSize: "0.8rem" }}>No exceptions - the default rule applies to every component.</Typography>
          ) : (
            Object.entries(objDraft.arrear_component_overrides).map(([strCode, strFlag]) => (
              <Chip
                key={strCode}
                label={`${strCode}: ${strFlag === "YES" ? "gets arrears" : "no arrears"}`}
                color={strFlag === "YES" ? "success" : "default"}
                onDelete={blnReadOnly ? undefined : () => removeComponentOverride(strCode)}
                deleteIcon={<DeleteOutlineRoundedIcon />}
              />
            ))
          )}
        </Stack>
        {!blnReadOnly ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
            <TextField size="small" label="Component code" value={strNewComponentCode} onChange={(objEvent) => setStrNewComponentCode(objEvent.target.value)} inputProps={{ "data-controlid": "settings.arrears.component-code" }} />
            <TextField select size="small" label="Arrears" value={strNewComponentFlag} onChange={(objEvent) => setStrNewComponentFlag(objEvent.target.value as "YES" | "NO")} sx={{ minWidth: 160 }}>
              <MenuItem value="YES">Gets arrears</MenuItem>
              <MenuItem value="NO">No arrears</MenuItem>
            </TextField>
            <Button className="app-btn app-btn-outline" startIcon={<AddRoundedIcon />} onClick={addComponentOverride} disabled={!strNewComponentCode.trim()} controlId="settings.arrears.component-add.button">
              Add
            </Button>
          </Stack>
        ) : null}
      </Paper>

      {!blnReadOnly ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button className="app-btn app-btn-outline" startIcon={<CancelRoundedIcon />} onClick={() => applyConfig(objConfig)} disabled={blnSaving || !blnDirty} controlId="settings.arrears.cancel.button">Cancel</Button>
          <Button className="app-btn app-btn-primary" startIcon={<SaveRoundedIcon />} onClick={() => void handleSave()} disabled={blnSaving || !blnDirty} controlId="settings.arrears.save.button">
            {blnSaving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      ) : null}

      <ArrearExclusionsSection blnReadOnly={blnReadOnly} onMessage={onMessage} sxCard={sxCard} sxSubHeading={sxSubHeading} sxSubCaption={sxSubCaption} />
    </>
  );
}

function currentMonth(): string {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}`;
}

type ExclusionSectionProps = {
  blnReadOnly: boolean;
  onMessage: Props["onMessage"];
  sxCard: SxProps<Theme>;
  sxSubHeading: SxProps<Theme>;
  sxSubCaption: SxProps<Theme>;
};

/**
 * Excluded employees: no automatic arrear for original months in [from, to]. Changes are saved
 * at once (not with the Save button above). View needs "Arrear Settings - View", add / remove
 * "Arrear Settings - Edit".
 */
function ArrearExclusionsSection({ blnReadOnly, onMessage, sxCard, sxSubHeading, sxSubCaption }: ExclusionSectionProps) {
  const [objList, setObjList] = useState<ArrearExclusionListDto | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBusy, setBlnBusy] = useState(false);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [objEmployee, setObjEmployee] = useState<ArrearExclusionEmployeeDto | null>(null);
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<ArrearExclusionEmployeeDto[]>([]);
  const [blnSearching, setBlnSearching] = useState(false);
  const refSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [strFromMonth, setStrFromMonth] = useState(currentMonth());
  const [strToMonth, setStrToMonth] = useState("");
  const [strReason, setStrReason] = useState("");
  const [objRemoveTarget, setObjRemoveTarget] = useState<ArrearExclusionDto | null>(null);

  async function load() {
    try {
      setObjList(await settingsService.listArrearExclusions());
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => {
      if (refSearchTimer.current) clearTimeout(refSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runEmployeeSearch(strText: string) {
    if (refSearchTimer.current) clearTimeout(refSearchTimer.current);
    refSearchTimer.current = setTimeout(async () => {
      setBlnSearching(true);
      try {
        setLstEmployeeOptions(await settingsService.searchArrearExclusionEmployees(strText));
      } catch {
        setLstEmployeeOptions([]);
      } finally {
        setBlnSearching(false);
      }
    }, 300);
  }

  function openDialog() {
    setObjEmployee(null);
    setStrFromMonth(currentMonth());
    setStrToMonth("");
    setStrReason("");
    setBlnDialogOpen(true);
  }

  const strDialogError =
    strToMonth && strFromMonth && strToMonth < strFromMonth ? "To month cannot be before From month." : "";
  const blnCanAdd = Boolean(objEmployee && strFromMonth && strReason.trim() && !strDialogError);

  async function handleAdd() {
    if (!objEmployee || !blnCanAdd) return;
    setBlnBusy(true);
    try {
      await settingsService.addArrearExclusion({
        intEmployeeID: objEmployee.intEmployeeID,
        strFromMonth,
        strToMonth: strToMonth || null,
        strReason: strReason.trim(),
      });
      setBlnDialogOpen(false);
      onMessage(`${objEmployee.strEmployeeCode} excluded from automatic arrears. It applies the next time a payroll run is processed.`, "success");
      await load();
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleRemove() {
    if (!objRemoveTarget) return;
    setBlnBusy(true);
    try {
      await settingsService.removeArrearExclusion(objRemoveTarget.intID);
      onMessage(`Exclusion of ${objRemoveTarget.strEmployeeCode} removed. Arrears are checked for these months again from the next payroll run.`, "success");
      setObjRemoveTarget(null);
      await load();
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnBusy(false);
    }
  }

  return (
    <Paper id="settings-section-arrear-exclusions" variant="outlined" sx={sxCard}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
        <Box>
          <Typography sx={sxSubHeading}>Excluded employees</Typography>
          <Typography sx={sxSubCaption}>
            These employees get no automatic arrear for the months listed (e.g. settled outside payroll). Imported arrears are not affected. Changes here are saved at once.
          </Typography>
        </Box>
        {!blnReadOnly && objList?.blnAvailable ? (
          <Button className="app-btn app-btn-outline" startIcon={<AddRoundedIcon />} onClick={openDialog} disabled={blnBusy} controlId="settings.arrears.exclusions.add.button" sx={{ whiteSpace: "nowrap" }}>
            Exclude employee
          </Button>
        ) : null}
      </Stack>
      {blnLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><DottedLoader /></Box>
      ) : !objList?.blnAvailable ? (
        <Alert severity="info">{objList?.strMessage ?? "Arrear exclusions are not available yet."}</Alert>
      ) : objList.lstExclusions.length === 0 ? (
        <Typography sx={{ color: "#60749b", fontSize: "0.8rem" }}>No employee is excluded.</Typography>
      ) : (
        <Table size="small" data-testid="settings.arrears.exclusions.table">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Months</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Added on</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {objList.lstExclusions.map((objRow) => (
              <TableRow key={objRow.intID}>
                <TableCell>{objRow.strEmployeeCode} - {objRow.strEmployeeName}</TableCell>
                <TableCell>{objRow.strPeriodLabel}</TableCell>
                <TableCell>{objRow.strReason}</TableCell>
                <TableCell>{objRow.dtAddedOn ? new Date(objRow.dtAddedOn).toLocaleDateString("en-IN") : ""}</TableCell>
                <TableCell align="right">
                  {!blnReadOnly ? (
                    <Button size="small" className="app-btn app-btn-outline" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setObjRemoveTarget(objRow)} disabled={blnBusy} controlId={`settings.arrears.exclusions.${objRow.intID}.remove.button`}>
                      Remove
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={blnDialogOpen} onClose={() => (blnBusy ? undefined : setBlnDialogOpen(false))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Exclude employee from automatic arrears</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Autocomplete
              value={objEmployee}
              options={lstEmployeeOptions}
              loading={blnSearching}
              isOptionEqualToValue={(objA, objB) => objA.intEmployeeID === objB.intEmployeeID}
              getOptionLabel={(objOption) => `${objOption.strFullName} (${objOption.strEmployeeCode})`}
              filterOptions={(objOptions) => objOptions}
              onChange={(_objEvent, objNext) => setObjEmployee(objNext)}
              onInputChange={(_objEvent, strText, strReasonCode) => {
                if (strReasonCode === "input") runEmployeeSearch(strText);
              }}
              onOpen={() => runEmployeeSearch("")}
              renderInput={(objParams) => (
                <TextField
                  {...objParams}
                  className="app-mui-text-field"
                  label="Employee *"
                  placeholder="Search by name or code"
                  controlId="settings.arrears.exclusions.employee"
                  InputProps={{
                    ...objParams.InputProps,
                    endAdornment: (
                      <>
                        {blnSearching ? <DottedLoader color="inherit" intSize={16} /> : null}
                        {objParams.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField
                size="small"
                type="month"
                label="From month *"
                InputLabelProps={{ shrink: true }}
                value={strFromMonth}
                onChange={(objEvent) => setStrFromMonth(objEvent.target.value)}
                inputProps={{ "data-controlid": "settings.arrears.exclusions.from-month" }}
              />
              <TextField
                size="small"
                type="month"
                label="To month"
                InputLabelProps={{ shrink: true }}
                value={strToMonth}
                onChange={(objEvent) => setStrToMonth(objEvent.target.value)}
                error={Boolean(strDialogError)}
                helperText={strDialogError || "Blank = no end month"}
                inputProps={{ "data-controlid": "settings.arrears.exclusions.to-month" }}
              />
            </Box>
            <TextField
              size="small"
              label="Reason *"
              value={strReason}
              onChange={(objEvent) => setStrReason(objEvent.target.value)}
              multiline
              minRows={2}
              inputProps={{ maxLength: 500, "data-controlid": "settings.arrears.exclusions.reason" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnDialogOpen(false)} disabled={blnBusy}>Cancel</Button>
          <Button className="app-btn app-btn-primary" onClick={() => void handleAdd()} disabled={blnBusy || !blnCanAdd} controlId="settings.arrears.exclusions.save.button">
            {blnBusy ? "Saving..." : "Exclude"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objRemoveTarget)} onClose={() => (blnBusy ? undefined : setObjRemoveTarget(null))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove exclusion</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.9rem" }}>
            Remove the exclusion of {objRemoveTarget?.strEmployeeCode} - {objRemoveTarget?.strEmployeeName} ({objRemoveTarget?.strPeriodLabel})? Arrears for these months are calculated again from the next payroll run.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjRemoveTarget(null)} disabled={blnBusy}>Cancel</Button>
          <Button className="app-btn app-btn-primary" onClick={() => void handleRemove()} disabled={blnBusy} controlId="settings.arrears.exclusions.remove.confirm.button">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
