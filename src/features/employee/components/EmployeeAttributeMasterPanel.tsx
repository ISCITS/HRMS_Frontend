"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, IconButton, InputAdornment, Link, MenuItem, Skeleton, Snackbar, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import MasterBreadcrumbs from "@/components/master/MasterBreadcrumbs";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader, { DottedLoader } from "@/components/shared/BlockingLoader";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { masterApiService } from "@/services/master/MasterApiService";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type ApiRecord = { intID: number; blnIsActive: boolean } & Record<string, unknown>;
type RecordRow = { id: string; code: string; name: string; status: Status };
type SearchForm = { code: string; name: string; status: "All" | Status };
type TextRow = { strRowID: string; intLanguageID: number | ""; strLanguageName: string; name: string; code: string };
type FormState = { code: string; name: string; status: Status; lstTexts: TextRow[] };
type LanguageOption = { intID: number; strLabel: string; strCode?: string };

export type EmployeeAttributeMasterConfig = {
  singular: string;
  plural: string;
  moduleName: string;
  moduleCodes: string[];
  testId: string;
  exportFileName: string;
  codeKey: string;
  nameKey: string;
  enableTranslations?: boolean;
  list: () => Promise<{ Data: ApiRecord[] }>;
  get: (id: number) => Promise<{ Data: ApiRecord }>;
  create: (form: FormState) => Promise<unknown>;
  update: (id: number, form: FormState) => Promise<unknown>;
  setStatus: (ids: number[], active: boolean) => Promise<unknown>;
  remove: (ids: number[]) => Promise<unknown>;
  hideGridLoadingOverlay?: boolean;
};

const emptySearch: SearchForm = { code: "", name: "", status: "All" };
let intTextRowID = 0;

function createTextRow(): TextRow {
  intTextRowID += 1;
  return { strRowID: `employee-attribute-text-${Date.now()}-${intTextRowID}`, intLanguageID: "", strLanguageName: "", name: "", code: "" };
}

function createEmptyForm(): FormState {
  return { code: "", name: "", status: "Active", lstTexts: [createTextRow()] };
}

function EmployeeAttributeGridSkeleton({ testId }: { testId: string }) {
  return (
    <Box
      data-control-id={`${testId}.list.skeleton`}
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={142} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 800 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.55fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2].map((column) => (
            <Box key={column} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={column === 2 ? 76 : 118} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: 8 }).map((_, index) => (
          <Box
            key={index}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 0.7fr 0.55fr",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${62 + (index % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${36 + (index % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function EmployeeAttributeMasterPanel({ config }: { config: EmployeeAttributeMasterConfig }) {
  const { t } = useModuleLabels(config.moduleName);
  const { blnLoading: rightsLoading, strError: rightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(config.moduleCodes);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [searchDraft, setSearchDraft] = useState<SearchForm>(emptySearch);
  const [searchApplied, setSearchApplied] = useState<SearchForm>(emptySearch);
  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [errors, setErrors] = useState<Partial<Record<"code" | "name", string>>>({});
  const [mode, setMode] = useState<Mode>("add");
  const [editingId, setEditingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [translationLoading, setTranslationLoading] = useState<Record<string, boolean>>({});
  const [lastTranslatedSourceByRow, setLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pendingErrorFocusRef = useRef<"name" | "code" | null>(null);

  const label = (key: string, fallback: string) => t(key, fallback);
  const canView = canViewAny();
  const canAdd = canDoAny("add");
  const canEdit = canDoAny("edit");
  const canExport = canDoAny("export");
  const readOnly = isReadOnly();
  const searchFrozen = loading || submitting || rightsLoading;
  const strNameLabel = `${config.singular} Name`;
  const strCodeLabel = `${config.singular} Code`;
  const translationsEnabled = config.enableTranslations === true;
  const defaultLanguageID = authHelpers.getLanguageID() ?? languages[0]?.intID ?? 1;
  const secondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function buildFixedLanguageRow(languageID: number, name: string, code: string, existingTexts: TextRow[]): TextRow {
    const language = languages.find((item) => item.intID === languageID);
    const existingText = existingTexts.find((item) => Number(item.intLanguageID) === languageID);
    return {
      ...createTextRow(),
      ...existingText,
      intLanguageID: languageID,
      strLanguageName: language?.strLabel ?? existingText?.strLanguageName ?? "",
      name,
      code,
    };
  }

  function ensureTenantLanguageRows(values: FormState): FormState {
    const defaultRow = buildFixedLanguageRow(defaultLanguageID, values.name, values.code, values.lstTexts);
    if (!secondaryLanguageID) {
      return { ...values, lstTexts: [defaultRow] };
    }
    const secondaryExistingText = values.lstTexts.find((item) => Number(item.intLanguageID) === secondaryLanguageID);
    const secondaryRow = buildFixedLanguageRow(
      secondaryLanguageID,
      secondaryExistingText?.name ?? "",
      values.code,
      values.lstTexts,
    );
    return { ...values, lstTexts: [defaultRow, secondaryRow] };
  }

  function syncPrimaryName(name: string) {
    setForm((previous) => {
      const next = ensureTenantLanguageRows(previous);
      return { ...next, lstTexts: next.lstTexts.map((item, index) => index === 0 ? { ...item, name } : item) };
    });
  }

  function syncCode(code: string) {
    setForm((previous) => ({
      ...previous,
      lstTexts: previous.lstTexts.map((item) => ({ ...item, code })),
    }));
  }

  const visibleTranslationRows = translationsEnabled ? form.lstTexts.filter((text) => {
    const language = languages.find((item) => item.intID === Number(text.intLanguageID));
    const code = language?.strCode?.trim().toLowerCase() ?? "";
    const name = (language?.strLabel ?? text.strLanguageName).trim().toLowerCase();
    return Number(text.intLanguageID) !== defaultLanguageID &&
      !/^es(?:[-_]|$)/.test(code) && !["spa", "spanish", "espa?ol", "espanol"].includes(code) &&
      !/spanish|espa?ol|espanol/.test(name);
  }) : [];

  function showToast(message: string, severity: "success" | "error" = "success") {
    setToast({ open: true, message, severity });
  }

  async function loadLanguages() {
    if (!translationsEnabled) {
      return;
    }
    const response = await masterApiService.getDepartmentFormOptions();
    setLanguages(response.Data.lstLanguages ?? []);
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

  useEffect(() => {
    loadLanguages().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!dialogOpen || mode === "view") {
      return;
    }
    window.setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [dialogOpen, mode]);

  useEffect(() => {
    if (!pendingErrorFocusRef.current) {
      return;
    }
    const target = pendingErrorFocusRef.current;
    pendingErrorFocusRef.current = null;
    if (target === "name") {
      window.setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [errors]);

  useEffect(() => {
    if (!translationsEnabled || languages.length === 0) {
      return;
    }
    setForm((previous) => ensureTenantLanguageRows(previous));
  }, [languages.length, defaultLanguageID, secondaryLanguageID]);

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
      setForm(translationsEnabled ? ensureTenantLanguageRows(createEmptyForm()) : createEmptyForm());
      setLastTranslatedSourceByRow({});
      setDialogOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const response = await config.get(Number(selected.id));
      const texts = (response.Data.lstTexts as Array<Record<string, unknown>> | undefined)?.map((text) => ({
        strRowID: createTextRow().strRowID,
        intLanguageID: Number(text.intLanguageID) || "",
        strLanguageName: String(text.strLanguageName ?? ""),
        name: String(text[config.nameKey] ?? ""),
        code: String(response.Data[config.codeKey] ?? ""),
      })) ?? [];
      const nextForm: FormState = {
        code: String(response.Data[config.codeKey] ?? ""),
        name: String(response.Data[config.nameKey] ?? ""),
        status: response.Data.blnIsActive ? "Active" : "Inactive",
        lstTexts: texts.length > 0 ? texts : [createTextRow()],
      };
      setForm(translationsEnabled ? ensureTenantLanguageRows(nextForm) : nextForm);
      setLastTranslatedSourceByRow({});
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
    pendingErrorFocusRef.current = next.name ? "name" : next.code ? "code" : null;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function translateTextRow(rowID: string, languageID: number) {
    const language = languages.find((item) => item.intID === languageID);
    const sourceName = form.name.trim();
    if (!language || languageID === defaultLanguageID || !sourceName) {
      return;
    }
    const currentRow = form.lstTexts.find((item) => item.strRowID === rowID);
    const lastTranslatedSource = (lastTranslatedSourceByRow[rowID] ?? "").trim();
    if (currentRow?.name.trim() && lastTranslatedSource === sourceName) {
      return;
    }
    setTranslationLoading((previous) => ({ ...previous, [rowID]: true }));
    try {
      const response = await masterApiService.translateMasterText({
        strText: sourceName,
        intSourceLanguageID: defaultLanguageID,
        intTargetLanguageID: languageID,
      });
      setForm((previous) => ({
        ...previous,
        lstTexts: previous.lstTexts.map((item) => item.strRowID === rowID
          ? { ...item, intLanguageID: languageID, strLanguageName: language.strLabel, name: response.Data.strTranslatedText }
          : item),
      }));
      setLastTranslatedSourceByRow((previous) => ({ ...previous, [rowID]: sourceName }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to translate text.", "error");
    } finally {
      setTranslationLoading((previous) => ({ ...previous, [rowID]: false }));
    }
  }

  async function handleTranslateClick() {
    const secondaryRow = visibleTranslationRows[0];
    if (!secondaryRow) {
      return;
    }
    await translateTextRow(secondaryRow.strRowID, Number(secondaryRow.intLanguageID));
  }

  async function save() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const trimmed = { ...form, code: form.code.trim().toUpperCase(), name: form.name.trim() };
      const normalized = translationsEnabled ? ensureTenantLanguageRows(trimmed) : trimmed;
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

  const rows = filtered.map((item) => ({
    id: item.id,
    nameText: item.name,
    name: (
      <Link
        component="button"
        underline="none"
        sx={{ color: "#0f172a", fontWeight: 500, textAlign: "left" }}
        onClick={(event) => {
          event.stopPropagation();
          if (canEdit || canView) {
            void openDialog(canEdit ? "edit" : "view", item);
          }
        }}
      >
        {item.name}
      </Link>
    ),
    code: item.code,
    statusText: item.status,
    status: (
      <span className={`${styles.statusPill} ${item.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
        {item.status}
      </span>
    ),
  }));
  const columns: CommonTableColumn<(typeof rows)[number]>[] = [
    { field: "name", headerName: strNameLabel },
    { field: "code", headerName: strCodeLabel },
    { field: "status", headerName: label("table_status", "Status"), sortable: false, filterable: false },
  ];

  return <Box className={styles.page} sx={{ position: "relative" }}>
    <MasterBreadcrumbs strCurrent={config.plural} />

    <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
      {rightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: ".85rem" }}>{rightsError}</Typography> : null}
      {!rightsLoading && canView && readOnly ? <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: ".85rem", fontWeight: 700 }}>You have view-only access for {config.singular}.</Typography> : null}
      <Box className={styles.searchRow} aria-busy={searchFrozen} sx={{ alignItems: "center", "& .MuiButton-root": { alignSelf: "center" } }}>
        <TextField className="app-mui-text-field" id={`${config.testId}-search-name`} controlId={`${config.testId}.list.search-name.input`} inputProps={{ controlId: `${config.testId}.list.search-name.input` }} label={strNameLabel} value={searchDraft.name} onChange={(event) => setSearchDraft((old) => ({ ...old, name: event.target.value }))} placeholder={strNameLabel} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={searchFrozen} fullWidth />
        <TextField className="app-mui-text-field" id={`${config.testId}-search-code`} controlId={`${config.testId}.list.search-code.input`} inputProps={{ controlId: `${config.testId}.list.search-code.input` }} label={strCodeLabel} value={searchDraft.code} onChange={(event) => setSearchDraft((old) => ({ ...old, code: event.target.value.toUpperCase() }))} placeholder={strCodeLabel} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={searchFrozen} fullWidth />
        <TextField className="app-mui-text-field" id={`${config.testId}-search-status`} controlId={`${config.testId}.list.search-status.select`} inputProps={{ controlId: `${config.testId}.list.search-status.select` }} select label={label("table_status", "Status")} value={searchDraft.status} onChange={(event) => setSearchDraft((old) => ({ ...old, status: event.target.value as SearchForm["status"] }))} size="small" disabled={searchFrozen} fullWidth>
          <MenuItem controlId={`${config.testId}.list.search-status.all.option`} value="All">All</MenuItem>
          <MenuItem controlId={`${config.testId}.list.search-status.active.option`} value="Active">Active</MenuItem>
          <MenuItem controlId={`${config.testId}.list.search-status.inactive.option`} value="Inactive">Inactive</MenuItem>
          </TextField>
        <Box className={styles.searchActions}><Button controlId={`${config.testId}.list.search.button`} className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setSearchApplied(searchDraft)} disabled={searchFrozen}>Search</Button></Box>
        <Box className={styles.searchActions}><Button controlId={`${config.testId}.list.clear.button`} className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setSearchDraft(emptySearch); setSearchApplied(emptySearch); }} disabled={searchFrozen}>Clear</Button></Box>
      </Box>
    </Box>

    <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
      {(loading || rightsLoading) && !dialogOpen ? <EmployeeAttributeGridSkeleton testId={config.testId} /> :
      !canView ? <Box className={styles.emptyState}><Typography sx={{ fontWeight: 800 }}>{config.singular} access is not available for your user group.</Typography></Box> :
        <CommonTable columns={columns} rows={rows} rowIdField="id" exportFileName={config.exportFileName} showExportOptions={canExport} showPaginationSummary hideRowClickHint onRowClick={(row) => { if (rightsLoading || loading || submitting || (!canEdit && !canView)) return; const item = records.find((entry) => entry.id === row.id); if (item) void openDialog(canEdit ? "edit" : "view", item); }} minTableWidth={800} emptyMessage={`No ${config.plural.toLowerCase()} found.`} testIdPrefix={`${config.testId}.list`} toolbarLeft={canAdd ? <Button controlId={`${config.testId}.list.add.button`} className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => void openDialog("add")} disabled={loading || submitting || rightsLoading}>Add {config.singular}</Button> : null} getRowSx={() => ({ backgroundColor: "#fff", "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" }, "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" } })} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />}
      <BlockingLoader blnOpen={submitting} strLabel="Processing..." intZIndex={1400} blnLocal />
    </Box>

    <CommonMasterDialog blnOpen={dialogOpen} onClose={() => setDialogOpen(false)} onDialogClose={(_, reason) => { if (reason !== "backdropClick") setDialogOpen(false); }} rootTestId={`${config.testId}.dialog`} cancelButtonTestId={`${config.testId}.dialog.cancel.button`} primaryButtonTestId={`${config.testId}.dialog.save.button`} strTitle={`${mode === "add" ? "Add" : mode === "edit" ? "Edit" : "View"} ${config.singular}`} strSecondaryLabel={mode === "view" ? "Close" : "Cancel"} strPrimaryLabel={submitting ? "Saving..." : "Save"} onPrimaryAction={() => void save()} blnPrimaryDisabled={submitting} blnHidePrimary={mode === "view"} paperClassName={styles.departmentDialogPaper} titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }} paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }} maxWidth={false} fullWidth={false} contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
      nodeTitleAction={<Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}><ActiveStatusSwitch testId={`${config.testId}.dialog.active.switch`} blnIsActive={form.status === "Active"} disabled={mode === "view"} sx={{ width: 40, height: 22, p: 0, overflow: "visible", "& .MuiSwitch-switchBase": { p: "3px", color: "#fff", transitionDuration: "180ms", "&.Mui-checked": { transform: "translateX(18px)", color: "#fff", "& + .MuiSwitch-track": { backgroundColor: "#00b86b", opacity: 1 } }, "&.Mui-disabled": { color: "#fff", opacity: 0.7 } }, "& .MuiSwitch-thumb": { width: 16, height: 16, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)" }, "& .MuiSwitch-track": { borderRadius: "11px", backgroundColor: "#98a2b3", opacity: 1, transition: "background-color 180ms" } }} onChange={(checked) => setForm((old) => ({ ...old, status: checked ? "Active" : "Inactive" }))} /><Typography className={styles.switchLabel} sx={{ fontSize: "12px !important", fontWeight: "600 !important", whiteSpace: "nowrap" }}>Active</Typography><IconButton aria-label="Close" onClick={() => setDialogOpen(false)} size="small" sx={{ ml: 1, color: "#94a3b8" }}><CloseRoundedIcon fontSize="small" /></IconButton></Box>}
      nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>Required fields are marked <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
      nodeContent={<Box sx={{ display: "grid", gap: "12px" }}>
        <Box sx={{ display: "grid", columnGap: 1.6, rowGap: "12px", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
          {mode === "add" ? (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                {label("basic_information", "Basic Information")}
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25, mb: 1 }}>
                {label("basic_information_help", `Create a new ${config.singular.toLowerCase()} for your organisation.`)}
              </Typography>
            </Box>
          ) : null}
          <TextField
            className="app-mui-text-field"
            controlId={`${config.testId}.dialog.name.input`}
            inputRef={nameInputRef}
            autoFocus={mode !== "view"}
            inputProps={{ controlId: `${config.testId}.dialog.name.input` }}
            required
            label={strNameLabel}
            placeholder={`Enter ${config.singular.toLowerCase()} name`}
            size="small"
            value={form.name}
            disabled={mode === "view"}
            onChange={(event) => {
              const value = event.target.value;
              setErrors((old) => ({ ...old, name: undefined }));
              setForm((old) => ({ ...old, name: value }));
              syncPrimaryName(value);
            }}
            error={Boolean(errors.name)}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            controlId={`${config.testId}.dialog.code.input`}
            inputProps={{ controlId: `${config.testId}.dialog.code.input` }}
            required
            label={strCodeLabel}
            placeholder={`Enter ${config.singular.toLowerCase()} code`}
            size="small"
            value={form.code}
            disabled={mode === "view"}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setErrors((old) => ({ ...old, code: undefined }));
              setForm((old) => ({ ...old, code: value }));
              syncCode(value);
            }}
            error={Boolean(errors.code)}
            helperText={errors.code}
            fullWidth
          />
        </Box>

        {visibleTranslationRows.length > 0 ? (
          <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
              <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{label("language_translations", "Language Translations")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>
                  {label("language_translations_help", `Provide translated ${config.singular.toLowerCase()} names for the application languages you want to support.`)}
                </Typography>
              </Box>
              <Tooltip title={label("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                <span>
                  <Button
                    controlId={`${config.testId}.dialog.translate.button`}
                    className={styles.secondaryButton}
                    variant="outlined"
                    startIcon={<AutoAwesomeRoundedIcon />}
                    onClick={() => void handleTranslateClick()}
                    disabled={mode === "view" || submitting || !form.name.trim() || Boolean(translationLoading[visibleTranslationRows[0]?.strRowID ?? ""])}
                    sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}
                  >
                    {label("translate", "AI Translate")}
                  </Button>
                </span>
              </Tooltip>
            </Box>
            <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
              {visibleTranslationRows.map((text) => (
                <Box key={text.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                  <Typography component="label" htmlFor={`${config.testId}-translation-${text.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                    {languages.find((language) => language.intID === Number(text.intLanguageID))?.strLabel ?? text.strLanguageName}
                  </Typography>
                  <TextField
                    className="app-mui-text-field"
                    id={`${config.testId}-translation-${text.strRowID}`}
                    controlId={`${config.testId}.dialog.translated-name.input`}
                    placeholder={label("dialog_translated_name_placeholder", `Enter ${config.singular.toLowerCase()} name in {language}`).replace("{language}", languages.find((language) => language.intID === Number(text.intLanguageID))?.strLabel ?? text.strLanguageName)}
                    value={text.name}
                    inputProps={{ controlId: `${config.testId}.dialog.translated-name.input`, "data-row-key": text.strRowID }}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((old) => ({
                        ...old,
                        lstTexts: old.lstTexts.map((row) => row.strRowID === text.strRowID ? { ...row, name: value } : row),
                      }));
                    }}
                    disabled={mode === "view"}
                    InputProps={{
                      endAdornment: translationLoading[text.strRowID] ? (
                        <InputAdornment position="end"><DottedLoader intSize={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                      ) : undefined,
                    }}
                    fullWidth
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>} />
    <CommonConfirmDialog blnOpen={Boolean(confirm)} strTitle={confirm?.title} strMessage={confirm?.message} strCancelLabel="Cancel" strConfirmLabel="Delete" blnConfirmDisabled={submitting} onClose={() => setConfirm(null)} onConfirm={() => void executeConfirmed()} />
    <BlockingLoader blnOpen={!config.hideGridLoadingOverlay && (loading || rightsLoading) && !dialogOpen} strLabel="Loading..." intZIndex={1400} />
    <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((old) => ({ ...old, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}><Alert severity={toast.severity} variant="filled">{toast.message}</Alert></Snackbar>
  </Box>;
}
