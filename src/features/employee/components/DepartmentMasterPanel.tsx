"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
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

// The API returns backend field names; the UI keeps a smaller view model for rendering and form state.
function mapDepartmentRecord(dicRecord: DepartmentApiRecord): DepartmentRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strDepartmentCode,
    name: dicRecord.strDepartmentName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
    employeeCount: 0
  };
}

// Department master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function DepartmentMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("department");
  const { blnLoading: blnRightsLoading, strError: strRightsError, objRights, canDo, canViewModule } = useActionRights();
  const [lstDepartments, setLstDepartments] = useState<DepartmentRecord[]>(lstDefaultDepartments);
  const [objFormOptions, setObjFormOptions] = useState<DepartmentFormOptions>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<DepartmentMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingDepartmentId, setStrEditingDepartmentId] = useState("");
  const [dicForm, setDicForm] = useState<DepartmentFormValues>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<"code" | "name", string>>>({});
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [dicRowLabelsByLanguageID, setDicRowLabelsByLanguageID] = useState<Record<number, Record<string, string>>>({});

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
    bulkApplyingChanges: t("bulk_applying_changes"),
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
    fieldEmployees: t("field_employees", "Employees"),
    fieldIsActive: t("field_is_active", "Is Active"),
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

  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID() ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "hi")?.intID ??
    objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID ??
    intDefaultLanguageID;

  function buildFixedLanguageRow(
    intLanguageID: number,
    strDepartmentName: string,
    strDepartmentCode: string,
    lstExistingTexts: DepartmentTextFormValue[],
  ): DepartmentTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
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

  function ensureTenantLanguageRows(dicValues: DepartmentFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.name,
      dicValues.code,
      dicValues.lstTexts,
    );
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strDepartmentName ?? "",
      dicValues.code,
      dicValues.lstTexts,
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

  async function handleTranslateClick() {
    const dicSecondaryRow = dicForm.lstTexts[1];
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

  useEffect(() => {
    let blnMounted = true;
    const lstLanguageIDs = Array.from(
      new Set(
        dicForm.lstTexts
          .map((dicText) => Number(dicText.intLanguageID))
          .filter((intLanguageID) => Number.isFinite(intLanguageID) && intLanguageID > 0)
      )
    );
    const lstLanguageIDsToLoad = lstLanguageIDs.filter((intLanguageID) => !dicRowLabelsByLanguageID[intLanguageID]);
    if (lstLanguageIDsToLoad.length === 0) {
      return () => {
        blnMounted = false;
      };
    }

    async function loadRowLabels() {
      const lstResponses = await Promise.all(
        lstLanguageIDsToLoad.map(async (intLanguageID) => {
          const objResponse = await labelService.getModuleLabels(intLanguageID, "department");
          return {
            intLanguageID,
            dicLabels: objResponse.labels ?? {},
          };
        })
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
    setStrMode(strNextMode);
    setStrEditingDepartmentId(dicDepartment?.id ?? "");
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    if (!dicDepartment) {
      setDicForm(ensureTenantLanguageRows(createInitialDepartmentForm()));
      setBlnDialogOpen(true);
      return;
    }
    setBlnSubmitting(true);
    departmentService.getDepartment(Number(dicDepartment.id))
      .then((dicRecord) => {
        setDicForm(ensureTenantLanguageRows(toDepartmentFormValues(dicRecord, objFormOptions)));
        setBlnDialogOpen(true);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDepartmentLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function closeDialog() {
    // Closes the form dialog without mutating persisted data.
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
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicDepartmentLabels.requestFailed, "error"))
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

  function deleteDepartment(strDepartmentId: string) {
    // Deletes a single department by routing through the same bulk-delete backend endpoint.
    openConfirmDialog({
      strTitle: dicDepartmentLabels.confirmDeleteTitle,
      strMessage: dicDepartmentLabels.confirmDeleteMessage,
      strConfirmLabel: dicDepartmentLabels.confirmDeleteLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentDelete([Number(strDepartmentId)]);
        await loadDepartments();
        showToast(dicDepartmentLabels.deleteSuccess);
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
          action: (
            <CommonRowActions
              testIdPrefix="department-master.list.row"
              rowKey={dicDepartment.id}
              blnCanView={blnCanView}
              blnCanEdit={blnCanEdit}
              blnCanDelete={blnCanDelete}
              onView={() => openDialog("view", dicDepartment)}
              onEdit={() => openDialog("edit", dicDepartment)}
              onDelete={() => deleteDepartment(dicDepartment.id)}
            />
          ),
          name: dicDepartment.name,
          code: dicDepartment.code,
          status: (
            <span className={`${styles.statusPill} ${dicDepartment.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
              {dicDepartment.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
            </span>
          ),
          employeeCount: String(dicDepartment.employeeCount),
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
      { field: "action", headerName: dicDepartmentLabels.tableActions, sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "name", headerName: dicDepartmentLabels.tableName },
      { field: "code", headerName: dicDepartmentLabels.tableCode },
      { field: "status", headerName: dicDepartmentLabels.tableStatus, sortable: false, filterable: false, width: 130 },
      { field: "employeeCount", headerName: dicDepartmentLabels.tableEmployees },
    ],
    [
      blnAllFilteredSelected,
      blnSomeFilteredSelected,
      dicDepartmentLabels.tableActions,
      dicDepartmentLabels.tableCode,
      dicDepartmentLabels.tableEmployees,
      dicDepartmentLabels.tableName,
      dicDepartmentLabels.tableStatus,
      lstFilteredDepartments.length
    ]
  );

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Box className={styles.topBar}>
        <Button data-control-id="department-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicDepartmentLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Department.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField controlId="department-master.list.search-name.input" inputProps={{ "controlId": "department-master.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDepartmentLabels.searchNamePlaceholder} fullWidth />
          <TextField controlId="department-master.list.search-code.input" inputProps={{ "controlId": "department-master.list.search-code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDepartmentLabels.searchCodePlaceholder} fullWidth />
          <TextField controlId="department-master.list.search-status.select" inputProps={{ "controlId": "department-master.list.search-status.select" }} select label={dicDepartmentLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem controlId="department-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="department-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="department-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button data-control-id="department-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="department-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{dicDepartmentLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
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

      <Box className={styles.tableCard}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Department access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("access_denied_help", "Contact your administrator if you need department visibility.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={dicDepartmentLabels.exportFileName}
            showExportOptions={blnCanExport}
            testIdPrefix="department-master.list"
            showPaginationSummary
            emptyMessage={dicDepartmentLabels.emptyMessage}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button data-control-id="department-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                    {dicDepartmentLabels.addButton}
                  </Button>
                ) : null}
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
        rootTestId="department-master.dialog"
        cancelButtonTestId="department-master.dialog.cancel.button"
        primaryButtonTestId="department-master.dialog.save.button"
        strTitle={strMode === "add" ? dicDepartmentLabels.dialogAddTitle : strMode === "edit" ? dicDepartmentLabels.dialogEditTitle : dicDepartmentLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicDepartmentLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveDepartment}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel} sx={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>
              {dicDepartmentLabels.fieldIsActive}
            </Typography>
            <ActiveStatusSwitch
              testId="department-master.dialog.active.switch"
              blnIsActive={dicForm.status === "Active"}
              disabled={strMode === "view"}
              onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))}
            />
          </Box>
        }
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        paperClassName={styles.dialogPaperDapartment}
        maxWidth={false}
        fullWidth={false}
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.6,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              <TextField
                controlId="department-master.dialog.name.input"
                label={dicDepartmentLabels.fieldName}
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
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
              <TextField
                controlId="department-master.dialog.code.input"
                label={dicDepartmentLabels.fieldCode}
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
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
              <TextField
                controlId="department-master.dialog.employee-count.input"
                label={dicDepartmentLabels.fieldEmployees}
                value={strMode === "add" ? "0" : lstDepartments.find((dicDepartment) => dicDepartment.id === strEditingDepartmentId)?.employeeCount ?? 0}
                inputProps={{ "controlId": "department-master.dialog.employee-count.input" }}
                disabled
                sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
                fullWidth
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
                  {t("multilingual_text_help", "Add translated department names for supported languages.")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
                <Button
                  controlId="department-master.dialog.add-language.button"
                  className={styles.secondaryButton}
                  startIcon={<AddRoundedIcon />}
                  disabled
                  sx={{ minHeight: 34 }}
                >
                  {t("add_language", "Add Language")}
                </Button>
                <Button
                  controlId="department-master.dialog.translate.button"
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
                       lg: "minmax(0, 0.95fr) minmax(0, 1.35fr) minmax(0, 0.95fr)",
                     },
                     alignItems: "start",
                     border: "1px solid rgba(203,213,225,0.8)",
                     borderRadius: "16px",
                    p: 1.2,
                    background: "#f8fafc",
                  }}
                >
                  <TextField
                    controlId="department-master.dialog.language.select"
                    select
                    label={getRowLabel(dicText.intLanguageID, "language", t("language", "Language"))}
                    value={dicText.intLanguageID}
                    inputProps={{ "controlId": "department-master.dialog.language.select", "data-row-key": dicText.strRowID }}
                    disabled
                    fullWidth
                  >
                    {objFormOptions.lstLanguages.map((dicLanguage) => (
                      <MenuItem controlId="department-master.dialog.language.option" data-option-key={dicLanguage.intID} key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    controlId="department-master.dialog.translated-name.input"
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicDepartmentLabels.fieldName)}
                    value={dicText.strDepartmentName}
                    inputProps={{ "controlId": "department-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                    onChange={(objEvent) => {
                      const strValue = objEvent.target.value;
                      updateTextRow(dicText.strRowID, "strDepartmentName", strValue);
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
                    controlId="department-master.dialog.translated-code.input"
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicDepartmentLabels.fieldCode)}
                    value={dicText.strDepartmentCode}
                    inputProps={{ "controlId": "department-master.dialog.translated-code.input", "data-row-key": dicText.strRowID }}
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
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicDepartmentLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader
        blnOpen={blnLoading || blnRightsLoading || blnSubmitting}
        strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing}
        intZIndex={1400}
        blnLocal
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
