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
import { DepartmentApiRecord, masterApiService } from "@/services/master/MasterApiService";

type DepartmentStatus = "Active" | "Inactive";
type DepartmentMode = "add" | "edit" | "view";

type DepartmentRecord = {
  id: string;
  code: string;
  name: string;
  status: DepartmentStatus;
  employeeCount: number;
};

type DepartmentForm = {
  code: string;
  name: string;
  status: DepartmentStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | DepartmentStatus;
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

const dicEmptyForm: DepartmentForm = { code: "", name: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultDepartments: DepartmentRecord[] = [];
const lstRowsPerPageOptions = [5, 10, 20];

// The API returns backend field names; the UI keeps a smaller view model for rendering and form state.
function mapDepartmentRecord(dicRecord: DepartmentApiRecord): DepartmentRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strDepartmentCode,
    name: dicRecord.strDepartmentName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
    employeeCount: 0
  };
}

// Exports the current filtered grid as an Excel-friendly CSV file.
function downloadCsv(strFileName: string, lstRows: DepartmentRecord[]) {
  const lstHeaders = ["Department Name", "Department Code", "Status", "Employees"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.name, dicRow.code, dicRow.status, dicRow.employeeCount]
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

// Opens a print-friendly browser window so the visible dataset can be saved as PDF.
function exportPdf(strTitle: string, lstRows: DepartmentRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.name}</td>
      <td>${dicRow.code}</td>
      <td>${dicRow.status}</td>
      <td>${dicRow.employeeCount}</td>
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
              <th>Department Name</th>
              <th>Department Code</th>
              <th>Status</th>
              <th>Employees</th>
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

// Department master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function DepartmentMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("department");
  const [lstDepartments, setLstDepartments] = useState<DepartmentRecord[]>(lstDefaultDepartments);
  const [strMode, setStrMode] = useState<DepartmentMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingDepartmentId, setStrEditingDepartmentId] = useState("");
  const [dicForm, setDicForm] = useState<DepartmentForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof DepartmentForm, string>>>({});
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
    close: t("close", dicConstant.common.close),
    delete: t("delete", dicConstant.common.delete),
    exportExcel: t("export_excel", dicConstant.common.exportExcel),
    exportPdf: t("export_pdf", dicConstant.common.exportPdf),
    save: t("save", dicConstant.common.save),
    search: t("search", dicConstant.common.search),
    statusActive: t("status_active", dicConstant.common.statusActive),
    statusInactive: t("status_inactive", dicConstant.common.statusInactive),
    rowsPerPage: t("rows_per_page", dicConstant.common.rowsPerPage),
    paginationSeparator: t("pagination_separator", dicConstant.common.paginationSeparator),
    loading: t("loading", "Loading..."),
    processing: t("processing", "Processing..."),
  };
  const dicDepartmentLabels = {
    breadcrumbs: t("breadcrumbs", "Admin / Master / Departments"),
    pageTitle: t("page_title", dicConstant.departments.pageTitle),
    backButton: t("back_button", dicConstant.departments.backButton),
    addButton: t("add_button", dicConstant.departments.addButton),
    dialogAddTitle: t("dialog_add_title", dicConstant.departments.dialogAddTitle),
    dialogEditTitle: t("dialog_edit_title", dicConstant.departments.dialogEditTitle),
    dialogViewTitle: t("dialog_view_title", "View Department"),
    exportTitle: t("export_title", "Department Master"),
    exportFileName: t("export_file_name", "department-master.xls"),
    searchNamePlaceholder: t("search_name_placeholder", "Search Department Name"),
    searchCodePlaceholder: t("search_code_placeholder", "Search Department Code"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    bulkApplyingChanges: t("bulk_applying_changes", "Applying changes..."),
    bulkRowsSelected: t("bulk_rows_selected", "row(s) selected"),
    bulkActivate: t("bulk_activate", "Bulk Activate"),
    bulkDeactivate: t("bulk_deactivate", "Bulk Deactivate"),
    bulkDelete: t("bulk_delete", "Bulk Delete"),
    loadingDepartments: t("loading_departments", "Loading departments..."),
    emptyMessage: t("empty_message", "No department records found."),
    tableName: t("table_name", "Department Name"),
    tableCode: t("table_code", "Department Code"),
    tableStatus: t("table_status", "Status"),
    tableEmployees: t("table_employees", "Employees"),
    tableActions: t("table_actions", "Actions"),
    saveSuccess: t("save_success", "Department saved successfully."),
    updateSuccess: t("update_success", "Department updated successfully."),
    requestFailed: t("request_failed", "Request failed."),
    deleteSuccess: t("delete_success", "Department deleted successfully."),
    activateSuccess: t("activate_success", "Department activated successfully."),
    deactivateSuccess: t("deactivate_success", "Department deactivated successfully."),
    bulkActivateSuccess: t("bulk_activate_success", "Selected department records activated successfully."),
    bulkDeactivateSuccess: t("bulk_deactivate_success", "Selected department records deactivated successfully."),
    bulkDeleteSuccess: t("bulk_delete_success", "Selected department records deleted successfully."),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title", "Bulk Activate Departments"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title", "Bulk Deactivate Departments"),
    confirmBulkDeleteTitle: t("confirm_bulk_delete_title", "Bulk Delete Departments"),
    confirmDeleteTitle: t("confirm_delete_title", "Delete Department"),
    confirmActivateTitle: t("confirm_activate_title", "Activate Department"),
    confirmDeactivateTitle: t("confirm_deactivate_title", "Deactivate Department"),
    confirmBulkActivateLabel: t("confirm_bulk_activate_label", "Bulk Activate"),
    confirmBulkDeactivateLabel: t("confirm_bulk_deactivate_label", "Bulk Deactivate"),
    confirmBulkDeleteLabel: t("confirm_bulk_delete_label", "Bulk Delete"),
    confirmActivateLabel: t("confirm_activate_label", "Activate"),
    confirmDeactivateLabel: t("confirm_deactivate_label", "Deactivate"),
    confirmDeleteLabel: t("confirm_delete_label", "Delete"),
    confirmButton: t("confirm_button", "Confirm"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message", "Are you sure you want to mark {count} selected department record(s) as active?"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message", "Are you sure you want to mark {count} selected department record(s) as inactive?"),
    confirmBulkDeleteMessage: t("confirm_bulk_delete_message", "Are you sure you want to delete {count} selected department record(s)?"),
    confirmDeleteMessage: t("confirm_delete_message", "Are you sure you want to delete this department record?"),
    confirmActivateMessage: t("confirm_activate_message", "Are you sure you want to mark this department as active?"),
    confirmDeactivateMessage: t("confirm_deactivate_message", "Are you sure you want to mark this department as inactive?"),
    fieldName: t("field_name", dicConstant.departments.fields.name),
    fieldCode: t("field_code", dicConstant.departments.fields.code),
    fieldEmployees: t("field_employees", "Employees"),
    fieldIsActive: t("field_is_active", "Is Active"),
    saving: t("saving", "Saving..."),
    validationNameRequired: t("validation_name_required", dicConstant.departments.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.departments.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.departments.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.departments.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.departments.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.departments.validation.nameDuplicate),
  };

  async function loadDepartments() {
    // Every mutation reloads from the backend so the grid stays aligned with the persisted DB state.
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getDepartments();
      setLstDepartments(objResult.Data.map(mapDepartmentRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments().catch(() => undefined);
  }, []);

  // Search is applied explicitly so typing in the filters does not re-query/re-page the grid on every keypress.
  const lstFilteredDepartments = useMemo(() => lstDepartments.filter((dicDepartment) => {
    const blnCodeMatch = !dicSearchApplied.code || dicDepartment.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicDepartment.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicDepartment.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstDepartments]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredDepartments.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleDepartments = lstFilteredDepartments.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleDepartments.length > 0 && lstVisibleDepartments.every((dicDepartment) => lstSelectedIds.includes(dicDepartment.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleDepartments.some((dicDepartment) => dicDepartment.id === strId));

  function openDialog(strNextMode: DepartmentMode, dicDepartment?: DepartmentRecord) {
    // Reuses one dialog for add, edit, and read-only view modes.
    setStrMode(strNextMode);
    setStrEditingDepartmentId(dicDepartment?.id ?? "");
    setDicErrors({});
    setDicForm(dicDepartment ? {
      code: dicDepartment.code,
      name: dicDepartment.name,
      status: dicDepartment.status
    } : dicEmptyForm);
    setBlnDialogOpen(true);
  }

  function closeDialog() {
    // Closes the form dialog without mutating persisted data.
    setBlnDialogOpen(false);
  }

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    // Central success/error feedback for save, delete, bulk actions, and failures.
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    // Hides the current toast while preserving the previous message for the next open cycle.
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    // Stores the action callback so the same compact dialog can confirm different operations.
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    // Clears the pending confirmation action.
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    // Bulk actions, row toggles, deletes, and resets all flow through one compact confirmation dialog.
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
    // Frontend validation mirrors the backend uniqueness/shape rules to fail fast before submit.
    const dicNextErrors: Partial<Record<keyof DepartmentForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicDepartmentLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicDepartmentLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicDepartmentLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9-]{2,20}$/.test(strCode)) {
      dicNextErrors.code = dicDepartmentLabels.validationCodeFormat;
    }

    if (lstDepartments.some((dicDepartment) => dicDepartment.code.toUpperCase() === strCode && dicDepartment.id !== strEditingDepartmentId)) {
      dicNextErrors.code = dicDepartmentLabels.validationCodeDuplicate;
    }

    if (lstDepartments.some((dicDepartment) => dicDepartment.name.trim().toLowerCase() === strName.toLowerCase() && dicDepartment.id !== strEditingDepartmentId)) {
      dicNextErrors.name = dicDepartmentLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveDepartment() {
    // Decides between create and update based on the current dialog mode.
    if (!validateForm()) {
      return;
    }
    // The backend owns tenant/company scoping; the form only sends editable department fields.
    const objBody = {
      strDepartmentCode: dicForm.code.trim().toUpperCase(),
      strDepartmentName: dicForm.name.trim(),
      strManagerName: "",
      blnIsActive: dicForm.status === "Active"
    };

    const objRequest = strMode === "add"
      ? masterApiService.createDepartment(objBody)
      : masterApiService.updateDepartment(Number(strEditingDepartmentId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadDepartments())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicDepartmentLabels.saveSuccess : dicDepartmentLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDepartmentLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strDepartmentId: string) {
    // Adds or removes a single row from the bulk-action selection set.
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strDepartmentId)
      ? lstPrevious.filter((strId) => strId !== strDepartmentId)
      : [...lstPrevious, strDepartmentId]);
  }

  function toggleSelectAll() {
    // Selects only the rows visible on the current page so pagination remains predictable.
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleDepartments.some((dicDepartment) => dicDepartment.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleDepartments.map((dicDepartment) => dicDepartment.id)])]);
  }

  function bulkUpdateStatus(strStatus: DepartmentStatus) {
    // Confirms and applies the same active/inactive state to all selected rows.
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicDepartmentLabels.confirmBulkActivateTitle : dicDepartmentLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicDepartmentLabels.confirmBulkActivateMessage : dicDepartmentLabels.confirmBulkDeactivateMessage).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? dicDepartmentLabels.confirmBulkActivateLabel : dicDepartmentLabels.confirmBulkDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadDepartments();
        showToast(strStatus === "Active" ? dicDepartmentLabels.bulkActivateSuccess : dicDepartmentLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    // Confirms and deletes all currently selected department rows.
    openConfirmDialog({
      strTitle: dicDepartmentLabels.confirmBulkDeleteTitle,
      strMessage: dicDepartmentLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicDepartmentLabels.confirmBulkDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentDelete(lstSelectedIds.map(Number));
        await loadDepartments();
        showToast(dicDepartmentLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteDepartment(strDepartmentId: string) {
    // Deletes a single department by routing through the same bulk-delete backend endpoint.
    openConfirmDialog({
      strTitle: dicDepartmentLabels.confirmDeleteTitle,
      strMessage: dicDepartmentLabels.confirmDeleteMessage,
      strConfirmLabel: dicDepartmentLabels.confirmDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentDelete([Number(strDepartmentId)]);
        await loadDepartments();
        showToast(dicDepartmentLabels.deleteSuccess);
      }
    });
  }

  function toggleDepartmentStatus(strDepartmentId: string) {
    // Flips one row between Active and Inactive through the shared bulk-status API.
    const objDepartment = lstDepartments.find((dicItem) => dicItem.id === strDepartmentId);
    if (!objDepartment) {
      return;
    }
    const strNextStatus = objDepartment.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicDepartmentLabels.confirmActivateTitle : dicDepartmentLabels.confirmDeactivateTitle,
      strMessage: strNextStatus === "Active" ? dicDepartmentLabels.confirmActivateMessage : dicDepartmentLabels.confirmDeactivateMessage,
      strConfirmLabel: strNextStatus === "Active" ? dicDepartmentLabels.confirmActivateLabel : dicDepartmentLabels.confirmDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentStatus([Number(strDepartmentId)], strNextStatus === "Active");
        await loadDepartments();
        showToast(strNextStatus === "Active" ? dicDepartmentLabels.activateSuccess : dicDepartmentLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Typography className={styles.breadcrumbs}>{dicDepartmentLabels.breadcrumbs}</Typography>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicDepartmentLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{dicDepartmentLabels.pageTitle}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicDepartmentLabels.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicDepartmentLabels.exportTitle, lstFilteredDepartments)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicDepartmentLabels.exportFileName, lstFilteredDepartments)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button>
          </Box>
        </Box>

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDepartmentLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDepartmentLabels.searchCodePlaceholder} fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">{dicDepartmentLabels.searchStatusPlaceholder}</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{dicDepartmentLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicDepartmentLabels.bulkRowsSelected}`}</Typography>
            <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicDepartmentLabels.bulkActivate}</Button>
            <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicDepartmentLabels.bulkDeactivate}</Button>
            <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicDepartmentLabels.bulkDelete}</Button>
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        {!blnLoading && lstFilteredDepartments.length > 0 ? (
          <Box className={styles.paginationBar}>
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredDepartments.length)} {dicCommonLabels.paginationSeparator} {lstFilteredDepartments.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicDepartmentLabels.loadingDepartments}</Typography>
          </Box>
        ) : (
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                <th>{dicDepartmentLabels.tableName}</th>
                <th>{dicDepartmentLabels.tableCode}</th>
                <th>{dicDepartmentLabels.tableStatus}</th>
                <th>{dicDepartmentLabels.tableEmployees}</th>
                <th>{dicDepartmentLabels.tableActions}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredDepartments.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={6}>{dicDepartmentLabels.emptyMessage}</td></tr>
              ) : lstVisibleDepartments.map((dicDepartment) => {
                const blnSelected = lstSelectedIds.includes(dicDepartment.id);
                return (
                  <tr key={dicDepartment.id} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicDepartment.id)} /></td>
                    <td>{dicDepartment.name}</td>
                    <td>{dicDepartment.code}</td>
                    <td><span className={`${styles.statusPill} ${dicDepartment.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicDepartment.status}</span></td>
                    <td>{dicDepartment.employeeCount}</td>
                    <td>
                      <Box className={styles.actionCell}>
                        <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicDepartment)}><VisibilityOutlinedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicDepartment)}><EditOutlinedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteDepartment(dicDepartment.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleDepartmentStatus(dicDepartment.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
                      </Box>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
        )}
      </Box>

      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ className: styles.compactDialogPaper }}>
        <DialogTitle>{strMode === "add" ? dicDepartmentLabels.dialogAddTitle : strMode === "edit" ? dicDepartmentLabels.dialogEditTitle : dicDepartmentLabels.dialogViewTitle}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={`${dicDepartmentLabels.fieldName} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value })); }} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth />
            <TextField label={`${dicDepartmentLabels.fieldCode} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() })); }} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth />
            <TextField label={dicDepartmentLabels.fieldEmployees} value={strMode === "add" ? "0" : lstDepartments.find((dicDepartment) => dicDepartment.id === strEditingDepartmentId)?.employeeCount ?? 0} disabled fullWidth />
            <Box className={styles.switchRow}>
              <Typography className={styles.switchLabel}>{dicDepartmentLabels.fieldIsActive}</Typography>
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
              <Button className={styles.primaryButton} onClick={saveDepartment} disabled={blnSubmitting}>
                {blnSubmitting ? dicDepartmentLabels.saving : dicCommonLabels.save}
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
            {objConfirmDialog?.strConfirmLabel ?? dicDepartmentLabels.confirmButton}
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
