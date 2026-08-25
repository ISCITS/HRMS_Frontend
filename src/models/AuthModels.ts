export type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
  RequestId?: string;
};

export type TenantLookupData = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantCode: string;
  strTenantName: string;
  intLanguageID?: number | null;
  intSecondaryLanguageID?: number | null;
  strIsolationMode: string;
  lstAuthModes: string[];
  blnSsoEnabled: boolean;
  blnAllowGenericLogin: boolean;
};

export type TenantAuthDetails = {
  tenant_id: number;
  tenant_uuid: string;
  language_id?: number | null;
  secondary_language_id?: number | null;
  active_language_id?: number | null;
  language_code?: string | null;
  secondary_language_code?: string | null;
  language_native_name?: string | null;
  secondary_language_native_name?: string | null;
  is_active: boolean;
  auth_mode: string;
  mfa_mode?: string | null;
  login_method?: string | null;
  labels?: Record<string, string>;
};

export type NormalizedTenantAuthMode = "local" | "sso" | "otp" | "otp_mandatory" | "unknown";
export type NormalizedTenantLoginMethod = "email_address" | "login_id";

export type LoginRequest = {
  strTenantUUID: string;
  strLoginID: string;
  strPassword: string;
};

export type GenericLoginRequest = {
  strEmailAddress: string;
  strPassword: string;
};

export type ChangePasswordRequest = {
  strCurrentPassword: string;
  strNewPassword: string;
  strConfirmPassword: string;
};

export type ChangePasswordResponse = {
  blnPasswordChanged: boolean;
  intRevokedSessionCount: number;
};

export type TokenPayload = {
  strAccessToken: string;
  strTokenType: string;
  dtExpiresOn: string;
};

export type TenantSummary = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantCode: string;
  strTenantName: string;
  intLanguageID: number;
  intSecondaryLanguageID?: number | null;
};

export type UserSummary = {
  intUserID: number;
  intEmployeeID?: number | null;
  strLoginName: string | null;
  strEmailAddress: string | null;
  lstRoles: string[];
};

export type EmployeeAvatarSummary = {
  intEmployeeID: number;
  strEmployeeCode?: string | null;
  strFullName?: string | null;
  strProfilePhotoUrl?: string | null;
};

export type PortalCode = "ESS" | "HRMS";

export type AuthSuccessData = {
  objToken: TokenPayload;
  objTenant: TenantSummary;
  objUser: UserSummary;
  strHomeRoute: string;
  blnPasswordResetRequired: boolean;
  // Portal context. A dual-access user arrives with no active context and must pick one
  // ("Continue To"); single-portal users are activated directly by the server.
  strActiveContext?: PortalCode | null;
  lstAvailablePortals?: PortalCode[];
  blnRequiresPortalSelection?: boolean;
};

export type PortalContextData = {
  strActiveContext: PortalCode;
  lstAvailablePortals: PortalCode[];
  objToken: TokenPayload;
  strHomeRoute: string;
};

export type AuthOtpChallengeData = {
  blnRequiresOtp: boolean;
  intUserID: number;
  intTenantID: number;
  strPreAuthToken?: string | null;
  strMfaType?: string | null;
};

export type SsoMfaChallengeData = {
  blnMfaRequired: boolean;
  blnMfaSetupRequired: boolean;
  strPreAuthToken: string;
  strQrCodeBase64?: string | null;
  strOtpauthUri?: string | null;
  strManualSecret?: string | null;
  strMessage: string;
};

export type GoogleMfaChallengeData = SsoMfaChallengeData;

export type SsoMfaLoginSuccessData = {
  blnLoginSuccess: boolean;
  objAuth: AuthSuccessData;
};

export type SsoMfaSetupSuccessData = {
  blnMfaSetupCompleted: boolean;
  blnLoginSuccess: boolean;
  objAuth: AuthSuccessData;
  lstBackupCodes: string[];
};

export type AuthLoginData = AuthSuccessData | AuthOtpChallengeData | GoogleMfaChallengeData;
export type VerifyOtpResponseData = AuthSuccessData | GoogleMfaChallengeData;
export type SsoCallbackData = AuthSuccessData | SsoMfaChallengeData | AuthOtpChallengeData;

export type VerifyOtpRequest = {
  intUserID?: number;
  intTenantID?: number;
  strPreAuthToken?: string;
  strOtp: string;
};

export type ResendOtpRequest = {
  intUserID?: number;
  intTenantID?: number;
  strPreAuthToken?: string;
};

export type SsoMfaVerifyRequest = {
  strPreAuthToken: string;
  strCode: string;
};

export type SsoMfaBackupCodeVerifyRequest = {
  strPreAuthToken: string;
  strBackupCode: string;
};

export type CurrentUserContext = {
  objTenant: TenantSummary;
  objUser: UserSummary;
  objEmployee?: EmployeeAvatarSummary | null;
  dtLastSeenOn: string | null;
  strAuthSource: string;
  strLoginMethod: string;
  strAvatarUrl?: string | null;
  // Active portal for this session, decided and revalidated server-side.
  strActiveContext?: PortalCode | null;
  // Server-derived portal entitlements; switching is offered only when both portals are present.
  lstAvailablePortals?: PortalCode[];
};

export type DashboardType = "PAYROLL" | "ESS" | "MANAGEMENT" | "WELCOME";

export type DashboardWidget = {
  strWidgetCode: string;
  strWidgetName: string;
  strWidgetType: string;
  strDashboardType: DashboardType;
  strIconName?: string | null;
  strRoutePath?: string | null;
  strApiKey?: string | null;
  intDisplayOrder: number;
  blnIsVisible: boolean;
  objPayload?: Record<string, unknown> | unknown[] | null;
};

export type DashboardQuickAction = {
  strActionCode: string;
  strActionName: string;
  strRoutePath?: string | null;
  strIconName?: string | null;
};

export type DashboardResponse = {
  strDashboardType: DashboardType;
  lstWidgets: DashboardWidget[];
  lstQuickActions: DashboardQuickAction[];
  dtGeneratedOn: string;
  payrollReadiness?: Record<string, unknown> | null;
  exceptions?: Record<string, unknown> | unknown[] | null;
  approvalAging?: Record<string, unknown> | unknown[] | null;
  variance?: Record<string, unknown> | null;
  highRiskEmployees?: Record<string, unknown> | unknown[] | null;
  itDeclarationDetails?: Record<string, unknown> | null;
  reimbursementDetails?: Record<string, unknown> | null;
  statutoryDetails?: Record<string, unknown> | null;
  taxDetails?: Record<string, unknown> | null;
  outputReadiness?: Record<string, unknown> | null;
  audit?: Record<string, unknown> | null;
};

export type MenuItem = {
  strModuleCode: string;
  strModuleName: string;
  strRoute: string | null;
  strIconName?: string | null;
  lstPermissionCodes: string[];
  blnIsHome: boolean;
  lstChildren: MenuItem[];
};

export type MenuResponse = {
  lstMenuItems: MenuItem[];
  strHomeRoute: string;
};

export type ActionRightsResponse = {
  dicAllowedActions: Record<string, string[]>;
  dicAccessScopeByAction: Record<string, string>;
};

export type SsoRedirectData = {
  strRedirectUrl: string;
  strState: string;
  strProviderName: string;
};

export type LogoutResponseData = {
  blnLoggedOut: boolean;
  intTenantID?: number | null;
  strTenantUUID?: string | null;
  strTenantCode?: string | null;
  strRedirectUrl?: string | null;
  redirectUrl?: string | null;
};



