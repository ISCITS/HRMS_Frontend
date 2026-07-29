"use client";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

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
  blnIsPrimary: true,
  blnIsActive: true
};

export default function EssMyBankDetailsPage() {
  const { t } = useModuleLabels("my-bank-details", "Unable to load bank details labels.");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(["MY_BANK_DETAILS"]);
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<EmployeeBankFormValues>(dicEmptyForm);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  useEffect(() => {
    if (blnRightsLoading || !canViewAny()) {
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
        setDicForm({
          intBankID: dicBank.intBankID ?? "",
          strAccountHolderName: dicBank.strAccountHolderName ?? "",
          strAccountNumber: dicBank.strAccountNumber ?? "",
          strIfscCode: dicBank.strIfscCode ?? "",
          blnIsPrimary: dicBank.blnIsPrimary ?? true,
          blnIsActive: dicBank.blnIsActive ?? true
        });
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
  }, [blnRightsLoading, canViewAny, t]);

  const blnCanEdit = canDoAny("edit");
  const blnCanSaveAction = canDoAny("save");
  const blnCanModify = blnCanEdit || blnCanSaveAction;
  const blnCanSave = useMemo(() => {
    const blnHasBank = Number(dicForm.intBankID) > 0;
    const blnHasHolder = Boolean(dicForm.strAccountHolderName.trim());
    const blnHasAccountNumber = Boolean(dicForm.strAccountNumber.trim());
    return blnCanSaveAction && blnHasBank && blnHasHolder && blnHasAccountNumber;
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
      setDicForm((dicPrevious) => ({
        ...dicPrevious,
        intBankID: dicSaved.intBankID ?? dicPrevious.intBankID,
        strAccountHolderName: dicSaved.strAccountHolderName ?? dicPrevious.strAccountHolderName,
        strAccountNumber: dicSaved.strAccountNumber ?? dicPrevious.strAccountNumber,
        strIfscCode: dicSaved.strIfscCode ?? ""
      }));
      setStrSuccess(t("success_saved", "Bank details saved successfully."));
    } catch (objError: unknown) {
      setStrError(objError instanceof Error ? objError.message : t("error_save_bank_details", "Unable to save bank details."));
    } finally {
      setBlnSaving(false);
    }
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

  if (!canViewAny()) {
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
    <Stack spacing={0}>
      <Box className="pageBanner">
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <AccountBalanceRoundedIcon sx={{ fontSize: 34 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">
            {t("page_title", "My Bank Details")}
          </Typography>
          <Typography component="p" className="bannerSubTitle">
            {t("subtitle", "Keep your account information updated for salary and reimbursements.")}
          </Typography>
        </Box>
        <Chip
          label={t("primary_account", "Primary Account")}
          sx={{
            position: "relative",
            zIndex: 1,
            alignSelf: "flex-start",
            fontWeight: 700,
            color: "white",
            borderColor: "rgba(255,255,255,0.5)",
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
          variant="outlined"
        />
      </Box>

      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 20px rgba(15,23,42,0.05)"
        }}
      >
        {/* <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
          <AccountBalanceRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>{t("page_title", "My Bank Details")}</Typography>
        </Stack> */}

        {strRightsError ? <Alert severity="warning" sx={{ mb: 1.5 }}>{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success" sx={{ mb: 1.5 }}>{strSuccess}</Alert> : null}

        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <TextField
              controlId="ess.my-bank-details.bank.select"
              fullWidth
              select
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
        </Grid>

        {blnCanSaveAction ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              controlId="ess.my-bank-details.save.button"
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              disabled={blnSaving || !blnCanSave}
              onClick={onSaveBankDetails}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
            >
              {blnSaving ? t("saving", "Saving...") : t("save", "Save")}
            </Button>
          </Stack>
        ) : null}
      </Paper>
    </Stack>
  );
}
