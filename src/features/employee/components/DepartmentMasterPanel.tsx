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
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/components/master/CommonConfirmDialog";
import CommonMasterDialog from "@/components/master/CommonMasterDialog";
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
const lstRowsPerPageOptions = [10, 20, 50];
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

// Exports the current filtered grid as an Excel-friendly CSV file.
function downloadCsv(strFileName: string, lstRows: DepartmentRecord[]) {
  const lstHeaders = ["Department Name", "Department Code", "Status", "Employees"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.name, dicRow.code, dicRow.status, dicRow.employeeCount]
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

// Opens a print-friendly browser window so the visible dataset can be saved as PDF.
function exportPdf(strTitle: string, lstRows: DepartmentRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.name}</td>
      <td>${dicRow.code}</td>
      <td>${dicRow.status}</td>
      <td>${dicRow.employeeCount}</td>
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
              <th>Department Name</th>
              <th>Department Code</th>
              <th>Status</th>
              <th>Employees</th>
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
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
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
    loadingDepartments: t("loading_departments"),
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
      setIntPage(1);
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

  const intPageCount = Math.max(1, Math.ceil(lstFilteredDepartments.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleDepartments = lstFilteredDepartments.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleDepartments.length > 0 && lstVisibleDepartments.every((dicDepartment) => lstSelectedIds.includes(dicDepartment.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleDepartments.some((dicDepartment) => dicDepartment.id === strId));

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
    // Selects only the rows visible on the current page so pagination remains predictable.
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleDepartments.some((dicDepartment) => dicDepartment.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleDepartments.map((dicDepartment) => dicDepartment.id)])]);
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

  function toggleDepartmentStatus(strDepartmentId: string) {
    // Flips one row between Active and Inactive through the shared bulk-status API.
    const objDepartment = lstDepartments.find((dicItem) => dicItem.id === strDepartmentId);
    if (!objDepartment) {
      return;
    }
    const strNextStatus = objDepartment.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicDepartmentLabels.confirmActivateTitle : dicDepartmentLabels.confirmDeactivateTitle,
      strMessage: strNextStatus === "Active" ? dicDepartmentLabels.confirmActivateMessage : dicDepartmentLabels.confirmDeactivateMessage,
      strConfirmLabel: strNextStatus === "Active" ? dicDepartmentLabels.confirmActivateLabel : dicDepartmentLabels.confirmDeactivateLabel,
      fnOnConfirm: async () => {
        await masterApiService.bulkDepartmentStatus([Number(strDepartmentId)], strNextStatus === "Active");
        await loadDepartments();
        showToast(strNextStatus === "Active" ? dicDepartmentLabels.activateSuccess : dicDepartmentLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicDepartmentLabels.backButton}</Button>
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
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicDepartmentLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicDepartmentLabels.searchCodePlaceholder} fullWidth />
          <TextField select label={dicDepartmentLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
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
              <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicDepartmentLabels.bulkActivate}</Button>
            ) : null}
            {blnCanChangeStatus ? (
              <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicDepartmentLabels.bulkDeactivate}</Button>
            ) : null}
            {blnCanDelete ? (
              <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicDepartmentLabels.bulkDelete}</Button>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? (
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicDepartmentLabels.addButton}</Button>
            ) : null}
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicDepartmentLabels.exportFileName, lstFilteredDepartments)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportExcel}</Button>
            ) : null}
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicDepartmentLabels.exportTitle, lstFilteredDepartments)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportPdf}</Button>
            ) : null}
          </Box>

          {!blnLoading && lstFilteredDepartments.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredDepartments.length)} {dicCommonLabels.paginationSeparator} {lstFilteredDepartments.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>
        {blnRightsLoading || blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicDepartmentLabels.loadingDepartments}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Department access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("access_denied_help", "Contact your administrator if you need department visibility.")}
            </Typography>
          </Box>
        ) : (
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                <th>{dicDepartmentLabels.tableActions}</th>
                <th>{dicDepartmentLabels.tableName}</th>
                <th>{dicDepartmentLabels.tableCode}</th>
                <th>{dicDepartmentLabels.tableStatus}</th>
                <th>{dicDepartmentLabels.tableEmployees}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredDepartments.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={6}>{dicDepartmentLabels.emptyMessage}</td></tr>
              ) : lstVisibleDepartments.map((dicDepartment) => {
                const blnSelected = lstSelectedIds.includes(dicDepartment.id);
                return (
                  <tr key={dicDepartment.id} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicDepartment.id)} /></td>
                    <td><CommonRowActions blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} blnCanToggle={blnCanChangeStatus} blnToggleActive={dicDepartment.status === "Active"} onView={() => openDialog("view", dicDepartment)} onEdit={() => openDialog("edit", dicDepartment)} onDelete={() => deleteDepartment(dicDepartment.id)} onToggle={() => toggleDepartmentStatus(dicDepartment.id)} /></td>
                    <td>{dicDepartment.name}</td>
                    <td>{dicDepartment.code}</td>
                    <td><span className={`${styles.statusPill} ${dicDepartment.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicDepartment.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
                    <td>{dicDepartment.employeeCount}</td>
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
        strTitle={strMode === "add" ? dicDepartmentLabels.dialogAddTitle : strMode === "edit" ? dicDepartmentLabels.dialogEditTitle : dicDepartmentLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicDepartmentLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveDepartment}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        paperClassName={styles.dialogPaper}
        maxWidth="xl"
        paperSx={{ width: "min(1220px, calc(100vw - 44px))", overflow: "hidden" }}
        contentSx={{ overflowX: "hidden", overflowY: "visible" }}
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.6,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              <TextField
                label={`${dicDepartmentLabels.fieldName} *`}
                value={dicForm.name}
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
                label={`${dicDepartmentLabels.fieldCode} *`}
                value={dicForm.code}
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
              <TextField
                label={dicDepartmentLabels.fieldEmployees}
                value={strMode === "add" ? "0" : lstDepartments.find((dicDepartment) => dicDepartment.id === strEditingDepartmentId)?.employeeCount ?? 0}
                disabled
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
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  disabled
                >
                  {t("add_language", "Add Language")}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void handleTranslateClick()}
                  disabled={strMode === "view" || blnSubmitting || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
                  sx={{
                    minWidth: 108,
                    borderRadius: "12px",
                    background: "#2563eb",
                    boxShadow: "none",
                    "&:hover": { background: "#1d4ed8", boxShadow: "none" },
                  }}
                >
                  {dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""] ? (
                    <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                  ) : (
                    t("translate", "Translate")
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
                    disabled
                    fullWidth
                  >
                    {objFormOptions.lstLanguages.map((dicLanguage) => (
                      <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicDepartmentLabels.fieldName)}
                    value={dicText.strDepartmentName}
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
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicDepartmentLabels.fieldCode)}
                    value={dicText.strDepartmentCode}
                    disabled
                    fullWidth
                  />
                </Box>
              ))}
            </Box>

            <Box className={styles.switchRow}>
              <Typography className={styles.switchLabel}>{dicDepartmentLabels.fieldIsActive}</Typography>
              <Switch checked={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))} />
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

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
