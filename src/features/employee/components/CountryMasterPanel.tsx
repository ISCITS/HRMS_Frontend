"use client";

import type { ReactNode } from "react";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, CircularProgress, MenuItem, Snackbar, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { type CountryApiRecord, masterApiService } from "@/services/master/MasterApiService";

type Status = "Active" | "Inactive";
type Mode = "add" | "edit" | "view";
type CountryRecord = { id: string; code: string; name: string; currencyCode: string; phoneCode: string; status: Status };
type CountryForm = { code: string; name: string; currencyCode: string; phoneCode: string; status: Status };
type SearchForm = { code: string; name: string; status: "All" | Status };
type ConfirmDialogState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> };
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type CountryTableRow = {
  id: string;
  select: ReactNode;
  rowActions: ReactNode;
  name: string;
  code: string;
  currencyCode: string;
  phoneCode: string;
  status: ReactNode;
};

const dicEmptyForm: CountryForm = { code: "", name: "", currencyCode: "", phoneCode: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstCountryModuleCodes = ["COUNTRY", "COUNTRIES"];

function mapCountryRecord(dicRecord: CountryApiRecord): CountryRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strCountryCode,
    name: dicRecord.strCountryName,
    currencyCode: dicRecord.strCurrencyCode,
    phoneCode: dicRecord.strPhoneCode ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
  };
}

export default function CountryMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("country");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstCountryModuleCodes);
  const [lstCountries, setLstCountries] = useState<CountryRecord[]>([]);
  const [strMode, setStrMode] = useState<Mode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingId, setStrEditingId] = useState("");
  const [dicForm, setDicForm] = useState<CountryForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof CountryForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const dicCommonLabels = {
    cancel: t("cancel"),
    clear: t("clear"),
    save: t("save"),
    search: t("search"),
    update: t("update"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
    loading: t("loading"),
    processing: t("processing"),
  };

  const dicModuleLabels = {
    backButton: t("back_button"),
    addButton: t("add_button"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableName: t("table_name"),
    tableCode: t("table_code"),
    tableCurrency: t("table_currency"),
    tablePhoneCode: t("table_phone_code"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    dialogAddTitle: t("dialog_add_title"),
    dialogEditTitle: t("dialog_edit_title"),
    dialogViewTitle: t("dialog_view_title"),
    fieldName: t("field_name"),
    fieldCode: t("field_code"),
    fieldCurrencyCode: t("field_currency_code"),
    fieldPhoneCode: t("field_phone_code"),
    fieldStatus: t("field_status"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    requestFailed: t("request_failed"),
    validationCodeRequired: t("validation_code_required"),
    validationCodeFormat: t("validation_code_format"),
    validationNameRequired: t("validation_name_required"),
    validationNameMin: t("validation_name_min"),
    validationCurrencyRequired: t("validation_currency_required"),
    validationCurrencyFormat: t("validation_currency_format"),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
    confirmButton: t("confirm_button"),
    confirmDeleteTitle: t("confirm_delete_title"),
    confirmDeleteMessage: t("confirm_delete_message"),
    confirmActivateTitle: t("confirm_activate_title"),
    confirmActivateMessage: t("confirm_activate_message"),
    confirmDeactivateTitle: t("confirm_deactivate_title"),
    confirmDeactivateMessage: t("confirm_deactivate_message"),
    confirmBulkDeleteTitle: t("confirm_bulk_delete_title"),
    confirmBulkDeleteMessage: t("confirm_bulk_delete_message"),
    confirmBulkActivateTitle: t("confirm_bulk_activate_title"),
    confirmBulkActivateMessage: t("confirm_bulk_activate_message"),
    confirmBulkDeactivateTitle: t("confirm_bulk_deactivate_title"),
    confirmBulkDeactivateMessage: t("confirm_bulk_deactivate_message"),
    close: t("close"),
  };

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;

  async function loadCountries() {
    if (!canViewAny()) {
      setLstCountries([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);

    await runFrontendAction({
      fnAction: () => masterApiService.getCountries(),
      fnOnSuccess: (objResult) => {
        setLstCountries(objResult.Data.map(mapCountryRecord));
        setLstSelectedIds([]);
      },
      fnOnError: (objError) => showToast(objError.message, "error"),
      fnFinally: () => setBlnLoading(false),
      strFallbackMessage: dicModuleLabels.requestFailed,
    });
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!canViewAny()) {
      setLstCountries([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    void loadCountries();
  }, [blnRightsLoading]);

  function setFormField<TKey extends keyof CountryForm>(strField: TKey, objValue: CountryForm[TKey]) {
    setDicForm((objPrevious) => ({ ...objPrevious, [strField]: objValue }));
    setDicErrors((objPrevious) => objPrevious[strField] ? { ...objPrevious, [strField]: undefined } : objPrevious);
  }

  const lstFiltered = useMemo(() => lstCountries.filter((dicCountry) => {
    const blnCodeMatch = !dicSearchApplied.code || dicCountry.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicCountry.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicCountry.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstCountries]);

  const blnAllFilteredSelected = lstFiltered.length > 0 && lstFiltered.every((dicCountry) => lstSelectedIds.includes(dicCountry.id));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstSelectedIds.some((strId) => lstFiltered.some((dicCountry) => dicCountry.id === strId));

  function toggleSelection(strId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strId)
      ? lstPrevious.filter((strValue) => strValue !== strId)
      : [...lstPrevious, strId]);
  }

  const lstTableRows = useMemo<CountryTableRow[]>(() => lstFiltered.map((dicCountry) => {
    const blnSelected = lstSelectedIds.includes(dicCountry.id);
    return {
      id: dicCountry.id,
      select: <Checkbox checked={blnSelected} onChange={() => toggleSelection(dicCountry.id)} />,
      rowActions: (
        <CommonRowActions
          blnCanView={blnCanView}
          blnCanEdit={blnCanEdit}
          blnCanDelete={blnCanDelete}
          blnCanToggle={blnCanChangeStatus}
          onView={() => openDialog("view", dicCountry)}
          onEdit={() => openDialog("edit", dicCountry)}
          onDelete={() => deleteRecord(dicCountry.id)}
          onToggle={() => toggleStatus(dicCountry.id)}
        />
      ),
      name: dicCountry.name,
      code: dicCountry.code,
      currencyCode: dicCountry.currencyCode,
      phoneCode: dicCountry.phoneCode || "-",
      status: (
        <span className={`${styles.statusPill} ${dicCountry.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
          {dicCountry.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
        </span>
      ),
    };
  }), [blnCanChangeStatus, blnCanDelete, blnCanEdit, blnCanView, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFiltered, lstSelectedIds]);

  const lstTableColumns = useMemo<CommonTableColumn<CountryTableRow>[]>(() => [
    { field: "select", headerName: "", width: 64, sortable: false, filterable: false, exportable: false },
    { field: "rowActions", headerName: dicModuleLabels.tableActions, width: 150, sortable: false, filterable: false, exportable: false },
    { field: "name", headerName: dicModuleLabels.tableName },
    { field: "code", headerName: dicModuleLabels.tableCode },
    { field: "currencyCode", headerName: dicModuleLabels.tableCurrency },
    { field: "phoneCode", headerName: dicModuleLabels.tablePhoneCode },
    { field: "status", headerName: dicModuleLabels.tableStatus, sortable: false, filterable: false },
  ], [dicModuleLabels.tableActions, dicModuleLabels.tableCode, dicModuleLabels.tableCurrency, dicModuleLabels.tableName, dicModuleLabels.tablePhoneCode, dicModuleLabels.tableStatus]);

  function openDialog(strNextMode: Mode, dicCountry?: CountryRecord) {
    setStrMode(strNextMode);
    setStrEditingId(dicCountry?.id ?? "");
    setDicErrors({});
    setDicForm(dicCountry ? {
      code: dicCountry.code,
      name: dicCountry.name,
      currencyCode: dicCountry.currencyCode,
      phoneCode: dicCountry.phoneCode,
      status: dicCountry.status,
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

    await runFrontendAction({
      fnAction: objConfirmDialog.fnOnConfirm,
      fnOnError: (objError) => showToast(objError.message, "error"),
      fnFinally: () => {
        setBlnSubmitting(false);
        closeConfirmDialog();
      },
      strFallbackMessage: dicModuleLabels.requestFailed,
    });
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof CountryForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCurrencyCode = dicForm.currencyCode.trim().toUpperCase();

    if (!strCode) {
      dicNextErrors.code = dicModuleLabels.validationCodeRequired;
    } else if (!/^[A-Z]{2}$/.test(strCode)) {
      dicNextErrors.code = dicModuleLabels.validationCodeFormat;
    }

    if (!strName) {
      dicNextErrors.name = dicModuleLabels.validationNameRequired;
    } else if (strName.length < 2) {
      dicNextErrors.name = dicModuleLabels.validationNameMin;
    }

    if (!strCurrencyCode) {
      dicNextErrors.currencyCode = dicModuleLabels.validationCurrencyRequired;
    } else if (!/^[A-Z]{3}$/.test(strCurrencyCode)) {
      dicNextErrors.currencyCode = dicModuleLabels.validationCurrencyFormat;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveCountry() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strCountryCode: dicForm.code.trim().toUpperCase(),
      strCountryName: dicForm.name.trim(),
      strCurrencyCode: dicForm.currencyCode.trim().toUpperCase(),
      strPhoneCode: dicForm.phoneCode.trim() || null,
      blnIsActive: dicForm.status === "Active",
    };

    setBlnSubmitting(true);

    void runFrontendAction({
      fnAction: () => strMode === "add" ? masterApiService.createCountry(objBody) : masterApiService.updateCountry(Number(strEditingId), objBody),
      fnOnSuccess: async () => {
        await loadCountries();
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      },
      fnOnError: (objError) => showToast(objError.message, "error"),
      fnFinally: () => setBlnSubmitting(false),
      strFallbackMessage: dicModuleLabels.requestFailed,
    });
  }

  function toggleSelectAll() {
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstFiltered.some((dicCountry) => dicCountry.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFiltered.map((dicCountry) => dicCountry.id)])]);
  }

  function bulkUpdateStatus(strStatus: Status) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicModuleLabels.confirmBulkActivateTitle : dicModuleLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicModuleLabels.confirmBulkActivateMessage : dicModuleLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicModuleLabels.bulkActivate : dicModuleLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadCountries();
        showToast(strStatus === "Active" ? dicModuleLabels.bulkActivateSuccess : dicModuleLabels.bulkDeactivateSuccess);
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmBulkDeleteTitle,
      strMessage: dicModuleLabels.confirmBulkDeleteMessage.replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: dicModuleLabels.bulkDelete,
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryDelete(lstSelectedIds.map(Number));
        await loadCountries();
        showToast(dicModuleLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteRecord(strId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: t("delete"),
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryDelete([Number(strId)]);
        await loadCountries();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }

  function toggleStatus(strId: string) {
    const objItem = lstCountries.find((dicItem) => dicItem.id === strId);
    if (!objItem) {
      return;
    }

    const strNextStatus = objItem.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicModuleLabels.confirmActivateTitle : dicModuleLabels.confirmDeactivateTitle,
      strMessage: (strNextStatus === "Active" ? dicModuleLabels.confirmActivateMessage : dicModuleLabels.confirmDeactivateMessage)
        .replace("{status}", strNextStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strNextStatus === "Active" ? t("activate") : t("deactivate"),
      fnOnConfirm: async () => {
        await masterApiService.bulkCountryStatus([Number(strId)], strNextStatus === "Active");
        await loadCountries();
        showToast(strNextStatus === "Active" ? dicModuleLabels.activateSuccess : dicModuleLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {dicModuleLabels.backButton}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Country.")}
          </Typography>
        ) : null}

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth />
          <TextField select label={dicModuleLabels.searchStatusPlaceholder} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)} disabled={blnLoading || blnSubmitting}>
              {dicCommonLabels.search}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>
              {dicCommonLabels.clear}
            </Button>
          </Box>
        </Box>

        {lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
            {blnCanChangeStatus ? <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{dicModuleLabels.bulkActivate}</Button> : null}
            {blnCanChangeStatus ? <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{dicModuleLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{dicModuleLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        {blnRightsLoading || blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Country access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need country visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            emptyMessage={dicModuleLabels.emptyMessage}
            exportFileName="country-master"
            showExportOptions={blnCanExport}
            showPaginationSummary
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{dicModuleLabels.addButton}</Button> : null}
                <Checkbox checked={blnAllFilteredSelected} indeterminate={blnSomeFilteredSelected} onChange={toggleSelectAll} disabled={lstFiltered.length === 0} sx={{ alignSelf: "center" }} />
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
        strTitle={strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
        strSecondaryLabel={strMode === "view" ? dicModuleLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={blnSubmitting ? dicCommonLabels.processing : strMode === "add" ? dicCommonLabels.save : dicCommonLabels.update}
        onPrimaryAction={saveCountry}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeContent={(
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={`${dicModuleLabels.fieldName} *`} value={dicForm.name} disabled={strMode === "view"} onChange={(objEvent) => setFormField("name", objEvent.target.value)} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth />
            <TextField label={`${dicModuleLabels.fieldCode} *`} value={dicForm.code} disabled={strMode === "view"} onChange={(objEvent) => setFormField("code", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth />
            <TextField label={`${dicModuleLabels.fieldCurrencyCode} *`} value={dicForm.currencyCode} disabled={strMode === "view"} onChange={(objEvent) => setFormField("currencyCode", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.currencyCode)} helperText={dicErrors.currencyCode} fullWidth />
            <TextField label={dicModuleLabels.fieldPhoneCode} value={dicForm.phoneCode} disabled={strMode === "view"} onChange={(objEvent) => setFormField("phoneCode", objEvent.target.value)} fullWidth />
            <TextField select label={dicModuleLabels.fieldStatus} value={dicForm.status} disabled={strMode === "view"} onChange={(objEvent) => setFormField("status", objEvent.target.value as Status)} fullWidth>
              <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
              <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
            </TextField>
          </Box>
        )}
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

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
