"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import type { EmployeeBasicInfoFormValues, EmployeeLookups } from "@/features/employeeMaster/Types";

type EmployeeBasicInfoFormProps = {
  initialValues: EmployeeBasicInfoFormValues;
  objLookups: EmployeeLookups | null;
  blnIsLoading: boolean;
  blnIsSaving: boolean;
  strMessage?: string;
  onSubmit: (dicValues: EmployeeBasicInfoFormValues) => Promise<void>;
};

const clsSchema: yup.ObjectSchema<EmployeeBasicInfoFormValues> = yup.object({
  strEmployeeCode: yup.string().trim().required("Employee code is required."),
  strTitle: yup.string().default(""),
  strFirstName: yup.string().trim().required("First name is required."),
  strMiddleName: yup.string().default(""),
  strLastName: yup.string().default(""),
  dtDateOfBirth: yup.string().default(""),
  dtDateOfJoining: yup.string().required("Date of joining is required."),
  intEmploymentTypeID: yup.mixed<number | "">().required("Employment type is required."),
  intDepartmentID: yup.mixed<number | "">().default(""),
  intDesignationID: yup.mixed<number | "">().default(""),
  intGradeID: yup.mixed<number | "">().default(""),
  intCostCenterID: yup.mixed<number | "">().default(""),
  intLocationID: yup.mixed<number | "">().required("Location is required."),
  intPayrollGroupID: yup.mixed<number | "">().default(""),
  intManagerEmployeeID: yup.mixed<number | "">().default(""),
  strWorkEmail: yup.string().email("Enter a valid work email.").default(""),
  strPersonalEmail: yup.string().email("Enter a valid personal email.").default(""),
  strMobileNumber: yup.string().default(""),
  strGender: yup.string().default(""),
  intPreferredLanguageID: yup.mixed<number | "">().default(""),
  strEmploymentStatus: yup.string().required("Employment status is required."),
  dtDateOfExit: yup.string().default(""),
  blnIsEssEnabled: yup.boolean().required()
});

const lstTitles = ["Mr", "Ms", "Mrs", "Dr"];
const lstGenders = ["Male", "Female", "Other"];
const lstStatuses = ["Active", "Inactive"];

function renderSelectOptions(lstOptions: Array<{ intID: number; strLabel: string }>) {
  return lstOptions.map((dicOption) => (
    <MenuItem key={dicOption.intID} value={dicOption.intID}>
      {dicOption.strLabel}
    </MenuItem>
  ));
}

export default function EmployeeBasicInfoForm({
  initialValues,
  objLookups,
  blnIsLoading,
  blnIsSaving,
  strMessage,
  onSubmit
}: EmployeeBasicInfoFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<EmployeeBasicInfoFormValues>({
    resolver: yupResolver(clsSchema),
    values: initialValues
  });

  const handleFormSubmit = async (dicValues: EmployeeBasicInfoFormValues) => {
    await onSubmit(dicValues);
    reset(dicValues);
  };

  return (
    <Stack spacing={3} sx={{ py: { xs: 0.5, md: 1 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Basic Info
          </Typography>
          <Typography color="text.secondary">Capture the employee's core identity, communication, and work assignment details.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {isDirty ? <Typography color="warning.main">Unsaved changes</Typography> : null}
          <Button variant="outlined" onClick={() => reset(initialValues)} disabled={blnIsSaving || blnIsLoading}>
            Reset
          </Button>
          <Button variant="contained" onClick={handleSubmit(handleFormSubmit)} disabled={blnIsSaving || blnIsLoading}>
            {blnIsSaving ? "Saving..." : "Save Basic Info"}
          </Button>
        </Stack>
      </Stack>

      {strMessage ? <Alert severity="info">{strMessage}</Alert> : null}

      <Paper variant="outlined" sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 3 }, borderRadius: 2 }}>
        <Stack spacing={3}>
          <Box>
            <Typography fontWeight={700}>Identity</Typography>
            <Typography variant="body2" color="text.secondary">
              Start with the employee's primary profile and naming information.
            </Typography>
          </Box>
          <Grid container columnSpacing={2.5} rowSpacing={2.5} sx={{ width: "100%", m: 0, alignItems: "stretch" }}>
            <Grid item xs={12} md={4}>
              <Controller
                name="strEmployeeCode"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Employee Code" fullWidth required error={Boolean(errors.strEmployeeCode)} helperText={errors.strEmployeeCode?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Controller
                name="strTitle"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Title" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {lstTitles.map((strTitle) => (
                      <MenuItem key={strTitle} value={strTitle}>
                        {strTitle}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="strFirstName"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="First Name" fullWidth required error={Boolean(errors.strFirstName)} helperText={errors.strFirstName?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller name="strMiddleName" control={control} render={({ field }) => <TextField {...field} label="Middle Name" fullWidth />} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller name="strLastName" control={control} render={({ field }) => <TextField {...field} label="Last Name" fullWidth />} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="dtDateOfBirth"
                control={control}
                render={({ field }) => <TextField {...field} label="Date of Birth" type="date" fullWidth InputLabelProps={{ shrink: true }} />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="strGender"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Gender" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {lstGenders.map((strGender) => (
                      <MenuItem key={strGender} value={strGender}>
                        {strGender}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller name="strMobileNumber" control={control} render={({ field }) => <TextField {...field} label="Mobile Number" fullWidth />} />
            </Grid>
          </Grid>

          <Divider />

          <Box>
            <Typography fontWeight={700}>Work Assignment</Typography>
            <Typography variant="body2" color="text.secondary">
              Define when the employee joined and how they are mapped in the organization.
            </Typography>
          </Box>
          <Grid container columnSpacing={2.5} rowSpacing={2.5} sx={{ width: "100%", m: 0, alignItems: "stretch" }}>
            <Grid item xs={12} md={3}>
              <Controller
                name="dtDateOfJoining"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date of Joining"
                    type="date"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.dtDateOfJoining)}
                    helperText={errors.dtDateOfJoining?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="strEmploymentStatus"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Status" fullWidth required error={Boolean(errors.strEmploymentStatus)} helperText={errors.strEmploymentStatus?.message}>
                    {lstStatuses.map((strStatus) => (
                      <MenuItem key={strStatus} value={strStatus}>
                        {strStatus}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="dtDateOfExit"
                control={control}
                render={({ field }) => <TextField {...field} label="Date of Exit" type="date" fullWidth InputLabelProps={{ shrink: true }} />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name="intEmploymentTypeID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Employment Type" fullWidth required error={Boolean(errors.intEmploymentTypeID)} helperText={errors.intEmploymentTypeID?.message}>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstEmploymentTypes ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intDepartmentID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Department" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstDepartments ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intDesignationID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Designation" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstDesignations ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intManagerEmployeeID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Reporting Manager" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstManagers ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intLocationID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Location" fullWidth required error={Boolean(errors.intLocationID)} helperText={errors.intLocationID?.message}>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstLocations ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intCostCenterID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Cost Center" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstCostCenters ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intGradeID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Grade" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstGrades ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intPayrollGroupID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Payroll Group" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstPayrollGroups ?? [])}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="intPreferredLanguageID"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Preferred Language" fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    {renderSelectOptions(objLookups?.lstLanguages ?? [])}
                  </TextField>
                )}
              />
            </Grid>
          </Grid>

          <Divider />

          <Box>
            <Typography fontWeight={700}>Communication</Typography>
            <Typography variant="body2" color="text.secondary">
              Add work and personal contact channels used for day-to-day communication.
            </Typography>
          </Box>
          <Grid container columnSpacing={2.5} rowSpacing={2.5} sx={{ width: "100%", m: 0, alignItems: "stretch" }}>
            <Grid item xs={12} md={6}>
              <Controller
                name="strWorkEmail"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Work Email" fullWidth error={Boolean(errors.strWorkEmail)} helperText={errors.strWorkEmail?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="strPersonalEmail"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Personal Email" fullWidth error={Boolean(errors.strPersonalEmail)} helperText={errors.strPersonalEmail?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="blnIsEssEnabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} />}
                    label="Enable employee self-service access"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Stack>
      </Paper>
    </Stack>
  );
}
