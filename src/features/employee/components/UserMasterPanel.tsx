"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { type UserApiRecord, type UserFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";

type UserStatus = "Active" | "Inactive";
type UserMode = "add" | "edit" | "view";
type AuthSource = "local" | "sso";

type UserRecord = {
  id: string;
  loginName: string;
  email: string;
  mobile: string;
  authSource: AuthSource;
  ssoEnabled: boolean;
  ssoLoginMapping: string;
  preferredLanguageID: number | null;
  userGroupID: number | null;
  userGroupName: string;
  status: UserStatus;
  locked: boolean;
};

type UserForm = {
  loginName: string;
  email: string;
  mobile: string;
  password: string;
  authSource: AuthSource;
  ssoEnabled: boolean;
  ssoLoginMapping: string;
  preferredLanguageID: number | "";
  userGroupID: number | "";
  status: UserStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | UserStatus;
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

const dicEmptyForm: UserForm = {
  loginName: "",
  email: "",
  mobile: "",
  password: "",
  authSource: "local",
  ssoEnabled: false,
  ssoLoginMapping: "",
  preferredLanguageID: "",
  userGroupID: "",
  status: "Active"
};
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstDefaultUsers: UserRecord[] = [];
const lstRowsPerPageOptions = [10, 20, 50];

function mapUserRecord(dicRecord: UserApiRecord): UserRecord {
  return {
    id: String(dicRecord.intID),
    loginName: dicRecord.strLoginName ?? "",
    email: dicRecord.strEmailAddress ?? "",
    mobile: dicRecord.strMobileNumber ?? "",
    authSource: dicRecord.strAuthSource ?? "local",
    ssoEnabled: dicRecord.blnIsSsoEnabled,
    ssoLoginMapping: dicRecord.strSsoLoginMapping ?? "",
    preferredLanguageID: dicRecord.intPreferredLanguageID,
    userGroupID: dicRecord.intUserGroupID,
    userGroupName: dicRecord.strUserGroupName ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
    locked: dicRecord.blnIsLocked
  };
}

function downloadCsv(strFileName: string, lstRows: UserRecord[]) {
  const lstHeaders = ["Login Name", "Email Address", "Mobile Number", "Auth Source", "SSO Enabled", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.loginName, dicRow.email, dicRow.mobile, dicRow.authSource, dicRow.ssoEnabled ? "Yes" : "No", dicRow.status]
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

function exportPdf(strTitle: string, lstRows: UserRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.loginName}</td>
      <td>${dicRow.email}</td>
      <td>${dicRow.mobile}</td>
      <td>${dicRow.authSource}</td>
      <td>${dicRow.ssoEnabled ? "Yes" : "No"}</td>
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
              <th>Login Name</th>
              <th>Email Address</th>
              <th>Mobile Number</th>
              <th>Auth Source</th>
              <th>SSO Enabled</th>
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

export default function UserMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("user");
  const [lstUsers, setLstUsers] = useState<UserRecord[]>(lstDefaultUsers);
  const [objFormOptions, setObjFormOptions] = useState<UserFormOptionsApiRecord>({ lstLanguages: [], lstUserGroups: [] });
  const [strMode, setStrMode] = useState<UserMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingUserId, setStrEditingUserId] = useState("");
  const [dicForm, setDicForm] = useState<UserForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const dicCommonLabels = {
    cancel: t("cancel"),
    close: t("close"),
    clear: t("clear"),
    confirm: t("confirm"),
    delete: t("delete"),
    activate: t("activate"),
    deactivate: t("deactivate"),
    exportExcel: t("export_excel"),
    exportPdf: t("export_pdf"),
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
    searchCodePlaceholder: t("search_code_placeholder"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableLoginName: t("table_login_name"),
    tableEmail: t("table_email"),
    tableMobile: t("table_mobile"),
    tableAuthSource: t("table_auth_source"),
    tableUserGroup: t("table_user_group", "User Group"),
    tableSsoEnabled: t("table_sso_enabled"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    fieldLoginName: t("field_login_name"),
    fieldEmail: t("field_email"),
    fieldMobile: t("field_mobile"),
    fieldPassword: t("field_password"),
    fieldAuthSource: t("field_auth_source"),
    fieldSsoLoginMapping: t("field_sso_login_mapping"),
    fieldPreferredLanguage: t("field_preferred_language", "Preferred Language"),
    fieldUserGroup: t("field_user_group", "User Group"),
    fieldStatus: t("field_status"),
    fieldSsoEnabled: t("field_sso_enabled"),
    helperPasswordOptional: t("helper_password_optional"),
    authSourceLocal: t("auth_source_local"),
    authSourceSso: t("auth_source_sso"),
    ssoEnabledYes: t("sso_enabled_yes"),
    ssoEnabledNo: t("sso_enabled_no"),
    saveButton: t("save_button"),
    updateButton: t("update_button"),
    saveSuccess: t("save_success"),
    updateSuccess: t("update_success"),
    deleteSuccess: t("delete_success"),
    activateSuccess: t("activate_success"),
    deactivateSuccess: t("deactivate_success"),
    bulkActivateSuccess: t("bulk_activate_success"),
    bulkDeactivateSuccess: t("bulk_deactivate_success"),
    bulkDeleteSuccess: t("bulk_delete_success"),
    requestFailed: t("request_failed"),
    validationLoginNameRequired: t("validation_login_name_required"),
    validationLoginNameMin: t("validation_login_name_min"),
    validationEmailRequired: t("validation_email_required"),
    validationEmailInvalid: t("validation_email_invalid"),
    validationPasswordRequired: t("validation_password_required"),
    validationPasswordMin: t("validation_password_min"),
    validationMobileInvalid: t("validation_mobile_invalid"),
    validationUserGroupRequired: t("validation_user_group_required", "User group is required."),
    bulkRowsSelected: t("bulk_rows_selected"),
    bulkActivate: t("bulk_activate"),
    bulkDeactivate: t("bulk_deactivate"),
    bulkDelete: t("bulk_delete"),
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
  };

  async function loadData() {
    setBlnLoading(true);
    try {
      const [objUsers, objOptions] = await Promise.all([
        masterApiService.getUsers(),
        masterApiService.getUserFormOptions(),
      ]);
      setLstUsers(objUsers.Data.map(mapUserRecord));
      setObjFormOptions(objOptions.Data);
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const lstFilteredUsers = useMemo(() => lstUsers.filter((dicUser) => {
    const blnCodeMatch = !dicSearchApplied.code || dicUser.loginName.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicUser.email.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicUser.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstUsers]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredUsers.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleUsers = lstFilteredUsers.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleUsers.length > 0 && lstVisibleUsers.every((dicUser) => lstSelectedIds.includes(dicUser.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleUsers.some((dicUser) => dicUser.id === strId));

  function openDialog(strNextMode: UserMode, dicUser?: UserRecord) {
    setStrMode(strNextMode);
    setStrEditingUserId(dicUser?.id ?? "");
    setDicErrors({});
    setDicForm(dicUser ? {
      loginName: dicUser.loginName,
      email: dicUser.email,
      mobile: dicUser.mobile,
      password: "",
      authSource: dicUser.authSource,
      ssoEnabled: dicUser.ssoEnabled,
      ssoLoginMapping: dicUser.ssoLoginMapping,
      preferredLanguageID: dicUser.preferredLanguageID ?? "",
      userGroupID: dicUser.userGroupID ?? "",
      status: dicUser.status
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

  function setFormField<TKey extends keyof UserForm>(strField: TKey, objValue: UserForm[TKey]) {
    setDicForm((objPrevious) => ({ ...objPrevious, [strField]: objValue }));
    setDicErrors((objPrevious) => {
      if (!objPrevious[strField]) {
        return objPrevious;
      }
      return { ...objPrevious, [strField]: undefined };
    });
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
      showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof UserForm, string>> = {};
    const strLoginName = dicForm.loginName.trim();
    const strEmail = dicForm.email.trim();
    const strMobile = dicForm.mobile.trim();

    if (!strLoginName) {
      dicNextErrors.loginName = dicModuleLabels.validationLoginNameRequired;
    } else if (strLoginName.length < 3) {
      dicNextErrors.loginName = dicModuleLabels.validationLoginNameMin;
    }

    if (!strEmail) {
      dicNextErrors.email = dicModuleLabels.validationEmailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strEmail)) {
      dicNextErrors.email = dicModuleLabels.validationEmailInvalid;
    }

    if (strMode === "add" && !dicForm.password.trim()) {
      dicNextErrors.password = dicModuleLabels.validationPasswordRequired;
    } else if (dicForm.password.trim() && dicForm.password.trim().length < 8) {
      dicNextErrors.password = dicModuleLabels.validationPasswordMin;
    }

    if (strMobile && !/^[0-9+\-\s]+$/.test(strMobile)) {
      dicNextErrors.mobile = dicModuleLabels.validationMobileInvalid;
    }

    if (!dicForm.userGroupID) {
      dicNextErrors.userGroupID = dicModuleLabels.validationUserGroupRequired;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveUser() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strLoginName: dicForm.loginName.trim(),
      strEmailAddress: dicForm.email.trim(),
      strMobileNumber: dicForm.mobile.trim() || null,
      strPassword: dicForm.password.trim() || null,
      strAuthSource: dicForm.authSource,
      blnIsSsoEnabled: dicForm.ssoEnabled,
      strSsoLoginMapping: dicForm.ssoLoginMapping.trim() || null,
      intPreferredLanguageID: dicForm.preferredLanguageID || null,
      intUserGroupID: Number(dicForm.userGroupID),
      blnIsActive: dicForm.status === "Active"
    } as const;

    const objRequest = strMode === "add"
      ? masterApiService.createUser(objBody)
      : masterApiService.updateUser(Number(strEditingUserId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadData())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? dicModuleLabels.saveSuccess : dicModuleLabels.updateSuccess);
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : dicModuleLabels.requestFailed, "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strUserId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strUserId)
      ? lstPrevious.filter((strId) => strId !== strUserId)
      : [...lstPrevious, strUserId]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleUsers.some((dicUser) => dicUser.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleUsers.map((dicUser) => dicUser.id)])]);
  }

  function bulkUpdateStatus(strStatus: UserStatus) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? dicModuleLabels.confirmBulkActivateTitle : dicModuleLabels.confirmBulkDeactivateTitle,
      strMessage: (strStatus === "Active" ? dicModuleLabels.confirmBulkActivateMessage : dicModuleLabels.confirmBulkDeactivateMessage)
        .replace("{count}", String(lstSelectedIds.length))
        .replace("{status}", strStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strStatus === "Active" ? dicModuleLabels.bulkActivate : dicModuleLabels.bulkDeactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkUserStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadData();
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
        await masterApiService.bulkUserDelete(lstSelectedIds.map(Number));
        await loadData();
        showToast(dicModuleLabels.bulkDeleteSuccess);
      }
    });
  }

  function deleteUser(strUserId: string) {
    openConfirmDialog({
      strTitle: dicModuleLabels.confirmDeleteTitle,
      strMessage: dicModuleLabels.confirmDeleteMessage,
      strConfirmLabel: dicCommonLabels.delete,
      fnOnConfirm: async () => {
        await masterApiService.bulkUserDelete([Number(strUserId)]);
        await loadData();
        showToast(dicModuleLabels.deleteSuccess);
      }
    });
  }

  function toggleUserStatus(strUserId: string) {
    const objUser = lstUsers.find((dicItem) => dicItem.id === strUserId);
    if (!objUser) {
      return;
    }

    const strNextStatus = objUser.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: strNextStatus === "Active" ? dicModuleLabels.confirmActivateTitle : dicModuleLabels.confirmDeactivateTitle,
      strMessage: (strNextStatus === "Active" ? dicModuleLabels.confirmActivateMessage : dicModuleLabels.confirmDeactivateMessage)
        .replace("{status}", strNextStatus === "Active" ? dicCommonLabels.statusActive.toLowerCase() : dicCommonLabels.statusInactive.toLowerCase()),
      strConfirmLabel: strNextStatus === "Active" ? dicCommonLabels.activate : dicCommonLabels.deactivate,
      fnOnConfirm: async () => {
        await masterApiService.bulkUserStatus([Number(strUserId)], strNextStatus === "Active");
        await loadData();
        showToast(strNextStatus === "Active" ? dicModuleLabels.activateSuccess : dicModuleLabels.deactivateSuccess);
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/dashboard")}>
          {dicModuleLabels.backButton}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField
            value={dicSearchDraft.code}
            placeholder={dicModuleLabels.searchCodePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, code: objEvent.target.value }))}
          />
          <TextField
            value={dicSearchDraft.name}
            placeholder={dicModuleLabels.searchNamePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, name: objEvent.target.value }))}
          />
          <TextField
            select
            label={dicModuleLabels.searchStatusPlaceholder}
            value={dicSearchDraft.status}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, status: objEvent.target.value as SearchForm["status"] }))}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }}>
              {dicCommonLabels.search}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }}>
              {dicCommonLabels.clear}
            </Button>
          </Box>
        </Box>

        {lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
            <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")}>{dicModuleLabels.bulkActivate}</Button>
            <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")}>{dicModuleLabels.bulkDeactivate}</Button>
            <Button className={styles.bulkDelete} onClick={bulkDelete}>{dicModuleLabels.bulkDelete}</Button>
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")}>
              {dicModuleLabels.addButton}
            </Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("user-master", lstFilteredUsers)}>
              {dicCommonLabels.exportExcel}
            </Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.pageTitle, lstFilteredUsers)}>
              {dicCommonLabels.exportPdf}
            </Button>
          </Box>

          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          <Box className={styles.paginationInfo}>
            <Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography>
            <TextField
              select
              size="small"
              className={styles.rowsPerPageSelect}
              value={String(intRowsPerPage)}
              onChange={(objEvent) => {
                setIntRowsPerPage(Number(objEvent.target.value));
                setIntPage(1);
              }}
            >
              {lstRowsPerPageOptions.map((intOption) => (
                <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
              ))}
            </TextField>
            <Typography className={styles.paginationRange}>
              {lstFilteredUsers.length === 0 ? "0" : intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredUsers.length)} {dicCommonLabels.paginationSeparator} {lstFilteredUsers.length}
            </Typography>
          </Box>
          <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intValue) => setIntPage(intValue)} color="primary" size="small" />
        </Box>
        </Box>

        <Box className={styles.tableWrap}>
          {blnLoading ? (
            <Box className={styles.emptyState}>
              <CircularProgress size={24} />
              <Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography>
            </Box>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} />
                  </th>
                  <th>{dicModuleLabels.tableActions}</th>
                  <th>{dicModuleLabels.tableLoginName}</th>
                  <th>{dicModuleLabels.tableEmail}</th>
                  <th>{dicModuleLabels.tableMobile}</th>
                  <th>{dicModuleLabels.tableAuthSource}</th>
                  <th>{dicModuleLabels.tableUserGroup}</th>
                  <th>{dicModuleLabels.tableSsoEnabled}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstVisibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>{dicModuleLabels.emptyMessage}</td>
                  </tr>
                ) : lstVisibleUsers.map((dicUser) => (
                  <tr key={dicUser.id} className={lstSelectedIds.includes(dicUser.id) ? styles.selectedRow : undefined}>
                    <td>
                      <Checkbox checked={lstSelectedIds.includes(dicUser.id)} onChange={() => toggleSelection(dicUser.id)} />
                    </td>
                    <td>
                      <Box className={styles.actionCell}>
                        <button type="button" className={`${styles.iconButton} ${styles.viewIcon}`} onClick={() => openDialog("view", dicUser)}><VisibilityRoundedIcon fontSize="small" /></button>
                        <button type="button" className={`${styles.iconButton} ${styles.editIcon}`} onClick={() => openDialog("edit", dicUser)}><EditRoundedIcon fontSize="small" /></button>
                        <button type="button" className={`${styles.iconButton} ${styles.deleteIcon}`} onClick={() => deleteUser(dicUser.id)}><DeleteRoundedIcon fontSize="small" /></button>
                        <button type="button" className={`${styles.iconButton} ${styles.toggleIcon}`} onClick={() => toggleUserStatus(dicUser.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
                      </Box>
                    </td>
                    <td>{dicUser.loginName}</td>
                    <td>{dicUser.email}</td>
                    <td>{dicUser.mobile || "-"}</td>
                    <td>{dicUser.authSource === "local" ? dicModuleLabels.authSourceLocal : dicModuleLabels.authSourceSso}</td>
                    <td>{dicUser.userGroupName || "-"}</td>
                    <td>{dicUser.ssoEnabled ? dicModuleLabels.ssoEnabledYes : dicModuleLabels.ssoEnabledNo}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicUser.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
                        {dicUser.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>
      </Box>

      <Dialog
        open={blnDialogOpen}
        onClose={blnSubmitting ? undefined : closeDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 0,
            overflow: "hidden",
            maxHeight: "86vh",
            background: "linear-gradient(180deg, rgba(250,253,255,1) 0%, rgba(255,255,255,1) 55%, rgba(247,250,252,1) 100%)",
          },
        }}
      >
        <DialogTitle sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a" }}>
            {strMode === "add" ? dicModuleLabels.dialogAddTitle : strMode === "edit" ? dicModuleLabels.dialogEditTitle : dicModuleLabels.dialogViewTitle}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField label={dicModuleLabels.fieldLoginName} value={dicForm.loginName} onChange={(objEvent) => setFormField("loginName", objEvent.target.value)} error={Boolean(dicErrors.loginName)} helperText={dicErrors.loginName} disabled={strMode === "view"} fullWidth required />
              <TextField label={dicModuleLabels.fieldEmail} value={dicForm.email} onChange={(objEvent) => setFormField("email", objEvent.target.value)} error={Boolean(dicErrors.email)} helperText={dicErrors.email} disabled={strMode === "view"} fullWidth required />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField label={dicModuleLabels.fieldMobile} value={dicForm.mobile} onChange={(objEvent) => setFormField("mobile", objEvent.target.value)} error={Boolean(dicErrors.mobile)} helperText={dicErrors.mobile} disabled={strMode === "view"} fullWidth />
              <TextField label={dicModuleLabels.fieldPassword} type="password" value={dicForm.password} onChange={(objEvent) => setFormField("password", objEvent.target.value)} error={Boolean(dicErrors.password)} helperText={strMode === "edit" && !dicErrors.password ? dicModuleLabels.helperPasswordOptional : dicErrors.password} disabled={strMode === "view"} fullWidth />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField select label={dicModuleLabels.fieldAuthSource} value={dicForm.authSource} onChange={(objEvent) => setFormField("authSource", objEvent.target.value as AuthSource)} disabled={strMode === "view"} fullWidth>
                <MenuItem value="local">{dicModuleLabels.authSourceLocal}</MenuItem>
                <MenuItem value="sso">{dicModuleLabels.authSourceSso}</MenuItem>
              </TextField>
              <TextField label={dicModuleLabels.fieldSsoLoginMapping} value={dicForm.ssoLoginMapping} onChange={(objEvent) => setFormField("ssoLoginMapping", objEvent.target.value)} disabled={strMode === "view"} fullWidth />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                select
                label={dicModuleLabels.fieldPreferredLanguage}
                value={String(dicForm.preferredLanguageID)}
                onChange={(objEvent) => setFormField("preferredLanguageID", objEvent.target.value ? Number(objEvent.target.value) : "")}
                disabled={strMode === "view"}
                fullWidth
              >
                <MenuItem value="">Default</MenuItem>
                {objFormOptions.lstLanguages.map((objLanguage) => (
                  <MenuItem key={objLanguage.intID} value={String(objLanguage.intID)}>
                    {objLanguage.strLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={dicModuleLabels.fieldUserGroup}
                value={String(dicForm.userGroupID)}
                onChange={(objEvent) => setFormField("userGroupID", objEvent.target.value ? Number(objEvent.target.value) : "")}
                error={Boolean(dicErrors.userGroupID)}
                helperText={dicErrors.userGroupID}
                disabled={strMode === "view"}
                fullWidth
                required
              >
                <MenuItem value="">Select</MenuItem>
                {objFormOptions.lstUserGroups.map((objGroup) => (
                  <MenuItem key={objGroup.intID} value={String(objGroup.intID)}>
                    {objGroup.strCode ? `${objGroup.strCode} - ${objGroup.strLabel}` : objGroup.strLabel}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField select label={dicModuleLabels.fieldStatus} value={dicForm.status} onChange={(objEvent) => setFormField("status", objEvent.target.value as UserStatus)} disabled={strMode === "view"} fullWidth>
                <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
                <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
              </TextField>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 0,
                  border: "1px solid #dbe7f0",
                  background: "rgba(248,250,252,0.9)",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{dicModuleLabels.fieldSsoEnabled}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                    Enable only when this user should authenticate through SSO mapping.
                  </Typography>
                </Box>
                <Switch checked={dicForm.ssoEnabled} onChange={(_, blnChecked) => setFormField("ssoEnabled", blnChecked)} disabled={strMode === "view"} />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
          <Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}</Button>
          {strMode !== "view" ? (
            <Button className={styles.primaryButton} onClick={saveUser} disabled={blnSubmitting}>
              {strMode === "add" ? dicModuleLabels.saveButton : dicModuleLabels.updateButton}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button className={styles.textAction} onClick={closeConfirmDialog}>{dicCommonLabels.cancel}</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? dicCommonLabels.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
