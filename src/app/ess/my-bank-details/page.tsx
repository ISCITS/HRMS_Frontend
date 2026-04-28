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
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<EmployeeBankFormValues>(dicEmptyForm);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadBankDetails() {
      try {
        const objCurrentUser = await authApiService.getCurrentUser();
        if (!blnMounted) {
          return;
        }
        const intCurrentEmployeeID = objCurrentUser.Data.objUser.intEmployeeID ?? null;
        if (!intCurrentEmployeeID) {
          setStrError("No employee is linked to the current user.");
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
          setStrError(objError instanceof Error ? objError.message : "Unable to load bank details.");
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
  }, []);

  const blnCanSave = useMemo(() => {
    const blnHasBank = Number(dicForm.intBankID) > 0;
    const blnHasHolder = Boolean(dicForm.strAccountHolderName.trim());
    const blnHasAccountNumber = Boolean(dicForm.strAccountNumber.trim());
    return blnHasBank && blnHasHolder && blnHasAccountNumber;
  }, [dicForm]);

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
      setStrSuccess("Bank details saved successfully.");
    } catch (objError: unknown) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save bank details.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Loading bank details...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          border: "1px solid rgba(148,163,184,0.22)",
          background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)",
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <AccountBalanceRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>My Bank Details</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
                Keep your account information updated for salary and reimbursements.
              </Typography>
            </Box>
          </Stack>
          <Chip
            label="Primary Account"
            sx={{
              alignSelf: "flex-start",
              fontWeight: 700,
              color: "white",
              borderColor: "rgba(255,255,255,0.5)",
              backgroundColor: "rgba(255,255,255,0.12)",
            }}
            variant="outlined"
          />
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 20px rgba(15,23,42,0.05)"
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
          <AccountBalanceRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>My Bank Details</Typography>
        </Stack>

        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success" sx={{ mb: 1.5 }}>{strSuccess}</Alert> : null}

        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Bank"
              value={dicForm.intBankID}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, intBankID: Number(objEvent.target.value) || "" }));
              }}
            >
              <MenuItem value="">Select bank</MenuItem>
              {(objFormOptions?.lstBanks ?? []).map((dicBank) => (
                <MenuItem key={dicBank.intID} value={dicBank.intID}>{dicBank.strLabel}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Account Holder Name"
              value={dicForm.strAccountHolderName}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strAccountHolderName: objEvent.target.value }));
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Account Number"
              value={dicForm.strAccountNumber}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strAccountNumber: objEvent.target.value }));
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="IFSC Code"
              value={dicForm.strIfscCode}
              onChange={(objEvent) => {
                setDicForm((dicPrevious) => ({ ...dicPrevious, strIfscCode: objEvent.target.value.toUpperCase() }));
              }}
            />
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            disabled={blnSaving || !blnCanSave}
            onClick={onSaveBankDetails}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
          >
            {blnSaving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
