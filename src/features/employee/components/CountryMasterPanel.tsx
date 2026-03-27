"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, Snackbar, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { type CountryApiRecord, masterApiService } from "@/services/master/MasterApiService";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type CountryRecord = { id: string; code: string; name: string; currencyCode: string; phoneCode: string; status: Status };
type CountryForm = { code: string; name: string; currencyCode: string; phoneCode: string; status: Status };
type SearchForm = { code: string; name: string; status: "All" | Status };
type ConfirmDialogState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> };
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const dicEmptyForm: CountryForm = { code: "", name: "", currencyCode: "", phoneCode: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];

function mapCountryRecord(dicRecord: CountryApiRecord): CountryRecord {
  return { id: String(dicRecord.intID), code: dicRecord.strCountryCode, name: dicRecord.strCountryName, currencyCode: dicRecord.strCurrencyCode, phoneCode: dicRecord.strPhoneCode ?? "", status: dicRecord.blnIsActive ? "Active" : "Inactive" };
}

function downloadCsv(strFileName: string, lstRows: CountryRecord[]) {
  const lstHeaders = ["Country Name", "Country Code", "Currency Code", "Phone Code", "Status"];
  const lstLines = [lstHeaders.join(","), ...lstRows.map((dicRow) => [dicRow.name, dicRow.code, dicRow.currencyCode, dicRow.phoneCode, dicRow.status].map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`).join(","))];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: CountryRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) { return; }
  const strRows = lstRows.map((dicRow) => `<tr><td>${dicRow.name}</td><td>${dicRow.code}</td><td>${dicRow.currencyCode}</td><td>${dicRow.phoneCode}</td><td>${dicRow.status}</td></tr>`).join("");
  objWindow.document.write(`<html><head><title>${strTitle}</title><style>body { font-family: Arial, sans-serif; padding: 24px; } h1 { margin-bottom: 16px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; } th { background: #e2e8f0; }</style></head><body><h1>${strTitle}</h1><table><thead><tr><th>Country Name</th><th>Country Code</th><th>Currency</th><th>Phone Code</th><th>Status</th></tr></thead><tbody>${strRows}</tbody></table></body></html>`);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function CountryMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("country");
  const [lstCountries, setLstCountries] = useState<CountryRecord[]>([]);
  const [strMode, setStrMode] = useState<Mode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingId, setStrEditingId] = useState("");
  const [dicForm, setDicForm] = useState<CountryForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof CountryForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const dicCommonLabels = {
    cancel: t("cancel"),
    clear: t("clear"),
    exportExcel: t("export_excel"),
    exportPdf: t("export_pdf"),
    save: t("save"),
    search: t("search"),
    update: t("update"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    rowsPerPage: t("rows_per_page"),
    paginationSeparator: t("pagination_separator"),
    loading: t("loading"),
    processing: t("processing"),
  };
  const dicModuleLabels = {
    breadcrumbs: t("breadcrumbs"),
    pageTitle: stripMasterTitle(t("page_title")),
    backButton: t("back_button"),
    addButton: t("add_button"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableCurrency: t("table_currency"),
    tablePhoneCode: t("table_phone_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldCurrencyCode: t("field_currency_code"),
    fieldPhoneCode: t("field_phone_code"),
    fieldStatus: t("field_status"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    requestFailed: t("request_failed"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
    validationCurrencyRequired: t("validation_currency_required"),
    validationCurrencyFormat: t("validation_currency_format"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    confirmButton: t("confirm_button"),
    confirmDeleteTitle: t("confirm_delete_title"),
    confirmDeleteMessage: t("confirm_delete_message"),
    confirmActivateTitle: t("confirm_activate_title"),
    confirmActivateMessage: t("confirm_activate_message"),
    confirmDeactivateTitle: t("confirm_deactivate_title"),
    confirmDeactivateMessage: t("confirm_deactivate_message"),
    confirmBulkDeleteTitle: t("confirm_bulk_delete_title"),
    confirmBulkDeleteMessage: t("confirm_bulk_delete_message"),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message"),
    close: t("close"),
  };

  async function loadCountries() {
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getCountries();
      setLstCountries(objResult.Data.map(mapCountryRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { loadCountries().catch(() => undefined); }, []);

  function setFormField<TKey extends keyof CountryForm>(strField: TKey, objValue: CountryForm[TKey]) {
    setDicForm((objPrevious) => ({ ...objPrevious, [strField]: objValue }));
    setDicErrors((objPrevious) => objPrevious[strField] ? { ...objPrevious, [strField]: undefined } : objPrevious);
  }

  const lstFiltered = useMemo(() => lstCountries.filter((dicCountry) => {
    const blnCodeMatch = !dicSearchApplied.code || dicCountry.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicCountry.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicCountry.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstCountries]);

  const intPageCount = Math.max(1, Math.ceil(lstFiltered.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisible = lstFiltered.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisible.length > 0 && lstVisible.every((dicCountry) => lstSelectedIds.includes(dicCountry.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisible.some((dicCountry) => dicCountry.id === strId));

  function openDialog(strNextMode: Mode, dicCountry?: CountryRecord) { setStrMode(strNextMode); setStrEditingId(dicCountry?.id ?? ""); setDicErrors({}); setDicForm(dicCountry ? { code: dicCountry.code, name: dicCountry.name, currencyCode: dicCountry.currencyCode, phoneCode: dicCountry.phoneCode, status: dicCountry.status } : dicEmptyForm); setBlnDialogOpen(true); }
  function closeDialog() { setBlnDialogOpen(false); }
  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") { setObjToast({ blnOpen: true, strMessage, strSeverity }); }
  function closeToast() { setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false })); }
  function openConfirmDialog(objDialog: ConfirmDialogState) { setObjConfirmDialog(objDialog); }
  function closeConfirmDialog() { setObjConfirmDialog(null); }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) { return; }
    setBlnSubmitting(true);
    try { await objConfirmDialog.fnOnConfirm(); } catch (objError) { showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"); } finally { setBlnSubmitting(false); closeConfirmDialog(); }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof CountryForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCurrencyCode = dicForm.currencyCode.trim().toUpperCase();
    if (!strCode) { dicNextErrors.code = dicModuleLabels.validationCodeRequired; } else if (!/^[A-Z]{2}$/.test(strCode)) { dicNextErrors.code = dicModuleLabels.validationCodeFormat; }
    if (!strName) { dicNextErrors.name = dicModuleLabels.validationNameRequired; } else if (strName.length < 2) { dicNextErrors.name = dicModuleLabels.validationNameMin; }
    if (!strCurrencyCode) { dicNextErrors.currencyCode = dicModuleLabels.validationCurrencyRequired; } else if (!/^[A-Z]{3}$/.test(strCurrencyCode)) { dicNextErrors.currencyCode = dicModuleLabels.validationCurrencyFormat; }
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCountry() {
    if (!validateForm()) { return; }
    const objBody = { strCountryCode: dicForm.code.trim().toUpperCase(), strCountryName: dicForm.name.trim(), strCurrencyCode: dicForm.currencyCode.trim().toUpperCase(), strPhoneCode: dicForm.phoneCode.trim() || null, blnIsActive: dicForm.status === "Active" };
    const objRequest = strMode === "add" ? masterApiService.createCountry(objBody) : masterApiService.updateCountry(Number(strEditingId), objBody);
    setBlnSubmitting(true);
    objRequest.then(() => loadCountries()).then(() => { closeDialog(); showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess); }).catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error")).finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strId: string) { setLstSelectedIds((lstPrevious) => lstPrevious.includes(strId) ? lstPrevious.filter((strValue) => strValue !== strId) : [...lstPrevious, strId]); }
  function toggleSelectAll() { if (blnAllVisibleSelected) { setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisible.some((dicCountry) => dicCountry.id === strId))); return; } setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisible.map((dicCountry) => dicCountry.id)])]); }
  function bulkUpdateStatus(strStatus: Status) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicModuleLabels.confirmBulkActivateTitle : dicModuleLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicModuleLabels.confirmBulkActivateMessage : dicModuleLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicModuleLabels.bulkActivate : dicModuleLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadCountries();
        showToast(strStatus === "Active" ? dicModuleLabels.bulkActivateSuccess : dicModuleLabels.bulkDeactivateSuccess);
      }
    });
  }
  function bulkDelete() {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmBulkDeleteTitle,
      strMessage: dicModuleLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicModuleLabels.bulkDelete,
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryDelete(lstSelectedIds.map(Number));
        await loadCountries();
        showToast(dicModuleLabels.bulkDeleteSuccess);
      }
    });
  }
  function deleteRecord(strId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: t("delete"),
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryDelete([Number(strId)]);
        await loadCountries();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }
  function toggleStatus(strId: string) {
    const objItem = lstCountries.find((dicItem) => dicItem.id === strId);
    if (!objItem) { return; }
    const strNextStatus = objItem.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicModuleLabels.confirmActivateTitle : dicModuleLabels.confirmDeactivateTitle,
      strMessage: (strNextStatus === "Active" ? dicModuleLabels.confirmActivateMessage : dicModuleLabels.confirmDeactivateMessage)
        .replace("{status}", strNextStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strNextStatus === "Active" ? t("activate") : t("deactivate"),
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryStatus([Number(strId)], strNextStatus === "Active");
        await loadCountries();
        showToast(strNextStatus === "Active" ? dicModuleLabels.activateSuccess : dicModuleLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}><Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button></Box>
      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}><TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth /><TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth /><TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth><MenuItem value="All">{dicModuleLabels.searchStatusPlaceholder}</MenuItem><MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem><MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem></TextField><Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box><Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box></Box>
        {lstSelectedIds.length > 0 ? <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography><Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicModuleLabels.bulkActivate}</Button><Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicModuleLabels.bulkDeactivate}</Button><Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicModuleLabels.bulkDelete}</Button></Box> : null}
      </Box>
      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}><Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicModuleLabels.addButton}</Button><Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("country-master.xls", lstFiltered)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button><Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.pageTitle, lstFiltered)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button></Box>{!blnLoading && lstFiltered.length > 0 ? <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}><Box className={styles.paginationInfo}><Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography><TextField select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>{lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>)}</TextField><Typography className={styles.paginationRange}>{intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFiltered.length)} {dicCommonLabels.paginationSeparator} {lstFiltered.length}</Typography></Box><Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton /></Box> : null}</Box>
        {blnLoading ? <Box className={styles.emptyState}><CircularProgress size={24} /><Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography></Box> : <Box className={styles.tableWrap}><table className={styles.table}><thead><tr><th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th><th>{dicModuleLabels.tableActions}</th><th>{dicModuleLabels.tableName}</th><th>{dicModuleLabels.tableCode}</th><th>{dicModuleLabels.tableCurrency}</th><th>{dicModuleLabels.tablePhoneCode}</th><th>{dicModuleLabels.tableStatus}</th></tr></thead><tbody>{lstFiltered.length === 0 ? <tr><td className={styles.emptyState} colSpan={7}>{dicModuleLabels.emptyMessage}</td></tr> : lstVisible.map((dicCountry) => { const blnSelected = lstSelectedIds.includes(dicCountry.id); return <tr key={dicCountry.id} className={blnSelected ? styles.selectedRow : undefined}><td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicCountry.id)} /></td><td><Box className={styles.actionCell}><button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicCountry)}><VisibilityRoundedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicCountry)}><EditRoundedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteRecord(dicCountry.id)}><DeleteRoundedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleStatus(dicCountry.id)}><ToggleOnRoundedIcon fontSize="small" /></button></Box></td><td>{dicCountry.name}</td><td>{dicCountry.code}</td><td>{dicCountry.currencyCode}</td><td>{dicCountry.phoneCode || "-"}</td><td><span className={`${styles.statusPill} ${dicCountry.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicCountry.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td></tr>; })}</tbody></table></Box>}
      </Box>
      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ className: styles.compactDialogPaper }}><DialogTitle>{strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}</DialogTitle><DialogContent dividers><Box sx={{ display: "grid", gap: 2.25, pt: 1 }}><TextField label={`${dicModuleLabels.fieldName} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => setFormField("name", objEvent.target.value)} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth /><TextField label={`${dicModuleLabels.fieldCode} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => setFormField("code", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth /><TextField label={`${dicModuleLabels.fieldCurrencyCode} *`} value={dicForm.currencyCode} disabled={strMode === "view"} onChange={(objEvent) => setFormField("currencyCode", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.currencyCode)} helperText={dicErrors.currencyCode} fullWidth /><TextField label={dicModuleLabels.fieldPhoneCode} value={dicForm.phoneCode} disabled={strMode === "view"} onChange={(objEvent) => setFormField("phoneCode", objEvent.target.value)} fullWidth /><TextField select label={dicModuleLabels.fieldStatus} value={dicForm.status} disabled={strMode === "view"} onChange={(objEvent) => setFormField("status", objEvent.target.value as Status)} fullWidth><MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem><MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem></TextField></Box></DialogContent><DialogActions sx={{ px: 3, py: 2 }}><Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? dicModuleLabels.close : dicCommonLabels.cancel}</Button>{strMode !== "view" ? <Button className={styles.primaryButton} onClick={saveCountry} disabled={blnSubmitting}>{blnSubmitting ? dicCommonLabels.processing : strMode === "add" ? dicCommonLabels.save : dicCommonLabels.update}</Button> : null}</DialogActions></Dialog>
      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}><DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle><DialogContent className={styles.confirmDialogContent}><Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography></DialogContent><DialogActions className={styles.confirmDialogActions}><Button className={styles.textAction} onClick={closeConfirmDialog}>{dicCommonLabels.cancel}</Button><Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>{objConfirmDialog?.strConfirmLabel ?? dicModuleLabels.confirmButton}</Button></DialogActions></Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}><Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
