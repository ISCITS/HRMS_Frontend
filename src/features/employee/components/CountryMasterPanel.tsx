"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, CircularProgress, InputAdornment, MenuItem, Snackbar, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { countryService, createEmptyCountryTextRow, createInitialCountryForm, toCountryFormValues, type CountryFormValues, type CountryTextFormValue } from "@/features/employee/services/countryService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { type CountryApiRecord, type SimpleMasterFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type CountryRecord = { id: string; code: string; name: string; currencyCode: string; phoneCode: string; status: Status };
type SearchForm = { code: string; name: string; status: "All" | Status };
type ConfirmDialogState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> };
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type CountryTableRow = {
  id: string;
  select: ReactNode;
  rowActions: ReactNode;
  name: string;
  code: string;
  currencyCode: string;
  phoneCode: string;
  status: ReactNode;
};

const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstCountryModuleCodes = ["COUNTRY", "COUNTRIES"];

function mapCountryRecord(dicRecord: CountryApiRecord): CountryRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strCountryCode,
    name: dicRecord.strCountryName,
    currencyCode: dicRecord.strCurrencyCode,
    phoneCode: dicRecord.strPhoneCode ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
  };
}

export default function CountryMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("country");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstCountryModuleCodes);
  const [lstCountries, setLstCountries] = useState<CountryRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<SimpleMasterFormOptionsApiRecord>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<Mode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingId, setStrEditingId] = useState("");
  const [dicForm, setDicForm] = useState<CountryFormValues>(createInitialCountryForm());
  const [dicErrors, setDicErrors] = useState<Partial<Record<"code" | "name" | "currencyCode", string>>>({});
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [dicRowLabelsByLanguageID, setDicRowLabelsByLanguageID] = useState<Record<number, Record<string, string>>>({});
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
    save: t("save"),
    search: t("search"),
    update: t("update"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    loading: t("loading"),
    processing: t("processing"),
  };

  const dicModuleLabels = {
    backButton: t("back_button"),
    addButton: t("add_button"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableCurrency: t("table_currency"),
    tablePhoneCode: t("table_phone_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldCurrencyCode: t("field_currency_code"),
    fieldPhoneCode: t("field_phone_code"),
    fieldStatus: t("field_status"),
    fieldIsActive: t("field_is_active", "Is Active"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    requestFailed: t("request_failed"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
    validationCurrencyRequired: t("validation_currency_required"),
    validationCurrencyFormat: t("validation_currency_format"),
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
    close: t("close"),
  };

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;

  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objFormOptions.lstLanguages[0]?.intID ??
    1;

  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID() ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "hi")?.intID ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID ??
    intDefaultLanguageID;

  function buildFixedLanguageRow(
    intLanguageID: number,
    strCountryName: string,
    strCountryCode: string,
    lstExistingTexts: CountryTextFormValue[],
  ): CountryTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyCountryTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strCountryName,
      strCountryCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: CountryFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(intDefaultLanguageID, dicValues.name, dicValues.code, dicValues.lstTexts);
    const dicSecondaryExistingText = dicValues.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID);
    const dicSecondaryRow = buildFixedLanguageRow(intSecondaryLanguageID, dicSecondaryExistingText?.strCountryName ?? "", dicValues.code, dicValues.lstTexts);
    return { ...dicValues, lstTexts: [dicDefaultRow, dicSecondaryRow] };
  }

  function syncEnglishCountryName(strCountryName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0 ? { ...dicText, strCountryName } : dicText),
      };
    });
  }

  function syncCountryCode(strCountryCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({ ...dicText, strCountryCode })),
    }));
  }

  function updateTextRow(strRowID: string, strField: keyof CountryTextFormValue, objValue: string | number) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => {
        if (dicText.strRowID !== strRowID) {
          return dicText;
        }
        if (strField === "intLanguageID") {
          const dicLanguage = objFormOptions.lstLanguages.find((dicOption) => dicOption.intID === Number(objValue));
          return { ...dicText, intLanguageID: Number(objValue), strLanguageName: dicLanguage?.strLabel ?? "" };
        }
        return { ...dicText, [strField]: objValue };
      }),
    }));
  }

  async function translateTextRow(strRowID: string, intLanguageID: number) {
    const dicSelectedLanguage = objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intLanguageID);
    const strSourceCountryName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceCountryName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    if (dicCurrentRow?.strCountryName.trim() && strLastTranslatedSource === strSourceCountryName) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await countryService.translateCountryText(strSourceCountryName, intDefaultLanguageID, intLanguageID);
      setDicForm((dicPrevious) => ({
        ...dicPrevious,
        lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID
          ? { ...dicText, intLanguageID, strLanguageName: dicSelectedLanguage.strLabel, strCountryName: strTranslatedName }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({ ...dicPrevious, [strRowID]: strSourceCountryName }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error");
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  async function handleTranslateClick() {
    const dicSecondaryRow = dicForm.lstTexts[1];
    if (!dicSecondaryRow) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID));
  }

  async function loadCountries() {
    if (!canViewAny()) {
      setLstCountries([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);

    await runFrontendAction({
      fnAction: () => masterApiService.getCountries(),
      fnOnSuccess: (objResult) => {
        setLstCountries(objResult.Data.map(mapCountryRecord));
        setLstSelectedIds([]);
      },
      fnOnError: (objError) => showToast(objError.message, "error"),
      fnFinally: () => setBlnLoading(false),
      strFallbackMessage: dicModuleLabels.requestFailed,
    });
  }

  useEffect(() => {
    let blnMounted = true;
    countryService.getCountryFormOptions()
      .then((dicOptions) => {
        if (blnMounted) {
          setObjFormOptions(dicOptions);
        }
      })
      .catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, []);

  useEffect(() => {
    if (objFormOptions.lstLanguages.length > 0) {
      setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
    }
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions.lstLanguages.length]);

  useEffect(() => {
    let blnMounted = true;
    const lstLanguageIDs = Array.from(
      new Set(
        dicForm.lstTexts
          .map((dicText) => Number(dicText.intLanguageID))
          .filter((intLanguageID) => Number.isFinite(intLanguageID) && intLanguageID > 0),
      ),
    );
    const lstLanguageIDsToLoad = lstLanguageIDs.filter((intLanguageID) => !dicRowLabelsByLanguageID[intLanguageID]);
    if (lstLanguageIDsToLoad.length === 0) {
      return () => {
        blnMounted = false;
      };
    }

    void Promise.all(
      lstLanguageIDsToLoad.map(async (intLanguageID) => ({
        intLanguageID,
        dicLabels: (await labelService.getModuleLabels(intLanguageID, "country")).labels ?? {},
      })),
    ).then((lstResponses) => {
      if (!blnMounted) {
        return;
      }
      setDicRowLabelsByLanguageID((dicPrevious) => {
        const dicNext = { ...dicPrevious };
        for (const { intLanguageID, dicLabels } of lstResponses) {
          dicNext[intLanguageID] = dicLabels;
        }
        return dicNext;
      });
    });

    return () => {
      blnMounted = false;
    };
  }, [dicForm.lstTexts, dicRowLabelsByLanguageID]);

  useEffect(() => {
    if (!blnRightsLoading) {
      void loadCountries();
    }
  }, [blnRightsLoading, blnCanView]);

  function getRowLabel(intLanguageID: number | "", strKey: string, strFallback: string) {
    const intResolvedLanguageID = Number(intLanguageID);
    return Number.isFinite(intResolvedLanguageID) && intResolvedLanguageID > 0
      ? dicRowLabelsByLanguageID[intResolvedLanguageID]?.[strKey] ?? strFallback
      : strFallback;
  }

  const lstFiltered = useMemo(() => lstCountries.filter((dicCountry) => {
    const blnCodeMatch = !dicSearchApplied.code || dicCountry.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicCountry.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicCountry.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstCountries]);

  const blnAllFilteredSelected = lstFiltered.length > 0 && lstFiltered.every((dicCountry) => lstSelectedIds.includes(dicCountry.id));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstSelectedIds.some((strId) => lstFiltered.some((dicCountry) => dicCountry.id === strId));

  function toggleSelection(strId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strId)
      ? lstPrevious.filter((strValue) => strValue !== strId)
      : [...lstPrevious, strId]);
  }

  const lstTableRows = useMemo<CountryTableRow[]>(() => lstFiltered.map((dicCountry) => {
    const blnSelected = lstSelectedIds.includes(dicCountry.id);
    return {
      id: dicCountry.id,
      select: <Checkbox checked={blnSelected} onChange={() => toggleSelection(dicCountry.id)} inputProps={{ "controlId": "country-master.list.row.select.checkbox", "data-row-key": dicCountry.id } as InputHTMLAttributes<HTMLInputElement>} />,
      rowActions: (
        <CommonRowActions
          blnCanView={blnCanView}
          blnCanEdit={blnCanEdit}
          blnCanDelete={blnCanDelete}
          onView={() => void openDialog("view", dicCountry)}
          onEdit={() => void openDialog("edit", dicCountry)}
          onDelete={() => deleteRecord(dicCountry.id)}
          testIdPrefix="country-master.list.row"
          rowKey={dicCountry.id}
        />
      ),
      name: dicCountry.name,
      code: dicCountry.code,
      currencyCode: dicCountry.currencyCode,
      phoneCode: dicCountry.phoneCode || "-",
      status: (
        <span className={`${styles.statusPill} ${dicCountry.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
          {dicCountry.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
        </span>
      ),
    };
  }), [blnCanChangeStatus, blnCanDelete, blnCanEdit, blnCanView, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFiltered, lstSelectedIds]);

  const lstTableColumns = useMemo<CommonTableColumn<CountryTableRow>[]>(() => [
    {
      field: "select",
      headerName: (
        <Checkbox
          checked={blnAllFilteredSelected}
          indeterminate={blnSomeFilteredSelected}
          onChange={toggleSelectAll}
          disabled={lstFiltered.length === 0}
          inputProps={{ "controlId": "country-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
      width: 64,
      sortable: false,
      filterable: false,
      exportable: false
    },
    { field: "rowActions", headerName: dicModuleLabels.tableActions, width: 150, sortable: false, filterable: false, exportable: false },
    { field: "name", headerName: dicModuleLabels.tableName },
    { field: "code", headerName: dicModuleLabels.tableCode },
    { field: "currencyCode", headerName: dicModuleLabels.tableCurrency },
    { field: "phoneCode", headerName: dicModuleLabels.tablePhoneCode },
    { field: "status", headerName: dicModuleLabels.tableStatus, sortable: false, filterable: false },
  ], [blnAllFilteredSelected, blnSomeFilteredSelected, dicModuleLabels.tableActions, dicModuleLabels.tableCode, dicModuleLabels.tableCurrency, dicModuleLabels.tableName, dicModuleLabels.tablePhoneCode, dicModuleLabels.tableStatus, lstFiltered.length]);

  async function ensureCountryFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await countryService.getCountryFormOptions();
    setObjFormOptions(dicOptions);
    return dicOptions;
  }

  async function openDialog(strNextMode: Mode, dicCountry?: CountryRecord) {
    const dicOptions = await ensureCountryFormOptionsLoaded();
    setStrMode(strNextMode);
    setStrEditingId(dicCountry?.id ?? "");
    setDicErrors({});
    setDicLastTranslatedSourceByRow({});
    setDicTextTranslationLoading({});
    if (!dicCountry) {
      setDicForm(ensureTenantLanguageRows(createInitialCountryForm()));
      setBlnDialogOpen(true);
      return;
    }
    const dicCountryDetail = await countryService.getCountry(Number(dicCountry.id), intDefaultLanguageID);
    setDicForm(ensureTenantLanguageRows(toCountryFormValues(dicCountryDetail, dicOptions)));
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

    await runFrontendAction({
      fnAction: objConfirmDialog.fnOnConfirm,
      fnOnError: (objError) => showToast(objError.message, "error"),
      fnFinally: () => {
        setBlnSubmitting(false);
        closeConfirmDialog();
      },
      strFallbackMessage: dicModuleLabels.requestFailed,
    });
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<"code" | "name" | "currencyCode", string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCurrencyCode = dicForm.currencyCode.trim().toUpperCase();

    if (!strCode) {
      dicNextErrors.code = dicModuleLabels.validationCodeRequired;
    } else if (!/^[A-Z]{2}$/.test(strCode)) {
      dicNextErrors.code = dicModuleLabels.validationCodeFormat;
    }

    if (!strName) {
      dicNextErrors.name = dicModuleLabels.validationNameRequired;
    } else if (strName.length < 2) {
      dicNextErrors.name = dicModuleLabels.validationNameMin;
    }

    if (!strCurrencyCode) {
      dicNextErrors.currencyCode = dicModuleLabels.validationCurrencyRequired;
    } else if (!/^[A-Z]{3}$/.test(strCurrencyCode)) {
      dicNextErrors.currencyCode = dicModuleLabels.validationCurrencyFormat;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCountry() {
    if (!validateForm()) {
      return;
    }

    setBlnSubmitting(true);

    void runFrontendAction({
      fnAction: () => strMode === "add" ? countryService.createCountry(dicForm) : countryService.updateCountry(Number(strEditingId), dicForm),
      fnOnSuccess: async () => {
        await loadCountries();
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      },
      fnOnError: (objError) => showToast(objError.message, "error"),
      fnFinally: () => setBlnSubmitting(false),
      strFallbackMessage: dicModuleLabels.requestFailed,
    });
  }

  function toggleSelectAll() {
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstFiltered.some((dicCountry) => dicCountry.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFiltered.map((dicCountry) => dicCountry.id)])]);
  }

  function bulkUpdateStatus(strStatus: Status) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicModuleLabels.confirmBulkActivateTitle : dicModuleLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicModuleLabels.confirmBulkActivateMessage : dicModuleLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicModuleLabels.bulkActivate : dicModuleLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadCountries();
        showToast(strStatus === "Active" ? dicModuleLabels.bulkActivateSuccess : dicModuleLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmBulkDeleteTitle,
      strMessage: dicModuleLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicModuleLabels.bulkDelete,
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryDelete(lstSelectedIds.map(Number));
        await loadCountries();
        showToast(dicModuleLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteRecord(strId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: t("delete"),
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryDelete([Number(strId)]);
        await loadCountries();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()} controlId="country-master.back.button">
          {dicModuleLabels.backButton}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Country.")}
          </Typography>
        ) : null}

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth controlId="country-master.search.name.input" />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth controlId="country-master.search.code.input" />
          <TextField select label={dicModuleLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth controlId="country-master.search.status.select">
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting} controlId="country-master.search.button">
              {dicCommonLabels.search}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting} controlId="country-master.clear.button">
              {dicCommonLabels.clear}
            </Button>
          </Box>
        </Box>

        {lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
            {blnCanChangeStatus ? <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting} controlId="country-master.bulk-activate.button">{dicModuleLabels.bulkActivate}</Button> : null}
            {blnCanChangeStatus ? <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting} controlId="country-master.bulk-deactivate.button">{dicModuleLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting} controlId="country-master.bulk-delete.button">{dicModuleLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        {blnRightsLoading || blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Country access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need country visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            emptyMessage={dicModuleLabels.emptyMessage}
            exportFileName="country-master"
            showExportOptions={blnCanExport}
            testIdPrefix="country-master.list"
            showPaginationSummary
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => void openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading} controlId="country-master.add.button">{dicModuleLabels.addButton}</Button> : null}
                <Checkbox checked={blnAllFilteredSelected} indeterminate={blnSomeFilteredSelected} onChange={toggleSelectAll} disabled={lstFiltered.length === 0} sx={{ alignSelf: "center" }} inputProps={{ "controlId": "country-master.toolbar.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />
              </Box>
            )}
            getRowSx={(dicRow) => lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        strTitle={strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicModuleLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicCommonLabels.processing : strMode === "add" ? dicCommonLabels.save : dicCommonLabels.update}
        onPrimaryAction={saveCountry}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        rootTestId="country-master.dialog"
        cancelButtonTestId="country-master.dialog.cancel.button"
        primaryButtonTestId="country-master.dialog.primary.button"
        paperClassName={styles.compactDialogPaper}
        paperSx={{
          width: "min(800px, calc(100vw - 32px)) !important",
          maxWidth: "800px !important",
          overflow: "hidden",
          m: 2,
        }}
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel}>{dicModuleLabels.fieldIsActive}</Typography>
            <ActiveStatusSwitch blnIsActive={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} testId="country-master.dialog.status.switch" />
          </Box>
        }
         titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        nodeContent={(
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box sx={{ display: "grid", gap: 1.6, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, alignItems: "start" }}>
              <TextField
                required
                label={`${dicModuleLabels.fieldName}`}
                value={dicForm.name}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishCountryName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                controlId="country-master.dialog.name.input"
                fullWidth
              />
              <TextField
                required
                label={`${dicModuleLabels.fieldCode}`}
                value={dicForm.code}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncCountryCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                controlId="country-master.dialog.code.input"
                fullWidth
              />
              <TextField
                required
                label={`${dicModuleLabels.fieldCurrencyCode}`}
                value={dicForm.currencyCode}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, currencyCode: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, currencyCode: strValue }));
                }}
                error={Boolean(dicErrors.currencyCode)}
                helperText={dicErrors.currencyCode}
                controlId="country-master.dialog.currency-code.input"
                fullWidth
              />
              <TextField
                label={dicModuleLabels.fieldPhoneCode}
                value={dicForm.phoneCode}
                disabled={strMode === "view"}
                onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, phoneCode: objEvent.target.value }))}
                controlId="country-master.dialog.phone-code.input"
                fullWidth
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
                  {t("multilingual_text_help", "Add translated country names for supported languages.")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
                <Button variant="outlined" startIcon={<AddRoundedIcon />} disabled controlId="country-master.dialog.add-language.button">
                  {t("add_language", "Add Language")}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void handleTranslateClick()}
                  disabled={strMode === "view" || blnSubmitting || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
                  controlId="country-master.dialog.translate.button"
                  sx={{ minWidth: 108, borderRadius: "12px", background: "#2563eb", boxShadow: "none", "&:hover": { background: "#1d4ed8", boxShadow: "none" } }}
                >
                  {dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""] ? (
                    <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                  ) : (
                    t("translate", "AI Translate")
                  )}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gap: 1.2 }}>
              {dicForm.lstTexts.map((dicText, intIndex) => (
                <Box
                  key={dicText.strRowID}
                  sx={{
                    display: "grid",
                    gap: 1.2,
                    gridTemplateColumns: { xs: "1fr", md: "minmax(0, 0.95fr) minmax(0, 1.35fr) minmax(0, 0.95fr)" },
                    alignItems: "start",
                    border: "1px solid rgba(203,213,225,0.8)",
                    borderRadius: "16px",
                    p: 1.2,
                    background: "#f8fafc",
                  }}
                >
                  <TextField
                    select
                    label={getRowLabel(dicText.intLanguageID, "language", t("language", "Language"))}
                    value={dicText.intLanguageID}
                    InputLabelProps={{ shrink: true }}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (objValue) =>
                        objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(objValue))?.strLabel ??
                        dicText.strLanguageName ??
                        "",
                    }}
                    disabled
                    controlId="country-master.dialog.translation.language.select"
                    fullWidth
                  >
                    {objFormOptions.lstLanguages.map((dicLanguage) => (
                      <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicModuleLabels.fieldName)}
                    value={dicText.strCountryName}
                    onChange={(objEvent) => {
                      const strValue = objEvent.target.value;
                      updateTextRow(dicText.strRowID, "strCountryName", strValue);
                      if (intIndex === 0) {
                        setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                        setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                      }
                    }}
                    disabled={strMode === "view" || intIndex === 0}
                    controlId="country-master.dialog.translation.name.input"
                    InputProps={{
                      endAdornment: dicTextTranslationLoading[dicText.strRowID]
                        ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                        : undefined,
                    }}
                    fullWidth
                  />
                  <TextField
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicModuleLabels.fieldCode)}
                    value={dicText.strCountryCode}
                    disabled
                    controlId="country-master.dialog.translation.code.input"
                    fullWidth
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      />

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicModuleLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        rootTestId="country-master.confirm.dialog"
        cancelButtonTestId="country-master.confirm.cancel.button"
        confirmButtonTestId="country-master.confirm.confirm.button"
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
