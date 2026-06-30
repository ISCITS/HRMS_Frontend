"use client";

import PostAddRoundedIcon from "@mui/icons-material/PostAddRounded";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import {
  dicEmptyEmployeeFamilyDetailForm,
  toEmployeeFamilyDetailFormValues
} from "@/features/employee/EmployeeFormUtils";
import { employeeService } from "@/features/employee/services/employeeService";
import type {
  EmployeeFamilyDetailFormValues,
  EmployeeFamilyDetailRecord
} from "@/features/employee/types";
import FamilyForm from "@/features/employee/components/FamilyForm";
import FamilyTable from "@/features/employee/components/FamilyTable";
import { handleSingleDialogActionEnter } from "@/components/common/dialogKeyboard";

type FamilyDetailsTabProps = {
  lstInitialRows: EmployeeFamilyDetailRecord[];
  blnViewOnly: boolean;
  blnCanDelete?: boolean;
  fnEnsureEmployeeRecordForTabSave: () => Promise<number>;
  fnShowAlert: (strSeverity: "success" | "error", strMessage: string) => void;
  fnOnRowsChange: (lstRows: EmployeeFamilyDetailRecord[]) => void;
  fnTranslate: (strKey: string, strFallback?: string) => string;
};

function validateFamilyForm(
  dicForm: EmployeeFamilyDetailFormValues,
  lstExistingRows: EmployeeFamilyDetailRecord[],
  intEditingFamilyID: number | null
) {
  const dicErrors: Partial<Record<keyof EmployeeFamilyDetailFormValues, string>> = {};

  if (!dicForm.strName.trim()) {
    dicErrors.strName = "Name is required.";
  }

  if (dicForm.strContactNumber.trim() && !/^[0-9+\- ]{7,15}$/.test(dicForm.strContactNumber.trim())) {
    dicErrors.strContactNumber = "Contact number must be valid.";
  }

  if (dicForm.blnIsNominee) {
    if (!dicForm.decNomineePercentage.trim()) {
      dicErrors.decNomineePercentage = "Nominee percentage is required.";
    } else {
      const decPercentage = Number(dicForm.decNomineePercentage);
      if (Number.isNaN(decPercentage) || decPercentage < 0 || decPercentage > 100) {
        dicErrors.decNomineePercentage = "Nominee percentage must be between 0 and 100.";
      } else {
        const decExistingTotal = lstExistingRows
          .filter((objItem) => objItem.intID !== intEditingFamilyID && objItem.blnIsNominee)
          .reduce((decTotal, objItem) => decTotal + (objItem.decNomineePercentage ?? 0), 0);
        if (decExistingTotal + decPercentage > 100) {
          dicErrors.blnIsNominee = "Total nominee percentage across family members cannot exceed 100.";
        }
      }
    }
  }

  return dicErrors;
}

export default function FamilyDetailsTab({
  lstInitialRows,
  blnViewOnly,
  blnCanDelete = false,
  fnEnsureEmployeeRecordForTabSave,
  fnShowAlert,
  fnOnRowsChange,
  fnTranslate
}: FamilyDetailsTabProps) {
  const t = fnTranslate;
  const [lstRows, setLstRows] = useState<EmployeeFamilyDetailRecord[]>([]);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strMode, setStrMode] = useState<"add" | "edit">("add");
  const [intEditingFamilyID, setIntEditingFamilyID] = useState<number | null>(null);
  const [dicForm, setDicForm] = useState<EmployeeFamilyDetailFormValues>(dicEmptyEmployeeFamilyDetailForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof EmployeeFamilyDetailFormValues, string>>>({});
  const [objDeleteDialog, setObjDeleteDialog] = useState<{ blnOpen: boolean; intFamilyID: number | null; strName: string }>({
    blnOpen: false,
    intFamilyID: null,
    strName: ""
  });

  useEffect(() => {
    setLstRows(lstInitialRows);
  }, [lstInitialRows]);

  const decNomineeTotal = useMemo(
    () => lstRows.filter((objItem) => objItem.blnIsNominee).reduce((decTotal, objItem) => decTotal + (objItem.decNomineePercentage ?? 0), 0),
    [lstRows]
  );

  function updateRows(lstNextRows: EmployeeFamilyDetailRecord[]) {
    setLstRows(lstNextRows);
    fnOnRowsChange(lstNextRows);
  }

  function openAddDialog() {
    setStrMode("add");
    setIntEditingFamilyID(null);
    setDicForm(dicEmptyEmployeeFamilyDetailForm);
    setDicErrors({});
    setBlnDialogOpen(true);
  }

  function openEditDialog(objRecord: EmployeeFamilyDetailRecord) {
    setStrMode("edit");
    setIntEditingFamilyID(objRecord.intID);
    setDicForm(toEmployeeFamilyDetailFormValues(objRecord));
    setDicErrors({});
    setBlnDialogOpen(true);
  }

  function closeDialog() {
    setBlnDialogOpen(false);
  }

  function updateField<TKey extends keyof EmployeeFamilyDetailFormValues>(
    strField: TKey,
    objValue: EmployeeFamilyDetailFormValues[TKey]
  ) {
    setDicErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      [strField]: strField === "decNomineePercentage" ? String(objValue).replace(/[^0-9.]/g, "") : objValue
    }));
  }

  async function handleSubmit() {
    const dicValidationErrors = validateFamilyForm(dicForm, lstRows, intEditingFamilyID);
    setDicErrors({
      ...dicValidationErrors,
      strName: dicValidationErrors.strName ? t("validation_family_name_required", "Name is required.") : undefined,
      strContactNumber: dicValidationErrors.strContactNumber ? t("validation_family_contact_invalid", "Contact number must be valid.") : undefined,
      decNomineePercentage: dicValidationErrors.decNomineePercentage === "Nominee percentage is required."
        ? t("validation_family_nominee_required", "Nominee percentage is required.")
        : dicValidationErrors.decNomineePercentage
          ? t("validation_family_nominee_invalid", "Nominee percentage must be between 0 and 100.")
          : undefined,
      blnIsNominee: dicValidationErrors.blnIsNominee ? t("validation_family_nominee_total_invalid", "Total nominee percentage across family members cannot exceed 100.") : undefined
    });
    if (Object.keys(dicValidationErrors).length > 0) {
      return;
    }
    setBlnSaving(true);
    try {
      const intEmployeeIDToSave = await fnEnsureEmployeeRecordForTabSave();
      const dicSavedRecord = strMode === "edit" && intEditingFamilyID
        ? await employeeService.updateEmployeeFamilyDetail(intEditingFamilyID, dicForm)
        : await employeeService.createEmployeeFamilyDetail(intEmployeeIDToSave, dicForm);
      const lstNextRows = ((lstPrevious: EmployeeFamilyDetailRecord[]) => {
        const lstWithoutCurrent = lstPrevious.filter((objItem) => objItem.intID !== dicSavedRecord.intID);
        return [dicSavedRecord, ...lstWithoutCurrent];
      })(lstRows);
      updateRows(lstNextRows);
      setBlnDialogOpen(false);
      fnShowAlert("success", t("family_save_success", "Employee family detail saved successfully."));
    } catch (objError) {
      fnShowAlert("error", objError instanceof Error ? objError.message : t("error_save_family", "Unable to save family detail."));
    } finally {
      setBlnSaving(false);
    }
  }

  function handleDeleteRequest(intFamilyID: number) {
    const objRecord = lstRows.find((objItem) => objItem.intID === intFamilyID);
    setObjDeleteDialog({
      blnOpen: true,
      intFamilyID,
      strName: objRecord?.strName ?? ""
    });
  }

  function closeDeleteDialog() {
    setObjDeleteDialog({
      blnOpen: false,
      intFamilyID: null,
      strName: ""
    });
  }

  async function handleDeleteConfirm() {
    if (!objDeleteDialog.intFamilyID) {
      return;
    }
    try {
      await employeeService.deleteEmployeeFamilyDetail(objDeleteDialog.intFamilyID);
      updateRows(lstRows.filter((objItem) => objItem.intID !== objDeleteDialog.intFamilyID));
      closeDeleteDialog();
      fnShowAlert("success", t("family_delete_success", "Employee family detail deleted successfully."));
    } catch (objError) {
      fnShowAlert("error", objError instanceof Error ? objError.message : t("error_delete_family", "Unable to delete family detail."));
    }
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{t("section_family_details", "Family Details")}</Typography>
          <Typography sx={{ mt: 0.5, color: "#64748b" }}>
            {t("section_family_details_help", "Manage dependents, nominees, and contact details for employee family members.")}
          </Typography>
          <Typography sx={{ mt: 0.75, color: "#475569", fontSize: "0.85rem" }}>
            {t("family_nominee_total", "Current nominee total")}: {decNomineeTotal.toFixed(2)}%
          </Typography>
        </Box>
        {!blnViewOnly ? (
          <Button
            controlId="employee.family.add.button"
            className={styles.primaryButton}
            size="small"
            variant="contained"
            startIcon={<PostAddRoundedIcon />}
            onClick={openAddDialog}
            sx={{ borderRadius: "14px", px: 2, minHeight: 32, height: 32, py: 0 }}
          >
            {t("add_family_member", "Add Family Member")}
          </Button>
        ) : null}
      </Stack>

      <FamilyTable
        lstRows={lstRows}
        blnViewOnly={blnViewOnly}
        blnCanDelete={blnCanDelete}
        fnOnEdit={openEditDialog}
        fnOnDelete={handleDeleteRequest}
        fnTranslate={t}
      />

      <FamilyForm
        blnOpen={blnDialogOpen}
        strMode={strMode}
        dicValues={dicForm}
        dicErrors={dicErrors}
        blnSaving={blnSaving}
        fnOnClose={closeDialog}
        fnOnChange={updateField}
        fnOnSubmit={handleSubmit}
        fnTranslate={t}
      />

      <Dialog
        open={objDeleteDialog.blnOpen}
        onClose={closeDeleteDialog}
        onKeyDown={handleSingleDialogActionEnter}
        fullWidth
        maxWidth="xs"
        controlId="employee.family.delete.dialog"
      >
        <DialogTitle>{t("family_delete_title", "Delete Family Member")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            {objDeleteDialog.strName
              ? t("family_delete_confirm_named", `This will delete ${objDeleteDialog.strName}'s family detail record.`)
              : t("family_delete_confirm_generic", "This will delete the selected family detail record.")}{" "}
            {t("confirm_continue", "Continue?")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} controlId="employee.family.delete.cancel.button">{t("cancel", "Cancel")}</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" controlId="employee.family.delete.confirm.button">
            {t("delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
