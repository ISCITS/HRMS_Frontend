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
const lstRowsPerPageOptions = [5, 10, 20];

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
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

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
    try { await objConfirmDialog.fnOnConfirm(); } catch (objError) { showToast(objError instanceof Error ? objError.message : "Request failed.", "error"); } finally { setBlnSubmitting(false); closeConfirmDialog(); }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof CountryForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCurrencyCode = dicForm.currencyCode.trim().toUpperCase();
    if (!strCode) { dicNextErrors.code = dicConstant.countries.validation.codeRequired; } else if (!/^[A-Z]{2}$/.test(strCode)) { dicNextErrors.code = dicConstant.countries.validation.codeFormat; }
    if (!strName) { dicNextErrors.name = dicConstant.countries.validation.nameRequired; } else if (strName.length < 2) { dicNextErrors.name = dicConstant.countries.validation.nameMin; }
    if (!strCurrencyCode) { dicNextErrors.currencyCode = dicConstant.countries.validation.currencyRequired; } else if (!/^[A-Z]{3}$/.test(strCurrencyCode)) { dicNextErrors.currencyCode = dicConstant.countries.validation.currencyFormat; }
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCountry() {
    if (!validateForm()) { return; }
    const objBody = { strCountryCode: dicForm.code.trim().toUpperCase(), strCountryName: dicForm.name.trim(), strCurrencyCode: dicForm.currencyCode.trim().toUpperCase(), strPhoneCode: dicForm.phoneCode.trim() || null, blnIsActive: dicForm.status === "Active" };
    const objRequest = strMode === "add" ? masterApiService.createCountry(objBody) : masterApiService.updateCountry(Number(strEditingId), objBody);
    setBlnSubmitting(true);
    objRequest.then(() => loadCountries()).then(() => { closeDialog(); showToast(strMode === "add" ? "Country saved successfully." : "Country updated successfully."); }).catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error")).finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strId: string) { setLstSelectedIds((lstPrevious) => lstPrevious.includes(strId) ? lstPrevious.filter((strValue) => strValue !== strId) : [...lstPrevious, strId]); }
  function toggleSelectAll() { if (blnAllVisibleSelected) { setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisible.some((dicCountry) => dicCountry.id === strId))); return; } setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisible.map((dicCountry) => dicCountry.id)])]); }
  function bulkUpdateStatus(strStatus: Status) { openConfirmDialog({ strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Countries`, strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected country record(s) as ${strStatus.toLowerCase()}?`, strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate", fnOnConfirm: async () => { await masterApiService.bulkCountryStatus(lstSelectedIds.map(Number), strStatus === "Active"); await loadCountries(); showToast(strStatus === "Active" ? "Selected country records activated successfully." : "Selected country records deactivated successfully."); } }); }
  function bulkDelete() { openConfirmDialog({ strTitle: "Bulk Delete Countries", strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected country record(s)?`, strConfirmLabel: "Bulk Delete", fnOnConfirm: async () => { await masterApiService.bulkCountryDelete(lstSelectedIds.map(Number)); await loadCountries(); showToast("Selected country records deleted successfully."); } }); }
  function deleteRecord(strId: string) { openConfirmDialog({ strTitle: "Delete Country", strMessage: "Are you sure you want to delete this country record?", strConfirmLabel: "Delete", fnOnConfirm: async () => { await masterApiService.bulkCountryDelete([Number(strId)]); await loadCountries(); showToast("Country deleted successfully."); } }); }
  function toggleStatus(strId: string) { const objItem = lstCountries.find((dicItem) => dicItem.id === strId); if (!objItem) { return; } const strNextStatus = objItem.status === "Active" ? "Inactive" : "Active"; openConfirmDialog({ strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} Country`, strMessage: `Are you sure you want to mark this country as ${strNextStatus.toLowerCase()}?`, strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate", fnOnConfirm: async () => { await masterApiService.bulkCountryStatus([Number(strId)], strNextStatus === "Active"); await loadCountries(); showToast(strNextStatus === "Active" ? "Country activated successfully." : "Country deactivated successfully."); } }); }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}><Typography className={styles.breadcrumbs}>Admin / Master / Countries</Typography><Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicConstant.countries.backButton}</Button></Box>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}><Typography component="h1" className={styles.title}>{dicConstant.countries.pageTitle}</Typography><Box className={styles.headerActions}><Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicConstant.countries.addButton}</Button><Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Country Master", lstFiltered)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportPdf}</Button><Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("country-master.xls", lstFiltered)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportExcel}</Button></Box></Box>
        <Box className={styles.searchRow}><TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder="Search Country Name" fullWidth /><TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder="Search Country Code" fullWidth /><TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth><MenuItem value="All">Status</MenuItem><MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem><MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem></TextField><Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicConstant.common.search}</Button></Box><Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicConstant.common.clear}</Button></Box></Box>
        {lstSelectedIds.length > 0 ? <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{lstSelectedIds.length} row(s) selected</Typography><Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>Bulk Activate</Button><Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>Bulk Deactivate</Button><Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>Bulk Delete</Button></Box> : null}
      </Box>
      <Box className={styles.tableCard}>
        {!blnLoading && lstFiltered.length > 0 ? <Box className={styles.paginationBar}><Box className={styles.paginationInfo}><Typography className={styles.paginationLabel}>{dicConstant.common.rowsPerPage}</Typography><TextField select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>{lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>)}</TextField><Typography className={styles.paginationRange}>{intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFiltered.length)} {dicConstant.common.paginationSeparator} {lstFiltered.length}</Typography></Box><Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton /></Box> : null}
        {blnLoading ? <Box className={styles.emptyState}><CircularProgress size={24} /><Typography sx={{ mt: 1 }}>Loading countries...</Typography></Box> : <Box className={styles.tableWrap}><table className={styles.table}><thead><tr><th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th><th>Country Name</th><th>Country Code</th><th>Currency</th><th>Phone Code</th><th>Status</th><th>Actions</th></tr></thead><tbody>{lstFiltered.length === 0 ? <tr><td className={styles.emptyState} colSpan={7}>No country records found.</td></tr> : lstVisible.map((dicCountry) => { const blnSelected = lstSelectedIds.includes(dicCountry.id); return <tr key={dicCountry.id} className={blnSelected ? styles.selectedRow : undefined}><td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicCountry.id)} /></td><td>{dicCountry.name}</td><td>{dicCountry.code}</td><td>{dicCountry.currencyCode}</td><td>{dicCountry.phoneCode || "-"}</td><td><span className={`${styles.statusPill} ${dicCountry.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicCountry.status}</span></td><td><Box className={styles.actionCell}><button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicCountry)}><VisibilityOutlinedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicCountry)}><EditOutlinedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteRecord(dicCountry.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button><button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleStatus(dicCountry.id)}><ToggleOnRoundedIcon fontSize="small" /></button></Box></td></tr>; })}</tbody></table></Box>}
      </Box>
      <Dialog open={blnDialogOpen} onClose={closeDialog} PaperProps={{ className: styles.dialogPaper }}><DialogTitle className={styles.dialogTitle}>{strMode === "add" ? dicConstant.countries.dialogAddTitle : strMode === "edit" ? dicConstant.countries.dialogEditTitle : dicConstant.countries.dialogViewTitle}</DialogTitle><DialogContent className={styles.dialogContent}><Typography className={styles.sectionBar}>Basic Information</Typography><Box className={styles.dialogGrid}><TextField label={`${dicConstant.countries.fields.name} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => setFormField("name", objEvent.target.value)} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth /><TextField label={`${dicConstant.countries.fields.code} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => setFormField("code", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth /><TextField label={`${dicConstant.countries.fields.currencyCode} *`} value={dicForm.currencyCode} disabled={strMode === "view"} onChange={(objEvent) => setFormField("currencyCode", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.currencyCode)} helperText={dicErrors.currencyCode} fullWidth /><TextField label={dicConstant.countries.fields.phoneCode} value={dicForm.phoneCode} disabled={strMode === "view"} onChange={(objEvent) => setFormField("phoneCode", objEvent.target.value)} fullWidth /><TextField select label={dicConstant.countries.fields.status} value={dicForm.status} disabled={strMode === "view"} onChange={(objEvent) => setFormField("status", objEvent.target.value as Status)} fullWidth><MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem><MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem></TextField></Box></DialogContent><DialogActions className={styles.dialogActions}><Button className={styles.secondaryButton} onClick={closeDialog}>{dicConstant.common.cancel}</Button>{strMode !== "view" ? <Button className={styles.primaryButton} onClick={saveCountry} disabled={blnSubmitting}>{strMode === "add" ? dicConstant.common.save : dicConstant.common.update}</Button> : null}</DialogActions></Dialog>
      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} fullWidth maxWidth="xs"><DialogTitle>{objConfirmDialog?.strTitle}</DialogTitle><DialogContent><Typography>{objConfirmDialog?.strMessage}</Typography></DialogContent><DialogActions><Button onClick={closeConfirmDialog}>{dicConstant.common.cancel}</Button><Button onClick={executeConfirmedAction} variant="contained" color="error" disabled={blnSubmitting}>{objConfirmDialog?.strConfirmLabel}</Button></DialogActions></Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? "Loading..." : "Processing..."} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={4000} onClose={closeToast}><Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled">{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
