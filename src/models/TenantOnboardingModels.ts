export type TenantOnboardingLookupOption = {
  intID: number;
  strLabel: string;
  strCode?: string | null;
};

export type TenantOnboardingStaticOption = {
  strLabel: string;
  strCode: string;
};

export type TenantOnboardingFormOptions = {
  lstLanguages: TenantOnboardingLookupOption[];
  lstCountries: TenantOnboardingLookupOption[];
  lstAuthModeTypes: TenantOnboardingLookupOption[];
  lstMfaFlags: TenantOnboardingLookupOption[];
  lstMfaTypes: TenantOnboardingLookupOption[];
  lstModules: TenantOnboardingLookupOption[];
  lstIsolationModes: TenantOnboardingStaticOption[];
  lstSsoProviderTypes: TenantOnboardingStaticOption[];
  lstDatastoreTypes: TenantOnboardingStaticOption[];
};

export type TenantSsoIdentityProviderPayload = {
  strProviderType: string;
  strProviderName: string;
  strIssuer: string | null;
  strClientID: string | null;
  strClientSecret: string | null;
  strAuthorizationEndpoint: string | null;
  strTokenEndpoint: string | null;
  strJwksUri: string | null;
  strSsoRedirectUrl: string | null;
  strSsoEntryPoint: string | null;
  strSloEndpoint: string | null;
  strUserLookupClaim: string;
  blnIsDefault: boolean;
  blnIsActive: boolean;
};

export type TenantEmailIdentityProviderPayload = {
  strSmtpSenderEmail: string | null;
  strSmtpUsername: string | null;
  strSmtpPassword: string | null;
  strSmtpServer: string | null;
  intSmtpPort: number | null;
  strSmtpBccEmail: string | null;
};

export type TenantDatastorePayload = {
  strStoreType: string;
  strDatabaseName: string;
  strSchemaName: string | null;
  strDbHost: string;
  intDbPort: number;
  strDbUserName: string;
  strDbPassword: string;
  lstModuleIDs: number[];
  blnIsPrimary: boolean;
  blnIsActive: boolean;
};

export type TenantOnboardingRequest = {
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
  objSsoIdentityProvider: TenantSsoIdentityProviderPayload | null;
  objEmailIdentityProvider: TenantEmailIdentityProviderPayload | null;
  objDatastore: TenantDatastorePayload;
};

export type TenantOnboardingResponse = {
  intTenantID: number;
  strTenantUUID: string;
  strTenantCode: string;
  strTenantName: string;
  lstModuleIDs: number[];
  intAuthModeConfigID: number;
  intDatastoreID: number;
  intSsoIdentityProviderID: number | null;
  intEmailIdentityProviderID: number | null;
};

export type TenantCodeAvailabilityResponse = {
  blnAvailable: boolean;
};

