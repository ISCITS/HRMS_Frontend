"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Breadcrumbs,
  IconButton,
  Tooltip,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Link,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";


import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { DesignationApiRecord, masterApiService, type SimpleMasterFormOptionsApiRecord } from "@/services/master/MasterApiService";
import {
  createEmptyDesignationTextRow,
  createInitialDesignationForm,
  designationService,
  toDesignationFormValues,
  type DesignationFormValues,
  type DesignationTextFormValue,
} from "@/features/employee/services/designationService";

type DesignationStatus = "Active" | "Inactive";
type DesignationMode = "add" | "edit" | "view";

type DesignationRecord = {
  id: string;
  code: string;
  name: string;
  status: DesignationStatus;
};

type DesignationTableRow = {
  id: string;
  name: ReactNode;
  nameText: string;
  code: string;
  status: ReactNode;
  statusSortValue: string;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | DesignationStatus;
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

const dicEmptyForm = createInitialDesignationForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultDesignations: DesignationRecord[] = [];
const lstDesignationModuleCodes = ["DESIGNATION", "DESIGNATIONS"];

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapDesignationRecord(dicRecord: DesignationApiRecord): DesignationRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strDesignationCode,
    name: dicRecord.strDesignationName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

// Designation master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function DesignationMasterPanel() {

  const { t } = useModuleLabels("designation");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstDesignationModuleCodes);
  const [lstDesignations, setLstDesignations] = useState<DesignationRecord[]>(lstDefaultDesignations);
  const [objFormOptions, setObjFormOptions] = useState<SimpleMasterFormOptionsApiRecord>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<DesignationMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingDesignationId, setStrEditingDesignationId] = useState("");
  const [dicForm, setDicForm] = useState<DesignationFormValues>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<"code" | "name", string>>>({});
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
  const dicDesignationLabels = {
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
    validationNameRequired: t("validation_name_required", dicConstant.designations.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.designations.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.designations.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.designations.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.designations.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.designations.validation.nameDuplicate),
  };

  async function loadDesignations() {
    // Reload from the backend after every mutation so pagination, selection, and DB state stay in sync.
    if (!canViewAny()) {
      setLstDesignations([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getDesignations();
      setLstDesignations(objResult.Data.map(mapDesignationRecord));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!canViewAny()) {
      setLstDesignations([]);
      setBlnLoading(false);
      return;
    }
    loadDesignations().catch(() => undefined);
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
    strDesignationName: string,
    strDesignationCode: string,
    lstExistingTexts: DesignationTextFormValue[],
  ): DesignationTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyDesignationTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strDesignationName,
      strDesignationCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: DesignationFormValues) {
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
      dicSecondaryExistingText?.strDesignationName ?? "",
      dicValues.code,
      dicValues.lstTexts,
    );
    return {
      ...dicValues,
      lstTexts: [dicDefaultRow, dicSecondaryRow],
    };
  }

  function syncEnglishDesignationName(strDesignationName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? { ...dicText, strDesignationName }
          : dicText),
      };
    });
  }

  function syncDesignationCode(strDesignationCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({
        ...dicText,
        strDesignationCode,
      })),
    }));
  }

  function updateTextRow(
    strRowID: string,
    strField: keyof DesignationTextFormValue,
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
    const strSourceDesignationName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceDesignationName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strDesignationName.trim() || strLastTranslatedSource !== strSourceDesignationName;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await designationService.translateDesignationText(
        strSourceDesignationName,
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
              strDesignationName: strTranslatedName,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceDesignationName,
      }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicDesignationLabels.requestFailed, "error");
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  const lstVisibleTranslationRows = dicForm.lstTexts.filter((dicText) => Number(dicText.intLanguageID) !== intDefaultLanguageID);

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
  const lstFilteredDesignations = useMemo(() => lstDesignations.filter((dicDesignation) => {
    const blnCodeMatch = !dicSearchApplied.code || dicDesignation.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicDesignation.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicDesignation.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstDesignations]);

  const lstTableRows: DesignationTableRow[] = lstFilteredDesignations.map((dicDesignation) => ({
    id: dicDesignation.id,
    nameText: dicDesignation.name,
    name: (
      <Link component="button" type="button" underline="hover"
        disabled={!blnCanView && !blnCanEdit}
        data-control-id="designation-master.list.row.name.button"
        onClick={() => openDialog(blnCanEdit ? "edit" : "view", dicDesignation)}
        sx={{ color: "#0066df", cursor: "pointer", fontSize: "inherit", fontWeight: 500, textAlign: "left", "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}>
        {dicDesignation.name}
      </Link>
    ),
    code: dicDesignation.code,
    status: <span className={styles.statusPill} style={{ background: dicDesignation.status === "Active" ? "#dcfce7" : "#fee2e2", color: dicDesignation.status === "Active" ? "#15803d" : "#dc2626" }}>{dicDesignation.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span>,
    statusSortValue: dicDesignation.status
  }));

  const lstTableColumns: DataGridColumn<DesignationTableRow>[] = [
    { field: "name", headerName: dicDesignationLabels.tableName, sortAccessor: (dicRow) => dicRow.nameText },
    { field: "code", headerName: dicDesignationLabels.tableCode },
    { field: "status", headerName: dicDesignationLabels.tableStatus, sortAccessor: (dicRow) => dicRow.statusSortValue }
  ];

  useEffect(() => {
    designationService.getDesignationFormOptions()
      .then((dicOptions) => setObjFormOptions(dicOptions))
      .catch(() => undefined);
  }, []);

  async function ensureDesignationFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await designationService.getDesignationFormOptions();
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
          const objResponse = await labelService.getModuleLabels(intLanguageID, "designation");
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

  function openDialog(strNextMode: DesignationMode, dicDesignation?: DesignationRecord) {
    // Reuses one dialog for add, edit, and read-only view modes.
    setStrMode(strNextMode);
    setStrEditingDesignationId(dicDesignation?.id ?? "");
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    setBlnSubmitting(true);
    ensureDesignationFormOptionsLoaded()
      .then((dicOptions) => {
        if (!dicDesignation || strNextMode === "add") {
          setDicForm(ensureTenantLanguageRows(createInitialDesignationForm()));
          setBlnDialogOpen(true);
          return;
        }
        return designationService.getDesignation(Number(dicDesignation.id)).then((dicRecord) => {
          setDicForm(
            ensureTenantLanguageRows(
              toDesignationFormValues(dicRecord, dicOptions),
            ),
          );
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDesignationLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function closeDialog() {
    // Closes the form dialog without changing persisted designation data.
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
      showToast(objError instanceof Error ? objError.message : dicDesignationLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    // Client-side checks mirror the backend rules so duplicate code/name errors surface before submit.
    const dicNextErrors: Partial<Record<"code" | "name", string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicDesignationLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicDesignationLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicDesignationLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicDesignationLabels.validationCodeFormat;
    }

    if (lstDesignations.some((dicDesignation) => dicDesignation.code.toUpperCase() === strCode && dicDesignation.id !== strEditingDesignationId)) {
      dicNextErrors.code = dicDesignationLabels.validationCodeDuplicate;
    }

    if (lstDesignations.some((dicDesignation) => dicDesignation.name.trim().toLowerCase() === strName.toLowerCase() && dicDesignation.id !== strEditingDesignationId)) {
      dicNextErrors.name = dicDesignationLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveDesignation() {
    // Decides between create and update based on the current dialog mode.
    if (!validateForm()) {
      return;
    }
    const dicPayload = ensureTenantLanguageRows({
      ...dicForm,
      code: dicForm.code.trim().toUpperCase(),
      name: dicForm.name.trim(),
    });

    const objRequest = strMode === "add"
      ? designationService.createDesignation(dicPayload)
      : designationService.updateDesignation(Number(strEditingDesignationId), dicPayload);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadDesignations())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicDesignationLabels.saveSuccess : dicDesignationLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDesignationLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function deleteDesignation(strDesignationId: string) {
    // Deletes a single row by reusing the same backend bulk-delete endpoint.
    openConfirmDialog({
      strTitle: dicDesignationLabels.confirmDeleteTitle,
      strMessage: dicDesignationLabels.confirmDeleteMessage,
      strConfirmLabel: dicDesignationLabels.confirmDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationDelete([Number(strDesignationId)]);
        await loadDesignations();
        showToast(dicDesignationLabels.deleteSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>{t("breadcrumb_designations", "Designations")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Designation.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow} sx={{ alignItems: "end", "& .MuiButton-root": { height: "36px !important", minHeight: "36px !important", alignSelf: "flex-end" } }}>
          <Box><Typography component="label" htmlFor="designation-search-name" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{dicDesignationLabels.tableName}</Typography>
            <TextField id="designation-search-name" controlId="designation-master.list.search-name.input" inputProps={{ "controlId": "designation-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDesignationLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} fullWidth />
          </Box>
          <Box><Typography component="label" htmlFor="designation-search-code" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{dicDesignationLabels.tableCode}</Typography>
            <TextField id="designation-search-code" controlId="designation-master.list.search-code.input" inputProps={{ "controlId": "designation-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDesignationLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} fullWidth />
          </Box>
          <Box><Typography component="label" htmlFor="designation-search-status" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{dicDesignationLabels.tableStatus}</Typography>
            <TextField id="designation-search-status" controlId="designation-master.list.search-status.select" inputProps={{ "controlId": "designation-master.list.search-status.select" }} select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" fullWidth>
            <MenuItem controlId="designation-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="designation-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="designation-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          </Box>
          <Box className={styles.searchActions}><Button data-control-id="designation-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="designation-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>

      </Box>

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Designation access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need designation visibility.</Typography>
          </Box>
        ) : (
          <CommonDataGrid hideRowClickHint columns={lstTableColumns} rows={lstTableRows} rowIdField="id" defaultPageSize={20} pageSizeOptions={[10, 20, 50]} exportFileName={dicDesignationLabels.exportFileName.replace(/\.(csv|pdf)$/i, "")} showExportOptions={blnCanExport} showPaginationSummary emptyMessage={dicDesignationLabels.emptyMessage} testIdPrefix="designation-master.list" toolbarLeft={blnCanAdd ? <Button controlId="designation-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicDesignationLabels.addButton}</Button> : null} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") {
            closeDialog();
          }
        }}
        rootTestId="designation-master.dialog"
        cancelButtonTestId="designation-master.dialog.cancel.button"
        primaryButtonTestId="designation-master.dialog.save.button"
        strTitle={strMode === "add" ? dicDesignationLabels.dialogAddTitle : strMode === "edit" ? dicDesignationLabels.dialogEditTitle : dicDesignationLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicDesignationLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveDesignation}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch
              testId="designation-master.dialog.active.switch"
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
        paperClassName={styles.designationDialogPaper}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        maxWidth={false}
        fullWidth={false}
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: "12px", "& .MuiOutlinedInput-root": { borderRadius: "6px", backgroundColor: "#fff", fontWeight: 400 }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" }, "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main", borderWidth: 2 }, "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: "error.main" }, "& .MuiFormHelperText-root.Mui-error": { margin: "4px 14px 0px 0px" } }}>
            <Box
              sx={{
                display: "grid",
                columnGap: 1.6, rowGap: "12px",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                alignItems: "start",
                "& .MuiInputLabel-root": { position: "relative", transform: "none", alignSelf: "flex-start", maxWidth: "100%", fontSize: "12px", fontWeight: 600, lineHeight: 1.5, mb: "4px" },
                // External labels do not need the floating-label outline offset.
                "& .MuiOutlinedInput-notchedOutline": { top: 0 },
                "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
              }}
            >
              {strMode === "add" ? (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    {t("basic_information", "Basic Information")}
                  </Typography>
                  <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25 }}>
                    {t("basic_information_help", "Create a new designation for your organisation.")}
                  </Typography>
                </Box>
              ) : null}
              <TextField
                controlId="designation-master.dialog.name.input"

                autoFocus={strMode !== "view"}
                label={dicDesignationLabels.fieldName}
                placeholder={t("dialog_name_placeholder", "Enter designation name")}
                size="small"
                InputLabelProps={{ shrink: true }}
                required
                value={dicForm.name}
                inputProps={{ "controlId": "designation-master.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishDesignationName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
              <TextField
                controlId="designation-master.dialog.code.input"

                label={dicDesignationLabels.fieldCode}
                placeholder={t("dialog_code_placeholder", "Enter designation code")}
                size="small"
                InputLabelProps={{ shrink: true }}
                required
                value={dicForm.code}
                inputProps={{ "controlId": "designation-master.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncDesignationCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
            </Box>

            {lstVisibleTranslationRows.length > 0 ? (
              <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1.5, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                  <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("language_translations", "Language Translations")}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>
                      {t("language_translations_help", "Provide translated designation names for the application languages you want to support.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button
                        controlId="designation-master.dialog.translate.button"
                        className={styles.secondaryButton}
                        variant="outlined"
                        startIcon={<AutoAwesomeRoundedIcon />}
                        onClick={() => void handleTranslateClick()}
                        disabled={strMode === "view" || blnSubmitting || !dicForm.name.trim() || Boolean(dicTextTranslationLoading[lstVisibleTranslationRows[0]?.strRowID ?? ""])}
                        sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}
                      >
                        {t("translate", "AI Translate")}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "grid", gap: 1.5, p: 2 }}>
                  {lstVisibleTranslationRows.map((dicText) => (
                    <Box key={dicText.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                      <Typography component="label" htmlFor={`designation-translation-${dicText.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        id={`designation-translation-${dicText.strRowID}`}
                        controlId="designation-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter designation name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strDesignationName}
                        inputProps={{ "controlId": "designation-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strDesignationName", objEvent.target.value)}
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
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicDesignationLabels.confirmButton}
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
