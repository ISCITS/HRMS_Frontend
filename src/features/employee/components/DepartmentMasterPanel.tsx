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
      dicNextErrors.name = dicConstant.departments.validation.nameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicConstant.departments.validation.nameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicConstant.departments.validation.codeRequired;
    } else if (!/^[A-Z0-9-]{2,20}$/.test(strCode)) {
      dicNextErrors.code = dicConstant.departments.validation.codeFormat;
    }

    if (lstDepartments.some((dicDepartment) => dicDepartment.code.toUpperCase() === strCode && dicDepartment.id !== strEditingDepartmentId)) {
      dicNextErrors.code = dicConstant.departments.validation.codeDuplicate;
    }

    if (lstDepartments.some((dicDepartment) => dicDepartment.name.trim().toLowerCase() === strName.toLowerCase() && dicDepartment.id !== strEditingDepartmentId)) {
      dicNextErrors.name = dicConstant.departments.validation.nameDuplicate;
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
        showToast(strMode === "add" ? "Department saved successfully." : "Department updated successfully.");
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error"))
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
      strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Departments`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected department record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadDepartments();
        showToast(strStatus === "Active" ? "Selected department records activated successfully." : "Selected department records deactivated successfully.");
      }
    });
  }

  function bulkDelete() {
    // Confirms and deletes all currently selected department rows.
    openConfirmDialog({
      strTitle: "Bulk Delete Departments",
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected department record(s)?`,
      strConfirmLabel: "Bulk Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentDelete(lstSelectedIds.map(Number));
        await loadDepartments();
        showToast("Selected department records deleted successfully.");
      }
    });
  }

  function deleteDepartment(strDepartmentId: string) {
    // Deletes a single department by routing through the same bulk-delete backend endpoint.
    openConfirmDialog({
      strTitle: "Delete Department",
      strMessage: "Are you sure you want to delete this department record?",
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentDelete([Number(strDepartmentId)]);
        await loadDepartments();
        showToast("Department deleted successfully.");
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
      strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} Department`,
      strMessage: `Are you sure you want to mark this department as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentStatus([Number(strDepartmentId)], strNextStatus === "Active");
        await loadDepartments();
        showToast(strNextStatus === "Active" ? "Department activated successfully." : "Department deactivated successfully.");
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Typography className={styles.breadcrumbs}>Admin / Master / Departments</Typography>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicConstant.departments.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{dicConstant.departments.pageTitle}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicConstant.departments.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Department Master", lstFilteredDepartments)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportPdf}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("department-master.xls", lstFilteredDepartments)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportExcel}</Button>
          </Box>
        </Box>

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder="Search Department Name" fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder="Search Department Code" fullWidth />
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
        {!blnLoading && lstFilteredDepartments.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredDepartments.length)} {dicConstant.common.paginationSeparator} {lstFilteredDepartments.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>Loading departments...</Typography>
          </Box>
        ) : (
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                <th>Department Name</th>
                <th>Department Code</th>
                <th>Status</th>
                <th>Employees</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredDepartments.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={6}>No department records found.</td></tr>
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
        <DialogTitle>{strMode === "add" ? dicConstant.departments.dialogAddTitle : strMode === "edit" ? dicConstant.departments.dialogEditTitle : "View Department"}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={`${dicConstant.departments.fields.name} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value })); }} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth />
            <TextField label={`${dicConstant.departments.fields.code} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() })); }} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth />
            <TextField label="Employees" value={strMode === "add" ? "0" : lstDepartments.find((dicDepartment) => dicDepartment.id === strEditingDepartmentId)?.employeeCount ?? 0} disabled fullWidth />
            <Box className={styles.switchRow}>
              <Typography className={styles.switchLabel}>Is Active</Typography>
              <Switch checked={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {strMode === "view" ? (
            <Button className={styles.secondaryButton} onClick={closeDialog}>{dicConstant.common.close}</Button>
          ) : (
            <>
              <Button className={styles.secondaryButton} onClick={closeDialog}>{dicConstant.common.cancel}</Button>
              <Button className={styles.primaryButton} onClick={saveDepartment} disabled={blnSubmitting}>
                {blnSubmitting ? "Saving..." : dicConstant.common.save}
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
          <Button className={styles.textAction} onClick={closeConfirmDialog}>Cancel</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? "Loading..." : "Processing..."} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
