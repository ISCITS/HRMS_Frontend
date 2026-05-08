"use client";

import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField
} from "@mui/material";

import type {
  EmployeeFamilyDetailFormValues,
  FamilyGender,
  FamilyRelationship
} from "@/features/employee/types";
import styles from "@/components/master/MasterScreen.module.css";

type FamilyFormProps = {
  blnOpen: boolean;
  strMode: "add" | "edit";
  dicValues: EmployeeFamilyDetailFormValues;
  dicErrors: Partial<Record<keyof EmployeeFamilyDetailFormValues, string>>;
  blnSaving: boolean;
  fnOnClose: () => void;
  fnOnChange: <TKey extends keyof EmployeeFamilyDetailFormValues>(
    strField: TKey,
    objValue: EmployeeFamilyDetailFormValues[TKey]
  ) => void;
  fnOnSubmit: () => void;
  fnTranslate: (strKey: string, strFallback?: string) => string;
};

const lstRelationships: FamilyRelationship[] = ["Father", "Mother", "Spouse", "Child", "Other"];
const lstGenders: FamilyGender[] = ["Male", "Female", "Other"];

export default function FamilyForm({
  blnOpen,
  strMode,
  dicValues,
  dicErrors,
  blnSaving,
  fnOnClose,
  fnOnChange,
  fnOnSubmit,
  fnTranslate
}: FamilyFormProps) {
  const t = fnTranslate;

  return (
    <Dialog open={blnOpen} onClose={fnOnClose} fullWidth maxWidth="md">
      <DialogTitle>{strMode === "edit" ? t("family_form_edit_title", "Edit Family Member") : t("family_form_add_title", "Add Family Member")}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, pt: 0.5 }}>
          <TextField
            label={t("field_name", "Name")}
            value={dicValues.strName}
            onChange={(objEvent) => fnOnChange("strName", objEvent.target.value)}
            error={Boolean(dicErrors.strName)}
            helperText={dicErrors.strName}
            fullWidth
            required
          />
          <TextField
            label={t("field_relationship", "Relationship")}
            select
            value={dicValues.strRelationship}
            onChange={(objEvent) => fnOnChange("strRelationship", objEvent.target.value as EmployeeFamilyDetailFormValues["strRelationship"])}
            fullWidth
          >
            <MenuItem value="">{t("select_relationship", "Select Relationship")}</MenuItem>
            {lstRelationships.map((strItem) => (
              <MenuItem key={strItem} value={strItem}>{strItem}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("field_date_of_birth", "Date of Birth")}
            type="date"
            value={dicValues.dtDateOfBirth}
            onChange={(objEvent) => fnOnChange("dtDateOfBirth", objEvent.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label={t("field_gender", "Gender")}
            select
            value={dicValues.strGender}
            onChange={(objEvent) => fnOnChange("strGender", objEvent.target.value as EmployeeFamilyDetailFormValues["strGender"])}
            fullWidth
          >
            <MenuItem value="">{t("select_gender", "Select Gender")}</MenuItem>
            {lstGenders.map((strItem) => (
              <MenuItem key={strItem} value={strItem}>{strItem}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("field_contact_number", "Contact Number")}
            value={dicValues.strContactNumber}
            onChange={(objEvent) => fnOnChange("strContactNumber", objEvent.target.value)}
            error={Boolean(dicErrors.strContactNumber)}
            helperText={dicErrors.strContactNumber}
            fullWidth
          />
          <TextField
            label={t("field_occupation", "Occupation")}
            value={dicValues.strOccupation}
            onChange={(objEvent) => fnOnChange("strOccupation", objEvent.target.value)}
            fullWidth
          />
          <TextField
            label={t("field_nominee_percentage", "Nominee Percentage")}
            value={dicValues.decNomineePercentage}
            onChange={(objEvent) => fnOnChange("decNomineePercentage", objEvent.target.value)}
            error={Boolean(dicErrors.decNomineePercentage)}
            helperText={dicErrors.decNomineePercentage}
            fullWidth
            disabled={!dicValues.blnIsNominee}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={dicValues.blnIsDependent} onChange={(_, blnChecked) => fnOnChange("blnIsDependent", blnChecked)} />}
              label={t("field_dependent", "Dependent")}
            />
            <FormControlLabel
              control={<Checkbox checked={dicValues.blnIsNominee} onChange={(_, blnChecked) => fnOnChange("blnIsNominee", blnChecked)} />}
              label={t("field_nominee", "Nominee")}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}>
            <TextField
              label={t("field_address", "Address")}
              value={dicValues.strAddress}
              onChange={(objEvent) => fnOnChange("strAddress", objEvent.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Box>
        </Box>
        {dicErrors.blnIsNominee ? (
          <Stack sx={{ mt: 1 }}>
            <span style={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicErrors.blnIsNominee}</span>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button className={styles.secondaryButton} onClick={fnOnClose}>{t("cancel", "Cancel")}</Button>
        <Button className={styles.primaryButton} onClick={fnOnSubmit} disabled={blnSaving}>
          {blnSaving ? t("saving", "Saving...") : strMode === "edit" ? t("update", "Update") : t("save", "Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
