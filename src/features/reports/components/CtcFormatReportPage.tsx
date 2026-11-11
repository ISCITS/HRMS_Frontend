"use client";

import {
  useEffect,
  useRef,
  useState } from "react";
import { Alert,
  Autocomplete,
  Box,
  Breadcrumbs,
  Button,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import type { EmployeeListRecord } from "@/features/employee/types";
import { ctcFormatLabel, ctcReportService, type CtcDocument, type CtcLayout, type CtcPeriod } from "@/features/reports/services/ctcReportService";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { hasCtcAction } from "@/features/reports/utils/ctcAccess";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import screen from "@/components/master/MasterScreen.module.css";
import styles from "./CtcFormatReportPage.module.css";

type Statement = { document: CtcDocument; employee: EmployeeListRecord; month: string; zeroStatutory: boolean };

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export default function CtcFormatReportPage() {
  const access = useActionRights();
  const canView = hasCtcAction(access.objRights, "view") || hasCtcAction(access.objRights, "list");
  const canExport = canView && hasCtcAction(access.objRights, "export");
  const [employees, setEmployees] = useState<EmployeeListRecord[]>([]);
  const [type, setType] = useState("All");
  const [selected, setSelected] = useState<EmployeeListRecord | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const [zeroStatutory, setZeroStatutory] = useState(false);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  // Format / period picked on this screen; until then the statement opens as Settings > Payroll > CTC Format says.
  const [view, setView] = useState<{ layout?: CtcLayout; period?: CtcPeriod }>({});
  const generation = useRef(0);

  useEffect(() => {
    if (access.blnLoading) return;
    if (!canView) { setEmployees([]); setStatement(null); return; }
    let active = true;
    setLoading(true); setError("");
    ctcReportService.options()
      .then(({ employees: people }) => { if (active) setEmployees(people.filter(row => !row.blnIsPartialSave)); })
      .catch(reason => { if (active) { setEmployees([]); setStatement(null); setError(reason instanceof Error ? reason.message : "Unable to load employees."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; generation.current += 1; };
  }, [access.blnLoading, canView, reload]);

  const eligible = employees.filter(row => type === "All" || (row.blnIsWorker ? "Worker" : "Non-Worker") === type);
  const binding = access.blnLoading || loading;
  const busy = generating || !!downloading;
  // The statement opens in the format set in Settings > Payroll > CTC Format (our format or Format 1,
  // monthly or annual); downloads use the format the preview was generated in.
  async function generate(next: { layout?: CtcLayout; period?: CtcPeriod } = view) {
    if (!canView || !selected || !month || busy) return;
    const request = ++generation.current;
    setGenerating(true); setError(""); setStatement(null); setView(next);
    try {
      const document = await ctcReportService.document(selected.strRecordUUID, month, zeroStatutory, next.layout, next.period);
      if (request === generation.current) setStatement({ employee: selected, document, month, zeroStatutory });
    } catch (reason) { if (request === generation.current) setError(reason instanceof Error ? reason.message : "Unable to generate CTC statement."); }
    finally { if (request === generation.current) setGenerating(false); }
  }

  async function download(format: "xlsx" | "pdf") {
    if (!statement || !canExport || busy) return;
    setDownloading(format); setError("");
    try {
      const file = await ctcReportService.download(statement.employee.strRecordUUID, format, statement.document.version, statement.month, statement.zeroStatutory, statement.document.layout, statement.document.period);
      const bytes = Uint8Array.from(atob(file.strBase64Content), value => value.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.strContentType }));
      const link = document.createElement("a");
      link.href = url; link.download = file.strFileName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setStatement(null);
      setError(reason instanceof Error ? reason.message : "Unable to download CTC statement.");
    } finally { setDownloading(null); }
  }

  if (!access.blnLoading && !canView) return <Alert severity="warning">Employee Salary view access is required to view CTC statements.</Alert>;

  return <Box className={screen.page}>
    <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />}>
      <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
      <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">CTC Statement</Typography>
    </Breadcrumbs>

    <Box component="form" className={screen.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }} onSubmit={event => { event.preventDefault(); void generate(); }}>
      <Box className={`${screen.searchRow} ${styles.filterRow}`}>
        <TextField className="app-mui-text-field" fullWidth type="month" size="small" label="Month" required value={month} disabled={busy || binding} onChange={event => { setMonth(event.target.value); setStatement(null); }} InputLabelProps={{ shrink: true }} data-testid="ctc.filter.month" />
        <TextField className="app-mui-text-field" fullWidth select size="small" label="Worker / Non-Worker" value={type} disabled={busy || binding} onChange={event => { setType(event.target.value); setSelected(null); setStatement(null); }} data-testid="ctc.filter.type">
            {["All", "Worker", "Non-Worker"].map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>
        <Box className={styles.employeeField}>
          <Autocomplete options={eligible} value={selected} disabled={busy || binding}
            isOptionEqualToValue={(a, b) => a.strRecordUUID === b.strRecordUUID}
            getOptionLabel={row => `${row.strEmployeeCode} - ${row.strFullName}`}
            onChange={(_, value) => { setSelected(value); setStatement(null); }}
            noOptionsText={employees.length === 0 ? "No employees available for your access scope." : "No matching employees."}
            renderInput={params => <TextField {...params} className="app-mui-text-field" size="small" label="Employee Name" required placeholder={binding ? "Loading employees..." : "Search employee..."} data-testid="ctc.filter.employee"
              InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />} />
        </Box>
        <TextField className="app-mui-text-field" fullWidth select size="small" label="PF / ESIC with 0 value" value={zeroStatutory ? "Show" : "Hide"} disabled={busy || binding} onChange={event => { setZeroStatutory(event.target.value === "Show"); setStatement(null); }} data-testid="ctc.filter.zeroStatutory">
            {["Hide", "Show"].map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>
        <Box className={screen.searchActions}>
          <Button type="submit" size="small" className={screen.primaryButton} startIcon={generating ? <DottedLoader intSize={16} color="inherit" /> : <SearchRoundedIcon />} disabled={!selected || !month || binding || busy} data-testid="ctc.generate" sx={{ minHeight: "30px !important", px: "8px !important" }}>Search</Button>
          <Button size="small" className={screen.secondaryButton} startIcon={<ClearRoundedIcon />} disabled={busy || binding} onClick={() => { setMonth(currentMonth()); setType("All"); setSelected(null); setZeroStatutory(false); setStatement(null); setError(""); }} sx={{ minHeight: "30px !important", px: "8px !important" }}>Clear</Button>
        </Box>
      </Box>
    </Box>
    {error && <Alert severity="error" action={<Button color="inherit" disabled={busy} onClick={() => setReload(value => value + 1)}>Retry</Button>}>{error}</Alert>}
    {!error && !binding && employees.length === 0 && (
      <Alert severity="info">
        No employees are available in the Employee Name list. This usually means your Employee Salary access scope is set to "Self" or "Team" but your login isn't linked to an employee record - ask an administrator to either link your account to an employee or grant a broader (Team/All) CTC access scope.
      </Alert>
    )}
    {!error && !binding && employees.length > 0 && eligible.length === 0 && (
      <Alert severity="info">No {type} employees found. Try a different Worker / Non-Worker filter.</Alert>
    )}
    <Box className={screen.tableCard} sx={{ position: "relative", p: "10px !important", borderRadius: "10px !important", boxShadow: "none" }}>
      <Box className={styles.toolbar}>
        <Typography fontWeight={700}>CTC Statement{statement ? ` - ${ctcFormatLabel(statement.document.layout, statement.document.period)}` : ""}</Typography>
        <Box className={styles.downloads}>
          {statement && statement.document.layouts?.length > 1 && <ToggleButtonGroup exclusive size="small" color="primary" value={statement.document.layout} disabled={busy}
            onChange={(_, layout: CtcLayout | null) => { if (layout && layout !== statement.document.layout) void generate({ layout, period: statement.document.period }); }} data-testid="ctc.switch.layout">
            <ToggleButton value="ours" sx={{ fontWeight: 700, textTransform: "none", px: 1.5, py: 0.25 }}>Our format</ToggleButton>
            <ToggleButton value="format1" sx={{ fontWeight: 700, textTransform: "none", px: 1.5, py: 0.25 }}>Format 1</ToggleButton>
          </ToggleButtonGroup>}
          {statement && <ToggleButtonGroup exclusive size="small" color="primary" value={statement.document.period} disabled={busy}
            onChange={(_, period: CtcPeriod | null) => { if (period && period !== statement.document.period) void generate({ layout: statement.document.layout, period }); }} data-testid="ctc.switch.period">
            <ToggleButton value="monthly" sx={{ fontWeight: 700, textTransform: "none", px: 1.5, py: 0.25 }}>Monthly</ToggleButton>
            <ToggleButton value="annual" sx={{ fontWeight: 700, textTransform: "none", px: 1.5, py: 0.25 }}>Annual</ToggleButton>
          </ToggleButtonGroup>}
          {canExport && <>
          <Button className={screen.secondaryButton} startIcon={downloading === "xlsx" ? <DottedLoader intSize={16} /> : <DownloadRoundedIcon />} disabled={!statement || busy} onClick={() => void download("xlsx")} data-testid="ctc.export.xlsx">Export Excel</Button>
          <Button className={screen.secondaryButton} startIcon={downloading === "pdf" ? <DottedLoader intSize={16} /> : <PictureAsPdfRoundedIcon />} disabled={!statement || busy} onClick={() => void download("pdf")} data-testid="ctc.export.pdf">Download PDF</Button>
          </>}
        </Box>
      </Box>
      {statement?.document.warnings.map((warning, index) => <Alert severity="warning" key={index} sx={{ mb: 1 }}>{warning}</Alert>)}
      <Box className={styles.preview}>
        {!statement ? <Box className={styles.empty}>
          {binding || generating ? <DottedLoader /> : <Typography color="text.secondary">Select a month and an employee, then search to generate the CTC statement for the salary in force that month, in the format set under Settings - Payroll - CTC Format. Switch between Monthly and Annual (and between formats, when both are offered) above the statement.</Typography>}
        </Box> : <table className={styles.worksheet} aria-label="CTC statement matching the Excel template">
          <colgroup>{statement.document.widths.map((width, index) => <col key={index} style={{ width: `${width / statement.document.widths.reduce((a, b) => a + b, 0) * 100}%` }} />)}</colgroup>
          <tbody>{statement.document.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} colSpan={cell.span} style={{ fontWeight: cell.bold ? 700 : 400, background: cell.background, color: cell.color || undefined, textAlign: cell.align, borderStyle: cell.borders.map(border => border ? "solid" : "none").join(" ") }}>{cell.text}</td>)}</tr>)}</tbody>
        </table>}
      </Box>
    </Box>
  </Box>;
}
