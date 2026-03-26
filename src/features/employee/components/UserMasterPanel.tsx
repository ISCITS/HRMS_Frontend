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
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { type UserApiRecord, masterApiService } from "@/services/master/MasterApiService";

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
    cancel: t("cancel", dicConstant.common.cancel),
    clear: t("clear", dicConstant.common.clear),
    exportExcel: t("export_excel", dicConstant.common.exportExcel),
    exportPdf: t("export_pdf", dicConstant.common.exportPdf),
    search: t("search", dicConstant.common.search),
    statusActive: t("status_active", dicConstant.common.statusActive),
    statusInactive: t("status_inactive", dicConstant.common.statusInactive),
    rowsPerPage: t("rows_per_page", dicConstant.common.rowsPerPage),
    paginationSeparator: t("pagination_separator", dicConstant.common.paginationSeparator),
    loading: t("loading", "Loading..."),
    processing: t("processing", "Processing..."),
  };
  const dicModuleLabels = {
    breadcrumbs: t("breadcrumbs", "Admin / Master / Users"),
    pageTitle: t("page_title", dicConstant.users.pageTitle),
    backButton: t("back_button", dicConstant.users.backButton),
    addButton: t("add_button", dicConstant.users.addButton),
    searchCodePlaceholder: t("search_code_placeholder", "Search Login Name"),
    searchNamePlaceholder: t("search_name_placeholder", "Search Email Address"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    tableLoginName: t("table_login_name", "Login Name"),
    tableEmail: t("table_email", "Email Address"),
    tableMobile: t("table_mobile", "Mobile Number"),
    tableAuthSource: t("table_auth_source", "Auth Source"),
    tableSsoEnabled: t("table_sso_enabled", "SSO Enabled"),
    tableStatus: t("table_status", "Status"),
    tableActions: t("table_actions", "Actions"),
    loadingRecords: t("loading_records", "Loading users..."),
    emptyMessage: t("empty_message", "No user records found."),
  };

  async function loadUsers() {
    setBlnLoading(true);
    try {
      const objResult = await masterApiService.getUsers();
      setLstUsers(objResult.Data.map(mapUserRecord));
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadUsers().catch(() => undefined);
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
      showToast(objError instanceof Error ? objError.message : "Request failed.", "error");
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
      dicNextErrors.loginName = dicConstant.users.validation.loginNameRequired;
    } else if (strLoginName.length < 3) {
      dicNextErrors.loginName = dicConstant.users.validation.loginNameMin;
    }

    if (!strEmail) {
      dicNextErrors.email = dicConstant.users.validation.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strEmail)) {
      dicNextErrors.email = dicConstant.users.validation.emailInvalid;
    }

    if (strMode === "add" && !dicForm.password.trim()) {
      dicNextErrors.password = dicConstant.users.validation.passwordRequired;
    } else if (dicForm.password.trim() && dicForm.password.trim().length < 8) {
      dicNextErrors.password = dicConstant.users.validation.passwordMin;
    }

    if (strMobile && !/^[0-9+\-\s]+$/.test(strMobile)) {
      dicNextErrors.mobile = dicConstant.users.validation.mobileInvalid;
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
      blnIsActive: dicForm.status === "Active"
    } as const;

    const objRequest = strMode === "add"
      ? masterApiService.createUser(objBody)
      : masterApiService.updateUser(Number(strEditingUserId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadUsers())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? "User saved successfully." : "User updated successfully.");
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error"))
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
      strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Users`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected user record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkUserStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadUsers();
        showToast(strStatus === "Active" ? "Selected user records activated successfully." : "Selected user records deactivated successfully.");
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: "Bulk Delete Users",
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected user record(s)?`,
      strConfirmLabel: "Bulk Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkUserDelete(lstSelectedIds.map(Number));
        await loadUsers();
        showToast("Selected user records deleted successfully.");
      }
    });
  }

  function deleteUser(strUserId: string) {
    openConfirmDialog({
      strTitle: "Delete User",
      strMessage: "Are you sure you want to delete this user record?",
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkUserDelete([Number(strUserId)]);
        await loadUsers();
        showToast("User deleted successfully.");
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
      strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} User`,
      strMessage: `Are you sure you want to mark this user as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkUserStatus([Number(strUserId)], strNextStatus === "Active");
        await loadUsers();
        showToast(strNextStatus === "Active" ? "User activated successfully." : "User deactivated successfully.");
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
              size="small"
              label={dicModuleLabels.searchCodePlaceholder}
              value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, code: objEvent.target.value }))}
          />
          <TextField
            size="small"
             label={dicModuleLabels.searchNamePlaceholder}
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, name: objEvent.target.value }))}
          />
          <TextField
            select
            size="small"
            label={dicModuleLabels.searchStatusPlaceholder}
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, status: objEvent.target.value as SearchForm["status"] }))}
          >
            <MenuItem value="All">{dicModuleLabels.searchStatusPlaceholder}</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }}>
              {dicCommonLabels.search}
            </Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }}>
              {dicCommonLabels.clear}
            </Button>
          </Box>
        </Box>

        {lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {t("bulk_rows_selected", "selected")}</Typography>
            <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")}>{t("bulk_activate", "Bulk Activate")}</Button>
            <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
            <Button className={styles.bulkDelete} onClick={bulkDelete}>{t("bulk_delete", "Bulk Delete")}</Button>
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
              {lstFilteredUsers.length === 0 ? "0" : intStartIndex + 1} {dicCommonLabels.paginationSeparator} {Math.min(intStartIndex + intRowsPerPage, lstFilteredUsers.length)} of {lstFilteredUsers.length}
            </Typography>
          </Box>
          <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intValue) => setIntPage(intValue)} color="primary" size="small" />
        </Box>
        </Box>

        <Box className={styles.tableWrap}>
          {blnLoading ? (
            <Box className={styles.emptyState}>
              <CircularProgress size={24} />
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
                  <th>{dicModuleLabels.tableSsoEnabled}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstVisibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>{dicModuleLabels.emptyMessage}</td>
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
                        <button type="button" className={`${styles.iconButton} ${styles.toggleIcon}`} onClick={() => toggleUserStatus(dicUser.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
                        <button type="button" className={`${styles.iconButton} ${styles.deleteIcon}`} onClick={() => deleteUser(dicUser.id)}><DeleteRoundedIcon fontSize="small" /></button>
                      </Box>
                    </td>
                    <td>{dicUser.loginName}</td>
                    <td>{dicUser.email}</td>
                    <td>{dicUser.mobile || "-"}</td>
                    <td>{dicUser.authSource.toUpperCase()}</td>
                    <td>{dicUser.ssoEnabled ? "Yes" : "No"}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicUser.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
                        {dicUser.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>
      </Box>

      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ className: styles.compactDialogPaper }}>
        <DialogTitle>{strMode === "add" ? dicConstant.users.dialogAddTitle : strMode === "edit" ? dicConstant.users.dialogEditTitle : dicConstant.users.dialogViewTitle}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
            <TextField label={dicConstant.users.fields.loginName} value={dicForm.loginName} onChange={(objEvent) => setFormField("loginName", objEvent.target.value)} error={Boolean(dicErrors.loginName)} helperText={dicErrors.loginName} disabled={strMode === "view"} />
            <TextField label={dicConstant.users.fields.email} value={dicForm.email} onChange={(objEvent) => setFormField("email", objEvent.target.value)} error={Boolean(dicErrors.email)} helperText={dicErrors.email} disabled={strMode === "view"} />
            <TextField label={dicConstant.users.fields.mobile} value={dicForm.mobile} onChange={(objEvent) => setFormField("mobile", objEvent.target.value)} error={Boolean(dicErrors.mobile)} helperText={dicErrors.mobile} disabled={strMode === "view"} />
            <TextField label={dicConstant.users.fields.password} type="password" value={dicForm.password} onChange={(objEvent) => setFormField("password", objEvent.target.value)} error={Boolean(dicErrors.password)} helperText={strMode === "edit" && !dicErrors.password ? "Leave blank to keep the existing password." : dicErrors.password} disabled={strMode === "view"} />
            <TextField select label={dicConstant.users.fields.authSource} value={dicForm.authSource} onChange={(objEvent) => setFormField("authSource", objEvent.target.value as AuthSource)} disabled={strMode === "view"}>
              <MenuItem value="local">Local</MenuItem>
              <MenuItem value="sso">SSO</MenuItem>
            </TextField>
            <TextField label={dicConstant.users.fields.ssoLoginMapping} value={dicForm.ssoLoginMapping} onChange={(objEvent) => setFormField("ssoLoginMapping", objEvent.target.value)} disabled={strMode === "view"} />
            <TextField select label={dicConstant.users.fields.status} value={dicForm.status} onChange={(objEvent) => setFormField("status", objEvent.target.value as UserStatus)} disabled={strMode === "view"}>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
              <Typography>{dicConstant.users.fields.ssoEnabled}</Typography>
              <Switch checked={dicForm.ssoEnabled} onChange={(_, blnChecked) => setFormField("ssoEnabled", blnChecked)} disabled={strMode === "view"} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? t("close", "Close") : dicConstant.common.cancel}</Button>
          {strMode !== "view" ? (
            <Button className={styles.primaryButton} onClick={saveUser} disabled={blnSubmitting}>
              {strMode === "add" ? dicConstant.users.saveUser : dicConstant.users.updateUser}
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
          <Button className={styles.textAction} onClick={closeConfirmDialog}>{dicConstant.common.cancel}</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
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
