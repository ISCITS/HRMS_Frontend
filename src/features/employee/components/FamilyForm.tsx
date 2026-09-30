"use client";

import type { InputHTMLAttributes } from "react";
import { Box, Button, MenuItem, Switch, TextField, Typography } from "@mui/material";
import type { EmployeeFamilyDetailFormValues, FamilyGender, FamilyRelationship } from "@/features/employee/types";
import styles from "./FamilyDetailsTab.module.css";

type FamilyFormProps = {
  strMode: "add" | "edit";
  dicValues: EmployeeFamilyDetailFormValues;
  dicErrors: Partial<Record<keyof EmployeeFamilyDetailFormValues, string>>;
  blnSaving: boolean;
  fnOnClose: () => void;
  fnOnChange: <TKey extends keyof EmployeeFamilyDetailFormValues>(strField: TKey, objValue: EmployeeFamilyDetailFormValues[TKey]) => void;
  fnOnSubmit: () => void;
  fnTranslate: (strKey: string, strFallback?: string) => string;
};

const relationships: FamilyRelationship[] = ["Father", "Mother", "Spouse", "Child", "Other"];
const genders: FamilyGender[] = ["Male", "Female", "Other"];

export default function FamilyForm({ strMode, dicValues, dicErrors, blnSaving, fnOnClose, fnOnChange, fnOnSubmit, fnTranslate: t }: FamilyFormProps) {
  const fieldSx = { "& .MuiOutlinedInput-root": { height: 36, bgcolor: "#fff", borderRadius: "5px", fontSize: 12 }, "& .MuiFormHelperText-root": { mx: 0, mt: 0.5, fontSize: 11 } };
  const label = (value: string, required = false) => <span>{value}{required && <span className={styles.required}> *</span>}</span>;

  return (
    <Box className={styles.editor} data-controlid="employee.family.inline.editor">
      <Box className={styles.formGrid}>
        <Box className={styles.field}>
          <label htmlFor="family-name">{label(t("field_name", "Full name"), true)}</label>
          <TextField id="family-name" size="small" placeholder={t("family_name_placeholder", "Enter full name")} value={dicValues.strName} onChange={(event) => fnOnChange("strName", event.target.value)} error={Boolean(dicErrors.strName)} helperText={dicErrors.strName} inputProps={{ "data-controlid": "employee.family.name.input" }} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.field}>
          <label htmlFor="family-relationship">{label(t("field_relationship", "Relationship"), true)}</label>
          <TextField id="family-relationship" select size="small" value={dicValues.strRelationship} onChange={(event) => fnOnChange("strRelationship", event.target.value as EmployeeFamilyDetailFormValues["strRelationship"])} error={Boolean(dicErrors.strRelationship)} helperText={dicErrors.strRelationship} inputProps={{ "data-controlid": "employee.family.relationship.select" }} sx={fieldSx} fullWidth SelectProps={{ displayEmpty: true }}>
            <MenuItem value="" disabled>{t("select_relationship", "Select relationship")}</MenuItem>
            {relationships.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
        </Box>
        <Box className={styles.field}>
          <label htmlFor="family-dob">{label(t("field_date_of_birth", "Date of birth"), true)}</label>
          <TextField id="family-dob" type="date" size="small" value={dicValues.dtDateOfBirth} onChange={(event) => fnOnChange("dtDateOfBirth", event.target.value)} error={Boolean(dicErrors.dtDateOfBirth)} helperText={dicErrors.dtDateOfBirth} inputProps={{ "data-controlid": "employee.family.date-of-birth.input" }} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.field}>
          <label htmlFor="family-gender">{label(t("field_gender", "Gender"), true)}</label>
          <TextField id="family-gender" select size="small" value={dicValues.strGender} onChange={(event) => fnOnChange("strGender", event.target.value as EmployeeFamilyDetailFormValues["strGender"])} error={Boolean(dicErrors.strGender)} helperText={dicErrors.strGender} inputProps={{ "data-controlid": "employee.family.gender.select" }} sx={fieldSx} fullWidth SelectProps={{ displayEmpty: true }}>
            <MenuItem value="" disabled>{t("select_gender", "Select gender")}</MenuItem>
            {genders.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
        </Box>
        <Box className={styles.field}>
          <label htmlFor="family-contact">{t("field_contact_number", "Contact number")}</label>
          <TextField id="family-contact" size="small" placeholder={t("family_contact_placeholder", "Enter contact number")} value={dicValues.strContactNumber} onChange={(event) => fnOnChange("strContactNumber", event.target.value)} error={Boolean(dicErrors.strContactNumber)} helperText={dicErrors.strContactNumber} inputProps={{ "data-controlid": "employee.family.contact-number.input" }} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.field}>
          <label htmlFor="family-occupation">{t("field_occupation", "Occupation")}</label>
          <TextField id="family-occupation" size="small" placeholder={t("family_occupation_placeholder", "Enter occupation")} value={dicValues.strOccupation} onChange={(event) => fnOnChange("strOccupation", event.target.value)} inputProps={{ "data-controlid": "employee.family.occupation.input" }} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.toggleField}>
          <label htmlFor="family-dependent">{t("field_dependent", "Dependent")}</label>
          <Box className={styles.switchLine}><Switch id="family-dependent" size="small" checked={dicValues.blnIsDependent} onChange={(_, checked) => fnOnChange("blnIsDependent", checked)} inputProps={{ "data-controlid": "employee.family.dependent.checkbox" } as InputHTMLAttributes<HTMLInputElement>} /></Box>
        </Box>
        <Box className={styles.toggleField}>
          <label htmlFor="family-nominee">{t("field_nominee", "Nominee")}</label>
          <Box className={styles.switchLine}><Switch id="family-nominee" size="small" checked={dicValues.blnIsNominee} onChange={(_, checked) => fnOnChange("blnIsNominee", checked)} inputProps={{ "data-controlid": "employee.family.nominee.checkbox" } as InputHTMLAttributes<HTMLInputElement>} /></Box>
        </Box>
        <Box className={`${styles.field} ${styles.percentageField}`}>
          <label htmlFor="family-percentage">{t("field_nominee_percentage", "Nominee percentage")}</label>
          <TextField id="family-percentage" size="small" placeholder={t("family_percentage_placeholder", "Enter percentage")} value={dicValues.decNomineePercentage} onChange={(event) => fnOnChange("decNomineePercentage", event.target.value)} error={Boolean(dicErrors.decNomineePercentage || dicErrors.blnIsNominee)} helperText={dicErrors.decNomineePercentage || dicErrors.blnIsNominee || t("family_percentage_help", "Enabled when Nominee is selected.")} disabled={!dicValues.blnIsNominee} inputProps={{ "data-controlid": "employee.family.nominee-percentage.input", inputMode: "decimal" }} InputProps={{ endAdornment: <span className={styles.percentSign}>%</span> }} sx={fieldSx} fullWidth />
        </Box>
        <Box className={`${styles.field} ${styles.addressField}`}>
          <label htmlFor="family-address">{t("field_address", "Address")}</label>
          <TextField id="family-address" size="small" placeholder={t("family_address_placeholder", "Enter address (optional)")} value={dicValues.strAddress} onChange={(event) => fnOnChange("strAddress", event.target.value)} inputProps={{ "data-controlid": "employee.family.address.input" }} sx={fieldSx} fullWidth />
        </Box>
      </Box>
      <Box className={styles.infoLine}>
        <span className={styles.infoIcon}>i</span>
        <span>{t("family_nominee_limit_help", "Total nominee allocation across all family members cannot exceed 100%.")}</span>
      </Box>
      <Box className={styles.formFooter}>
        <Typography className={styles.requiredNote}>{t("family_required_note", "Required fields are marked")} <span className={styles.required}>*</span></Typography>
        <Box className={styles.formActions}>
          <Button variant="outlined" size="small" onClick={fnOnClose} data-controlid="employee.family.cancel.button" sx={{ minWidth: 78, textTransform: "none", borderColor: "#7399ff" }}>{t("cancel", "Cancel")}</Button>
          <Button variant="contained" size="small" disableElevation onClick={fnOnSubmit} disabled={blnSaving} data-controlid="employee.family.save.button" sx={{ minWidth: 85, textTransform: "none", bgcolor: "var(--app-primary-color)", "&:hover": { bgcolor: "var(--app-primary-hover-color, var(--app-primary-color))" } }}>{blnSaving ? t("saving", "Saving...") : strMode === "edit" ? t("update", "Update") : t("family_save_line", "Save line")}</Button>
        </Box>
      </Box>
    </Box>
  );
}
