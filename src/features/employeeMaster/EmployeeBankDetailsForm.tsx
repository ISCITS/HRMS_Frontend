"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { useEffect, useState } from "react";
import type { EmployeeBankAccount, EmployeeBankAccountFormValues, EmployeeLookups } from "@/features/employeeMaster/Types";

type EmployeeBankDetailsFormProps = {
  lstBankAccounts: EmployeeBankAccount[];
  objLookups: EmployeeLookups | null;
  blnDisabled: boolean;
  strMessage?: string;
  onCreate: (dicValues: EmployeeBankAccountFormValues) => Promise<void>;
  onUpdate: (intBankAccountID: number, dicValues: EmployeeBankAccountFormValues) => Promise<void>;
  onDelete: (intBankAccountID: number) => Promise<void>;
};

const clsSchema: yup.ObjectSchema<EmployeeBankAccountFormValues> = yup.object({
  intBankID: yup.mixed<number | "">().required("Bank is required."),
  strAccountHolderName: yup.string().trim().required("Account holder name is required."),
  strAccountNumber: yup.string().default(""),
  strIfscCode: yup.string().default(""),
  blnIsPrimary: yup.boolean().required(),
  blnIsActive: yup.boolean().required()
});

const defaultValues: EmployeeBankAccountFormValues = {
  intBankID: "",
  strAccountHolderName: "",
  strAccountNumber: "",
  strIfscCode: "",
  blnIsPrimary: true,
  blnIsActive: true
};

export default function EmployeeBankDetailsForm({
  lstBankAccounts,
  objLookups,
  blnDisabled,
  strMessage,
  onCreate,
  onUpdate,
  onDelete
}: EmployeeBankDetailsFormProps) {
  const [intDialogOpen, setIntDialogOpen] = useState(0);
  const [objEditingAccount, setObjEditingAccount] = useState<EmployeeBankAccount | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EmployeeBankAccountFormValues>({
    resolver: yupResolver(clsSchema),
    defaultValues
  });

  useEffect(() => {
    if (objEditingAccount) {
      reset({
        intBankID: objEditingAccount.intBankID,
        strAccountHolderName: objEditingAccount.strAccountHolderName,
        strAccountNumber: "",
        strIfscCode: objEditingAccount.strIfscCode ?? "",
        blnIsPrimary: objEditingAccount.blnIsPrimary,
        blnIsActive: objEditingAccount.blnIsActive
      });
      return;
    }
    reset(defaultValues);
  }, [objEditingAccount, reset]);

  const handleSave = async (dicValues: EmployeeBankAccountFormValues) => {
    if (objEditingAccount) {
      await onUpdate(objEditingAccount.intID, dicValues);
    } else {
      await onCreate(dicValues);
    }
    setIntDialogOpen(0);
    setObjEditingAccount(null);
    reset(defaultValues);
  };

  const handleCloseDialog = () => {
    setIntDialogOpen(0);
    setObjEditingAccount(null);
    reset(defaultValues);
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Bank Details
          </Typography>
         </Box>
        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          disabled={blnDisabled}
          onClick={() => {
            setObjEditingAccount(null);
            reset(defaultValues);
            setIntDialogOpen(1);
          }}
        >
          Add Bank Account
        </Button>
      </Stack>

      {strMessage ? <Alert severity="info">{strMessage}</Alert> : null}

      {lstBankAccounts.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">No bank details have been added yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {lstBankAccounts.map((dicAccount) => (
            <Card key={dicAccount.intID} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography fontWeight={700}>{dicAccount.strBankName ?? `Bank ${dicAccount.intBankID}`}</Typography>
                    <Typography color="text.secondary">{dicAccount.strAccountHolderName}</Typography>
                    <Typography color="text.secondary">{dicAccount.strAccountNumberMasked ?? "Account protected"}</Typography>
                    <Typography color="text.secondary">{dicAccount.strIfscCode || "IFSC not provided"}</Typography>
                  </Box>
                  <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                    <Typography color={dicAccount.blnIsPrimary ? "success.main" : "text.secondary"}>
                      {dicAccount.blnIsPrimary ? "Primary account" : "Secondary account"}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => {
                        setObjEditingAccount(dicAccount);
                        setIntDialogOpen(1);
                      }}>
                        Edit
                      </Button>
                      <Button color="error" variant="outlined" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => onDelete(dicAccount.intID)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(intDialogOpen)} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{objEditingAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              name="intBankID"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Bank" fullWidth error={Boolean(errors.intBankID)} helperText={errors.intBankID?.message}>
                  <MenuItem value="">Select</MenuItem>
                  {(objLookups?.lstBanks ?? []).map((dicOption) => (
                    <MenuItem key={dicOption.intID} value={dicOption.intID}>
                      {dicOption.strLabel}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="strAccountHolderName"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Account Holder Name" fullWidth error={Boolean(errors.strAccountHolderName)} helperText={errors.strAccountHolderName?.message} />
              )}
            />
            <Controller
              name="strAccountNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={objEditingAccount ? "Replace Account Number (optional)" : "Account Number"}
                  fullWidth
                />
              )}
            />
            <Controller name="strIfscCode" control={control} render={({ field }) => <TextField {...field} label="IFSC Code" fullWidth />} />
            <Controller
              name="blnIsPrimary"
              control={control}
              render={({ field }) => (
                <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} />} label="Mark as primary account" />
              )}
            />
            <Controller
              name="blnIsActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} />} label="Keep this bank account active" />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(handleSave)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Bank Details"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
