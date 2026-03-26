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
import { BankApiRecord, masterApiService } from "@/services/master/MasterApiService";

type BankStatus = "Active" | "Inactive";
type BankMode = "add" | "edit" | "view";

type BankRecord = {
  id: string;
  code: string;
  name: string;
  status: BankStatus;
};

type BankForm = {
  code: string;
  name: string;
  status: BankStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | BankStatus;
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

const dicEmptyForm: BankForm = { code: "", name: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [5, 10, 20];

function mapBankRecord(dicRecord: BankApiRecord): BankRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strBankCode,
    name: dicRecord.strBankName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

function downloadCsv(strFileName: string, lstRows: BankRecord[]) {
  const lstHeaders = ["Bank Name", "Bank Code", "Status"];
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

function exportPdf(strTitle: string, lstRows: BankRecord[]) {
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
              <th>Bank Name</th>
              <th>Bank Code</th>
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

export default function BankMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("bank");
  const [lstBanks, setLstBanks] = useState<BankRecord[]>([]);
  const [strMode, setStrMode] = useState<BankMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingBankId, setStrEditingBankId] = useState("");
  const [dicForm, setDicForm] = useState<BankForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof BankForm, string>>>({});
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
    delete: t("delete", "Delete"),
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
  const dicBankLabels = {
    breadcrumbs: t("breadcrumbs", "Admin / Master / Banks"),
    pageTitle: t("page_title", dicConstant.banks.pageTitle),
    backButton: t("back_button", dicConstant.banks.backButton),
    addButton: t("add_button", dicConstant.banks.addButton),
    dialogAddTitle: t("dialog_add_title", dicConstant.banks.dialogAddTitle),
    dialogEditTitle: t("dialog_edit_title", dicConstant.banks.dialogEditTitle),
    dialogViewTitle: t("dialog_view_title", "View Bank"),
    exportTitle: t("export_title", "Bank Master"),
    exportFileName: t("export_file_name", "bank-master.xls"),
    searchNamePlaceholder: t("search_name_placeholder", "Search Bank Name"),
    searchCodePlaceholder: t("search_code_placeholder", "Search Bank Code"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    loadingRecords: t("loading_records", "Loading banks..."),
    emptyMessage: t("empty_message", "No bank records found."),
    bulkRowsSelected: t("bulk_rows_selected", "row(s) selected"),
    bulkActivate: t("bulk_activate", "Bulk Activate"),
    bulkDeactivate: t("bulk_deactivate", "Bulk Deactivate"),
    bulkDelete: t("bulk_delete", "Bulk Delete"),
    tableName: t("table_name", "Bank Name"),
    tableCode: t("table_code", "Bank Code"),
    tableStatus: t("table_status", "Status"),
    tableActions: t("table_actions", "Actions"),
    fieldName: t("field_name", dicConstant.banks.fields.name),
    fieldCode: t("field_code", dicConstant.banks.fields.code),
    fieldStatus: t("field_status", dicConstant.banks.fields.status),
    saveSuccess: t("save_success", "Bank saved successfully."),
    updateSuccess: t("update_success", "Bank updated successfully."),
    deleteSuccess: t("delete_success", "Bank deleted successfully."),
    activateSuccess: t("activate_success", "Bank activated successfully."),
    deactivateSuccess: t("deactivate_success", "Bank deactivated successfully."),
    bulkActivateSuccess: t("bulk_activate_success", "Selected bank records activated successfully."),
    bulkDeactivateSuccess: t("bulk_deactivate_success", "Selected bank records deactivated successfully."),
    bulkDeleteSuccess: t("bulk_delete_success", "Selected bank records deleted successfully."),
    requestFailed: t("request_failed", "Request failed."),
    validationNameRequired: t("validation_name_required", dicConstant.banks.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.banks.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.banks.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.banks.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.banks.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.banks.validation.nameDuplicate),
  };

  async function loadBanks() {
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getBanks();
      setLstBanks(objResult.Data.map(mapBankRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadBanks().catch(() => undefined);
  }, []);

  const lstFilteredBanks = useMemo(() => lstBanks.filter((dicBank) => {
    const blnCodeMatch = !dicSearchApplied.code || dicBank.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicBank.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicBank.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstBanks]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredBanks.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleBanks = lstFilteredBanks.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleBanks.length > 0 && lstVisibleBanks.every((dicBank) => lstSelectedIds.includes(dicBank.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strID) => lstVisibleBanks.some((dicBank) => dicBank.id === strID));

  function openDialog(strNextMode: BankMode, dicBank?: BankRecord) {
    setStrMode(strNextMode);
    setStrEditingBankId(dicBank?.id ?? "");
    setDicErrors({});
    setDicForm(dicBank ? { code: dicBank.code, name: dicBank.name, status: dicBank.status } : dicEmptyForm);
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
      showToast(objError instanceof Error ? objError.message : dicBankLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof BankForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicBankLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicBankLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicBankLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicBankLabels.validationCodeFormat;
    }

    if (lstBanks.some((dicBank) => dicBank.code.toUpperCase() === strCode && dicBank.id !== strEditingBankId)) {
      dicNextErrors.code = dicBankLabels.validationCodeDuplicate;
    }

    if (lstBanks.some((dicBank) => dicBank.name.trim().toLowerCase() === strName.toLowerCase() && dicBank.id !== strEditingBankId)) {
      dicNextErrors.name = dicBankLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveBank() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strBankCode: dicForm.code.trim().toUpperCase(),
      strBankName: dicForm.name.trim(),
      blnIsActive: dicForm.status === "Active"
    };
    const objRequest = strMode === "add"
      ? masterApiService.createBank(objBody)
      : masterApiService.updateBank(Number(strEditingBankId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadBanks())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicBankLabels.saveSuccess : dicBankLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicBankLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strBankId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strBankId)
      ? lstPrevious.filter((strID) => strID !== strBankId)
      : [...lstPrevious, strBankId]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strID) => !lstVisibleBanks.some((dicBank) => dicBank.id === strID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleBanks.map((dicBank) => dicBank.id)])]);
  }

  function bulkUpdateStatus(strStatus: BankStatus) {
    openConfirmDialog({
      strTitle: `${strStatus === "Active" ? dicBankLabels.bulkActivate : dicBankLabels.bulkDeactivate} ${dicBankLabels.pageTitle.replace(/ Master$/,"")}`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected bank record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? dicBankLabels.bulkActivate : dicBankLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadBanks();
        showToast(strStatus === "Active" ? dicBankLabels.bulkActivateSuccess : dicBankLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: `${dicBankLabels.bulkDelete} ${dicBankLabels.pageTitle.replace(/ Master$/,"")}`,
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected bank record(s)?`,
      strConfirmLabel: dicBankLabels.bulkDelete,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankDelete(lstSelectedIds.map(Number));
        await loadBanks();
        showToast(dicBankLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteBank(strBankId: string) {
    openConfirmDialog({
      strTitle: `${dicCommonLabels.delete} ${dicBankLabels.pageTitle.replace(/ Master$/,"")}`,
      strMessage: t("confirm_delete_message", "Are you sure you want to delete this bank record?"),
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankDelete([Number(strBankId)]);
        await loadBanks();
        showToast(dicBankLabels.deleteSuccess);
      }
    });
  }

  function toggleBankStatus(strBankId: string) {
    const objBank = lstBanks.find((dicItem) => dicItem.id === strBankId);
    if (!objBank) {
      return;
    }
    const strNextStatus = objBank.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: `${strNextStatus === "Active" ? t("activate", "Activate") : t("deactivate", "Deactivate")} ${dicBankLabels.pageTitle.replace(/ Master$/,"")}`,
      strMessage: `Are you sure you want to mark this bank as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? t("activate", "Activate") : t("deactivate", "Deactivate"),
      fnOnConfirm: async () => {
        await masterApiService.bulkBankStatus([Number(strBankId)], strNextStatus === "Active");
        await loadBanks();
        showToast(strNextStatus === "Active" ? dicBankLabels.activateSuccess : dicBankLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicBankLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicBankLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicBankLabels.searchCodePlaceholder} fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">{dicBankLabels.searchStatusPlaceholder}</MenuItem>
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
          <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicBankLabels.bulkRowsSelected}</Typography>
          <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicBankLabels.bulkActivate}</Button>
          <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicBankLabels.bulkDeactivate}</Button>
          <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicBankLabels.bulkDelete}</Button>
        </Box>
      ) : null}

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicBankLabels.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicBankLabels.exportFileName, lstFilteredBanks)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicBankLabels.exportTitle, lstFilteredBanks)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button>
          </Box>

          {!blnLoading && lstFilteredBanks.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredBanks.length)} {dicCommonLabels.paginationSeparator} {lstFilteredBanks.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicBankLabels.loadingRecords}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicBankLabels.tableActions}</th>
                  <th>{dicBankLabels.tableName}</th>
                  <th>{dicBankLabels.tableCode}</th>
                  <th>{dicBankLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredBanks.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={5}>{dicBankLabels.emptyMessage}</td></tr>
                ) : lstVisibleBanks.map((dicBank) => {
                  const blnSelected = lstSelectedIds.includes(dicBank.id);
                  return (
                    <tr key={dicBank.id} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicBank.id)} /></td>
                      <td>
                        <Box className={styles.actionCell}>
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicBank)}><VisibilityOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicBank)}><EditOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteBank(dicBank.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleBankStatus(dicBank.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
                        </Box>
                      </td>
                      <td>{dicBank.name}</td>
                      <td>{dicBank.code}</td>
                      <td><span className={`${styles.statusPill} ${dicBank.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicBank.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ className: styles.compactDialogPaper }}>
         <DialogTitle>{strMode === "add" ? dicBankLabels.dialogAddTitle : strMode === "edit" ? dicBankLabels.dialogEditTitle : dicBankLabels.dialogViewTitle}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
             <TextField label={dicBankLabels.fieldCode} value={dicForm.code} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth disabled={strMode === "view"} />
             <TextField label={dicBankLabels.fieldName} value={dicForm.name} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth disabled={strMode === "view"} />
            <TextField
               label={dicBankLabels.fieldStatus}
              select
              value={dicForm.status}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as BankStatus }))}
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
             <Button className={styles.primaryButton} onClick={saveBank} disabled={blnSubmitting}>
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
