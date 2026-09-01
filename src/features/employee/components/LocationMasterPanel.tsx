"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { LocationApiRecord, LocationFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";
import {
  createEmptyLocationTextRow,
  createInitialLocationForm,
  locationService,
  toLocationFormValues,
  type LocationFormValues,
  type LocationTextFormValue,
} from "@/features/employee/services/locationService";

type LocationStatus = "Active" | "Inactive";
type LocationMode = "add" | "edit" | "view";

type LocationRecord = {
  id: string;
  code: string;
  name: string;
  intStateID: number | "";
  strStateName: string;
  strCityName: string;
  status: LocationStatus;
};

type LocationTableRow = {
  id: string;
  action: ReactNode;
  name: string;
  code: string;
  state: string;
  city: string;
  status: ReactNode;
  statusSortValue: string;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | LocationStatus;
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

const dicEmptyForm = createInitialLocationForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultLocations: LocationRecord[] = [];
const lstLocationModuleCodes = ["LOCATION", "LOCATIONS"];

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapLocationRecord(dicRecord: LocationApiRecord): LocationRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strLocationCode,
    name: dicRecord.strLocationName,
    intStateID: dicRecord.intStateID ?? "",
    strStateName: dicRecord.strStateName ?? "",
    strCityName: dicRecord.strCityName ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

// Location master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function LocationMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("location");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstLocationModuleCodes);
  const [lstLocations, setLstLocations] = useState<LocationRecord[]>(lstDefaultLocations);
  const [objFormOptions, setObjFormOptions] = useState<LocationFormOptionsApiRecord>({ lstLanguages: [], lstStates: [] });
  const [strMode, setStrMode] = useState<LocationMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingLocationId, setStrEditingLocationId] = useState("");
  const [dicForm, setDicForm] = useState<LocationFormValues>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<"code" | "name" | "strCityName", string>>>({});
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [dicRowLabelsByLanguageID, setDicRowLabelsByLanguageID] = useState<Record<number, Record<string, string>>>({});

  const dicCommonLabels = {
    cancel: t("cancel"),
    clear: t("clear"),
    close: t("close"),
    delete: t("delete"),
    exportExcel: t("export_excel"),
    exportPdf: t("export_pdf"),
    save: t("save"),
    search: t("search"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    rowsPerPage: t("rows_per_page"),
    paginationSeparator: t("pagination_separator"),
    loading: t("loading"),
    processing: t("processing"),
  };
  const dicModuleLabels = {
    breadcrumbs: t("breadcrumbs"),
    pageTitle: stripMasterTitle(t("page_title")),
    backButton: t("back_button"),
    addButton: t("add_button"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    exportTitle: stripMasterTitle(t("export_title")),
    exportFileName: t("export_file_name"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    bulkApplyingChanges: t("bulk_applying_changes"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    emptyMessage: t("empty_message"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    requestFailed: t("request_failed"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title"),
    confirmBulkDeleteTitle: t("confirm_bulk_delete_title"),
    confirmDeleteTitle: t("confirm_delete_title"),
    confirmActivateTitle: t("confirm_activate_title"),
    confirmDeactivateTitle: t("confirm_deactivate_title"),
    confirmBulkActivateLabel: t("confirm_bulk_activate_label"),
    confirmBulkDeactivateLabel: t("confirm_bulk_deactivate_label"),
    confirmBulkDeleteLabel: t("confirm_bulk_delete_label"),
    confirmActivateLabel: t("confirm_activate_label"),
    confirmDeactivateLabel: t("confirm_deactivate_label"),
    confirmDeleteLabel: t("confirm_delete_label"),
    confirmButton: t("confirm_button"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message"),
    confirmBulkDeleteMessage: t("confirm_bulk_delete_message"),
    confirmDeleteMessage: t("confirm_delete_message"),
    confirmActivateMessage: t("confirm_activate_message"),
    confirmDeactivateMessage: t("confirm_deactivate_message"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldStatus: t("field_status"),
    fieldIsActive: t("field_is_active", "Is Active"),
    saving: t("saving", "Saving..."),
    fieldState: t("field_state"),
    fieldCity: t("field_city"),
    selectState: t("select_state"),
    validationNameRequired: t("validation_name_required", dicConstant.locations.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.locations.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.locations.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.locations.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.locations.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.locations.validation.nameDuplicate),
    validationCityMax: t("validation_city_max"),
  };

  async function loadLocations() {
    // Reload from the backend after every mutation so pagination, selection, and DB state stay in sync.
    if (!canViewAny()) {
      setLstLocations([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const [objListResult, objOptionResult] = await Promise.all([
        masterApiService.getLocations(),
        masterApiService.getLocationFormOptions(),
      ]);
      setLstLocations(objListResult.Data.map(mapLocationRecord));
      setObjFormOptions(objOptionResult.Data);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!canViewAny()) {
      setLstLocations([]);
      setBlnLoading(false);
      return;
    }
    loadLocations().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID() ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "hi")?.intID ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID ??
    intDefaultLanguageID;

  function buildFixedLanguageRow(
    intLanguageID: number,
    strLocationName: string,
    strLocationCode: string,
    lstExistingTexts: LocationTextFormValue[],
  ): LocationTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyLocationTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strLocationName,
      strLocationCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: LocationFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.name,
      dicValues.code,
      dicValues.lstTexts,
    );
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID,
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strLocationName ?? "",
      dicValues.code,
      dicValues.lstTexts,
    );
    return {
      ...dicValues,
      lstTexts: [dicDefaultRow, dicSecondaryRow],
    };
  }

  function syncEnglishLocationName(strLocationName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? { ...dicText, strLocationName }
          : dicText),
      };
    });
  }

  function syncLocationCode(strLocationCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({
        ...dicText,
        strLocationCode,
      })),
    }));
  }

  function updateTextRow(
    strRowID: string,
    strField: keyof LocationTextFormValue,
    objValue: string | number,
  ) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => {
        if (dicText.strRowID !== strRowID) {
          return dicText;
        }
        if (strField === "intLanguageID") {
          const dicLanguage = objFormOptions.lstLanguages.find((dicOption) => dicOption.intID === Number(objValue));
          return {
            ...dicText,
            intLanguageID: Number(objValue),
            strLanguageName: dicLanguage?.strLabel ?? "",
          };
        }
        return { ...dicText, [strField]: objValue };
      }),
    }));
  }

  async function translateTextRow(strRowID: string, intLanguageID: number) {
    const dicSelectedLanguage = objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intLanguageID);
    const strSourceLocationName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceLocationName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strLocationName.trim() || strLastTranslatedSource !== strSourceLocationName;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await locationService.translateLocationText(
        strSourceLocationName,
        intDefaultLanguageID,
        intLanguageID,
      );
      setDicForm((dicPrevious) => ({
        ...dicPrevious,
        lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID
          ? {
              ...dicText,
              intLanguageID,
              strLanguageName: dicSelectedLanguage.strLabel,
              strLocationName: strTranslatedName,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceLocationName,
      }));
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
    const intTargetLanguageID =
      Number(dicSecondaryRow.intLanguageID) || intSecondaryLanguageID;
    if (!intTargetLanguageID || intTargetLanguageID === intDefaultLanguageID) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, intTargetLanguageID);
  }

  // Filter draft values are only committed on Search/Clear to keep the grid interactions predictable.
  const lstFilteredLocations = useMemo(() => lstLocations.filter((dicLocation) => {
    const blnCodeMatch = !dicSearchApplied.code || dicLocation.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicLocation.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicLocation.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstLocations]);

  const lstTableRows: LocationTableRow[] = lstFilteredLocations.map((dicLocation) => ({
    id: dicLocation.id,
    action: <CommonRowActions testIdPrefix="location-master.list.row" rowKey={dicLocation.id} blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} onView={() => openDialog("view", dicLocation)} onEdit={() => openDialog("edit", dicLocation)} onDelete={() => deleteLocation(dicLocation.id)} />,
    name: dicLocation.name,
    code: dicLocation.code,
    state: dicLocation.strStateName || "-",
    city: dicLocation.strCityName || "-",
    status: <span className={`${styles.statusPill} ${dicLocation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicLocation.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span>,
    statusSortValue: dicLocation.status
  }));

  const lstTableColumns: DataGridColumn<LocationTableRow>[] = [
    { field: "action", headerName: dicModuleLabels.tableActions, sortable: false, filterable: false, exportable: false, width: 140 },
    { field: "name", headerName: dicModuleLabels.tableName, width: 240 },
    { field: "code", headerName: dicModuleLabels.tableCode, width: 160 },
    { field: "state", headerName: dicModuleLabels.fieldState, width: 180 },
    { field: "city", headerName: dicModuleLabels.fieldCity, width: 180 },
    { field: "status", headerName: dicModuleLabels.tableStatus, width: 140, sortAccessor: (dicRow) => dicRow.statusSortValue }
  ];

  useEffect(() => {
    locationService.getLocationFormOptions()
      .then((dicOptions) => setObjFormOptions(dicOptions))
      .catch(() => undefined);
  }, []);

  async function ensureLocationFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await locationService.getLocationFormOptions();
    setObjFormOptions(dicOptions);
    return dicOptions;
  }

  useEffect(() => {
    let blnMounted = true;
    const lstLanguageIDs = Array.from(
      new Set(
        dicForm.lstTexts
          .map((dicText) => Number(dicText.intLanguageID))
          .filter((intLanguageID) => Number.isFinite(intLanguageID) && intLanguageID > 0),
      ),
    );
    const lstLanguageIDsToLoad = lstLanguageIDs.filter(
      (intLanguageID) => !dicRowLabelsByLanguageID[intLanguageID],
    );
    if (lstLanguageIDsToLoad.length === 0) {
      return () => {
        blnMounted = false;
      };
    }

    async function loadRowLabels() {
      const lstResponses = await Promise.all(
        lstLanguageIDsToLoad.map(async (intLanguageID) => {
          const objResponse = await labelService.getModuleLabels(intLanguageID, "location");
          return {
            intLanguageID,
            dicLabels: objResponse.labels ?? {},
          };
        }),
      );
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
    }

    loadRowLabels().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [dicForm.lstTexts, dicRowLabelsByLanguageID]);

  function getRowLabel(intLanguageID: number | "", strKey: string, strFallback: string) {
    const intResolvedLanguageID = Number(intLanguageID);
    if (Number.isFinite(intResolvedLanguageID) && intResolvedLanguageID > 0) {
      const dicLabels = dicRowLabelsByLanguageID[intResolvedLanguageID];
      if (dicLabels?.[strKey]) {
        return dicLabels[strKey];
      }
    }
    return strFallback;
  }

  useEffect(() => {
    if (objFormOptions.lstLanguages.length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions.lstLanguages.length]);

  function openDialog(strNextMode: LocationMode, dicLocation?: LocationRecord) {
    setStrMode(strNextMode);
    setStrEditingLocationId(dicLocation?.id ?? "");
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    setBlnSubmitting(true);
    ensureLocationFormOptionsLoaded()
      .then((dicOptions) => {
        if (!dicLocation || strNextMode === "add") {
          setDicForm(ensureTenantLanguageRows(createInitialLocationForm()));
          setBlnDialogOpen(true);
          return;
        }
        return locationService.getLocation(Number(dicLocation.id), intDefaultLanguageID).then((dicRecord) => {
          setDicForm(
            ensureTenantLanguageRows(
              toLocationFormValues(dicRecord, dicOptions),
            ),
          );
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function closeDialog() {
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
      showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<"code" | "name" | "strCityName", string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCityName = dicForm.strCityName.trim();

    if (!strName) {
      dicNextErrors.name = dicModuleLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicModuleLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicModuleLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicModuleLabels.validationCodeFormat;
    }

    if (strCityName.length > 100) {
      dicNextErrors.strCityName = dicModuleLabels.validationCityMax;
    }

    if (lstLocations.some((dicLocation) => dicLocation.code.toUpperCase() === strCode && dicLocation.id !== strEditingLocationId)) {
      dicNextErrors.code = dicModuleLabels.validationCodeDuplicate;
    }

    if (lstLocations.some((dicLocation) => dicLocation.name.trim().toLowerCase() === strName.toLowerCase() && dicLocation.id !== strEditingLocationId)) {
      dicNextErrors.name = dicModuleLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveLocation() {
    if (!validateForm()) {
      return;
    }
    const dicPayload = ensureTenantLanguageRows({
      ...dicForm,
      code: dicForm.code.trim().toUpperCase(),
      name: dicForm.name.trim(),
      strCityName: dicForm.strCityName.trim(),
    });

    const objRequest = strMode === "add"
      ? locationService.createLocation(dicPayload)
      : locationService.updateLocation(Number(strEditingLocationId), dicPayload);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadLocations())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function deleteLocation(strLocationId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationDelete([Number(strLocationId)]);
        await loadLocations();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button controlId="location-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Location.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField controlId="location-master.list.search-name.input" inputProps={{ "controlId": "location-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth />
          <TextField controlId="location-master.list.search-code.input" inputProps={{ "controlId": "location-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth />
          <TextField controlId="location-master.list.search-status.select" inputProps={{ "controlId": "location-master.list.search-status.select" }} select label={dicModuleLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem controlId="location-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="location-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="location-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button controlId="location-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="location-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Location access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need location visibility.</Typography>
          </Box>
        ) : (
          <CommonDataGrid columns={lstTableColumns} rows={lstTableRows} rowIdField="id" defaultPageSize={20} pageSizeOptions={[10, 20, 50]} exportFileName={dicModuleLabels.exportFileName.replace(/\.(csv|pdf)$/i, "")} showExportOptions={blnCanExport} showPaginationSummary emptyMessage={dicModuleLabels.emptyMessage} testIdPrefix="location-master.list" toolbarLeft={blnCanAdd ? <Button controlId="location-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicModuleLabels.addButton}</Button> : null} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        strTitle={strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicModuleLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveLocation}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        paperClassName={styles.compactDialogPaper}
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        paperSx={{
          width: "min(800px, calc(100vw - 32px)) !important",
          maxWidth: "800px !important",
          overflow: "hidden",
          m: 2,
        }} 
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel}>{dicModuleLabels.fieldIsActive}</Typography>
            <ActiveStatusSwitch blnIsActive={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
          </Box>
        } 
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.6,
                gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              <TextField
                required
                label={`${dicModuleLabels.fieldName}`}
                value={dicForm.name}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishLocationName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
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
                  syncLocationCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                fullWidth
              />
              <TextField
                label={dicModuleLabels.fieldState}
                select
                value={dicForm.intStateID === "" ? "" : String(dicForm.intStateID)}
                onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, intStateID: objEvent.target.value ? Number(objEvent.target.value) : "" }))}
                fullWidth
                disabled={strMode === "view"}
              >
                <MenuItem value="">{dicModuleLabels.selectState}</MenuItem>
                {objFormOptions.lstStates.map((dicState) => (
                  <MenuItem key={dicState.intID} value={String(dicState.intID)}>
                    {dicState.strLabel}{dicState.strCode ? ` (${dicState.strCode})` : ""}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={dicModuleLabels.fieldCity}
                value={dicForm.strCityName}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, strCityName: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strCityName: strValue }));
                }}
                error={Boolean(dicErrors.strCityName)}
                helperText={dicErrors.strCityName}
                fullWidth
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
                  {t("multilingual_text_help", "Add translated location names for supported languages.")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
                <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} disabled sx={{ minHeight: 34 }}>
                  {t("add_language", "Add Language")}
                </Button>
                <Button
                  className={styles.primaryButton}
                  onClick={() => void handleTranslateClick()}
                  disabled={strMode === "view" || blnSubmitting || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
                  sx={{
                    minWidth: 108,
                    minHeight: 34,
                    boxShadow: "none",
                    "&:hover": { boxShadow: "none" },
                  }}
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
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "minmax(0, 0.95fr) minmax(0, 1.35fr) minmax(0, 0.95fr)",
                    },
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
                      renderValue: (objValue) => {
                        const intSelectedLanguageID = Number(objValue);
                        return (
                          objFormOptions.lstLanguages.find(
                            (dicLanguage) => dicLanguage.intID === intSelectedLanguageID,
                          )?.strLabel ?? dicText.strLanguageName ?? ""
                        );
                      },
                    }}
                    disabled
                    fullWidth
                  >
                    {objFormOptions.lstLanguages.map((dicLanguage) => (
                      <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicModuleLabels.fieldName)}
                    value={dicText.strLocationName}
                    onChange={(objEvent) => {
                      const strValue = objEvent.target.value;
                      updateTextRow(dicText.strRowID, "strLocationName", strValue);
                      if (intIndex === 0) {
                        setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                        setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                      }
                    }}
                    disabled={strMode === "view" || intIndex === 0}
                    InputProps={{
                      endAdornment: dicTextTranslationLoading[dicText.strRowID]
                        ? (
                            <InputAdornment position="end">
                              <CircularProgress size={18} sx={{ color: "#2563eb" }} />
                            </InputAdornment>
                          )
                        : undefined,
                    }}
                    fullWidth
                  />
                  <TextField
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicModuleLabels.fieldCode)}
                    value={dicText.strLocationCode}
                    disabled
                    fullWidth
                  />
                </Box>
              ))}
            </Box>


          </Box>
        }
      />

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicModuleLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnSubmitting || ((blnLoading || blnRightsLoading) && !blnDialogOpen)} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
