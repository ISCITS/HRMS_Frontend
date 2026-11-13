"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
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
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import MasterBreadcrumbs from "@/components/master/MasterBreadcrumbs";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader, { DottedLoader } from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
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

type BankTableRow = {
  id: string;
  name: ReactNode;
  nameSortValue: string;
  code: string;
  status: ReactNode;
  statusSortValue: string;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | BankStatus;
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptyForm = createInitialBankForm();
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultBanks: BankRecord[] = [];
const lstBankModuleCodes = ["BANK", "BANKS"];
const intBankSkeletonRows = 8;

function BankGridSkeleton() {
  return (
    <Box
      data-control-id="bank-master.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={104} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 580 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.55fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 2 ? 76 : 118} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intBankSkeletonRows }).map((_, intIndex) => (
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
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${58 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${34 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// The API record includes backend naming; the panel works against a compact UI-facing record shape.
function mapBankRecord(dicRecord: BankApiRecord): BankRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strBankCode,
    name: dicRecord.strBankName,
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

export default function BankMasterPanel() {
  const { t } = useModuleLabels("bank");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstBankModuleCodes);
  const [lstBanks, setLstBanks] = useState<BankRecord[]>(lstDefaultBanks);
  const [objFormOptions, setObjFormOptions] = useState<SimpleMasterFormOptionsApiRecord>({ lstLanguages: [] });
  const [strMode, setStrMode] = useState<BankMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingBankId, setStrEditingBankId] = useState("");
  const [dicForm, setDicForm] = useState<BankFormValues>(dicEmptyForm);
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
    save: t("save"),
    search: t("search"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    loading: t("loading"),
    processing: t("processing"),
  };
  const dicBankLabels = {
    pageTitle: stripMasterTitle(t("page_title")),
    addButton: t("add_button"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    exportFileName: t("export_file_name"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    emptyMessage: t("empty_message"),
    tableName: t("table_name", "Bank Name"),
    tableCode: t("table_code", "Bank Code"),
    tableStatus: t("table_status"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    requestFailed: t("request_failed"),
    fieldName: t("field_name", "Bank Name"),
    fieldCode: t("field_code", "Bank Code"),
    saving: t("saving", "Saving..."),
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationCodeDuplicate: t("validation_code_duplicate"),
    validationNameDuplicate: t("validation_name_duplicate"),
  };

  async function loadBanks() {
    // Reload from the backend after every mutation so the grid and DB state stay in sync.
    if (!canViewAny()) {
      setLstBanks([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getBanks();
      setLstBanks(objResult.Data.map(mapBankRecord));
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
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

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
    const dicSecondaryRow = lstVisibleTranslationRows[0];
    if (!dicSecondaryRow) {
      return;
    }
    const intTargetLanguageID = Number(dicSecondaryRow.intLanguageID) || intSecondaryLanguageID;
    if (!intTargetLanguageID || intTargetLanguageID === intDefaultLanguageID) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, intTargetLanguageID);
  }

  const lstVisibleTranslationRows = dicForm.lstTexts.filter((dicText) => {
    const dicLanguage = objFormOptions.lstLanguages.find((dicItem) => dicItem.intID === Number(dicText.intLanguageID));
    const strCode = dicLanguage?.strCode?.trim().toLowerCase() ?? "";
    const strName = (dicLanguage?.strLabel ?? dicText.strLanguageName).trim().toLowerCase();
    return Number(dicText.intLanguageID) !== intDefaultLanguageID &&
      !/^es(?:[-_]|$)/.test(strCode) && !["spa", "spanish", "espa?ol", "espanol"].includes(strCode) &&
      !/spanish|espa?ol|espanol/.test(strName);
  });

  // Filter draft values are only committed on Search/Clear to keep the grid interactions predictable.
  const lstFilteredBanks = useMemo(() => lstBanks.filter((dicBank) => {
    const blnCodeMatch = !dicSearchApplied.code || dicBank.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicBank.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicBank.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstBanks]);

  const lstTableRows: BankTableRow[] = lstFilteredBanks.map((dicBank) => ({
    id: dicBank.id,
    name: (
      <Link component="span" underline="none" className="app-master-first-column-link">
        {dicBank.name}
      </Link>
    ),
    nameSortValue: dicBank.name,
    code: dicBank.code,
    status: (
      <span className={`app-master-status-pill ${dicBank.status === "Active" ? "app-master-status-active" : "app-master-status-inactive"}`}>
        {dicBank.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
      </span>
    ),
    statusSortValue: dicBank.status
  }));

  const lstTableColumns: CommonTableColumn<BankTableRow>[] = [
    { field: "name", headerName: dicBankLabels.tableName, width: 260, sortAccessor: (dicRow) => dicRow.nameSortValue },
    { field: "code", headerName: dicBankLabels.tableCode, width: 180 },
    { field: "status", headerName: dicBankLabels.tableStatus, width: 140, sortAccessor: (dicRow) => dicRow.statusSortValue }
  ];

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

  function openDialog(strNextMode: BankMode, dicBank?: BankRecord) {
    setStrMode(strNextMode);
    setStrEditingBankId(dicBank?.id ?? "");
    strPendingErrorFocusRef.current = null;
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
    strPendingErrorFocusRef.current = null;
    setBlnDialogOpen(false);
  }

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
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

    strPendingErrorFocusRef.current = dicNextErrors.name ? "name" : dicNextErrors.code ? "code" : null;
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
      .catch((objError) => {
        const strMessage = objError instanceof Error ? objError.message : dicBankLabels.requestFailed;
        const blnCodeError = /bank code/i.test(strMessage) && !/bank name/i.test(strMessage);
        const blnNameError = /bank name/i.test(strMessage) && !/bank code/i.test(strMessage);
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
    <Box className={styles.page}>
      <MasterBreadcrumbs strCurrent={dicBankLabels.pageTitle} />

      <Box className="app-master-search-panel">
        {strRightsError ? (
          <Typography controlId="bank-master.list.banner.rights-error" sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography controlId="bank-master.read-only.banner" sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Bank.")}
          </Typography>
        ) : null}
        <Box
          className={`${styles.searchRow} ${styles.searchRowCentered}`}
        >
          <TextField className="app-mui-text-field" id="bank-search-name" controlId="bank-master.list.search-name.input" inputProps={{ "controlId": "bank-master.list.search-name.input" }} label={dicBankLabels.tableName} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicBankLabels.searchNamePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }} disabled={blnLoading || blnSubmitting} fullWidth />
          <TextField className="app-mui-text-field" id="bank-search-code" controlId="bank-master.list.search-code.input" inputProps={{ "controlId": "bank-master.list.search-code.input" }} label={dicBankLabels.tableCode} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicBankLabels.searchCodePlaceholder} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }} disabled={blnLoading || blnSubmitting} fullWidth />
          <TextField className="app-mui-text-field" id="bank-search-status" controlId="bank-master.list.search-status.select" inputProps={{ "controlId": "bank-master.list.search-status.select" }} select label={dicBankLabels.tableStatus} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} size="small" disabled={blnLoading || blnSubmitting} fullWidth>
            <MenuItem controlId="bank-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem controlId="bank-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem controlId="bank-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button controlId="bank-master.list.search.button" className="app-btn app-btn-primary" startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button controlId="bank-master.list.clear.button" className="app-btn app-btn-outline" startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      <Box className="app-master-table-panel app-master-page-relative">
        {(blnLoading || blnRightsLoading) && !blnDialogOpen ? (
          <BankGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} controlId="bank-master.no-access.message">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Bank access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need bank visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={20}
            pageSizeOptions={[10, 20, 50]}
            exportFileName={dicBankLabels.exportFileName.replace(/\.(csv|pdf)$/i, "")}
            exportButtonClassName="app-btn app-btn-outline"
            showExportOptions={blnCanExport}
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              const dicBank = lstBanks.find((dicItem) => dicItem.id === dicRow.id);
              if (dicBank) openDialog(blnCanEdit ? "edit" : "view", dicBank);
            }}
            emptyMessage={dicBankLabels.emptyMessage}
            testIdPrefix="bank-master.list"
            toolbarLeft={blnCanAdd ? (
              <Button controlId="bank-master.list.add.button" className="app-btn app-btn-primary" startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {dicBankLabels.addButton}
              </Button>
            ) : null}
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
            className="app-master-common-table-reset"
          />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        strTitle={strMode === "add" ? dicBankLabels.dialogAddTitle : strMode === "edit" ? dicBankLabels.dialogEditTitle : dicBankLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicBankLabels.saving : dicCommonLabels.save}
        strSecondaryButtonClassName="app-btn app-btn-outline"
        strPrimaryButtonClassName="app-btn app-btn-primary"
        onPrimaryAction={saveBank}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        paperClassName={styles.departmentDialogPaper}
        maxWidth={false}
        fullWidth={false}
        contentClassName="app-master-dialog-content-compact"
        nodeTitleAction={
          <Box className={`${styles.switchRow} app-master-dialog-status-row`}>
            <ActiveStatusSwitch
              className="app-master-dialog-status-switch"
              testId="bank-master.dialog.active.switch"
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
            <Typography className={`${styles.switchLabel} app-master-dialog-status-text`}>
              {dicCommonLabels.statusActive}
            </Typography>
            <IconButton aria-label={dicCommonLabels.close} onClick={closeDialog} size="small" className="app-master-dialog-close-button app-master-dialog-close-button-spaced">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        nodeFooterStart={<Typography className="app-master-dialog-required-fields">{t("required_fields_hint", "Required fields are marked")} <Box component="span" className="app-master-dialog-required-asterisk">*</Box></Typography>}
        nodeContent={
          <Box sx={{ display: "grid", gap: "12px" }}>
            <Box
              sx={{
                display: "grid",
                columnGap: 1.6, rowGap: "12px",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              <TextField
                className="app-mui-text-field"
                required
                controlId="bank-master.dialog.name.input"
                inputRef={objNameInputRef}
                label={`${dicBankLabels.fieldName}`}
                placeholder={t("dialog_name_placeholder", "Enter bank name")}
                size="small"
                value={dicForm.name}
                inputProps={{ controlId: "bank-master.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, name: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, name: strValue }));
                  syncEnglishBankName(strValue);
                }}
                error={Boolean(dicErrors.name)}
                FormHelperTextProps={{ controlId: "bank-master.dialog.name.error" } as Record<string, string>}
                helperText={dicErrors.name}
                fullWidth
              />
              <TextField
                className="app-mui-text-field"
                required
                controlId="bank-master.dialog.code.input"
                inputRef={objCodeInputRef}
                label={`${dicBankLabels.fieldCode}`}
                placeholder={t("dialog_code_placeholder", "Enter bank code")}
                size="small"
                value={dicForm.code}
                inputProps={{ controlId: "bank-master.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, code: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, code: strValue }));
                  syncBankCode(strValue);
                }}
                error={Boolean(dicErrors.code)}
                FormHelperTextProps={{ controlId: "bank-master.dialog.code.error" } as Record<string, string>}
                helperText={dicErrors.code}
                fullWidth
              />
            </Box>

            {lstVisibleTranslationRows.length > 0 ? (
              <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                  <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography className="app-master-dialog-section-heading">{t("language_translations", "Language Translations")}</Typography>
                    <Typography className="app-master-dialog-section-subheading app-master-dialog-section-subheading-spaced">
                      {t("language_translations_help", "Provide translated bank names for the application languages you want to support.")}
                    </Typography>
                  </Box>
                  <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                    <span>
                      <Button
                        controlId="bank-master.dialog.translate.button"
                        className="app-btn app-btn-outline"
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
                      <Typography component="label" htmlFor={`bank-translation-${dicText.strRowID}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                        {objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName}
                      </Typography>
                      <TextField
                        className="app-mui-text-field"
                        id={`bank-translation-${dicText.strRowID}`}
                        controlId="bank-master.dialog.translated-name.input"
                        placeholder={t("dialog_translated_name_placeholder", "Enter bank name in {language}").replace("{language}", objFormOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName)}
                        value={dicText.strBankName}
                        inputProps={{ controlId: "bank-master.dialog.translated-name.input", "data-row-key": dicText.strRowID }}
                        onChange={(objEvent) => updateTextRow(dicText.strRowID, "strBankName", objEvent.target.value)}
                        disabled={strMode === "view"}
                        InputProps={{
                          endAdornment: dicTextTranslationLoading[dicText.strRowID] ? (
                            <InputAdornment position="end"><DottedLoader controlId="bank-master.dialog.translated-name.loading" intSize={18} sx={{ color: "#2563eb" }} /></InputAdornment>
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

      <BlockingLoader blnOpen={blnSubmitting} strLabel={dicCommonLabels.processing} intZIndex={1400} blnLocal />

      <Snackbar controlId="bank-master.toast.alert" open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" className="app-master-toast-alert">
          <span controlId="bank-master.toast.message">{objToast.strMessage}</span>
        </Alert>
      </Snackbar>
    </Box>
  );
}
