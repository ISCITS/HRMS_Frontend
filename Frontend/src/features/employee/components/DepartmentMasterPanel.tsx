"use client";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { ReactNode, useMemo, useState } from "react";
import * as yup from "yup";
import CommonDataGrid, { DataGridColumn } from "@/components/ui/CommonDataGrid";
import dicConstant from "@/constants/Constant.json";

type DepartmentStatus = "Active" | "Inactive";

type DepartmentFormValues = {
  code: string;
  name: string;
  manager: string;
  status: DepartmentStatus;
};

type DepartmentRecord = {
  id: string;
  code: string;
  name: string;
  manager: string;
  status: DepartmentStatus;
  employeeCount: number;
};

type DepartmentGridRow = DepartmentRecord & {
  action: ReactNode;
};

const clsDepartmentSchema: yup.ObjectSchema<DepartmentFormValues> = yup.object({
  code: yup
    .string()
    .required(dicConstant.departments.validation.codeRequired)
    .matches(/^[A-Z0-9-]{2,20}$/, dicConstant.departments.validation.codeFormat),
  name: yup
    .string()
    .required(dicConstant.departments.validation.nameRequired)
    .min(3, dicConstant.departments.validation.nameMin),
  manager: yup
    .string()
    .required(dicConstant.departments.validation.managerRequired)
    .min(3, dicConstant.departments.validation.managerMin),
  status: yup
    .mixed<DepartmentStatus>()
    .oneOf([
      dicConstant.common.statusActive as DepartmentStatus,
      dicConstant.common.statusInactive as DepartmentStatus
    ])
    .required(dicConstant.departments.validation.statusRequired)
});

// Manages department master listing with add/edit dialog and validation.
export default function DepartmentMasterPanel() {
  /*
  Functional responsibility:
  - Provide department master CRUD-like UX for add/edit on a grid-backed list.
  
  Inputs:
  - Uses in-memory department list state and dialog form values.
  
  Output:
  - Renders searchable/sortable/paginated department grid + add/edit dialog.
  
  Failure behavior:
  - Invalid/duplicate form data blocks save and shows field-level errors with focus priority.
  */
  const [lstDepartments, setLstDepartments] = useState<DepartmentRecord[]>([
    { id: "D001", code: "ENG", name: "Engineering", manager: "Ava Johnson", status: "Active", employeeCount: 42 },
    { id: "D002", code: "HRA", name: "Human Resources", manager: "Liam Smith", status: "Active", employeeCount: 11 },
    { id: "D003", code: "FIN", name: "Finance", manager: "Noah Davis", status: "Active", employeeCount: 9 }
  ]);
  const [intNextDepartmentId, setIntNextDepartmentId] = useState(4);
  const [intIsDialogOpen, setIntIsDialogOpen] = useState(0);
  const [strDialogMode, setStrDialogMode] = useState<"add" | "edit">("add");
  const [strEditingDepartmentId, setStrEditingDepartmentId] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isSubmitting }
  } = useForm<DepartmentFormValues>({
    resolver: yupResolver(clsDepartmentSchema),
    defaultValues: {
      code: "",
      name: "",
      manager: "",
      status: "Active"
    }
  });

  const openAddDialog = () => {
    setStrDialogMode("add");
    setStrEditingDepartmentId("");
    reset({
      code: "",
      name: "",
      manager: "",
      status: "Active"
    });
    setIntIsDialogOpen(1);
  };

  const openEditDialog = (dicDepartment: DepartmentRecord) => {
    setStrDialogMode("edit");
    setStrEditingDepartmentId(dicDepartment.id);
    reset({
      code: dicDepartment.code,
      name: dicDepartment.name,
      manager: dicDepartment.manager,
      status: dicDepartment.status
    });
    setIntIsDialogOpen(1);
  };

  const closeDialog = () => {
    setIntIsDialogOpen(0);
  };

  const onValidSubmit: SubmitHandler<DepartmentFormValues> = async (dicFormData) => {
    const strCodeUpper = dicFormData.code.trim().toUpperCase();
    const strNameTrimmed = dicFormData.name.trim();
    const strManagerTrimmed = dicFormData.manager.trim();

    const intHasCodeDuplicate = lstDepartments.some(
      (dicDepartment) =>
        dicDepartment.code.toUpperCase() === strCodeUpper &&
        dicDepartment.id !== strEditingDepartmentId
    )
      ? 1
      : 0;
    if (intHasCodeDuplicate === 1) {
      setError("code", { message: dicConstant.departments.validation.codeDuplicate });
      setFocus("code");
      return;
    }

    const intHasNameDuplicate = lstDepartments.some(
      (dicDepartment) =>
        dicDepartment.name.trim().toLowerCase() === strNameTrimmed.toLowerCase() &&
        dicDepartment.id !== strEditingDepartmentId
    )
      ? 1
      : 0;
    if (intHasNameDuplicate === 1) {
      setError("name", { message: dicConstant.departments.validation.nameDuplicate });
      setFocus("name");
      return;
    }

    if (strDialogMode === "add") {
      const strNewDepartmentId = `D${String(intNextDepartmentId).padStart(3, "0")}`;
      const dicNewDepartment: DepartmentRecord = {
        id: strNewDepartmentId,
        code: strCodeUpper,
        name: strNameTrimmed,
        manager: strManagerTrimmed,
        status: dicFormData.status,
        employeeCount: 0
      };
      setLstDepartments((lstPrev) => [dicNewDepartment, ...lstPrev]);
      setIntNextDepartmentId((intPrev) => intPrev + 1);
      closeDialog();
      return;
    }

    setLstDepartments((lstPrev) =>
      lstPrev.map((dicDepartment) => {
        if (dicDepartment.id !== strEditingDepartmentId) {
          return dicDepartment;
        }
        return {
          ...dicDepartment,
          code: strCodeUpper,
          name: strNameTrimmed,
          manager: strManagerTrimmed,
          status: dicFormData.status
        };
      })
    );
    closeDialog();
  };

  const onInvalidSubmit: SubmitErrorHandler<DepartmentFormValues> = (dicErrors) => {
    const lstErrorPriority: Array<keyof DepartmentFormValues> = ["code", "name", "manager", "status"];
    const strFirstErrorField = lstErrorPriority.find((strField) => Boolean(dicErrors[strField]));
    if (strFirstErrorField) {
      setFocus(strFirstErrorField);
    }
  };

  const lstGridRows: DepartmentGridRow[] = useMemo(
    () =>
      lstDepartments.map((dicDepartment) => ({
        ...dicDepartment,
        action: (
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={() => openEditDialog(dicDepartment)}
          >
            {dicConstant.departments.editButton}
          </Button>
        )
      })),
    [lstDepartments]
  );

  const lstGridColumns: DataGridColumn<DepartmentGridRow>[] = [
    { field: "id", headerName: dicConstant.departments.grid.id },
    { field: "code", headerName: dicConstant.departments.grid.code },
    { field: "name", headerName: dicConstant.departments.grid.name },
    { field: "manager", headerName: dicConstant.departments.grid.manager },
    { field: "status", headerName: dicConstant.departments.grid.status },
    { field: "employeeCount", headerName: dicConstant.departments.grid.employees },
    { field: "action", headerName: dicConstant.departments.grid.action, sortable: false, filterable: false, exportable: false }
  ];

  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {dicConstant.departments.pageTitle}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <CommonDataGrid
          columns={lstGridColumns}
          rows={lstGridRows}
          rowIdField="id"
          withPaper={false}
          showExportOptions
          exportFileName="department-master"
          toolbarLeft={
            <Button variant="contained" onClick={openAddDialog}>
              {dicConstant.departments.addButton}
            </Button>
          }
        />
      </Paper>

      <Dialog
        open={Boolean(intIsDialogOpen)}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="department-dialog-title"
      >
        <DialogTitle id="department-dialog-title">
          {strDialogMode === "add" ? dicConstant.departments.dialogAddTitle : dicConstant.departments.dialogEditTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="department-code"
                  label={dicConstant.departments.fields.code}
                  required
                  fullWidth
                  onChange={(event) => {
                    clearErrors("code");
                    field.onChange(event.target.value.toUpperCase());
                  }}
                  error={Boolean(errors.code)}
                  helperText={errors.code?.message}
                />
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="department-name"
                  label={dicConstant.departments.fields.name}
                  required
                  fullWidth
                  onChange={(event) => {
                    clearErrors("name");
                    field.onChange(event);
                  }}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="manager"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="department-manager"
                  label={dicConstant.departments.fields.manager}
                  required
                  fullWidth
                  onChange={(event) => {
                    clearErrors("manager");
                    field.onChange(event);
                  }}
                  error={Boolean(errors.manager)}
                  helperText={errors.manager?.message}
                />
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="department-status"
                  label={dicConstant.departments.fields.status}
                  select
                  required
                  fullWidth
                  onChange={(event) => {
                    clearErrors("status");
                    field.onChange(event);
                  }}
                  error={Boolean(errors.status)}
                  helperText={errors.status?.message}
                >
                  <MenuItem value={dicConstant.common.statusActive}>{dicConstant.common.statusActive}</MenuItem>
                  <MenuItem value={dicConstant.common.statusInactive}>{dicConstant.common.statusInactive}</MenuItem>
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{dicConstant.common.cancel}</Button>
          <Button
            onClick={handleSubmit(onValidSubmit, onInvalidSubmit)}
            variant="contained"
            disabled={isSubmitting}
          >
            {strDialogMode === "add" ? dicConstant.departments.saveDepartment : dicConstant.departments.updateDepartment}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

