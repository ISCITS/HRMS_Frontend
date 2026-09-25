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
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
import { EmployeeCategoryApiRecord, masterApiService, type SimpleMasterFormOptionsApiRecord } from "@/services/master/MasterApiService";
import {
  createEmptyEmployeeCategoryTextRow,
  createInitialEmployeeCategoryForm,
  employeeCategoryService,
  toEmployeeCategoryFormValues,
  type EmployeeCategoryFormValues,
  type EmployeeCategoryTextFormValue,
} from "@/features/employee/services/employeeCategoryService";

type EmployeeCategoryStatus = "Active" | "Inactive";
type EmployeeCategoryMode = "add" | "edit" | "view";

type EmployeeCategoryRecord = {
  id: string;
  code: string;
  name: string;
  status: EmployeeCategoryStatus;
};

type EmployeeCategoryTableRow = {
  id: string;
  action: ReactNode;
  name: string;
  code: string;
  status: ReactNode;
  statusSortValue: string;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | EmployeeCategoryStatus;
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

const dicEmptyForm = createInitialEmployeeCategoryForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultEmployeeCategories: EmployeeCategoryRecord[] = [];
const lstEmployeeCategoryModuleCodes = ["EMPLOYEE_CATEGORY", "EMPLOYEE_CATEGORIES"];

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapEmployeeCategoryRecord(dicRecord: EmployeeCategoryApiRecord): EmployeeCategoryRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strEmployeeCategoryCode,
    name: dicRecord.strEmployeeCategoryName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

// EmployeeCategory master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function EmployeeCategoryMasterPanel() {
  const objRouter = useRouter();
  const { t: translateLabel } = useModuleLabels("employee_category");
  const fallbackLabels: Record<string, string> = {
    dialog_view_title: "View Employee Category",
    breadcrumbs: "Master / Employee Category",
    export_title: "Employee Category",
    export_file_name: "employee-categories",
    search_name_placeholder: "Employee Category Name",
    search_code_placeholder: "Employee Category Code",
    search_status_placeholder: "Status",
    empty_message: "No employee categories found.",
    save_success: "Employee category saved successfully.",
    update_success: "Employee category updated successfully.",
    delete_success: "Employee category deleted successfully.",
    request_failed: "Unable to complete the request. Please try again.",
    confirm_delete_title: "Delete Employee Category",
    confirm_delete_message: "Are you sure you want to delete this employee category?",
    confirm_delete_label: "Delete",
    confirm_button: "Confirm",
    loading: "Loading...",
    processing: "Processing...",
  };
  const t = (key: string, fallback?: string) => translateLabel(key, fallback ?? fallbackLabels[key]);
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstEmployeeCategoryModuleCodes);
  const [lstEmployeeCategories, setLstEmployeeCategories] = useState<EmployeeCategoryRecord[]>(lstDefaultEmployeeCategories);
  const [objFormOptions, setObjFormOptions] = useState<SimpleMasterFormOptionsApiRecord>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<EmployeeCategoryMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingEmployeeCategoryId, setStrEditingEmployeeCategoryId] = useState("");
  const [dicForm, setDicForm] = useState<EmployeeCategoryFormValues>(dicEmptyForm);
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
  const dicEmployeeCategoryLabels = {
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
    validationNameRequired: t("validation_name_required", dicConstant.employeeCategories.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.employeeCategories.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.employeeCategories.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.employeeCategories.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.employeeCategories.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.employeeCategories.validation.nameDuplicate),
  };

  async function loadEmployeeCategories() {
    // Reload from the backend after every mutation so pagination, selection, and DB state stay in sync.
    if (!canViewAny()) {
      setLstEmployeeCategories([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getEmployeeCategories();
      setLstEmployeeCategories(objResult.Data.map(mapEmployeeCategoryRecord));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!canViewAny()) {
      setLstEmployeeCategories([]);
      setBlnLoading(false);
      return;
    }
    loadEmployeeCategories().catch((objError: unknown) => showToast(objError instanceof Error ? objError.message : dicEmployeeCategoryLabels.requestFailed, "error"));
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
    strEmployeeCategoryName: string,
    strEmployeeCategoryCode: string,
    lstExistingTexts: EmployeeCategoryTextFormValue[],
  ): EmployeeCategoryTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyEmployeeCategoryTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strEmployeeCategoryName,
      strEmployeeCategoryCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: EmployeeCategoryFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.name,
      dicValues.code,
      dicValues.lstTexts,
    );
    const lstOtherTexts = dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID && Number(dicText.intLanguageID) !== intDefaultLanguageID)
      .map((dicText) => ({ ...dicText, strEmployeeCategoryCode: dicValues.code }));
    if (intSecondaryLanguageID && intSecondaryLanguageID !== intDefaultLanguageID &&
        !lstOtherTexts.some((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID)) {
      lstOtherTexts.unshift(buildFixedLanguageRow(intSecondaryLanguageID, "", dicValues.code, []));
    }
    return {
      ...dicValues,
      lstTexts: [dicDefaultRow, ...lstOtherTexts],
    };
  }

  function addLanguageRow() {
    setDicForm((dicPrevious) => {
      const dicLanguage = objFormOptions.lstLanguages.find((dicOption) =>
        !dicPrevious.lstTexts.some((dicText) => Number(dicText.intLanguageID) === dicOption.intID));
      if (!dicLanguage) return dicPrevious;
      return {
        ...dicPrevious,
        lstTexts: [...dicPrevious.lstTexts, buildFixedLanguageRow(dicLanguage.intID, "", dicPrevious.code, [])],
      };
    });
  }

  function syncEnglishEmployeeCategoryName(strEmployeeCategoryName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? { ...dicText, strEmployeeCategoryName }
          : dicText),
      };
    });
  }

  function syncEmployeeCategoryCode(strEmployeeCategoryCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({
        ...dicText,
        strEmployeeCategoryCode,
      })),
    }));
  }

  function updateTextRow(
    strRowID: string,
    strField: keyof EmployeeCategoryTextFormValue,
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
    const strSourceEmployeeCategoryName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceEmployeeCategoryName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strEmployeeCategoryName.trim() || strLastTranslatedSource !== strSourceEmployeeCategoryName;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await employeeCategoryService.translateEmployeeCategoryText(
        strSourceEmployeeCategoryName,
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
              strEmployeeCategoryName: strTranslatedName,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceEmployeeCategoryName,
      }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicEmployeeCategoryLabels.requestFailed, "error");
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  async function handleTranslateClick() {
    for (const dicText of dicForm.lstTexts.slice(1)) {
      const intTargetLanguageID = Number(dicText.intLanguageID);
      if (intTargetLanguageID && intTargetLanguageID !== intDefaultLanguageID) {
        await translateTextRow(dicText.strRowID, intTargetLanguageID);
      }
    }
  }

  // Filter draft values are only committed on Search/Clear to keep the grid interactions predictable.
  const lstFilteredEmployeeCategories = useMemo(() => lstEmployeeCategories.filter((dicEmployeeCategory) => {
    const blnCodeMatch = !dicSearchApplied.code || dicEmployeeCategory.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicEmployeeCategory.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicEmployeeCategory.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstEmployeeCategories]);

  const lstTableRows: EmployeeCategoryTableRow[] = lstFilteredEmployeeCategories.map((dicEmployeeCategory) => ({
    id: dicEmployeeCategory.id,
    action: <CommonRowActions testIdPrefix="employee-category-master.list.row" rowKey={dicEmployeeCategory.id} blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} onView={() => openDialog("view", dicEmployeeCategory)} onEdit={() => openDialog("edit", dicEmployeeCategory)} onDelete={() => deleteEmployeeCategory(dicEmployeeCategory.id)} />,
    name: dicEmployeeCategory.name,
    code: dicEmployeeCategory.code,
    status: <span className={`${styles.statusPill} ${dicEmployeeCategory.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicEmployeeCategory.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span>,
    statusSortValue: dicEmployeeCategory.status
  }));

  const lstTableColumns: DataGridColumn<EmployeeCategoryTableRow>[] = [
    { field: "action", headerName: dicEmployeeCategoryLabels.tableActions, sortable: false, filterable: false, exportable: false, width: 140 },
    { field: "name", headerName: dicEmployeeCategoryLabels.tableName, width: 260 },
    { field: "code", headerName: dicEmployeeCategoryLabels.tableCode, width: 230 },
    { field: "status", headerName: dicEmployeeCategoryLabels.tableStatus, width: 140, sortAccessor: (dicRow) => dicRow.statusSortValue }
  ];

  useEffect(() => {
    employeeCategoryService.getEmployeeCategoryFormOptions()
      .then((dicOptions) => setObjFormOptions(dicOptions))
      .catch(() => undefined);
  }, []);

  async function ensureEmployeeCategoryFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await employeeCategoryService.getEmployeeCategoryFormOptions();
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
          const objResponse = await labelService.getModuleLabels(intLanguageID, "employee_category");
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

  function openDialog(strNextMode: EmployeeCategoryMode, dicEmployeeCategory?: EmployeeCategoryRecord) {
    // Reuses one dialog for add, edit, and read-only view modes.
    setStrMode(strNextMode);
    setStrEditingEmployeeCategoryId(dicEmployeeCategory?.id ?? "");
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    setBlnSubmitting(true);
    ensureEmployeeCategoryFormOptionsLoaded()
      .then((dicOptions) => {
        if (!dicEmployeeCategory || strNextMode === "add") {
          setDicForm(ensureTenantLanguageRows(createInitialEmployeeCategoryForm()));
          setBlnDialogOpen(true);
          return;
        }
        return employeeCategoryService.getEmployeeCategory(Number(dicEmployeeCategory.id)).then((dicRecord) => {
          setDicForm(
            ensureTenantLanguageRows(
              toEmployeeCategoryFormValues(dicRecord, dicOptions),
            ),
          );
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicEmployeeCategoryLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function closeDialog() {
    // Closes the form dialog without changing persisted employeeCategory data.
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
      showToast(objError instanceof Error ? objError.message : dicEmployeeCategoryLabels.requestFailed, "error");
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
      dicNextErrors.name = dicEmployeeCategoryLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicEmployeeCategoryLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicEmployeeCategoryLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicEmployeeCategoryLabels.validationCodeFormat;
    }

    if (lstEmployeeCategories.some((dicEmployeeCategory) => dicEmployeeCategory.code.toUpperCase() === strCode && dicEmployeeCategory.id !== strEditingEmployeeCategoryId)) {
      dicNextErrors.code = dicEmployeeCategoryLabels.validationCodeDuplicate;
    }

    if (lstEmployeeCategories.some((dicEmployeeCategory) => dicEmployeeCategory.name.trim().toLowerCase() === strName.toLowerCase() && dicEmployeeCategory.id !== strEditingEmployeeCategoryId)) {
      dicNextErrors.name = dicEmployeeCategoryLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveEmployeeCategory() {
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
      ? employeeCategoryService.createEmployeeCategory(dicPayload)
      : employeeCategoryService.updateEmployeeCategory(Number(strEditingEmployeeCategoryId), dicPayload);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadEmployeeCategories())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicEmployeeCategoryLabels.saveSuccess : dicEmployeeCategoryLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicEmployeeCategoryLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function deleteEmployeeCategory(strEmployeeCategoryId: string) {
    // Deletes a single row by reusing the same backend bulk-delete endpoint.
    openConfirmDialog({
      strTitle: dicEmployeeCategoryLabels.confirmDeleteTitle,
      strMessage: dicEmployeeCategoryLabels.confirmDeleteMessage,
      strConfirmLabel: dicEmployeeCategoryLabels.confirmDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkEmployeeCategoryDelete([Number(strEmployeeCategoryId)]);
        await loadEmployeeCategories();
        showToast(dicEmployeeCategoryLabels.deleteSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button controlId="employee-category-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicEmployeeCategoryLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Employee Category.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField controlId="employee-category-master.list.search-name.input" inputProps={{ "controlId": "employee-category-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicEmployeeCategoryLabels.searchNamePlaceholder} fullWidth />
          <TextField controlId="employee-category-master.list.search-code.input" inputProps={{ "controlId": "employee-category-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicEmployeeCategoryLabels.searchCodePlaceholder} fullWidth />
          <TextField controlId="employee-category-master.list.search-status.select" inputProps={{ "controlId": "employee-category-master.list.search-status.select" }} select label={dicEmployeeCategoryLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem controlId="employee-category-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="employee-category-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="employee-category-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button controlId="employee-category-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="employee-category-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>EmployeeCategory access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need employee category visibility.</Typography>
          </Box>
        ) : (
          <CommonDataGrid columns={lstTableColumns} rows={lstTableRows} rowIdField="id" defaultPageSize={20} pageSizeOptions={[10, 20, 50]} exportFileName={dicEmployeeCategoryLabels.exportFileName.replace(/\.(csv|pdf)$/i, "")} showExportOptions={blnCanExport} showPaginationSummary emptyMessage={dicEmployeeCategoryLabels.emptyMessage} testIdPrefix="employee-category-master.list" toolbarLeft={blnCanAdd ? <Button controlId="employee-category-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicEmployeeCategoryLabels.addButton}</Button> : null} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        rootTestId="employee-category-master.dialog"
        cancelButtonTestId="employee-category-master.dialog.cancel.button"
        primaryButtonTestId="employee-category-master.dialog.save.button"
        strTitle={strMode === "add" ? dicEmployeeCategoryLabels.dialogAddTitle : strMode === "edit" ? dicEmployeeCategoryLabels.dialogEditTitle : dicEmployeeCategoryLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicEmployeeCategoryLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveEmployeeCategory}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        paperClassName={styles.compactDialogPaper}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
              <ActiveStatusSwitch testId="employee-category-master.dialog.active.switch" blnIsActive={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
              <Typography className={styles.switchLabel}>{dicEmployeeCategoryLabels.fieldIsActive}</Typography>
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
                controlId="employee-category-master.dialog.name.input"
                label={`${dicEmployeeCategoryLabels.fieldName}`}
                value={dicForm.name}
                inputProps={{ "controlId": "employee-category-master.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishEmployeeCategoryName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                fullWidth
              />
              <TextField
                required
                controlId="employee-category-master.dialog.code.input"
                label={`${dicEmployeeCategoryLabels.fieldCode}`}
                value={dicForm.code}
                inputProps={{ "controlId": "employee-category-master.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncEmployeeCategoryCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                fullWidth
              />
            </Box>

            <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
                  {t("multilingual_text_help", "Add translated employee category names for supported languages.")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
                <Button controlId="employee-category-master.dialog.add-language.button" className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={addLanguageRow} disabled={strMode === "view" || blnSubmitting || !objFormOptions.lstLanguages.some((dicLanguage) => !dicForm.lstTexts.some((dicText) => Number(dicText.intLanguageID) === dicLanguage.intID))} sx={{ minHeight: 34 }}>
                  {t("add_language", "Add Language")}
                </Button>
                <Button
                  controlId="employee-category-master.dialog.translate.button"
                  className={styles.primaryButton}
                  onClick={() => void handleTranslateClick()}
                  disabled={strMode === "view" || blnSubmitting || dicForm.lstTexts.length < 2 || !dicForm.name.trim() || Object.values(dicTextTranslationLoading).some(Boolean)}
                  sx={{
                    minWidth: 108,
                    minHeight: 34,
                    boxShadow: "none",
                    "&:hover": { boxShadow: "none" },
                  }}
                >
                  {Object.values(dicTextTranslationLoading).some(Boolean) ? (
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
                    controlId="employee-category-master.dialog.language.select"
                    select
                    label={getRowLabel(dicText.intLanguageID, "language", t("language", "Language"))}
                    value={dicText.intLanguageID}
                    inputProps={{ "controlId": "employee-category-master.dialog.language.select", "data-row-key": dicText.strRowID }}
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
                      <MenuItem controlId="employee-category-master.dialog.language.option" data-option-key={dicLanguage.intID} key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    controlId="employee-category-master.dialog.translated-name.input"
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicEmployeeCategoryLabels.fieldName)}
                    value={dicText.strEmployeeCategoryName}
                    inputProps={{ "controlId": "employee-category-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                    onChange={(objEvent) => {
                      const strValue = objEvent.target.value;
                      updateTextRow(dicText.strRowID, "strEmployeeCategoryName", strValue);
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
                    controlId="employee-category-master.dialog.translated-code.input"
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicEmployeeCategoryLabels.fieldCode)}
                    value={dicText.strEmployeeCategoryCode}
                    inputProps={{ "controlId": "employee-category-master.dialog.translated-code.input", "data-row-key": dicText.strRowID }}
                    disabled
                    fullWidth
                  />
                </Box>
              ))}
            </Box>
            </>

          </Box>
        }
      />

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicEmployeeCategoryLabels.confirmButton}
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
