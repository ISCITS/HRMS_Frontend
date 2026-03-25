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
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
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
const lstRowsPerPageOptions = [5, 10, 20];

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
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const dicCommonLabels = {
    cancel: t("cancel", dicConstant.common.cancel),
    clear: t("clear", dicConstant.common.clear),
    exportExcel: t("export_excel", dicConstant.common.exportExcel),
    exportPdf: t("export_pdf", dicConstant.common.exportPdf),
    save: t("save", dicConstant.common.save),
    search: t("search", dicConstant.common.search),
    update: t("update", dicConstant.common.update),
    statusActive: t("status_active", dicConstant.common.statusActive),
    statusInactive: t("status_inactive", dicConstant.common.statusInactive),
    rowsPerPage: t("rows_per_page", dicConstant.common.rowsPerPage),
    paginationSeparator: t("pagination_separator", dicConstant.common.paginationSeparator),
    loading: t("loading", "Loading..."),
    processing: t("processing", "Processing..."),
  };
  const dicModuleLabels = {
    breadcrumbs: t("breadcrumbs", "Admin / Master / Cost Centers"),
    pageTitle: t("page_title", dicConstant.costCenters.pageTitle),
    backButton: t("back_button", dicConstant.costCenters.backButton),
    addButton: t("add_button", dicConstant.costCenters.addButton),
    dialogAddTitle: t("dialog_add_title", dicConstant.costCenters.dialogAddTitle),
    dialogEditTitle: t("dialog_edit_title", dicConstant.costCenters.dialogEditTitle),
    dialogViewTitle: t("dialog_view_title", "View Cost Center"),
    exportTitle: t("export_title", "Cost Center Master"),
    exportFileName: t("export_file_name", "cost-center-master.xls"),
    searchNamePlaceholder: t("search_name_placeholder", "Search Cost Center Name"),
    searchCodePlaceholder: t("search_code_placeholder", "Search Cost Center Code"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    loadingRecords: t("loading_records", "Loading cost centers..."),
    emptyMessage: t("empty_message", "No cost center records found."),
    bulkRowsSelected: t("bulk_rows_selected", "row(s) selected"),
    bulkActivate: t("bulk_activate", "Bulk Activate"),
    bulkDeactivate: t("bulk_deactivate", "Bulk Deactivate"),
    bulkDelete: t("bulk_delete", "Bulk Delete"),
    tableName: t("table_name", "Cost Center Name"),
    tableCode: t("table_code", "Cost Center Code"),
    tableStatus: t("table_status", "Status"),
    tableActions: t("table_actions", "Actions"),
    fieldName: t("field_name", dicConstant.costCenters.fields.name),
    fieldCode: t("field_code", dicConstant.costCenters.fields.code),
    fieldStatus: t("field_status", dicConstant.costCenters.fields.status),
    saveSuccess: t("save_success", "Cost Center saved successfully."),
    updateSuccess: t("update_success", "Cost Center updated successfully."),
    requestFailed: t("request_failed", "Request failed."),
  };

  async function loadCostCenters() {
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
    loadCostCenters().catch(() => undefined);
  }, []);

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
      strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Cost Centers`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected cost center record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadCostCenters();
        showToast(strStatus === "Active" ? "Selected cost center records activated successfully." : "Selected cost center records deactivated successfully.");
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: "Bulk Delete Cost Centers",
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected cost center record(s)?`,
      strConfirmLabel: "Bulk Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterDelete(lstSelectedIds.map(Number));
        await loadCostCenters();
        showToast("Selected cost center records deleted successfully.");
      }
    });
  }

  function deleteCostCenter(strCostCenterId: string) {
    openConfirmDialog({
      strTitle: "Delete Cost Center",
      strMessage: "Are you sure you want to delete this cost center record?",
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterDelete([Number(strCostCenterId)]);
        await loadCostCenters();
        showToast("Cost Center deleted successfully.");
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
      strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} Cost Center`,
      strMessage: `Are you sure you want to mark this cost center as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkCostCenterStatus([Number(strCostCenterId)], strNextStatus === "Active");
        await loadCostCenters();
        showToast(strNextStatus === "Active" ? "Cost Center activated successfully." : "Cost Center deactivated successfully.");
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Typography className={styles.breadcrumbs}>{dicModuleLabels.breadcrumbs}</Typography>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{dicModuleLabels.pageTitle}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicModuleLabels.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.exportTitle, lstFilteredCostCenters)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicModuleLabels.exportFileName, lstFilteredCostCenters)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button>
          </Box>
        </Box>

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">{dicModuleLabels.searchStatusPlaceholder}</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      {blnSubmitting ? (
        <Box className={styles.bulkBar}>
          <CircularProgress size={20} />
          <Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography>
        </Box>
      ) : lstSelectedIds.length > 0 ? (
        <Box className={styles.bulkBar}>
          <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
          <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicModuleLabels.bulkActivate}</Button>
          <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicModuleLabels.bulkDeactivate}</Button>
          <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicModuleLabels.bulkDelete}</Button>
        </Box>
      ) : null}

      <Box className={styles.tableCard}>
        {!blnLoading && lstFilteredCostCenters.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredCostCenters.length)} {dicCommonLabels.paginationSeparator} {lstFilteredCostCenters.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicModuleLabels.tableName}</th>
                  <th>{dicModuleLabels.tableCode}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                  <th>{dicModuleLabels.tableActions}</th>
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
                      <td>{dicCostCenter.name}</td>
                      <td>{dicCostCenter.code}</td>
                      <td><span className={`${styles.statusPill} ${dicCostCenter.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicCostCenter.status}</span></td>
                      <td>
                        <Box className={styles.actionCell}>
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicCostCenter)}><VisibilityOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicCostCenter)}><EditOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteCostCenter(dicCostCenter.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleCostCenterStatus(dicCostCenter.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
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
        <DialogTitle>{strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={dicModuleLabels.fieldCode} value={dicForm.code} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth disabled={strMode === "view"} />
            <TextField label={dicModuleLabels.fieldName} value={dicForm.name} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth disabled={strMode === "view"} />
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
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? t("close", "Close") : dicCommonLabels.cancel}</Button>
          {strMode !== "view" ? (
            <Button className={styles.primaryButton} onClick={saveCostCenter} disabled={blnSubmitting}>
              {blnSubmitting ? t("saving", "Saving...") : strMode === "add" ? dicCommonLabels.save : dicCommonLabels.update}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button className={styles.textAction} onClick={closeConfirmDialog} disabled={blnSubmitting}>{dicCommonLabels.cancel}</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {blnSubmitting ? dicCommonLabels.processing : objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
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
