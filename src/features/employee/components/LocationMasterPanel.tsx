"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import MasterBreadcrumbs from "@/components/master/MasterBreadcrumbs";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
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
  nameText: string;
  name: ReactNode;
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
  const { t } = useModuleLabels("location");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstLocationModuleCodes);
  const [lstLocations, setLstLocations] = useState<LocationRecord[]>(lstDefaultLocations);
  const [objFormOptions, setObjFormOptions] = useState<LocationFormOptionsApiRecord>({ lstLanguages: [], lstStates: [] });
  const [strMode, setStrMode] = useState<LocationMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingLocationId, setStrEditingLocationId] = useState("");
  const [dicForm, setDicForm] = useState<LocationFormValues>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<"code" | "name" | "strCityName", string>>>({});
  const objNameInputRef = useRef<HTMLInputElement>(null);
  const objCodeInputRef = useRef<HTMLInputElement>(null);
  const objCityInputRef = useRef<HTMLInputElement>(null);
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

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
    tableName: "Location Name",
    tableCode: "Location Code",
    tableStatus: t("table_status"),
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
    fieldName: "Location Name",
    fieldCode: "Location Code",
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
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

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
    if (!intSecondaryLanguageID) {
      return {
        ...dicValues,
        lstTexts: [dicDefaultRow],
      };
    }
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
    nameText: dicLocation.name,
    name: (
      <Link
        component="button"
        type="button"
        underline="none"
        disabled={!blnCanView && !blnCanEdit}
        data-control-id="location-master.list.row.name.button"
        onClick={(objEvent) => {
          if (window.getSelection()?.toString()) {
            objEvent.stopPropagation();
            return;
          }
          openDialog(blnCanEdit ? "edit" : "view", dicLocation);
        }}
        sx={{ color: "#334155", cursor: "pointer", fontSize: "inherit", fontWeight: 500, textAlign: "left", textUnderlineOffset: "3px", userSelect: "text", WebkitUserSelect: "text", "&:hover": { color: "#0066df", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}
      >
        {dicLocation.name}
      </Link>
    ),
    code: dicLocation.code,
    state: dicLocation.strStateName || "-",
    city: dicLocation.strCityName || "-",
    status: (
      <span className={styles.statusPill} style={{ background: dicLocation.status === "Active" ? "#dcfce7" : "#fee2e2", color: dicLocation.status === "Active" ? "#15803d" : "#dc2626" }}>
        {dicLocation.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
      </span>
    ),
    statusSortValue: dicLocation.status
  }));

  const lstTableColumns: CommonTableColumn<LocationTableRow>[] = [
    { field: "name", headerName: dicModuleLabels.tableName, sortAccessor: (dicRow) => dicRow.nameText },
    { field: "code", headerName: dicModuleLabels.tableCode },
    { field: "state", headerName: dicModuleLabels.fieldState },
    { field: "city", headerName: dicModuleLabels.fieldCity },
    { field: "status", headerName: dicModuleLabels.tableStatus, sortable: false, filterable: false, sortAccessor: (dicRow) => dicRow.statusSortValue }
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
    const lstErrorKeys = Object.keys(dicNextErrors) as Array<keyof typeof dicNextErrors>;
    if (lstErrorKeys.length > 0) {
      window.setTimeout(() => {
        if (dicNextErrors.name) {
          objNameInputRef.current?.focus();
          return;
        }
        if (dicNextErrors.code) {
          objCodeInputRef.current?.focus();
          return;
        }
        if (dicNextErrors.strCityName) {
          objCityInputRef.current?.focus();
        }
      }, 0);
    }
    return lstErrorKeys.length === 0;
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

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <MasterBreadcrumbs strCurrent={dicModuleLabels.pageTitle} />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Location.")}
          </Typography>
        ) : null}
        <Box
          className={styles.searchRow}
          aria-busy={blnLoading || blnSubmitting || blnRightsLoading}
          sx={{
            alignItems: "center",
            "& .MuiButton-root": { alignSelf: "center" },
          }}
        >
          <TextField className="app-mui-text-field" id="location-master-search-name" controlId="location-master.list.search-name.input" inputProps={{ "controlId": "location-master.list.search-name.input" }} label={dicModuleLabels.tableName} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={blnLoading || blnSubmitting || blnRightsLoading} fullWidth />
          <TextField className="app-mui-text-field" id="location-master-search-code" controlId="location-master.list.search-code.input" inputProps={{ "controlId": "location-master.list.search-code.input" }} label={dicModuleLabels.tableCode} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={blnLoading || blnSubmitting || blnRightsLoading} fullWidth />
          <TextField className="app-mui-text-field" id="location-master-search-status" controlId="location-master.list.search-status.select" inputProps={{ "controlId": "location-master.list.search-status.select" }} select label={dicModuleLabels.tableStatus} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" disabled={blnLoading || blnSubmitting || blnRightsLoading} fullWidth>
            <MenuItem controlId="location-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="location-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="location-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button controlId="location-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="location-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Location access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need location visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={dicModuleLabels.exportFileName.replace(/\.(csv|pdf)$/i, "")}
            showExportOptions={blnCanExport}
            testIdPrefix="location-master.list"
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              const dicLocation = lstLocations.find((dicItem) => dicItem.id === dicRow.id);
              if (dicLocation) openDialog(blnCanEdit ? "edit" : "view", dicLocation);
            }}
            minTableWidth={800}
            emptyMessage={dicModuleLabels.emptyMessage}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button controlId="location-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                    {dicModuleLabels.addButton}
                  </Button>
                ) : null}
              </Box>
            )}
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
        <BlockingLoader
          blnOpen={blnSubmitting}
          strLabel={dicCommonLabels.processing}
          intZIndex={1400}
          blnLocal
        />
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") {
            closeDialog();
          }
        }}
        rootTestId="location-master.dialog"
        cancelButtonTestId="location-master.dialog.cancel.button"
        primaryButtonTestId="location-master.dialog.save.button"
        strTitle={strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicModuleLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveLocation}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch
              testId="location-master.dialog.active.switch"
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
                "& .MuiSwitch-thumb": {
                  width: 16,
                  height: 16,
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
                },
                "& .MuiSwitch-track": {
                  borderRadius: "11px",
                  backgroundColor: "#98a2b3",
                  opacity: 1,
                  transition: "background-color 180ms",
                },
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
        nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>{t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        paperClassName={styles.departmentDialogPaper}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        maxWidth={false}
        fullWidth={false}
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: "12px" }}>
            <Box
              sx={{
                display: "grid",
                columnGap: 1.6,
                rowGap: "12px",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              {strMode === "add" ? (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    {t("basic_information", "Basic Information")}
                  </Typography>
                  <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25, mb: 1 }}>
                    {t("basic_information_help", "Create a new location for your organisation.")}
                  </Typography>
                </Box>
              ) : null}
              <TextField
                className="app-mui-text-field"
                controlId="location-master.dialog.name.input"
                inputProps={{ "controlId": "location-master.dialog.name.input" }}
                inputRef={objNameInputRef}
                autoFocus={strMode !== "view"}
                size="small"
                required
                label={dicModuleLabels.fieldName}
                placeholder={t("dialog_name_placeholder", "Enter location name")}
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
                className="app-mui-text-field"
                controlId="location-master.dialog.code.input"
                inputProps={{ "controlId": "location-master.dialog.code.input" }}
                inputRef={objCodeInputRef}
                size="small"
                required
                label={dicModuleLabels.fieldCode}
                placeholder={t("dialog_code_placeholder", "Enter location code")}
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
              <CommonSearchableSelect
                className="app-mui-text-field"
                controlId="location-master.dialog.state.select"
                label={dicModuleLabels.fieldState}
                value={dicForm.intStateID}
                options={objFormOptions.lstStates}
                getOptionLabel={(dicState) => `${dicState.strLabel}${dicState.strCode ? ` (${dicState.strCode})` : ""}`}
                placeholder={dicModuleLabels.selectState}
                onChange={(intValue) => setDicForm((dicPrevious) => ({ ...dicPrevious, intStateID: intValue }))}
                fullWidth
                disabled={strMode === "view"}
                sx={{
                  "& .MuiInputLabel-root": {
                    transform: "translate(14px, 10px) scale(1) !important",
                  },
                  "& .MuiInputLabel-root.MuiInputLabel-shrink": {
                    transform: "translate(14px, -9px) scale(0.75) !important",
                  },
                  "& .MuiInputBase-root": {
                    boxSizing: "border-box",
                    minHeight: "40px !important",
                  },
                  "& .MuiOutlinedInput-root.MuiAutocomplete-inputRoot": {
                    alignItems: "center",
                    boxSizing: "border-box",
                    minHeight: "40px !important",
                    padding: "0 40px 0 14px !important",
                  },
                  "& .MuiOutlinedInput-root.MuiAutocomplete-inputRoot .MuiAutocomplete-input": {
                    boxSizing: "border-box",
                    minWidth: 0,
                    padding: "10px 0 !important",
                  },
                  "& .MuiOutlinedInput-root.MuiAutocomplete-inputRoot > .MuiSvgIcon-root": {
                    color: "#94a3b8",
                    flexShrink: 0,
                    margin: "0 8px 0 0",
                  },
                  "& .MuiAutocomplete-endAdornment": {
                    right: "10px !important",
                  },
                  "& .MuiAutocomplete-popupIndicator": {
                    color: "#64748b",
                    height: "28px",
                    width: "28px",
                  },
                }}
              />
              <TextField
                className="app-mui-text-field"
                controlId="location-master.dialog.city.input"
                inputProps={{ "controlId": "location-master.dialog.city.input" }}
                inputRef={objCityInputRef}
                size="small"
                label={dicModuleLabels.fieldCity}
                placeholder={t("dialog_city_placeholder", "Enter city")}
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

            {intSecondaryLanguageID ? (
              <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                  <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("language_translations", "Language Translations")}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>
                      {t("language_translations_help", "Provide translated location names for the application languages you want to support.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button
                        controlId="location-master.dialog.translate.button"
                        className={styles.secondaryButton}
                        variant="outlined"
                        startIcon={<AutoAwesomeRoundedIcon />}
                        onClick={() => void handleTranslateClick()}
                        disabled={strMode === "view" || blnSubmitting || !dicForm.name.trim() || Boolean(dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""])}
                        sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}
                      >
                        {t("translate", "AI Translate")}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
                  {dicForm.lstTexts.filter((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID).map((dicText) => (
                    <Box key={dicText.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                      <Typography component="label" htmlFor={`location-translation-${dicText.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        className="app-mui-text-field"
                        id={`location-translation-${dicText.strRowID}`}
                        controlId="location-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter location name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strLocationName}
                        inputProps={{ "controlId": "location-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strLocationName", objEvent.target.value)}
                        disabled={strMode === "view"}
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

      <BlockingLoader blnOpen={(blnLoading || blnRightsLoading) && !blnDialogOpen} strLabel={dicCommonLabels.loading} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
