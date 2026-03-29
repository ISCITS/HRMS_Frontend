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
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { DesignationApiRecord, masterApiService } from "@/services/master/MasterApiService";

type DesignationStatus = "Active" | "Inactive";
type DesignationMode = "add" | "edit" | "view";

type DesignationRecord = {
  id: string;
  code: string;
  name: string;
  status: DesignationStatus;
};

type DesignationForm = {
  code: string;
  name: string;
  status: DesignationStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | DesignationStatus;
};

type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
  fnOnConfirm: () => Promise<void>;
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptyForm: DesignationForm = { code: "", name: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultDesignations: DesignationRecord[] = [];
const lstRowsPerPageOptions = [10, 20, 50];

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapDesignationRecord(dicRecord: DesignationApiRecord): DesignationRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strDesignationCode,
    name: dicRecord.strDesignationName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

// Exports the current filtered grid as an Excel-friendly CSV file.
function downloadCsv(strFileName: string, lstRows: DesignationRecord[]) {
  const lstHeaders = ["Designation Name", "Designation Code", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.name, dicRow.code, dicRow.status]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    )
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

// Opens a print-friendly browser window so the visible dataset can be printed or saved as PDF.
function exportPdf(strTitle: string, lstRows: DesignationRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.name}</td>
      <td>${dicRow.code}</td>
      <td>${dicRow.status}</td>
    </tr>
  `).join("");

  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Designation Name</th>
              <th>Designation Code</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${strRows}</tbody>
        </table>
      </body>
    </html>
  `);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

// Designation master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function DesignationMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("designation");
  const [lstDesignations, setLstDesignations] = useState<DesignationRecord[]>(lstDefaultDesignations);
  const [strMode, setStrMode] = useState<DesignationMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingDesignationId, setStrEditingDesignationId] = useState("");
  const [dicForm, setDicForm] = useState<DesignationForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof DesignationForm, string>>>({});
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
    close: t("close"),
    exportExcel: t("export_excel"),
    exportPdf: t("export_pdf"),
    save: t("save"),
    search: t("search"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    rowsPerPage: t("rows_per_page"),
    paginationSeparator: t("pagination_separator"),
    loading: t("loading"),
    processing: t("processing"),
  };
  const dicDesignationLabels = {
    breadcrumbs: t("breadcrumbs"),
    pageTitle: stripMasterTitle(t("page_title")),
    backButton: t("back_button"),
    addButton: t("add_button"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    exportTitle: stripMasterTitle(t("export_title")),
    exportFileName: t("export_file_name"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    bulkApplyingChanges: t("bulk_applying_changes"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    requestFailed: t("request_failed"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title"),
    confirmBulkDeleteTitle: t("confirm_bulk_delete_title"),
    confirmDeleteTitle: t("confirm_delete_title"),
    confirmActivateTitle: t("confirm_activate_title"),
    confirmDeactivateTitle: t("confirm_deactivate_title"),
    confirmBulkActivateLabel: t("confirm_bulk_activate_label"),
    confirmBulkDeactivateLabel: t("confirm_bulk_deactivate_label"),
    confirmBulkDeleteLabel: t("confirm_bulk_delete_label"),
    confirmActivateLabel: t("confirm_activate_label"),
    confirmDeactivateLabel: t("confirm_deactivate_label"),
    confirmDeleteLabel: t("confirm_delete_label"),
    confirmButton: t("confirm_button"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message"),
    confirmBulkDeleteMessage: t("confirm_bulk_delete_message"),
    confirmDeleteMessage: t("confirm_delete_message"),
    confirmActivateMessage: t("confirm_activate_message"),
    confirmDeactivateMessage: t("confirm_deactivate_message"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldStatus: t("field_status"),
    fieldIsActive: t("field_is_active", "Is Active"),
    saving: t("saving", "Saving..."),
    validationNameRequired: t("validation_name_required", dicConstant.designations.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.designations.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.designations.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.designations.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.designations.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.designations.validation.nameDuplicate),
  };

  async function loadDesignations() {
    // Reload from the backend after every mutation so pagination, selection, and DB state stay in sync.
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getDesignations();
      setLstDesignations(objResult.Data.map(mapDesignationRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadDesignations().catch(() => undefined);
  }, []);

  // Filter draft values are only committed on Search/Clear to keep the grid interactions predictable.
  const lstFilteredDesignations = useMemo(() => lstDesignations.filter((dicDesignation) => {
    const blnCodeMatch = !dicSearchApplied.code || dicDesignation.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicDesignation.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicDesignation.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstDesignations]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredDesignations.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleDesignations = lstFilteredDesignations.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleDesignations.length > 0 && lstVisibleDesignations.every((dicDesignation) => lstSelectedIds.includes(dicDesignation.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleDesignations.some((dicDesignation) => dicDesignation.id === strId));

  function openDialog(strNextMode: DesignationMode, dicDesignation?: DesignationRecord) {
    // Reuses one dialog for add, edit, and read-only view modes.
    setStrMode(strNextMode);
    setStrEditingDesignationId(dicDesignation?.id ?? "");
    setDicErrors({});
    setDicForm(dicDesignation ? {
      code: dicDesignation.code,
      name: dicDesignation.name,
      status: dicDesignation.status
    } : dicEmptyForm);
    setBlnDialogOpen(true);
  }

  function closeDialog() {
    // Closes the form dialog without changing persisted designation data.
    setBlnDialogOpen(false);
  }

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    // Central success/error feedback for user actions on the master screen.
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    // Hides the current snackbar notification.
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    // Stores a deferred callback so one confirmation dialog can handle multiple action types.
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    // Clears the confirmation state after cancel or completion.
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    // Row toggles, bulk actions, deletes, and form reset all share one confirmation path.
    if (!objConfirmDialog) {
      return;
    }
    setBlnSubmitting(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicDesignationLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    // Client-side checks mirror the backend rules so duplicate code/name errors surface before submit.
    const dicNextErrors: Partial<Record<keyof DesignationForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicDesignationLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicDesignationLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicDesignationLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicDesignationLabels.validationCodeFormat;
    }

    if (lstDesignations.some((dicDesignation) => dicDesignation.code.toUpperCase() === strCode && dicDesignation.id !== strEditingDesignationId)) {
      dicNextErrors.code = dicDesignationLabels.validationCodeDuplicate;
    }

    if (lstDesignations.some((dicDesignation) => dicDesignation.name.trim().toLowerCase() === strName.toLowerCase() && dicDesignation.id !== strEditingDesignationId)) {
      dicNextErrors.name = dicDesignationLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveDesignation() {
    // Decides between create and update based on the current dialog mode.
    if (!validateForm()) {
      return;
    }
    // Tenant scoping is resolved on the backend; the screen only posts designation fields the user can edit.
    const objBody = {
      strDesignationCode: dicForm.code.trim().toUpperCase(),
      strDesignationName: dicForm.name.trim(),
      blnIsActive: dicForm.status === "Active"
    };

    const objRequest = strMode === "add"
      ? masterApiService.createDesignation(objBody)
      : masterApiService.updateDesignation(Number(strEditingDesignationId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadDesignations())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicDesignationLabels.saveSuccess : dicDesignationLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDesignationLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strDesignationId: string) {
    // Adds or removes one row from the selected designation set.
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strDesignationId)
      ? lstPrevious.filter((strId) => strId !== strDesignationId)
      : [...lstPrevious, strDesignationId]);
  }

  function toggleSelectAll() {
    // Selects only the visible page rows so bulk actions stay aligned with the current page.
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleDesignations.some((dicDesignation) => dicDesignation.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleDesignations.map((dicDesignation) => dicDesignation.id)])]);
  }

  function bulkUpdateStatus(strStatus: DesignationStatus) {
    // Confirms and applies a shared status to all selected designation rows.
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicDesignationLabels.confirmBulkActivateTitle : dicDesignationLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicDesignationLabels.confirmBulkActivateMessage : dicDesignationLabels.confirmBulkDeactivateMessage).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? dicDesignationLabels.confirmBulkActivateLabel : dicDesignationLabels.confirmBulkDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadDesignations();
        showToast(strStatus === "Active" ? dicDesignationLabels.bulkActivateSuccess : dicDesignationLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    // Confirms and deletes the currently selected designation rows.
    openConfirmDialog({
      strTitle: dicDesignationLabels.confirmBulkDeleteTitle,
      strMessage: dicDesignationLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicDesignationLabels.confirmBulkDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationDelete(lstSelectedIds.map(Number));
        await loadDesignations();
        showToast(dicDesignationLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteDesignation(strDesignationId: string) {
    // Deletes a single row by reusing the same backend bulk-delete endpoint.
    openConfirmDialog({
      strTitle: dicDesignationLabels.confirmDeleteTitle,
      strMessage: dicDesignationLabels.confirmDeleteMessage,
      strConfirmLabel: dicDesignationLabels.confirmDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationDelete([Number(strDesignationId)]);
        await loadDesignations();
        showToast(dicDesignationLabels.deleteSuccess);
      }
    });
  }

  function toggleDesignationStatus(strDesignationId: string) {
    // Flips one designation between Active and Inactive through the shared status endpoint.
    const objDesignation = lstDesignations.find((dicItem) => dicItem.id === strDesignationId);
    if (!objDesignation) {
      return;
    }
    const strNextStatus = objDesignation.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicDesignationLabels.confirmActivateTitle : dicDesignationLabels.confirmDeactivateTitle,
      strMessage: strNextStatus === "Active" ? dicDesignationLabels.confirmActivateMessage : dicDesignationLabels.confirmDeactivateMessage,
      strConfirmLabel: strNextStatus === "Active" ? dicDesignationLabels.confirmActivateLabel : dicDesignationLabels.confirmDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationStatus([Number(strDesignationId)], strNextStatus === "Active");
        await loadDesignations();
        showToast(strNextStatus === "Active" ? dicDesignationLabels.activateSuccess : dicDesignationLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicDesignationLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDesignationLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDesignationLabels.searchCodePlaceholder} fullWidth />
          <TextField select label={dicDesignationLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{dicDesignationLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicDesignationLabels.bulkRowsSelected}`}</Typography>
            <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicDesignationLabels.bulkActivate}</Button>
            <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicDesignationLabels.bulkDeactivate}</Button>
            <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicDesignationLabels.bulkDelete}</Button>
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicDesignationLabels.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicDesignationLabels.exportFileName, lstFilteredDesignations)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicDesignationLabels.exportTitle, lstFilteredDesignations)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button>
          </Box>

          {!blnLoading && lstFilteredDesignations.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredDesignations.length)} {dicCommonLabels.paginationSeparator} {lstFilteredDesignations.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>
        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicDesignationLabels.loadingRecords}</Typography>
          </Box>
        ) : (
        // The table wrapper is the only scrolling region so the master header stays stable on screen.
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                <th>{dicDesignationLabels.tableActions}</th>
                <th>{dicDesignationLabels.tableName}</th>
                <th>{dicDesignationLabels.tableCode}</th>
                <th>{dicDesignationLabels.tableStatus}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredDesignations.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={5}>{dicDesignationLabels.emptyMessage}</td></tr>
              ) : lstVisibleDesignations.map((dicDesignation) => {
                const blnSelected = lstSelectedIds.includes(dicDesignation.id);
                return (
                  <tr key={dicDesignation.id} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicDesignation.id)} /></td>
                    <td>{dicDesignation.name}</td>
                    <td>{dicDesignation.code}</td>
                    <td><span className={`${styles.statusPill} ${dicDesignation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicDesignation.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
                    <td>
                      <Box className={styles.actionCell}>
                        <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicDesignation)}><VisibilityRoundedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicDesignation)}><EditRoundedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteDesignation(dicDesignation.id)}><DeleteRoundedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleDesignationStatus(dicDesignation.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
                      </Box>
                    </td>
                    <td>{dicDesignation.code}</td>
                    <td><span className={`${styles.statusPill} ${dicDesignation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicDesignation.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
        )}
      </Box>

      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ className: styles.compactDialogPaper }}>
        <DialogTitle>{strMode === "add" ? dicDesignationLabels.dialogAddTitle : strMode === "edit" ? dicDesignationLabels.dialogEditTitle : dicDesignationLabels.dialogViewTitle}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={`${dicDesignationLabels.fieldName} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value })); }} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth />
            <TextField label={`${dicDesignationLabels.fieldCode} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() })); }} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth />
            <Box className={styles.switchRow}>
              <Typography className={styles.switchLabel}>{dicDesignationLabels.fieldIsActive}</Typography>
              <Switch checked={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {strMode === "view" ? (
            <Button className={styles.secondaryButton} onClick={closeDialog}>{dicCommonLabels.close}</Button>
          ) : (
            <>
              <Button className={styles.secondaryButton} onClick={closeDialog}>{dicCommonLabels.cancel}</Button>
              <Button className={styles.primaryButton} onClick={saveDesignation} disabled={blnSubmitting}>
                {blnSubmitting ? dicDesignationLabels.saving : dicCommonLabels.save}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button className={styles.textAction} onClick={closeConfirmDialog}>{dicCommonLabels.cancel}</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? dicDesignationLabels.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
