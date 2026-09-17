"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, MenuItem, Snackbar, TextField, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type ApiRecord = { intID: number; blnIsActive: boolean } & Record<string, unknown>;
type RecordRow = { id: string; code: string; name: string; status: Status };
type GridRow = RecordRow & { action: ReactNode; statusNode: ReactNode };
type SearchForm = { code: string; name: string; status: "All" | Status };
type FormState = { code: string; name: string; status: Status };

export type EmployeeAttributeMasterConfig = {
  singular: string;
  plural: string;
  moduleName: string;
  moduleCodes: string[];
  testId: string;
  exportFileName: string;
  codeKey: string;
  nameKey: string;
  list: () => Promise<{ Data: ApiRecord[] }>;
  get: (id: number) => Promise<{ Data: ApiRecord }>;
  create: (form: FormState) => Promise<unknown>;
  update: (id: number, form: FormState) => Promise<unknown>;
  setStatus: (ids: number[], active: boolean) => Promise<unknown>;
  remove: (ids: number[]) => Promise<unknown>;
};

const emptyForm: FormState = { code: "", name: "", status: "Active" };
const emptySearch: SearchForm = { code: "", name: "", status: "All" };

export default function EmployeeAttributeMasterPanel({ config }: { config: EmployeeAttributeMasterConfig }) {
  const router = useRouter();
  const { t } = useModuleLabels(config.moduleName);
  const { blnLoading: rightsLoading, strError: rightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(config.moduleCodes);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [searchDraft, setSearchDraft] = useState<SearchForm>(emptySearch);
  const [searchApplied, setSearchApplied] = useState<SearchForm>(emptySearch);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<"code" | "name", string>>>({});
  const [mode, setMode] = useState<Mode>("add");
  const [editingId, setEditingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const label = (key: string, fallback: string) => t(key, fallback);
  const canView = canViewAny();
  const canAdd = canDoAny("add");
  const canEdit = canDoAny("edit");
  const canDelete = canDoAny("delete");
  const canExport = canDoAny("export");

  function showToast(message: string, severity: "success" | "error" = "success") {
    setToast({ open: true, message, severity });
  }

  async function loadRecords() {
    if (!canViewAny()) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await config.list();
      setRecords(response.Data.map((item) => ({
        id: String(item.intID),
        code: String(item[config.codeKey] ?? ""),
        name: String(item[config.nameKey] ?? ""),
        status: item.blnIsActive ? "Active" : "Inactive",
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (rightsLoading) return;
    loadRecords().catch((error: unknown) => showToast(error instanceof Error ? error.message : "Unable to load records.", "error"));
  }, [rightsLoading]);

  const filtered = useMemo(() => records.filter((item) =>
    (!searchApplied.name || item.name.toLowerCase().includes(searchApplied.name.toLowerCase())) &&
    (!searchApplied.code || item.code.toLowerCase().includes(searchApplied.code.toLowerCase())) &&
    (searchApplied.status === "All" || item.status === searchApplied.status)
  ), [records, searchApplied]);

  async function openDialog(nextMode: Mode, selected?: RecordRow) {
    setMode(nextMode);
    setEditingId(selected?.id ?? "");
    setErrors({});
    if (!selected) {
      setForm(emptyForm);
      setDialogOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const response = await config.get(Number(selected.id));
      setForm({
        code: String(response.Data[config.codeKey] ?? ""),
        name: String(response.Data[config.nameKey] ?? ""),
        status: response.Data.blnIsActive ? "Active" : "Inactive",
      });
      setDialogOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load the record.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function validate() {
    const next: Partial<Record<"code" | "name", string>> = {};
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!name) next.name = `${config.singular} Name is required.`;
    else if (name.length < 3) next.name = `${config.singular} Name must be at least 3 characters.`;
    if (!code) next.code = `${config.singular} Code is required.`;
    else if (!/^[A-Z0-9/& _-]{2,50}$/.test(code)) next.code = "Use 2-50 letters, numbers, spaces, /, &, _ or -.";
    if (records.some((item) => item.id !== editingId && item.code.toUpperCase() === code)) next.code = `${config.singular} Code already exists.`;
    if (records.some((item) => item.id !== editingId && item.name.trim().toLowerCase() === name.toLowerCase())) next.name = `${config.singular} Name already exists.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const normalized = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() };
      if (mode === "add") await config.create(normalized);
      else await config.update(Number(editingId), normalized);
      await loadRecords();
      setDialogOpen(false);
      showToast(`${config.singular} ${mode === "add" ? "saved" : "updated"} successfully.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to complete the request.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete(id: string) {
    setConfirm({
      title: `Delete ${config.singular}`,
      message: `Are you sure you want to delete this ${config.singular.toLowerCase()}?`,
      run: async () => {
        await config.remove([Number(id)]);
        await loadRecords();
        showToast(`${config.singular} deleted successfully.`);
      },
    });
  }

  async function executeConfirmed() {
    if (!confirm) return;
    setSubmitting(true);
    try {
      await confirm.run();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to complete the request.", "error");
    } finally {
      setSubmitting(false);
      setConfirm(null);
    }
  }

  const rows: GridRow[] = filtered.map((item) => ({
    ...item,
    action: <CommonRowActions testIdPrefix={`${config.testId}.list.row`} rowKey={item.id} blnCanView={canView} blnCanEdit={canEdit} blnCanDelete={canDelete} onView={() => void openDialog("view", item)} onEdit={() => void openDialog("edit", item)} onDelete={() => requestDelete(item.id)} />,
    statusNode: <span className={`${styles.statusPill} ${item.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{item.status}</span>,
  }));
  const columns: DataGridColumn<GridRow>[] = [
    { field: "action", headerName: label("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 140 },
    { field: "name", headerName: label("table_name", `${config.singular} Name`), width: 280 },
    { field: "code", headerName: label("table_code", `${config.singular} Code`), width: 230 },
    { field: "statusNode", headerName: label("table_status", "Status"), width: 140, sortAccessor: (row) => row.status },
  ];

  return <Box className={styles.page}>
    <Box className={styles.topBar}><Button controlId={`${config.testId}.list.back.button`} className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => router.back()}>{label("back_button", "Back")}</Button></Box>
    <Box className={styles.controlsCard}>
      {rightsError ? <Typography sx={{ color: "#b45309", fontSize: ".85rem" }}>{rightsError}</Typography> : null}
      {!rightsLoading && canView && isReadOnly() ? <Typography sx={{ color: "#1d4ed8", fontSize: ".85rem", fontWeight: 700 }}>You have view-only access for {config.singular}.</Typography> : null}
      <Box className={styles.searchRow}>
        <TextField value={searchDraft.name} onChange={(event) => setSearchDraft((old) => ({ ...old, name: event.target.value }))} placeholder={`${config.singular} Name`} fullWidth />
        <TextField value={searchDraft.code} onChange={(event) => setSearchDraft((old) => ({ ...old, code: event.target.value.toUpperCase() }))} placeholder={`${config.singular} Code`} fullWidth />
        <TextField select label="Status" value={searchDraft.status} onChange={(event) => setSearchDraft((old) => ({ ...old, status: event.target.value as SearchForm["status"] }))} fullWidth>
          <MenuItem value="All">All</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>
        <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setSearchApplied(searchDraft)}>Search</Button></Box>
        <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setSearchDraft(emptySearch); setSearchApplied(emptySearch); }}>Clear</Button></Box>
      </Box>
    </Box>
    <Box className={styles.tableCard}>
      {!canView && !rightsLoading && !loading ? <Box className={styles.emptyState}><Typography sx={{ fontWeight: 800 }}>{config.singular} access is not available for your user group.</Typography></Box> :
        <CommonDataGrid columns={columns} rows={rows} rowIdField="id" defaultPageSize={20} pageSizeOptions={[10, 20, 50]} exportFileName={config.exportFileName} showExportOptions={canExport} showPaginationSummary emptyMessage={`No ${config.plural.toLowerCase()} found.`} testIdPrefix={`${config.testId}.list`} toolbarLeft={canAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => void openDialog("add")}>Add {config.singular}</Button> : null} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />}
    </Box>
    <CommonMasterDialog blnOpen={dialogOpen} onClose={() => setDialogOpen(false)} strTitle={`${mode === "add" ? "Add" : mode === "edit" ? "Edit" : "View"} ${config.singular}`} strSecondaryLabel={mode === "view" ? "Close" : "Cancel"} strPrimaryLabel={submitting ? "Saving..." : "Save"} onPrimaryAction={() => void save()} blnPrimaryDisabled={submitting} blnHidePrimary={mode === "view"} paperClassName={styles.compactDialogPaper}
      nodeTitleAction={<Box className={styles.switchRow}><Typography className={styles.switchLabel}>Is Active</Typography><ActiveStatusSwitch testId={`${config.testId}.dialog.active.switch`} blnIsActive={form.status === "Active"} disabled={mode === "view"} onChange={(checked) => setForm((old) => ({ ...old, status: checked ? "Active" : "Inactive" }))} /></Box>}
      nodeContent={<Box sx={{ display: "grid", gap: 2, pt: .5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <TextField required label={`${config.singular} Name`} value={form.name} disabled={mode === "view"} onChange={(event) => { setForm((old) => ({ ...old, name: event.target.value })); setErrors((old) => ({ ...old, name: undefined })); }} error={Boolean(errors.name)} helperText={errors.name} fullWidth />
        <TextField required label={`${config.singular} Code`} value={form.code} disabled={mode === "view"} onChange={(event) => { setForm((old) => ({ ...old, code: event.target.value.toUpperCase() })); setErrors((old) => ({ ...old, code: undefined })); }} error={Boolean(errors.code)} helperText={errors.code} fullWidth />
      </Box>} />
    <CommonConfirmDialog blnOpen={Boolean(confirm)} strTitle={confirm?.title} strMessage={confirm?.message} strCancelLabel="Cancel" strConfirmLabel="Delete" blnConfirmDisabled={submitting} onClose={() => setConfirm(null)} onConfirm={() => void executeConfirmed()} />
    <BlockingLoader blnOpen={submitting || ((loading || rightsLoading) && !dialogOpen)} strLabel={loading || rightsLoading ? "Loading..." : "Processing..."} intZIndex={1400} />
    <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((old) => ({ ...old, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}><Alert severity={toast.severity} variant="filled">{toast.message}</Alert></Snackbar>
  </Box>;
}
