"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Breadcrumbs, Button, Checkbox, CircularProgress, IconButton, InputAdornment, Link, MenuItem, Skeleton, Snackbar, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
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
const intStateSkeletonRows = 8;

function StateGridSkeleton() {
  return (
    <Box
      data-control-id="state-master.list.skeleton"
      sx={{ border: "1px solid #e8eef5", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={112} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 900 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "48px 1.3fr 0.8fr 1fr 0.8fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2, 3, 4].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 0 ? 18 : intColumn === 4 ? 76 : 118} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intStateSkeletonRows }).map((_, intIndex) => (
          <Box key={intIndex} sx={{ display: "grid", gridTemplateColumns: "48px 1.3fr 0.8fr 1fr 0.8fr", borderBottom: "1px solid #edf1f6", minHeight: 40, alignItems: "center" }}>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={18} height={18} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${48 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${60 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={72} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

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
  const objNameInputRef = useRef<HTMLInputElement>(null);
  const objCodeInputRef = useRef<HTMLInputElement>(null);
  const strPendingErrorFocusRef = useRef<"countryId" | "name" | "code" | null>(null);
  const blnOpeningStateRef = useRef(false);

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
    pageTitle: stripMasterTitle(t("page_title", dicConstant.states.pageTitle)),
    backButton: t("back_button"),
    addButton: t("add_button"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    exportFileName: t("export_file_name", "state-master"),
    tableCountry: t("table_country", dicConstant.states.grid.country),
    tableName: t("table_name", dicConstant.states.grid.name),
    tableCode: t("table_code", dicConstant.states.grid.code),
    tableStatus: t("table_status", dicConstant.states.grid.status),
    emptyMessage: t("empty_message"),
    fieldCountry: t("field_country"),
    fieldName: t("field_name", dicConstant.states.fields.name),
    fieldCode: t("field_code", dicConstant.states.fields.code),
    fieldIsActive: t("field_is_active", "Is Active"),
    selectCountry: t("select_country"),
    saving: t("saving", "Saving..."),
    requestFailed: t("request_failed"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
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
    validationCountryRequired: t("validation_country_required", "Country is required."),
    validationCodeRequired: t("validation_code_required", dicConstant.states.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.states.validation.codeFormat),
    validationNameRequired: t("validation_name_required", dicConstant.states.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.states.validation.nameMin),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.states.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.states.validation.nameDuplicate),
  };

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;
  const blnSearchPanelFrozen = blnLoading || blnSubmitting || blnRightsLoading;
  const intLanguageID = authHelpers.getLanguageID() ?? 1;
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function focusCountryInput() {
    const objInput = document.querySelector<HTMLInputElement>('[data-control-id="state-master.dialog.country.select"] input, input[data-control-id="state-master.dialog.country.select"]');
    objInput?.focus();
  }

  function buildFixedLanguageRow(
    intTargetLanguageID: number,
    strStateName: string,
    strStateCode: string,
    lstExistingTexts: StateTextFormValue[],
    objOptions: StateFormOptionsApiRecord = objFormOptions,
  ): StateTextFormValue {
    const dicLanguage = objOptions.lstLanguages.find((dicItem) => dicItem.intID === intTargetLanguageID);
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

  function ensureTenantLanguageRows(dicValues: StateFormValues, objOptions: StateFormOptionsApiRecord = objFormOptions) {
    const dicDefaultRow = buildFixedLanguageRow(intDefaultLanguageID, dicValues.name, dicValues.code, dicValues.lstTexts, objOptions);
    if (!intSecondaryLanguageID) {
      return { ...dicValues, lstTexts: [dicDefaultRow] };
    }
    const dicSecondaryExistingText = dicValues.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID);
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strStateName ?? "",
      dicValues.code,
      dicValues.lstTexts,
      objOptions,
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

  const lstVisibleTranslationRows = dicForm.lstTexts.filter((dicText) => {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === Number(dicText.intLanguageID));
    const strCode = dicLanguage?.strCode?.trim().toLowerCase() ?? "";
    const strName = (dicLanguage?.strLabel ?? dicText.strLanguageName).trim().toLowerCase();
    return Number(dicText.intLanguageID) !== intDefaultLanguageID &&
      !/^es(?:[-_]|$)/.test(strCode) && !["spa", "spanish", "espa?ol", "espanol"].includes(strCode) &&
      !/spanish|espa?ol|espanol/.test(strName);
  });

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

  useEffect(() => {
    if (objFormOptions.lstLanguages.length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions.lstLanguages.length]);

  useEffect(() => {
    if (!blnDialogOpen || strMode === "view") return;
    const strField = strPendingErrorFocusRef.current;
    strPendingErrorFocusRef.current = null;
    if (strField === "countryId") {
      focusCountryInput();
    } else if (strField === "name") {
      objNameInputRef.current?.focus();
    } else if (strField === "code") {
      objCodeInputRef.current?.focus();
    }
  }, [blnDialogOpen, dicErrors, strMode]);

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((dicPrevious) => ({ ...dicPrevious, blnOpen: false }));
  }

  function closeDialog() {
    strPendingErrorFocusRef.current = null;
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

  function openDialog(strNextMode: Mode, dicRow?: StateRecord) {
    if (blnOpeningStateRef.current) return;
    setStrMode(strNextMode === "edit" && !blnCanEdit ? "view" : strNextMode);
    setStrEditingId(dicRow?.id ?? "");
    strPendingErrorFocusRef.current = null;
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    blnOpeningStateRef.current = true;
    setBlnSubmitting(true);
    ensureFormOptionsLoaded()
      .then((objOptions) => {
        if (!dicRow) {
          setDicForm(ensureTenantLanguageRows(createInitialStateForm(), objOptions));
          setBlnDialogOpen(true);
          return;
        }
        return stateService.getState(Number(dicRow.id), intLanguageID).then((dicDetail) => {
          setDicForm(ensureTenantLanguageRows(toStateFormValues(dicDetail, objOptions), objOptions));
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error"))
      .finally(() => {
        blnOpeningStateRef.current = false;
        setBlnSubmitting(false);
      });
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
    } else if (strName.length < 3) {
      dicNextErrors.name = dicLabels.validationNameMin;
    }
    if (lstStates.some((dicState) => dicState.code.toUpperCase() === strCode && dicState.id !== strEditingId)) {
      dicNextErrors.code = dicLabels.validationCodeDuplicate;
    }
    if (lstStates.some((dicState) => dicState.name.trim().toLowerCase() === strName.toLowerCase() && dicState.id !== strEditingId)) {
      dicNextErrors.name = dicLabels.validationNameDuplicate;
    }
    strPendingErrorFocusRef.current = dicNextErrors.countryId ? "countryId" : dicNextErrors.name ? "name" : dicNextErrors.code ? "code" : null;
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveState() {
    if (!validateForm()) {
      return;
    }
    const dicPayload = ensureTenantLanguageRows({
      ...dicForm,
      code: dicForm.code.trim().toUpperCase(),
      name: dicForm.name.trim(),
    });
    setBlnSubmitting(true);
    const objRequest = strMode === "add"
      ? stateService.createState(dicPayload)
      : stateService.updateState(Number(strEditingId), dicPayload);
    objRequest
      .then(() => loadData())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicLabels.saveSuccess : dicLabels.updateSuccess);
      })
      .catch((objError) => {
        const strMessage = objError instanceof Error ? objError.message : dicLabels.requestFailed;
        const blnCodeError = /state code/i.test(strMessage) && !/state name/i.test(strMessage);
        const blnNameError = /state name/i.test(strMessage) && !/state code/i.test(strMessage);
        if (blnCodeError || blnNameError) {
          strPendingErrorFocusRef.current = blnCodeError ? "code" : "name";
          setDicErrors({ [blnCodeError ? "code" : "name"]: strMessage });
        } else {
          showToast(strMessage, "error");
        }
      })
      .finally(() => setBlnSubmitting(false));
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

  const lstTableRows = useMemo(() => lstFiltered.map((dicState) => {
    const blnSelected = lstSelectedIds.includes(dicState.id);
    return {
      id: dicState.id,
      select: <Checkbox controlId="state-master.list.row.select.checkbox" checked={blnSelected} onChange={() => toggleSelection(dicState.id)} inputProps={{ "controlId": "state-master.list.row.select.checkbox", "data-row-key": dicState.id } as InputHTMLAttributes<HTMLInputElement>} />,
      countryName: dicState.countryName || "-",
      nameText: dicState.name,
      name: (
        <Link
          component="button"
          type="button"
          underline="none"
          disabled={!blnCanView && !blnCanEdit}
          data-control-id="state-master.list.row.name.button"
          onClick={(objEvent) => {
            if (window.getSelection()?.toString()) {
              objEvent.stopPropagation();
              return;
            }
            openDialog(blnCanEdit ? "edit" : "view", dicState);
          }}
          sx={{ color: "#334155", cursor: "pointer", fontSize: "inherit", fontWeight: 500, textAlign: "left", textUnderlineOffset: "3px", userSelect: "text", WebkitUserSelect: "text", "&:hover": { color: "#0066df", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}
        >
          {dicState.name}
        </Link>
      ),
      code: dicState.code,
      status: <span className={`${styles.statusPill} ${dicState.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicState.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span>,
      statusSortValue: dicState.status,
    };
  }), [blnCanEdit, blnCanView, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFiltered, lstSelectedIds]);

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
    { field: "name", headerName: dicLabels.tableName, sortAccessor: (dicRow) => dicRow.nameText },
    { field: "code", headerName: dicLabels.tableCode },
    { field: "countryName", headerName: dicLabels.tableCountry },
    { field: "status", headerName: dicLabels.tableStatus, filterable: false, width: 130, sortAccessor: (dicRow) => dicRow.statusSortValue },
  ], [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels.tableCode, dicLabels.tableCountry, dicLabels.tableName, dicLabels.tableStatus, lstFiltered.length]);

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>{t("breadcrumb_states", dicLabels.pageTitle)}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", "You have view-only access for State.")}</Typography> : null}
        <Box className={styles.searchRow} aria-busy={blnSearchPanelFrozen} sx={{ alignItems: "center", "& .MuiButton-root": { alignSelf: "center" } }}>
          <TextField className="app-mui-text-field" id="state-search-name" controlId="state-master.list.search-name.input" inputProps={{ "controlId": "state-master.list.search-name.input" }} label={dicLabels.tableName} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="state-search-code" controlId="state-master.list.search-code.input" inputProps={{ "controlId": "state-master.list.search-code.input" }} label={dicLabels.tableCode} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="state-search-status" controlId="state-master.list.search-status.select" inputProps={{ "controlId": "state-master.list.search-status.select" }} select label={dicLabels.tableStatus} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" disabled={blnSearchPanelFrozen} fullWidth>
            <MenuItem controlId="state-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="state-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="state-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button data-control-id="state-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnSearchPanelFrozen}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="state-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnSearchPanelFrozen}>{dicCommonLabels.clear}</Button></Box>
        </Box>
        {!blnSubmitting && lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicLabels.bulkRowsSelected}`}</Typography>{blnCanChangeStatus ? <Button controlId="state-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicLabels.bulkActivate}</Button> : null}{blnCanChangeStatus ? <Button controlId="state-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicLabels.bulkDeactivate}</Button> : null}{blnCanDelete ? <Button controlId="state-master.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicLabels.bulkDelete}</Button> : null}</Box>
        ) : null}
      </Box>
      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {(blnLoading || blnRightsLoading) && !blnDialogOpen ? (
          <StateGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}><Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "State access is not available for your user group.")}</Typography><Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need state visibility.")}</Typography></Box>
        ) : (
          <CommonTable columns={lstTableColumns} rows={lstTableRows} rowIdField="id" exportFileName={dicLabels.exportFileName} showExportOptions={blnCanExport} testIdPrefix="state-master.list" showPaginationSummary hideRowClickHint onRowClick={(dicRow) => { if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return; const dicState = lstStates.find((dicItem) => dicItem.id === dicRow.id); if (dicState) openDialog(blnCanEdit ? "edit" : "view", dicState); }} minTableWidth={900} emptyMessage={dicLabels.emptyMessage} toolbarLeft={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>{blnCanAdd ? <Button data-control-id="state-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicLabels.addButton}</Button> : null}</Box>} getRowSx={() => ({ backgroundColor: "#fff", "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" } })} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />
        )}
        <BlockingLoader blnOpen={blnSubmitting} strLabel={dicCommonLabels.processing} intZIndex={1400} blnLocal />
      </Box>
      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") {
            closeDialog();
          }
        }}
        rootTestId="state-master.dialog"
        cancelButtonTestId="state-master.dialog.cancel.button"
        primaryButtonTestId="state-master.dialog.save.button"
        strTitle={strMode === "add" ? dicLabels.dialogAddTitle : strMode === "edit" ? dicLabels.dialogEditTitle : dicLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveState}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>{t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
        paperClassName={styles.departmentDialogPaper}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        maxWidth={false}
        fullWidth={false}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch
              testId="state-master.dialog.active.switch"
              blnIsActive={dicForm.status === "Active"}
              disabled={strMode === "view"}
              sx={{
                width: 40,
                height: 22,
                p: 0,
                overflow: "visible",
                "& .MuiSwitch-switchBase": {
                  p: "3px",
                  color: "#fff",
                  transitionDuration: "180ms",
                  "&.Mui-checked": {
                    transform: "translateX(18px)",
                    color: "#fff",
                    "& + .MuiSwitch-track": { backgroundColor: "#00b86b", opacity: 1 },
                  },
                  "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
                },
                "& .MuiSwitch-thumb": { width: 16, height: 16, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)" },
                "& .MuiSwitch-track": { borderRadius: "11px", backgroundColor: "#98a2b3", opacity: 1, transition: "background-color 180ms" },
              }}
              onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))}
            />
            <Typography className={styles.switchLabel} sx={{ fontSize: "12px !important", fontWeight: "600 !important", whiteSpace: "nowrap" }}>
              {dicCommonLabels.statusActive}
            </Typography>
            <IconButton aria-label={dicCommonLabels.close} onClick={closeDialog} size="small" sx={{ ml: 1, color: "#94a3b8" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: "12px" }}>
            <Box sx={{ display: "grid", columnGap: 1.6, rowGap: "12px", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
              {strMode === "add" ? (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("basic_information", "Basic Information")}</Typography>
                  <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25, mb: 1 }}>{t("basic_information_help", "Create a new state for your organisation.")}</Typography>
                </Box>
              ) : null}
              <TextField
                className="app-mui-text-field"
                controlId="state-master.dialog.name.input"
                inputRef={objNameInputRef}
                autoFocus={strMode !== "view"}
                inputProps={{ "controlId": "state-master.dialog.name.input" }}
                required
                label={dicLabels.fieldName}
                placeholder={t("dialog_name_placeholder", "Enter state name")}
                size="small"
                value={dicForm.name}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishStateName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                fullWidth
              />
              <TextField
                className="app-mui-text-field"
                controlId="state-master.dialog.code.input"
                inputRef={objCodeInputRef}
                inputProps={{ "controlId": "state-master.dialog.code.input" }}
                required
                label={dicLabels.fieldCode}
                placeholder={t("dialog_code_placeholder", "Enter state code")}
                size="small"
                value={dicForm.code}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncStateCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                fullWidth
              />
              <CommonSearchableSelect
                className="app-mui-text-field"
                controlId="state-master.dialog.country.select"
                required
                label={dicLabels.fieldCountry}
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
              />
            </Box>
            {lstVisibleTranslationRows.length > 0 ? (
              <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
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
