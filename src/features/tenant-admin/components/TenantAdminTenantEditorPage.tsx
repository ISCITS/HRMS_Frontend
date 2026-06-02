"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import type { TenantOnboardingFormOptions } from "@/models/TenantOnboardingModels";
import type {
  TenantEditPayload,
  TenantEditSecretsMeta,
  TenantInformationSummary,
} from "@/models/TenantAdministrationModels";
import { tenantAdministrationService, tenantOnboardingService } from "@/services";

type WizardStep = 0 | 1 | 2 | 3;

type TenantEditorProps = {
  intTenantID: number;
};

type TenantEditorFormState = {
  basic: {
    strTenantName: string;
    strTenantCode: string;
    strContactPersonName: string;
    strContactEmailAddress: string;
    strContactMobileNumber: string;
    intDefaultLanguageID: number | "";
    intSecondaryLanguageID: number | "";
    intDefaultCountryID: number | "";
    strIsolationMode: string;
  };
  auth: {
    intAuthModeTypeID: number | "";
    intMfaFlagID: number | "";
    intMfaTypeID: number | "";
    blnAllowNoTenantUrlLocalLogin: boolean;
    sso: {
      strProviderType: string;
      strProviderName: string;
      strIssuer: string;
      strClientID: string;
      strClientSecret: string;
      strAuthorizationEndpoint: string;
      strTokenEndpoint: string;
      strJwksUri: string;
      strSsoRedirectUrl: string;
      strSsoEntryPoint: string;
      strSloEndpoint: string;
      strUserLookupClaim: string;
      blnIsDefault: boolean;
      blnIsActive: boolean;
    };
    email: {
      strSmtpSenderEmail: string;
      strSmtpUsername: string;
      strSmtpPassword: string;
      strSmtpServer: string;
      intSmtpPort: string;
      strSmtpBccEmail: string;
    };
  };
  datastore: {
    strStoreType: string;
    strDatabaseName: string;
    strSchemaName: string;
    strDbHost: string;
    intDbPort: string;
    strDbUserName: string;
    strDbPassword: string;
    lstModuleIDs: number[];
    blnIsPrimary: boolean;
    blnIsActive: boolean;
  };
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptySecrets: TenantEditSecretsMeta = {
  blnClientSecretConfigured: false,
  blnSmtpPasswordConfigured: false,
  blnDbPasswordConfigured: false,
};

const dicEmptyForm: TenantEditorFormState = {
  basic: {
    strTenantName: "",
    strTenantCode: "",
    strContactPersonName: "",
    strContactEmailAddress: "",
    strContactMobileNumber: "",
    intDefaultLanguageID: "",
    intSecondaryLanguageID: "",
    intDefaultCountryID: "",
    strIsolationMode: "shared_db",
  },
  auth: {
    intAuthModeTypeID: "",
    intMfaFlagID: "",
    intMfaTypeID: "",
    blnAllowNoTenantUrlLocalLogin: false,
    sso: {
      strProviderType: "oidc",
      strProviderName: "",
      strIssuer: "",
      strClientID: "",
      strClientSecret: "",
      strAuthorizationEndpoint: "",
      strTokenEndpoint: "",
      strJwksUri: "",
      strSsoRedirectUrl: "",
      strSsoEntryPoint: "",
      strSloEndpoint: "",
      strUserLookupClaim: "email",
      blnIsDefault: true,
      blnIsActive: true,
    },
    email: {
      strSmtpSenderEmail: "",
      strSmtpUsername: "",
      strSmtpPassword: "",
      strSmtpServer: "",
      intSmtpPort: "587",
      strSmtpBccEmail: "",
    },
  },
  datastore: {
    strStoreType: "hrms",
    strDatabaseName: "",
    strSchemaName: "public",
    strDbHost: "",
    intDbPort: "5432",
    strDbUserName: "",
    strDbPassword: "",
    lstModuleIDs: [],
    blnIsPrimary: true,
    blnIsActive: true,
  },
};

const lstStepLabels = ["Tenant Information", "Tenant Basic Details", "Authentication & MFA", "Datastore Configuration"];

export default function TenantAdminTenantEditorPage({ intTenantID }: TenantEditorProps) {
  const [objForm, setObjForm] = useState<TenantEditorFormState>(dicEmptyForm);
  const [objFormOptions, setObjFormOptions] = useState<TenantOnboardingFormOptions | null>(null);
  const [objSecrets, setObjSecrets] = useState<TenantEditSecretsMeta>(dicEmptySecrets);
  const [objTenantInformation, setObjTenantInformation] = useState<TenantInformationSummary | null>(null);
  const [dicErrors, setDicErrors] = useState<Record<string, string>>({});
  const [strError, setStrError] = useState("");
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [intActiveStep, setIntActiveStep] = useState<WizardStep>(0);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);

  useEffect(() => {
    let blnActive = true;
    Promise.all([
      tenantOnboardingService.getFormOptions(),
      tenantAdministrationService.getTenantDetail(intTenantID),
    ])
      .then(([objOptionsResult, objDetailResult]) => {
        if (!blnActive) {
          return;
        }
        setObjFormOptions(objOptionsResult.Data);
        hydrateForm(objDetailResult.Data);
      })
      .catch((objError) => {
        if (blnActive) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load tenant detail.");
        }
      })
      .finally(() => {
        if (blnActive) {
          setBlnLoading(false);
        }
      });

    return () => {
      blnActive = false;
    };
  }, [intTenantID]);

  async function refreshTenantDetail() {
    const objDetailResult = await tenantAdministrationService.getTenantDetail(intTenantID);
    hydrateForm(objDetailResult.Data);
  }

  const strAuthModeCode = useMemo(() => getLookupCode(objFormOptions?.lstAuthModeTypes, objForm.auth.intAuthModeTypeID), [objForm.auth.intAuthModeTypeID, objFormOptions?.lstAuthModeTypes]);
  const strMfaFlagCode = useMemo(() => getLookupCode(objFormOptions?.lstMfaFlags, objForm.auth.intMfaFlagID), [objForm.auth.intMfaFlagID, objFormOptions?.lstMfaFlags]);
  const strMfaTypeCode = useMemo(() => getLookupCode(objFormOptions?.lstMfaTypes, objForm.auth.intMfaTypeID), [objForm.auth.intMfaTypeID, objFormOptions?.lstMfaTypes]);
  const blnShowMfaType = Boolean(strMfaFlagCode && strMfaFlagCode !== "disable");
  const blnShowSsoSection = strAuthModeCode === "sso";
  const blnShowEmailProviderSection = blnShowMfaType && strMfaTypeCode === "email_otp";

  function hydrateForm(objPayload: TenantEditPayload) {
    setObjForm({
      basic: {
        strTenantName: objPayload.objForm.strTenantName,
        strTenantCode: objPayload.objForm.strTenantCode,
        strContactPersonName: objPayload.objForm.strContactPersonName ?? "",
        strContactEmailAddress: objPayload.objForm.strContactEmailAddress ?? "",
        strContactMobileNumber: objPayload.objForm.strContactMobileNumber ?? "",
        intDefaultLanguageID: objPayload.objForm.intDefaultLanguageID,
        intSecondaryLanguageID: objPayload.objForm.intSecondaryLanguageID ?? "",
        intDefaultCountryID: objPayload.objForm.intDefaultCountryID ?? "",
        strIsolationMode: objPayload.objForm.strIsolationMode,
      },
      auth: {
        intAuthModeTypeID: objPayload.objForm.intAuthModeTypeID,
        intMfaFlagID: objPayload.objForm.intMfaFlagID,
        intMfaTypeID: objPayload.objForm.intMfaTypeID ?? "",
        blnAllowNoTenantUrlLocalLogin: objPayload.objForm.blnAllowNoTenantUrlLocalLogin,
        sso: {
          strProviderType: objPayload.objForm.objSsoIdentityProvider?.strProviderType ?? dicEmptyForm.auth.sso.strProviderType,
          strProviderName: objPayload.objForm.objSsoIdentityProvider?.strProviderName ?? "",
          strIssuer: objPayload.objForm.objSsoIdentityProvider?.strIssuer ?? "",
          strClientID: objPayload.objForm.objSsoIdentityProvider?.strClientID ?? "",
          strClientSecret: "",
          strAuthorizationEndpoint: objPayload.objForm.objSsoIdentityProvider?.strAuthorizationEndpoint ?? "",
          strTokenEndpoint: objPayload.objForm.objSsoIdentityProvider?.strTokenEndpoint ?? "",
          strJwksUri: objPayload.objForm.objSsoIdentityProvider?.strJwksUri ?? "",
          strSsoRedirectUrl: objPayload.objForm.objSsoIdentityProvider?.strSsoRedirectUrl ?? "",
          strSsoEntryPoint: objPayload.objForm.objSsoIdentityProvider?.strSsoEntryPoint ?? "",
          strSloEndpoint: objPayload.objForm.objSsoIdentityProvider?.strSloEndpoint ?? "",
          strUserLookupClaim: objPayload.objForm.objSsoIdentityProvider?.strUserLookupClaim ?? dicEmptyForm.auth.sso.strUserLookupClaim,
          blnIsDefault: objPayload.objForm.objSsoIdentityProvider?.blnIsDefault ?? true,
          blnIsActive: objPayload.objForm.objSsoIdentityProvider?.blnIsActive ?? true,
        },
        email: {
          strSmtpSenderEmail: objPayload.objForm.objEmailIdentityProvider?.strSmtpSenderEmail ?? "",
          strSmtpUsername: objPayload.objForm.objEmailIdentityProvider?.strSmtpUsername ?? "",
          strSmtpPassword: "",
          strSmtpServer: objPayload.objForm.objEmailIdentityProvider?.strSmtpServer ?? "",
          intSmtpPort: objPayload.objForm.objEmailIdentityProvider?.intSmtpPort ? String(objPayload.objForm.objEmailIdentityProvider.intSmtpPort) : dicEmptyForm.auth.email.intSmtpPort,
          strSmtpBccEmail: objPayload.objForm.objEmailIdentityProvider?.strSmtpBccEmail ?? "",
        },
      },
      datastore: {
        strStoreType: objPayload.objForm.objDatastore.strStoreType,
        strDatabaseName: objPayload.objForm.objDatastore.strDatabaseName,
        strSchemaName: objPayload.objForm.objDatastore.strSchemaName ?? "public",
        strDbHost: objPayload.objForm.objDatastore.strDbHost,
        intDbPort: String(objPayload.objForm.objDatastore.intDbPort),
        strDbUserName: objPayload.objForm.objDatastore.strDbUserName,
        strDbPassword: "",
        lstModuleIDs: objPayload.objForm.objDatastore.lstModuleIDs ?? [],
        blnIsPrimary: objPayload.objForm.objDatastore.blnIsPrimary,
        blnIsActive: objPayload.objForm.objDatastore.blnIsActive,
      },
    });
    setObjSecrets(objPayload.objSecrets);
    setObjTenantInformation(objPayload.objTenantInformation);
  }

  function setField(strPath: string, objValue: unknown) {
    setDicErrors((dicPrevious) => {
      const dicNext = { ...dicPrevious };
      delete dicNext[strPath];
      return dicNext;
    });
    setObjForm((dicPrevious) => {
      const dicNext = structuredClone(dicPrevious) as TenantEditorFormState;
      const lstSegments = strPath.split(".");
      let objTarget: Record<string, unknown> = dicNext as unknown as Record<string, unknown>;
      for (let intIndex = 0; intIndex < lstSegments.length - 1; intIndex += 1) {
        objTarget = objTarget[lstSegments[intIndex]] as Record<string, unknown>;
      }
      objTarget[lstSegments[lstSegments.length - 1]] = objValue;
      return dicNext;
    });
  }
  async function handleNext() {
    if (intActiveStep === 3) {
      return;
    }
    if (intActiveStep === 0) {
      setIntActiveStep(1);
      return;
    }
    const dicStepErrors = validateStep(intActiveStep as 1 | 2 | 3, objForm, {
      blnShowMfaType,
      blnShowSsoSection,
      blnShowEmailProviderSection,
      objSecrets,
    });
    if (Object.keys(dicStepErrors).length > 0) {
      setDicErrors((dicPrevious) => ({ ...dicPrevious, ...dicStepErrors }));
      return;
    }
    setIntActiveStep((intPrevious) => Math.min(intPrevious + 1, 3) as WizardStep);
  }

  function handleBack() {
    setIntActiveStep((intPrevious) => Math.max(intPrevious - 1, 0) as WizardStep);
  }

  async function handleSubmit() {
    const dicAllErrors = {
      ...validateStep(1, objForm, { blnShowMfaType, blnShowSsoSection, blnShowEmailProviderSection, objSecrets }),
      ...validateStep(2, objForm, { blnShowMfaType, blnShowSsoSection, blnShowEmailProviderSection, objSecrets }),
      ...validateStep(3, objForm, { blnShowMfaType, blnShowSsoSection, blnShowEmailProviderSection, objSecrets }),
    };
    if (Object.keys(dicAllErrors).length > 0) {
      setDicErrors((dicPrevious) => ({ ...dicPrevious, ...dicAllErrors }));
      return;
    }

    setBlnSubmitting(true);
    try {
      const objResult = await tenantAdministrationService.updateTenant(intTenantID, {
        objForm: buildUpdatePayload(objForm, { blnShowMfaType, blnShowSsoSection, blnShowEmailProviderSection }),
      });
      await refreshTenantDetail();
      setIntActiveStep(0);
      setDicErrors({});
      setStrError("");
      setObjToast({
        blnOpen: true,
        strMessage: `Tenant ${objResult.Data.strTenantCode} updated successfully.`,
        strSeverity: "success",
      });
    } catch (objError) {
      setObjToast({
        blnOpen: true,
        strMessage: objError instanceof Error ? objError.message : "Unable to update tenant.",
        strSeverity: "error",
      });
    } finally {
      setBlnSubmitting(false);
    }
  }

  if (blnLoading) {
    return (
      <Paper sx={{ p: 4, display: "grid", placeItems: "center", minHeight: 320 }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography>Loading tenant editor...</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>Tenant Edit</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Panel 1 is a read-only tenant summary with live database insight. The remaining three panels stay editable and aligned with the onboarding flow.
        </Typography>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid", borderColor: "divider", boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)" }}>
        <Stepper activeStep={intActiveStep} alternativeLabel sx={{ mb: 3 }}>
          {lstStepLabels.map((strLabel) => (
            <Step key={strLabel}>
              <StepLabel>{strLabel}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {intActiveStep === 0 ? renderInformationPanel() : null}
        {intActiveStep === 1 ? renderBasicDetails() : null}
        {intActiveStep === 2 ? renderAuthConfiguration() : null}
        {intActiveStep === 3 ? renderDatastoreConfiguration() : null}

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 4 }}>
          <Button data-testid="tenant-admin.editor.previous.button" variant="outlined" onClick={handleBack} disabled={intActiveStep === 0 || blnSubmitting}>Previous</Button>
          {intActiveStep < 3 ? (
            <Button data-testid="tenant-admin.editor.next.button" variant="contained" onClick={handleNext} disabled={blnSubmitting}>Next</Button>
          ) : (
            <Button data-testid="tenant-admin.editor.save.button" variant="contained" onClick={handleSubmit} disabled={blnSubmitting} startIcon={blnSubmitting ? <CircularProgress color="inherit" size={16} /> : undefined}>Save Changes</Button>
          )}
        </Box>
      </Paper>

      <Snackbar open={objToast.blnOpen} autoHideDuration={4000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}>
        <Alert severity={objToast.strSeverity} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );

  function renderBasicDetails() {
    return (
      <Stack spacing={2.25}>
        <Typography variant="h6">Tenant Basic Details</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField label="Tenant Name *" inputProps={{ "data-testid": "tenant-admin.editor.tenant-name.input" }} value={objForm.basic.strTenantName} onChange={(e) => setField("basic.strTenantName", e.target.value)} error={Boolean(dicErrors["basic.strTenantName"])} helperText={dicErrors["basic.strTenantName"]} fullWidth />
          <TextField label="Tenant Code *" inputProps={{ "data-testid": "tenant-admin.editor.tenant-code.input" }} value={objForm.basic.strTenantCode} onChange={(e) => setField("basic.strTenantCode", e.target.value.toUpperCase())} error={Boolean(dicErrors["basic.strTenantCode"])} helperText={dicErrors["basic.strTenantCode"] ?? "Use uppercase letters, numbers, hyphen, or underscore."} fullWidth />
          <TextField label="Contact Person Name" inputProps={{ "data-testid": "tenant-admin.editor.contact-person.input" }} value={objForm.basic.strContactPersonName} onChange={(e) => setField("basic.strContactPersonName", e.target.value)} error={Boolean(dicErrors["basic.strContactPersonName"])} helperText={dicErrors["basic.strContactPersonName"]} fullWidth />
          <TextField label="Contact Email Address" inputProps={{ "data-testid": "tenant-admin.editor.contact-email.input" }} value={objForm.basic.strContactEmailAddress} onChange={(e) => setField("basic.strContactEmailAddress", e.target.value)} error={Boolean(dicErrors["basic.strContactEmailAddress"])} helperText={dicErrors["basic.strContactEmailAddress"]} fullWidth />
          <TextField label="Contact Mobile Number" inputProps={{ "data-testid": "tenant-admin.editor.contact-mobile.input" }} value={objForm.basic.strContactMobileNumber} onChange={(e) => setField("basic.strContactMobileNumber", e.target.value)} error={Boolean(dicErrors["basic.strContactMobileNumber"])} helperText={dicErrors["basic.strContactMobileNumber"]} fullWidth />
          <TextField select label="Default Language *" inputProps={{ "data-testid": "tenant-admin.editor.default-language.select" }} value={objForm.basic.intDefaultLanguageID === "" ? "" : String(objForm.basic.intDefaultLanguageID)} onChange={(e) => setField("basic.intDefaultLanguageID", e.target.value ? Number(e.target.value) : "")} error={Boolean(dicErrors["basic.intDefaultLanguageID"])} helperText={dicErrors["basic.intDefaultLanguageID"]} fullWidth>
            <MenuItem value="">Select language</MenuItem>
            {(objFormOptions?.lstLanguages ?? []).map((dicOption) => <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>{dicOption.strLabel}</MenuItem>)}
          </TextField>
          <TextField select label="Secondary Language" inputProps={{ "data-testid": "tenant-admin.editor.secondary-language.select" }} value={objForm.basic.intSecondaryLanguageID === "" ? "" : String(objForm.basic.intSecondaryLanguageID)} onChange={(e) => setField("basic.intSecondaryLanguageID", e.target.value ? Number(e.target.value) : "")} fullWidth>
            <MenuItem value="">None</MenuItem>
            {(objFormOptions?.lstLanguages ?? []).map((dicOption) => <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>{dicOption.strLabel}</MenuItem>)}
          </TextField>
          <TextField select label="Default Country" inputProps={{ "data-testid": "tenant-admin.editor.default-country.select" }} value={objForm.basic.intDefaultCountryID === "" ? "" : String(objForm.basic.intDefaultCountryID)} onChange={(e) => setField("basic.intDefaultCountryID", e.target.value ? Number(e.target.value) : "")} fullWidth>
            <MenuItem value="">None</MenuItem>
            {(objFormOptions?.lstCountries ?? []).map((dicOption) => <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>{dicOption.strLabel}</MenuItem>)}
          </TextField>
        </Box>
      </Stack>
    );
  }

  function renderAuthConfiguration() {
    return (
      <Stack spacing={2.5}>
        <Typography variant="h6">Authentication & MFA</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField select label="Authentication Mode *" inputProps={{ "data-testid": "tenant-admin.editor.auth-mode.select" }} value={objForm.auth.intAuthModeTypeID === "" ? "" : String(objForm.auth.intAuthModeTypeID)} onChange={(e) => setField("auth.intAuthModeTypeID", e.target.value ? Number(e.target.value) : "")} error={Boolean(dicErrors["auth.intAuthModeTypeID"])} helperText={dicErrors["auth.intAuthModeTypeID"]} fullWidth>
            <MenuItem value="">Select authentication mode</MenuItem>
            {(objFormOptions?.lstAuthModeTypes ?? []).map((dicOption) => <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>{dicOption.strLabel}</MenuItem>)}
          </TextField>
          <TextField select label="MFA Flag *" inputProps={{ "data-testid": "tenant-admin.editor.mfa-flag.select" }} value={objForm.auth.intMfaFlagID === "" ? "" : String(objForm.auth.intMfaFlagID)} onChange={(e) => setField("auth.intMfaFlagID", e.target.value ? Number(e.target.value) : "")} error={Boolean(dicErrors["auth.intMfaFlagID"])} helperText={dicErrors["auth.intMfaFlagID"]} fullWidth>
            <MenuItem value="">Select MFA flag</MenuItem>
            {(objFormOptions?.lstMfaFlags ?? []).map((dicOption) => <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>{dicOption.strLabel}</MenuItem>)}
          </TextField>
          {blnShowMfaType ? (
            <TextField select label="MFA Type *" inputProps={{ "data-testid": "tenant-admin.editor.mfa-type.select" }} value={objForm.auth.intMfaTypeID === "" ? "" : String(objForm.auth.intMfaTypeID)} onChange={(e) => setField("auth.intMfaTypeID", e.target.value ? Number(e.target.value) : "")} error={Boolean(dicErrors["auth.intMfaTypeID"])} helperText={dicErrors["auth.intMfaTypeID"]} fullWidth>
              <MenuItem value="">Select MFA type</MenuItem>
              {(objFormOptions?.lstMfaTypes ?? []).map((dicOption) => <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>{dicOption.strLabel}</MenuItem>)}
            </TextField>
          ) : null}
        </Box>
        {blnShowSsoSection ? (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>SSO Identity Provider Details</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <TextField select label="Provider Type *" value={objForm.auth.sso.strProviderType} onChange={(e) => setField("auth.sso.strProviderType", e.target.value)} fullWidth>
                  {(objFormOptions?.lstSsoProviderTypes ?? []).map((dicOption) => <MenuItem key={dicOption.strCode} value={dicOption.strCode}>{dicOption.strLabel}</MenuItem>)}
                </TextField>
                <TextField label="Provider Name *" value={objForm.auth.sso.strProviderName} onChange={(e) => setField("auth.sso.strProviderName", e.target.value)} error={Boolean(dicErrors["auth.sso.strProviderName"])} helperText={dicErrors["auth.sso.strProviderName"]} fullWidth />
                <TextField label="Issuer" value={objForm.auth.sso.strIssuer} onChange={(e) => setField("auth.sso.strIssuer", e.target.value)} fullWidth />
                <TextField label="Client ID *" value={objForm.auth.sso.strClientID} onChange={(e) => setField("auth.sso.strClientID", e.target.value)} error={Boolean(dicErrors["auth.sso.strClientID"])} helperText={dicErrors["auth.sso.strClientID"]} fullWidth />
                <TextField type="password" label="Client Secret *" value={objForm.auth.sso.strClientSecret} onChange={(e) => setField("auth.sso.strClientSecret", e.target.value)} error={Boolean(dicErrors["auth.sso.strClientSecret"])} helperText={dicErrors["auth.sso.strClientSecret"] ?? (objSecrets.blnClientSecretConfigured ? "Leave blank to keep the current client secret." : "")} fullWidth />
                <TextField label="Authorization Endpoint *" value={objForm.auth.sso.strAuthorizationEndpoint} onChange={(e) => setField("auth.sso.strAuthorizationEndpoint", e.target.value)} error={Boolean(dicErrors["auth.sso.strAuthorizationEndpoint"])} helperText={dicErrors["auth.sso.strAuthorizationEndpoint"]} fullWidth />
                <TextField label="Token Endpoint *" value={objForm.auth.sso.strTokenEndpoint} onChange={(e) => setField("auth.sso.strTokenEndpoint", e.target.value)} error={Boolean(dicErrors["auth.sso.strTokenEndpoint"])} helperText={dicErrors["auth.sso.strTokenEndpoint"]} fullWidth />
                <TextField label="JWKS URI" value={objForm.auth.sso.strJwksUri} onChange={(e) => setField("auth.sso.strJwksUri", e.target.value)} fullWidth />
                <TextField label="Redirect URI *" value={objForm.auth.sso.strSsoRedirectUrl} onChange={(e) => setField("auth.sso.strSsoRedirectUrl", e.target.value)} error={Boolean(dicErrors["auth.sso.strSsoRedirectUrl"])} helperText={dicErrors["auth.sso.strSsoRedirectUrl"]} fullWidth />
                <TextField label="SSO Entry Point" value={objForm.auth.sso.strSsoEntryPoint} onChange={(e) => setField("auth.sso.strSsoEntryPoint", e.target.value)} fullWidth />
                <TextField label="Single Logout Endpoint" value={objForm.auth.sso.strSloEndpoint} onChange={(e) => setField("auth.sso.strSloEndpoint", e.target.value)} fullWidth />
              </Box>
            </Stack>
          </Paper>
        ) : null}
        {blnShowEmailProviderSection ? (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={700}>Email OTP Provider Details</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <TextField label="Sender Email *" value={objForm.auth.email.strSmtpSenderEmail} onChange={(e) => setField("auth.email.strSmtpSenderEmail", e.target.value)} error={Boolean(dicErrors["auth.email.strSmtpSenderEmail"])} helperText={dicErrors["auth.email.strSmtpSenderEmail"]} fullWidth />
                <TextField label="SMTP Username *" value={objForm.auth.email.strSmtpUsername} onChange={(e) => setField("auth.email.strSmtpUsername", e.target.value)} error={Boolean(dicErrors["auth.email.strSmtpUsername"])} helperText={dicErrors["auth.email.strSmtpUsername"]} fullWidth />
                <TextField type="password" label="SMTP Password *" value={objForm.auth.email.strSmtpPassword} onChange={(e) => setField("auth.email.strSmtpPassword", e.target.value)} error={Boolean(dicErrors["auth.email.strSmtpPassword"])} helperText={dicErrors["auth.email.strSmtpPassword"] ?? (objSecrets.blnSmtpPasswordConfigured ? "Leave blank to keep the current SMTP password." : "")} fullWidth />
                <TextField label="SMTP Server *" value={objForm.auth.email.strSmtpServer} onChange={(e) => setField("auth.email.strSmtpServer", e.target.value)} error={Boolean(dicErrors["auth.email.strSmtpServer"])} helperText={dicErrors["auth.email.strSmtpServer"]} fullWidth />
                <TextField label="SMTP Port *" value={objForm.auth.email.intSmtpPort} onChange={(e) => setField("auth.email.intSmtpPort", e.target.value.replace(/\D/g, ""))} error={Boolean(dicErrors["auth.email.intSmtpPort"])} helperText={dicErrors["auth.email.intSmtpPort"]} fullWidth />
                <TextField label="BCC Email" value={objForm.auth.email.strSmtpBccEmail} onChange={(e) => setField("auth.email.strSmtpBccEmail", e.target.value)} error={Boolean(dicErrors["auth.email.strSmtpBccEmail"])} helperText={dicErrors["auth.email.strSmtpBccEmail"]} fullWidth />
              </Box>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    );
  }

  function renderDatastoreConfiguration() {
    return (
      <Stack spacing={2.25}>
        <Typography variant="h6">Datastore Configuration</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField select label="Datastore Type *" inputProps={{ "data-testid": "tenant-admin.editor.datastore-type.select" }} value={objForm.datastore.strStoreType} onChange={(e) => setField("datastore.strStoreType", e.target.value)} fullWidth>
            {(objFormOptions?.lstDatastoreTypes ?? []).map((dicOption) => <MenuItem key={dicOption.strCode} value={dicOption.strCode}>{dicOption.strLabel}</MenuItem>)}
          </TextField>
          <TextField label="Database Name *" inputProps={{ "data-testid": "tenant-admin.editor.database-name.input" }} value={objForm.datastore.strDatabaseName} onChange={(e) => setField("datastore.strDatabaseName", e.target.value)} error={Boolean(dicErrors["datastore.strDatabaseName"])} helperText={dicErrors["datastore.strDatabaseName"]} fullWidth />
          <TextField label="Schema Name" value={objForm.datastore.strSchemaName} onChange={(e) => setField("datastore.strSchemaName", e.target.value)} fullWidth />
          <TextField label="Host *" value={objForm.datastore.strDbHost} onChange={(e) => setField("datastore.strDbHost", e.target.value)} error={Boolean(dicErrors["datastore.strDbHost"])} helperText={dicErrors["datastore.strDbHost"]} fullWidth />
          <TextField label="Port *" value={objForm.datastore.intDbPort} onChange={(e) => setField("datastore.intDbPort", e.target.value.replace(/\D/g, ""))} error={Boolean(dicErrors["datastore.intDbPort"])} helperText={dicErrors["datastore.intDbPort"]} fullWidth />
          <TextField label="DB Username *" value={objForm.datastore.strDbUserName} onChange={(e) => setField("datastore.strDbUserName", e.target.value)} error={Boolean(dicErrors["datastore.strDbUserName"])} helperText={dicErrors["datastore.strDbUserName"]} fullWidth />
          <TextField type="password" label="DB Password *" value={objForm.datastore.strDbPassword} onChange={(e) => setField("datastore.strDbPassword", e.target.value)} error={Boolean(dicErrors["datastore.strDbPassword"])} helperText={dicErrors["datastore.strDbPassword"] ?? (objSecrets.blnDbPasswordConfigured ? "Leave blank to keep the current DB password." : "")} fullWidth />
        </Box>
        <Box>
          <InputLabel id="tenant-editor-modules-label" sx={{ mb: 1 }}>Modules</InputLabel>
          <Select
            data-testid="tenant-admin.editor.modules.select"
            labelId="tenant-editor-modules-label"
            multiple
            value={objForm.datastore.lstModuleIDs.map(String)}
            onChange={(objEvent) => {
              const lstSelectedValues = objEvent.target.value as string[];
              setField("datastore.lstModuleIDs", lstSelectedValues.map((strValue) => Number(strValue)));
            }}
            input={<OutlinedInput />}
            renderValue={(lstSelectedValues) => {
              const lstResolvedValues = lstSelectedValues as string[];
              const lstLabels = lstResolvedValues
                .map((strValue) => objFormOptions?.lstModules.find((dicOption) => String(dicOption.intID) === strValue)?.strLabel)
                .filter(Boolean);
              return lstLabels.length > 0 ? lstLabels.join(", ") : "Select modules";
            }}
            fullWidth
          >
            {(objFormOptions?.lstModules ?? []).map((dicOption) => {
              const blnChecked = objForm.datastore.lstModuleIDs.includes(dicOption.intID);
              return (
                <MenuItem key={dicOption.intID} value={String(dicOption.intID)} data-testid="tenant-admin.tenant-editor.datastore.module.option" data-option-key={dicOption.intID}>
                  <Checkbox data-testid="tenant-admin.tenant-editor.datastore.module.checkbox" checked={blnChecked} inputProps={{ "data-testid": "tenant-admin.tenant-editor.datastore.module.checkbox", "data-option-key": dicOption.intID } as InputHTMLAttributes<HTMLInputElement>} />
                  <ListItemText primary={dicOption.strLabel} secondary={dicOption.strCode ?? undefined} />
                </MenuItem>
              );
            })}
          </Select>
        </Box>
        <FormControlLabel control={<Checkbox data-testid="tenant-admin.tenant-editor.datastore.active.checkbox" checked={objForm.datastore.blnIsActive} onChange={(_, blnChecked) => setField("datastore.blnIsActive", blnChecked)} inputProps={{ "data-testid": "tenant-admin.tenant-editor.datastore.active.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />} label="Datastore active" />
      </Stack>
    );
  }

  function renderInformationPanel() {
    if (!objTenantInformation) {
      return <Alert severity="info">Tenant information is not available yet.</Alert>;
    }

    const lstInformationRows = [
      ["Tenant Name", objTenantInformation.strTenantName],
      ["Tenant UUID", objTenantInformation.strTenantUUID],
      ["Tenant Code", objTenantInformation.strTenantCode],
      ["Tenant Status", objTenantInformation.strTenantStatus],
      ["Contact Person Name", objTenantInformation.strContactPersonName ?? "-"],
      ["Auth Mode", objTenantInformation.strAuthMode ?? "-"],
      ["MFA Mode", objTenantInformation.strMfaMode ?? "-"],
      ["Active Users", String(objTenantInformation.intUserCount)],
      ["Datastore", objTenantInformation.blnDatastoreActive ? "Active" : "Unavailable"],
      ["Isolation Mode", objTenantInformation.strIsolationMode ?? "-"],
      ["Contact Email Address", objTenantInformation.strContactEmailAddress ?? "-"],
      ["Contact Mobile Number", objTenantInformation.strContactMobileNumber ?? "-"],
      ["Database Name", objTenantInformation.strDatabaseName ?? "-"],
      ["Database Host", objTenantInformation.strDatabaseHost ?? "-"],
      ["Database Port", objTenantInformation.intDatabasePort ? String(objTenantInformation.intDatabasePort) : "-"],
      ["Created On", objTenantInformation.dtCreatedOn ? new Date(objTenantInformation.dtCreatedOn).toLocaleString() : "-"],
      ["Updated On", objTenantInformation.dtUpdatedOn ? new Date(objTenantInformation.dtUpdatedOn).toLocaleString() : "-"],
    ] as const;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 2,
          borderColor: "divider",
          boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
          backgroundColor: "#fcfdff",
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Tenant Information</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              Read-only operational summary with live datastore reachability and active-user count from the configured tenant database.
            </Typography>
          </Box>
          <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
            {lstInformationRows.map(([strLabel, strValue], intIndex) => (
              <Box
                key={strLabel}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "240px 18px minmax(0, 1fr)" },
                  gap: { xs: 0.35, md: 1 },
                  alignItems: "start",
                  py: 1.4,
                  borderBottom: intIndex === lstInformationRows.length - 1 ? "none" : "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>{strLabel}</Typography>
                <Typography sx={{ display: { xs: "none", md: "block" }, color: "text.secondary" }}>:</Typography>
                <Typography sx={{ color: "text.primary", fontWeight: 700, wordBreak: "break-word", textTransform: strLabel === "Tenant Status" ? "capitalize" : "none" }}>
                  {strValue}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      </Paper>
    );
  }
}


function getLookupCode(lstOptions: { intID: number; strCode?: string | null }[] | undefined, intSelectedID: number | "") {
  if (!lstOptions || intSelectedID === "") {
    return "";
  }
  return lstOptions.find((dicOption) => dicOption.intID === intSelectedID)?.strCode ?? "";
}

function toNullableText(strValue: string) {
  const strTrimmed = strValue.trim();
  return strTrimmed ? strTrimmed : null;
}

function isValidEmail(strValue: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue.trim());
}

function buildUpdatePayload(
  objForm: TenantEditorFormState,
  objFlags: { blnShowMfaType: boolean; blnShowSsoSection: boolean; blnShowEmailProviderSection: boolean; },
) {
  return {
    strTenantName: objForm.basic.strTenantName.trim(),
    strTenantCode: objForm.basic.strTenantCode.trim().toUpperCase(),
    strContactPersonName: toNullableText(objForm.basic.strContactPersonName),
    strContactEmailAddress: toNullableText(objForm.basic.strContactEmailAddress),
    strContactMobileNumber: toNullableText(objForm.basic.strContactMobileNumber),
    intDefaultLanguageID: Number(objForm.basic.intDefaultLanguageID),
    intSecondaryLanguageID: objForm.basic.intSecondaryLanguageID === "" ? null : Number(objForm.basic.intSecondaryLanguageID),
    intDefaultCountryID: objForm.basic.intDefaultCountryID === "" ? null : Number(objForm.basic.intDefaultCountryID),
    strIsolationMode: objForm.basic.strIsolationMode,
    intAuthModeTypeID: Number(objForm.auth.intAuthModeTypeID),
    intMfaFlagID: Number(objForm.auth.intMfaFlagID),
    intMfaTypeID: objFlags.blnShowMfaType && objForm.auth.intMfaTypeID !== "" ? Number(objForm.auth.intMfaTypeID) : null,
    blnAllowNoTenantUrlLocalLogin: objForm.auth.blnAllowNoTenantUrlLocalLogin,
    objSsoIdentityProvider: objFlags.blnShowSsoSection ? {
      strProviderType: objForm.auth.sso.strProviderType.trim(),
      strProviderName: objForm.auth.sso.strProviderName.trim(),
      strIssuer: toNullableText(objForm.auth.sso.strIssuer),
      strClientID: toNullableText(objForm.auth.sso.strClientID),
      strClientSecret: toNullableText(objForm.auth.sso.strClientSecret),
      strAuthorizationEndpoint: toNullableText(objForm.auth.sso.strAuthorizationEndpoint),
      strTokenEndpoint: toNullableText(objForm.auth.sso.strTokenEndpoint),
      strJwksUri: toNullableText(objForm.auth.sso.strJwksUri),
      strSsoRedirectUrl: toNullableText(objForm.auth.sso.strSsoRedirectUrl),
      strSsoEntryPoint: toNullableText(objForm.auth.sso.strSsoEntryPoint),
      strSloEndpoint: toNullableText(objForm.auth.sso.strSloEndpoint),
      strUserLookupClaim: objForm.auth.sso.strUserLookupClaim.trim(),
      blnIsDefault: objForm.auth.sso.blnIsDefault,
      blnIsActive: objForm.auth.sso.blnIsActive,
    } : null,
    objEmailIdentityProvider: objFlags.blnShowEmailProviderSection ? {
      strSmtpSenderEmail: toNullableText(objForm.auth.email.strSmtpSenderEmail),
      strSmtpUsername: toNullableText(objForm.auth.email.strSmtpUsername),
      strSmtpPassword: toNullableText(objForm.auth.email.strSmtpPassword),
      strSmtpServer: toNullableText(objForm.auth.email.strSmtpServer),
      intSmtpPort: objForm.auth.email.intSmtpPort.trim() ? Number(objForm.auth.email.intSmtpPort) : null,
      strSmtpBccEmail: toNullableText(objForm.auth.email.strSmtpBccEmail),
    } : null,
    objDatastore: {
      strStoreType: objForm.datastore.strStoreType.trim(),
      strDatabaseName: objForm.datastore.strDatabaseName.trim(),
      strSchemaName: toNullableText(objForm.datastore.strSchemaName),
      strDbHost: objForm.datastore.strDbHost.trim(),
      intDbPort: Number(objForm.datastore.intDbPort),
      strDbUserName: objForm.datastore.strDbUserName.trim(),
      strDbPassword: toNullableText(objForm.datastore.strDbPassword),
      lstModuleIDs: objForm.datastore.lstModuleIDs,
      blnIsPrimary: objForm.datastore.blnIsPrimary,
      blnIsActive: objForm.datastore.blnIsActive,
    },
  };
}

function validateStep(
  intStep: 1 | 2 | 3,
  objForm: TenantEditorFormState,
  objFlags: {
    blnShowMfaType: boolean;
    blnShowSsoSection: boolean;
    blnShowEmailProviderSection: boolean;
    objSecrets: TenantEditSecretsMeta;
  },
) {
  const dicErrors: Record<string, string> = {};
  if (intStep === 1) {
    if (!objForm.basic.strTenantName.trim()) dicErrors["basic.strTenantName"] = "Tenant name is required.";
    if (!objForm.basic.strTenantCode.trim()) dicErrors["basic.strTenantCode"] = "Tenant code is required.";
    else if (!/^[A-Z0-9_-]+$/.test(objForm.basic.strTenantCode.trim().toUpperCase())) dicErrors["basic.strTenantCode"] = "Use uppercase letters, numbers, hyphen, or underscore only.";
    if (objForm.basic.strContactEmailAddress.trim() && !isValidEmail(objForm.basic.strContactEmailAddress)) dicErrors["basic.strContactEmailAddress"] = "Enter a valid contact email.";
    if (objForm.basic.intDefaultLanguageID === "") dicErrors["basic.intDefaultLanguageID"] = "Default language is required.";
  }
  if (intStep === 2) {
    if (objForm.auth.intAuthModeTypeID === "") dicErrors["auth.intAuthModeTypeID"] = "Authentication mode is required.";
    if (objForm.auth.intMfaFlagID === "") dicErrors["auth.intMfaFlagID"] = "MFA flag is required.";
    if (objFlags.blnShowMfaType && objForm.auth.intMfaTypeID === "") dicErrors["auth.intMfaTypeID"] = "MFA type is required.";
    if (objFlags.blnShowSsoSection) {
      if (!objForm.auth.sso.strProviderName.trim()) dicErrors["auth.sso.strProviderName"] = "Provider name is required.";
      if (!objForm.auth.sso.strClientID.trim()) dicErrors["auth.sso.strClientID"] = "Client ID is required.";
      if (!objFlags.objSecrets.blnClientSecretConfigured && !objForm.auth.sso.strClientSecret.trim()) dicErrors["auth.sso.strClientSecret"] = "Client secret is required.";
      if (!objForm.auth.sso.strAuthorizationEndpoint.trim()) dicErrors["auth.sso.strAuthorizationEndpoint"] = "Authorization endpoint is required.";
      if (!objForm.auth.sso.strTokenEndpoint.trim()) dicErrors["auth.sso.strTokenEndpoint"] = "Token endpoint is required.";
      if (!objForm.auth.sso.strSsoRedirectUrl.trim()) dicErrors["auth.sso.strSsoRedirectUrl"] = "Redirect URI is required.";
    }
    if (objFlags.blnShowEmailProviderSection) {
      if (!objForm.auth.email.strSmtpSenderEmail.trim()) dicErrors["auth.email.strSmtpSenderEmail"] = "Sender email is required.";
      else if (!isValidEmail(objForm.auth.email.strSmtpSenderEmail)) dicErrors["auth.email.strSmtpSenderEmail"] = "Enter a valid sender email.";
      if (!objForm.auth.email.strSmtpUsername.trim()) dicErrors["auth.email.strSmtpUsername"] = "SMTP username is required.";
      if (!objFlags.objSecrets.blnSmtpPasswordConfigured && !objForm.auth.email.strSmtpPassword.trim()) dicErrors["auth.email.strSmtpPassword"] = "SMTP password is required.";
      if (!objForm.auth.email.strSmtpServer.trim()) dicErrors["auth.email.strSmtpServer"] = "SMTP server is required.";
      if (!objForm.auth.email.intSmtpPort.trim()) dicErrors["auth.email.intSmtpPort"] = "SMTP port is required.";
      if (objForm.auth.email.strSmtpBccEmail.trim() && !isValidEmail(objForm.auth.email.strSmtpBccEmail)) dicErrors["auth.email.strSmtpBccEmail"] = "Enter a valid BCC email.";
    }
  }
  if (intStep === 3) {
    if (!objForm.datastore.strDatabaseName.trim()) dicErrors["datastore.strDatabaseName"] = "Database name is required.";
    if (!objForm.datastore.strDbHost.trim()) dicErrors["datastore.strDbHost"] = "Database host is required.";
    if (!objForm.datastore.intDbPort.trim()) dicErrors["datastore.intDbPort"] = "Database port is required.";
    if (!objForm.datastore.strDbUserName.trim()) dicErrors["datastore.strDbUserName"] = "Database username is required.";
    if (!objFlags.objSecrets.blnDbPasswordConfigured && !objForm.datastore.strDbPassword.trim()) dicErrors["datastore.strDbPassword"] = "Database password is required.";
  }
  return dicErrors;
}
