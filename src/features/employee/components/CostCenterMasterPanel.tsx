"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import MasterBreadcrumbs from "@/components/master/MasterBreadcrumbs";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader, { DottedLoader } from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { CostCenterApiRecord, masterApiService, type SimpleMasterFormOptionsApiRecord } from "@/services/master/MasterApiService";
import {
  costCenterService,
  createEmptyCostCenterTextRow,
  createInitialCostCenterForm,
  toCostCenterFormValues,
  type CostCenterFormValues,
  type CostCenterTextFormValue,
} from "@/features/employee/services/costCenterService";

type CostCenterStatus = "Active" | "Inactive";
type CostCenterMode = "add" | "edit" | "view";

type CostCenterRecord = {
  id: string;
  code: string;
  name: string;
  status: CostCenterStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | CostCenterStatus;
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

const dicEmptyForm = createInitialCostCenterForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultCostCenters: CostCenterRecord[] = [];
const lstCostCenterModuleCodes = ["COST_CENTER", "COSTCENTER", "COST_CENTRE"];
const intCostCenterSkeletonRows = 8;

function CostCenterGridSkeleton() {
  return (
    <Box
      data-control-id="cost-center-master.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={142} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 760 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.55fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 2 ? 76 : 118} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intCostCenterSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 0.7fr 0.55fr",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${62 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${36 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapCostCenterRecord(dicRecord: CostCenterApiRecord): CostCenterRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strCostCenterCode,
    name: dicRecord.strCostCenterName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

// Cost Center master screen: handles backend-backed CRUD, search, bulk actions, export, and view/edit dialogs.
export default function CostCenterMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("cost_center");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstCostCenterModuleCodes);
  const [lstCostCenters, setLstCostCenters] = useState<CostCenterRecord[]>(lstDefaultCostCenters);
  const [objFormOptions, setObjFormOptions] = useState<SimpleMasterFormOptionsApiRecord>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<CostCenterMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingCostCenterId, setStrEditingCostCenterId] = useState("");
  const [dicForm, setDicForm] = useState<CostCenterFormValues>(dicEmptyForm);
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
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
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
    tableName: "Cost Center Name",
    tableCode: "Cost Center Code",
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
    fieldName: "Cost Center Name",
    fieldCode: "Cost Center Code",
    fieldStatus: t("field_status"),
    fieldIsActive: t("field_is_active", "Is Active"),
    saving: t("saving", "Saving..."),
    validationNameRequired: t("validation_name_required", dicConstant.costCenters.validation.nameRequired),
    validationNameMin: t("validation_name_min", dicConstant.costCenters.validation.nameMin),
    validationCodeRequired: t("validation_code_required", dicConstant.costCenters.validation.codeRequired),
    validationCodeFormat: t("validation_code_format", dicConstant.costCenters.validation.codeFormat),
    validationCodeDuplicate: t("validation_code_duplicate", dicConstant.costCenters.validation.codeDuplicate),
    validationNameDuplicate: t("validation_name_duplicate", dicConstant.costCenters.validation.nameDuplicate),
  };

  async function loadCostCenters() {
    // Reload from the backend after every mutation so pagination, selection, and DB state stay in sync.
    if (!canViewAny()) {
      setLstCostCenters([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getCostCenters();
      setLstCostCenters(objResult.Data.map(mapCostCenterRecord));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!canViewAny()) {
      setLstCostCenters([]);
      setBlnLoading(false);
      return;
    }
    loadCostCenters().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnSearchPanelFrozen = blnLoading || blnSubmitting || blnRightsLoading;
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function buildFixedLanguageRow(
    intLanguageID: number,
    strCostCenterName: string,
    strCostCenterCode: string,
    lstExistingTexts: CostCenterTextFormValue[],
  ): CostCenterTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyCostCenterTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strCostCenterName,
      strCostCenterCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: CostCenterFormValues) {
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
      dicSecondaryExistingText?.strCostCenterName ?? "",
      dicValues.code,
      dicValues.lstTexts,
    );
    return {
      ...dicValues,
      lstTexts: [dicDefaultRow, dicSecondaryRow],
    };
  }

  function syncEnglishCostCenterName(strCostCenterName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? { ...dicText, strCostCenterName }
          : dicText),
      };
    });
  }

  function syncCostCenterCode(strCostCenterCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({
        ...dicText,
        strCostCenterCode,
      })),
    }));
  }

  function updateTextRow(
    strRowID: string,
    strField: keyof CostCenterTextFormValue,
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

  const lstVisibleTranslationRows = dicForm.lstTexts.filter((dicText) => {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === Number(dicText.intLanguageID));
    const strCode = dicLanguage?.strCode?.trim().toLowerCase() ?? "";
    const strName = (dicLanguage?.strLabel ?? dicText.strLanguageName).trim().toLowerCase();
    return Number(dicText.intLanguageID) !== intDefaultLanguageID &&
      !/^es(?:[-_]|$)/.test(strCode) && !["spa", "spanish", "espa?ol", "espanol"].includes(strCode) &&
      !/spanish|espa?ol|espanol/.test(strName);
  });

  async function translateTextRow(strRowID: string, intLanguageID: number) {
    const dicSelectedLanguage = objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intLanguageID);
    const strSourceCostCenterName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceCostCenterName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strCostCenterName.trim() || strLastTranslatedSource !== strSourceCostCenterName;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await costCenterService.translateCostCenterText(
        strSourceCostCenterName,
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
              strCostCenterName: strTranslatedName,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceCostCenterName,
      }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error");
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  async function handleTranslateClick() {
    const dicSecondaryRow = lstVisibleTranslationRows[0];
    if (!dicSecondaryRow) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID));
  }

  // Filter draft values are only committed on Search/Clear to keep the grid interactions predictable.
  const lstFilteredCostCenters = useMemo(() => lstCostCenters.filter((dicCostCenter) => {
    const blnCodeMatch = !dicSearchApplied.code || dicCostCenter.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicCostCenter.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicCostCenter.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstCostCenters]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredCostCenters.map((dicCostCenter) => ({
        id: dicCostCenter.id,
        nameText: dicCostCenter.name,
        name: (
          <Link
            component="button"
            underline="none"
            sx={{ color: "#0f172a", fontWeight: 500, textAlign: "left" }}
            onClick={(objEvent) => {
              objEvent.stopPropagation();
              if (blnCanEdit || blnCanView) {
                openDialog(blnCanEdit ? "edit" : "view", dicCostCenter);
              }
            }}
          >
            {dicCostCenter.name}
          </Link>
        ),
        code: dicCostCenter.code,
        statusText: dicCostCenter.status,
        status: (
          <span className={`${styles.statusPill} ${dicCostCenter.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
            {dicCostCenter.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFilteredCostCenters]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "name", headerName: dicModuleLabels.tableName },
      { field: "code", headerName: dicModuleLabels.tableCode },
      { field: "status", headerName: dicModuleLabels.tableStatus, sortable: false, filterable: false },
    ],
    [dicModuleLabels.tableCode, dicModuleLabels.tableName, dicModuleLabels.tableStatus]
  );

  useEffect(() => {
    costCenterService.getCostCenterFormOptions()
      .then((dicOptions) => setObjFormOptions(dicOptions))
      .catch(() => undefined);
  }, []);

  async function ensureCostCenterFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await costCenterService.getCostCenterFormOptions();
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
    if (!blnDialogOpen || strMode === "view") return;
    const strField = strPendingErrorFocusRef.current;
    strPendingErrorFocusRef.current = null;
    if (strField === "name") {
      objNameInputRef.current?.focus();
    } else if (strField === "code") {
      objCodeInputRef.current?.focus();
    }
  }, [blnDialogOpen, dicErrors, strMode]);

  function openDialog(strNextMode: CostCenterMode, dicCostCenter?: CostCenterRecord) {
    setStrMode(strNextMode);
    setStrEditingCostCenterId(dicCostCenter?.id ?? "");
    strPendingErrorFocusRef.current = null;
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    setBlnSubmitting(true);
    ensureCostCenterFormOptionsLoaded()
      .then((dicOptions) => {
        if (!dicCostCenter || strNextMode === "add") {
          setDicForm(ensureTenantLanguageRows(createInitialCostCenterForm()));
          setBlnDialogOpen(true);
          return;
        }
        return costCenterService.getCostCenter(Number(dicCostCenter.id), intDefaultLanguageID).then((dicRecord) => {
          setDicForm(
            ensureTenantLanguageRows(
              toCostCenterFormValues(dicRecord, dicOptions),
            ),
          );
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function closeDialog() {
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
      showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error");
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
      dicNextErrors.name = dicModuleLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicModuleLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicModuleLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicModuleLabels.validationCodeFormat;
    }

    if (lstCostCenters.some((dicCostCenter) => dicCostCenter.code.toUpperCase() === strCode && dicCostCenter.id !== strEditingCostCenterId)) {
      dicNextErrors.code = dicModuleLabels.validationCodeDuplicate;
    }

    if (lstCostCenters.some((dicCostCenter) => dicCostCenter.name.trim().toLowerCase() === strName.toLowerCase() && dicCostCenter.id !== strEditingCostCenterId)) {
      dicNextErrors.name = dicModuleLabels.validationNameDuplicate;
    }

    strPendingErrorFocusRef.current = dicNextErrors.name ? "name" : dicNextErrors.code ? "code" : null;
    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCostCenter() {
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
      ? costCenterService.createCostCenter(dicPayload)
      : costCenterService.updateCostCenter(Number(strEditingCostCenterId), dicPayload);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadCostCenters())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      })
      .catch((objError) => {
        const strMessage = objError instanceof Error ? objError.message : dicModuleLabels.requestFailed;
        const blnCodeError = /cost cent(?:er|re) code/i.test(strMessage) && !/cost cent(?:er|re) name/i.test(strMessage);
        const blnNameError = /cost cent(?:er|re) name/i.test(strMessage) && !/cost cent(?:er|re) code/i.test(strMessage);
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
    <Box className={styles.page} sx={{ position: "relative" }}>
      <MasterBreadcrumbs strCurrent={dicModuleLabels.pageTitle} />
      <Box className={styles.topBar}>
        <Button controlId="cost-center-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Cost Center.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow} aria-busy={blnSearchPanelFrozen} sx={{ alignItems: "center", "& .MuiButton-root": { alignSelf: "center" } }}>
          <TextField className="app-mui-text-field" id="cost-center-master-search-name" controlId="cost-center-master.list.search-name.input" inputProps={{ "controlId": "cost-center-master.list.search-name.input" }} label={dicModuleLabels.tableName} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="cost-center-master-search-code" controlId="cost-center-master.list.search-code.input" inputProps={{ "controlId": "cost-center-master.list.search-code.input" }} label={dicModuleLabels.tableCode} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="cost-center-master-search-status" controlId="cost-center-master.list.search-status.select" inputProps={{ "controlId": "cost-center-master.list.search-status.select" }} select label={dicModuleLabels.tableStatus} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" disabled={blnSearchPanelFrozen} fullWidth>
            <MenuItem controlId="cost-center-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="cost-center-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="cost-center-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button controlId="cost-center-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnSearchPanelFrozen}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="cost-center-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnSearchPanelFrozen}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {(blnLoading || blnRightsLoading) && !blnDialogOpen ? (
          <CostCenterGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Cost Center access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need cost center visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={dicModuleLabels.exportFileName}
            showExportOptions={blnCanExport}
            testIdPrefix="cost-center-master.list"
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              const dicCostCenter = lstCostCenters.find((dicItem) => dicItem.id === dicRow.id);
              if (dicCostCenter) openDialog(blnCanEdit ? "edit" : "view", dicCostCenter);
            }}
            minTableWidth={800}
            emptyMessage={dicModuleLabels.emptyMessage}
            toolbarLeft={blnCanAdd ? (
              <Button controlId="cost-center-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {dicModuleLabels.addButton}
              </Button>
            ) : null}
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
        <BlockingLoader blnOpen={blnSubmitting} strLabel={dicCommonLabels.processing} intZIndex={1400} blnLocal />
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") {
            closeDialog();
          }
        }}
        rootTestId="cost-center-master.dialog"
        cancelButtonTestId="cost-center-master.dialog.cancel.button"
        primaryButtonTestId="cost-center-master.dialog.save.button"
        strTitle={strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicModuleLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveCostCenter}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        paperClassName={styles.departmentDialogPaper}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        maxWidth={false}
        fullWidth={false}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
              <ActiveStatusSwitch
                testId="cost-center-master.dialog.active.switch"
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
              <Typography className={styles.switchLabel} sx={{ fontSize: "12px !important", fontWeight: "600 !important", whiteSpace: "nowrap" }}>{dicCommonLabels.statusActive}</Typography>
              <IconButton aria-label={dicCommonLabels.close} onClick={closeDialog} size="small" sx={{ ml: 1, color: "#94a3b8" }}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
          </Box>
        }
        nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>{t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
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
              <TextField
                className="app-mui-text-field"
                required
                controlId="cost-center-master.dialog.name.input"
                inputRef={objNameInputRef}
                autoFocus={strMode !== "view"}
                label={`${dicModuleLabels.fieldName}`}
                placeholder={t("dialog_name_placeholder", "Enter cost center name")}
                size="small"
                value={dicForm.name}
                inputProps={{ "controlId": "cost-center-master.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishCostCenterName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                fullWidth
              />
              <TextField
                className="app-mui-text-field"
                required
                controlId="cost-center-master.dialog.code.input"
                inputRef={objCodeInputRef}
                label={`${dicModuleLabels.fieldCode}`}
                placeholder={t("dialog_code_placeholder", "Enter cost center code")}
                size="small"
                value={dicForm.code}
                inputProps={{ "controlId": "cost-center-master.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncCostCenterCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                helperText={dicErrors.code}
                fullWidth
              />
            </Box>

            {lstVisibleTranslationRows.length > 0 ? (
              <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                  <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("language_translations", "Language Translations")}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>
                      {t("language_translations_help", "Provide translated cost center names for the application languages you want to support.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button
                        controlId="cost-center-master.dialog.translate.button"
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
                <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
                  {lstVisibleTranslationRows.map((dicText) => (
                    <Box key={dicText.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                      <Typography component="label" htmlFor={`cost-center-translation-${dicText.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        className="app-mui-text-field"
                        id={`cost-center-translation-${dicText.strRowID}`}
                        controlId="cost-center-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter cost center name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strCostCenterName}
                        inputProps={{ "controlId": "cost-center-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strCostCenterName", objEvent.target.value)}
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

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicModuleLabels.confirmButton}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
