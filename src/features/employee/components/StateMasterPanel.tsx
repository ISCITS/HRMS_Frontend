"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, Snackbar, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { type CountryApiRecord, type StateApiRecord, masterApiService } from "@/services/master/MasterApiService";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type StateRecord = { id: string; countryId: number; code: string; name: string; status: Status };
type StateForm = { countryId: number | ""; code: string; name: string; status: Status };
type SearchForm = { code: string; name: string; status: "All" | Status };
type ConfirmDialogState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> };
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const dicEmptyForm: StateForm = { countryId: "", code: "", name: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [5, 10, 20];

function mapStateRecord(dicRecord: StateApiRecord): StateRecord {
  return { id: String(dicRecord.intID), countryId: dicRecord.intCountryID, code: dicRecord.strStateCode, name: dicRecord.strStateName, status: dicRecord.blnIsActive ? "Active" : "Inactive" };
}

function downloadCsv(strFileName: string, lstRows: StateRecord[], dicCountries: Record<number, string>) {
  const lstHeaders = ["Country", "State Name", "State Code", "Status"];
  const lstLines = [lstHeaders.join(","), ...lstRows.map((dicRow) => [dicCountries[dicRow.countryId] ?? "", dicRow.name, dicRow.code, dicRow.status].map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`).join(","))];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: StateRecord[], dicCountries: Record<number, string>) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) { return; }
  const strRows = lstRows.map((dicRow) => `<tr><td>${dicCountries[dicRow.countryId] ?? ""}</td><td>${dicRow.name}</td><td>${dicRow.code}</td><td>${dicRow.status}</td></tr>`).join("");
  objWindow.document.write(`<html><head><title>${strTitle}</title><style>body { font-family: Arial, sans-serif; padding: 24px; } h1 { margin-bottom: 16px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; } th { background: #e2e8f0; }</style></head><body><h1>${strTitle}</h1><table><thead><tr><th>Country</th><th>State Name</th><th>State Code</th><th>Status</th></tr></thead><tbody>${strRows}</tbody></table></body></html>`);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function StateMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("state");
  const [lstStates, setLstStates] = useState<StateRecord[]>([]);
  const [lstCountries, setLstCountries] = useState<CountryApiRecord[]>([]);
  const [strMode, setStrMode] = useState<Mode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingId, setStrEditingId] = useState("");
  const [dicForm, setDicForm] = useState<StateForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof StateForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const dicCommonLabels = {
    cancel: t("cancel", dicConstant.common.cancel),
    clear: t("clear", dicConstant.common.clear),
    exportExcel: t("export_excel", dicConstant.common.exportExcel),
    exportPdf: t("export_pdf", dicConstant.common.exportPdf),
    search: t("search", dicConstant.common.search),
    statusActive: t("status_active", dicConstant.common.statusActive),
    statusInactive: t("status_inactive", dicConstant.common.statusInactive),
    rowsPerPage: t("rows_per_page", dicConstant.common.rowsPerPage),
    paginationSeparator: t("pagination_separator", dicConstant.common.paginationSeparator),
    loading: t("loading", "Loading..."),
    processing: t("processing", "Processing..."),
  };
  const dicModuleLabels = {
    breadcrumbs: t("breadcrumbs", "Admin / Master / States"),
    pageTitle: t("page_title", dicConstant.states.pageTitle),
    backButton: t("back_button", dicConstant.states.backButton),
    addButton: t("add_button", dicConstant.states.addButton),
    searchNamePlaceholder: t("search_name_placeholder", "Search State Name"),
    searchCodePlaceholder: t("search_code_placeholder", "Search State Code"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    loadingRecords: t("loading_records", "Loading states..."),
    emptyMessage: t("empty_message", "No state records found."),
    tableCountry: t("table_country", "Country"),
    tableName: t("table_name", "State Name"),
    tableCode: t("table_code", "State Code"),
    tableStatus: t("table_status", "Status"),
    tableActions: t("table_actions", "Actions"),
    dialogAddTitle: t("dialog_add_title", dicConstant.states.dialogAddTitle),
    dialogEditTitle: t("dialog_edit_title", dicConstant.states.dialogEditTitle),
    dialogViewTitle: t("dialog_view_title", "View State"),
  };

  async function loadData() {
    setBlnLoading(true);
    try {
      const [objStates, objCountries] = await Promise.all([masterApiService.getStates(), masterApiService.getCountries()]);
      setLstStates(objStates.Data.map(mapStateRecord));
      setLstCountries(objCountries.Data);
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { loadData().catch(() => undefined); }, []);

  function setFormField<TKey extends keyof StateForm>(strField: TKey, objValue: StateForm[TKey]) {
    setDicForm((objPrevious) => ({ ...objPrevious, [strField]: objValue }));
    setDicErrors((objPrevious) => objPrevious[strField] ? { ...objPrevious, [strField]: undefined } : objPrevious);
  }

  const dicCountries = useMemo(() => Object.fromEntries(lstCountries.map((dicCountry) => [dicCountry.intID, dicCountry.strCountryName])), [lstCountries]);
  const lstFiltered = useMemo(() => lstStates.filter((dicState) => {
    const blnCodeMatch = !dicSearchApplied.code || dicState.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicState.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicState.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstStates]);

  const intPageCount = Math.max(1, Math.ceil(lstFiltered.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisible = lstFiltered.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisible.length > 0 && lstVisible.every((dicState) => lstSelectedIds.includes(dicState.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisible.some((dicState) => dicState.id === strId));

  function openDialog(strNextMode: Mode, dicState?: StateRecord) { setStrMode(strNextMode); setStrEditingId(dicState?.id ?? ""); setDicErrors({}); setDicForm(dicState ? { countryId: dicState.countryId, code: dicState.code, name: dicState.name, status: dicState.status } : dicEmptyForm); setBlnDialogOpen(true); }
  function closeDialog() { setBlnDialogOpen(false); }
  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") { setObjToast({ blnOpen: true, strMessage, strSeverity }); }
  function closeToast() { setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false })); }
  function openConfirmDialog(objDialog: ConfirmDialogState) { setObjConfirmDialog(objDialog); }
  function closeConfirmDialog() { setObjConfirmDialog(null); }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) { return; }
    setBlnSubmitting(true);
    try { await objConfirmDialog.fnOnConfirm(); } catch (objError) { showToast(objError instanceof Error ? objError.message : "Request failed.", "error"); } finally { setBlnSubmitting(false); closeConfirmDialog(); }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof StateForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    if (dicForm.countryId === "") { dicNextErrors.countryId = dicConstant.states.validation.countryRequired; }
    if (!strCode) { dicNextErrors.code = dicConstant.states.validation.codeRequired; } else if (!/^[A-Z0-9 /_-]{2,20}$/.test(strCode)) { dicNextErrors.code = dicConstant.states.validation.codeFormat; }
    if (!strName) { dicNextErrors.name = dicConstant.states.validation.nameRequired; } else if (strName.length < 2) { dicNextErrors.name = dicConstant.states.validation.nameMin; }
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveState() {
    if (!validateForm()) { return; }
    const objBody = { intCountryID: Number(dicForm.countryId), strStateCode: dicForm.code.trim().toUpperCase(), strStateName: dicForm.name.trim(), blnIsActive: dicForm.status === "Active" };
    const objRequest = strMode === "add" ? masterApiService.createState(objBody) : masterApiService.updateState(Number(strEditingId), objBody);
    setBlnSubmitting(true);
    objRequest.then(() => loadData()).then(() => { closeDialog(); showToast(strMode === "add" ? "State saved successfully." : "State updated successfully."); }).catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error")).finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strId: string) { setLstSelectedIds((lstPrevious) => lstPrevious.includes(strId) ? lstPrevious.filter((strValue) => strValue !== strId) : [...lstPrevious, strId]); }
  function toggleSelectAll() { if (blnAllVisibleSelected) { setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisible.some((dicState) => dicState.id === strId))); return; } setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisible.map((dicState) => dicState.id)])]); }
  function bulkUpdateStatus(strStatus: Status) { openConfirmDialog({ strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} States`, strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected state record(s) as ${strStatus.toLowerCase()}?`, strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate", fnOnConfirm: async () => { await masterApiService.bulkStateStatus(lstSelectedIds.map(Number), strStatus === "Active"); await loadData(); showToast(strStatus === "Active" ? "Selected state records activated successfully." : "Selected state records deactivated successfully."); } }); }
  function bulkDelete() { openConfirmDialog({ strTitle: "Bulk Delete States", strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected state record(s)?`, strConfirmLabel: "Bulk Delete", fnOnConfirm: async () => { await masterApiService.bulkStateDelete(lstSelectedIds.map(Number)); await loadData(); showToast("Selected state records deleted successfully."); } }); }
  function deleteRecord(strId: string) { openConfirmDialog({ strTitle: "Delete State", strMessage: "Are you sure you want to delete this state record?", strConfirmLabel: "Delete", fnOnConfirm: async () => { await masterApiService.bulkStateDelete([Number(strId)]); await loadData(); showToast("State deleted successfully."); } }); }
  function toggleStatus(strId: string) { const objItem = lstStates.find((dicItem) => dicItem.id === strId); if (!objItem) { return; } const strNextStatus = objItem.status === "Active" ? "Inactive" : "Active"; openConfirmDialog({ strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} State`, strMessage: `Are you sure you want to mark this state as ${strNextStatus.toLowerCase()}?`, strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate", fnOnConfirm: async () => { await masterApiService.bulkStateStatus([Number(strId)], strNextStatus === "Active"); await loadData(); showToast(strNextStatus === "Active" ? "State activated successfully." : "State deactivated successfully."); } }); }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}><Typography className={styles.breadcrumbs}>{dicModuleLabels.breadcrumbs}</Typography><Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button></Box>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}><Typography component="h1" className={styles.title}>{dicModuleLabels.pageTitle}</Typography><Box className={styles.headerActions}><Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicModuleLabels.addButton}</Button><Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.pageTitle, lstFiltered, dicCountries)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button><Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("state-master.xls", lstFiltered, dicCountries)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button></Box></Box>
        <Box className={styles.searchRow}><TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth /><TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth /><TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth><MenuItem value="All">{dicModuleLabels.searchStatusPlaceholder}</MenuItem><MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem><MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem></TextField><Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box><Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box></Box>
        {lstSelectedIds.length > 0 ? <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{lstSelectedIds.length} {t("bulk_rows_selected", "row(s) selected")}</Typography><Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{t("bulk_activate", "Bulk Activate")}</Button><Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{t("bulk_deactivate", "Bulk Deactivate")}</Button><Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{t("bulk_delete", "Bulk Delete")}</Button></Box> : null}
      </Box>
      <Box className={styles.tableCard}>
        {!blnLoading && lstFiltered.length > 0 ? <Box className={styles.paginationBar}><Box className={styles.paginationInfo}><Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography><TextField select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>{lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>)}</TextField><Typography className={styles.paginationRange}>{intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFiltered.length)} {dicCommonLabels.paginationSeparator} {lstFiltered.length}</Typography></Box><Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton /></Box> : null}
        {blnLoading ? <Box className={styles.emptyState}><CircularProgress size={24} /><Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography></Box> : <Box className={styles.tableWrap}><table className={styles.table}><thead><tr><th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th><th>{dicModuleLabels.tableCountry}</th><th>{dicModuleLabels.tableName}</th><th>{dicModuleLabels.tableCode}</th><th>{dicModuleLabels.tableStatus}</th><th>{dicModuleLabels.tableActions}</th></tr></thead><tbody>{lstFiltered.length === 0 ? <tr><td className={styles.emptyState} colSpan={6}>{dicModuleLabels.emptyMessage}</td></tr> : lstVisible.map((dicState) => { const blnSelected = lstSelectedIds.includes(dicState.id); return <tr key={dicState.id} className={blnSelected ? styles.selectedRow : undefined}><td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicState.id)} /></td><td>{dicCountries[dicState.countryId] ?? "-"}</td><td>{dicState.name}</td><td>{dicState.code}</td><td><span className={`${styles.statusPill} ${dicState.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicState.status}</span></td><td><Box className={styles.actionCell}><button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicState)}><VisibilityOutlinedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicState)}><EditOutlinedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteRecord(dicState.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleStatus(dicState.id)}><ToggleOnRoundedIcon fontSize="small" /></button></Box></td></tr>; })}</tbody></table></Box>}
      </Box>
      <Dialog open={blnDialogOpen} onClose={closeDialog} PaperProps={{ className: styles.dialogPaper }}><DialogTitle className={styles.dialogTitle}>{strMode === "add" ? dicConstant.states.dialogAddTitle : strMode === "edit" ? dicConstant.states.dialogEditTitle : dicConstant.states.dialogViewTitle}</DialogTitle><DialogContent className={styles.dialogContent}><Typography className={styles.sectionBar}>Basic Information</Typography><Box className={styles.dialogGrid}><TextField select label={`${dicConstant.states.fields.country} *`} value={String(dicForm.countryId)} disabled={strMode === "view"} onChange={(objEvent) => setFormField("countryId", objEvent.target.value ? Number(objEvent.target.value) : "")} error={Boolean(dicErrors.countryId)} helperText={dicErrors.countryId} fullWidth><MenuItem value="">Select Country</MenuItem>{lstCountries.map((dicCountry) => <MenuItem key={dicCountry.intID} value={String(dicCountry.intID)}>{dicCountry.strCountryName}</MenuItem>)}</TextField><TextField label={`${dicConstant.states.fields.name} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => setFormField("name", objEvent.target.value)} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth /><TextField label={`${dicConstant.states.fields.code} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => setFormField("code", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth /><TextField select label={dicConstant.states.fields.status} value={dicForm.status} disabled={strMode === "view"} onChange={(objEvent) => setFormField("status", objEvent.target.value as Status)} fullWidth><MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem><MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem></TextField></Box></DialogContent><DialogActions sx={{ px: 3, py: 2 }}><Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? t("close", "Close") : dicConstant.common.cancel}</Button>{strMode !== "view" ? <Button className={styles.primaryButton} onClick={saveState} disabled={blnSubmitting}>{strMode === "add" ? dicConstant.common.save : dicConstant.common.update}</Button> : null}</DialogActions></Dialog>
      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}><DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle><DialogContent className={styles.confirmDialogContent}><Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography></DialogContent><DialogActions className={styles.confirmDialogActions}><Button className={styles.textAction} onClick={closeConfirmDialog}>{dicConstant.common.cancel}</Button><Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>{objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}</Button></DialogActions></Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}><Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
