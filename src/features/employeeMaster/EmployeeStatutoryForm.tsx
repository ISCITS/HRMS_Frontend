"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import type { EmployeeStatutory } from "@/features/employeeMaster/Types";

type EmployeeStatutoryFormProps = {
  initialValues: EmployeeStatutory;
  blnDisabled: boolean;
  blnIsSaving: boolean;
  strMessage?: string;
  onSubmit: (dicValues: EmployeeStatutory) => Promise<void>;
};

const clsSchema: yup.ObjectSchema<EmployeeStatutory> = yup.object({
  intID: yup.number().nullable().optional(),
  strPanNumber: yup.string().default(""),
  strUanNumber: yup.string().default(""),
  strEsiNumber: yup.string().default(""),
  strTaxRegimeCode: yup.string().default(""),
  blnPfApplicable: yup.boolean().required(),
  blnEsiApplicable: yup.boolean().required(),
  blnPtApplicable: yup.boolean().required()
});

export default function EmployeeStatutoryForm({
  initialValues,
  blnDisabled,
  blnIsSaving,
  strMessage,
  onSubmit
}: EmployeeStatutoryFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<EmployeeStatutory>({
    resolver: yupResolver(clsSchema),
    values: initialValues
  });

  const handleFormSubmit = async (dicValues: EmployeeStatutory) => {
    await onSubmit(dicValues);
    reset(dicValues);
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Statutory
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {isDirty ? <Typography color="warning.main">Unsaved changes</Typography> : null}
          <Button variant="outlined" onClick={() => reset(initialValues)} disabled={blnDisabled || blnIsSaving}>
            Reset
          </Button>
          <Button variant="contained" onClick={handleSubmit(handleFormSubmit)} disabled={blnDisabled || blnIsSaving}>
            {blnIsSaving ? "Saving..." : "Save Statutory"}
          </Button>
        </Stack>
      </Stack>

      {strMessage ? <Alert severity="info">{strMessage}</Alert> : null}

      <Stack spacing={2}>
        <Controller name="strPanNumber" control={control} render={({ field }) => <TextField {...field} label="PAN Number" fullWidth />} />
        <Controller name="strUanNumber" control={control} render={({ field }) => <TextField {...field} label="UAN Number" fullWidth />} />
        <Controller name="strEsiNumber" control={control} render={({ field }) => <TextField {...field} label="ESI Number" fullWidth />} />
        <Controller name="strTaxRegimeCode" control={control} render={({ field }) => <TextField {...field} label="Tax Regime Code" fullWidth />} />
        <Controller
          name="blnPfApplicable"
          control={control}
          render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} />} label="Provident Fund applicable" />
          )}
        />
        <Controller
          name="blnEsiApplicable"
          control={control}
          render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} />} label="ESI applicable" />
          )}
        />
        <Controller
          name="blnPtApplicable"
          control={control}
          render={({ field }) => (
            <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} />} label="Professional tax applicable" />
          )}
        />
      </Stack>
    </Stack>
  );
}
