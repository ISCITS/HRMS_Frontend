"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, CircularProgress, MenuItem, Snackbar, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { type StateApiRecord, type StateFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";
import { createInitialStateForm, stateService, toStateFormValues, type StateFormValues } from "@/features/employee/services/stateService";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type StateRecord = { id: string; countryId: number | ""; countryName: string; code: string; name: string; status: Status };
type SearchForm = { code: string; name: string; status: "All" | Status };
type ConfirmDialogState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> };
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };

function mapStateRecord(dicRecord: StateApiRecord, objOptions: StateFormOptionsApiRecord): StateRecord {
  return {
    id: String(dicRecord.intID),
    countryId: dicRecord.intCountryID,
    countryName: objOptions.lstCountries.find((dicCountry) => dicCountry.intID === dicRecord.intCountryID)?.strLabel ?? "",
    code: dicRecord.strStateCode,
    name: dicRecord.strStateName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
  };
}

export default function StateMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("state");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(["STATE", "STATES"]);
  const [lstStates, setLstStates] = useState<StateRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<StateFormOptionsApiRecord>({ lstLanguages: [], lstCountries: [] });
  const [strMode, setStrMode] = useState<Mode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingId, setStrEditingId] = useState("");
  const [dicForm, setDicForm] = useState<StateFormValues>(createInitialStateForm());
  const [dicErrors, setDicErrors] = useState<Partial<Record<"countryId" | "code" | "name", string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const dicCommonLabels = {
    cancel: t("cancel"),
    clear: t("clear"),
    close: t("close"),
    save: t("save"),
    search: t("search"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    loading: t("loading"),
    processing: t("processing"),
  };

  const dicLabels = {
    backButton: t("back_button"),
    addButton: t("add_button"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableCountry: t("table_country"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    emptyMessage: t("empty_message"),
    fieldCountry: t("field_country"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldIsActive: t("field_is_active", "Is Active"),
    selectCountry: t("select_country"),
    saving: t("saving", "Saving..."),
    requestFailed: t("request_failed"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    confirmButton: t("confirm_button"),
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
    validationCountryRequired: t("validation_country_required"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
  };

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;
  const intLanguageID = authHelpers.getLanguageID() ?? 1;

  async function loadData() {
    if (!canViewAny()) {
      setLstStates([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objOptions = await stateService.getStateFormOptions(intLanguageID);
      const objResult = await masterApiService.getStates();
      setObjFormOptions(objOptions);
      setLstStates(objResult.Data.map((dicRecord) => mapStateRecord(dicRecord, objOptions)));
      setLstSelectedIds([]);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (!blnRightsLoading) {
      void loadData();
    }
  }, [blnRightsLoading]);

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((dicPrevious) => ({ ...dicPrevious, blnOpen: false }));
  }

  function closeDialog() {
    setBlnDialogOpen(false);
  }

  function closeConfirmDialog() {
    setObjConfirmDialog(null);
  }

  async function ensureFormOptionsLoaded() {
    if (objFormOptions.lstCountries.length > 0) {
      return objFormOptions;
    }
    const objOptions = await stateService.getStateFormOptions(intLanguageID);
    setObjFormOptions(objOptions);
    return objOptions;
  }

  async function openDialog(strNextMode: Mode, dicRow?: StateRecord) {
    const objOptions = await ensureFormOptionsLoaded();
    setStrMode(strNextMode);
    setStrEditingId(dicRow?.id ?? "");
    setDicErrors({});
    if (!dicRow) {
      setDicForm(createInitialStateForm());
      setBlnDialogOpen(true);
      return;
    }
    const dicDetail = await stateService.getState(Number(dicRow.id), intLanguageID);
    setDicForm(toStateFormValues(dicDetail, objOptions));
    setBlnDialogOpen(true);
  }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) {
      return;
    }
    setBlnSubmitting(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<"countryId" | "code" | "name", string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    if (dicForm.countryId === "") {
      dicNextErrors.countryId = dicLabels.validationCountryRequired;
    }
    if (!strCode) {
      dicNextErrors.code = dicLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9 /_-]{2,20}$/.test(strCode)) {
      dicNextErrors.code = dicLabels.validationCodeFormat;
    }
    if (!strName) {
      dicNextErrors.name = dicLabels.validationNameRequired;
    } else if (strName.length < 2) {
      dicNextErrors.name = dicLabels.validationNameMin;
    }
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  async function saveState() {
    if (!validateForm()) {
      return;
    }
    setBlnSubmitting(true);
    try {
      if (strMode === "add") {
        await stateService.createState(dicForm);
      } else {
        await stateService.updateState(Number(strEditingId), dicForm);
      }
      await loadData();
      closeDialog();
      showToast(strMode === "add" ? dicLabels.saveSuccess : dicLabels.updateSuccess);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
    }
  }

  const lstFiltered = useMemo(() => lstStates.filter((dicState) => {
    const blnCodeMatch = !dicSearchApplied.code || dicState.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicState.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicState.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstStates]);

  const blnAllFilteredSelected = lstFiltered.length > 0 && lstFiltered.every((dicState) => lstSelectedIds.includes(dicState.id));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFiltered.some((dicState) => lstSelectedIds.includes(dicState.id));

  function toggleSelection(strId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strId) ? lstPrevious.filter((strValue) => strValue !== strId) : [...lstPrevious, strId]);
  }

  function toggleSelectAll() {
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstFiltered.some((dicState) => dicState.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFiltered.map((dicState) => dicState.id)])]);
  }

  function bulkUpdateStatus(strStatus: Status) {
    setObjConfirmDialog({
      strTitle: strStatus === "Active" ? dicLabels.confirmBulkActivateTitle : dicLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicLabels.confirmBulkActivateMessage : dicLabels.confirmBulkDeactivateMessage).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? dicLabels.bulkActivate : dicLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkStateStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadData();
        showToast(strStatus === "Active" ? dicLabels.bulkActivateSuccess : dicLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    setObjConfirmDialog({
      strTitle: dicLabels.confirmBulkDeleteTitle,
      strMessage: dicLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicLabels.bulkDelete,
      fnOnConfirm: async () => {
        await masterApiService.bulkStateDelete(lstSelectedIds.map(Number));
        await loadData();
        showToast(dicLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteRecord(strId: string) {
    setObjConfirmDialog({
      strTitle: dicLabels.confirmDeleteTitle,
      strMessage: dicLabels.confirmDeleteMessage,
      strConfirmLabel: t("delete"),
      fnOnConfirm: async () => {
        await masterApiService.bulkStateDelete([Number(strId)]);
        await loadData();
        showToast(dicLabels.deleteSuccess);
      }
    });
  }

  const lstTableRows = useMemo(() => lstFiltered.map((dicState) => {
    const blnSelected = lstSelectedIds.includes(dicState.id);
    return {
      id: dicState.id,
      select: <Checkbox controlId="state-master.list.row.select.checkbox" checked={blnSelected} onChange={() => toggleSelection(dicState.id)} inputProps={{ "controlId": "state-master.list.row.select.checkbox", "data-row-key": dicState.id } as InputHTMLAttributes<HTMLInputElement>} />,
      action: <CommonRowActions testIdPrefix="state-master.list.row" rowKey={dicState.id} blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} onView={() => void openDialog("view", dicState)} onEdit={() => void openDialog("edit", dicState)} onDelete={() => deleteRecord(dicState.id)} />,
      countryName: dicState.countryName || "-",
      name: dicState.name,
      code: dicState.code,
      status: <span className={`${styles.statusPill} ${dicState.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicState.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span>,
    };
  }), [blnCanChangeStatus, blnCanDelete, blnCanEdit, blnCanView, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFiltered, lstSelectedIds]);

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(() => [
    {
      field: "select",
      headerName: (
        <Checkbox
          controlId="state-master.list.select-all.checkbox"
          checked={blnAllFilteredSelected}
          indeterminate={blnSomeFilteredSelected}
          onChange={toggleSelectAll}
          disabled={lstFiltered.length === 0}
          inputProps={{ "controlId": "state-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
      sortable: false,
      filterable: false,
      exportable: false,
      width: 56
    },
    { field: "action", headerName: dicLabels.tableActions, sortable: false, filterable: false, exportable: false, width: 110 },
    { field: "countryName", headerName: dicLabels.tableCountry },
    { field: "name", headerName: dicLabels.tableName },
    { field: "code", headerName: dicLabels.tableCode },
    { field: "status", headerName: dicLabels.tableStatus, sortable: false, filterable: false, width: 130 },
  ], [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels.tableActions, dicLabels.tableCode, dicLabels.tableCountry, dicLabels.tableName, dicLabels.tableStatus, lstFiltered.length]);

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button controlId="state-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicLabels.backButton}</Button>
      </Box>
      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", "You have view-only access for State.")}</Typography> : null}
        <Box className={styles.searchRow}>
          <TextField controlId="state-master.list.search-name.input" inputProps={{ "controlId": "state-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicLabels.searchNamePlaceholder} fullWidth />
          <TextField controlId="state-master.list.search-code.input" inputProps={{ "controlId": "state-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicLabels.searchCodePlaceholder} fullWidth />
          <TextField controlId="state-master.list.search-status.select" inputProps={{ "controlId": "state-master.list.search-status.select" }} select label={dicLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth><MenuItem controlId="state-master.list.search-status.all.option" value="All">All</MenuItem><MenuItem controlId="state-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem><MenuItem controlId="state-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem></TextField>
          <Box className={styles.searchActions}><Button controlId="state-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="state-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
        {blnSubmitting ? (
          <Box className={styles.bulkBar}><CircularProgress size={20} /><Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography></Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicLabels.bulkRowsSelected}`}</Typography>{blnCanChangeStatus ? <Button controlId="state-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicLabels.bulkActivate}</Button> : null}{blnCanChangeStatus ? <Button controlId="state-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicLabels.bulkDeactivate}</Button> : null}{blnCanDelete ? <Button controlId="state-master.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicLabels.bulkDelete}</Button> : null}</Box>
        ) : null}
      </Box>
      <Box className={styles.tableCard}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}><Typography sx={{ fontWeight: 800, color: "#0f172a" }}>State access is not available for your user group.</Typography></Box>
        ) : (
          <CommonTable columns={lstTableColumns} rows={lstTableRows} rowIdField="id" defaultPageSize={10} pageSizeOptions={[10, 20, 50]} exportFileName="state-master" showExportOptions={blnCanExport} testIdPrefix="state-master.list" showPaginationSummary emptyMessage={dicLabels.emptyMessage} toolbarLeft={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>{blnCanAdd ? <Button controlId="state-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => void openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicLabels.addButton}</Button> : null}</Box>} getRowSx={(dicRow) => lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />
        )}
      </Box>
      <CommonMasterDialog
        blnOpen={blnDialogOpen} onClose={closeDialog}
        rootTestId="state-master.dialog"
        cancelButtonTestId="state-master.dialog.cancel.button"
        primaryButtonTestId="state-master.dialog.save.button"
        strTitle={strMode === "add" ? dicLabels.dialogAddTitle : strMode === "edit" ? dicLabels.dialogEditTitle : dicLabels.dialogViewTitle}
         strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicLabels.saving : dicCommonLabels.save} 
        onPrimaryAction={saveState} blnPrimaryDisabled={blnSubmitting} 
        blnHidePrimary={strMode === "view"} 
        paperClassName={styles.compactDialogPaper} 
        paperSx={{
          width: "min(800px, calc(100vw - 32px))",
          maxWidth: "800px",
          overflow: "hidden",
          m: 2,
        }}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel}>{dicLabels.fieldIsActive}</Typography>

            <ActiveStatusSwitch testId="state-master.dialog.active.switch" blnIsActive={dicForm.status === "Active"}
              disabled={strMode === "view"} onChange={(blnChecked) =>
                setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} /></Box>
        }
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <TextField controlId="state-master.dialog.country.select"
              inputProps={{ "controlId": "state-master.dialog.country.select" }}
              required
              select label={`${dicLabels.fieldCountry}`} value={dicForm.countryId === "" ? "" : String(dicForm.countryId)}
              disabled={strMode === "view"}
              onChange={(objEvent) => {
                setDicErrors((dicPrevious) => ({ ...dicPrevious, countryId: undefined }));
                setDicForm((dicPrevious) => ({ ...dicPrevious, countryId: objEvent.target.value ? Number(objEvent.target.value) : "" }));
              }}
              error={Boolean(dicErrors.countryId)} 
              helperText={dicErrors.countryId} 
              fullWidth>
              <MenuItem
                controlId="state-master.dialog.country.empty.option"
                value="">{dicLabels.selectCountry}
                </MenuItem>{
                objFormOptions.lstCountries.map((dicCountry) => <MenuItem controlId="state-master.dialog.country.option"
                  data-option-key={dicCountry.intID} 
                  key={dicCountry.intID} 
                  value={String(dicCountry.intID)}>{
                    dicCountry.strLabel}{dicCountry.strCode ? ` (${dicCountry.strCode})` : ""}</MenuItem>)}
            </TextField>
            <TextField 
            controlId="state-master.dialog.name.input" 
            inputProps={{ "controlId": "state-master.dialog.name.input" }}
              required
              label={`${dicLabels.fieldName}`} value={dicForm.name} disabled={strMode === "view"}
              onChange={(objEvent) => { setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value })); }} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth /><TextField controlId="state-master.dialog.code.input" inputProps={{ "controlId": "state-master.dialog.code.input" }}
                required
                label={`${dicLabels.fieldCode}`} 
                value={dicForm.code} 
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }));
                }}
                error={Boolean(dicErrors.code)} helperText={dicErrors.code} 
                fullWidth />
          </Box>
        }
      />

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction} />

      <BlockingLoader 
        blnOpen={blnLoading || blnRightsLoading || blnSubmitting}
        strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} 
        intZIndex={1400} />

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={3500}
        onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled"
          sx={{ width: "100%" }}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
