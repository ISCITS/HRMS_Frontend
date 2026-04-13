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
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { BankApiRecord, masterApiService, type SimpleMasterFormOptionsApiRecord } from "@/services/master/MasterApiService";
import {
  bankService,
  createEmptyBankTextRow,
  createInitialBankForm,
  toBankFormValues,
  type BankFormValues,
  type BankTextFormValue,
} from "@/features/employee/services/bankService";

type BankStatus = "Active" | "Inactive";
type BankMode = "add" | "edit" | "view";

type BankRecord = {
  id: string;
  code: string;
  name: string;
  status: BankStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | BankStatus;
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

const dicEmptyForm = createInitialBankForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultBanks: BankRecord[] = [];
const lstRowsPerPageOptions = [10, 20, 50];
const lstBankModuleCodes = ["BANK", "BANKS"];

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapBankRecord(dicRecord: BankApiRecord): BankRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strBankCode,
    name: dicRecord.strBankName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

// Exports the current filtered grid as an Excel-friendly CSV file.
function downloadCsv(strFileName: string, lstRows: BankRecord[]) {
  const lstHeaders = ["Bank Name", "Bank Code", "Status"];
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
function exportPdf(strTitle: string, lstRows: BankRecord[]) {
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
              <th>Bank Name</th>
              <th>Bank Code</th>
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

export default function BankMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("bank");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstBankModuleCodes);
  const [lstBanks, setLstBanks] = useState<BankRecord[]>(lstDefaultBanks);
  const [objFormOptions, setObjFormOptions] = useState<SimpleMasterFormOptionsApiRecord>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<BankMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingBankId, setStrEditingBankId] = useState("");
  const [dicForm, setDicForm] = useState<BankFormValues>(dicEmptyForm);
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
  const dicBankLabels = {
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
    loadingRecords: t("loading_records"),
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
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationCodeDuplicate: t("validation_code_duplicate"),
    validationNameDuplicate: t("validation_name_duplicate"),
  };

  async function loadBanks() {
    // Reload from the backend after every mutation so pagination, selection, and DB state stay in sync.
    if (!canViewAny()) {
      setLstBanks([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getBanks();
      setLstBanks(objResult.Data.map(mapBankRecord));
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
      setLstBanks([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    loadBanks().catch(() => undefined);
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
    strBankName: string,
    strBankCode: string,
    lstExistingTexts: BankTextFormValue[],
  ): BankTextFormValue {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === intLanguageID);
    const dicExistingText = lstExistingTexts.find((dicText) => Number(dicText.intLanguageID) === intLanguageID);
    return {
      ...createEmptyBankTextRow(),
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText?.strLanguageName ?? "",
      strBankName,
      strBankCode,
    };
  }

  function ensureTenantLanguageRows(dicValues: BankFormValues) {
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
      dicSecondaryExistingText?.strBankName ?? "",
      dicValues.code,
      dicValues.lstTexts,
    );
    return {
      ...dicValues,
      lstTexts: [dicDefaultRow, dicSecondaryRow],
    };
  }

  function syncEnglishBankName(strBankName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? { ...dicText, strBankName }
          : dicText),
      };
    });
  }

  function syncBankCode(strBankCode: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => ({
        ...dicText,
        strBankCode,
      })),
    }));
  }

  function updateTextRow(
    strRowID: string,
    strField: keyof BankTextFormValue,
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
    const strSourceBankName = dicForm.name.trim();

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceBankName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strBankName.trim() || strLastTranslatedSource !== strSourceBankName;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const strTranslatedName = await bankService.translateBankText(
        strSourceBankName,
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
              strBankName: strTranslatedName,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceBankName,
      }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : dicBankLabels.requestFailed, "error");
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
  const lstFilteredBanks = useMemo(() => lstBanks.filter((dicBank) => {
    const blnCodeMatch = !dicSearchApplied.code || dicBank.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicBank.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicBank.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstBanks]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredBanks.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleBanks = lstFilteredBanks.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleBanks.length > 0 && lstVisibleBanks.every((dicBank) => lstSelectedIds.includes(dicBank.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleBanks.some((dicBank) => dicBank.id === strId));

  useEffect(() => {
    bankService.getBankFormOptions()
      .then((dicOptions) => setObjFormOptions(dicOptions))
      .catch(() => undefined);
  }, []);

  async function ensureBankFormOptionsLoaded() {
    if (objFormOptions.lstLanguages.length > 0) {
      return objFormOptions;
    }
    const dicOptions = await bankService.getBankFormOptions();
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
          const objResponse = await labelService.getModuleLabels(intLanguageID, "bank");
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

  function openDialog(strNextMode: BankMode, dicBank?: BankRecord) {
    setStrMode(strNextMode);
    setStrEditingBankId(dicBank?.id ?? "");
    setDicErrors({});
    setDicTextTranslationLoading({});
    setDicLastTranslatedSourceByRow({});
    setBlnSubmitting(true);
    ensureBankFormOptionsLoaded()
      .then((dicOptions) => {
        if (!dicBank || strNextMode === "add") {
          setDicForm(ensureTenantLanguageRows(createInitialBankForm()));
          setBlnDialogOpen(true);
          return;
        }
        return bankService.getBank(Number(dicBank.id), intDefaultLanguageID).then((dicRecord) => {
          setDicForm(
            ensureTenantLanguageRows(
              toBankFormValues(dicRecord, dicOptions),
            ),
          );
          setBlnDialogOpen(true);
        });
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicBankLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
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
      showToast(objError instanceof Error ? objError.message : dicBankLabels.requestFailed, "error");
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
      dicNextErrors.name = dicBankLabels.validationNameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicBankLabels.validationNameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicBankLabels.validationCodeRequired;
    } else if (!/^[A-Z0-9/& _-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicBankLabels.validationCodeFormat;
    }

    if (lstBanks.some((dicBank) => dicBank.code.toUpperCase() === strCode && dicBank.id !== strEditingBankId)) {
      dicNextErrors.code = dicBankLabels.validationCodeDuplicate;
    }

    if (lstBanks.some((dicBank) => dicBank.name.trim().toLowerCase() === strName.toLowerCase() && dicBank.id !== strEditingBankId)) {
      dicNextErrors.name = dicBankLabels.validationNameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveBank() {
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
      ? bankService.createBank(dicPayload)
      : bankService.updateBank(Number(strEditingBankId), dicPayload);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadBanks())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicBankLabels.saveSuccess : dicBankLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicBankLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strBankId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strBankId)
      ? lstPrevious.filter((strId) => strId !== strBankId)
      : [...lstPrevious, strBankId]);
  }

  function toggleSelectAll() {
    // Selects only the visible page rows so bulk actions stay aligned with the current page.
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleBanks.some((dicBank) => dicBank.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleBanks.map((dicBank) => dicBank.id)])]);
  }

  function bulkUpdateStatus(strStatus: BankStatus) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicBankLabels.confirmBulkActivateTitle : dicBankLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicBankLabels.confirmBulkActivateMessage : dicBankLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicBankLabels.bulkActivate : dicBankLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadBanks();
        showToast(strStatus === "Active" ? dicBankLabels.bulkActivateSuccess : dicBankLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: dicBankLabels.confirmBulkDeleteTitle,
      strMessage: dicBankLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicBankLabels.bulkDelete,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankDelete(lstSelectedIds.map(Number));
        await loadBanks();
        showToast(dicBankLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteBank(strBankId: string) {
    openConfirmDialog({
      strTitle: dicBankLabels.confirmDeleteTitle,
      strMessage: dicBankLabels.confirmDeleteMessage,
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankDelete([Number(strBankId)]);
        await loadBanks();
        showToast(dicBankLabels.deleteSuccess);
      }
    });
  }

  function toggleBankStatus(strBankId: string) {
    const objBank = lstBanks.find((dicItem) => dicItem.id === strBankId);
    if (!objBank) {
      return;
    }
    const strNextStatus = objBank.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicBankLabels.confirmActivateTitle : dicBankLabels.confirmDeactivateTitle,
      strMessage: (strNextStatus === "Active" ? dicBankLabels.confirmActivateMessage : dicBankLabels.confirmDeactivateMessage)
        .replace("{status}", strNextStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strNextStatus === "Active" ? dicCommonLabels.activate : dicCommonLabels.deactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkBankStatus([Number(strBankId)], strNextStatus === "Active");
        await loadBanks();
        showToast(strNextStatus === "Active" ? dicBankLabels.activateSuccess : dicBankLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicBankLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Bank.")}
          </Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicBankLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicBankLabels.searchCodePlaceholder} fullWidth />
          <TextField select label={dicBankLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
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
            <Typography className={styles.bulkCount}>{dicBankLabels.bulkApplyingChanges}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${dicBankLabels.bulkRowsSelected}`}</Typography>
            {blnCanChangeStatus ? <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicBankLabels.bulkActivate}</Button> : null}
            {blnCanChangeStatus ? <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicBankLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicBankLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicBankLabels.addButton}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(dicBankLabels.exportFileName, lstFilteredBanks)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportExcel}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicBankLabels.exportTitle, lstFilteredBanks)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicCommonLabels.exportPdf}</Button> : null}
          </Box>

          {!blnLoading && lstFilteredBanks.length > 0 ? (
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredBanks.length)} {dicCommonLabels.paginationSeparator} {lstFilteredBanks.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>
        {blnRightsLoading || blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicBankLabels.loadingRecords}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Bank access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need bank visibility.</Typography>
          </Box>
        ) : (
        // The table wrapper is the only scrolling region so the master header stays stable on screen.
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                <th>{dicBankLabels.tableActions}</th>
                <th>{dicBankLabels.tableName}</th>
                <th>{dicBankLabels.tableCode}</th>
                <th>{dicBankLabels.tableStatus}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredBanks.length === 0 ? (
                <tr><td className={styles.emptyState} colSpan={5}>{dicBankLabels.emptyMessage}</td></tr>
              ) : lstVisibleBanks.map((dicBank) => {
                const blnSelected = lstSelectedIds.includes(dicBank.id);
                return (
                  <tr key={dicBank.id} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicBank.id)} /></td>
                    <td><CommonRowActions blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} blnCanToggle={blnCanChangeStatus} blnToggleActive={dicBank.status === "Active"} onView={() => openDialog("view", dicBank)} onEdit={() => openDialog("edit", dicBank)} onDelete={() => deleteBank(dicBank.id)} onToggle={() => toggleBankStatus(dicBank.id)} /></td>
                    <td>{dicBank.name}</td>
                    <td>{dicBank.code}</td>
                    <td><span className={`${styles.statusPill} ${dicBank.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicBank.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}</span></td>
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
        strTitle={strMode === "add" ? dicBankLabels.dialogAddTitle : strMode === "edit" ? dicBankLabels.dialogEditTitle : dicBankLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicBankLabels.saving : dicCommonLabels.save}
        onPrimaryAction={saveBank}
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
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                alignItems: "start",
              }}
            >
              <TextField
                label={`${dicBankLabels.fieldName} *`}
                value={dicForm.name}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishBankName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                helperText={dicErrors.name}
                fullWidth
              />
              <TextField
                label={`${dicBankLabels.fieldCode} *`}
                value={dicForm.code}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncBankCode(strValue);
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
                  {t("multilingual_text_help", "Add translated bank names for supported languages.")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
                <Button variant="outlined" startIcon={<AddRoundedIcon />} disabled>
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
                      <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={getRowLabel(dicText.intLanguageID, "field_name", dicBankLabels.fieldName)}
                    value={dicText.strBankName}
                    onChange={(objEvent) => {
                      const strValue = objEvent.target.value;
                      updateTextRow(dicText.strRowID, "strBankName", strValue);
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
                    label={getRowLabel(dicText.intLanguageID, "field_code", dicBankLabels.fieldCode)}
                    value={dicText.strBankCode}
                    disabled
                    fullWidth
                  />
                </Box>
              ))}
            </Box>

            <Box className={styles.switchRow}>
              <Typography className={styles.switchLabel}>{dicBankLabels.fieldIsActive}</Typography>
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
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicBankLabels.confirmButton}
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
