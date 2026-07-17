"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryStructureLabels } from "@/features/salary-structures/hooks/useSalaryStructureLabels";
import {
  createCloneForm,
  salaryStructureService
} from "@/features/salary-structures/services/salaryStructureService";
import type {
  SalaryStructureCloneValues,
  SalaryStructureDetailRecord,
  SalaryStructureListRecord
} from "@/features/salary-structures/types";

type Status = "Active" | "Inactive";
type SearchForm = {
  strName: string;
  strCode: string;
  strStatus: "All" | Status;
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

const lstRowsPerPageOptions = [10, 20, 50];
const dicEmptySearch: SearchForm = { strName: "", strCode: "", strStatus: "All" };
const lstSalaryStructureModuleCodes = ["SALARY_STRUCTURE", "SALARY_STRUCTURES", "MASTER_SALARY_STRUCTURE"];

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(strDate));
}

function downloadCsv(strFileName: string, lstRows: SalaryStructureListRecord[]) {
  const lstHeaders = ["Code", "Structure Name", "Scope", "Currency", "Effective From", "Effective To", "Components", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strStructureCode,
        dicRow.strStructureName,
        dicRow.strScopeLabel,
        dicRow.strCurrencyCode,
        formatDate(dicRow.dtEffectiveFrom),
        formatDate(dicRow.dtEffectiveTo),
        dicRow.intComponentCount,
        dicRow.blnIsActive ? "Active" : "Inactive"
      ]
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

function exportPdf(strTitle: string, lstRows: SalaryStructureListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1400,height=900");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strStructureCode}</td>
      <td>${dicRow.strStructureName}</td>
      <td>${dicRow.strScopeLabel}</td>
      <td>${dicRow.strCurrencyCode}</td>
      <td>${formatDate(dicRow.dtEffectiveFrom)}</td>
      <td>${formatDate(dicRow.dtEffectiveTo)}</td>
      <td>${dicRow.intComponentCount}</td>
      <td>${dicRow.blnIsActive ? "Active" : "Inactive"}</td>
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
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Structure Name</th>
              <th>Scope</th>
              <th>Currency</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Components</th>
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

export default function SalaryStructureListPage() {
  const objRouter = useRouter();
  const { t } = useSalaryStructureLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstSalaryStructureModuleCodes);
  const [lstStructures, setLstStructures] = useState<SalaryStructureListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [blnCloneOpen, setBlnCloneOpen] = useState(false);
  const [objCloneSource, setObjCloneSource] = useState<SalaryStructureDetailRecord | null>(null);
  const [dicCloneForm, setDicCloneForm] = useState<SalaryStructureCloneValues | null>(null);
  const [blnCloneSaving, setBlnCloneSaving] = useState(false);

  async function loadStructures() {
    if (!canViewAny()) {
      setLstStructures([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstStructures(await salaryStructureService.getSalaryStructures());
      setIntPage(1);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load salary structures.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadStructures().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanClone = blnCanAdd;

  const lstFilteredRows = useMemo(() => {
    return lstStructures.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.strName || dicRow.strStructureName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
      const blnCodeMatch = !dicSearchApplied.strCode || dicRow.strStructureCode.toLowerCase().includes(dicSearchApplied.strCode.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstStructures]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

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

  function deleteStructure(intSalaryStructureID: number) {
    openConfirmDialog({
      strTitle: t("confirm_delete_title", "Delete Salary Structure"),
      strMessage: t("confirm_delete_message", "Are you sure you want to delete this salary structure record?"),
      strConfirmLabel: t("delete_button", "Delete"),
      fnOnConfirm: async () => {
        await salaryStructureService.deleteSalaryStructure(intSalaryStructureID);
        await loadStructures();
        showToast(t("delete_success", "Salary structure deleted successfully."));
      }
    });
  }

  async function handleCloneOpen(intSalaryStructureID: number) {
    try {
      const dicDetail = await salaryStructureService.getSalaryStructureById(intSalaryStructureID);
      setObjCloneSource(dicDetail);
      setDicCloneForm(createCloneForm(dicDetail));
      setBlnCloneOpen(true);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load salary structure for clone.", "error");
    }
  }

  async function handleCloneSave() {
    if (!objCloneSource || !dicCloneForm) {
      return;
    }
    if (!dicCloneForm.strStructureCode.trim() || !dicCloneForm.strStructureName.trim() || !dicCloneForm.dtEffectiveFrom) {
      showToast("Clone code, clone name, and effective from date are required.", "error");
      return;
    }
    setBlnCloneSaving(true);
    try {
      const dicRecord = await salaryStructureService.cloneSalaryStructure(objCloneSource.intID, dicCloneForm);
      setBlnCloneOpen(false);
      showToast("Salary structure cloned successfully.");
      objRouter.push(`/salary-structures/edit/${dicRecord.intID}`);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to clone salary structure.", "error");
    } finally {
      setBlnCloneSaving(false);
    }
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button controlId="salary-structures.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Salary Structure.")}
          </Typography>
        ) : null}

        <Box className={styles.searchRow}>
          <TextField
            controlId="salary-structures.list.search-code.input"
            inputProps={{ "controlId": "salary-structures.list.search-code.input" }}
            value={dicSearchDraft.strCode}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_structure_code", "Search structure code")}
            fullWidth
          />
          
          <TextField
            controlId="salary-structures.list.search-name.input"
            inputProps={{ "controlId": "salary-structures.list.search-name.input" }}
            value={dicSearchDraft.strName}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("search_structure_name", "Search structure name")}
            fullWidth
          />

          <TextField
            controlId="salary-structures.list.search-status.select"
            inputProps={{ "controlId": "salary-structures.list.search-status.select" }}
            select
            label={t("search_status_label", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
            fullWidth
          >
            <MenuItem controlId="salary-structures.list.search-status.all.option" value="All">{t("all_status", "All Status")}</MenuItem>
            <MenuItem controlId="salary-structures.list.search-status.active.option" value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem controlId="salary-structures.list.search-status.inactive.option" value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              controlId="salary-structures.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                setIntPage(1);
              }}
              disabled={blnLoading || blnSubmitting}
            >
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="salary-structures.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                setIntPage(1);
              }}
              disabled={blnLoading || blnSubmitting}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? (
              <Button controlId="salary-structures.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-structures/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("add_salary_structure", "Add Salary Structure")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button controlId="salary-structures.list.export-excel.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("salary_structures.csv", lstFilteredRows)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button controlId="salary-structures.list.export-pdf.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(t("salary_structure_title", "Salary Structures"), lstFilteredRows)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_pdf", "Export PDF")}
              </Button>
            ) : null}
          </Box>

          {!blnLoading && lstFilteredRows.length > 0 ? (
            <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{t("rows_per_page", "Rows per page")}</Typography>
                <TextField
                  controlId="salary-structures.list.rows-per-page.select"
                  inputProps={{ "controlId": "salary-structures.list.rows-per-page.select" }}
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
                    <MenuItem key={intOption} value={String(intOption)} controlId={`salary-structures.list.rows-per-page.${intOption}.option`}>{intOption}</MenuItem>
                  ))}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} {t("pagination_separator", "of")} {lstFilteredRows.length}
                </Typography>
              </Box>
              <Pagination controlId="salary-structures.list.pagination" count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
            </Box>
          ) : null}
        </Box>

        {blnLoading || blnRightsLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("loading_salary_structures", "Loading salary structures...")}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Salary structure access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need salary structure visibility.")}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("action", "Action")}</th>
                  <th>{t("code", "Code")}</th>
                  <th>{t("structure_name", "Structure Name")}</th>
                  <th>{t("scope", "Scope")}</th>
                  <th>{t("currency", "Currency")}</th>
                  <th>{t("effective_from", "Effective From")}</th>
                  <th>{t("effective_to", "Effective To")}</th>
                  <th>{t("components", "Components")}</th>
                  <th>{t("status", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={9}>{t("no_salary_structures_found", "No salary structures found.")}</td>
                  </tr>
                ) : lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intID}>
                    <td>
                      <Box className={styles.actionCell}>
                        <CommonRowActions
                          testIdPrefix="salary-structures.list.row"
                          rowKey={dicRow.intID}
                          blnCanView={!blnCanEdit && blnCanView}
                          blnCanEdit={blnCanEdit}
                          blnCanDelete={blnCanDelete}
                          onView={() => objRouter.push(`/salary-structures/edit/${dicRow.intID}`)}
                          onEdit={() => objRouter.push(`/salary-structures/edit/${dicRow.intID}`)}
                          onDelete={() => deleteStructure(dicRow.intID)}
                        />
                        {blnCanClone ? (
                          <button
                            data-controlid="salary-structures.list.row.clone.button"
                            data-row-key={String(dicRow.intID)}
                            className={`${styles.iconButton} ${styles.editIcon}`}
                            type="button"
                            onClick={() => handleCloneOpen(dicRow.intID)}
                            title={t("clone_button", "Clone")}
                          >
                            <ContentCopyRoundedIcon data-testid={undefined} data-controlid="salary-structures.list.row.clone.button.icon" fontSize="small" />
                          </button>
                        ) : null}
                      </Box>
                    </td>
                    <td>{dicRow.strStructureCode}</td>
                    <td>{dicRow.strStructureName}</td>
                    <td>{dicRow.strScopeLabel}</td>
                    <td>{dicRow.strCurrencyCode}</td>
                    <td>{formatDate(dicRow.dtEffectiveFrom)}</td>
                    <td>{formatDate(dicRow.dtEffectiveTo)}</td>
                    <td>{dicRow.intComponentCount}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <Dialog open={blnCloneOpen} onClose={() => !blnCloneSaving && setBlnCloneOpen(false)} fullWidth maxWidth="md" controlId="salary-structures.list.clone.dialog">
        <DialogTitle>{t("clone_salary_structure", "Clone Salary Structure")}</DialogTitle>
        <DialogContent>
          {dicCloneForm ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.92rem" }}>
                {t("clone_salary_structure_help", "Create a new structure by copying component configuration and multilingual text from the selected structure.")}
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                <TextField
                  label={t("new_structure_code", "New Structure Code")}
                  value={dicCloneForm.strStructureCode}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, strStructureCode: objEvent.target.value.toUpperCase() } : dicPrev)}
                  disabled={blnCloneSaving}
                  fullWidth
                  controlId="salary-structures.list.clone.structure-code.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.structure-code.input" }}
                />
                <TextField
                  label={t("new_structure_name", "New Structure Name")}
                  value={dicCloneForm.strStructureName}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, strStructureName: objEvent.target.value } : dicPrev)}
                  disabled={blnCloneSaving}
                  fullWidth
                  controlId="salary-structures.list.clone.structure-name.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.structure-name.input" }}
                />
                <TextField
                  label={t("effective_from", "Effective From")}
                  type="date"
                  value={dicCloneForm.dtEffectiveFrom}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, dtEffectiveFrom: objEvent.target.value } : dicPrev)}
                  InputLabelProps={{ shrink: true }}
                  disabled={blnCloneSaving}
                  fullWidth
                  controlId="salary-structures.list.clone.effective-from.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.effective-from.input" }}
                />
                <TextField
                  label={t("effective_to", "Effective To")}
                  type="date"
                  value={dicCloneForm.dtEffectiveTo}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, dtEffectiveTo: objEvent.target.value } : dicPrev)}
                  InputLabelProps={{ shrink: true }}
                  disabled={blnCloneSaving}
                  fullWidth
                  controlId="salary-structures.list.clone.effective-to.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.effective-to.input" }}
                />
              </Box>
              {objCloneSource ? (
                <Alert severity="info">
                  {t("clone_source", "Clone source")}: {objCloneSource.strStructureName}
                </Alert>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button controlId="salary-structures.list.clone.cancel.button" onClick={() => setBlnCloneOpen(false)} disabled={blnCloneSaving}>{t("cancel_button", "Cancel")}</Button>
          <Button controlId="salary-structures.list.clone.confirm.button" variant="contained" onClick={handleCloneSave} disabled={blnCloneSaving}>
            {blnCloneSaving ? t("cloning", "Cloning...") : t("clone_button", "Clone")}
          </Button>
        </DialogActions>
      </Dialog>

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={t("cancel_button", "Cancel")}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing...")} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
