"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl, FormControlLabel, FormHelperText, FormLabel, IconButton, MenuItem, Paper, Radio, RadioGroup, Snackbar, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import { type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import InvestmentOptionsManagerDialog from "@/features/payroll/components/InvestmentOptionsManagerDialog";
import { DeclarationKindTypeApiRecord, EssDeclarationCategoryApiRecord, masterApiService } from "@/services/master/MasterApiService";

type CategoryStatus = "Active" | "Inactive";
type CategoryMode = "add" | "edit" | "view";
type MaxLimitAppliedAt = "ENTRY_LEVEL" | "APPROVAL_LEVEL";
type ApplicableRegime = "old" | "new" | "both";

type EssDeclarationCategoryRecord = {
  id: string;
  name: string;
  description: string;
  declarationKind: string;
  section: string;
  applicableRegime: ApplicableRegime;
  linkedSalaryComponentId: number | null;
  linkedSalaryComponentName: string;
  maxLimitAmount: number | null;
  maxLimitAppliedAt: MaxLimitAppliedAt;
  proofRequired: boolean;
  status: CategoryStatus;
};

type EssDeclarationCategoryForm = {
  name: string;
  description: string;
  section: string;
  declarationKind: string;
  applicableRegime: ApplicableRegime;
  linkedSalaryComponentId: number | "";
  maxLimitAmount: string;
  maxLimitAppliedAt: MaxLimitAppliedAt;
  proofRequired: boolean;
  status: CategoryStatus;
};

type SearchForm = {
  name: string;
  section: string;
  declarationKind: string;
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
  name: "",
  description: "",
  section: "",
  declarationKind: "",
  applicableRegime: "both",
  linkedSalaryComponentId: "",
  maxLimitAmount: "",
  maxLimitAppliedAt: "ENTRY_LEVEL",
  proofRequired: false,
  status: "Active",
};
const dicEmptySearch: SearchForm = { name: "", section: "", declarationKind: "All", status: "All" };
const lstModuleCodes = [
  "TAX_DECLARATION_COMPONENT",
  "MY_TAX_DECLARATIONS",
  "ESS_DECLARATION_CATEGORY",
  "ESS_DECLARATION_CATEGORIES",
  "ESS_DECLARATIONS",
];
const lstMaxLimitAppliedAtOptions: Array<{ strValue: MaxLimitAppliedAt; strLabel: string }> = [
  { strValue: "ENTRY_LEVEL", strLabel: "Entry Level" },
  { strValue: "APPROVAL_LEVEL", strLabel: "Approval Level" },
];
const lstApplicableRegimeOptions: Array<{ strValue: ApplicableRegime; strLabel: string }> = [
  { strValue: "old", strLabel: "Old Regime" },
  { strValue: "new", strLabel: "New Regime" },
  { strValue: "both", strLabel: "Both Regimes" },
];

type EssDeclarationCategoryMasterPanelProps = {
  strEntityLabel?: string;
  strEntityLabelPlural?: string;
};
function mapEssDeclarationCategoryRecord(dicRecord: EssDeclarationCategoryApiRecord): EssDeclarationCategoryRecord {
  const objRecord = dicRecord as unknown as Record<string, unknown>;
  const intID = objRecord.intID ?? objRecord.intId ?? objRecord.id;
  const strCategoryName = objRecord.strCategoryName ?? objRecord.strName ?? objRecord.category_name;
  const strCategoryDescription = objRecord.strCategoryDescription ?? objRecord.strDescription ?? objRecord.category_description;
  const strDeclarationKind = objRecord.strDeclarationKind ?? objRecord.strKind ?? objRecord.declaration_kind;
  const strSection = objRecord.strSection ?? objRecord.section;
  const strApplicableRegime =
    objRecord.strApplicableRegime
    ?? objRecord.applicableRegime
    ?? objRecord.applicable_regime
    ?? objRecord.str_applicable_regime
    ?? objRecord.regime;
  const intLinkedSalaryComponentID = objRecord.intLinkedSalaryComponentID ?? objRecord.intSalaryComponentID ?? objRecord.linked_salary_component_id;
  const strLinkedSalaryComponentName = objRecord.strLinkedSalaryComponentName ?? objRecord.strSalaryComponentName ?? objRecord.linked_salary_component_name;
  const decMaxLimitAmount = objRecord.decMaxLimitAmount ?? objRecord.decMaxLimit ?? objRecord.max_limit_amount;
  const strMaxLimitAppliedAt = objRecord.strMaxLimitAppliedAt ?? objRecord.strMaximumLimitAppliedAt ?? objRecord.max_limit_applied_at ?? objRecord.maximum_limit_applied_at;
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
    name: String(strCategoryName ?? ""),
    description: String(strCategoryDescription ?? ""),
    declarationKind: String(strDeclarationKind ?? ""),
    section: String(strSection ?? ""),
    applicableRegime: normalizeApplicableRegime(strApplicableRegime),
    linkedSalaryComponentId: Number.isFinite(intLinkedSalaryComponentIDResolved) ? intLinkedSalaryComponentIDResolved : null,
    linkedSalaryComponentName: String(strLinkedSalaryComponentName ?? ""),
    maxLimitAmount: Number.isFinite(decMaxLimitResolved) ? decMaxLimitResolved : null,
    maxLimitAppliedAt: normalizeMaxLimitAppliedAt(strMaxLimitAppliedAt),
    proofRequired: Boolean(blnProofRequired),
    status: Boolean(blnIsActive) ? "Active" : "Inactive",
  };
}

function normalizeApplicableRegime(objValue: unknown): ApplicableRegime {
  const strValue = String(objValue || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (strValue === "all" || strValue === "both" || strValue === "both_regimes") return "both";
  if (strValue === "new" || strValue === "new_regime") return "new";
  if (strValue === "old" || strValue === "old_regime") return "old";
  return "both";
}

function formatApplicableRegime(strValue: ApplicableRegime) {
  if (strValue === "new") return "New Regime";
  if (strValue === "old") return "Old Regime";
  return "Both Regimes";
}

function normalizeMaxLimitAppliedAt(objValue: unknown): MaxLimitAppliedAt {
  const strValue = String(objValue || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return strValue === "APPROVAL_LEVEL" ? "APPROVAL_LEVEL" : "ENTRY_LEVEL";
}

function formatMaxLimitAppliedAt(strValue: MaxLimitAppliedAt, dicOptionLabels?: Record<MaxLimitAppliedAt, string>) {
  if (dicOptionLabels?.[strValue]) {
    return dicOptionLabels[strValue];
  }
  return lstMaxLimitAppliedAtOptions.find((dicOption) => dicOption.strValue === strValue)?.strLabel ?? "Entry Level";
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

export default function EssDeclarationCategoryMasterPanel({
  strEntityLabel = "ESS Declaration Category",
  strEntityLabelPlural = "ESS Declaration Categories",
}: EssDeclarationCategoryMasterPanelProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("ess_declaration_category");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstModuleCodes);
  const [lstCategories, setLstCategories] = useState<EssDeclarationCategoryRecord[]>([]);
  const [lstDeclarationKindTypes, setLstDeclarationKindTypes] = useState<DeclarationKindTypeApiRecord[]>([]);
  const [strDeclarationKindTypeError, setStrDeclarationKindTypeError] = useState("");
  const [blnDeclarationKindTypeLoading, setBlnDeclarationKindTypeLoading] = useState(false);
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
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [strLoadDiagnostics, setStrLoadDiagnostics] = useState("");
  const [objInvestmentOptionsTarget, setObjInvestmentOptionsTarget] = useState<{ code: string; name: string } | null>(null);

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
    all: t("all", "All"),
  };

  const dicLabels = {
    addButton: t("add_button", `Add ${strEntityLabel}`),
    backButton: t("back_button", "Back"),
    bulkActivate: t("bulk_activate", "Bulk Activate"),
    bulkActivateSuccess: t("bulk_activate_success", "Selected ESS declaration categories were activated successfully."),
    bulkApplyingChanges: t("bulk_applying_changes", "Applying changes..."),
    bulkDeactivate: t("bulk_deactivate", "Bulk Deactivate"),
    bulkDeactivateSuccess: t("bulk_deactivate_success", "Selected ESS declaration categories were deactivated successfully."),
    bulkRowsSelected: t("bulk_rows_selected", "rows selected"),
    confirmActivateMessage: t("confirm_activate_message", "Are you sure you want to mark this ESS declaration category as active?"),
    confirmActivateTitle: t("confirm_activate_title", "Activate ESS Declaration Category"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message", "Are you sure you want to activate {count} ESS declaration category record(s)?"),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title", "Bulk Activate ESS Declaration Categories"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message", "Are you sure you want to deactivate {count} ESS declaration category record(s)?"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title", "Bulk Deactivate ESS Declaration Categories"),
    confirmDeactivateMessage: t("confirm_deactivate_message", "Are you sure you want to mark this ESS declaration category as inactive?"),
    confirmDeactivateTitle: t("confirm_deactivate_title", "Deactivate ESS Declaration Category"),
    deactivateSuccess: t("deactivate_success", "ESS declaration category deactivated successfully."),
    dialogAddTitle: t("dialog_add_title", `Add ${strEntityLabel}`),
    dialogEditTitle: t("dialog_edit_title", `Edit ${strEntityLabel}`),
    dialogViewTitle: t("dialog_view_title", `View ${strEntityLabel}`),
    emptyMessage: t("empty_message", `No ${strEntityLabelPlural.toLowerCase()} found.`),
    exportFileName: t("export_file_name", "ess-declaration-categories.csv"),
    exportTitle: stripMasterTitle(t("export_title", strEntityLabelPlural)),
    fieldCategoryName: t("field_category_name", "Description"),
    fieldSection: t("field_section", "Section"),
    fieldDeclarationKind: t("field_declaration_kind", "Category"),
    fieldApplicableRegime: t("field_applicable_regime", "Applicable Regime"),
    fieldIsActive: t("field_is_active", "Status"),
    fieldMaxLimitAmount: t("field_max_limit_amount", "Max Limit"),
    fieldMaxLimitAppliedAt: t("field_max_limit_applied_at", "Maximum Limit Applied At"),
    fieldProofRequired: t("field_proof_required", "Proof Required"),
    loadingRecords: t("loading_records", "Loading ESS declaration categories..."),
    pageTitle: stripMasterTitle(t("page_title", strEntityLabelPlural)),
    requestFailed: t("request_failed", "Unable to complete the request."),
    saveSuccess: t("save_success", "ESS declaration category saved successfully."),
    activateSuccess: t("activate_success", "ESS declaration category activated successfully."),
    searchNamePlaceholder: t("search_name_placeholder", "Search by description"),
    searchSectionPlaceholder: t("search_section_placeholder", "Search by section"),
    searchDeclarationKindPlaceholder: t("search_declaration_kind_placeholder", "Category"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    tableActions: t("table_actions", "Actions"),
    tableDescription: t("table_description", "Description"),
    tableSection: t("table_section", "Section"),
    tableCategory: t("table_category", "Category"),
    tableApplicableRegime: t("table_applicable_regime", "Applicable Regime"),
    tableLinkedSalaryComponent: t("table_linked_salary_component", "Linked Salary Component"),
    tableMaxLimitAmount: t("table_max_limit_amount", "Max Limit"),
    tableMaxLimitAppliedAt: t("table_max_limit_applied_at", "Maximum Limit Applied At"),
    tableProofRequired: t("table_proof_required", "Proof Required"),
    tableStatus: t("table_status", "Status"),
    updateSuccess: t("update_success", "ESS declaration category updated successfully."),
    validationSectionDuplicate: t("validation_section_duplicate", "Section already exists."),
    validationSectionRequired: t("validation_section_required", "Section is required."),
    validationDeclarationKindRequired: t("validation_declaration_kind_required", "Declaration kind is required."),
    validationApplicableRegimeRequired: t("validation_applicable_regime_required", "Applicable regime is required."),
    validationMaxLimitAmount: t("validation_max_limit_amount", "Max limit amount must be a valid amount greater than zero."),
    validationMaxLimitRequired: t("validation_max_limit_required", "Max limit amount is required."),
    validationNameDuplicate: t("validation_name_duplicate", "Description already exists."),
    validationNameMin: t("validation_name_min", "Description must be at least 3 characters long."),
    validationNameRequired: t("validation_name_required", "Description is required."),
  };
  const dicMaxLimitAppliedAtLabels: Record<MaxLimitAppliedAt, string> = {
    ENTRY_LEVEL: t("option_entry_level", "Entry Level"),
    APPROVAL_LEVEL: t("option_approval_level", "Approval Level"),
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
      const objResult = await masterApiService.getEssDeclarationCategories();
      const lstRawRecords = resolveCategoryRows(objResult.Data as unknown);
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
      setStrLoadDiagnostics(`Loaded ${lstMappedRecords.length} row(s) from ess-declaration-categories.`);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicLabels.requestFailed, "error");
      setLstCategories([]);
      setLstSelectedIds([]);
      setStrLoadDiagnostics(`Load failed: ${objError instanceof Error ? objError.message : "unknown error"}`);
    } finally {
      setBlnLoading(false);
    }
  }

  async function loadDeclarationKindTypeOptions() {
    setBlnDeclarationKindTypeLoading(true);
    setStrDeclarationKindTypeError("");
    try {
      const objResult = await masterApiService.getDeclarationKindTypes();
      setLstDeclarationKindTypes(objResult.Data);
    } catch (objError) {
      setLstDeclarationKindTypes([]);
      setStrDeclarationKindTypeError(objError instanceof Error ? objError.message : "Unable to load declaration kind options.");
    } finally {
      setBlnDeclarationKindTypeLoading(false);
    }
  }

  async function ensureDeclarationKindTypeOptions() {
    if (blnDeclarationKindTypeLoading || lstDeclarationKindTypes.length > 0) {
      return;
    }
    await loadDeclarationKindTypeOptions();
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
    ensureDeclarationKindTypeOptions().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (!blnDialogOpen || strMode === "view") {
      return;
    }
    ensureDeclarationKindTypeOptions().catch(() => undefined);
  }, [blnDialogOpen, strMode]);

  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnCanChangeStatus = blnCanEdit;
  const blnReadOnly = isReadOnly();

  const dicDeclarationKindNameByCode = useMemo(
    () => Object.fromEntries(lstDeclarationKindTypes.map((dicKind) => [dicKind.strKindCode, dicKind.strKindName])),
    [lstDeclarationKindTypes],
  );

  const lstFilteredCategories = useMemo(
    () =>
      lstCategories.filter((dicCategory) => {
        const blnNameMatch = !dicSearchApplied.name || dicCategory.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
        const blnSectionMatch = !dicSearchApplied.section || dicCategory.section.toLowerCase().includes(dicSearchApplied.section.toLowerCase());
        const blnDeclarationKindMatch = dicSearchApplied.declarationKind === "All" || dicCategory.declarationKind === dicSearchApplied.declarationKind;
        const blnStatusMatch = dicSearchApplied.status === "All" || dicCategory.status === dicSearchApplied.status;
        return blnNameMatch && blnSectionMatch && blnDeclarationKindMatch && blnStatusMatch;
      }),
    [dicSearchApplied, lstCategories],
  );

  const blnAllFilteredSelected = lstFilteredCategories.length > 0 && lstFilteredCategories.every((dicCategory) => lstSelectedIds.includes(dicCategory.id));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstSelectedIds.some((strID) => lstFilteredCategories.some((dicCategory) => dicCategory.id === strID));

  const lstTableRows = useMemo(
    () => lstFilteredCategories.map((dicCategory) => {
      const blnSelected = lstSelectedIds.includes(dicCategory.id);
      return {
        id: dicCategory.id,
        select: (
          <Checkbox
            checked={blnSelected}
            onChange={() => toggleSelection(dicCategory.id)}
            inputProps={{ "data-testid": "ess-declaration-category.list.row.select.checkbox", "data-row-key": dicCategory.id } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        action: (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <CommonRowActions
              testIdPrefix="ess-declaration-category.list.row"
              rowKey={dicCategory.id}
              blnCanView={blnCanView}
              blnCanEdit={blnCanEdit}
              onView={() => openDialog("view", dicCategory)}
              onEdit={() => openDialog("edit", dicCategory)}
            />
            {blnCanEdit ? (
              <Tooltip title={dicCategory.section ? "Manage investment options" : "No matching IT Declaration section - investment options aren't shown to employees for this component"}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!dicCategory.section}
                    onClick={() => setObjInvestmentOptionsTarget({ code: dicCategory.section, name: dicCategory.name })}
                  >
                    <ListAltRoundedIcon fontSize="small" sx={{ color: dicCategory.section ? "var(--app-primary-color)" : "#cbd5e1" }} />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Box>
        ),
        name: dicCategory.name,
        section: dicCategory.section || "-",
        declarationKind: dicDeclarationKindNameByCode[dicCategory.declarationKind] || dicCategory.declarationKind,
        applicableRegime: formatApplicableRegime(dicCategory.applicableRegime),
        linkedSalaryComponentName: dicCategory.linkedSalaryComponentName || "-",
        maxLimitAmount: formatAmount(dicCategory.maxLimitAmount),
        maxLimitAppliedAt: formatMaxLimitAppliedAt(dicCategory.maxLimitAppliedAt, dicMaxLimitAppliedAtLabels),
        proofRequired: dicCategory.proofRequired ? dicCommonLabels.yes : dicCommonLabels.no,
        status: (
          <span className={`${styles.statusPill} ${dicCategory.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
            {dicCategory.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
          </span>
        ),
        blnSelected
      };
    }),
    [blnCanEdit, blnCanView, dicCommonLabels.no, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, dicCommonLabels.yes, dicDeclarationKindNameByCode, dicMaxLimitAppliedAtLabels, lstFilteredCategories, lstSelectedIds]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            checked={blnAllFilteredSelected}
            indeterminate={blnSomeFilteredSelected}
            onChange={toggleSelectAll}
            inputProps={{ "data-testid": "ess-declaration-category.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56
      },
      { field: "action", headerName: dicLabels.tableActions, sortable: false, filterable: false, exportable: false, width: 90 },
      { field: "section", headerName: dicLabels.tableSection, width: 95 },
      { field: "name", headerName: dicLabels.tableDescription, width: 190, blnWrapText: true },
      { field: "declarationKind", headerName: dicLabels.tableCategory, width: 110 },
      { field: "applicableRegime", headerName: dicLabels.tableApplicableRegime, width: 130 },
      { field: "maxLimitAmount", headerName: dicLabels.tableMaxLimitAmount, align: "right", width: 100 },
      { field: "proofRequired", headerName: dicLabels.tableProofRequired, width: 85 },
      { field: "status", headerName: dicLabels.tableStatus, sortable: false, filterable: false, width: 95 }
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels, lstTableRows]
  );

  function openDialog(strNextMode: CategoryMode, dicCategory?: EssDeclarationCategoryRecord) {
    setStrMode(strNextMode);
    setStrEditingId(dicCategory?.id ?? "");
    setDicErrors({});
    setDicForm(dicCategory ? {
      name: dicCategory.name,
      description: dicCategory.description,
      section: dicCategory.section,
      declarationKind: dicCategory.declarationKind,
      applicableRegime: dicCategory.applicableRegime,
      linkedSalaryComponentId: dicCategory.linkedSalaryComponentId ?? "",
      maxLimitAmount: dicCategory.maxLimitAmount == null ? "" : String(dicCategory.maxLimitAmount),
      maxLimitAppliedAt: dicCategory.maxLimitAppliedAt,
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
    const strSection = dicForm.section.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strDeclarationKind = dicForm.declarationKind.trim();

    if (!strSection) {
      dicNextErrors.section = dicLabels.validationSectionRequired;
    }

    if (!strName) {
      dicNextErrors.name = dicLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicLabels.validationNameMin;
    }

    if (!strDeclarationKind) {
      dicNextErrors.declarationKind = dicLabels.validationDeclarationKindRequired;
    }
    if (!dicForm.applicableRegime) {
      dicNextErrors.applicableRegime = dicLabels.validationApplicableRegimeRequired;
    }

    if (!dicForm.maxLimitAmount.trim()) {
      dicNextErrors.maxLimitAmount = dicLabels.validationMaxLimitRequired;
    } else {
      const numValue = Number(dicForm.maxLimitAmount);
      if (!Number.isFinite(numValue) || numValue <= 0) {
        dicNextErrors.maxLimitAmount = dicLabels.validationMaxLimitAmount;
      }
    }

    if (lstCategories.some((dicCategory) => dicCategory.section.toUpperCase() === strSection && dicCategory.id !== strEditingId)) {
      dicNextErrors.section = dicLabels.validationSectionDuplicate;
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
      name: dicForm.name.trim(),
      description: dicForm.description.trim(),
      declarationKind: dicForm.declarationKind.trim(),
      section: dicForm.section.trim().toUpperCase(),
      applicableRegime: dicForm.applicableRegime,
      linkedSalaryComponentId: dicForm.linkedSalaryComponentId === "" ? null : Number(dicForm.linkedSalaryComponentId),
      linkedSalaryComponentName: "",
      maxLimitAmount: dicForm.maxLimitAmount.trim() ? Number(dicForm.maxLimitAmount) : null,
      maxLimitAppliedAt: dicForm.maxLimitAppliedAt,
      proofRequired: dicForm.proofRequired,
      status: dicForm.status,
    };

    const objBody = {
      strCategoryName: dicLocalRecord.name,
      strCategoryDescription: dicForm.description.trim() || null,
      strSectionCode: dicLocalRecord.section,
      strDeclarationKind: dicLocalRecord.declarationKind,
      strApplicableRegime: dicLocalRecord.applicableRegime,
      intLinkedSalaryComponentID: dicLocalRecord.linkedSalaryComponentId,
      decMaxLimitAmount: dicLocalRecord.maxLimitAmount,
      strMaxLimitAppliedAt: dicLocalRecord.maxLimitAppliedAt,
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
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strID) => !lstFilteredCategories.some((dicCategory) => dicCategory.id === strID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFilteredCategories.map((dicCategory) => dicCategory.id)])]);
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
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.45fr) minmax(280px, 0.9fr)" }, gap: 1.5, alignItems: "start" }}>
        <Stack spacing={1.5}>
          {renderDialogSection(
            t("section_core_details", "Core Details"),
            t("section_core_details_help", "Define the primary declaration identity used across payroll and IT declaration."),
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
              <TextField
                label={dicLabels.fieldSection}
                required
                value={dicForm.section}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, section: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, section: objEvent.target.value.toUpperCase() }));
                }}
                error={Boolean(dicErrors.section)}
                helperText={dicErrors.section || t("field_section_help", "e.g. 80D. Shown as-is on the IT Declaration screen and Investment Options. Cannot be changed after saving.")}
                fullWidth
                disabled={blnDialogReadOnly || strMode === "edit"}
                size="small"
              />
              <TextField
                label={dicLabels.fieldCategoryName}
                required
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
                select
                label={dicLabels.fieldDeclarationKind}
                required
                value={dicForm.declarationKind}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, declarationKind: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, declarationKind: objEvent.target.value }));
                }}
                error={Boolean(dicErrors.declarationKind)}
                helperText={dicErrors.declarationKind || strDeclarationKindTypeError}
                fullWidth
                disabled={blnDialogReadOnly || blnDeclarationKindTypeLoading}
                size="small"
              >
                {lstDeclarationKindTypes.map((dicOption) => (
                  <MenuItem key={dicOption.strKindCode} value={dicOption.strKindCode}>
                    {dicOption.strKindName}
                  </MenuItem>
                ))}
                {dicForm.declarationKind && !lstDeclarationKindTypes.some((dicOption) => dicOption.strKindCode === dicForm.declarationKind) ? (
                  <MenuItem value={dicForm.declarationKind}>{dicForm.declarationKind}</MenuItem>
                ) : null}
              </TextField>
              <FormControl
                required
                error={Boolean(dicErrors.applicableRegime)}
                sx={{
                  gridColumn: { xs: "1 / -1", md: "1 / -1" },
                  px: 1,
                  py: 0.7,
                  borderRadius: "8px",
                  border: `1px solid ${dicErrors.applicableRegime ? "#d32f2f" : "rgba(203,213,225,0.9)"}`,
                  background: "#fff",
                }}
              >
                <FormLabel sx={{ color: "#0f172a !important", fontSize: "0.84rem", fontWeight: 700, mb: 0.4 }}>
                  {dicLabels.fieldApplicableRegime}
                </FormLabel>
                <RadioGroup
                  row
                  value={dicForm.applicableRegime}
                  onChange={(objEvent) => {
                    setDicErrors((dicPrevious) => ({ ...dicPrevious, applicableRegime: undefined }));
                    setDicForm((dicPrevious) => ({ ...dicPrevious, applicableRegime: normalizeApplicableRegime(objEvent.target.value) }));
                  }}
                >
                  {lstApplicableRegimeOptions.map((dicOption) => (
                    <FormControlLabel
                      key={dicOption.strValue}
                      value={dicOption.strValue}
                      control={<Radio size="small" disabled={blnDialogReadOnly} />}
                      label={dicOption.strLabel}
                      disabled={blnDialogReadOnly}
                    />
                  ))}
                </RadioGroup>
                <FormHelperText sx={{ color: dicErrors.applicableRegime ? "#d32f2f" : "#64748b", fontSize: "0.72rem", lineHeight: 1.25, mx: 0 }}>
                  {dicErrors.applicableRegime || t("applicable_regime_help", "Choose which tax regime this declaration component belongs to.")}
                </FormHelperText>
              </FormControl>
            </Box>,
          )}

          {renderDialogSection(
            t("section_limit_policy", "Limit Policy"),
            t("section_limit_policy_help", "Set the mandatory declaration cap and choose where the cap is validated."),
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
              <TextField
                label={dicLabels.fieldMaxLimitAmount}
                required
                value={dicForm.maxLimitAmount}
                onChange={(objEvent) => {
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, maxLimitAmount: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, maxLimitAmount: objEvent.target.value }));
                }}
                error={Boolean(dicErrors.maxLimitAmount)}
                helperText={dicErrors.maxLimitAmount || t("max_limit_amount_help", "Enter the maximum claimable amount for this declaration component.")}
                fullWidth
                disabled={blnDialogReadOnly}
                size="small"
                type="number"
                inputProps={{ min: 0.01, step: "0.01" }}
              />
              <TextField
                select
                label={dicLabels.fieldMaxLimitAppliedAt}
                required
                value={dicForm.maxLimitAppliedAt}
                onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, maxLimitAppliedAt: normalizeMaxLimitAppliedAt(objEvent.target.value) }))}
                fullWidth
                disabled={blnDialogReadOnly}
                size="small"
                helperText={t("max_limit_applied_at_help", "Entry Level validates during employee declaration; Approval Level validates during review.")}
              >
                {lstMaxLimitAppliedAtOptions.map((dicOption) => <MenuItem key={dicOption.strValue} value={dicOption.strValue}>{dicMaxLimitAppliedAtLabels[dicOption.strValue]}</MenuItem>)}
              </TextField>
              <Box
                className={styles.switchRow}
                sx={{
                  px: 1,
                  py: 0.35,
                  minHeight: 44,
                  borderRadius: "8px",
                  border: "1px solid rgba(203,213,225,0.9)",
                  background: "#fff",
                  gap: 0.75,
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography sx={{ color: "#0f172a", fontSize: "0.84rem", fontWeight: 700 }}>{dicLabels.fieldProofRequired}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1.2 }}>{t("proof_required_help", "Turn on only when document evidence is mandatory.")}</Typography>
                </Box>
                <Switch
                  size="small"
                  checked={dicForm.proofRequired}
                  disabled={blnDialogReadOnly}
                  onChange={(_, blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, proofRequired: blnChecked }))}
                />
              </Box>
              <Box
                className={styles.switchRow}
                sx={{
                  px: 1,
                  py: 0.35,
                  minHeight: 44,
                  borderRadius: "8px",
                  border: "1px solid rgba(203,213,225,0.9)",
                  background: "#fff",
                  gap: 0.75,
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ color: "#0f172a", fontSize: "0.84rem", fontWeight: 700 }}>{dicLabels.fieldIsActive}</Typography>
                <ActiveStatusSwitch
                  size="small"
                  blnIsActive={dicForm.status === "Active"}
                  disabled={blnDialogReadOnly}
                  onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: blnChecked ? "Active" : "Inactive" }))}
                />
              </Box>
            </Box>,
          )}
        </Stack>

        <Stack spacing={1.5}>
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
              {renderInfoRow(t("summary_section", "Section"), dicForm.section.trim() || t("summary_auto_matched", "Auto-matched on save"))}
              {renderInfoRow(t("summary_kind", "Category"), dicDeclarationKindNameByCode[dicForm.declarationKind.trim()] || dicForm.declarationKind.trim() || t("summary_empty", "Not set"))}
              {renderInfoRow(t("summary_applicable_regime", "Applicable Regime"), formatApplicableRegime(dicForm.applicableRegime))}
              {renderInfoRow(t("summary_limit", "Max Limit"), dicForm.maxLimitAmount.trim() || t("summary_unlimited", "Not specified"))}
              {renderInfoRow(t("summary_limit_applied_at", "Maximum Limit Applied At"), formatMaxLimitAppliedAt(dicForm.maxLimitAppliedAt, dicMaxLimitAppliedAtLabels))}
              {renderInfoRow(t("summary_proof", "Proof"), dicForm.proofRequired ? t("summary_required", "Required") : t("summary_optional", "Optional"))}
            </Box>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button data-testid="ess-declaration-category.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicLabels.backButton}</Button>
      </Box>
      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", `You have view-only access for ${strEntityLabel}.`)}</Typography> : null}
        <Typography sx={{ display: "none" }}>{strLoadDiagnostics}</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(4, minmax(120px, 1fr)) auto auto" },
            gap: 1,
            mt: 1,
            alignItems: "stretch",
          }}
        >
          <TextField size="small" inputProps={{ "data-testid": "ess-declaration-category.list.search-name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicLabels.searchNamePlaceholder} fullWidth />
          <TextField size="small" inputProps={{ "data-testid": "ess-declaration-category.list.search-section.input" }} value={dicSearchDraft.section} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, section: objEvent.target.value }))} placeholder={dicLabels.searchSectionPlaceholder} fullWidth />
          <TextField size="small" inputProps={{ "data-testid": "ess-declaration-category.list.search-kind.select" }} select label={dicLabels.searchDeclarationKindPlaceholder} value={dicSearchDraft.declarationKind} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, declarationKind: objEvent.target.value }))} fullWidth>
            <MenuItem value="All">{dicCommonLabels.all}</MenuItem>
            {lstDeclarationKindTypes.map((dicKind) => <MenuItem key={dicKind.strKindCode} value={dicKind.strKindCode}>{dicKind.strKindName}</MenuItem>)}
          </TextField>
          <TextField size="small" inputProps={{ "data-testid": "ess-declaration-category.list.search-status.select" }} select label={dicLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem data-testid="ess-declaration-category.list.search-status.all.option" value="All">{dicCommonLabels.all}</MenuItem>
            <MenuItem data-testid="ess-declaration-category.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem data-testid="ess-declaration-category.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button data-testid="ess-declaration-category.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button data-testid="ess-declaration-category.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{dicLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && blnCanChangeStatus ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicLabels.bulkRowsSelected}</Typography>
            {blnCanChangeStatus ? <Button data-testid="ess-declaration-category.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicLabels.bulkActivate}</Button> : null}
            {blnCanChangeStatus ? <Button data-testid="ess-declaration-category.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicLabels.bulkDeactivate}</Button> : null}
          </Box>
        ) : null}
      </Box>
      <Box className={styles.tableCard}>
        {!blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", `${strEntityLabel} access is not available for your user group.`)}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need this master visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="ess-declaration-categories"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={dicLabels.emptyMessage}
            testIdPrefix="ess-declaration-category.list"
            hideToolbar={!blnCanAdd && !blnCanExport}
            toolbarLeft={blnCanAdd ? (
              <Button
                data-testid="ess-declaration-category.list.add.button"
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => openDialog("add")}
                disabled={blnLoading || blnSubmitting || blnRightsLoading}
              >
                {dicLabels.addButton}
              </Button>
            ) : null}
            withPaper={false}
            getRowSx={(objRow) => objRow.blnSelected ? { backgroundColor: "rgba(219, 234, 254, 0.45)" } : {}}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
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
      <InvestmentOptionsManagerDialog
        blnOpen={Boolean(objInvestmentOptionsTarget)}
        strSectionCode={objInvestmentOptionsTarget?.code ?? ""}
        strSectionName={objInvestmentOptionsTarget?.name ?? ""}
        onClose={() => setObjInvestmentOptionsTarget(null)}
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
