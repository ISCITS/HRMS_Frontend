"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, MenuItem, Pagination, Paper, Snackbar, Stack, Switch, TextField, Typography } from "@mui/material";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { EssDeclarationCategoryApiRecord, masterApiService, SalaryComponentApiRecord } from "@/services/master/MasterApiService";

type CategoryStatus = "Active" | "Inactive";
type CategoryMode = "add" | "edit" | "view";

type EssDeclarationCategoryRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  declarationKind: string;
  linkedSalaryComponentId: number | null;
  linkedSalaryComponentName: string;
  maxLimitAmount: number | null;
  proofRequired: boolean;
  status: CategoryStatus;
};

type EssDeclarationCategoryForm = {
  code: string;
  name: string;
  description: string;
  declarationKind: string;
  linkedSalaryComponentId: number | "";
  maxLimitAmount: string;
  proofRequired: boolean;
  status: CategoryStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | CategoryStatus;
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

const dicEmptyForm: EssDeclarationCategoryForm = {
  code: "",
  name: "",
  description: "",
  declarationKind: "",
  linkedSalaryComponentId: "",
  maxLimitAmount: "",
  proofRequired: false,
  status: "Active",
};
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];
const lstModuleCodes = [
  "TAX_DECLARATION_COMPONENT",
  "MY_TAX_DECLARATIONS",
  "ESS_DECLARATION_CATEGORY",
  "ESS_DECLARATION_CATEGORIES",
  "ESS_DECLARATIONS",
];

type EssDeclarationCategoryMasterPanelProps = {
  strEntityLabel?: string;
  strEntityLabelPlural?: string;
};
function mapEssDeclarationCategoryRecord(dicRecord: EssDeclarationCategoryApiRecord): EssDeclarationCategoryRecord {
  const objRecord = dicRecord as unknown as Record<string, unknown>;
  const intID = objRecord.intID ?? objRecord.intId ?? objRecord.id;
  const strCategoryCode = objRecord.strCategoryCode ?? objRecord.strCode ?? objRecord.category_code;
  const strCategoryName = objRecord.strCategoryName ?? objRecord.strName ?? objRecord.category_name;
  const strCategoryDescription = objRecord.strCategoryDescription ?? objRecord.strDescription ?? objRecord.category_description;
  const strDeclarationKind = objRecord.strDeclarationKind ?? objRecord.strKind ?? objRecord.declaration_kind;
  const intLinkedSalaryComponentID = objRecord.intLinkedSalaryComponentID ?? objRecord.intSalaryComponentID ?? objRecord.linked_salary_component_id;
  const strLinkedSalaryComponentName = objRecord.strLinkedSalaryComponentName ?? objRecord.strSalaryComponentName ?? objRecord.linked_salary_component_name;
  const decMaxLimitAmount = objRecord.decMaxLimitAmount ?? objRecord.decMaxLimit ?? objRecord.max_limit_amount;
  const blnProofRequired = objRecord.blnProofRequired ?? objRecord.blnIsProofRequired ?? objRecord.proof_required;
  const blnIsActive = objRecord.blnIsActive ?? objRecord.is_active ?? true;

  const intLinkedSalaryComponentIDResolved = typeof intLinkedSalaryComponentID === "number"
    ? intLinkedSalaryComponentID
    : (typeof intLinkedSalaryComponentID === "string" && intLinkedSalaryComponentID.trim() ? Number(intLinkedSalaryComponentID) : null);
  const decMaxLimitResolved = typeof decMaxLimitAmount === "number"
    ? decMaxLimitAmount
    : (typeof decMaxLimitAmount === "string" && decMaxLimitAmount.trim() ? Number(decMaxLimitAmount) : null);

  return {
    id: String(intID ?? ""),
    code: String(strCategoryCode ?? ""),
    name: String(strCategoryName ?? ""),
    description: String(strCategoryDescription ?? ""),
    declarationKind: String(strDeclarationKind ?? ""),
    linkedSalaryComponentId: Number.isFinite(intLinkedSalaryComponentIDResolved) ? intLinkedSalaryComponentIDResolved : null,
    linkedSalaryComponentName: String(strLinkedSalaryComponentName ?? ""),
    maxLimitAmount: Number.isFinite(decMaxLimitResolved) ? decMaxLimitResolved : null,
    proofRequired: Boolean(blnProofRequired),
    status: Boolean(blnIsActive) ? "Active" : "Inactive",
  };
}

function resolveCategoryRows(objData: unknown) {
  if (Array.isArray(objData)) {
    return objData;
  }
  if (!objData || typeof objData !== "object") {
    return [];
  }
  const objValue = objData as Record<string, unknown>;
  if (Array.isArray(objValue.lstCategories)) {
    return objValue.lstCategories;
  }
  if (Array.isArray(objValue.lstRecords)) {
    return objValue.lstRecords;
  }
  if (Array.isArray(objValue.items)) {
    return objValue.items;
  }
  if (Array.isArray(objValue.rows)) {
    return objValue.rows;
  }
  if (Array.isArray(objValue.records)) {
    return objValue.records;
  }
  if (Array.isArray(objValue.results)) {
    return objValue.results;
  }
  if (Array.isArray(objValue.data)) {
    return objValue.data;
  }
  if (Array.isArray(objValue.Data)) {
    return objValue.Data;
  }
  return [];
}

function formatAmount(numValue: number | null) {
  if (numValue == null) {
    return "-";
  }
  return Number(numValue).toFixed(2);
}

function downloadCsv(strFileName: string, lstRows: EssDeclarationCategoryRecord[]) {
  const lstHeaders = ["Category Name", "Category Code", "Declaration Kind", "Linked Salary Component", "Max Limit Amount", "Proof Required", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.name, dicRow.code, dicRow.declarationKind, dicRow.linkedSalaryComponentName, dicRow.maxLimitAmount == null ? "" : dicRow.maxLimitAmount, dicRow.proofRequired ? "Yes" : "No", dicRow.status]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: EssDeclarationCategoryRecord[]) {
  const objWindow = window.open("", "_blank", "width=1280,height=820");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.name}</td>
      <td>${dicRow.code}</td>
      <td>${dicRow.declarationKind}</td>
      <td>${dicRow.linkedSalaryComponentName || "-"}</td>
      <td>${formatAmount(dicRow.maxLimitAmount)}</td>
      <td>${dicRow.proofRequired ? "Yes" : "No"}</td>
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
              <th>Category Name</th>
              <th>Category Code</th>
              <th>Declaration Kind</th>
              <th>Linked Salary Component</th>
              <th>Max Limit Amount</th>
              <th>Proof Required</th>
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

export default function EssDeclarationCategoryMasterPanel({
  strEntityLabel = "ESS Declaration Category",
  strEntityLabelPlural = "ESS Declaration Categories",
}: EssDeclarationCategoryMasterPanelProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("ess_declaration_category");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstModuleCodes);
  const [lstCategories, setLstCategories] = useState<EssDeclarationCategoryRecord[]>([]);
  const [lstSalaryComponents, setLstSalaryComponents] = useState<SalaryComponentApiRecord[]>([]);
  const [strSalaryComponentError, setStrSalaryComponentError] = useState("");
  const [strMode, setStrMode] = useState<CategoryMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingId, setStrEditingId] = useState("");
  const [dicForm, setDicForm] = useState<EssDeclarationCategoryForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof EssDeclarationCategoryForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnLookupLoading, setBlnLookupLoading] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [strLoadDiagnostics, setStrLoadDiagnostics] = useState("");

  const dicCommonLabels = {
    activate: t("activate", "Activate"),
    cancel: t("cancel", "Cancel"),
    clear: t("clear", "Clear"),
    close: t("close", "Close"),
    confirm: t("confirm", "Confirm"),
    deactivate: t("deactivate", "Deactivate"),
    delete: t("delete", "Delete"),
    exportExcel: t("export_excel", "Export Excel"),
    exportPdf: t("export_pdf", "Export PDF"),
    loading: t("loading", "Loading..."),
    processing: t("processing", "Processing..."),
    rowsPerPage: t("rows_per_page", "Rows Per Page"),
    paginationSeparator: t("pagination_separator", "of"),
    save: t("save", "Save"),
    search: t("search", "Search"),
    statusActive: t("status_active", "Active"),
    statusInactive: t("status_inactive", "Inactive"),
    update: t("update", "Update"),
    yes: t("yes", "Yes"),
    no: t("no", "No"),
  };

  const dicLabels = {
    addButton: t("add_button", `Add ${strEntityLabel}`),
    backButton: t("back_button", "Back"),
    bulkActivate: t("bulk_activate", "Bulk Activate"),
    bulkActivateSuccess: t("bulk_activate_success", "Selected ESS declaration categories were activated successfully."),
    bulkApplyingChanges: t("bulk_applying_changes", "Applying changes..."),
    bulkDeactivate: t("bulk_deactivate", "Bulk Deactivate"),
    bulkDeactivateSuccess: t("bulk_deactivate_success", "Selected ESS declaration categories were deactivated successfully."),
    bulkDelete: t("bulk_delete", "Bulk Delete"),
    bulkDeleteSuccess: t("bulk_delete_success", "Selected ESS declaration categories were deleted successfully."),
    bulkRowsSelected: t("bulk_rows_selected", "rows selected"),
    confirmActivateMessage: t("confirm_activate_message", "Are you sure you want to mark this ESS declaration category as active?"),
    confirmActivateTitle: t("confirm_activate_title", "Activate ESS Declaration Category"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message", "Are you sure you want to activate {count} ESS declaration category record(s)?"),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title", "Bulk Activate ESS Declaration Categories"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message", "Are you sure you want to deactivate {count} ESS declaration category record(s)?"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title", "Bulk Deactivate ESS Declaration Categories"),
    confirmBulkDeleteMessage: t("confirm_bulk_delete_message", "Are you sure you want to delete {count} ESS declaration category record(s)?"),
    confirmBulkDeleteTitle: t("confirm_bulk_delete_title", "Bulk Delete ESS Declaration Categories"),
    confirmDeactivateMessage: t("confirm_deactivate_message", "Are you sure you want to mark this ESS declaration category as inactive?"),
    confirmDeactivateTitle: t("confirm_deactivate_title", "Deactivate ESS Declaration Category"),
    confirmDeleteMessage: t("confirm_delete_message", "Are you sure you want to delete this ESS declaration category record?"),
    confirmDeleteTitle: t("confirm_delete_title", "Delete ESS Declaration Category"),
    deactivateSuccess: t("deactivate_success", "ESS declaration category deactivated successfully."),
    deleteSuccess: t("delete_success", "ESS declaration category deleted successfully."),
    dialogAddTitle: t("dialog_add_title", `Add ${strEntityLabel}`),
    dialogEditTitle: t("dialog_edit_title", `Edit ${strEntityLabel}`),
    dialogViewTitle: t("dialog_view_title", `View ${strEntityLabel}`),
    emptyMessage: t("empty_message", `No ${strEntityLabelPlural.toLowerCase()} found.`),
    exportFileName: t("export_file_name", "ess-declaration-categories.csv"),
    exportTitle: stripMasterTitle(t("export_title", strEntityLabelPlural)),
    fieldCategoryCode: t("field_category_code", "Category Code"),
    fieldCategoryName: t("field_category_name", "Category Name"),
    fieldDeclarationKind: t("field_declaration_kind", "Declaration Kind"),
    fieldDescription: t("field_description", "Description"),
    fieldIsActive: t("field_is_active", "Is Active"),
    fieldLinkedSalaryComponent: t("field_linked_salary_component", "Linked Salary Component"),
    fieldMaxLimitAmount: t("field_max_limit_amount", "Max Limit Amount"),
    fieldProofRequired: t("field_proof_required", "Proof Required"),
    loadingRecords: t("loading_records", "Loading ESS declaration categories..."),
    pageTitle: stripMasterTitle(t("page_title", strEntityLabelPlural)),
    requestFailed: t("request_failed", "Unable to complete the request."),
    saveSuccess: t("save_success", "ESS declaration category saved successfully."),
    activateSuccess: t("activate_success", "ESS declaration category activated successfully."),
    searchCodePlaceholder: t("search_code_placeholder", "Search by category code"),
    searchNamePlaceholder: t("search_name_placeholder", "Search by category name"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    tableActions: t("table_actions", "Actions"),
    tableCategoryCode: t("table_category_code", "Category Code"),
    tableCategoryName: t("table_category_name", "Category Name"),
    tableDeclarationKind: t("table_declaration_kind", "Declaration Kind"),
    tableLinkedSalaryComponent: t("table_linked_salary_component", "Linked Salary Component"),
    tableMaxLimitAmount: t("table_max_limit_amount", "Max Limit"),
    tableProofRequired: t("table_proof_required", "Proof Required"),
    tableStatus: t("table_status", "Status"),
    updateSuccess: t("update_success", "ESS declaration category updated successfully."),
    validationCodeDuplicate: t("validation_code_duplicate", "Category code already exists."),
    validationCodeFormat: t("validation_code_format", "Category code must be 2-50 characters and contain only letters, numbers, spaces, hyphen, underscore, slash, ampersand, or period."),
    validationCodeRequired: t("validation_code_required", "Category code is required."),
    validationDeclarationKindRequired: t("validation_declaration_kind_required", "Declaration kind is required."),
    validationMaxLimitAmount: t("validation_max_limit_amount", "Max limit amount must be a valid non-negative number."),
    validationNameDuplicate: t("validation_name_duplicate", "Category name already exists."),
    validationNameMin: t("validation_name_min", "Category name must be at least 3 characters long."),
    validationNameRequired: t("validation_name_required", "Category name is required."),
  };

  const blnHasMutatingRights = canDoAny("add") || canDoAny("edit") || canDoAny("delete") || canDoAny("export");
  const blnCanView = canViewAny() || blnHasMutatingRights;

  async function loadCategories() {
    if (!blnCanView) {
      setLstCategories([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const lstActionFallbacks = [
        "MASTER_ESS_DECLARATION_CATEGORY_LIST",
        "MASTER_TAX_DECLARATION_COMPONENT_LIST",
        "TAX_DECLARATION_COMPONENT_LIST",
        "TAX_DECLARATION_COMPONENT_VIEW",
        "ESS_IT_DECLARATION_VIEW",
      ];
      const lstEndpointAttempts: Array<{ strSource: "tax-declaration-components" | "ess-declaration-categories"; strMenuAction: string }> = [
        ...lstActionFallbacks.map((strMenuAction) => ({ strSource: "ess-declaration-categories" as const, strMenuAction })),
        ...lstActionFallbacks.map((strMenuAction) => ({ strSource: "tax-declaration-components" as const, strMenuAction })),
      ];
      let lstRawRecords: unknown[] = [];
      let strSource = "ess-declaration-categories";
      const lstAttemptNotes: string[] = [];
      let strLastAccessError = "";
      let objLastError: unknown = null;
      let blnAnySuccessfulCall = false;

      for (const dicAttempt of lstEndpointAttempts) {
        try {
          const objResult = dicAttempt.strSource === "tax-declaration-components"
            ? await masterApiService.getTaxDeclarationComponents(dicAttempt.strMenuAction)
            : await masterApiService.getEssDeclarationCategoriesWithAction(dicAttempt.strMenuAction);
          blnAnySuccessfulCall = true;
          objLastError = null;
          lstRawRecords = resolveCategoryRows(objResult.Data as unknown);
          lstAttemptNotes.push(`${dicAttempt.strSource}:${dicAttempt.strMenuAction}:${lstRawRecords.length}`);
          if (lstRawRecords.length > 0) {
            strSource = `${dicAttempt.strSource} (${dicAttempt.strMenuAction})`;
            break;
          }
        } catch (objError) {
          const strMessage = objError instanceof Error ? objError.message : "request failed";
          const strLowerMessage = strMessage.toLowerCase();
          lstAttemptNotes.push(`${dicAttempt.strSource}:${dicAttempt.strMenuAction}:ERR`);
          if (strLowerMessage.includes("access is not available")) {
            strLastAccessError = strMessage;
            continue;
          }
          // tax-declaration-components is optional in older backend builds.
          if (dicAttempt.strSource === "tax-declaration-components" && strLowerMessage.includes("not found")) {
            continue;
          }
          objLastError = objError;
          continue;
        }
      }

      if (lstRawRecords.length === 0) {
        if (!blnAnySuccessfulCall && objLastError) {
          throw objLastError;
        }
        if (!blnAnySuccessfulCall && strLastAccessError) {
          throw new Error(strLastAccessError);
        }
      }
      const lstMappedRecords = lstRawRecords
        .map((objRecord, intIndex) => {
          const dicMapped = mapEssDeclarationCategoryRecord(objRecord as EssDeclarationCategoryApiRecord);
          if (!dicMapped.id) {
            dicMapped.id = `auto-${intIndex + 1}`;
          }
          return dicMapped;
        });
      setLstCategories(lstMappedRecords);
      setLstSelectedIds([]);
      setIntPage(1);
      setStrLoadDiagnostics(`Loaded ${lstMappedRecords.length} row(s) from ${strSource}. Attempts: ${lstAttemptNotes.join(", ")}`);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error");
      setLstCategories([]);
      setLstSelectedIds([]);
      setIntPage(1);
      setStrLoadDiagnostics(`Load failed: ${objError instanceof Error ? objError.message : "unknown error"}`);
    } finally {
      setBlnLoading(false);
    }
  }

  async function loadSalaryComponentOptions() {
    setBlnLookupLoading(true);
    setStrSalaryComponentError("");
    try {
      const objResult = await masterApiService.getSalaryComponents();
      setLstSalaryComponents(objResult.Data.filter((dicComponent) => dicComponent.blnIsActive));
    } catch (objError) {
      setLstSalaryComponents([]);
      setStrSalaryComponentError(objError instanceof Error ? objError.message : "Unable to load salary component options.");
    } finally {
      setBlnLookupLoading(false);
    }
  }

  async function ensureSalaryComponentOptions() {
    if (blnLookupLoading || lstSalaryComponents.length > 0) {
      return;
    }
    await loadSalaryComponentOptions();
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!blnCanView) {
      setLstCategories([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    loadCategories().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (!blnDialogOpen || strMode === "view") {
      return;
    }
    ensureSalaryComponentOptions().catch(() => undefined);
  }, [blnDialogOpen, strMode]);

  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnCanChangeStatus = blnCanEdit;
  const blnReadOnly = isReadOnly();
  const dicSalaryComponentOptions = useMemo(
    () =>
      lstSalaryComponents
        .slice()
        .sort((a, b) => a.strComponentName.localeCompare(b.strComponentName))
        .map((dicComponent) => ({
          intID: dicComponent.intID,
          strLabel: dicComponent.strComponentCode ? `${dicComponent.strComponentName} (${dicComponent.strComponentCode})` : dicComponent.strComponentName,
        })),
    [lstSalaryComponents],
  );

  const lstFilteredCategories = useMemo(
    () =>
      lstCategories.filter((dicCategory) => {
        const blnCodeMatch = !dicSearchApplied.code || dicCategory.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
        const blnNameMatch = !dicSearchApplied.name || dicCategory.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
        const blnStatusMatch = dicSearchApplied.status === "All" || dicCategory.status === dicSearchApplied.status;
        return blnCodeMatch && blnNameMatch && blnStatusMatch;
      }),
    [dicSearchApplied, lstCategories],
  );

  const intPageCount = Math.max(1, Math.ceil(lstFilteredCategories.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleCategories = lstFilteredCategories.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleCategories.length > 0 && lstVisibleCategories.every((dicCategory) => lstSelectedIds.includes(dicCategory.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strID) => lstVisibleCategories.some((dicCategory) => dicCategory.id === strID));

  function openDialog(strNextMode: CategoryMode, dicCategory?: EssDeclarationCategoryRecord) {
    setStrMode(strNextMode);
    setStrEditingId(dicCategory?.id ?? "");
    setDicErrors({});
    setDicForm(dicCategory ? {
      code: dicCategory.code,
      name: dicCategory.name,
      description: dicCategory.description,
      declarationKind: dicCategory.declarationKind,
      linkedSalaryComponentId: dicCategory.linkedSalaryComponentId ?? "",
      maxLimitAmount: dicCategory.maxLimitAmount == null ? "" : String(dicCategory.maxLimitAmount),
      proofRequired: dicCategory.proofRequired,
      status: dicCategory.status,
    } : dicEmptyForm);
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
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof EssDeclarationCategoryForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strDeclarationKind = dicForm.declarationKind.trim();

    if (!strCode) {
      dicNextErrors.code = dicLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicLabels.validationCodeFormat;
    }

    if (!strName) {
      dicNextErrors.name = dicLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicLabels.validationNameMin;
    }

    if (!strDeclarationKind) {
      dicNextErrors.declarationKind = dicLabels.validationDeclarationKindRequired;
    }

    if (dicForm.maxLimitAmount.trim()) {
      const numValue = Number(dicForm.maxLimitAmount);
      if (Number.isNaN(numValue) || numValue < 0) {
        dicNextErrors.maxLimitAmount = dicLabels.validationMaxLimitAmount;
      }
    }

    if (lstCategories.some((dicCategory) => dicCategory.code.toUpperCase() === strCode && dicCategory.id !== strEditingId)) {
      dicNextErrors.code = dicLabels.validationCodeDuplicate;
    }

    if (lstCategories.some((dicCategory) => dicCategory.name.trim().toLowerCase() === strName.toLowerCase() && dicCategory.id !== strEditingId)) {
      dicNextErrors.name = dicLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCategory() {
    if (!validateForm()) {
      return;
    }

    const dicLocalRecord: EssDeclarationCategoryRecord = {
      id: strEditingId,
      code: dicForm.code.trim().toUpperCase(),
      name: dicForm.name.trim(),
      description: dicForm.description.trim(),
      declarationKind: dicForm.declarationKind.trim(),
      linkedSalaryComponentId: dicForm.linkedSalaryComponentId === "" ? null : Number(dicForm.linkedSalaryComponentId),
      linkedSalaryComponentName: dicSalaryComponentOptions.find((dicOption) => dicOption.intID === dicForm.linkedSalaryComponentId)?.strLabel ?? "",
      maxLimitAmount: dicForm.maxLimitAmount.trim() ? Number(dicForm.maxLimitAmount) : null,
      proofRequired: dicForm.proofRequired,
      status: dicForm.status,
    };

    const objBody = {
      strCategoryCode: dicLocalRecord.code,
      strCategoryName: dicLocalRecord.name,
      strCategoryDescription: dicForm.description.trim() || null,
      strDeclarationKind: dicLocalRecord.declarationKind,
      intLinkedSalaryComponentID: dicLocalRecord.linkedSalaryComponentId,
      decMaxLimitAmount: dicLocalRecord.maxLimitAmount,
      blnProofRequired: dicLocalRecord.proofRequired,
      blnIsActive: dicLocalRecord.status === "Active",
    };

    const objRequest = strMode === "add"
      ? masterApiService.createEssDeclarationCategory(objBody)
      : masterApiService.updateEssDeclarationCategory(Number(strEditingId), objBody);

    setBlnSubmitting(true);
    objRequest.then(() => loadCategories()).then(() => {
      closeDialog();
      showToast(strMode === "add" ? dicLabels.saveSuccess : dicLabels.updateSuccess);
    }).catch((objError) => showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error")).finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strID: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strID) ? lstPrevious.filter((strValue) => strValue !== strID) : [...lstPrevious, strID]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strID) => !lstVisibleCategories.some((dicCategory) => dicCategory.id === strID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleCategories.map((dicCategory) => dicCategory.id)])]);
  }

  function bulkUpdateStatus(strStatus: CategoryStatus) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicLabels.confirmBulkActivateTitle : dicLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicLabels.confirmBulkActivateMessage : dicLabels.confirmBulkDeactivateMessage).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? dicLabels.bulkActivate : dicLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        const lstNumericIDs = lstSelectedIds.map(Number);
        await masterApiService.bulkEssDeclarationCategoryStatus(lstNumericIDs, strStatus === "Active");
        await loadCategories();
        showToast(strStatus === "Active" ? dicLabels.bulkActivateSuccess : dicLabels.bulkDeactivateSuccess);
      },
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: dicLabels.confirmBulkDeleteTitle,
      strMessage: dicLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicLabels.bulkDelete,
      fnOnConfirm: async () => {
        const lstNumericIDs = lstSelectedIds.map(Number);
        await masterApiService.bulkEssDeclarationCategoryDelete(lstNumericIDs);
        await loadCategories();
        showToast(dicLabels.bulkDeleteSuccess);
      },
    });
  }

  function deleteCategory(strID: string) {
    openConfirmDialog({
      strTitle: dicLabels.confirmDeleteTitle,
      strMessage: dicLabels.confirmDeleteMessage,
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkEssDeclarationCategoryDelete([Number(strID)]);
        await loadCategories();
        showToast(dicLabels.deleteSuccess);
      },
    });
  }

  const strDialogTitle = strMode === "add" ? dicLabels.dialogAddTitle : strMode === "edit" ? dicLabels.dialogEditTitle : dicLabels.dialogViewTitle;
  const blnDialogReadOnly = strMode === "view";
  function renderDialogSection(strTitle: string, strSubtitle: string, nodeContent: ReactNode) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: "16px",
          border: "1px solid rgba(203,213,225,0.9)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.92) 100%)",
          p: { xs: 1.35, md: 1.5 },
        }}
      >
        <Stack spacing={0.35} sx={{ mb: 1.1 }}>
          <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.94rem" }}>{strTitle}</Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{strSubtitle}</Typography>
        </Stack>
        {nodeContent}
      </Paper>
    );
  }

  function renderInfoRow(strLabel: string, strValue: string) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1.25,
          alignItems: "center",
          py: 1.1,
          borderBottom: "1px solid rgba(226,232,240,0.9)",
        }}
      >
        <Typography sx={{ color: "#64748b", fontSize: "0.84rem", fontWeight: 600 }}>{strLabel}</Typography>
        <Typography sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 700, textAlign: "right" }}>{strValue}</Typography>
      </Box>
    );
  }

  const nodeDialogContent = (
    <Stack spacing={1.5} sx={{ pt: 0.25 }}>
      {strSalaryComponentError && !blnDialogReadOnly ? <Alert severity="warning" variant="outlined">{strSalaryComponentError}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.45fr) minmax(280px, 0.9fr)" }, gap: 1.5, alignItems: "start" }}>
        <Stack spacing={1.5}>
          {renderDialogSection(
            t("section_core_details", "Core Details"),
            t("section_core_details_help", "Define the primary declaration identity and limit information."),
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
              <TextField
                label={`${dicLabels.fieldCategoryCode} *`}
                value={dicForm.code}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }));
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                fullWidth
                disabled={blnDialogReadOnly}
                size="small"
              />
              <TextField
                label={`${dicLabels.fieldCategoryName} *`}
                value={dicForm.name}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }));
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                fullWidth
                disabled={blnDialogReadOnly}
                size="small"
              />
              <TextField
                label={`${dicLabels.fieldDeclarationKind} *`}
                value={dicForm.declarationKind}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, declarationKind: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, declarationKind: objEvent.target.value }));
                }}
                error={Boolean(dicErrors.declarationKind)}
                helperText={dicErrors.declarationKind}
                fullWidth
                disabled={blnDialogReadOnly}
                size="small"
              />
              <TextField
                label={dicLabels.fieldMaxLimitAmount}
                value={dicForm.maxLimitAmount}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, maxLimitAmount: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, maxLimitAmount: objEvent.target.value }));
                }}
                error={Boolean(dicErrors.maxLimitAmount)}
                helperText={dicErrors.maxLimitAmount}
                fullWidth
                disabled={blnDialogReadOnly}
                size="small"
              />
            </Box>,
          )}

          {renderDialogSection(
            t("section_notes", "Description"),
            t("section_notes_help", "Add explanatory text or internal policy guidance for this declaration."),
            <Stack spacing={1}>
              <TextField
                label={dicLabels.fieldDescription}
                value={dicForm.description}
                onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, description: objEvent.target.value }))}
                fullWidth
                multiline
                minRows={4}
                disabled={blnDialogReadOnly}
                size="small"
              />
              <Box
                className={styles.switchRow}
                sx={{
                  minHeight: 34,
                  px: 0,
                  py: 0,
                  justifyContent: "flex-start",
                  gap: 1,
                }}
              >
                <Typography className={styles.switchLabel} sx={{ fontSize: "0.84rem" }}>
                  {dicLabels.fieldIsActive}
                </Typography>
                <Switch
                  size="small"
                  checked={dicForm.status === "Active"}
                  disabled={blnDialogReadOnly}
                  onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))}
                />
              </Box>
            </Stack>,
          )}
        </Stack>

        <Stack spacing={1.5}>
          {renderDialogSection(
            t("section_configuration", "Configuration"),
            t("section_configuration_help", "Manage proof policy, record status, and component mapping from one place."),
            <Stack spacing={1}>
              <TextField
                select
                label={dicLabels.fieldLinkedSalaryComponent}
                value={dicForm.linkedSalaryComponentId}
                onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, linkedSalaryComponentId: objEvent.target.value === "" ? "" : Number(objEvent.target.value) }))}
                fullWidth
                disabled={blnDialogReadOnly || blnLookupLoading}
                size="small"
              >
                <MenuItem value="">{t("none_option", "None")}</MenuItem>
                {dicSalaryComponentOptions.map((dicOption) => <MenuItem key={dicOption.intID} value={dicOption.intID}>{dicOption.strLabel}</MenuItem>)}
              </TextField>

              <Box
                className={styles.switchRow}
                sx={{
                  px: 1,
                  py: 0.15,
                  minHeight: 40,
                  borderRadius: "12px",
                  border: "1px solid rgba(203,213,225,0.9)",
                  background: "#fff",
                  gap: 0.75,
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ color: "#0f172a", fontSize: "0.84rem", fontWeight: 700 }}>{dicLabels.fieldProofRequired}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1.2 }}>{t("proof_required_help", "Turn on when document evidence is mandatory.")}</Typography>
                </Box>
                <Switch
                  size="small"
                  checked={dicForm.proofRequired}
                  disabled={blnDialogReadOnly}
                  onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, proofRequired: blnChecked }))}
                />
              </Box>
            </Stack>,
          )}

          <Paper
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: "1px solid rgba(191,219,254,0.95)",
              background: "linear-gradient(180deg, rgba(239,246,255,0.96) 0%, rgba(248,250,252,0.98) 100%)",
              p: 1.35,
            }}
          >
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.9rem", mb: 0.3 }}>
              {t("section_live_summary", "Live Summary")}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mb: 0.35 }}>
              {t("section_live_summary_help", "Review the current declaration setup at a glance before saving.")}
            </Typography>
            <Box sx={{ mt: 0.75 }}>
              {renderInfoRow(t("summary_code", "Category Code"), dicForm.code.trim() || t("summary_empty", "Not set"))}
              {renderInfoRow(t("summary_kind", "Declaration Kind"), dicForm.declarationKind.trim() || t("summary_empty", "Not set"))}
              {renderInfoRow(t("summary_limit", "Max Limit"), dicForm.maxLimitAmount.trim() || t("summary_unlimited", "Not specified"))}
              {renderInfoRow(t("summary_proof", "Proof"), dicForm.proofRequired ? t("summary_required", "Required") : t("summary_optional", "Optional"))}
              {renderInfoRow(
                t("summary_component", "Salary Component"),
                blnLookupLoading
                  ? t("summary_loading", "Loading...")
                  : dicSalaryComponentOptions.find((dicOption) => dicOption.intID === dicForm.linkedSalaryComponentId)?.strLabel ?? t("summary_none", "None"),
              )}
            </Box>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicLabels.backButton}</Button>
      </Box>
      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", `You have view-only access for ${strEntityLabel}.`)}</Typography> : null}
        <Typography sx={{ display: "none" }}>{strLoadDiagnostics}</Typography>
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicLabels.searchCodePlaceholder} fullWidth />
          <TextField select label={dicLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
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
            <Typography className={styles.bulkCount}>{dicLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicLabels.bulkRowsSelected}</Typography>
            {blnCanChangeStatus ? <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicLabels.bulkActivate}</Button> : null}
            {blnCanChangeStatus ? <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>
      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicLabels.addButton}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicLabels.exportFileName, lstFilteredCategories)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportExcel}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicLabels.exportTitle, lstFilteredCategories)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportPdf}</Button> : null}
          </Box>
          {!blnLoading && lstFilteredCategories.length > 0 ? (
            <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography>
                <TextField select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>
                  {lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>)}
                </TextField>
                <Typography className={styles.paginationRange}>{intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredCategories.length)} {dicCommonLabels.paginationSeparator} {lstFilteredCategories.length}</Typography>
              </Box>
              <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
            </Box>
          ) : null}
        </Box>
        {blnRightsLoading || blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicLabels.loadingRecords}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", `${strEntityLabel} access is not available for your user group.`)}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need this master visibility.")}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "44px" }} />
                <col style={{ width: "116px" }} />
                <col />
                <col style={{ width: "190px" }} />
                <col style={{ width: "210px" }} />
                <col style={{ width: "300px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "120px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicLabels.tableActions}</th>
                  <th>{dicLabels.tableCategoryName}</th>
                  <th>{dicLabels.tableCategoryCode}</th>
                  <th>{dicLabels.tableDeclarationKind}</th>
                  <th>{dicLabels.tableLinkedSalaryComponent}</th>
                  <th>{dicLabels.tableMaxLimitAmount}</th>
                  <th>{dicLabels.tableProofRequired}</th>
                  <th>{dicLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredCategories.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={9}>{dicLabels.emptyMessage}</td></tr>
                ) : lstVisibleCategories.map((dicCategory) => {
                  const blnSelected = lstSelectedIds.includes(dicCategory.id);
                  return (
                    <tr key={dicCategory.id} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicCategory.id)} /></td>
                      <td><CommonRowActions blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} onView={() => openDialog("view", dicCategory)} onEdit={() => openDialog("edit", dicCategory)} onDelete={() => deleteCategory(dicCategory.id)} /></td>
                      <td>{dicCategory.name}</td>
                      <td>{dicCategory.code}</td>
                      <td>{dicCategory.declarationKind}</td>
                      <td>{dicCategory.linkedSalaryComponentName || "-"}</td>
                      <td>{formatAmount(dicCategory.maxLimitAmount)}</td>
                      <td>{dicCategory.proofRequired ? dicCommonLabels.yes : dicCommonLabels.no}</td>
                      <td><span className={`${styles.statusPill} ${dicCategory.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicCategory.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
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
        strTitle={strDialogTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicCommonLabels.processing : strMode === "add" ? dicCommonLabels.save : dicCommonLabels.update}
        onPrimaryAction={saveCategory}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        maxWidth="lg"
        paperClassName={styles.dialogPaper}
        paperSx={{
          width: "min(94vw, 1180px)",
          maxWidth: "1180px",
          maxHeight: "86vh",
          overflow: "hidden",
          "& .MuiDialogTitle-root": {
            px: { xs: 2, md: 2.5 },
            py: 1.5,
            borderBottom: "1px solid #d9e6ef",
            fontWeight: 800,
          },
          "& .MuiDialogContent-root": {
            px: { xs: 1.5, md: 2.25 },
            py: 1.5,
          },
          "& .MuiDialogActions-root": {
            px: { xs: 2, md: 2.5 },
            py: 1.25,
            borderTop: "1px solid #d9e6ef",
            background: "rgba(255,255,255,0.96)",
          },
        }}
        contentSx={{ px: { xs: 1.5, md: 2.25 }, py: 1.5 }}
        nodeContent={nodeDialogContent}
      />
      <CommonConfirmDialog blnOpen={Boolean(objConfirmDialog)} strTitle={objConfirmDialog?.strTitle} strMessage={objConfirmDialog?.strMessage} strCancelLabel={dicCommonLabels.cancel} strConfirmLabel={blnSubmitting ? dicCommonLabels.processing : objConfirmDialog?.strConfirmLabel ?? dicCommonLabels.confirm} blnConfirmDisabled={blnSubmitting} blnCancelDisabled={blnSubmitting} onClose={closeConfirmDialog} onConfirm={executeConfirmedAction} />
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />
      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
