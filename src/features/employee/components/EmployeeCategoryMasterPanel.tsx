"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader, { DottedLoader } from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
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
  name: ReactNode;
  nameText: string;
  code: string;
  status: ReactNode;
  statusSortValue: string;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | EmployeeCategoryStatus;
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
const intEmployeeCategorySkeletonRows = 8;

function EmployeeCategoryGridSkeleton() {
  return (
    <Box
      data-control-id="employee-category-master.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={178} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 760 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.8fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 2 ? 76 : 148} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intEmployeeCategorySkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 0.8fr",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${58 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${38 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

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
  const objNameInputRef = useRef<HTMLInputElement>(null);
  const objCodeInputRef = useRef<HTMLInputElement>(null);
  const strPendingErrorFocusRef = useRef<"name" | "code" | null>(null);
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
    tableName: "Employee Category Name",
    tableCode: "Employee Category Code",
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
    fieldName: "Employee Category Name",
    fieldCode: "Employee Category Code",
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
    name: (
      <Link
        component="button"
        type="button"
        underline="none"
        disabled={!blnCanView && !blnCanEdit}
        className="app-master-first-column-link"
        data-control-id="employee-category-master.list.row.name.button"
        onClick={(objEvent) => {
          if (window.getSelection()?.toString()) {
            objEvent.stopPropagation();
            return;
          }
          openDialog(blnCanEdit ? "edit" : "view", dicEmployeeCategory);
        }}
      >
        {dicEmployeeCategory.name}
      </Link>
    ),
    nameText: dicEmployeeCategory.name,
    code: dicEmployeeCategory.code,
    status: (
      <span className={`app-master-status-pill ${dicEmployeeCategory.status === "Active" ? "app-master-status-active" : "app-master-status-inactive"}`}>
        {dicEmployeeCategory.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
      </span>
    ),
    statusSortValue: dicEmployeeCategory.status
  }));

  const lstTableColumns: CommonTableColumn<EmployeeCategoryTableRow>[] = [
    { field: "name", headerName: dicEmployeeCategoryLabels.tableName, sortAccessor: (dicRow) => dicRow.nameText },
    { field: "code", headerName: dicEmployeeCategoryLabels.tableCode },
    { field: "status", headerName: dicEmployeeCategoryLabels.tableStatus, sortAccessor: (dicRow) => dicRow.statusSortValue }
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
    if (objFormOptions.lstLanguages.length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions.lstLanguages.length]);

  useEffect(() => {
    if (!blnDialogOpen || strMode === "view") {
      return;
    }
    const intTimer = window.setTimeout(() => {
      const strField = strPendingErrorFocusRef.current;
      strPendingErrorFocusRef.current = null;
      if (strField === "code") {
        objCodeInputRef.current?.focus();
        return;
      }
      objNameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(intTimer);
  }, [blnDialogOpen, dicErrors, strMode]);

  function openDialog(strNextMode: EmployeeCategoryMode, dicEmployeeCategory?: EmployeeCategoryRecord) {
    // Reuses one dialog for add, edit, and read-only view modes.
    setStrMode(strNextMode);
    setStrEditingEmployeeCategoryId(dicEmployeeCategory?.id ?? "");
    strPendingErrorFocusRef.current = null;
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
    strPendingErrorFocusRef.current = null;
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

    strPendingErrorFocusRef.current = dicNextErrors.name ? "name" : dicNextErrors.code ? "code" : null;
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
      .catch((objError) => {
        const strMessage = objError instanceof Error ? objError.message : dicEmployeeCategoryLabels.requestFailed;
        const blnCodeError = /employee category code/i.test(strMessage) && !/employee category name/i.test(strMessage);
        const blnNameError = /employee category name/i.test(strMessage) && !/employee category code/i.test(strMessage);
        if (blnCodeError || blnNameError) {
          strPendingErrorFocusRef.current = blnCodeError ? "code" : "name";
          setDicErrors({ [blnCodeError ? "code" : "name"]: strMessage });
        } else {
          showToast(strMessage, "error");
        }
      })
      .finally(() => setBlnSubmitting(false));
  }

  return (
    <Box className={`${styles.page} ${styles.relativePage}`}>
      <Breadcrumbs className="app-breadcrumbs app-breadcrumbs-master" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon className="app-breadcrumb-separator-icon" />}>
        <Typography className="app-breadcrumb-label">{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_employee_categories", "Employee Categories")}</Typography>
      </Breadcrumbs>

      <Box className="app-master-search-panel">
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Employee Category.")}
          </Typography>
        ) : null}
        <Box
          className={styles.searchRow}
          aria-busy={blnLoading || blnRightsLoading || blnSubmitting}
          sx={{
            alignItems: "center",
            "& .MuiButton-root": { alignSelf: "center" },
          }}
        >
          <TextField className="app-mui-text-field" id="employee-category-master-search-name" controlId="employee-category-master.list.search-name.input" inputProps={{ "controlId": "employee-category-master.list.search-name.input" }} label={dicEmployeeCategoryLabels.tableName} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicEmployeeCategoryLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }} disabled={blnLoading || blnRightsLoading || blnSubmitting} fullWidth />
          <TextField className="app-mui-text-field" id="employee-category-master-search-code" controlId="employee-category-master.list.search-code.input" inputProps={{ "controlId": "employee-category-master.list.search-code.input" }} label={dicEmployeeCategoryLabels.tableCode} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicEmployeeCategoryLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }} disabled={blnLoading || blnRightsLoading || blnSubmitting} fullWidth />
          <TextField className="app-mui-text-field" id="employee-category-master-search-status" controlId="employee-category-master.list.search-status.select" inputProps={{ "controlId": "employee-category-master.list.search-status.select" }} select label={dicEmployeeCategoryLabels.tableStatus} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" disabled={blnLoading || blnRightsLoading || blnSubmitting} fullWidth>
            <MenuItem controlId="employee-category-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="employee-category-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="employee-category-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button data-control-id="employee-category-master.list.search.button" className="app-btn app-btn-primary" startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnRightsLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="employee-category-master.list.clear.button" className="app-btn app-btn-outline" startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnRightsLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      <Box className="app-master-table-panel app-master-page-relative">
        {(blnLoading || blnRightsLoading) && !blnDialogOpen ? (
          <EmployeeCategoryGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>EmployeeCategory access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need employee category visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={dicEmployeeCategoryLabels.exportFileName}
            exportButtonClassName="app-btn app-btn-outline"
            showExportOptions={blnCanExport}
            testIdPrefix="employee-category-master.list"
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              const dicCategory = lstEmployeeCategories.find((dicItem) => dicItem.id === dicRow.id);
              if (dicCategory) openDialog(blnCanEdit ? "edit" : "view", dicCategory);
            }}
            minTableWidth={760}
            emptyMessage={dicEmployeeCategoryLabels.emptyMessage}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button data-control-id="employee-category-master.list.add.button" className="app-btn app-btn-primary" startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                    {dicEmployeeCategoryLabels.addButton}
                  </Button>
                ) : null}
              </Box>
            )}
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
            className="app-master-common-table-reset"
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
        rootTestId="employee-category-master.dialog"
        cancelButtonTestId="employee-category-master.dialog.cancel.button"
        primaryButtonTestId="employee-category-master.dialog.save.button"
        strTitle={strMode === "add" ? dicEmployeeCategoryLabels.dialogAddTitle : strMode === "edit" ? dicEmployeeCategoryLabels.dialogEditTitle : dicEmployeeCategoryLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicEmployeeCategoryLabels.saving : dicCommonLabels.save}
        strSecondaryButtonClassName="app-btn app-btn-outline"
        strPrimaryButtonClassName="app-btn app-btn-primary"
        onPrimaryAction={saveEmployeeCategory}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeTitleAction={
          <Box className={`${styles.switchRow} app-master-dialog-status-row`}>
            <ActiveStatusSwitch
              className="app-master-dialog-status-switch"
              testId="employee-category-master.dialog.active.switch"
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
            <Typography className={`${styles.switchLabel} app-master-dialog-status-text`}>{dicCommonLabels.statusActive}</Typography>
            <IconButton aria-label={dicCommonLabels.close} onClick={closeDialog} size="small" className="app-master-dialog-close-button app-master-dialog-close-button-spaced">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        nodeFooterStart={<Typography className="app-master-dialog-required-fields">{t("required_fields_hint", "Required fields are marked")} <Box component="span" className="app-master-dialog-required-asterisk">*</Box></Typography>}
        paperClassName={styles.departmentDialogPaper}
        maxWidth={false}
        fullWidth={false}
        contentClassName="app-master-dialog-content-compact"
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
                  <Typography className="app-master-dialog-section-heading">
                    {t("basic_information", "Basic Information")}
                  </Typography>
                  <Typography className="app-master-dialog-section-subheading app-master-dialog-section-subheading-spaced">
                    {t("basic_information_help", "Create a new employee category for your organisation.")}
                  </Typography>
                </Box>
              ) : null}
              <TextField
                className="app-mui-text-field"
                required
                controlId="employee-category-master.dialog.name.input"
                inputRef={objNameInputRef}
                autoFocus={strMode !== "view"}
                label={dicEmployeeCategoryLabels.fieldName}
                placeholder={t("dialog_name_placeholder", "Enter employee category name")}
                size="small"
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
                className="app-mui-text-field"
                required
                controlId="employee-category-master.dialog.code.input"
                inputRef={objCodeInputRef}
                label={dicEmployeeCategoryLabels.fieldCode}
                placeholder={t("dialog_code_placeholder", "Enter employee category code")}
                size="small"
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

            {dicForm.lstTexts.filter((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID).length > 0 ? (
              <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                  <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography className="app-master-dialog-section-heading">{t("language_translations", "Language Translations")}</Typography>
                    <Typography className="app-master-dialog-section-subheading app-master-dialog-section-subheading-spaced">
                      {t("multilingual_text_help", "Add translated employee category names for supported languages.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button
                        controlId="employee-category-master.dialog.translate.button"
                        className="app-btn app-btn-outline"
                        variant="outlined"
                        startIcon={Object.values(dicTextTranslationLoading).some(Boolean) ? undefined : <AutoAwesomeRoundedIcon />}
                        onClick={() => void handleTranslateClick()}
                        disabled={strMode === "view" || blnSubmitting || dicForm.lstTexts.length < 2 || !dicForm.name.trim() || Object.values(dicTextTranslationLoading).some(Boolean)}
                        sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}
                      >
                        {Object.values(dicTextTranslationLoading).some(Boolean) ? (
                          <DottedLoader intSize={18} sx={{ color: "#2563eb" }} />
                        ) : (
                          t("translate", "AI Translate")
                        )}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
                  {dicForm.lstTexts.filter((dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID).map((dicText) => (
                    <Box key={dicText.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                      <Typography component="label" htmlFor={`employee-category-translation-${dicText.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        className="app-mui-text-field"
                        id={`employee-category-translation-${dicText.strRowID}`}
                        controlId="employee-category-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter employee category name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strEmployeeCategoryName}
                        inputProps={{ "controlId": "employee-category-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strEmployeeCategoryName", objEvent.target.value)}
                        disabled={strMode === "view"}
                        InputProps={{
                          endAdornment: dicTextTranslationLoading[dicText.strRowID] ? (
                            <InputAdornment position="end"><DottedLoader intSize={18} sx={{ color: "#2563eb" }} /></InputAdornment>
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

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" className="app-master-toast-alert">
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
