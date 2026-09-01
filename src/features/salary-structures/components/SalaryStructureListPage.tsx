"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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

export default function SalaryStructureListPage() {
  const objRouter = useRouter();
  const { t } = useSalaryStructureLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstSalaryStructureModuleCodes);
  const [lstStructures, setLstStructures] = useState<SalaryStructureListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [blnCloneOpen, setBlnCloneOpen] = useState(false);
  const [objCloneSource, setObjCloneSource] = useState<SalaryStructureDetailRecord | null>(null);
  const [dicCloneForm, setDicCloneForm] = useState<SalaryStructureCloneValues | null>(null);
  const [blnCloneSaving, setBlnCloneSaving] = useState(false);
  const [strCloneError, setStrCloneError] = useState("");

  function closeCloneDialog() {
    if (blnCloneSaving) {
      return;
    }
    setBlnCloneOpen(false);
    setStrCloneError("");
  }

  function updateCloneField<K extends keyof SalaryStructureCloneValues>(key: K, value: SalaryStructureCloneValues[K]) {
    setStrCloneError("");
    setDicCloneForm((dicPrev) => {
      if (!dicPrev) {
        return dicPrev;
      }
      const dicNext = {
        ...dicPrev,
        [key]: value
      };
      if (key === "strStructureName") {
        return {
          ...dicNext,
          lstTexts: dicPrev.lstTexts.map((dicText, intIndex) => intIndex === 0
            ? { ...dicText, strStructureName: String(value) }
            : dicText)
        };
      }
      return dicNext;
    });
  }

  async function loadStructures() {
    if (!canViewAny()) {
      setLstStructures([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstStructures(await salaryStructureService.getSalaryStructures());
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

  const lstTableRows = useMemo(
    () => lstFilteredRows.map((dicRow) => ({
      id: dicRow.intID,
      action: (
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
              style={{ color: "#6D6D6D" }}
              type="button"
              onClick={() => handleCloneOpen(dicRow.intID)}
              title={t("clone_button", "Clone")}
            >
              <ContentCopyRoundedIcon data-testid={undefined} data-controlid="salary-structures.list.row.clone.button.icon" fontSize="small" />
            </button>
          ) : null}
        </Box>
      ),
      strStructureCode: dicRow.strStructureCode,
      strStructureName: dicRow.strStructureName,
      strScopeLabel: dicRow.strScopeLabel,
      strCurrencyCode: dicRow.strCurrencyCode,
      dtEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
      dtEffectiveTo: formatDate(dicRow.dtEffectiveTo),
      strEffectiveFromSort: dicRow.dtEffectiveFrom,
      strEffectiveToSort: dicRow.dtEffectiveTo ?? "",
      intComponentCount: dicRow.intComponentCount,
      strStatus: (
        <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
          {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
        </span>
      )
    })),
    [blnCanClone, blnCanDelete, blnCanEdit, blnCanView, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("action", "Action"), sortable: false, filterable: false, exportable: false, width: 120 },
      { field: "strStructureName", headerName: t("structure_name", "Structure Name") },
      { field: "strStructureCode", headerName: t("structure_code", "Structure Code") },
      { field: "strScopeLabel", headerName: t("scope", "Scope") },
      { field: "strCurrencyCode", headerName: t("currency", "Currency") },
      { field: "dtEffectiveFrom", headerName: t("effective_from", "Effective From"), sortAccessor: (dicRow) => dicRow.strEffectiveFromSort },
      { field: "dtEffectiveTo", headerName: t("effective_to", "Effective To"), sortAccessor: (dicRow) => dicRow.strEffectiveToSort },
      { field: "intComponentCount", headerName: t("components", "Components"), align: "right" },
      { field: "strStatus", headerName: t("status", "Status"), sortable: false, filterable: false, width: 140 }
    ],
    [t]
  );

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
      setStrCloneError("");
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
      setStrCloneError("New structure code, new structure name, and effective from date are required.");
      return;
    }
    setStrCloneError("");
    setBlnCloneSaving(true);
    try {
      const dicRecord = await salaryStructureService.cloneSalaryStructure(objCloneSource.intID, dicCloneForm);
      setBlnCloneOpen(false);
      setStrCloneError("");
      showToast("Salary structure cloned successfully.");
      objRouter.push(`/salary-structures/edit/${dicRecord.intID}`);
    } catch (objError) {
      setStrCloneError(objError instanceof Error ? objError.message : "Unable to clone salary structure.");
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
            controlId="salary-structures.list.search-name.input"
            inputProps={{ "controlId": "salary-structures.list.search-name.input" }}
            value={dicSearchDraft.strName}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("search_structure_name", "Search structure name")}
            fullWidth
          />

          <TextField
            controlId="salary-structures.list.search-code.input"
            inputProps={{ "controlId": "salary-structures.list.search-code.input" }}
            value={dicSearchDraft.strCode}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_structure_code", "Search structure code")}
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
              }}
              disabled={blnLoading || blnSubmitting}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {blnLoading || blnRightsLoading ? (
          <BlockingLoader blnOpen strLabel={t("loading_salary_structures", "Loading salary structures...")} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Salary structure access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need salary structure visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="salary_structures"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("no_salary_structures_found", "No salary structures found.")}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button controlId="salary-structures.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-structures/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                    {t("add_salary_structure", "Add Salary Structure")}
                  </Button>
                ) : null}
              </Box>
            )}
            testIdPrefix="salary-structures.list"
            withPaper={false}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <Dialog open={blnCloneOpen} onClose={closeCloneDialog} fullWidth maxWidth="md" controlId="salary-structures.list.clone.dialog">
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
                  onChange={(objEvent) => updateCloneField("strStructureCode", objEvent.target.value.toUpperCase())}
                  disabled={blnCloneSaving}
                  fullWidth
                  required
                  error={Boolean(strCloneError) && !dicCloneForm.strStructureCode.trim()}
                  helperText={Boolean(strCloneError) && !dicCloneForm.strStructureCode.trim() ? strCloneError : " "}
                  controlId="salary-structures.list.clone.structure-code.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.structure-code.input" }}
                />
                <TextField
                  label={t("new_structure_name", "New Structure Name")}
                  value={dicCloneForm.strStructureName}
                  onChange={(objEvent) => updateCloneField("strStructureName", objEvent.target.value)}
                  disabled={blnCloneSaving}
                  fullWidth
                  required
                  error={Boolean(strCloneError) && !dicCloneForm.strStructureName.trim()}
                  helperText={Boolean(strCloneError) && !dicCloneForm.strStructureName.trim() ? strCloneError : " "}
                  controlId="salary-structures.list.clone.structure-name.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.structure-name.input" }}
                />
                <TextField
                  label={t("effective_from", "Effective From")}
                  type="date"
                  value={dicCloneForm.dtEffectiveFrom}
                  onChange={(objEvent) => updateCloneField("dtEffectiveFrom", objEvent.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={blnCloneSaving}
                  fullWidth
                  error={Boolean(strCloneError) && !dicCloneForm.dtEffectiveFrom}
                  helperText={Boolean(strCloneError) && !dicCloneForm.dtEffectiveFrom ? strCloneError : " "}
                  controlId="salary-structures.list.clone.effective-from.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.effective-from.input" }}
                />
                <TextField
                  label={t("effective_to", "Effective To")}
                  type="date"
                  value={dicCloneForm.dtEffectiveTo}
                  onChange={(objEvent) => updateCloneField("dtEffectiveTo", objEvent.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={blnCloneSaving}
                  fullWidth
                  controlId="salary-structures.list.clone.effective-to.input"
                  inputProps={{ "controlId": "salary-structures.list.clone.effective-to.input" }}
                />
              </Box>
              {strCloneError && dicCloneForm.strStructureCode.trim() && dicCloneForm.strStructureName.trim() && dicCloneForm.dtEffectiveFrom ? (
                <Typography sx={{ color: "#d32f2f", fontSize: "0.8rem", mt: -0.5 }}>
                  {strCloneError}
                </Typography>
              ) : null}
              {objCloneSource ? (
                <Alert severity="info">
                  {t("clone_source", "Clone source")}: {objCloneSource.strStructureName}
                </Alert>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button controlId="salary-structures.list.clone.cancel.button" className={styles.secondaryButton} onClick={closeCloneDialog} disabled={blnCloneSaving}>{t("cancel_button", "Cancel")}</Button>
          <Button controlId="salary-structures.list.clone.confirm.button" className={styles.primaryButton} variant="contained" onClick={handleCloneSave} disabled={blnCloneSaving}>
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
