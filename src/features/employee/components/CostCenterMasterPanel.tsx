"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  Pagination,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/components/master/CommonConfirmDialog";
import CommonMasterDialog from "@/components/master/CommonMasterDialog";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { CostCenterApiRecord, masterApiService } from "@/services/master/MasterApiService";

type CostCenterStatus = "Active" | "Inactive";
type CostCenterMode = "add" | "edit" | "view";

type CostCenterRecord = {
  id: string;
  code: string;
  name: string;
  status: CostCenterStatus;
};

type CostCenterForm = {
  code: string;
  name: string;
  status: CostCenterStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | CostCenterStatus;
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

const dicEmptyForm: CostCenterForm = { code: "", name: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];

function mapCostCenterRecord(dicRecord: CostCenterApiRecord): CostCenterRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strCostCenterCode,
    name: dicRecord.strCostCenterName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

function downloadCsv(strFileName: string, lstRows: CostCenterRecord[]) {
  const lstHeaders = ["Cost Center Name", "Cost Center Code", "Status"];
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

function exportPdf(strTitle: string, lstRows: CostCenterRecord[]) {
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
              <th>Cost Center Name</th>
              <th>Cost Center Code</th>
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

export default function CostCenterMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("cost_center");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(["COST_CENTER", "COSTCENTER", "COST_CENTRE"]);
  const [lstCostCenters, setLstCostCenters] = useState<CostCenterRecord[]>([]);
  const [strMode, setStrMode] = useState<CostCenterMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingCostCenterId, setStrEditingCostCenterId] = useState("");
  const [dicForm, setDicForm] = useState<CostCenterForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof CostCenterForm, string>>>({});
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
    close: t("close"),
    confirm: t("confirm"),
    activate: t("activate"),
    deactivate: t("deactivate"),
    clear: t("clear"),
    delete: t("delete"),
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
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    exportTitle: stripMasterTitle(t("export_title")),
    exportFileName: t("export_file_name"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
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
    bulkApplyingChanges: t("bulk_applying_changes", "Applying changes..."),
    confirmButton: t("confirm_button", "Confirm"),
  };

  async function loadCostCenters() {
    if (!canViewAny()) {
      setLstCostCenters([]);
      setLstSelectedIds([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getCostCenters();
      setLstCostCenters(objResult.Data.map(mapCostCenterRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadCostCenters().catch(() => undefined);
  }, [blnRightsLoading]);

  const lstFilteredCostCenters = useMemo(() => lstCostCenters.filter((dicCostCenter) => {
    const blnCodeMatch = !dicSearchApplied.code || dicCostCenter.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicCostCenter.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicCostCenter.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstCostCenters]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredCostCenters.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleCostCenters = lstFilteredCostCenters.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleCostCenters.length > 0 && lstVisibleCostCenters.every((dicCostCenter) => lstSelectedIds.includes(dicCostCenter.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleCostCenters.some((dicCostCenter) => dicCostCenter.id === strId));
  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;

  function openDialog(strNextMode: CostCenterMode, dicCostCenter?: CostCenterRecord) {
    setStrMode(strNextMode);
    setStrEditingCostCenterId(dicCostCenter?.id ?? "");
    setDicErrors({});
    setDicForm(dicCostCenter ? { code: dicCostCenter.code, name: dicCostCenter.name, status: dicCostCenter.status } : dicEmptyForm);
    setBlnDialogOpen(true);
  }

  function closeDialog() {
    setBlnDialogOpen(false);
  }

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) {
      return;
    }
    setBlnSubmitting(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Request failed.", "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof CostCenterForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicConstant.costCenters.validation.nameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicConstant.costCenters.validation.nameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicConstant.costCenters.validation.codeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicConstant.costCenters.validation.codeFormat;
    }

    if (lstCostCenters.some((dicCostCenter) => dicCostCenter.code.toUpperCase() === strCode && dicCostCenter.id !== strEditingCostCenterId)) {
      dicNextErrors.code = dicConstant.costCenters.validation.codeDuplicate;
    }

    if (lstCostCenters.some((dicCostCenter) => dicCostCenter.name.trim().toLowerCase() === strName.toLowerCase() && dicCostCenter.id !== strEditingCostCenterId)) {
      dicNextErrors.name = dicConstant.costCenters.validation.nameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCostCenter() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strCostCenterCode: dicForm.code.trim().toUpperCase(),
      strCostCenterName: dicForm.name.trim(),
      blnIsActive: dicForm.status === "Active"
    };
    const objRequest = strMode === "add"
      ? masterApiService.createCostCenter(objBody)
      : masterApiService.updateCostCenter(Number(strEditingCostCenterId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadCostCenters())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strCostCenterId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strCostCenterId)
      ? lstPrevious.filter((strId) => strId !== strCostCenterId)
      : [...lstPrevious, strCostCenterId]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleCostCenters.some((dicCostCenter) => dicCostCenter.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleCostCenters.map((dicCostCenter) => dicCostCenter.id)])]);
  }

  function bulkUpdateStatus(strStatus: CostCenterStatus) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicModuleLabels.confirmBulkActivateTitle : dicModuleLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicModuleLabels.confirmBulkActivateMessage : dicModuleLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicModuleLabels.bulkActivate : dicModuleLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadCostCenters();
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
        await masterApiService.bulkCostCenterDelete(lstSelectedIds.map(Number));
        await loadCostCenters();
        showToast(dicModuleLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteCostCenter(strCostCenterId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterDelete([Number(strCostCenterId)]);
        await loadCostCenters();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }

  function toggleCostCenterStatus(strCostCenterId: string) {
    const objCostCenter = lstCostCenters.find((dicItem) => dicItem.id === strCostCenterId);
    if (!objCostCenter) {
      return;
    }
    const strNextStatus = objCostCenter.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicModuleLabels.confirmActivateTitle : dicModuleLabels.confirmDeactivateTitle,
      strMessage: (strNextStatus === "Active" ? dicModuleLabels.confirmActivateMessage : dicModuleLabels.confirmDeactivateMessage)
        .replace("{status}", strNextStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strNextStatus === "Active" ? dicCommonLabels.activate : dicCommonLabels.deactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterStatus([Number(strCostCenterId)], strNextStatus === "Active");
        await loadCostCenters();
        showToast(strNextStatus === "Active" ? dicModuleLabels.activateSuccess : dicModuleLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? <Alert severity="warning" sx={{ mb: 2 }}>{strRightsError}</Alert> : null}
        {blnReadOnly ? <Alert severity="info" sx={{ mb: 2 }}>You have read-only access to this screen.</Alert> : null}
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth />
            <TextField select label={dicModuleLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
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
            <Typography className={styles.bulkCount}>{dicModuleLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && (blnCanEdit || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
            {blnCanEdit ? <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicModuleLabels.bulkActivate}</Button> : null}
            {blnCanEdit ? <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicModuleLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicModuleLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicModuleLabels.addButton}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicModuleLabels.exportFileName, lstFilteredCostCenters)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportExcel}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.exportTitle, lstFilteredCostCenters)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportPdf}</Button> : null}
          </Box>

          {!blnLoading && lstFilteredCostCenters.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredCostCenters.length)} {dicCommonLabels.paginationSeparator} {lstFilteredCostCenters.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography>You do not have permission to view this screen.</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicModuleLabels.tableActions}</th>
                  <th>{dicModuleLabels.tableName}</th>
                  <th>{dicModuleLabels.tableCode}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredCostCenters.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={5}>{dicModuleLabels.emptyMessage}</td></tr>
                ) : lstVisibleCostCenters.map((dicCostCenter) => {
                  const blnSelected = lstSelectedIds.includes(dicCostCenter.id);
                  return (
                    <tr key={dicCostCenter.id} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicCostCenter.id)} /></td>
                      <td><CommonRowActions blnCanView blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} blnCanToggle={blnCanChangeStatus} onView={() => openDialog("view", dicCostCenter)} onEdit={() => openDialog("edit", dicCostCenter)} onDelete={() => deleteCostCenter(dicCostCenter.id)} onToggle={() => toggleCostCenterStatus(dicCostCenter.id)} /></td>
                      <td>{dicCostCenter.name}</td>
                      <td>{dicCostCenter.code}</td>
                      <td><span className={`${styles.statusPill} ${dicCostCenter.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicCostCenter.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        strTitle={strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicCommonLabels.processing : strMode === "add" ? dicCommonLabels.save : dicCommonLabels.update}
        onPrimaryAction={saveCostCenter}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeContent={
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField
              label={dicModuleLabels.fieldName}
              value={dicForm.name}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))}
              error={Boolean(dicErrors.name)}
              helperText={dicErrors.name}
              fullWidth
              disabled={strMode === "view"}
            />
            <TextField
              label={dicModuleLabels.fieldCode}
              value={dicForm.code}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))}
              error={Boolean(dicErrors.code)}
              helperText={dicErrors.code}
              fullWidth
              disabled={strMode === "view"}
            />
            <TextField
              label={dicModuleLabels.fieldStatus}
              select
              value={dicForm.status}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as CostCenterStatus }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 0.5 }}
              fullWidth
              disabled={strMode === "view"}
            >
              <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
              <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
            </TextField>
          </Box>
        }
      />

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={blnSubmitting ? dicCommonLabels.processing : objConfirmDialog?.strConfirmLabel ?? dicModuleLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        blnCancelDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnLoading || blnSubmitting || blnRightsLoading} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
