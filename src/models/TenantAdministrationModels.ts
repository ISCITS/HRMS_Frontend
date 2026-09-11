import type { AuthSuccessData } from "@/models/AuthModels";
import type {
  TenantDatastorePayload,
  TenantEmailIdentityProviderPayload,
  TenantOnboardingLookupOption,
  TenantSsoIdentityProviderPayload,
} from "@/models/TenantOnboardingModels";

export type TenantAdminLoginRequest = {
  strLoginID: string;
  strPassword: string;
};

export type TenantAdminUserSummary = {
  intUserID: number;
  strLoginID: string;
  strEmailAddress: string;
  strFullName: string;
};

export type TenantAdminLoginResponse = {
  objAuth: AuthSuccessData;
  objAdminUser: TenantAdminUserSummary;
};

export type TenantAdminDashboardCounts = {
  intAllTenants: number;
  intActiveTenants: number;
};

export type TenantManagementListItem = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantName: string;
  strTenantCode: string;
  strTenantStatus: string;
  objDefaultLanguage: TenantOnboardingLookupOption | null;
  strAuthMode: string | null;
  strMfaStatus: string | null;
  dtCreatedOn: string | null;
  dtUpdatedOn: string | null;
};

export type TenantInformationSummary = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantCode: string;
  strTenantName: string;
  strContactPersonName: string | null;
  strContactEmailAddress: string | null;
  strContactMobileNumber: string | null;
  strTenantStatus: string;
  strAuthMode: string | null;
  strMfaMode: string | null;
  strIsolationMode: string | null;
  intUserCount: number;
  blnDatastoreActive: boolean;
  strDatabaseName: string | null;
  strDatabaseHost: string | null;
  intDatabasePort: number | null;
  dtCreatedOn: string | null;
  dtUpdatedOn: string | null;
};

export type TenantEditSecretsMeta = {
  blnClientSecretConfigured: boolean;
  blnSmtpPasswordConfigured: boolean;
  blnDbPasswordConfigured: boolean;
};

export type TenantSsoIdentityProviderEditPayload = Omit<TenantSsoIdentityProviderPayload, "strClientSecret"> & {
  strClientSecret: string | null;
};

export type TenantEmailIdentityProviderEditPayload = Omit<TenantEmailIdentityProviderPayload, "strSmtpPassword"> & {
  strSmtpPassword: string | null;
};

export type TenantDatastoreEditPayload = Omit<TenantDatastorePayload, "strDbPassword"> & {
  strDbPassword: string | null;
};

export type TenantEditFormPayload = {
  strTenantName: string;
  strTenantCode: string;
  strContactPersonName: string | null;
  strContactEmailAddress: string | null;
  strContactMobileNumber: string | null;
  intDefaultLanguageID: number;
  intSecondaryLanguageID: number | null;
  intDefaultCountryID: number | null;
  strIsolationMode: string;
  intAuthModeTypeID: number;
  intMfaFlagID: number;
  intMfaTypeID: number | null;
  blnAllowNoTenantUrlLocalLogin: boolean;
  objSsoIdentityProvider: TenantSsoIdentityProviderEditPayload | null;
  objEmailIdentityProvider: TenantEmailIdentityProviderEditPayload | null;
  objDatastore: TenantDatastoreEditPayload;
};

export type TenantEditPayload = {
  intTenantID: number;
  strTenantUUID: string;
  objForm: TenantEditFormPayload;
  objSecrets: TenantEditSecretsMeta;
  objTenantInformation: TenantInformationSummary;
};

export type TenantUpdateRequest = {
  objForm: TenantEditFormPayload;
};

export type TenantUpdateResponse = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantCode: string;
  strTenantName: string;
  dtUpdatedOn: string | null;
};
