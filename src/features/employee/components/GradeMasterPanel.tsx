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
import { GradeApiRecord, masterApiService } from "@/services/master/MasterApiService";

type GradeStatus = "Active" | "Inactive";
type GradeMode = "add" | "edit" | "view";

type GradeRecord = {
  id: string;
  code: string;
  name: string;
  status: GradeStatus;
};

type GradeForm = {
  code: string;
  name: string;
  status: GradeStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | GradeStatus;
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

const dicEmptyForm: GradeForm = { code: "", name: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [5, 10, 20];

function mapGradeRecord(dicRecord: GradeApiRecord): GradeRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strGradeCode,
    name: dicRecord.strGradeName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

function downloadCsv(strFileName: string, lstRows: GradeRecord[]) {
  const lstHeaders = ["Grade Name", "Grade Code", "Status"];
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

function exportPdf(strTitle: string, lstRows: GradeRecord[]) {
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
              <th>Grade Name</th>
              <th>Grade Code</th>
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

export default function GradeMasterPanel() {
  const objRouter = useRouter();
  const [lstGrades, setLstGrades] = useState<GradeRecord[]>([]);
  const [strMode, setStrMode] = useState<GradeMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingGradeId, setStrEditingGradeId] = useState("");
  const [dicForm, setDicForm] = useState<GradeForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof GradeForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadGrades() {
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getGrades();
      setLstGrades(objResult.Data.map(mapGradeRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadGrades().catch(() => undefined);
  }, []);

  const lstFilteredGrades = useMemo(() => lstGrades.filter((dicGrade) => {
    const blnCodeMatch = !dicSearchApplied.code || dicGrade.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicGrade.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicGrade.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstGrades]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredGrades.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleGrades = lstFilteredGrades.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleGrades.length > 0 && lstVisibleGrades.every((dicGrade) => lstSelectedIds.includes(dicGrade.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleGrades.some((dicGrade) => dicGrade.id === strId));

  function openDialog(strNextMode: GradeMode, dicGrade?: GradeRecord) {
    setStrMode(strNextMode);
    setStrEditingGradeId(dicGrade?.id ?? "");
    setDicErrors({});
    setDicForm(dicGrade ? { code: dicGrade.code, name: dicGrade.name, status: dicGrade.status } : dicEmptyForm);
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
    const dicNextErrors: Partial<Record<keyof GradeForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicConstant.grades.validation.nameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicConstant.grades.validation.nameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicConstant.grades.validation.codeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicConstant.grades.validation.codeFormat;
    }

    if (lstGrades.some((dicGrade) => dicGrade.code.toUpperCase() === strCode && dicGrade.id !== strEditingGradeId)) {
      dicNextErrors.code = dicConstant.grades.validation.codeDuplicate;
    }

    if (lstGrades.some((dicGrade) => dicGrade.name.trim().toLowerCase() === strName.toLowerCase() && dicGrade.id !== strEditingGradeId)) {
      dicNextErrors.name = dicConstant.grades.validation.nameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveGrade() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strGradeCode: dicForm.code.trim().toUpperCase(),
      strGradeName: dicForm.name.trim(),
      blnIsActive: dicForm.status === "Active"
    };
    const objRequest = strMode === "add"
      ? masterApiService.createGrade(objBody)
      : masterApiService.updateGrade(Number(strEditingGradeId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadGrades())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? "Grade saved successfully." : "Grade updated successfully.");
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strGradeId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strGradeId)
      ? lstPrevious.filter((strId) => strId !== strGradeId)
      : [...lstPrevious, strGradeId]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleGrades.some((dicGrade) => dicGrade.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleGrades.map((dicGrade) => dicGrade.id)])]);
  }

  function bulkUpdateStatus(strStatus: GradeStatus) {
    openConfirmDialog({
      strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Grades`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected grade record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkGradeStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadGrades();
        showToast(strStatus === "Active" ? "Selected grade records activated successfully." : "Selected grade records deactivated successfully.");
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: "Bulk Delete Grades",
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected grade record(s)?`,
      strConfirmLabel: "Bulk Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkGradeDelete(lstSelectedIds.map(Number));
        await loadGrades();
        showToast("Selected grade records deleted successfully.");
      }
    });
  }

  function deleteGrade(strGradeId: string) {
    openConfirmDialog({
      strTitle: "Delete Grade",
      strMessage: "Are you sure you want to delete this grade record?",
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkGradeDelete([Number(strGradeId)]);
        await loadGrades();
        showToast("Grade deleted successfully.");
      }
    });
  }

  function toggleGradeStatus(strGradeId: string) {
    const objGrade = lstGrades.find((dicItem) => dicItem.id === strGradeId);
    if (!objGrade) {
      return;
    }
    const strNextStatus = objGrade.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} Grade`,
      strMessage: `Are you sure you want to mark this grade as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkGradeStatus([Number(strGradeId)], strNextStatus === "Active");
        await loadGrades();
        showToast(strNextStatus === "Active" ? "Grade activated successfully." : "Grade deactivated successfully.");
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Typography className={styles.breadcrumbs}>Admin / Master / Grades</Typography>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicConstant.grades.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{dicConstant.grades.pageTitle}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicConstant.grades.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Grade Master", lstFilteredGrades)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportPdf}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("grade-master.xls", lstFilteredGrades)} disabled={blnLoading || blnSubmitting}>{dicConstant.common.exportExcel}</Button>
          </Box>
        </Box>

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder="Search Grade Name" fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder="Search Grade Code" fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">Status</MenuItem>
            <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicConstant.common.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicConstant.common.clear}</Button></Box>
        </Box>
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

      <Box className={styles.tableCard}>
        {!blnLoading && lstFilteredGrades.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredGrades.length)} {dicConstant.common.paginationSeparator} {lstFilteredGrades.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>Loading grades...</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>Grade Name</th>
                  <th>Grade Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredGrades.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={5}>No grade records found.</td></tr>
                ) : lstVisibleGrades.map((dicGrade) => {
                  const blnSelected = lstSelectedIds.includes(dicGrade.id);
                  return (
                    <tr key={dicGrade.id} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicGrade.id)} /></td>
                      <td>{dicGrade.name}</td>
                      <td>{dicGrade.code}</td>
                      <td><span className={`${styles.statusPill} ${dicGrade.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicGrade.status}</span></td>
                      <td>
                        <Box className={styles.actionCell}>
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicGrade)}><VisibilityOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicGrade)}><EditOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteGrade(dicGrade.id)}><DeleteOutlineRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleGradeStatus(dicGrade.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
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

      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{strMode === "add" ? dicConstant.grades.dialogAddTitle : strMode === "edit" ? dicConstant.grades.dialogEditTitle : "View Grade"}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={dicConstant.grades.fields.code} value={dicForm.code} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth disabled={strMode === "view"} />
            <TextField label={dicConstant.grades.fields.name} value={dicForm.name} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth disabled={strMode === "view"} />
            <TextField
              label={dicConstant.grades.fields.status}
              select
              value={dicForm.status}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as GradeStatus }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 0.5 }}
              fullWidth
              disabled={strMode === "view"}
            >
              <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
              <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? dicConstant.common.close : dicConstant.common.cancel}</Button>
          {strMode !== "view" ? (
            <Button className={styles.primaryButton} onClick={saveGrade} disabled={blnSubmitting}>
              {blnSubmitting ? "Saving..." : strMode === "add" ? dicConstant.grades.saveGrade : dicConstant.grades.updateGrade}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent dividers>
          <Typography>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button className={styles.secondaryButton} onClick={closeConfirmDialog} disabled={blnSubmitting}>{dicConstant.common.cancel}</Button>
          <Button className={styles.bulkDelete} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {blnSubmitting ? "Processing..." : objConfirmDialog?.strConfirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? "Loading..." : "Processing..."} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
