"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Pagination,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import type { InputHTMLAttributes } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
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
const lstRowsPerPageOptions = [10, 20, 50];
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

// Exports the current filtered grid as an Excel-friendly CSV file.
function downloadCsv(strFileName: string, lstRows: DesignationRecord[]) {
  const lstHeaders = ["Designation Name", "Designation Code", "Status"];
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

// Opens a print-friendly browser window so the visible dataset can be printed or saved as PDF.
function exportPdf(strTitle: string, lstRows: DesignationRecord[]) {
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
              <th>Designation Name</th>
              <th>Designation Code</th>
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

// Designation master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function DesignationMasterPanel() {
  const objRouter = useRouter();
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
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
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
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getDesignations();
      setLstDesignations(objResult.Data.map(mapDesignationRecord));
      setLstSelectedIds([]);
      setIntPage(1);
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
      setLstSelectedIds([]);
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
  const blnCanChangeStatus = blnCanEdit;
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID() ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "hi")?.intID ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID ??
    intDefaultLanguageID;

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

  const intPageCount = Math.max(1, Math.ceil(lstFilteredDesignations.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleDesignations = lstFilteredDesignations.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleDesignations.length > 0 && lstVisibleDesignations.every((dicDesignation) => lstSelectedIds.includes(dicDesignation.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleDesignations.some((dicDesignation) => dicDesignation.id === strId));

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

  function toggleSelection(strDesignationId: string) {
    // Adds or removes one row from the selected designation set.
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strDesignationId)
      ? lstPrevious.filter((strId) => strId !== strDesignationId)
      : [...lstPrevious, strDesignationId]);
  }

  function toggleSelectAll() {
    // Selects only the visible page rows so bulk actions stay aligned with the current page.
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleDesignations.some((dicDesignation) => dicDesignation.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleDesignations.map((dicDesignation) => dicDesignation.id)])]);
  }

  function bulkUpdateStatus(strStatus: DesignationStatus) {
    // Confirms and applies a shared status to all selected designation rows.
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicDesignationLabels.confirmBulkActivateTitle : dicDesignationLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicDesignationLabels.confirmBulkActivateMessage : dicDesignationLabels.confirmBulkDeactivateMessage).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? dicDesignationLabels.confirmBulkActivateLabel : dicDesignationLabels.confirmBulkDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadDesignations();
        showToast(strStatus === "Active" ? dicDesignationLabels.bulkActivateSuccess : dicDesignationLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    // Confirms and deletes the currently selected designation rows.
    openConfirmDialog({
      strTitle: dicDesignationLabels.confirmBulkDeleteTitle,
      strMessage: dicDesignationLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicDesignationLabels.confirmBulkDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDesignationDelete(lstSelectedIds.map(Number));
        await loadDesignations();
        showToast(dicDesignationLabels.bulkDeleteSuccess);
      }
    });
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
      <Box className={styles.topBar}>
        <Button controlId="designation-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicDesignationLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Designation.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField controlId="designation-master.list.search-name.input" inputProps={{ "controlId": "designation-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDesignationLabels.searchNamePlaceholder} fullWidth />
          <TextField controlId="designation-master.list.search-code.input" inputProps={{ "controlId": "designation-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDesignationLabels.searchCodePlaceholder} fullWidth />
          <TextField controlId="designation-master.list.search-status.select" inputProps={{ "controlId": "designation-master.list.search-status.select" }} select label={dicDesignationLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem controlId="designation-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="designation-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="designation-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button controlId="designation-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="designation-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{dicDesignationLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicDesignationLabels.bulkRowsSelected}`}</Typography>
            {blnCanChangeStatus ? <Button controlId="designation-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicDesignationLabels.bulkActivate}</Button> : null}
            {blnCanChangeStatus ? <Button controlId="designation-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicDesignationLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button controlId="designation-master.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicDesignationLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? <Button controlId="designation-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicDesignationLabels.addButton}</Button> : null}
            {blnCanExport ? <Button controlId="designation-master.list.export-excel.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicDesignationLabels.exportFileName, lstFilteredDesignations)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportExcel}</Button> : null}
            {blnCanExport ? <Button controlId="designation-master.list.export-pdf.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicDesignationLabels.exportTitle, lstFilteredDesignations)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportPdf}</Button> : null}
          </Box>

          {!blnLoading && lstFilteredDesignations.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography>
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredDesignations.length)} {dicCommonLabels.paginationSeparator} {lstFilteredDesignations.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Designation access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need designation visibility.</Typography>
          </Box>
        ) : (
        // The table wrapper is the only scrolling region so the master header stays stable on screen.
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox controlId="designation-master.list.select-all.checkbox" checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} inputProps={{ "controlId": "designation-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} /></th>
                <th>{dicDesignationLabels.tableActions}</th>
                <th>{dicDesignationLabels.tableName}</th>
                <th>{dicDesignationLabels.tableCode}</th>
                <th>{dicDesignationLabels.tableStatus}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredDesignations.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={5}>{dicDesignationLabels.emptyMessage}</td></tr>
              ) : lstVisibleDesignations.map((dicDesignation) => {
                const blnSelected = lstSelectedIds.includes(dicDesignation.id);
                return (
                  <tr key={dicDesignation.id} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox controlId="designation-master.list.row.select.checkbox" checked={blnSelected} onChange={() => toggleSelection(dicDesignation.id)} inputProps={{ "controlId": "designation-master.list.row.select.checkbox", "data-row-key": dicDesignation.id } as InputHTMLAttributes<HTMLInputElement>} /></td>
                    <td><CommonRowActions testIdPrefix="designation-master.list.row" rowKey={dicDesignation.id} blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} onView={() => openDialog("view", dicDesignation)} onEdit={() => openDialog("edit", dicDesignation)} onDelete={() => deleteDesignation(dicDesignation.id)} /></td>
                    <td>{dicDesignation.name}</td>
                    <td>{dicDesignation.code}</td>
                    <td><span className={`${styles.statusPill} ${dicDesignation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicDesignation.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        rootTestId="designation-master.dialog"
        cancelButtonTestId="designation-master.dialog.cancel.button"
        primaryButtonTestId="designation-master.dialog.save.button"
        strTitle={strMode === "add" ? dicDesignationLabels.dialogAddTitle : strMode === "edit" ? dicDesignationLabels.dialogEditTitle : dicDesignationLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicDesignationLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveDesignation}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        paperClassName={styles.compactDialogPaper}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
              <Typography className={styles.switchLabel}>{dicDesignationLabels.fieldIsActive}</Typography>
              <ActiveStatusSwitch testId="designation-master.dialog.active.switch" blnIsActive={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
         </Box>
        }
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        paperSx={{
          width: "min(800px, calc(100vw - 32px)) !important",
          maxWidth: "800px !important",
          overflow: "hidden",
          m: 2,
        }}
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.6,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                alignItems: "start",
              }}
            >
              <TextField
                required
                controlId="designation-master.dialog.name.input"
                label={`${dicDesignationLabels.fieldName}`}
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
                fullWidth
              />
              <TextField
                required
                controlId="designation-master.dialog.code.input"
                label={`${dicDesignationLabels.fieldCode}`}
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
                fullWidth
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
                  {t("multilingual_text_help", "Add translated designation names for supported languages.")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
                <Button controlId="designation-master.dialog.add-language.button" className={styles.secondaryButton} startIcon={<AddRoundedIcon />} disabled sx={{ minHeight: 34 }}>
                  {t("add_language", "Add Language")}
                </Button>
                <Button
                  controlId="designation-master.dialog.translate.button"
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
                    controlId="designation-master.dialog.language.select"
                    select
                    label={getRowLabel(dicText.intLanguageID, "language", t("language", "Language"))}
                    value={dicText.intLanguageID}
                    inputProps={{ "controlId": "designation-master.dialog.language.select", "data-row-key": dicText.strRowID }}
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
                      <MenuItem controlId="designation-master.dialog.language.option" data-option-key={dicLanguage.intID} key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    controlId="designation-master.dialog.translated-name.input"
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicDesignationLabels.fieldName)}
                    value={dicText.strDesignationName}
                    inputProps={{ "controlId": "designation-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                    onChange={(objEvent) => {
                      const strValue = objEvent.target.value;
                      updateTextRow(dicText.strRowID, "strDesignationName", strValue);
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
                    controlId="designation-master.dialog.translated-code.input"
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicDesignationLabels.fieldCode)}
                    value={dicText.strDesignationCode}
                    inputProps={{ "controlId": "designation-master.dialog.translated-code.input", "data-row-key": dicText.strRowID }}
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
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicDesignationLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
