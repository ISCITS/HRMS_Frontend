"use client";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import FileUploadPanel from "@/components/shared/files/FileUploadPanel";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeBankFormValues, EmployeeFormOptions } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authApiService } from "@/services";

const dicEmptyForm: EmployeeBankFormValues = {
  intBankID: "",
  strAccountHolderName: "",
  strAccountNumber: "",
  strIfscCode: "",
  strSwiftCode: "",
  strBranchName: "",
  strAccountType: "",
  strAccountHolderEmail: "",
  intSecondaryBankID: "",
  strSecondaryAccountHolderName: "",
  strSecondaryAccountNumber: "",
  strSecondaryIfscCode: "",
  blnSecondaryIsActive: false,
  blnIsPrimary: true,
  blnIsActive: true
};

export default function EssMyBankDetailsPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("my-bank-details", "Unable to load bank details labels.");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(["MY_BANK_DETAILS"]);
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [intBankAccountID, setIntBankAccountID] = useState<number | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<EmployeeBankFormValues>(dicEmptyForm);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const blnCanView = canViewAny();

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }

    let blnMounted = true;

    async function loadBankDetails() {
      try {
        const objCurrentUser = await authApiService.getCurrentUser();
        if (!blnMounted) {
          return;
        }
        const intCurrentEmployeeID = objCurrentUser.Data.objUser.intEmployeeID ?? null;
        if (!intCurrentEmployeeID) {
          setStrError(t("error_employee_not_linked", "No employee is linked to the current user."));
          return;
        }
        setIntEmployeeID(intCurrentEmployeeID);

        const [dicOptions, dicBank] = await Promise.all([
          employeeService.getFormOptions(),
          employeeService.getEmployeeBankAccount(intCurrentEmployeeID)
        ]);

        if (!blnMounted) {
          return;
        }

        setObjFormOptions(dicOptions);
        setIntBankAccountID(dicBank.intID ?? null);
        const dicLoadedForm: EmployeeBankFormValues = {
          intBankID: dicBank.intBankID ?? "",
          strAccountHolderName: dicBank.strAccountHolderName ?? "",
          strAccountNumber: dicBank.strAccountNumber ?? "",
          strIfscCode: dicBank.strIfscCode ?? "",
          strSwiftCode: dicBank.strSwiftCode ?? "",
          strBranchName: dicBank.strBranchName ?? "",
          strAccountType: dicBank.strAccountType ?? "",
          strAccountHolderEmail: dicBank.strAccountHolderEmail ?? "",
          intSecondaryBankID: dicBank.intSecondaryBankID ?? "",
          strSecondaryAccountHolderName: dicBank.strSecondaryAccountHolderName ?? "",
          strSecondaryAccountNumber: dicBank.strSecondaryAccountNumber ?? "",
          strSecondaryIfscCode: dicBank.strSecondaryIfscCode ?? "",
          blnSecondaryIsActive: dicBank.blnSecondaryIsActive ?? false,
          blnIsPrimary: dicBank.blnIsPrimary ?? true,
          blnIsActive: dicBank.blnIsActive ?? true
        };
        setDicForm(dicLoadedForm);
      } catch (objError: unknown) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("error_load_bank_details", "Unable to load bank details."));
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadBankDetails().catch(() => undefined);

    return () => {
      blnMounted = false;
    };
  }, [blnRightsLoading, blnCanView, t]);

  const blnCanEdit = canDoAny("edit");
  const blnCanSaveAction = canDoAny("save");
  const blnCanModify = blnCanEdit || blnCanSaveAction;
  const blnCanSave = useMemo(() => {
    const blnHasBank = Number(dicForm.intBankID) > 0;
    const blnHasHolder = Boolean(dicForm.strAccountHolderName.trim());
    const blnHasAccountNumber = Boolean(dicForm.strAccountNumber.trim());
    // Secondary account details become mandatory only when the employee enables that account.
    const blnHasValidSecondaryBank = !dicForm.blnSecondaryIsActive || (
      Number(dicForm.intSecondaryBankID) > 0
      && Boolean(dicForm.strSecondaryAccountHolderName.trim())
      && Boolean(dicForm.strSecondaryAccountNumber.trim())
    );
    return blnCanSaveAction && blnHasBank && blnHasHolder && blnHasAccountNumber && blnHasValidSecondaryBank;
  }, [blnCanSaveAction, dicForm]);

  async function onSaveBankDetails() {
    if (!intEmployeeID || !blnCanSave) {
      return;
    }
    setStrError("");
    setStrSuccess("");
    setBlnSaving(true);
    try {
      const dicSaved = await employeeService.saveEmployeeBankAccount(intEmployeeID, {
        ...dicForm,
        strAccountNumber: dicForm.strAccountNumber.trim()
      });
      setIntBankAccountID(dicSaved.intID ?? intBankAccountID);
      const dicNextForm: EmployeeBankFormValues = {
        ...dicForm,
        intBankID: dicSaved.intBankID ?? dicForm.intBankID,
        strAccountHolderName: dicSaved.strAccountHolderName ?? dicForm.strAccountHolderName,
        strAccountNumber: dicSaved.strAccountNumber ?? dicForm.strAccountNumber,
        strIfscCode: dicSaved.strIfscCode ?? "",
        strSwiftCode: dicSaved.strSwiftCode ?? "",
        intSecondaryBankID: dicSaved.intSecondaryBankID ?? "",
        strSecondaryAccountHolderName: dicSaved.strSecondaryAccountHolderName ?? "",
        strSecondaryAccountNumber: dicSaved.strSecondaryAccountNumber ?? "",
        strSecondaryIfscCode: dicSaved.strSecondaryIfscCode ?? "",
        blnSecondaryIsActive: dicSaved.blnSecondaryIsActive ?? false
      };
      setDicForm(dicNextForm);
      setStrSuccess(t("success_saved", "Bank details saved successfully."));
    } catch (objError: unknown) {
      setStrError(objError instanceof Error ? objError.message : t("error_save_bank_details", "Unable to save bank details."));
    } finally {
      setBlnSaving(false);
    }
  }

  function onCancelChanges() {
    objRouter.back();
  }

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">{t("loading_bank_details", "Loading bank details...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Paper sx={{ p: 3, borderRadius: "24px" }}>
        <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>{t("page_title", "My Bank Details")}</Typography>
        <Typography color="warning.main">
          {strRightsError || t("access_not_available", "Bank details access is not available for your user group.")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      <Paper
        sx={{
          p: { xs: 1.5, md: 2.25 },
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 20px rgba(15,23,42,0.05)"
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
          <AccountBalanceRoundedIcon sx={{ color: "var(--app-primary-color)", fontSize: 21 }} />
          <Typography component="h2" sx={{ fontWeight: 800, color: "text.primary", fontSize: "0.96rem" }}>
            {t("primary_account", "Primary Account")}
          </Typography>
          <Chip
            label={t("primary", "Primary")}
            size="small"
            sx={(objTheme) => ({
              height: 20,
              color: objTheme.palette.primary.main,
              backgroundColor: alpha(objTheme.palette.primary.main, 0.12),
              fontSize: "0.65rem",
              fontWeight: 700,
              "& .MuiChip-label": { px: 0.8 }
            })}
          />
        </Stack>

        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <TextField
              controlId="ess.my-bank-details.bank.select"
              fullWidth
              select
              required
              label={t("field_bank", "Bank")}
              value={dicForm.intBankID}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, intBankID: Number(objEvent.target.value) || "" }));
              }}
              disabled={!blnCanModify}
            >
              <MenuItem value="">{t("select_bank", "Select bank")}</MenuItem>
              {(objFormOptions?.lstBanks ?? []).map((dicBank) => (
                <MenuItem key={dicBank.intID} value={dicBank.intID}>{dicBank.strLabel}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              controlId="ess.my-bank-details.account-holder-name.input"
              fullWidth
              required
              label={t("field_account_holder_name", "Account Holder Name")}
              value={dicForm.strAccountHolderName}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strAccountHolderName: objEvent.target.value }));
              }}
              disabled={!blnCanModify}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              controlId="ess.my-bank-details.account-number.input"
              fullWidth
              required
              label={t("field_account_number", "Account Number")}
              value={dicForm.strAccountNumber}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strAccountNumber: objEvent.target.value }));
              }}
              disabled={!blnCanModify}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              controlId="ess.my-bank-details.ifsc-code.input"
              fullWidth
              label={t("field_ifsc_code", "IFSC Code")}
              value={dicForm.strIfscCode}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strIfscCode: objEvent.target.value.toUpperCase() }));
              }}
              disabled={!blnCanModify}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              controlId="ess.my-bank-details.swift-code.input"
              fullWidth
              label={t("field_swift_code", "SWIFT Code")}
              value={dicForm.strSwiftCode}
              inputProps={{ maxLength: 20 }}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strSwiftCode: objEvent.target.value.toUpperCase() }));
              }}
              disabled={!blnCanModify}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper
        sx={{
          p: { xs: 1.5, md: 2.25 },
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          boxShadow: "0 10px 20px rgba(15,23,42,0.05)"
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: dicForm.blnSecondaryIsActive ? 1.5 : 0 }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <AccountBalanceRoundedIcon sx={{ color: "var(--app-primary-color)", fontSize: 21 }} />
            <Typography sx={{ fontWeight: 800, color: "text.primary", fontSize: "0.96rem" }}>
              {t("field_secondary_bank_details", "Secondary Bank Account")}
            </Typography>
          </Stack>
          <FormControlLabel
            control={
              <ActiveStatusSwitch
                controlId="ess.my-bank-details.secondary-bank-active.switch"
                blnIsActive={dicForm.blnSecondaryIsActive}
                onChange={(blnChecked) => {
                  setDicForm((dicPrevious) => ({
                    ...dicPrevious,
                    blnSecondaryIsActive: blnChecked,
                    ...(!blnChecked ? {
                      intSecondaryBankID: "",
                      strSecondaryAccountHolderName: "",
                      strSecondaryAccountNumber: "",
                      strSecondaryIfscCode: ""
                    } : {})
                  }));
                }}
                disabled={!blnCanModify}
              />
            }
            label={t("field_secondary_bank_active", "Active")}
            labelPlacement="end"
            sx={{
              m: 0,
              "& .MuiFormControlLabel-label": {
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "text.primary"
              }
            }}
          />
        </Stack>

          {dicForm.blnSecondaryIsActive ? (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  controlId="ess.my-bank-details.secondary-bank.select"
                  fullWidth
                  select
                  required
                  label={t("field_bank", "Bank")}
                  value={dicForm.intSecondaryBankID}
                  onChange={(objEvent) => {
                    setDicForm((dicPrevious) => ({ ...dicPrevious, intSecondaryBankID: Number(objEvent.target.value) || "" }));
                  }}
                  disabled={!blnCanModify}
                >
                  <MenuItem value="">{t("select_secondary_bank", "Select secondary bank")}</MenuItem>
                  {(objFormOptions?.lstBanks ?? []).map((dicBank) => (
                    <MenuItem key={dicBank.intID} value={dicBank.intID}>{dicBank.strLabel}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  controlId="ess.my-bank-details.secondary-account-holder-name.input"
                  fullWidth
                  required
                  label={t("field_account_holder_name", "Account Holder Name")}
                  value={dicForm.strSecondaryAccountHolderName}
                  onChange={(objEvent) => {
                    setDicForm((dicPrevious) => ({ ...dicPrevious, strSecondaryAccountHolderName: objEvent.target.value }));
                  }}
                  disabled={!blnCanModify}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  controlId="ess.my-bank-details.secondary-account-number.input"
                  fullWidth
                  required
                  label={t("field_account_number", "Account Number")}
                  value={dicForm.strSecondaryAccountNumber}
                  onChange={(objEvent) => {
                    setDicForm((dicPrevious) => ({ ...dicPrevious, strSecondaryAccountNumber: objEvent.target.value }));
                  }}
                  disabled={!blnCanModify}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  controlId="ess.my-bank-details.secondary-ifsc-code.input"
                  fullWidth
                  label={t("field_ifsc_code", "IFSC Code")}
                  value={dicForm.strSecondaryIfscCode}
                  onChange={(objEvent) => {
                    setDicForm((dicPrevious) => ({ ...dicPrevious, strSecondaryIfscCode: objEvent.target.value.toUpperCase() }));
                  }}
                  disabled={!blnCanModify}
                />
              </Grid>
            </Grid>
          ) : null}
      </Paper>

      <FileUploadPanel
        layout="grid"
        module="BANK"
        relatedEntityId={intBankAccountID}
        relatedEntityType="EMPLOYEE_BANK_ACCOUNT"
        documentType="cancelled_cheque"
        readOnly={!blnCanModify}
        controlIdPrefix="ess.my-bank-details.documents"
        title={t("documents_title", "Bank Proof Documents")}
        description={t("documents_description", "Upload a cancelled cheque or bank statement as proof of your account details.")}
        disabledMessage={t("documents_disabled_message", "Save your bank details below before uploading a supporting document.")}
        emptyMessage={t("documents_empty", "No bank proof documents uploaded yet.")}
        uploadLabel={t("documents_upload", "Upload Bank Proof")}
        uploadPresentation="dropzone"
        uploadButtonSx={{
          "& .MuiButton-startIcon": { color: "var(--app-primary-color)", mr: 1.25 },
          "& .MuiButton-startIcon svg": { fontSize: 32 }
        }}
      />

      {blnCanSaveAction ? (
        <Stack
          component="footer"
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            px: { xs: 1.5, md: 2.25 },
            py: 1.25,
            mb: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "0 -8px 20px rgba(15,23,42,0.08)"
          }}
        >
          <Button
            controlId="ess.my-bank-details.cancel.button"
            variant="outlined"
            color="primary"
            disabled={blnSaving}
            onClick={onCancelChanges}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px", minWidth: 96 }}
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            controlId="ess.my-bank-details.save.button"
            variant="contained"
            color="primary"
            startIcon={<SaveRoundedIcon />}
            disabled={blnSaving || !blnCanSave}
            onClick={onSaveBankDetails}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px", minWidth: 104 }}
          >
            {blnSaving ? t("saving", "Saving...") : t("save", "Save")}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
