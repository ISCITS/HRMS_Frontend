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
import dicConstant from "@/constants/Constant.json";
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
const lstRowsPerPageOptions = [5, 10, 20];

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
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

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
      showToast(objError instanceof Error ? objError.message : "Request failed.", "error");
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
      dicNextErrors.name = dicConstant.designations.validation.nameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicConstant.designations.validation.nameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicConstant.designations.validation.codeRequired;
    } else if (!/^[A-Z0-9/& _-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicConstant.designations.validation.codeFormat;
    }

    if (lstDesignations.some((dicDesignation) => dicDesignation.code.toUpperCase() === strCode && dicDesignation.id !== strEditingDesignationId)) {
      dicNextErrors.code = dicConstant.designations.validation.codeDuplicate;
    }

    if (lstDesignations.some((dicDesignation) => dicDesignation.name.trim().toLowerCase() === strName.toLowerCase() && dicDesignation.id !== strEditingDesignationId)) {
      dicNextErrors.name = dicConstant.designations.validation.nameDuplicate;
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
        showToast(strMode === "add" ? "Designation saved successfully." : "Designation updated successfully.");
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error"));
    objRequest.finally(() => setBlnSubmitting(false));
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
      strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Designations`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected designation record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadDesignations();
        showToast(strStatus === "Active" ? "Selected designation records activated successfully." : "Selected designation records deactivated successfully.");
      }
    });
  }

  function bulkDelete() {
    // Confirms and deletes the currently selected designation rows.
    openConfirmDialog({
      strTitle: "Bulk Delete Designations",
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected designation record(s)?`,
      strConfirmLabel: "Bulk Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationDelete(lstSelectedIds.map(Number));
        await loadDesignations();
        showToast("Selected designation records deleted successfully.");
      }
    });
  }

  function deleteDesignation(strDesignationId: string) {
    // Deletes a single row by reusing the same backend bulk-delete endpoint.
    openConfirmDialog({
      strTitle: "Delete Designation",
      strMessage: "Are you sure you want to delete this designation record?",
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationDelete([Number(strDesignationId)]);
        await loadDesignations();
        showToast("Designation deleted successfully.");
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
      strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} Designation`,
      strMessage: `Are you sure you want to mark this designation as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationStatus([Number(strDesignationId)], strNextStatus === "Active");
        await loadDesignations();
        showToast(strNextStatus === "Active" ? "Designation activated successfully." : "Designation deactivated successfully.");
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Typography className={styles.breadcrumbs}>Admin / Master / Designations</Typography>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicConstant.designations.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{dicConstant.designations.pageTitle}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicConstant.designations.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Designation Master", lstFilteredDesignations)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportPdf}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("designation-master.xls", lstFilteredDesignations)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportExcel}</Button>
          </Box>
        </Box>

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder="Search Designation Name" fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder="Search Designation Code" fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">Status</MenuItem>
            <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicConstant.common.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicConstant.common.clear}</Button></Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>Applying changes...</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} row(s) selected</Typography>
            <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>Bulk Activate</Button>
            <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>Bulk Deactivate</Button>
            <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>Bulk Delete</Button>
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        {!blnLoading && lstFilteredDesignations.length > 0 ? (
          <Box className={styles.paginationBar}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{dicConstant.common.rowsPerPage}</Typography>
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredDesignations.length)} {dicConstant.common.paginationSeparator} {lstFilteredDesignations.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>Loading designations...</Typography>
          </Box>
        ) : (
        // The table wrapper is the only scrolling region so the master header stays stable on screen.
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                <th>Designation Name</th>
                <th>Designation Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredDesignations.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={5}>No designation records found.</td></tr>
              ) : lstVisibleDesignations.map((dicDesignation) => {
                const blnSelected = lstSelectedIds.includes(dicDesignation.id);
                return (
                  <tr key={dicDesignation.id} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicDesignation.id)} /></td>
                    <td>{dicDesignation.name}</td>
                    <td>{dicDesignation.code}</td>
                    <td><span className={`${styles.statusPill} ${dicDesignation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicDesignation.status}</span></td>
                    <td>
                      <Box className={styles.actionCell}>
                        <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicDesignation)}><VisibilityOutlinedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicDesignation)}><EditOutlinedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteDesignation(dicDesignation.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button>
                        <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleDesignationStatus(dicDesignation.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
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

      <Dialog open={blnDialogOpen} onClose={closeDialog} PaperProps={{ className: styles.dialogPaper }}>
        <DialogTitle className={styles.dialogTitle}>{strMode === "add" ? dicConstant.designations.dialogAddTitle : strMode === "edit" ? dicConstant.designations.dialogEditTitle : "View Designation"}</DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <Typography className={styles.sectionBar}>Basic Information</Typography>
          <Box className={styles.dialogGrid}>
            <TextField label={`${dicConstant.designations.fields.name} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value })); }} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth />
            <TextField label={`${dicConstant.designations.fields.code} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() })); }} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth />
          </Box>

          <Typography className={styles.sectionBar}>Record Status</Typography>
          <Box className={styles.switchRow}>
            <Switch checked={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
            <Typography className={styles.switchLabel}>{dicForm.status}</Typography>
          </Box>
        </DialogContent>
        <Box className={styles.dialogFooter}>
          {strMode === "view" ? (
            <Button className={styles.textAction} onClick={closeDialog}>{dicConstant.common.close}</Button>
          ) : (
            <>
              <Button
                className={styles.textAction}
                onClick={() => openConfirmDialog({
                  strTitle: "Reset Form",
                  strMessage: "Are you sure you want to reset this form?",
                  strConfirmLabel: "Reset",
                  fnOnConfirm: async () => {
                    setDicErrors({});
                    setDicForm(dicEmptyForm);
                    showToast("Designation form reset successfully.");
                  }
                })}
              >
                {dicConstant.common.reset}
              </Button>
              <Button className={styles.textAction} onClick={closeDialog}>{dicConstant.common.cancel}</Button>
              <Button className={styles.primaryButton} onClick={saveDesignation} disabled={blnSubmitting}>
                {blnSubmitting ? "Saving..." : dicConstant.common.save}
              </Button>
            </>
          )}
        </Box>
      </Dialog>

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button className={styles.textAction} onClick={closeConfirmDialog}>Cancel</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
