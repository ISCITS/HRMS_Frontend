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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { useEffect, useState } from "react";
import type { EmployeeAddress, EmployeeAddressFormValues, EmployeeLookups } from "@/features/employeeMaster/Types";

type EmployeeAddressFormProps = {
  lstAddresses: EmployeeAddress[];
  objLookups: EmployeeLookups | null;
  blnDisabled: boolean;
  strMessage?: string;
  onCreate: (dicValues: EmployeeAddressFormValues) => Promise<void>;
  onUpdate: (intAddressID: number, dicValues: EmployeeAddressFormValues) => Promise<void>;
  onDelete: (intAddressID: number) => Promise<void>;
};

const clsSchema: yup.ObjectSchema<EmployeeAddressFormValues> = yup.object({
  strAddressType: yup.mixed<"Current" | "Permanent" | "Other">().required(),
  strAddressLine1: yup.string().trim().required("Address line 1 is required."),
  strAddressLine2: yup.string().default(""),
  strCityName: yup.string().default(""),
  intStateID: yup.number().nullable().default(null),
  strPostalCode: yup.string().default(""),
  intCountryID: yup.number().required("Country is required.")
});

const defaultValues: EmployeeAddressFormValues = {
  strAddressType: "Current",
  strAddressLine1: "",
  strAddressLine2: "",
  strCityName: "",
  intStateID: null,
  strPostalCode: "",
  intCountryID: 0
};

export default function EmployeeAddressForm({
  lstAddresses,
  objLookups,
  blnDisabled,
  strMessage,
  onCreate,
  onUpdate,
  onDelete
}: EmployeeAddressFormProps) {
  const [intDialogOpen, setIntDialogOpen] = useState(0);
  const [objEditingAddress, setObjEditingAddress] = useState<EmployeeAddress | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EmployeeAddressFormValues>({
    resolver: yupResolver(clsSchema),
    defaultValues
  });

  useEffect(() => {
    if (objEditingAddress) {
      reset({
        strAddressType: objEditingAddress.strAddressType,
        strAddressLine1: objEditingAddress.strAddressLine1,
        strAddressLine2: objEditingAddress.strAddressLine2 ?? "",
        strCityName: objEditingAddress.strCityName ?? "",
        intStateID: objEditingAddress.intStateID ?? null,
        strPostalCode: objEditingAddress.strPostalCode ?? "",
        intCountryID: objEditingAddress.intCountryID
      });
      return;
    }
    reset(defaultValues);
  }, [objEditingAddress, reset]);

  const handleSave = async (dicValues: EmployeeAddressFormValues) => {
    if (objEditingAddress) {
      await onUpdate(objEditingAddress.intID, dicValues);
    } else {
      await onCreate(dicValues);
    }
    setIntDialogOpen(0);
    setObjEditingAddress(null);
    reset(defaultValues);
  };

  const handleCloseDialog = () => {
    setIntDialogOpen(0);
    setObjEditingAddress(null);
    reset(defaultValues);
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Address
          </Typography>
          </Box>
        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          disabled={blnDisabled}
          onClick={() => {
            setObjEditingAddress(null);
            reset(defaultValues);
            setIntDialogOpen(1);
          }}
        >
          Add Address
        </Button>
      </Stack>

      {strMessage ? <Alert severity="info">{strMessage}</Alert> : null}

      {lstAddresses.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary">No address records have been added yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {lstAddresses.map((dicAddress) => (
            <Card key={dicAddress.intID} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography fontWeight={700}>{dicAddress.strAddressType} Address</Typography>
                    <Typography color="text.secondary">{dicAddress.strAddressLine1}</Typography>
                    {dicAddress.strAddressLine2 ? <Typography color="text.secondary">{dicAddress.strAddressLine2}</Typography> : null}
                    <Typography color="text.secondary">
                      {[dicAddress.strCityName, dicAddress.strPostalCode].filter(Boolean).join(" - ")}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => {
                      setObjEditingAddress(dicAddress);
                      setIntDialogOpen(1);
                    }}>
                      Edit
                    </Button>
                    <Button color="error" variant="outlined" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => onDelete(dicAddress.intID)}>
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(intDialogOpen)} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{objEditingAddress ? "Edit Address" : "Add Address"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              name="strAddressType"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Address Type" fullWidth>
                  <MenuItem value="Current">Current</MenuItem>
                  <MenuItem value="Permanent">Permanent</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="strAddressLine1"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Address Line 1" fullWidth error={Boolean(errors.strAddressLine1)} helperText={errors.strAddressLine1?.message} />
              )}
            />
            <Controller name="strAddressLine2" control={control} render={({ field }) => <TextField {...field} label="Address Line 2" fullWidth />} />
            <Controller name="strCityName" control={control} render={({ field }) => <TextField {...field} label="City" fullWidth />} />
            <Controller
              name="intStateID"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="State" fullWidth>
                  <MenuItem value="">Select</MenuItem>
                  {(objLookups?.lstStates ?? []).map((dicOption) => (
                    <MenuItem key={dicOption.intID} value={dicOption.intID}>
                      {dicOption.strLabel}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller name="strPostalCode" control={control} render={({ field }) => <TextField {...field} label="Postal Code" fullWidth />} />
            <Controller
              name="intCountryID"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Country" fullWidth error={Boolean(errors.intCountryID)} helperText={errors.intCountryID?.message}>
                  <MenuItem value={0}>Select</MenuItem>
                  {(objLookups?.lstCountries ?? []).map((dicOption) => (
                    <MenuItem key={dicOption.intID} value={dicOption.intID}>
                      {dicOption.strLabel}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(handleSave)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Address"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
