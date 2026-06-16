"use client";

import { Box, Button, Stack, TextField } from "@mui/material";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import dicConstant from "@/constants/Constant.json";
import styles from "./EmployeeForm.module.css";

type EmployeeFormValues = {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  status?: string;
};

type EmployeeFormProps = {
  initialValues?: EmployeeFormValues;
  submitLabel: string;
  cancelHref: string;
};

// Renders the create/edit employee input form.
export default function EmployeeForm({ initialValues, submitLabel, cancelHref }: EmployeeFormProps) {
  const dicInitialValues = {
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    role: initialValues?.role ?? "",
    department: initialValues?.department ?? "",
    status: initialValues?.status ?? "Active"
  };

  const [dicFormValues, setDicFormValues] = useState(dicInitialValues);
  const [dicFormErrors, setDicFormErrors] = useState<Record<string, string>>({});
  const dicInputRefs = {
    name: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    role: useRef<HTMLInputElement | null>(null),
    department: useRef<HTMLInputElement | null>(null),
    status: useRef<HTMLInputElement | null>(null)
  };

  // Validates employee form values and returns field-wise error messages.
  const validateForm = () => {
    const dicErrors: Record<string, string> = {};
    const strEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!dicFormValues.name.trim()) {
      dicErrors.name = dicConstant.employees.form.fullNameRequired;
    }
    if (!dicFormValues.email.trim()) {
      dicErrors.email = dicConstant.employees.form.emailRequired;
    } else if (!strEmailPattern.test(dicFormValues.email.trim())) {
      dicErrors.email = dicConstant.employees.form.emailInvalid;
    }
    if (!dicFormValues.role.trim()) {
      dicErrors.role = dicConstant.employees.form.roleRequired;
    }
    if (!dicFormValues.department.trim()) {
      dicErrors.department = dicConstant.employees.form.departmentRequired;
    }
    if (!dicFormValues.status.trim()) {
      dicErrors.status = dicConstant.employees.form.statusRequired;
    }

    return dicErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dicValidationErrors = validateForm();
    setDicFormErrors(dicValidationErrors);
    if (Object.keys(dicValidationErrors).length > 0) {
      const lstErrorPriority: Array<keyof typeof dicInputRefs> = ["name", "email", "role", "department", "status"];
      const strFirstErrorField = lstErrorPriority.find((strField) => Boolean(dicValidationErrors[strField]));
      if (strFirstErrorField) {
        dicInputRefs[strFirstErrorField].current?.focus();
      }
      return;
    }
  };

  const clearFieldError = (strField: keyof EmployeeFormValues) => {
    if (!dicFormErrors[strField]) {
      return;
    }
    setDicFormErrors((dicPrev) => ({ ...dicPrev, [strField]: "" }));
  };

  /*
  Functional responsibility:
  - Render employee create/edit form fields in a responsive two-column layout.
  
  Inputs:
  - optional initialValues for edit mode and submitLabel for CTA text.
  
  Output:
  - Form UI for employee details + status selection.
  
  Failure behavior:
  - Form submit is blocked when validation fails and field-level errors are shown.
  */
  return (
    <Stack component="form" spacing={3} onSubmit={handleSubmit} noValidate>
      <Box className={styles.formGrid}>
        <Box>
          <TextField
            id="employee-full-name"
            label={dicConstant.employees.form.fullName}
            inputProps={{ "data-testid": "employee.form.full-name.input" }}
            fullWidth
            required
            value={dicFormValues.name}
            inputRef={dicInputRefs.name}
            onChange={(event) => {
              clearFieldError("name");
              setDicFormValues((prev) => ({ ...prev, name: event.target.value }));
            }}
            error={Boolean(dicFormErrors.name)}
            helperText={dicFormErrors.name}
          />
        </Box>
        <Box>
          <TextField
            id="employee-email"
            label={dicConstant.employees.form.email}
            type="email"
            inputProps={{ "data-testid": "employee.form.email.input" }}
            fullWidth
            required
            value={dicFormValues.email}
            inputRef={dicInputRefs.email}
            onChange={(event) => {
              clearFieldError("email");
              setDicFormValues((prev) => ({ ...prev, email: event.target.value }));
            }}
            error={Boolean(dicFormErrors.email)}
            helperText={dicFormErrors.email}
          />
        </Box>
        <Box>
          <TextField
            id="employee-role"
            label={dicConstant.employees.form.role}
            inputProps={{ "data-testid": "employee.form.role.input" }}
            fullWidth
            required
            value={dicFormValues.role}
            inputRef={dicInputRefs.role}
            onChange={(event) => {
              clearFieldError("role");
              setDicFormValues((prev) => ({ ...prev, role: event.target.value }));
            }}
            error={Boolean(dicFormErrors.role)}
            helperText={dicFormErrors.role}
          />
        </Box>
        <Box>
          <TextField
            id="employee-department"
            label={dicConstant.employees.form.department}
            inputProps={{ "data-testid": "employee.form.department.input" }}
            fullWidth
            required
            value={dicFormValues.department}
            inputRef={dicInputRefs.department}
            onChange={(event) => {
              clearFieldError("department");
              setDicFormValues((prev) => ({ ...prev, department: event.target.value }));
            }}
            error={Boolean(dicFormErrors.department)}
            helperText={dicFormErrors.department}
          />
        </Box>
        <Box className={styles.statusField}>
          <TextField
            id="employee-status"
            select
            SelectProps={{ native: true, inputProps: { "data-testid": "employee.form.status.select" } }}
            label={dicConstant.employees.form.status}
            fullWidth
            value={dicFormValues.status}
            inputRef={dicInputRefs.status}
            onChange={(event) => {
              clearFieldError("status");
              setDicFormValues((prev) => ({ ...prev, status: event.target.value }));
            }}
            error={Boolean(dicFormErrors.status)}
            helperText={dicFormErrors.status}
          >
            <option value={dicConstant.common.statusActive}>{dicConstant.common.statusActive}</option>
            <option value={dicConstant.common.statusInactive}>{dicConstant.common.statusInactive}</option>
          </TextField>
        </Box>
      </Box>
      <Stack direction="row" className={styles.actionsRow}>
        <Button data-testid="employee.form.cancel.button" component={Link} href={cancelHref} variant="text">
          {dicConstant.common.cancel}
        </Button>
        <Button data-testid="employee.form.submit.button" type="submit" variant="contained">
          {submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
