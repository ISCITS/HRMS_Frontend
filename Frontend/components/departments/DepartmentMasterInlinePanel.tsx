"use client";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { Dispatch, ReactNode, SetStateAction, useMemo, useRef, useState } from "react";
import CommonDataGrid, { DataGridColumn } from "@/components/common/CommonDataGrid";
import dicConstant from "@/constants/Constant.json";

type DepartmentInlineStatus = "Active" | "Inactive";

type DepartmentInlineFormValues = {
  code: string;
  name: string;
  manager: string;
  status: DepartmentInlineStatus;
};

type DepartmentInlineRecord = {
  id: string;
  code: string;
  name: string;
  manager: string;
  status: DepartmentInlineStatus;
  employeeCount: number;
};

type DepartmentInlineGridRow = {
  id: string;
  code: ReactNode;
  name: ReactNode;
  manager: ReactNode;
  status: ReactNode;
  employeeCount: ReactNode;
  action: ReactNode;
};

// Provides inline table-row add/edit operations for Department Master.
export default function DepartmentMasterInlinePanel() {
  // Functional responsibility:
  // - Render department master grid with add/edit performed directly in table rows.
  // Inputs:
  // - Local in-memory department list and row editor form states.
  // Output:
  // - Inline editable grid with validated save/cancel actions.
  // Failure behavior:
  // - Invalid/duplicate values block save, show field errors, and focus first invalid input.
  const [lstDepartments, setLstDepartments] = useState<DepartmentInlineRecord[]>([
    { id: "D001", code: "ENG", name: "Engineering", manager: "Ava Johnson", status: "Active", employeeCount: 42 },
    { id: "D002", code: "HRA", name: "Human Resources", manager: "Liam Smith", status: "Active", employeeCount: 11 },
    { id: "D003", code: "FIN", name: "Finance", manager: "Noah Davis", status: "Active", employeeCount: 9 }
  ]);
  const [intNextDepartmentId, setIntNextDepartmentId] = useState(4);
  const [strEditingDepartmentId, setStrEditingDepartmentId] = useState("");
  const [intIsAddingDepartment, setIntIsAddingDepartment] = useState(0);
  const [dicEditValues, setDicEditValues] = useState<DepartmentInlineFormValues>({
    code: "",
    name: "",
    manager: "",
    status: "Active"
  });
  const [dicNewValues, setDicNewValues] = useState<DepartmentInlineFormValues>({
    code: "",
    name: "",
    manager: "",
    status: "Active"
  });
  const [dicFieldErrors, setDicFieldErrors] = useState<Record<string, string>>({});

  const dicFieldRefs = {
    code: useRef<HTMLInputElement | null>(null),
    name: useRef<HTMLInputElement | null>(null),
    manager: useRef<HTMLInputElement | null>(null),
    status: useRef<HTMLInputElement | null>(null)
  };

  const validateDepartmentValues = (
    dicValues: DepartmentInlineFormValues,
    strCurrentDepartmentId: string
  ) => {
    const dicErrors: Record<string, string> = {};
    const strCodeUpper = dicValues.code.trim().toUpperCase();
    const strNameTrimmed = dicValues.name.trim();
    const strManagerTrimmed = dicValues.manager.trim();
    const strCodePattern = /^[A-Z0-9-]{2,20}$/;

    if (!strCodeUpper) {
      dicErrors.code = dicConstant.departments.validation.codeRequired;
    } else if (!strCodePattern.test(strCodeUpper)) {
      dicErrors.code = dicConstant.departments.validation.codeFormat;
    }

    if (!strNameTrimmed) {
      dicErrors.name = dicConstant.departments.validation.nameRequired;
    } else if (strNameTrimmed.length < 3) {
      dicErrors.name = dicConstant.departments.validation.nameMin;
    }

    if (!strManagerTrimmed) {
      dicErrors.manager = dicConstant.departments.validation.managerRequired;
    } else if (strManagerTrimmed.length < 3) {
      dicErrors.manager = dicConstant.departments.validation.managerMin;
    }

    if (!dicValues.status) {
      dicErrors.status = dicConstant.departments.validation.statusRequired;
    }

    const intHasCodeDuplicate = lstDepartments.some(
      (dicDepartment) =>
        dicDepartment.code.toUpperCase() === strCodeUpper &&
        dicDepartment.id !== strCurrentDepartmentId
    )
      ? 1
      : 0;
    if (intHasCodeDuplicate === 1) {
      dicErrors.code = dicConstant.departments.validation.codeDuplicate;
    }

    const intHasNameDuplicate = lstDepartments.some(
      (dicDepartment) =>
        dicDepartment.name.trim().toLowerCase() === strNameTrimmed.toLowerCase() &&
        dicDepartment.id !== strCurrentDepartmentId
    )
      ? 1
      : 0;
    if (intHasNameDuplicate === 1) {
      dicErrors.name = dicConstant.departments.validation.nameDuplicate;
    }

    return dicErrors;
  };

  const focusFirstInvalidField = (dicErrors: Record<string, string>) => {
    const lstErrorPriority = ["code", "name", "manager", "status"] as const;
    const strFirstInvalidField = lstErrorPriority.find((strField) => Boolean(dicErrors[strField]));
    if (strFirstInvalidField) {
      dicFieldRefs[strFirstInvalidField].current?.focus();
    }
  };

  const handleAddClick = () => {
    setStrEditingDepartmentId("");
    setIntIsAddingDepartment(1);
    setDicFieldErrors({});
    setDicNewValues({
      code: "",
      name: "",
      manager: "",
      status: "Active"
    });
  };

  const handleEditClick = (dicDepartment: DepartmentInlineRecord) => {
    setIntIsAddingDepartment(0);
    setDicFieldErrors({});
    setStrEditingDepartmentId(dicDepartment.id);
    setDicEditValues({
      code: dicDepartment.code,
      name: dicDepartment.name,
      manager: dicDepartment.manager,
      status: dicDepartment.status
    });
  };

  const handleCancelInline = () => {
    setIntIsAddingDepartment(0);
    setStrEditingDepartmentId("");
    setDicFieldErrors({});
  };

  const handleSaveNew = () => {
    const dicErrors = validateDepartmentValues(dicNewValues, "");
    setDicFieldErrors(dicErrors);
    if (Object.keys(dicErrors).length > 0) {
      focusFirstInvalidField(dicErrors);
      return;
    }

    const strNewDepartmentId = `D${String(intNextDepartmentId).padStart(3, "0")}`;
    const dicNewRecord: DepartmentInlineRecord = {
      id: strNewDepartmentId,
      code: dicNewValues.code.trim().toUpperCase(),
      name: dicNewValues.name.trim(),
      manager: dicNewValues.manager.trim(),
      status: dicNewValues.status,
      employeeCount: 0
    };
    setLstDepartments((lstPrev) => [dicNewRecord, ...lstPrev]);
    setIntNextDepartmentId((intPrev) => intPrev + 1);
    setIntIsAddingDepartment(0);
    setDicFieldErrors({});
  };

  const handleSaveEdit = () => {
    const dicErrors = validateDepartmentValues(dicEditValues, strEditingDepartmentId);
    setDicFieldErrors(dicErrors);
    if (Object.keys(dicErrors).length > 0) {
      focusFirstInvalidField(dicErrors);
      return;
    }

    setLstDepartments((lstPrev) =>
      lstPrev.map((dicDepartment) => {
        if (dicDepartment.id !== strEditingDepartmentId) {
          return dicDepartment;
        }
        return {
          ...dicDepartment,
          code: dicEditValues.code.trim().toUpperCase(),
          name: dicEditValues.name.trim(),
          manager: dicEditValues.manager.trim(),
          status: dicEditValues.status
        };
      })
    );
    setStrEditingDepartmentId("");
    setDicFieldErrors({});
  };

  const renderEditableTextField = (
    strField: keyof DepartmentInlineFormValues,
    dicValues: DepartmentInlineFormValues,
    setDicValues: Dispatch<SetStateAction<DepartmentInlineFormValues>>,
    intIsStatusField = 0
  ) => {
    const clearInlineFieldError = (strErrorField: keyof DepartmentInlineFormValues) => {
      if (!dicFieldErrors[strErrorField]) {
        return;
      }
      setDicFieldErrors((dicPrev) => ({ ...dicPrev, [strErrorField]: "" }));
    };

    if (intIsStatusField === 1) {
      return (
        <TextField
          id={`department-inline-${strField}`}
          select
          fullWidth
          value={dicValues[strField]}
          onChange={(event) =>
            {
              clearInlineFieldError(strField);
              setDicValues((dicPrev) => ({
                ...dicPrev,
                [strField]: event.target.value as DepartmentInlineStatus
              }));
            }
          }
          error={Boolean(dicFieldErrors[strField])}
          helperText={dicFieldErrors[strField]}
          inputRef={dicFieldRefs[strField]}
        >
          <MenuItem value={dicConstant.common.statusActive}>{dicConstant.common.statusActive}</MenuItem>
          <MenuItem value={dicConstant.common.statusInactive}>{dicConstant.common.statusInactive}</MenuItem>
        </TextField>
      );
    }

    return (
      <TextField
        id={`department-inline-${strField}`}
        fullWidth
        value={dicValues[strField]}
        onChange={(event) =>
          {
            clearInlineFieldError(strField);
            setDicValues((dicPrev) => ({
              ...dicPrev,
              [strField]: strField === "code" ? event.target.value.toUpperCase() : event.target.value
            }));
          }
        }
        error={Boolean(dicFieldErrors[strField])}
        helperText={dicFieldErrors[strField]}
        inputRef={dicFieldRefs[strField]}
      />
    );
  };

  const lstGridRows: DepartmentInlineGridRow[] = useMemo(() => {
    const lstRows: DepartmentInlineGridRow[] = lstDepartments.map((dicDepartment) => {
      const intIsEditingRow = strEditingDepartmentId === dicDepartment.id ? 1 : 0;
      return {
        id: dicDepartment.id,
        code: intIsEditingRow ? renderEditableTextField("code", dicEditValues, setDicEditValues) : dicDepartment.code,
        name: intIsEditingRow ? renderEditableTextField("name", dicEditValues, setDicEditValues) : dicDepartment.name,
        manager: intIsEditingRow
          ? renderEditableTextField("manager", dicEditValues, setDicEditValues)
          : dicDepartment.manager,
        status: intIsEditingRow
          ? renderEditableTextField("status", dicEditValues, setDicEditValues, 1)
          : dicDepartment.status,
        employeeCount: dicDepartment.employeeCount,
        action: intIsEditingRow ? (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={handleSaveEdit}>
              {dicConstant.common.save}
            </Button>
            <Button size="small" variant="outlined" onClick={handleCancelInline}>
              {dicConstant.common.cancel}
            </Button>
          </Stack>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={() => handleEditClick(dicDepartment)}
            disabled={intIsAddingDepartment === 1}
          >
            {dicConstant.departments.editButton}
          </Button>
        )
      };
    });

    if (intIsAddingDepartment === 1) {
      lstRows.unshift({
        id: "NEW",
        code: renderEditableTextField("code", dicNewValues, setDicNewValues),
        name: renderEditableTextField("name", dicNewValues, setDicNewValues),
        manager: renderEditableTextField("manager", dicNewValues, setDicNewValues),
        status: renderEditableTextField("status", dicNewValues, setDicNewValues, 1),
        employeeCount: "-",
        action: (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={handleSaveNew}>
              {dicConstant.common.save}
            </Button>
            <Button size="small" variant="outlined" onClick={handleCancelInline}>
              {dicConstant.common.cancel}
            </Button>
          </Stack>
        )
      });
    }

    return lstRows;
  }, [lstDepartments, strEditingDepartmentId, dicEditValues, intIsAddingDepartment, dicNewValues, dicFieldErrors]);

  const lstGridColumns: DataGridColumn<DepartmentInlineGridRow>[] = [
    { field: "id", headerName: dicConstant.departments.grid.id, sortable: false, filterable: false },
    { field: "code", headerName: dicConstant.departments.grid.code, sortable: false, filterable: false },
    { field: "name", headerName: dicConstant.departments.grid.name, sortable: false, filterable: false },
    { field: "manager", headerName: dicConstant.departments.grid.manager, sortable: false, filterable: false },
    { field: "status", headerName: dicConstant.departments.grid.status, sortable: false, filterable: false },
    { field: "employeeCount", headerName: dicConstant.departments.grid.employees, sortable: false, filterable: false },
    { field: "action", headerName: dicConstant.departments.grid.action, sortable: false, filterable: false, exportable: false }
  ];

  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {dicConstant.departments.inlinePageTitle}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <CommonDataGrid
          columns={lstGridColumns}
          rows={lstGridRows}
          rowIdField="id"
          withPaper={false}
          defaultPageSize={10}
          toolbarLeft={
            <Button
              variant="contained"
              onClick={handleAddClick}
              disabled={intIsAddingDepartment === 1 || Boolean(strEditingDepartmentId)}
            >
              {dicConstant.departments.inlineAddButton}
            </Button>
          }
        />
      </Paper>
    </>
  );
}
