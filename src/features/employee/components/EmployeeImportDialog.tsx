"use client";

import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { ApiRoutePrefix } from "@/Common/enums/AppEnums";

type Mode = "add" | "exit" | "location";
type ImportRow = { file: string; sheet: string; row: number; employeeCode: string; column: string; message: string; status: string; previous?: string; proposed?: string; warnings?: string[] };
type ImportResult = { phase: string; digest: string; total: number; valid: number; success: number; failed: number; duplicates: number; blocked: boolean; rows: ImportRow[]; errors: ImportRow[] };
const modeLabels: Record<Mode, string> = { add: "Add New Employees", exit: "Update Exit Date", location: "Update Location" };
const templateNames: Record<Mode, string> = { add: "AddNewEmployees.xls", exit: "UpdateExitDate.xls", location: "UpdateLocation.xls" };
const baseUrl = `${ApiRoutePrefix.ApiV1}/masters/employee/import`;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EmployeeImportDialog({ open, onClose, onImported, canAdd, canEdit }: {
  open: boolean; onClose: () => void; onImported: () => Promise<void>; canAdd: boolean; canEdit: boolean;
}) {
  const [mode, setMode] = useState<Mode>(canAdd ? "add" : "exit");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const allowed = mode === "add" ? canAdd : canEdit;
  const rows = result ? [...result.errors, ...result.rows] : [];

  async function run(phase: "preview" | "commit") {
    setBusy(true); setError("");
    try {
      const form = new FormData();
      files.forEach(file => form.append("files", file));
      form.append("phase", phase);
      if (phase === "commit" && result) form.append("digest", result.digest);
      const response = await axiosInstance.post(`${baseUrl}/${mode}`, form, { csrfMenuAction: mode === "add" ? "MASTER_EMPLOYEE_CREATE" : "MASTER_EMPLOYEE_UPDATE" } as ApiRequestConfig);
      if (response.data.ResultCode !== 1) throw new Error(response.data.Msg);
      setResult(response.data.Data); setPage(0);
      if (phase === "commit" && response.data.Data.success > 0) await onImported();
    } catch (caught) {
      setError((await createApiRequestError(caught, "Unable to process employee import.")).message);
      if (phase === "commit") setResult(null); // require fresh validation after an uncertain response
    } finally { setBusy(false); }
  }

  async function downloadTemplate() {
    setBusy(true); setError("");
    try {
      const response = await axiosInstance.get(`${baseUrl}/template`, { params: { mode }, responseType: "blob" });
      download(response.data, templateNames[mode]);
    } catch (caught) { setError((await createApiRequestError(caught, "Unable to download template.")).message); }
    finally { setBusy(false); }
  }

  async function downloadReport() {
    setBusy(true);
    try {
      const ExcelJS = await import("exceljs");
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet("Import Results");
      sheet.addRow(["File", "Sheet", "Row", "Employee Code", "Column", "Status", "Reason", "Previous", "Proposed"]);
      rows.forEach(row => sheet.addRow([row.file, row.sheet, row.row, row.employeeCode, row.column, row.status, [row.message, ...(row.warnings ?? [])].join("; "), row.previous ?? "", row.proposed ?? ""]));
      const buffer = await book.xlsx.writeBuffer();
      download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "employee-import-results.xlsx");
    } catch { setError("Unable to generate the results report."); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="lg">
    <DialogTitle>Import Employees</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" sx={{ mb: 2 }}>Imports apply to your signed-in tenant and company. Validate the files, review the results, then confirm the import.</Typography>
      <TextField select fullWidth label="Import operation" value={mode} disabled={busy} onChange={event => { setMode(event.target.value as Mode); setFiles([]); setResult(null); setError(""); setPage(0); }}>
        {Object.entries(modeLabels).filter(([key]) => key === "add" ? canAdd : canEdit).map(([key, value]) => <MenuItem key={key} value={key}>{value}</MenuItem>)}
      </TextField>
      <Box sx={{ display: "flex", gap: 2, my: 2, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={downloadTemplate} disabled={busy}>Download Template</Button>
        <Button variant="outlined" component="label" startIcon={<UploadFileRoundedIcon />} disabled={busy || !allowed}>
          Upload Sheet – {modeLabels[mode]}
          <input key={mode} type="file" accept=".xls,.xlsx" multiple hidden onChange={event => {
            const selected = Array.from(event.target.files ?? []);
            setResult(null); setError(""); setPage(0);
            if (selected.some(file => !/\.(xls|xlsx)$/i.test(file.name))) { setError("Only .xls and .xlsx files are supported."); }
            else setFiles(previous => [...previous, ...selected]);
            event.target.value = "";
          }} />
        </Button>
        {files.length > 0 && <Button disabled={busy} onClick={() => { setFiles([]); setResult(null); setError(""); setPage(0); }}>Clear Files</Button>}
        <Button variant="contained" disabled={busy || !files.length || !allowed} onClick={() => run("preview")}>Validate &amp; Preview</Button>
      </Box>
      <Typography variant="body2" sx={{ mb: 2 }}>{files.length ? files.map(file => file.name).join(", ") : "No files selected."}</Typography>
      {mode === "add" && <Alert severity="info" sx={{ mb: 2 }}>Location comes from Current Place Of Posting when supplied; otherwise Current Location from the new-employee sheet is used. You can also select a separate posting file together with the basic-details files; rows are matched by Employee Code / Emp No. The download uses your supplied AddNewEmployees.xls layout, including employee, bank and statutory columns. Use master codes or names for references. Employee and child records are saved together.</Alert>}
      {mode !== "add" && <Alert severity="info" sx={{ mb: 2 }}>This operation updates only {mode === "exit" ? "Exit Date" : "Current Place of Posting"} and modification audit fields. Blank values are rejected. Existing employee status and other details are preserved.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {busy && <CircularProgress size={24} aria-label="Processing employee import" />}
      {result && <>
        <Alert severity={result.blocked ? "error" : "info"} sx={{ mb: 2 }}>
          {result.phase === "preview" ? "Preview" : "Import complete"}: Total {result.total} · Valid {result.valid} · Successful {result.success} · Failed {result.failed} · Duplicates {result.duplicates}.
          {result.blocked ? " Correct file/dependent-record errors and validate again." : result.phase === "preview" ? " Confirm Import will save the valid rows. Failed and duplicate rows are skipped." : ""}
        </Alert>
        <Button onClick={downloadReport} disabled={busy}>Download Results (.xlsx)</Button>
        <Box sx={{ overflow: "auto", maxHeight: 360 }}><Table size="small" stickyHeader>
          <TableHead><TableRow>{["File / Sheet", "Row", "Employee Code", "Column", "Status", "Details / Changes"].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
          <TableBody>{rows.slice(page * 50, (page + 1) * 50).map((row, index) => <TableRow key={`${row.file}-${row.sheet}-${row.row}-${index}`}>
            <TableCell>{row.file}<br />{row.sheet}</TableCell><TableCell>{row.row || "—"}</TableCell><TableCell>{row.employeeCode || "—"}</TableCell><TableCell>{row.column || "—"}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.message}{row.warnings?.map(warning => <Typography key={warning} variant="caption" color="warning.main" display="block">{warning}</Typography>)}{row.proposed !== undefined && <Typography variant="caption" display="block">{row.previous || "(empty)"} → {row.proposed}</Typography>}</TableCell>
          </TableRow>)}</TableBody>
        </Table></Box>
        {rows.length > 50 && <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}><Button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Typography variant="caption">Page {page + 1} of {Math.ceil(rows.length / 50)}</Typography><Button disabled={(page + 1) * 50 >= rows.length} onClick={() => setPage(page + 1)}>Next</Button></Box>}
      </>}
    </DialogContent>
    <DialogActions>
      <Button variant="outlined" onClick={onClose} disabled={busy}>Close</Button>
      <Button variant="contained" disabled={busy || !allowed || !result || result.phase !== "preview" || result.blocked || result.valid === 0} onClick={() => run("commit")}>Confirm Import{result?.phase === "preview" ? ` (${result.valid})` : ""}</Button>
    </DialogActions>
  </Dialog>;
}
