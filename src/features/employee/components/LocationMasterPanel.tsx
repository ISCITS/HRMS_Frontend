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
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { LocationApiRecord, LocationFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";

type LocationStatus = "Active" | "Inactive";
type LocationMode = "add" | "edit" | "view";

type LocationRecord = {
  id: string;
  code: string;
  name: string;
  intStateID: number | "";
  strStateName: string;
  strCityName: string;
  status: LocationStatus;
};

type LocationForm = {
  code: string;
  name: string;
  intStateID: number | "";
  strCityName: string;
  status: LocationStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | LocationStatus;
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

const dicEmptyForm: LocationForm = { code: "", name: "", intStateID: "", strCityName: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];

function mapLocationRecord(dicRecord: LocationApiRecord): LocationRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strLocationCode,
    name: dicRecord.strLocationName,
    intStateID: dicRecord.intStateID ?? "",
    strStateName: dicRecord.strStateName ?? "",
    strCityName: dicRecord.strCityName ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

function downloadCsv(strFileName: string, lstRows: LocationRecord[]) {
  const lstHeaders = ["Location Name", "Location Code", "State", "City", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.name, dicRow.code, dicRow.strStateName, dicRow.strCityName, dicRow.status]
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

function exportPdf(strTitle: string, lstRows: LocationRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.name}</td>
      <td>${dicRow.code}</td>
      <td>${dicRow.strStateName}</td>
      <td>${dicRow.strCityName}</td>
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
              <th>Location Name</th>
              <th>Location Code</th>
              <th>State</th>
              <th>City</th>
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

export default function LocationMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("location");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(["LOCATION", "LOCATIONS"]);
  const [lstLocations, setLstLocations] = useState<LocationRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<LocationFormOptionsApiRecord | null>(null);
  const [strMode, setStrMode] = useState<LocationMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingLocationId, setStrEditingLocationId] = useState("");
  const [dicForm, setDicForm] = useState<LocationForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof LocationForm, string>>>({});
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
    search: t("search"),
    save: t("save"),
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
    tableState: t("table_state"),
    tableCity: t("table_city"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    exportTitle: stripMasterTitle(t("export_title")),
    exportFileName: t("export_file_name"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldState: t("field_state"),
    fieldCity: t("field_city"),
    fieldStatus: t("field_status"),
    selectState: t("select_state"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    requestFailed: t("request_failed"),
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationCodeDuplicate: t("validation_code_duplicate"),
    validationNameDuplicate: t("validation_name_duplicate"),
    validationCityMax: t("validation_city_max"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    bulkApplyingChanges: t("bulk_applying_changes"),
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
  };

  async function loadLocations() {
    if (!canViewAny()) {
      setLstLocations([]);
      setObjFormOptions(null);
      setLstSelectedIds([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const [objListResult, objOptionResult] = await Promise.all([
        masterApiService.getLocations(),
        masterApiService.getLocationFormOptions()
      ]);
      setLstLocations(objListResult.Data.map(mapLocationRecord));
      setObjFormOptions(objOptionResult.Data);
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
    loadLocations().catch(() => undefined);
  }, [blnRightsLoading]);

  const lstFilteredLocations = useMemo(() => lstLocations.filter((dicLocation) => {
    const blnCodeMatch = !dicSearchApplied.code || dicLocation.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicLocation.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicLocation.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstLocations]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredLocations.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleLocations = lstFilteredLocations.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleLocations.length > 0 && lstVisibleLocations.every((dicLocation) => lstSelectedIds.includes(dicLocation.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleLocations.some((dicLocation) => dicLocation.id === strId));
  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;

  function openDialog(strNextMode: LocationMode, dicLocation?: LocationRecord) {
    setStrMode(strNextMode);
    setStrEditingLocationId(dicLocation?.id ?? "");
    setDicErrors({});
    setDicForm(dicLocation ? {
      code: dicLocation.code,
      name: dicLocation.name,
      intStateID: dicLocation.intStateID,
      strCityName: dicLocation.strCityName,
      status: dicLocation.status
    } : dicEmptyForm);
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
      showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof LocationForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCityName = dicForm.strCityName.trim();

    if (!strName) {
      dicNextErrors.name = dicModuleLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicModuleLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicModuleLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicModuleLabels.validationCodeFormat;
    }

    if (strCityName.length > 100) {
      dicNextErrors.strCityName = dicModuleLabels.validationCityMax;
    }

    if (lstLocations.some((dicLocation) => dicLocation.code.toUpperCase() === strCode && dicLocation.id !== strEditingLocationId)) {
      dicNextErrors.code = dicModuleLabels.validationCodeDuplicate;
    }

    if (lstLocations.some((dicLocation) => dicLocation.name.trim().toLowerCase() === strName.toLowerCase() && dicLocation.id !== strEditingLocationId)) {
      dicNextErrors.name = dicModuleLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveLocation() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strLocationCode: dicForm.code.trim().toUpperCase(),
      strLocationName: dicForm.name.trim(),
      intStateID: dicForm.intStateID === "" ? null : Number(dicForm.intStateID),
      strCityName: dicForm.strCityName.trim() || null,
      blnIsActive: dicForm.status === "Active"
    };
    const objRequest = strMode === "add"
      ? masterApiService.createLocation(objBody)
      : masterApiService.updateLocation(Number(strEditingLocationId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadLocations())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strLocationId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strLocationId)
      ? lstPrevious.filter((strId) => strId !== strLocationId)
      : [...lstPrevious, strLocationId]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleLocations.some((dicLocation) => dicLocation.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleLocations.map((dicLocation) => dicLocation.id)])]);
  }

  function bulkUpdateStatus(strStatus: LocationStatus) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicModuleLabels.confirmBulkActivateTitle : dicModuleLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicModuleLabels.confirmBulkActivateMessage : dicModuleLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicModuleLabels.bulkActivate : dicModuleLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadLocations();
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
        await masterApiService.bulkLocationDelete(lstSelectedIds.map(Number));
        await loadLocations();
        showToast(dicModuleLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteLocation(strLocationId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationDelete([Number(strLocationId)]);
        await loadLocations();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }

  function toggleLocationStatus(strLocationId: string) {
    const objLocation = lstLocations.find((dicItem) => dicItem.id === strLocationId);
    if (!objLocation) {
      return;
    }
    const strNextStatus = objLocation.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicModuleLabels.confirmActivateTitle : dicModuleLabels.confirmDeactivateTitle,
      strMessage: (strNextStatus === "Active" ? dicModuleLabels.confirmActivateMessage : dicModuleLabels.confirmDeactivateMessage)
        .replace("{status}", strNextStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strNextStatus === "Active" ? dicCommonLabels.activate : dicCommonLabels.deactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationStatus([Number(strLocationId)], strNextStatus === "Active");
        await loadLocations();
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
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("location-master.xls", lstFilteredLocations)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportExcel}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.pageTitle, lstFilteredLocations)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportPdf}</Button> : null}
          </Box>

          {!blnLoading && lstFilteredLocations.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredLocations.length)} {dicCommonLabels.paginationSeparator} {lstFilteredLocations.length}
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
                  <th>{dicModuleLabels.tableState}</th>
                  <th>{dicModuleLabels.tableCity}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredLocations.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={7}>{dicModuleLabels.emptyMessage}</td></tr>
                ) : lstVisibleLocations.map((dicLocation) => {
                  const blnSelected = lstSelectedIds.includes(dicLocation.id);
                  return (
                    <tr key={dicLocation.id} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicLocation.id)} /></td>
                      <td><CommonRowActions blnCanView blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} blnCanToggle={blnCanChangeStatus} onView={() => openDialog("view", dicLocation)} onEdit={() => openDialog("edit", dicLocation)} onDelete={() => deleteLocation(dicLocation.id)} onToggle={() => toggleLocationStatus(dicLocation.id)} /></td>
                      <td>{dicLocation.name}</td>
                      <td>{dicLocation.code}</td>
                      <td>{dicLocation.strStateName || "-"}</td>
                      <td>{dicLocation.strCityName || "-"}</td>
                      <td><span className={`${styles.statusPill} ${dicLocation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicLocation.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
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
        onPrimaryAction={saveLocation}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeContent={<Box sx={{ display: "grid", gap: 2.25, pt: 1 }}><TextField label={`${dicModuleLabels.fieldCode} *`} value={dicForm.code} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth disabled={strMode === "view"} /><TextField label={`${dicModuleLabels.fieldName} *`} value={dicForm.name} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth disabled={strMode === "view"} /><TextField label={dicModuleLabels.fieldState} select value={dicForm.intStateID === "" ? "" : String(dicForm.intStateID)} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, intStateID: objEvent.target.value ? Number(objEvent.target.value) : "" }))} fullWidth disabled={strMode === "view"}><MenuItem value="">{dicModuleLabels.selectState}</MenuItem>{(objFormOptions?.lstStates ?? []).map((dicState) => (<MenuItem key={dicState.intID} value={String(dicState.intID)}>{dicState.strLabel}{dicState.strCode ? ` (${dicState.strCode})` : ""}</MenuItem>))}</TextField><TextField label={dicModuleLabels.fieldCity} value={dicForm.strCityName} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, strCityName: objEvent.target.value }))} error={Boolean(dicErrors.strCityName)} helperText={dicErrors.strCityName} fullWidth disabled={strMode === "view"} /><TextField label={dicModuleLabels.fieldStatus} select value={dicForm.status} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as LocationStatus }))} fullWidth disabled={strMode === "view"}><MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem><MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem></TextField></Box>}
      />

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={blnSubmitting ? dicCommonLabels.processing : objConfirmDialog?.strConfirmLabel ?? dicCommonLabels.confirm}
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
