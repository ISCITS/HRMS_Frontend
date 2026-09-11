"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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
  // Identity prefill sourced from Employee Master.
  strEmail?: string | null;
  strMobile?: string | null;
  intPreferredLanguageID?: number | null;
  // Set when the employee already belongs to another user; such options are excluded.
  intLinkedUserID?: number | null;
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
  essAccessEnabled: boolean;
  hrmsAccessEnabled: boolean;
  essUserGroupID: number | null;
  hrmsUserGroupID: number | null;
  status: UserStatus;
  locked: boolean;
};

type UserTableRow = {
  id: string;
  select: ReactNode;
  rowActions: ReactNode;
  loginName: string;
  loginId: string;
  email: string;
  mobile: string;
  employeeName: string;
  userGroupName: string;
  status: ReactNode;
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
  essAccessEnabled: boolean;
  hrmsAccessEnabled: boolean;
  essUserGroupID: number | "";
  hrmsUserGroupID: number | "";
  status: UserStatus;
};

type SearchForm = {
  code: string;
  name: string;
  employeeName: string;
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
  essAccessEnabled: false,
  hrmsAccessEnabled: false,
  essUserGroupID: "",
  hrmsUserGroupID: "",
  status: "Active"
};
const dicEmptySearch: SearchForm = { code: "", name: "", employeeName: "", status: "All" };
const objSelectAllCheckboxInputProps = { "data-controlid": "user-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>;
const lstDefaultUsers: UserRecord[] = [];
function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Portal classification comes from tbluser_group.group_type (HR | ESS | BOTH), never from matching
// "ESS" in a group's code or name. Server-side validation repeats these checks.
function groupTypeOf(objGroup?: { strGroupType?: string | null } | null) {
  return String(objGroup?.strGroupType ?? "").trim().toUpperCase();
}

function isPortalGroup(objGroup: { strGroupType?: string | null }, strPortal: "ESS" | "HRMS") {
  const strType = groupTypeOf(objGroup);
  return strType === "BOTH" || strType === (strPortal === "ESS" ? "ESS" : "HR");
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
    essAccessEnabled: Boolean(dicRecord.blnIsEssAccessEnabled),
    hrmsAccessEnabled: Boolean(dicRecord.blnIsHrmsAccessEnabled),
    essUserGroupID: dicRecord.intEssUserGroupID ?? null,
    hrmsUserGroupID: dicRecord.intHrmsUserGroupID ?? null,
    userGroupName: dicRecord.strUserGroupName ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive",
    locked: dicRecord.blnIsLocked
  };
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
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof UserForm | "portalAccess", string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
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
    search: t("search"),
    statusActive: t("status_active"),
    statusInactive: t("status_inactive"),
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
    searchEmployeePlaceholder: t("search_employee_placeholder", "Search Linked Employee"),
    searchStatusPlaceholder: t("search_status_placeholder"),
    tableLoginName: t("table_login_name"),
    tableLoginId: t("table_login_id", "Login ID"),
    tableEmail: t("table_email"),
    tableMobile: t("table_mobile"),
    tableLinkedEmployee: t("table_linked_employee", "Linked Employee"),
    tableUserGroup: t("table_user_group", "User Group"),
    tableStatus: t("table_status"),
    tableActions: t("table_actions"),
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
    sectionAccountAssociation: t("section_account_association", "Account Association"),
    optionSelect: t("option_select", "Select"),
    sectionApplicationAccess: t("section_application_access", "Application Access"),
    fieldEssAccess: t("field_ess_access", "ESS Access"),
    fieldEssUserGroup: t("field_ess_user_group", "ESS User Group"),
    fieldHrmsAccess: t("field_hrms_access", "HRMS Access"),
    fieldHrmsUserGroup: t("field_hrms_user_group", "HRMS User Group"),
    fieldEnableOtpOnly: t("field_enable_otp_only", "Enable 2FA with E-mail OTP"),
    fieldLoginAsEmployee: t("field_link_to_employee_profile", "Link to Employee Profile"),
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
    validationEssUserGroupRequired: t("validation_ess_user_group_required", "ESS User Group is required when ESS Access is enabled."),
    validationHrmsUserGroupRequired: t("validation_hrms_user_group_required", "HRMS User Group is required when HRMS Access is enabled."),
    validationEssRequiresEmployee: t("validation_ess_requires_employee", "ESS Access requires a linked employee profile."),
    validationPortalAccessRequired: t("validation_portal_access_required", "Enable ESS Access, HRMS Access, or both for an active user."),
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
      const dicLinkedUserByEmployeeID = new Map<number, number | null>(
        (objOptions.Data.lstEmployees ?? []).map((dicOption) => [dicOption.intID, dicOption.intLinkedUserID ?? null]),
      );
      setLstEmployeeOptions(
        objEmployees.Data
          .filter((dicEmployee) => String(dicEmployee.strEmploymentStatus ?? "").toLowerCase() === "active")
          .map((dicEmployee) => ({
            intID: dicEmployee.intID,
            strLabel: dicEmployee.strFullName,
            strCode: dicEmployee.strEmployeeCode,
            strEmail: dicEmployee.strWorkEmail,
            strMobile: dicEmployee.strMobileNumber,
            intPreferredLanguageID: null,
            intLinkedUserID: dicLinkedUserByEmployeeID.get(dicEmployee.intID) ?? null,
          })),
      );
      setIntTenantLanguageID(intResolvedTenantLanguageID);
      setLstSelectedIds([]);
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
    const blnEmployeeMatch = !dicSearchApplied.employeeName || dicUser.employeeName.toLowerCase().includes(dicSearchApplied.employeeName.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicUser.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnEmployeeMatch && blnStatusMatch;
  }), [dicSearchApplied, lstUsers]);

  const blnAllVisibleSelected = lstFilteredUsers.length > 0 && lstFilteredUsers.every((dicUser) => lstSelectedIds.includes(dicUser.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstFilteredUsers.some((dicUser) => dicUser.id === strId));
  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnShowOtpOnlyOption =
    (objFormOptions.objMfaPolicy?.blnUserMfaToggleVisible ?? false)
    && !(objFormOptions.objMfaPolicy?.blnUserMfaToggleDisabled ?? false);
  const blnDisableOtpOnlyOption = objFormOptions.objMfaPolicy?.blnUserMfaToggleDisabled ?? false;
  // Each portal offers only the groups its group_type allows; the server repeats the check.
  const lstEssGroupOptions = objFormOptions.lstUserGroups.filter((objGroup) => isPortalGroup(objGroup, "ESS"));
  const lstHrmsGroupOptions = objFormOptions.lstUserGroups.filter((objGroup) => isPortalGroup(objGroup, "HRMS"));
  // The Employee link is independent of portal access, so the toggle is only disabled in view mode.
  const blnLoginAsEmployeeDisabled = strMode === "view";
  const blnEmployeeLinked = dicForm.loginAsEmployee && Boolean(dicForm.employeeID);
  // ESS is an employee-only portal: without a linked employee the toggle cannot be turned on.
  const blnEssAccessDisabled = strMode === "view" || !blnEmployeeLinked;
  // Identity fields sourced from Employee Master are shown read-only in User Master.
  const blnEmployeeDerivedReadOnly = strMode === "view" || blnEmployeeLinked;
  const lstTableRows = useMemo<UserTableRow[]>(() => lstFilteredUsers.map((dicUser) => ({
    id: dicUser.id,
    select: (
      <Checkbox
        inputProps={{ "data-controlid": "user-master.list.row.select.checkbox", "data-row-key": String(dicUser.id) } as InputHTMLAttributes<HTMLInputElement>}
        checked={lstSelectedIds.includes(dicUser.id)}
        onChange={() => toggleSelection(dicUser.id)}
      />
    ),
    rowActions: (
      <CommonRowActions
        testIdPrefix="user-master.list.row"
        rowKey={dicUser.id}
        blnCanView
        blnCanEdit={blnCanEdit}
        blnCanDelete={blnCanDelete}
        onView={() => { void openDialog("view", dicUser); }}
        onEdit={() => { void openDialog("edit", dicUser); }}
        onDelete={() => deleteUser(dicUser.id)}
      />
    ),
    loginName: dicUser.loginName,
    loginId: dicUser.loginId || "-",
    email: dicUser.email,
    mobile: dicUser.mobile || "-",
    employeeName: dicUser.employeeName || "-",
    userGroupName: dicUser.userGroupName || "-",
    status: (
      <span className={`${styles.statusPill} ${dicUser.status === "Active" ? styles.statusActive : styles.statusInactive}`}>
        {dicUser.status === "Active" ? dicCommonLabels.statusActive : dicCommonLabels.statusInactive}
      </span>
    ),
  })), [blnCanDelete, blnCanEdit, dicCommonLabels.statusActive, dicCommonLabels.statusInactive, lstFilteredUsers, lstSelectedIds]);
  const lstTableColumns = useMemo<CommonTableColumn<UserTableRow>[]>(() => [
    {
      field: "select",
      headerName: <Checkbox inputProps={objSelectAllCheckboxInputProps} checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} />,
      width: 64,
      sortable: false,
      filterable: false,
      exportable: false,
    },
    { field: "rowActions", headerName: dicModuleLabels.tableActions, width: 140, sortable: false, filterable: false, exportable: false },
    { field: "loginName", headerName: dicModuleLabels.tableLoginName },
    { field: "loginId", headerName: dicModuleLabels.tableLoginId },
    { field: "email", headerName: dicModuleLabels.tableEmail },
    { field: "mobile", headerName: dicModuleLabels.tableMobile },
    { field: "employeeName", headerName: dicModuleLabels.tableLinkedEmployee },
    { field: "userGroupName", headerName: dicModuleLabels.tableUserGroup },
    { field: "status", headerName: dicModuleLabels.tableStatus, sortable: false, filterable: false },
  ], [blnAllVisibleSelected, blnSomeVisibleSelected, dicModuleLabels.tableActions, dicModuleLabels.tableEmail, dicModuleLabels.tableLinkedEmployee, dicModuleLabels.tableLoginId, dicModuleLabels.tableLoginName, dicModuleLabels.tableMobile, dicModuleLabels.tableStatus, dicModuleLabels.tableUserGroup]);

  async function openDialog(strNextMode: UserMode, dicUser?: UserRecord) {
    let objResolvedFormOptions = objFormOptions;
    if (strNextMode === "add") {
      setBlnLoading(true);
      try {
        const objDefaultOptions = await masterApiService.getUserFormOptions();
        objResolvedFormOptions = objDefaultOptions.Data;
        setObjFormOptions(objDefaultOptions.Data);
      } finally {
        setBlnLoading(false);
      }
    } else if (dicUser) {
      setBlnLoading(true);
      try {
        const objScopedOptions = await masterApiService.getUserFormOptions(Number(dicUser.id));
        objResolvedFormOptions = objScopedOptions.Data;
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
      essAccessEnabled: dicUser.essAccessEnabled,
      hrmsAccessEnabled: dicUser.hrmsAccessEnabled,
      essUserGroupID: dicUser.essUserGroupID ?? "",
      hrmsUserGroupID: dicUser.hrmsUserGroupID ?? "",
      status: dicUser.status
    } : {
      ...dicEmptyForm,
      mfaEnabled: objResolvedFormOptions.objMfaPolicy?.blnUserMfaDefaultEnabled ?? false,
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
        // Unlinking removes the employee and, with it, ESS access (ESS requires an employee).
        dicNextForm.employeeID = "";
        dicNextForm.essAccessEnabled = false;
        dicNextForm.essUserGroupID = "";
      }
      if (strField === "employeeID") {
        if (!objValue) {
          dicNextForm.essAccessEnabled = false;
          dicNextForm.essUserGroupID = "";
        } else {
          // Prefill employee-maintained profile details; Login ID remains an independent credential.
          const objEmployee = lstEmployeeOptions.find((objOption) => objOption.intID === Number(objValue));
          if (objEmployee) {
            dicNextForm.loginName = objEmployee.strLabel ?? dicNextForm.loginName;
            if (objEmployee.strEmail) dicNextForm.email = objEmployee.strEmail;
            if (objEmployee.strMobile) dicNextForm.mobile = objEmployee.strMobile;
            if (objEmployee.intPreferredLanguageID) {
              dicNextForm.preferredLanguageID = objEmployee.intPreferredLanguageID;
            }
          }
        }
      }
      if (strField === "essAccessEnabled" && !Boolean(objValue)) {
        dicNextForm.essUserGroupID = "";
      }
      if (strField === "hrmsAccessEnabled" && !Boolean(objValue)) {
        dicNextForm.hrmsUserGroupID = "";
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
        ...(strField === "loginAsEmployee" || strField === "employeeID"
          ? { employeeID: undefined, essAccessEnabled: undefined, essUserGroupID: undefined }
          : {}),
        ...(strField === "essAccessEnabled" ? { essUserGroupID: undefined, portalAccess: undefined } : {}),
        ...(strField === "hrmsAccessEnabled" ? { hrmsUserGroupID: undefined, portalAccess: undefined } : {}),
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
    const dicNextErrors: Partial<Record<keyof UserForm | "portalAccess", string>> = {};
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

    if (dicForm.loginAsEmployee && !dicForm.employeeID) {
      dicNextErrors.employeeID = dicModuleLabels.validationEmployeeRequired;
    }

    // ESS access requires a linked employee; each enabled portal requires its own primary group.
    if (dicForm.essAccessEnabled && !blnEmployeeLinked) {
      dicNextErrors.essAccessEnabled = dicModuleLabels.validationEssRequiresEmployee;
    }
    if (dicForm.essAccessEnabled && !dicForm.essUserGroupID) {
      dicNextErrors.essUserGroupID = dicModuleLabels.validationEssUserGroupRequired;
    }
    if (dicForm.hrmsAccessEnabled && !dicForm.hrmsUserGroupID) {
      dicNextErrors.hrmsUserGroupID = dicModuleLabels.validationHrmsUserGroupRequired;
    }
    // An active interactive user must be able to reach at least one portal.
    if (dicForm.status === "Active" && !dicForm.essAccessEnabled && !dicForm.hrmsAccessEnabled) {
      dicNextErrors.portalAccess = dicModuleLabels.validationPortalAccessRequired;
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
      blnIsEssAccessEnabled: dicForm.essAccessEnabled,
      blnIsHrmsAccessEnabled: dicForm.hrmsAccessEnabled,
      intEssUserGroupID: dicForm.essAccessEnabled ? Number(dicForm.essUserGroupID) : null,
      intHrmsUserGroupID: dicForm.hrmsAccessEnabled ? Number(dicForm.hrmsUserGroupID) : null,
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
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstFilteredUsers.some((dicUser) => dicUser.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFilteredUsers.map((dicUser) => dicUser.id)])]);
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
        <Button data-controlid="user-master.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/dashboard")}>
          {dicModuleLabels.backButton}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? <Alert severity="warning" sx={{ mb: 2 }}>{strRightsError}</Alert> : null}
        {blnReadOnly ? <Alert severity="info" sx={{ mb: 2 }}>You have read-only access to this screen.</Alert> : null}
        <Box className={styles.userSearchRow}>
          <TextField
            inputProps={{ "data-controlid": "user-master.list.search.login-id.input" }}
            value={dicSearchDraft.code}
            placeholder={dicModuleLabels.searchCodePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, code: objEvent.target.value }))}
          />
          <TextField
            inputProps={{ "data-controlid": "user-master.list.search.name.input" }}
            value={dicSearchDraft.name}
            placeholder={dicModuleLabels.searchNamePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, name: objEvent.target.value }))}
          />
          <TextField
            inputProps={{ "data-controlid": "user-master.list.search.employee.input" }}
            value={dicSearchDraft.employeeName}
            placeholder={dicModuleLabels.searchEmployeePlaceholder}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, employeeName: objEvent.target.value }))}
          />
          <TextField
            select
            SelectProps={{ native: false }}
            inputProps={{ "data-controlid": "user-master.list.search.status.select" }}
            label={dicModuleLabels.searchStatusPlaceholder}
            value={dicSearchDraft.status}
            fullWidth
            onChange={(objEvent) => setDicSearchDraft((objPrevious) => ({ ...objPrevious, status: objEvent.target.value as SearchForm["status"] }))}
          >
            <MenuItem data-controlid="user-master.list.search-status.all.option" value="All">All</MenuItem>
            <MenuItem data-controlid="user-master.list.search-status.active.option" value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem data-controlid="user-master.list.search-status.inactive.option" value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button data-controlid="user-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }}>
              {dicCommonLabels.search}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button data-controlid="user-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }}>
              {dicCommonLabels.clear}
            </Button>
          </Box>
        </Box>

        {lstSelectedIds.length > 0 && (blnCanEdit || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIds.length} {dicModuleLabels.bulkRowsSelected}</Typography>
            {blnCanEdit ? <Button data-controlid="user-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")}>{dicModuleLabels.bulkActivate}</Button> : null}
            {blnCanEdit ? <Button data-controlid="user-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")}>{dicModuleLabels.bulkDeactivate}</Button> : null}
            {blnCanDelete ? <Button data-controlid="user-master.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete}>{dicModuleLabels.bulkDelete}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box className={styles.tableWrap}>
          {!blnCanView ? (
            <Box className={styles.emptyState}>
              <Typography>You do not have permission to view this screen.</Typography>
            </Box>
          ) : (
            <CommonTable
              columns={lstTableColumns}
              rows={lstTableRows}
              rowIdField="id"
              emptyMessage={dicModuleLabels.emptyMessage}
              exportFileName="user-master"
              showExportOptions={blnCanExport}
              showPaginationSummary
              testIdPrefix="user-master.list"
              withPaper={false}
              toolbarLeft={
                blnCanAdd ? <Button data-controlid="user-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => { void openDialog("add"); }} disabled={blnRightsLoading || blnLoading || blnSubmitting}>{dicModuleLabels.addButton}</Button> : null
              }
              getRowSx={(dicRow) => lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined}
            />
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
        paperClassName={styles.dialogPaperDapartment}
        paperSx={{
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
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel}>{dicModuleLabels.fieldStatus}</Typography>
            <ActiveStatusSwitch testId="user-master.dialog.status.switch" blnIsActive={dicForm.status === "Active"} disabled={strMode === "view"} onChange={(blnChecked) => setFormField("status", blnChecked ? "Active" : "Inactive")} />
          </Box>
        }
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        nodeContent={<Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicModuleLabels.sectionAccountAssociation}</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 400, color: "#0f172a" }}>{dicModuleLabels.fieldLoginAsEmployee}</Typography>
              <Switch inputProps={{ "data-controlid": "user-master.dialog.login-as-employee.switch" } as InputHTMLAttributes<HTMLInputElement>} checked={dicForm.loginAsEmployee} onChange={(_, blnChecked) => setFormField("loginAsEmployee", blnChecked)} disabled={blnLoginAsEmployeeDisabled} />
            </Box>

            {dicForm.loginAsEmployee ? (
              <Autocomplete
                options={lstEmployeeOptions.filter((objEmployee) =>
                  !objEmployee.intLinkedUserID
                  || String(objEmployee.intLinkedUserID) === strEditingUserId)}
                value={lstEmployeeOptions.find((objEmployee) => objEmployee.intID === Number(dicForm.employeeID)) ?? null}
                getOptionLabel={(objEmployee) => objEmployee.strCode ? `${objEmployee.strCode} - ${objEmployee.strLabel}` : objEmployee.strLabel}
                isOptionEqualToValue={(objOption, objValue) => objOption.intID === objValue.intID}
                onChange={(_, objEmployee) => setFormField("employeeID", objEmployee?.intID ?? "")}
                disabled={strMode === "view"}
                fullWidth
                renderInput={(objParams) => (
                  <TextField
                    {...objParams}
                    label={dicModuleLabels.fieldEmployee}
                    inputProps={{
                      ...objParams.inputProps,
                      "data-controlid": "user-master.dialog.employee.select",
                    }}
                    error={Boolean(dicErrors.employeeID)}
                    helperText={dicErrors.employeeID}
                    required
                  />
                )}
              />
            ) : (
              <Box />
            )}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label={dicModuleLabels.fieldLoginId}
              inputProps={{ "data-controlid": "user-master.dialog.login-id.input" }}
              value={dicForm.loginId}
              onChange={(objEvent) => setFormField("loginId", objEvent.target.value)}
              error={Boolean(dicErrors.loginId)}
              helperText={dicErrors.loginId}
              disabled={strMode === "view"}
              fullWidth
              required
            />
            <TextField label={dicModuleLabels.fieldLoginName} inputProps={{ "data-controlid": "user-master.dialog.login-name.input" }} value={dicForm.loginName} onChange={(objEvent) => setFormField("loginName", objEvent.target.value)} error={Boolean(dicErrors.loginName)} helperText={dicErrors.loginName} disabled={blnEmployeeDerivedReadOnly} fullWidth required />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField label={dicModuleLabels.fieldEmail} inputProps={{ "data-controlid": "user-master.dialog.email.input" }} value={dicForm.email} onChange={(objEvent) => setFormField("email", objEvent.target.value)} error={Boolean(dicErrors.email)} helperText={dicErrors.email} disabled={blnEmployeeDerivedReadOnly} fullWidth required />
            <TextField label={dicModuleLabels.fieldMobile} inputProps={{ "data-controlid": "user-master.dialog.mobile.input" }} value={dicForm.mobile} onChange={(objEvent) => setFormField("mobile", objEvent.target.value)} error={Boolean(dicErrors.mobile)} helperText={dicErrors.mobile} disabled={blnEmployeeDerivedReadOnly} fullWidth required />
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
                inputProps={{ "data-controlid": "user-master.dialog.password.input" }}
                type={blnPasswordVisible ? "text" : "password"}
                value={dicForm.password}
                onChange={(objEvent) => setFormField("password", objEvent.target.value)}
                error={Boolean(dicErrors.password)}
                helperText={dicErrors.password}
                disabled={false}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton data-controlid="user-master.dialog.password-visibility.toggle" onClick={() => setBlnPasswordVisible((blnValue) => !blnValue)} edge="end">
                        {blnPasswordVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label={dicModuleLabels.fieldConfirmPassword}
                inputProps={{ "data-controlid": "user-master.dialog.confirm-password.input" }}
                type={blnConfirmPasswordVisible ? "text" : "password"}
                value={dicForm.confirmPassword}
                onChange={(objEvent) => setFormField("confirmPassword", objEvent.target.value)}
                error={Boolean(dicErrors.confirmPassword)}
                helperText={dicErrors.confirmPassword}
                disabled={false}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton data-controlid="user-master.dialog.confirm-password-visibility.toggle" onClick={() => setBlnConfirmPasswordVisible((blnValue) => !blnValue)} edge="end">
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
              label={dicModuleLabels.fieldPreferredLanguage}
              inputProps={{ "data-controlid": "user-master.dialog.preferred-language.select" }}
              value={String(intTenantLanguageID ?? dicForm.preferredLanguageID)}
              disabled
              fullWidth
              SelectProps={{ SelectDisplayProps: { "data-controlid": "user-master.dialog.preferred-language.select" } as HTMLAttributes<HTMLDivElement> }}
            >
              {objFormOptions.lstLanguages.map((objLanguage) => (
                <MenuItem key={objLanguage.intID} value={String(objLanguage.intID)} data-controlid={`user-master.dialog.preferred-language.${normalizeSelectToken(objLanguage.strCode || objLanguage.strLabel)}.option`}>
                  {objLanguage.strLabel}
                </MenuItem>
              ))}
            </TextField>
            {blnShowOtpOnlyOption ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 400, color: "#0f172a" }}>{dicModuleLabels.fieldEnableOtpOnly}</Typography>
                <Switch inputProps={{ "data-controlid": "user-master.dialog.otp-only.switch" } as InputHTMLAttributes<HTMLInputElement>} checked={dicForm.mfaEnabled} onChange={(_, blnChecked) => setFormField("mfaEnabled", blnChecked)} disabled={strMode === "view" || blnDisableOtpOnlyOption} />
              </Box>
            ) : null}
          </Box>

          {dicForm.ssoEnabled ? (
            <TextField label={dicModuleLabels.fieldSsoLoginMapping} inputProps={{ "data-controlid": "user-master.dialog.sso-login-mapping.input" }} value={dicForm.ssoLoginMapping} onChange={(objEvent) => setFormField("ssoLoginMapping", objEvent.target.value)} disabled={strMode === "view"} fullWidth />
          ) : null}


          {/* Application Access: one identity, an explicit primary group per portal. HRMS is listed
              first; each toggle sits inline beside the group it governs. */}
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicModuleLabels.sectionApplicationAccess}</Typography>
          {dicErrors.portalAccess ? (
            <Typography sx={{ color: "#d32f2f", fontSize: "0.8rem" }} data-controlid="user-master.dialog.portal-access.error">
              {dicErrors.portalAccess}
            </Typography>
          ) : null}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 400, color: "#0f172a" }}>{dicModuleLabels.fieldHrmsAccess}</Typography>
              <Switch
                inputProps={{ "data-controlid": "user-master.dialog.hrms-access.switch" } as InputHTMLAttributes<HTMLInputElement>}
                checked={dicForm.hrmsAccessEnabled}
                onChange={(_, blnChecked) => setFormField("hrmsAccessEnabled", blnChecked)}
                disabled={strMode === "view"}
              />
            </Box>

            <TextField
              select
              label={dicModuleLabels.fieldHrmsUserGroup}
              inputProps={{ "data-controlid": "user-master.dialog.hrms-user-group.select" }}
              value={String(dicForm.hrmsUserGroupID)}
              onChange={(objEvent) => setFormField("hrmsUserGroupID", objEvent.target.value ? Number(objEvent.target.value) : "")}
              error={Boolean(dicErrors.hrmsUserGroupID)}
              helperText={dicErrors.hrmsUserGroupID}
              disabled={strMode === "view" || !dicForm.hrmsAccessEnabled}
              fullWidth
              required={dicForm.hrmsAccessEnabled}
              SelectProps={{ SelectDisplayProps: { "data-controlid": "user-master.dialog.hrms-user-group.select" } as HTMLAttributes<HTMLDivElement> }}
            >
              <MenuItem value="" data-controlid="user-master.dialog.hrms-user-group.select.option">{dicModuleLabels.optionSelect}</MenuItem>
              {lstHrmsGroupOptions.map((objGroup) => (
                <MenuItem key={objGroup.intID} value={String(objGroup.intID)} data-controlid={`user-master.dialog.hrms-user-group.${normalizeSelectToken(objGroup.strCode || objGroup.strLabel)}.option`}>
                  {objGroup.strCode ? `${objGroup.strCode} - ${objGroup.strLabel}` : objGroup.strLabel}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 400, color: "#0f172a" }}>{dicModuleLabels.fieldEssAccess}</Typography>
              <Tooltip title={blnEssAccessDisabled && strMode !== "view" ? dicModuleLabels.validationEssRequiresEmployee : ""} arrow>
                <span>
                  <Switch
                    inputProps={{ "data-controlid": "user-master.dialog.ess-access.switch" } as InputHTMLAttributes<HTMLInputElement>}
                    checked={dicForm.essAccessEnabled}
                    onChange={(_, blnChecked) => setFormField("essAccessEnabled", blnChecked)}
                    disabled={blnEssAccessDisabled}
                  />
                </span>
              </Tooltip>
            </Box>

            <TextField
              select
              label={dicModuleLabels.fieldEssUserGroup}
              inputProps={{ "data-controlid": "user-master.dialog.ess-user-group.select" }}
              value={String(dicForm.essUserGroupID)}
              onChange={(objEvent) => setFormField("essUserGroupID", objEvent.target.value ? Number(objEvent.target.value) : "")}
              error={Boolean(dicErrors.essUserGroupID)}
              helperText={dicErrors.essUserGroupID}
              disabled={strMode === "view" || !dicForm.essAccessEnabled}
              fullWidth
              required={dicForm.essAccessEnabled}
              SelectProps={{ SelectDisplayProps: { "data-controlid": "user-master.dialog.ess-user-group.select" } as HTMLAttributes<HTMLDivElement> }}
            >
              <MenuItem value="" data-controlid="user-master.dialog.ess-user-group.select.option">{dicModuleLabels.optionSelect}</MenuItem>
              {lstEssGroupOptions.map((objGroup) => (
                <MenuItem key={objGroup.intID} value={String(objGroup.intID)} data-controlid={`user-master.dialog.ess-user-group.${normalizeSelectToken(objGroup.strCode || objGroup.strLabel)}.option`}>
                  {objGroup.strCode ? `${objGroup.strCode} - ${objGroup.strLabel}` : objGroup.strLabel}
                </MenuItem>
              ))}
            </TextField>

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

      {/* The page-level loader sits above the modal layer, so it must never be raised while the
          dialog is open - a background list refresh would otherwise cover the dialog and swallow
          every click on it. Submitting still blocks, because that is user-initiated and the dialog
          shows a disabled primary button while it runs. */}
      <BlockingLoader
        blnOpen={blnSubmitting || ((blnLoading || blnRightsLoading) && !blnDialogOpen)}
        strLabel={blnLoading || blnRightsLoading ? dicCommonLabels.loading : dicCommonLabels.processing}
        intZIndex={1400}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} onClose={closeToast} variant="filled" sx={{ width: "100%" }}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
