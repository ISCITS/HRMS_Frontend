"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
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
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { type UserApiRecord, type UserFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";

type UserStatus = "Active" | "Inactive";
type UserMode = "add" | "edit" | "view";

type EmployeeOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

type UserRecord = {
  id: string;
  loginName: string;
  loginId: string;
  email: string;
  mobile: string;
  password: string;
  authSource: "local" | "sso";
  ssoEnabled: boolean;
  mfaEnabled: boolean;
  ssoLoginMapping: string;
  preferredLanguageID: number | null;
  employeeID: number | null;
  employeeName: string;
  userGroupID: number | null;
  userGroupName: string;
  status: UserStatus;
  locked: boolean;
};

type UserForm = {
  loginName: string;
  loginId: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  ssoEnabled: boolean;
  mfaEnabled: boolean;
  loginAsEmployee: boolean;
  ssoLoginMapping: string;
  preferredLanguageID: number | "";
  employeeID: number | "";
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
  loginId: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
  ssoEnabled: false,
  mfaEnabled: false,
  loginAsEmployee: false,
  ssoLoginMapping: "",
  preferredLanguageID: "",
  employeeID: "",
  userGroupID: "",
  status: "Active"
};
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const objSelectAllCheckboxInputProps = { "data-testid": "user-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>;
const lstDefaultUsers: UserRecord[] = [];
const lstRowsPerPageOptions = [10, 20, 50];

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function getUserLoginId(dicRecord: UserApiRecord) {
  return dicRecord.strLoginID ?? dicRecord.strLoginId ?? dicRecord.login_id ?? "";
}

function getUserPassword(dicRecord: UserApiRecord) {
  return dicRecord.strPassword ?? dicRecord.password ?? "";
}

function mapUserRecord(dicRecord: UserApiRecord): UserRecord {
  const strPassword = getUserPassword(dicRecord);
  return {
    id: String(dicRecord.intID),
    loginName: dicRecord.strLoginName ?? "",
    loginId: getUserLoginId(dicRecord),
    email: dicRecord.strEmailAddress ?? "",
    mobile: dicRecord.strMobileNumber ?? "",
    password: strPassword,
    authSource: dicRecord.strAuthSource ?? "local",
    ssoEnabled: dicRecord.blnIsSsoEnabled,
    mfaEnabled: dicRecord.blnMfaEnabled ?? false,
    ssoLoginMapping: dicRecord.strSsoLoginMapping ?? "",
    preferredLanguageID: dicRecord.intPreferredLanguageID,
    employeeID: dicRecord.intEmployeeID ?? null,
    employeeName: dicRecord.strEmployeeName ?? "",
    userGroupID: dicRecord.intUserGroupID,
    userGroupName: dicRecord.strUserGroupName ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
    locked: dicRecord.blnIsLocked
  };
}

function downloadCsv(strFileName: string, lstRows: UserRecord[]) {
  const lstHeaders = ["Login Name", "Email Address", "Mobile Number", "User Group", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.loginName, dicRow.email, dicRow.mobile, dicRow.userGroupName, dicRow.status]
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
      <td>${dicRow.userGroupName}</td>
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
              <th>User Group</th>
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
  const { t, strLanguageCode } = useModuleLabels("user");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(["USER", "USERS"]);
  const [lstUsers, setLstUsers] = useState<UserRecord[]>(lstDefaultUsers);
  const [objFormOptions, setObjFormOptions] = useState<UserFormOptionsApiRecord>({ lstLanguages: [], lstUserGroups: [] });
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<EmployeeOption[]>([]);
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
  const [intTenantLanguageID, setIntTenantLanguageID] = useState<number | null>(authHelpers.getLanguageID());
  const [blnPasswordVisible, setBlnPasswordVisible] = useState(false);
  const [blnConfirmPasswordVisible, setBlnConfirmPasswordVisible] = useState(false);
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
    addButton:
      strLanguageCode === "hi"
        ? "उपयोगकर्ता जोड़ें"
        : "Add User",
    dialogAddTitle: t("dialog_add_title", "Add User"),
    dialogEditTitle: t("dialog_edit_title", "Edit User"),
    dialogViewTitle: t("dialog_view_title", "View User"),
    searchCodePlaceholder: t("search_code_placeholder"),
    searchNamePlaceholder: t("search_name_placeholder"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableLoginName: t("table_login_name"),
    tableEmail: t("table_email"),
    tableMobile: t("table_mobile"),
    tableUserGroup: t("table_user_group", "User Group"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
    loadingRecords: t("loading_records"),
    emptyMessage: t("empty_message"),
    fieldLoginName: t("field_login_name"),
    fieldLoginId: t("field_login_id", "Login ID"),
    fieldEmail: t("field_email"),
    fieldMobile: t("field_mobile"),
    fieldPassword: t("field_password"),
    fieldConfirmPassword: t("field_confirm_password", "Confirm Password"),
    fieldSsoLoginMapping: t("field_sso_login_mapping"),
    fieldPreferredLanguage: t("field_preferred_language", "Preferred Language"),
    fieldUserGroup: t("field_user_group", "User Group"),
    fieldEnableOtpOnly: t("field_enable_otp_only", "Enable OTP Only"),
    helperEnableOtpOnly: t("helper_enable_otp_only", "Require OTP-based login for this user when tenant OTP mode is enabled."),
    fieldLoginAsEmployee: t("field_login_as_employee", "Login as Employee"),
    helperLoginAsEmployee: t("helper_login_as_employee", "Link this user account to an employee profile."),
    fieldEmployee: t("field_employee", "Employee"),
    fieldStatus: t("field_status"),
    helperPasswordOptional: t("helper_password_optional"),
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
    validationLoginIdRequired: t("validation_login_id_required", "Login ID is required."),
    validationLoginIdAlphaNumeric: t("validation_login_id_alphanumeric", "Login ID must be alphanumeric."),
    validationEmailRequired: t("validation_email_required"),
    validationEmailInvalid: t("validation_email_invalid"),
    validationPasswordRequired: t("validation_password_required"),
    validationPasswordMin: t("validation_password_min"),
    validationConfirmPasswordRequired: t("validation_confirm_password_required", "Confirm password is required."),
    validationConfirmPasswordMismatch: t("validation_confirm_password_mismatch", "Password and confirm password must match."),
    validationMobileRequired: t("validation_mobile_required", "Mobile number is required."),
    validationMobileInvalid: t("validation_mobile_invalid"),
    validationEmployeeRequired: t("validation_employee_required", "Employee is required."),
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
    if (!canViewAny()) {
      setLstUsers(lstDefaultUsers);
      setObjFormOptions({ lstLanguages: [], lstUserGroups: [] });
      setLstEmployeeOptions([]);
      setLstSelectedIds([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const [objUsers, objOptions, objEmployees] = await Promise.all([
        masterApiService.getUsers(),
        masterApiService.getUserFormOptions(),
        masterApiService.getEmployees().catch(() => ({ Data: [] })),
      ]);
      const intResolvedTenantLanguageID = authHelpers.getLanguageID();
      setLstUsers(objUsers.Data.map(mapUserRecord));
      setObjFormOptions(objOptions.Data);
      setLstEmployeeOptions(objEmployees.Data.map((dicEmployee) => ({
        intID: dicEmployee.intID,
        strLabel: dicEmployee.strFullName,
        strCode: dicEmployee.strEmployeeCode,
      })));
      setIntTenantLanguageID(intResolvedTenantLanguageID);
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
    loadData().catch(() => undefined);
  }, [blnRightsLoading]);

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
  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;
  const objTenantLanguageOption = objFormOptions.lstLanguages.find((objLanguage) => objLanguage.intID === intTenantLanguageID) ?? null;
  const blnShowOtpOnlyOption =
    (objFormOptions.objMfaPolicy?.blnUserMfaToggleVisible ?? false)
    && !(objFormOptions.objMfaPolicy?.blnUserMfaToggleDisabled ?? false);
  const blnDisableOtpOnlyOption = objFormOptions.objMfaPolicy?.blnUserMfaToggleDisabled ?? false;

  async function openDialog(strNextMode: UserMode, dicUser?: UserRecord) {
    if (strNextMode === "add") {
      setBlnLoading(true);
      try {
        const objDefaultOptions = await masterApiService.getUserFormOptions();
        setObjFormOptions(objDefaultOptions.Data);
      } finally {
        setBlnLoading(false);
      }
    } else if (dicUser) {
      setBlnLoading(true);
      try {
        const objScopedOptions = await masterApiService.getUserFormOptions(Number(dicUser.id));
        setObjFormOptions(objScopedOptions.Data);
      } finally {
        setBlnLoading(false);
      }
    }
    setStrMode(strNextMode);
    setStrEditingUserId(dicUser?.id ?? "");
    setDicErrors({});
    setBlnPasswordVisible(false);
    setBlnConfirmPasswordVisible(false);
    setDicForm(dicUser ? {
      loginName: dicUser.loginName,
      loginId: dicUser.loginId,
      email: dicUser.email,
      mobile: dicUser.mobile,
      password: "",
      confirmPassword: "",
      ssoEnabled: dicUser.ssoEnabled,
      mfaEnabled: dicUser.mfaEnabled,
      loginAsEmployee: Boolean(dicUser.employeeID),
      ssoLoginMapping: dicUser.ssoLoginMapping,
      preferredLanguageID: intTenantLanguageID ?? dicUser.preferredLanguageID ?? "",
      employeeID: dicUser.employeeID ?? "",
      userGroupID: dicUser.userGroupID ?? "",
      status: dicUser.status
    } : {
      ...dicEmptyForm,
      mfaEnabled: objFormOptions.objMfaPolicy?.blnUserMfaDefaultEnabled ?? false,
      preferredLanguageID: intTenantLanguageID ?? "",
    });
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
    setDicForm((objPrevious) => {
      const dicNextForm = { ...objPrevious, [strField]: objValue } as UserForm;
      if (strField === "loginAsEmployee" && !Boolean(objValue)) {
        dicNextForm.employeeID = "";
      }
      return dicNextForm;
    });
    setDicErrors((objPrevious) => {
      if (!objPrevious[strField]) {
        if (!(strField === "loginAsEmployee" && objPrevious.employeeID)) {
          return objPrevious;
        }
      }
      return {
        ...objPrevious,
        [strField]: undefined,
        ...(strField === "loginAsEmployee" ? { employeeID: undefined } : {}),
      };
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
    const strLoginId = dicForm.loginId.trim();
    const strEmail = dicForm.email.trim();
    const strMobile = dicForm.mobile.trim();
    const strPassword = dicForm.password.trim();
    const strConfirmPassword = dicForm.confirmPassword.trim();

    if (!strLoginName) {
      dicNextErrors.loginName = dicModuleLabels.validationLoginNameRequired;
    } else if (strLoginName.length < 3) {
      dicNextErrors.loginName = dicModuleLabels.validationLoginNameMin;
    }

    if (!strLoginId) {
      dicNextErrors.loginId = dicModuleLabels.validationLoginIdRequired;
    } else if (!/^[A-Za-z0-9]+$/.test(strLoginId)) {
      dicNextErrors.loginId = dicModuleLabels.validationLoginIdAlphaNumeric;
    }

    if (!strEmail) {
      dicNextErrors.email = dicModuleLabels.validationEmailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strEmail)) {
      dicNextErrors.email = dicModuleLabels.validationEmailInvalid;
    }

    if (strMode === "add") {
      if (!strPassword) {
        dicNextErrors.password = dicModuleLabels.validationPasswordRequired;
      } else if (strPassword.length < 8) {
        dicNextErrors.password = dicModuleLabels.validationPasswordMin;
      }

      if (!strConfirmPassword) {
        dicNextErrors.confirmPassword = dicModuleLabels.validationConfirmPasswordRequired;
      } else if (strPassword !== strConfirmPassword) {
        dicNextErrors.confirmPassword = dicModuleLabels.validationConfirmPasswordMismatch;
      }
    }

    if (!strMobile) {
      dicNextErrors.mobile = dicModuleLabels.validationMobileRequired;
    } else if (!/^[0-9+\-\s]+$/.test(strMobile)) {
      dicNextErrors.mobile = dicModuleLabels.validationMobileInvalid;
    }

    if (!dicForm.userGroupID) {
      dicNextErrors.userGroupID = dicModuleLabels.validationUserGroupRequired;
    }

    if (dicForm.loginAsEmployee && !dicForm.employeeID) {
      dicNextErrors.employeeID = dicModuleLabels.validationEmployeeRequired;
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
      strLoginID: dicForm.loginId.trim(),
      strEmailAddress: dicForm.email.trim(),
      strMobileNumber: dicForm.mobile.trim() || null,
      strPassword: dicForm.password.trim() || null,
      strAuthSource: dicForm.ssoEnabled ? "sso" as const : "local" as const,
      blnIsSsoEnabled: dicForm.ssoEnabled,
      blnMfaEnabled: blnShowOtpOnlyOption ? dicForm.mfaEnabled : undefined,
      strSsoLoginMapping: dicForm.ssoEnabled ? dicForm.ssoLoginMapping.trim() || null : null,
      intPreferredLanguageID: (intTenantLanguageID ?? dicForm.preferredLanguageID) || null,
      intEmployeeID: dicForm.loginAsEmployee ? Number(dicForm.employeeID) : null,
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

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button data-testid="user-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/dashboard")}>
          {dicModuleLabels.backButton}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? <Alert severity="warning" sx={{ mb: 2 }}>{strRightsError}</Alert> : null}
        {blnReadOnly ? <Alert severity="info" sx={{ mb: 2 }}>You have read-only access to this screen.</Alert> : null}
        <Box className={styles.searchRow}>
          <TextField
            inputProps={{ "data-testid": "user-master.list.search.login-id.input" }}
            value={dicSearchDraft.code}
            placeholder={dicModuleLabels.searchCodePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, code: objEvent.target.value }))}
          />
          <TextField
            inputProps={{ "data-testid": "user-master.list.search.name.input" }}
            value={dicSearchDraft.name}
            placeholder={dicModuleLabels.searchNamePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, name: objEvent.target.value }))}
          />
          <TextField
            select
            SelectProps={{ native: false }}
            inputProps={{ "data-testid": "user-master.list.search.status.select" }}
            label={dicModuleLabels.searchStatusPlaceholder}
            value={dicSearchDraft.status}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, status: objEvent.target.value as SearchForm["status"] }))}
          >
            <MenuItem data-testid="user-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem data-testid="user-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem data-testid="user-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button data-testid="user-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }}>
              {dicCommonLabels.search}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button data-testid="user-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }}>
              {dicCommonLabels.clear}
            </Button>
          </Box>
        </Box>

        {lstSelectedIds.length > 0 && (blnCanEdit || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
            {blnCanEdit ? <Button data-testid="user-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")}>{dicModuleLabels.bulkActivate}</Button> : null}
            {blnCanEdit ? <Button data-testid="user-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")}>{dicModuleLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button data-testid="user-master.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete}>{dicModuleLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? <Button data-testid="user-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => { void openDialog("add"); }} disabled={blnRightsLoading || blnLoading || blnSubmitting}>{dicModuleLabels.addButton}</Button> : null}
            {blnCanExport ? <Button data-testid="user-master.list.export-excel.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("user-master", lstFilteredUsers)} disabled={blnRightsLoading || blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button> : null}
            {blnCanExport ? <Button data-testid="user-master.list.export-pdf.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.pageTitle, lstFilteredUsers)} disabled={blnRightsLoading || blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button> : null}
          </Box>

          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          <Box className={styles.paginationInfo}>
            <Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography>
            <TextField
              select
              size="small"
              inputProps={{ "data-testid": "user-master.list.rows-per-page.select" }}
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
          ) : !blnCanView ? (
            <Box className={styles.emptyState}>
              <Typography>You do not have permission to view this screen.</Typography>
            </Box>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <Checkbox data-testid="user-master.list.select-all.checkbox" inputProps={objSelectAllCheckboxInputProps} checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} />
                  </th>
                  <th>{dicModuleLabels.tableActions}</th>
                  <th>{dicModuleLabels.tableLoginName}</th>
                  <th>{dicModuleLabels.tableEmail}</th>
                  <th>{dicModuleLabels.tableMobile}</th>
                  <th>{dicModuleLabels.tableUserGroup}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstVisibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>{dicModuleLabels.emptyMessage}</td>
                  </tr>
                ) : lstVisibleUsers.map((dicUser) => (
                  <tr key={dicUser.id} className={lstSelectedIds.includes(dicUser.id) ? styles.selectedRow : undefined}>
                    <td>
                      <Checkbox data-testid="user-master.list.row.select.checkbox" inputProps={{ "data-testid": "user-master.list.row.select.checkbox", "data-row-key": String(dicUser.id) } as InputHTMLAttributes<HTMLInputElement>} checked={lstSelectedIds.includes(dicUser.id)} onChange={() => toggleSelection(dicUser.id)} />
                    </td>
                    <td>
                      <CommonRowActions testIdPrefix="user-master.list.row" rowKey={dicUser.id} blnCanView blnCanEdit={blnCanEdit} blnCanDelete={blnCanDelete} onView={() => { void openDialog("view", dicUser); }} onEdit={() => { void openDialog("edit", dicUser); }} onDelete={() => deleteUser(dicUser.id)} />
                    </td>
                    <td>{dicUser.loginName}</td>
                    <td>{dicUser.email}</td>
                    <td>{dicUser.mobile || "-"}</td>
                    <td>{dicUser.userGroupName || "-"}</td>
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

      <CommonMasterDialog
        rootTestId="user-master.dialog"
        cancelButtonTestId="user-master.dialog.cancel.button"
        primaryButtonTestId="user-master.dialog.primary.button"
        blnOpen={blnDialogOpen}
        onClose={closeDialog}
        onDialogClose={blnSubmitting ? undefined : closeDialog}
        maxWidth="md"
        paperClassName=""
        paperSx={{
          borderRadius: 0,
          overflow: "hidden",
          maxHeight: "86vh",
          background: "linear-gradient(180deg, rgba(250,253,255,1) 0%, rgba(255,255,255,1) 55%, rgba(247,250,252,1) 100%)",
        }}
        strTitle={strMode === "add" ? "Add User" : strMode === "edit" ? "Edit User" : "View User"}
        strSecondaryLabel={strMode === "view" ? dicCommonLabels.close : dicCommonLabels.cancel}
        strPrimaryLabel={strMode === "add" ? dicModuleLabels.saveButton : dicModuleLabels.updateButton}
        onPrimaryAction={saveUser}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        nodeContent={<Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label={dicModuleLabels.fieldLoginId}
              inputProps={{ "data-testid": "user-master.dialog.login-id.input" }}
              value={dicForm.loginId}
              onChange={(objEvent) => setFormField("loginId", objEvent.target.value)}
              error={Boolean(dicErrors.loginId)}
              helperText={dicErrors.loginId}
              disabled={strMode === "view"}
              fullWidth
              required
            />
            <TextField label={dicModuleLabels.fieldLoginName} inputProps={{ "data-testid": "user-master.dialog.login-name.input" }} value={dicForm.loginName} onChange={(objEvent) => setFormField("loginName", objEvent.target.value)} error={Boolean(dicErrors.loginName)} helperText={dicErrors.loginName} disabled={strMode === "view"} fullWidth required />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField label={dicModuleLabels.fieldEmail} inputProps={{ "data-testid": "user-master.dialog.email.input" }} value={dicForm.email} onChange={(objEvent) => setFormField("email", objEvent.target.value)} error={Boolean(dicErrors.email)} helperText={dicErrors.email} disabled={strMode === "view"} fullWidth required />
            <TextField label={dicModuleLabels.fieldMobile} inputProps={{ "data-testid": "user-master.dialog.mobile.input" }} value={dicForm.mobile} onChange={(objEvent) => setFormField("mobile", objEvent.target.value)} error={Boolean(dicErrors.mobile)} helperText={dicErrors.mobile} disabled={strMode === "view"} fullWidth required />
          </Box>

          {strMode === "add" ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label={dicModuleLabels.fieldPassword}
                inputProps={{ "data-testid": "user-master.dialog.password.input" }}
                type={blnPasswordVisible ? "text" : "password"}
                value={dicForm.password}
                onChange={(objEvent) => setFormField("password", objEvent.target.value)}
                error={Boolean(dicErrors.password)}
                helperText={dicErrors.password}
                disabled={strMode === "view"}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton data-testid="user-master.dialog.password-visibility.toggle" onClick={() => setBlnPasswordVisible((blnValue) => !blnValue)} edge="end" disabled={strMode === "view"}>
                        {blnPasswordVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label={dicModuleLabels.fieldConfirmPassword}
                inputProps={{ "data-testid": "user-master.dialog.confirm-password.input" }}
                type={blnConfirmPasswordVisible ? "text" : "password"}
                value={dicForm.confirmPassword}
                onChange={(objEvent) => setFormField("confirmPassword", objEvent.target.value)}
                error={Boolean(dicErrors.confirmPassword)}
                helperText={dicErrors.confirmPassword}
                disabled={strMode === "view"}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton data-testid="user-master.dialog.confirm-password-visibility.toggle" onClick={() => setBlnConfirmPasswordVisible((blnValue) => !blnValue)} edge="end" disabled={strMode === "view"}>
                        {blnConfirmPasswordVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              select
              label={dicModuleLabels.fieldUserGroup}
              inputProps={{ "data-testid": "user-master.dialog.user-group.select" }}
              value={String(dicForm.userGroupID)}
              onChange={(objEvent) => setFormField("userGroupID", objEvent.target.value ? Number(objEvent.target.value) : "")}
              error={Boolean(dicErrors.userGroupID)}
              helperText={dicErrors.userGroupID}
              disabled={strMode === "view"}
              fullWidth
              required
              SelectProps={{ SelectDisplayProps: { "data-testid": "user-master.dialog.user-group.select" } }}
            >
              <MenuItem value="" data-testid="user-master.dialog.user-group.select.option">Select</MenuItem>
              {objFormOptions.lstUserGroups.map((objGroup) => (
                <MenuItem key={objGroup.intID} value={String(objGroup.intID)} data-testid={`user-master.dialog.user-group.${normalizeSelectToken(objGroup.strCode || objGroup.strLabel)}.option`}>
                  {objGroup.strCode ? `${objGroup.strCode} - ${objGroup.strLabel}` : objGroup.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={dicModuleLabels.fieldPreferredLanguage}
              inputProps={{ "data-testid": "user-master.dialog.preferred-language.select" }}
              value={String(intTenantLanguageID ?? dicForm.preferredLanguageID)}
              disabled
              fullWidth
              helperText={objTenantLanguageOption ? objTenantLanguageOption.strLabel : ""}
              SelectProps={{ SelectDisplayProps: { "data-testid": "user-master.dialog.preferred-language.select" } }}
            >
              {objFormOptions.lstLanguages.map((objLanguage) => (
                <MenuItem key={objLanguage.intID} value={String(objLanguage.intID)} data-testid={`user-master.dialog.preferred-language.${normalizeSelectToken(objLanguage.strCode || objLanguage.strLabel)}.option`}>
                  {objLanguage.strLabel}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {dicForm.ssoEnabled ? (
            <TextField label={dicModuleLabels.fieldSsoLoginMapping} inputProps={{ "data-testid": "user-master.dialog.sso-login-mapping.input" }} value={dicForm.ssoLoginMapping} onChange={(objEvent) => setFormField("ssoLoginMapping", objEvent.target.value)} disabled={strMode === "view"} fullWidth />
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
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
                <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{dicModuleLabels.fieldLoginAsEmployee}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {dicModuleLabels.helperLoginAsEmployee}
                </Typography>
              </Box>
                <Switch inputProps={{ "data-testid": "user-master.dialog.login-as-employee.switch" } as InputHTMLAttributes<HTMLInputElement>} checked={dicForm.loginAsEmployee} onChange={(_, blnChecked) => setFormField("loginAsEmployee", blnChecked)} disabled={strMode === "view"} />
            </Box>

            {dicForm.loginAsEmployee ? (
              <TextField
                select
                label={dicModuleLabels.fieldEmployee}
                inputProps={{ "data-testid": "user-master.dialog.employee.select" }}
                value={String(dicForm.employeeID)}
                onChange={(objEvent) => setFormField("employeeID", objEvent.target.value ? Number(objEvent.target.value) : "")}
                error={Boolean(dicErrors.employeeID)}
                helperText={dicErrors.employeeID}
                disabled={strMode === "view"}
                fullWidth
                required
                SelectProps={{ SelectDisplayProps: { "data-testid": "user-master.dialog.employee.select" } }}
              >
                <MenuItem value="" data-testid="user-master.dialog.employee.select.option">Select</MenuItem>
                {lstEmployeeOptions.map((objEmployee) => (
                  <MenuItem key={objEmployee.intID} value={String(objEmployee.intID)} data-testid={`user-master.dialog.employee.${normalizeSelectToken(objEmployee.strCode || objEmployee.strLabel)}.option`}>
                    {objEmployee.strCode ? `${objEmployee.strCode} - ${objEmployee.strLabel}` : objEmployee.strLabel}
                  </MenuItem>
                ))}
              </TextField>
            ) : blnShowOtpOnlyOption ? (
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
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{dicModuleLabels.fieldEnableOtpOnly}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                    {dicModuleLabels.helperEnableOtpOnly}
                  </Typography>
                </Box>
                <Switch inputProps={{ "data-testid": "user-master.dialog.otp-only.switch" } as InputHTMLAttributes<HTMLInputElement>} checked={dicForm.mfaEnabled} onChange={(_, blnChecked) => setFormField("mfaEnabled", blnChecked)} disabled={strMode === "view" || blnDisableOtpOnlyOption} />
              </Box>
            ) : (
              <Box />
            )}
          </Box>

          {dicForm.loginAsEmployee && blnShowOtpOnlyOption ? (
            <Box sx={{ width: { xs: "100%", md: "calc(50% - 8px)" } }}>
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
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{dicModuleLabels.fieldEnableOtpOnly}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                    {dicModuleLabels.helperEnableOtpOnly}
                  </Typography>
                </Box>
                <Switch inputProps={{ "data-testid": "user-master.dialog.otp-only.switch" } as InputHTMLAttributes<HTMLInputElement>} checked={dicForm.mfaEnabled} onChange={(_, blnChecked) => setFormField("mfaEnabled", blnChecked)} disabled={strMode === "view" || blnDisableOtpOnlyOption} />
              </Box>
            </Box>
          ) : null}

          <Box className={styles.switchRow}>
            <Typography className={styles.switchLabel}>{dicModuleLabels.fieldStatus}</Typography>
            <ActiveStatusSwitch testId="user-master.dialog.status.switch" blnIsActive={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(blnChecked) => setFormField("status", blnChecked ? "Active" : "Inactive")} />
          </Box>
        </Box>}
      />

      <CommonConfirmDialog
        rootTestId="user-master.confirm.dialog"
        cancelButtonTestId="user-master.confirm.cancel.button"
        confirmButtonTestId="user-master.confirm.confirm.button"
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={dicCommonLabels.cancel}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? dicCommonLabels.confirm}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnLoading || blnSubmitting || blnRightsLoading} strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
