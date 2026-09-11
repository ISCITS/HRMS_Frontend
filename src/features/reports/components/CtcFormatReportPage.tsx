"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Autocomplete, Box, Button, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import type { EmployeeListRecord } from "@/features/employee/types";
import { ctcReportService, type CtcDocument } from "@/features/reports/services/ctcReportService";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { hasCtcAction } from "@/features/reports/utils/ctcAccess";
import screen from "@/features/payroll/components/PayrollScreen.module.css";
import styles from "./CtcFormatReportPage.module.css";

type Statement = { document: CtcDocument; employee: EmployeeListRecord };

export default function CtcFormatReportPage() {
  const access = useActionRights();
  const canView = hasCtcAction(access.objRights, "view") || hasCtcAction(access.objRights, "list");
  const canExport = canView && hasCtcAction(access.objRights, "export");
  const [employees, setEmployees] = useState<EmployeeListRecord[]>([]);
  const [type, setType] = useState("All");
  const [selected, setSelected] = useState<EmployeeListRecord | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    if (!canView) { setEmployees([]); setStatement(null); return; }
    let active = true;
    setLoading(true); setError("");
    ctcReportService.options()
      .then(({ employees: people }) => { if (active) setEmployees(people.filter(row => !row.blnIsPartialSave)); })
      .catch(reason => { if (active) { setEmployees([]); setStatement(null); setError(reason instanceof Error ? reason.message : "Unable to load employees."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; generation.current += 1; };
  }, [canView, reload]);

  const eligible = employees.filter(row => type === "All" || (row.blnIsWorker ? "Worker" : "Non-Worker") === type);
  const busy = generating || !!downloading;
  async function generate() {
    if (!canView || !selected || busy) return;
    const request = ++generation.current;
    setGenerating(true); setError(""); setStatement(null);
    try {
      const document = await ctcReportService.document(selected.strRecordUUID);
      if (request === generation.current) setStatement({ employee: selected, document });
    } catch (reason) { if (request === generation.current) setError(reason instanceof Error ? reason.message : "Unable to generate CTC statement."); }
    finally { if (request === generation.current) setGenerating(false); }
  }

  async function download(format: "xlsx" | "pdf") {
    if (!statement || !canExport || busy) return;
    setDownloading(format); setError("");
    try {
      const file = await ctcReportService.download(statement.employee.strRecordUUID, format, statement.document.version);
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

  if (access.blnLoading) return <Box sx={{ p: 3 }}><CircularProgress aria-label="Loading access rights" /></Box>;
  if (!canView) return <Alert severity="warning">Employee Salary view access is required to view CTC statements.</Alert>;

  return <Box className={screen.page}>
    <Box component="form" className={screen.controlsCard} onSubmit={event => { event.preventDefault(); void generate(); }}>
      <Box className={`${screen.reportSearchPanelRow} ${styles.filterRow}`}>
        <Box className={screen.reportSearchField} sx={{ flex: "0 1 240px" }}>
          <TextField fullWidth select label="Worker / Non-Worker" value={type} disabled={busy || loading} onChange={event => { setType(event.target.value); setSelected(null); setStatement(null); }} data-testid="ctc.filter.type">
            {["All", "Worker", "Non-Worker"].map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </TextField>
        </Box>
        <Box className={`${screen.reportSearchField} ${styles.employeeField}`}>
          <Autocomplete options={eligible} value={selected} loading={loading} disabled={busy || loading}
            isOptionEqualToValue={(a, b) => a.strRecordUUID === b.strRecordUUID}
            getOptionLabel={row => `${row.strEmployeeCode} - ${row.strFullName}`}
            onChange={(_, value) => { setSelected(value); setStatement(null); }}
            noOptionsText={employees.length === 0 ? "No employees available for your access scope." : "No matching employees."}
            renderInput={params => <TextField {...params} label="Employee Name" required placeholder={loading ? "Loading employees..." : "Select employee"} data-testid="ctc.filter.employee" />} />
        </Box>
        <Box className={screen.searchActions} sx={{ ml: "auto" }}>
          <Button type="submit" className={screen.primaryButton} startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <SearchRoundedIcon />} disabled={!selected || loading || busy} data-testid="ctc.generate">Search</Button>
          <Button className={screen.secondaryButton} startIcon={<ClearRoundedIcon />} disabled={busy} onClick={() => { setType("All"); setSelected(null); setStatement(null); setError(""); }}>Clear</Button>
        </Box>
      </Box>
    </Box>
    {error && <Alert severity="error" action={<Button color="inherit" disabled={busy} onClick={() => setReload(value => value + 1)}>Retry</Button>}>{error}</Alert>}
    {!error && !loading && employees.length === 0 && (
      <Alert severity="info">
        No employees are available in the Employee Name list. This usually means your Employee Salary access scope is set to "Self" or "Team" but your login isn't linked to an employee record — ask an administrator to either link your account to an employee or grant a broader (Team/All) CTC access scope.
      </Alert>
    )}
    {!error && !loading && employees.length > 0 && eligible.length === 0 && (
      <Alert severity="info">No {type} employees found. Try a different Worker / Non-Worker filter.</Alert>
    )}
    <Box className={screen.tableCard}>
      <Box className={styles.toolbar}>
        <Typography fontWeight={700}>CTC Statement</Typography>
        {canExport && <Box className={styles.downloads}>
          <Button className={screen.secondaryButton} startIcon={downloading === "xlsx" ? <CircularProgress size={16} /> : <DownloadRoundedIcon />} disabled={!statement || busy} onClick={() => void download("xlsx")} data-testid="ctc.export.xlsx">Export Excel</Button>
          <Button className={screen.secondaryButton} startIcon={downloading === "pdf" ? <CircularProgress size={16} /> : <PictureAsPdfRoundedIcon />} disabled={!statement || busy} onClick={() => void download("pdf")} data-testid="ctc.export.pdf">Download PDF</Button>
        </Box>}
      </Box>
      {statement?.document.warnings.map((warning, index) => <Alert severity="warning" key={index} sx={{ mb: 1 }}>{warning}</Alert>)}
      <Box className={styles.preview}>
        {!statement ? <Box className={styles.empty}>
          {generating || loading ? <CircularProgress size={24} /> : null}
          <Typography color="text.secondary">{loading ? "Loading employees..." : generating ? "Preparing CTC statement..." : "Select an employee and search to generate the CTC statement."}</Typography>
        </Box> : <table className={styles.worksheet} aria-label="CTC statement matching the Excel template">
          <colgroup>{statement.document.widths.map((width, index) => <col key={index} style={{ width: `${width / statement.document.widths.reduce((a, b) => a + b, 0) * 100}%` }} />)}</colgroup>
          <tbody>{statement.document.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} colSpan={cell.span} style={{ fontWeight: cell.bold ? 700 : 400, background: cell.background, color: cell.color || undefined, textAlign: cell.align, borderStyle: cell.borders.map(border => border ? "solid" : "none").join(" ") }}>{cell.text}</td>)}</tr>)}</tbody>
        </table>}
      </Box>
    </Box>
  </Box>;
}
