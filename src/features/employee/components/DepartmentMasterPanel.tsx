"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Breadcrumbs,
  Link,
  Box,
  Button,
  Checkbox,
  InputAdornment,
  IconButton,
  Tooltip,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader, { DottedLoader } from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { authHelpers } from "@/lib/auth";
import { DepartmentApiRecord, masterApiService } from "@/services/master/MasterApiService";
import {
  createEmptyDepartmentTextRow,
  createInitialDepartmentForm,
  departmentService,
  toDepartmentFormValues,
  type DepartmentFormValues,
  type DepartmentTextFormValue,
} from "@/features/employee/services/departmentService";

type DepartmentStatus = "Active" | "Inactive";
type DepartmentMode = "add" | "edit" | "view";

type DepartmentRecord = {
  id: string;
  code: string;
  name: string;
  status: DepartmentStatus;
  employeeCount: number;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | DepartmentStatus;
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

type DepartmentFormOptions = {
  lstLanguages: Array<{
    intID: number;
    strLabel: string;
    strCode?: string;
  }>;
};

const dicEmptyForm = createInitialDepartmentForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultDepartments: DepartmentRecord[] = [];
const lstDepartmentModuleCodes = ["DEPARTMENT", "DEPARTMENTS", "MASTER_DEPARTMENT"];
const intDepartmentSkeletonRows = 8;

function DepartmentGridSkeleton() {
  return (
    <Box
      data-control-id="department-master.list.skeleton"
      className="app-master-grid-skeleton"
    >
      <Box className="app-master-grid-skeleton-toolbar">
        <Skeleton variant="rounded" width={142} height={36} />
        <Box className="app-master-grid-skeleton-toolbar-actions">
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box className="app-master-grid-skeleton-table">
        <Box className="app-master-grid-skeleton-header">
          {[0, 1, 2, 3, 4].map((intColumn) => (
            <Box key={intColumn} className="app-master-grid-skeleton-header-cell">
              <Skeleton variant="text" width={intColumn === 0 ? 18 : intColumn === 3 ? 76 : 118} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intDepartmentSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            className="app-master-grid-skeleton-row"
          >
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="rounded" width={18} height={18} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="text" width={`${62 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="text" width={`${36 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="rounded" width={72} height={22} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="text" width={42} height={20} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// The API returns backend field names; the UI keeps a smaller view model for rendering and form state.
function mapDepartmentRecord(dicRecord: DepartmentApiRecord): DepartmentRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strDepartmentCode,
    name: dicRecord.strDepartmentName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
    employeeCount: dicRecord.intEmployeeCount ?? 0
  };
}

// Department master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function DepartmentMasterPanel() {
  const { t } = useModuleLabels("department");
  const { blnLoading: blnRightsLoading, strError: strRightsError, objRights, canDo, canViewModule } = useActionRights();
  const [lstDepartments, setLstDepartments] = useState<DepartmentRecord[]>(lstDefaultDepartments);
  const [objFormOptions, setObjFormOptions] = useState<DepartmentFormOptions>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<DepartmentMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingDepartmentId, setStrEditingDepartmentId] = useState("");
  const [dicForm, setDicForm] = useState<DepartmentFormValues>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<"code" | "name", string>>>({});
  const objNameInputRef = useRef<HTMLInputElement>(null);
  const objCodeInputRef = useRef<HTMLInputElement>(null);
  const strPendingErrorFocusRef = useRef<"name" | "code" | null>(null);
  const blnOpeningDepartmentRef = useRef(false);
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const lstResolvedDepartmentModuleCodes = useMemo(() => {
    const lstDynamicMatches = Object.keys(objRights.dicAllowedActions ?? {}).filter((strModuleCode) => {
      const strNormalized = strModuleCode.trim().toUpperCase().replace(/[-\s]/g, "_");
      return strNormalized.includes("DEPARTMENT");
    });
    return lstDynamicMatches.length > 0 ? lstDynamicMatches : lstDepartmentModuleCodes;
  }, [objRights.dicAllowedActions]);

  function canDoDepartmentAction(strActionCode: string) {
    return lstResolvedDepartmentModuleCodes.some((strModuleCode) => canDo(strModuleCode, strActionCode));
  }

  function canViewDepartmentModule() {
    return lstResolvedDepartmentModuleCodes.some((strModuleCode) => canViewModule(strModuleCode));
  }

  function isDepartmentReadOnly() {
    return canViewDepartmentModule() && !["add", "edit", "delete", "approve", "submit", "export"].some(canDoDepartmentAction);
  }

  const dicCommonLabels = {
    cancel: t("cancel"),
    clear: t("clear"),
    close: t("close"),
    delete: t("delete"),
    save: t("save"),
    search: t("search"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    loading: t("loading"),
    processing: t("processing"),
  };
  const dicDepartmentLabels = {
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
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    emptyMessage: t("empty_message"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableStatus: t("table_status"),
    tableEmployees: t("table_employees"),
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
    confirmDeleteMessage: t("confirm_delete_message", "Are you sure you want to delete this department record?"),
    confirmActivateMessage: t("confirm_activate_message", "Are you sure you want to mark this department as active?"),
    confirmDeactivateMessage: t("confirm_deactivate_message", "Are you sure you want to mark this department as inactive?"),
    fieldName: t("field_name", dicConstant.departments.fields.name),
    fieldCode: t("field_code", dicConstant.departments.fields.code),
    saving: t("saving", "Saving..."),
    validationNameRequired: t("validation_name_required", dicConstant.departments.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.departments.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.departments.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.departments.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.departments.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.departments.validation.nameDuplicate),
  };

  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objFormOptions.lstLanguages[0]?.intID ??
    1;

  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function buildFixedLanguageRow(
    intLanguageID: number,
    strDepartmentName: string,
    strDepartmentCode: string,
    lstExistingTexts: DepartmentTextFormValue[],
    dicOptions: DepartmentFormOptions = objFormOptions,
  ): DepartmentTextFormValue {
    const dicLanguage = dicOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyDepartmentTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strDepartmentName,
      strDepartmentCode,
    };
  }

  function ensureTenantLanguageRows(
    dicValues: DepartmentFormValues,
    dicOptions: DepartmentFormOptions = objFormOptions,
  ) {
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.name,
      dicValues.code,
      dicValues.lstTexts,
      dicOptions,
    );
    if (!intSecondaryLanguageID) {
      return {
        ...dicValues,
        lstTexts: [dicDefaultRow],
      };
    }
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strDepartmentName ?? "",
      dicValues.code,
      dicValues.lstTexts,
      dicOptions,
    );
    return {
      ...dicValues,
      lstTexts: [dicDefaultRow, dicSecondaryRow],
    };
  }

  function syncEnglishDepartmentName(strDepartmentName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? { ...dicText, strDepartmentName }
          : dicText),
      };
    });
  }

  async function translateTextRow(strRowID: string, intLanguageID: number) {
    const dicSelectedLanguage = objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intLanguageID);
    const strSourceDepartmentName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceDepartmentName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strDepartmentName.trim() || strLastTranslatedSource !== strSourceDepartmentName;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await departmentService.translateDepartmentText(
        strSourceDepartmentName,
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
              strDepartmentName: strTranslatedName,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceDepartmentName,
      }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicDepartmentLabels.requestFailed, "error");
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  function syncDepartmentCode(strDepartmentCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({
        ...dicText,
        strDepartmentCode,
      })),
    }));
  }

  function updateTextRow(strRowID: string, strField: keyof DepartmentTextFormValue, objValue: string | number) {
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

  const lstVisibleTranslationRows = dicForm.lstTexts.filter((dicText) => {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === Number(dicText.intLanguageID));
    const strCode = dicLanguage?.strCode?.trim().toLowerCase() ?? "";
    const strName = (dicLanguage?.strLabel ?? dicText.strLanguageName).trim().toLowerCase();
    return Number(dicText.intLanguageID) !== intDefaultLanguageID &&
      !/^es(?:[-_]|$)/.test(strCode) && !["spa", "spanish", "espa?ol", "espanol"].includes(strCode) &&
      !/spanish|espa?ol|espanol/.test(strName);
  });

  async function handleTranslateClick() {
    const dicSecondaryRow = lstVisibleTranslationRows[0];
    if (!dicSecondaryRow) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID));
  }

  async function loadDepartments() {
    // Every mutation reloads from the backend so the grid stays aligned with the persisted DB state.
    if (!canViewDepartmentModule()) {
      setLstDepartments([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getDepartments();
      setLstDepartments(objResult.Data.map(mapDepartmentRecord));
      setLstSelectedIds([]);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    let blnMounted = true;
    departmentService.getDepartmentFormOptions()
      .then((dicOptions) => {
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(dicOptions);
      })
      .catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, []);

  async function ensureDepartmentFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await departmentService.getDepartmentFormOptions();
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
    if (blnRightsLoading) {
      return;
    }

    if (!canViewDepartmentModule()) {
      setLstDepartments([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }

    loadDepartments().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewDepartmentModule();
  const blnCanAdd = canDoDepartmentAction("add");
  const blnCanEdit = canDoDepartmentAction("edit");
  const blnCanDelete = canDoDepartmentAction("delete");
  const blnCanExport = canDoDepartmentAction("export");
  const blnReadOnly = isDepartmentReadOnly();
  const blnCanChangeStatus = blnCanEdit;
  const blnSearchPanelFrozen = blnLoading || blnSubmitting || blnRightsLoading;

  useEffect(() => {
    if (!blnDialogOpen || strMode === "view") return;
    const strField = strPendingErrorFocusRef.current;
    strPendingErrorFocusRef.current = null;
    if (strField === "name") {
      objNameInputRef.current?.focus();
    } else if (strField === "code") {
      objCodeInputRef.current?.focus();
    }
  }, [blnDialogOpen, dicErrors, strMode]);

  // Search is applied explicitly so typing in the filters does not re-query/re-page the grid on every keypress.
  const lstFilteredDepartments = useMemo(() => lstDepartments.filter((dicDepartment) => {
    const blnCodeMatch = !dicSearchApplied.code || dicDepartment.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicDepartment.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicDepartment.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstDepartments]);
  const blnAllFilteredSelected = lstFilteredDepartments.length > 0 && lstFilteredDepartments.every((dicDepartment) => lstSelectedIds.includes(dicDepartment.id));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFilteredDepartments.some((dicDepartment) => lstSelectedIds.includes(dicDepartment.id));

  function openDialog(strNextMode: DepartmentMode, dicDepartment?: DepartmentRecord) {
    // Reuses one dialog for add, edit, and read-only view modes.
    if (blnOpeningDepartmentRef.current) return;
    setStrMode(strNextMode === "edit" && !blnCanEdit ? "view" : strNextMode);
    setStrEditingDepartmentId(dicDepartment?.id ?? "");
    strPendingErrorFocusRef.current = null;
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    blnOpeningDepartmentRef.current = true;
    setBlnSubmitting(true);
    ensureDepartmentFormOptionsLoaded()
      .then((dicOptions) => {
        if (!dicDepartment) {
          setDicForm(ensureTenantLanguageRows(createInitialDepartmentForm(), dicOptions));
          setBlnDialogOpen(true);
          return;
        }
        return departmentService.getDepartment(Number(dicDepartment.id)).then((dicRecord) => {
          setDicForm(ensureTenantLanguageRows(toDepartmentFormValues(dicRecord, dicOptions), dicOptions));
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDepartmentLabels.requestFailed, "error"))
      .finally(() => {
        blnOpeningDepartmentRef.current = false;
        setBlnSubmitting(false);
      });
  }

  function closeDialog() {
    // Closes the form dialog without mutating persisted data.
    strPendingErrorFocusRef.current = null;
    setBlnDialogOpen(false);
  }

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    // Central success/error feedback for save, delete, bulk actions, and failures.
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    // Hides the current toast while preserving the previous message for the next open cycle.
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    // Stores the action callback so the same compact dialog can confirm different operations.
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    // Clears the pending confirmation action.
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    // Bulk actions, row toggles, deletes, and resets all flow through one compact confirmation dialog.
    if (!objConfirmDialog) {
      return;
    }
    setBlnSubmitting(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Request failed.", "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    // Frontend validation mirrors the backend uniqueness/shape rules to fail fast before submit.
    const dicNextErrors: Partial<Record<"code" | "name", string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();

    if (!strName) {
      dicNextErrors.name = dicDepartmentLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicDepartmentLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicDepartmentLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9-]{2,20}$/.test(strCode)) {
      dicNextErrors.code = dicDepartmentLabels.validationCodeFormat;
    }

    if (lstDepartments.some((dicDepartment) => dicDepartment.code.toUpperCase() === strCode && dicDepartment.id !== strEditingDepartmentId)) {
      dicNextErrors.code = dicDepartmentLabels.validationCodeDuplicate;
    }

    if (lstDepartments.some((dicDepartment) => dicDepartment.name.trim().toLowerCase() === strName.toLowerCase() && dicDepartment.id !== strEditingDepartmentId)) {
      dicNextErrors.name = dicDepartmentLabels.validationNameDuplicate;
    }

    strPendingErrorFocusRef.current = dicNextErrors.name ? "name" : dicNextErrors.code ? "code" : null;
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveDepartment() {
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
      ? departmentService.createDepartment(dicPayload)
      : departmentService.updateDepartment(Number(strEditingDepartmentId), dicPayload);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadDepartments())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicDepartmentLabels.saveSuccess : dicDepartmentLabels.updateSuccess);
      })
      .catch((objError) => {
        const strMessage = objError instanceof Error ? objError.message : dicDepartmentLabels.requestFailed;
        const blnCodeError = /department code/i.test(strMessage) && !/department name/i.test(strMessage);
        const blnNameError = /department name/i.test(strMessage) && !/department code/i.test(strMessage);
        if (blnCodeError || blnNameError) {
          strPendingErrorFocusRef.current = blnCodeError ? "code" : "name";
          setDicErrors({ [blnCodeError ? "code" : "name"]: strMessage });
        } else {
          showToast(strMessage, "error");
        }
      })
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strDepartmentId: string) {
    // Adds or removes a single row from the bulk-action selection set.
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strDepartmentId)
      ? lstPrevious.filter((strId) => strId !== strDepartmentId)
      : [...lstPrevious, strDepartmentId]);
  }

  function toggleSelectAll() {
    // Selects the full filtered dataset because paging is handled by the shared table.
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstFilteredDepartments.some((dicDepartment) => dicDepartment.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFilteredDepartments.map((dicDepartment) => dicDepartment.id)])]);
  }

  function bulkUpdateStatus(strStatus: DepartmentStatus) {
    // Confirms and applies the same active/inactive state to all selected rows.
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicDepartmentLabels.confirmBulkActivateTitle : dicDepartmentLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicDepartmentLabels.confirmBulkActivateMessage : dicDepartmentLabels.confirmBulkDeactivateMessage).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? dicDepartmentLabels.confirmBulkActivateLabel : dicDepartmentLabels.confirmBulkDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadDepartments();
        showToast(strStatus === "Active" ? dicDepartmentLabels.bulkActivateSuccess : dicDepartmentLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    // Confirms and deletes all currently selected department rows.
    openConfirmDialog({
      strTitle: dicDepartmentLabels.confirmBulkDeleteTitle,
      strMessage: dicDepartmentLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicDepartmentLabels.confirmBulkDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentDelete(lstSelectedIds.map(Number));
        await loadDepartments();
        showToast(dicDepartmentLabels.bulkDeleteSuccess);
      }
    });
  }

  const lstTableRows = useMemo(
    () =>
      lstFilteredDepartments.map((dicDepartment) => {
        const blnSelected = lstSelectedIds.includes(dicDepartment.id);
        return {
          id: dicDepartment.id,
          select: <Checkbox inputProps={{ "controlId": "department-master.list.row.select.checkbox", "data-row-key": String(dicDepartment.id) } as InputHTMLAttributes<HTMLInputElement>} checked={blnSelected} onChange={() => toggleSelection(dicDepartment.id)} />,
          nameText: dicDepartment.name,
          name: (
            <Link component="button" type="button" underline="none"
              className="app-mui-link-muted app-master-first-column-link"
              disabled={!blnCanView && !blnCanEdit}
              data-control-id="department-master.list.row.name.button"
              onClick={(objEvent) => {
                if (window.getSelection()?.toString()) {
                  objEvent.stopPropagation();
                  return;
                }
                openDialog(blnCanEdit ? "edit" : "view", dicDepartment);
              }}>
              {dicDepartment.name}
            </Link>
          ),
          code: dicDepartment.code,
          status: (
            <span className={`app-master-status-pill ${dicDepartment.status === "Active" ? "app-master-status-active" : "app-master-status-inactive"}`}>
              {dicDepartment.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
            </span>
          ),
          employeeCount: dicDepartment.employeeCount,
        };
      }),
    [blnCanChangeStatus, blnCanDelete, blnCanEdit, blnCanView, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFilteredDepartments, lstSelectedIds]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            inputProps={{ "controlId": "department-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
            checked={blnAllFilteredSelected}
            indeterminate={blnSomeFilteredSelected}
            onChange={toggleSelectAll}
            disabled={lstFilteredDepartments.length === 0}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56
      },
      { field: "name", headerName: dicDepartmentLabels.tableName, sortAccessor: (row) => row.nameText },
      { field: "code", headerName: dicDepartmentLabels.tableCode },
      { field: "employeeCount", headerName: dicDepartmentLabels.tableEmployees },
      { field: "status", headerName: dicDepartmentLabels.tableStatus, sortable: false, filterable: false },
    ],
    [
      blnAllFilteredSelected,
      blnSomeFilteredSelected,
      dicDepartmentLabels.tableCode,
      dicDepartmentLabels.tableEmployees,
      dicDepartmentLabels.tableName,
      dicDepartmentLabels.tableStatus,
      lstFilteredDepartments.length
    ]
  );

  return (
    <Box className={`${styles.page} app-master-page-relative`}>
      <Breadcrumbs className="app-breadcrumbs app-breadcrumbs-master" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon className="app-breadcrumb-separator-icon" />}>
        <Typography className="app-breadcrumb-label">{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_departments", "Departments")}</Typography>
      </Breadcrumbs>

      <Box className="app-master-search-panel">
        {strRightsError ? (
          <Typography className="app-master-access-message app-master-access-warning">{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography className="app-master-access-message app-master-access-info">
            {t("read_only_mode", "You have view-only access for Department.")}
          </Typography>
        ) : null}
        <Box
          className={`${styles.searchRow} app-master-search-row-centered`}
          aria-busy={blnSearchPanelFrozen}
        >
          <TextField className="app-mui-text-field" id="department-search-name" controlId="department-master.list.search-name.input" inputProps={{ "controlId": "department-master.list.search-name.input" }} label={dicDepartmentLabels.tableName} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDepartmentLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="department-search-code" controlId="department-master.list.search-code.input" inputProps={{ "controlId": "department-master.list.search-code.input" }} label={dicDepartmentLabels.tableCode} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDepartmentLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="department-search-status" controlId="department-master.list.search-status.select" inputProps={{ "controlId": "department-master.list.search-status.select" }} select label={dicDepartmentLabels.tableStatus} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" disabled={blnSearchPanelFrozen} fullWidth>
            <MenuItem controlId="department-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="department-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="department-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button data-control-id="department-master.list.search.button" className="app-btn app-btn-primary" size="small" startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnSearchPanelFrozen}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="department-master.list.clear.button" className="app-btn app-btn-outline" size="small" startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnSearchPanelFrozen}>{dicCommonLabels.clear}</Button></Box>
        </Box>

        {!blnSubmitting && lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicDepartmentLabels.bulkRowsSelected}`}</Typography>
            {blnCanChangeStatus ? (
              <Button data-control-id="department-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicDepartmentLabels.bulkActivate}</Button>
            ) : null}
            {blnCanChangeStatus ? (
              <Button data-control-id="department-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicDepartmentLabels.bulkDeactivate}</Button>
            ) : null}
            {blnCanDelete ? (
              <Button data-control-id="department-master.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicDepartmentLabels.bulkDelete}</Button>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box className="app-master-table-panel app-master-page-relative">
        {(blnLoading || blnRightsLoading) && !blnDialogOpen ? (
          <DepartmentGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography className="app-master-empty-title">{t("access_denied", "Department access is not available for your user group.")}</Typography>
            <Typography className="app-master-empty-help">
              {t("access_denied_help", "Contact your administrator if you need department visibility.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={dicDepartmentLabels.exportFileName}
            exportButtonClassName="app-btn app-btn-outline"
            showExportOptions={blnCanExport}
            testIdPrefix="department-master.list"
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              const dicDepartment = lstDepartments.find((dicItem) => dicItem.id === dicRow.id);
              if (dicDepartment) openDialog(blnCanEdit ? "edit" : "view", dicDepartment);
            }}
            minTableWidth={800}
            emptyMessage={dicDepartmentLabels.emptyMessage}
            toolbarLeft={(
              <Box className="app-master-toolbar-actions">
                {blnCanAdd ? (
                  <Button data-control-id="department-master.list.add.button" className="app-btn app-btn-primary" startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                    {dicDepartmentLabels.addButton}
                  </Button>
                ) : null}
              </Box>
            )}
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
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") {
            closeDialog();
          }
        }}
        rootTestId="department-master.dialog"
        cancelButtonTestId="department-master.dialog.cancel.button"
        primaryButtonTestId="department-master.dialog.save.button"
        strTitle={strMode === "add" ? dicDepartmentLabels.dialogAddTitle : strMode === "edit" ? dicDepartmentLabels.dialogEditTitle : dicDepartmentLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicDepartmentLabels.saving : dicCommonLabels.save}
        strSecondaryButtonClassName="app-btn app-btn-outline"
        strPrimaryButtonClassName="app-btn app-btn-primary"
        onPrimaryAction={saveDepartment}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeTitleAction={
          <Box className={`${styles.switchRow} app-master-dialog-status-row`}>
            <ActiveStatusSwitch
              className="app-master-dialog-status-switch"
              testId="department-master.dialog.active.switch"
              blnIsActive={dicForm.status === "Active"}
              disabled={strMode === "view"}
              onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))}
            />
            <Typography className={`${styles.switchLabel} app-master-dialog-status-text`}>
              {dicCommonLabels.statusActive}
            </Typography>
            <IconButton aria-label={dicCommonLabels.close} onClick={closeDialog} size="small" className="app-master-dialog-close-button app-master-dialog-close-button-spaced">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        nodeFooterStart={<Typography className="app-master-dialog-required-fields">{t("required_fields_hint", "Required fields are marked")} <Box component="span" className="app-master-dialog-required-asterisk">*</Box></Typography>}
        paperClassName={`${styles.departmentDialogPaper} app-master-dialog-compact-buttons`}
        maxWidth={false}
        fullWidth={false}
        contentClassName="app-master-dialog-content-compact"
        nodeContent={
          <Box className="app-master-dialog-form-grid">
            <Box
              className="app-master-dialog-two-column-grid"
            >
              {strMode === "add" ? (
                <Box className="app-master-dialog-full-row">
                  <Typography className="app-master-dialog-section-heading">
                    {t("basic_information", "Basic Information")}
                  </Typography>
                  <Typography className="app-master-dialog-section-subheading app-master-dialog-section-subheading-spaced">
                    {t("basic_information_help", "Create a new department for your organisation.")}
                  </Typography>
                </Box>
              ) : null}
              <TextField
                className="app-mui-text-field"
                controlId="department-master.dialog.name.input"
                inputRef={objNameInputRef}
                autoFocus={strMode !== "view"}
                label={dicDepartmentLabels.fieldName}
                placeholder={t("dialog_name_placeholder", "Enter department name")}
                size="small"
                required
                value={dicForm.name}
                inputProps={{ "controlId": "department-master.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishDepartmentName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                fullWidth
              />
              <TextField
                className="app-mui-text-field"
                controlId="department-master.dialog.code.input"
                inputRef={objCodeInputRef}
                label={dicDepartmentLabels.fieldCode}
                placeholder={t("dialog_code_placeholder", "Enter department code")}
                size="small"
                required
                value={dicForm.code}
                inputProps={{ "controlId": "department-master.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncDepartmentCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                fullWidth
              />
            </Box>

            {lstVisibleTranslationRows.length > 0 ? (
              <Box className="app-master-translation-panel">
                <Box className="app-master-translation-header">
                  <LanguageRoundedIcon className="app-master-translation-icon" />
                  <Box className="app-master-translation-title">
                    <Typography className="app-master-dialog-section-heading">{t("language_translations", "Language Translations")}</Typography>
                    <Typography className="app-master-dialog-section-subheading">
                      {t("language_translations_help", "Provide translated department names for the application languages you want to support.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button
                        controlId="department-master.dialog.translate.button"
                        variant="outlined"
                        startIcon={<AutoAwesomeRoundedIcon />}
                        onClick={() => void handleTranslateClick()}
                        disabled={strMode === "view" || blnSubmitting || !dicForm.name.trim() || Boolean(dicTextTranslationLoading[lstVisibleTranslationRows[0]?.strRowID ?? ""])}
                        className="app-btn app-btn-outline app-btn-white app-master-translation-button"
                      >
                        {t("translate", "AI Translate")}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <Box className="app-master-translation-rows">
                  {lstVisibleTranslationRows.map((dicText) => (
                    <Box key={dicText.strRowID} className="app-master-translation-row">
                      <Typography component="label" htmlFor={`department-translation-${dicText.strRowID}`} className="app-master-translation-label">
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        className="app-mui-text-field"
                        id={`department-translation-${dicText.strRowID}`}
                        controlId="department-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter department name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strDepartmentName}
                        inputProps={{ "controlId": "department-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strDepartmentName", objEvent.target.value)}
                        disabled={strMode === "view"}
                        InputProps={{
                          endAdornment: dicTextTranslationLoading[dicText.strRowID] ? (
                            <InputAdornment position="end"><DottedLoader intSize={18} className="app-master-translation-loader" /></InputAdornment>
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
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicDepartmentLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" className="app-master-toast-alert">
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
