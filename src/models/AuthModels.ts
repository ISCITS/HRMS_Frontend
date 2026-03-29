export type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

export type TenantLookupData = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantCode: string;
  strTenantName: string;
  strIsolationMode: string;
  lstAuthModes: string[];
  blnSsoEnabled: boolean;
  blnAllowGenericLogin: boolean;
};

export type TenantAuthDetails = {
  tenant_id: number;
  tenant_uuid: string;
  is_active: boolean;
  auth_mode: "LOCAL" | "SSO";
};

export type LoginRequest = {
  strTenantUUID: string;
  strLoginID: string;
  strPassword: string;
};

export type GenericLoginRequest = {
  strEmailAddress: string;
  strPassword: string;
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
  intLanguageID:number;
};

export type UserSummary = {
  intUserID: number;
  strLoginName: string | null;
  strEmailAddress: string | null;
  lstRoles: string[];
};

export type AuthSuccessData = {
  objToken: TokenPayload;
  objTenant: TenantSummary;
  objUser: UserSummary;
  strHomeRoute: string;
  blnPasswordResetRequired: boolean;
};

export type CurrentUserContext = {
  objTenant: TenantSummary;
  objUser: UserSummary;
  dtLastSeenOn: string | null;
  strAuthSource: string;
  strLoginMethod: string;
};

export type MenuItem = {
  strModuleCode: string;
  strModuleName: string;
  strRoute: string | null;
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
