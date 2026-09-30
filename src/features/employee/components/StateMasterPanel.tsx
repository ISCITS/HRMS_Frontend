"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, CircularProgress, InputAdornment, MenuItem, Snackbar, Switch, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import MasterBreadcrumbs from "@/components/master/MasterBreadcrumbs";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { type StateApiRecord, type StateFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";
import { createEmptyStateTextRow, createInitialStateForm, stateService, toStateFormValues, type StateFormValues, type StateTextFormValue } from "@/features/employee/services/stateService";

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
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});

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
    tableName: "State Name",
    tableCode: "State Code",
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    emptyMessage: t("empty_message"),
    fieldCountry: t("field_country"),
    fieldName: "State Name",
    fieldCode: "State Code",
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
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function buildFixedLanguageRow(
    intTargetLanguageID: number,
    strStateName: string,
    strStateCode: string,
    lstExistingTexts: StateTextFormValue[],
  ): StateTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intTargetLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intTargetLanguageID);
    return {
      ...createEmptyStateTextRow(),
      ...dicExistingText,
      intLanguageID: intTargetLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strStateName,
      strStateCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: StateFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(intDefaultLanguageID, dicValues.name, dicValues.code, dicValues.lstTexts);
    if (!intSecondaryLanguageID) {
      return { ...dicValues, lstTexts: [dicDefaultRow] };
    }
    const dicSecondaryExistingText = dicValues.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID);
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strStateName ?? "",
      dicValues.code,
      dicValues.lstTexts,
    );
    return { ...dicValues, lstTexts: [dicDefaultRow, dicSecondaryRow] };
  }

  function syncEnglishStateName(strStateName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0 ? { ...dicText, strStateName } : dicText),
      };
    });
  }

  function syncStateCode(strStateCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({ ...dicText, strStateCode })),
    }));
  }

  function updateTextRow(strRowID: string, strField: keyof StateTextFormValue, objValue: string | number) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID ? { ...dicText, [strField]: objValue } : dicText),
    }));
  }

  const lstVisibleTranslationRows = dicForm.lstTexts.filter((dicText) => Number(dicText.intLanguageID) !== intDefaultLanguageID);

  async function translateTextRow(strRowID: string, intTargetLanguageID: number) {
    const dicSelectedLanguage = objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intTargetLanguageID);
    const strSourceStateName = dicForm.name.trim();
    if (!dicSelectedLanguage || intTargetLanguageID === intDefaultLanguageID || !strSourceStateName) {
      return;
    }
    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    if (dicCurrentRow?.strStateName.trim() && dicLastTranslatedSourceByRow[strRowID] === strSourceStateName) {
      return;
    }
    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await stateService.translateStateText(strSourceStateName, intDefaultLanguageID, intTargetLanguageID);
      setDicForm((dicPrevious) => ({
        ...dicPrevious,
        lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID
          ? { ...dicText, intLanguageID: intTargetLanguageID, strLanguageName: dicSelectedLanguage.strLabel, strStateName: strTranslatedName }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({ ...dicPrevious, [strRowID]: strSourceStateName }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error");
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  async function handleTranslateClick() {
    const dicSecondaryRow = lstVisibleTranslationRows[0];
    if (!dicSecondaryRow) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID));
  }

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
      setDicForm(ensureTenantLanguageRows(createInitialStateForm()));
      setBlnDialogOpen(true);
      return;
    }
    const dicDetail = await stateService.getState(Number(dicRow.id), intLanguageID);
    setDicForm(ensureTenantLanguageRows(toStateFormValues(dicDetail, objOptions)));
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
        await stateService.createState(ensureTenantLanguageRows(dicForm));
      } else {
        await stateService.updateState(Number(strEditingId), ensureTenantLanguageRows(dicForm));
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
    <Box className={`${styles.page} ${styles.referenceMasterPage}`}>
      <MasterBreadcrumbs strCurrent="States" />
      <Box className={styles.topBar}>
        <Button controlId="state-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicLabels.backButton}</Button>
      </Box>
      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", "You have view-only access for State.")}</Typography> : null}
        <Box className={styles.searchRow} sx={{ alignItems: "end", "& .MuiButton-root": { height: "36px !important", minHeight: "36px !important", alignSelf: "flex-end" } }}>
          <Box><Typography component="label" htmlFor="state-master-search-name" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{dicLabels.tableName}</Typography>
            <TextField id="state-master-search-name" controlId="state-master.list.search-name.input" inputProps={{ "controlId": "state-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} fullWidth />
          </Box>
          <Box><Typography component="label" htmlFor="state-master-search-code" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{dicLabels.tableCode}</Typography>
            <TextField id="state-master-search-code" controlId="state-master.list.search-code.input" inputProps={{ "controlId": "state-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} fullWidth />
          </Box>
          <Box><Typography component="label" htmlFor="state-master-search-status" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{dicLabels.tableStatus}</Typography>
            <TextField id="state-master-search-status" controlId="state-master.list.search-status.select" inputProps={{ "controlId": "state-master.list.search-status.select" }} select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" fullWidth>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          </Box>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting} controlId="state-master.list.search.button">{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting} controlId="state-master.list.clear.button">{dicCommonLabels.clear}</Button></Box>
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
          <CommonTable columns={lstTableColumns.filter((dicColumn) => dicColumn.field !== "action")} rows={lstTableRows} rowIdField="id" exportFileName="state-master" showExportOptions={blnCanExport} testIdPrefix="state-master.list" showPaginationSummary hideRowClickHint onRowClick={(dicRow) => { const dicState = lstStates.find((dicItem) => dicItem.id === dicRow.id); if (dicState) void openDialog(blnCanEdit ? "edit" : "view", dicState); }} emptyMessage={dicLabels.emptyMessage} toolbarLeft={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>{blnCanAdd ? <Button controlId="state-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => void openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicLabels.addButton}</Button> : null}</Box>} getRowSx={(dicRow) => lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />
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
        paperClassName={styles.referenceMasterDialogPaper} 
        paperSx={{
          overflow: "hidden",
          m: 2,
        }}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch testId="state-master.dialog.active.switch" blnIsActive={dicForm.status === "Active"}
              disabled={strMode === "view"} onChange={(blnChecked) =>
                setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />

            <Typography className={styles.switchLabel}>{dicLabels.fieldIsActive}</Typography></Box>
        }
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: 1.6, pt: 0.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
            <CommonSearchableSelect
              controlId="state-master.dialog.country.select"
              required
              label={`${dicLabels.fieldCountry}`}
              value={dicForm.countryId}
              options={objFormOptions.lstCountries}
              getOptionLabel={(dicCountry) => `${dicCountry.strLabel}${dicCountry.strCode ? ` (${dicCountry.strCode})` : ""}`}
              disabled={strMode === "view"}
              onChange={(intValue) => {
                setDicErrors((dicPrevious) => ({ ...dicPrevious, countryId: undefined }));
                setDicForm((dicPrevious) => ({ ...dicPrevious, countryId: intValue }));
              }}
              error={Boolean(dicErrors.countryId)}
              helperText={dicErrors.countryId}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": { minHeight: "56px !important" },
                "& .MuiAutocomplete-input": { paddingBottom: "16.5px !important", paddingTop: "16.5px !important" },
              }}
            />
            <TextField 
            controlId="state-master.dialog.name.input" 
            inputProps={{ "controlId": "state-master.dialog.name.input" }}
              required
              label={`${dicLabels.fieldName}`} value={dicForm.name} disabled={strMode === "view"}
              onChange={(objEvent) => { const strValue = objEvent.target.value; setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined })); setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue })); syncEnglishStateName(strValue); }} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth /><TextField controlId="state-master.dialog.code.input" inputProps={{ "controlId": "state-master.dialog.code.input" }}
                required
                label={`${dicLabels.fieldCode}`} 
                value={dicForm.code} 
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncStateCode(strValue);
                }}
                error={Boolean(dicErrors.code)} helperText={dicErrors.code} 
                fullWidth />
            {lstVisibleTranslationRows.length > 0 ? (
              <Box sx={{ gridColumn: "1 / -1", border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                  <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("language_translations", "Language Translations")}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>
                      {t("language_translations_help", "Provide translated state names for the application languages you want to support.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button className={styles.secondaryButton} variant="outlined" startIcon={<AutoAwesomeRoundedIcon />} onClick={() => void handleTranslateClick()} disabled={strMode === "view" || blnSubmitting || !dicForm.name.trim() || Boolean(dicTextTranslationLoading[lstVisibleTranslationRows[0]?.strRowID ?? ""])} sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}>
                        {t("translate", "AI Translate")}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
                  {lstVisibleTranslationRows.map((dicText) => (
                    <Box key={dicText.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                      <Typography component="label" htmlFor={`state-translation-${dicText.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        id={`state-translation-${dicText.strRowID}`}
                        controlId="state-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter state name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strStateName}
                        inputProps={{ "controlId": "state-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strStateName", objEvent.target.value)}
                        disabled={strMode === "view"}
                        sx={{ background: "#fff" }}
                        InputProps={{
                          endAdornment: dicTextTranslationLoading[dicText.strRowID] ? (
                            <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                          ) : undefined,
                        }}
                        fullWidth
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}
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

      <BlockingLoader blnOpen={blnSubmitting || ((blnLoading || blnRightsLoading) && !blnDialogOpen)}
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
