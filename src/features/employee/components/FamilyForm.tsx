"use client";

import type { InputHTMLAttributes } from "react";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Button, MenuItem, Switch, TextField, Typography } from "@mui/material";
import type { EmployeeFamilyDetailFormValues, FamilyGender, FamilyRelationship } from "@/features/employee/types";
import buttonStyles from "@/components/master/MasterScreen.module.css";
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
const inputLabelProps = { shrink: true } as const;

export default function FamilyForm({ dicValues, dicErrors, blnSaving, fnOnClose, fnOnChange, fnOnSubmit, fnTranslate: t }: FamilyFormProps) {
  const fieldSx = {
    "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: "4px", fontSize: 13 },
    "& .MuiInputBase-input": { fontSize: "13px" },
    "& .MuiInputBase-input::placeholder": { fontSize: "13px", opacity: 1, color: "#94a3b8" },
    "& .MuiFormLabel-asterisk": { color: "#dc2626" },
    "& .MuiFormHelperText-root": { mx: 0, mt: 0.5 },
  };

  return (
    <Box className={styles.editor} data-controlid="employee.family.inline.editor">
      <Box className={styles.formGrid}>
        <Box className={styles.field}>
          <TextField id="family-name" size="small" label={t("field_name", "Full name")} required placeholder={t("family_name_placeholder", "Enter full name")} value={dicValues.strName} onChange={(event) => fnOnChange("strName", event.target.value)} error={Boolean(dicErrors.strName)} helperText={dicErrors.strName} inputProps={{ "data-controlid": "employee.family.name.input" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.field}>
          <TextField id="family-relationship" select size="small" label={t("field_relationship", "Relationship")} required value={dicValues.strRelationship} onChange={(event) => fnOnChange("strRelationship", event.target.value as EmployeeFamilyDetailFormValues["strRelationship"])} error={Boolean(dicErrors.strRelationship)} helperText={dicErrors.strRelationship} inputProps={{ "data-controlid": "employee.family.relationship.select" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth>
            <MenuItem value="" disabled>{t("select_relationship", "Select relationship")}</MenuItem>
            {relationships.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
        </Box>
        <Box className={styles.field}>
          <TextField id="family-dob" type="date" size="small" label={t("field_date_of_birth", "Date of birth")} required value={dicValues.dtDateOfBirth} onChange={(event) => fnOnChange("dtDateOfBirth", event.target.value)} error={Boolean(dicErrors.dtDateOfBirth)} helperText={dicErrors.dtDateOfBirth} inputProps={{ "data-controlid": "employee.family.date-of-birth.input" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.field}>
          <TextField id="family-gender" select size="small" label={t("field_gender", "Gender")} required value={dicValues.strGender} onChange={(event) => fnOnChange("strGender", event.target.value as EmployeeFamilyDetailFormValues["strGender"])} error={Boolean(dicErrors.strGender)} helperText={dicErrors.strGender} inputProps={{ "data-controlid": "employee.family.gender.select" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth>
            <MenuItem value="" disabled>{t("select_gender", "Select gender")}</MenuItem>
            {genders.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
        </Box>
        <Box className={styles.field}>
          <TextField id="family-contact" size="small" label={t("field_contact_number", "Contact number")} placeholder={t("family_contact_placeholder", "Enter contact number")} value={dicValues.strContactNumber} onChange={(event) => fnOnChange("strContactNumber", event.target.value)} error={Boolean(dicErrors.strContactNumber)} helperText={dicErrors.strContactNumber} inputProps={{ "data-controlid": "employee.family.contact-number.input" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth />
        </Box>
        <Box className={styles.field}>
          <TextField id="family-occupation" size="small" label={t("field_occupation", "Occupation")} placeholder={t("family_occupation_placeholder", "Enter occupation")} value={dicValues.strOccupation} onChange={(event) => fnOnChange("strOccupation", event.target.value)} inputProps={{ "data-controlid": "employee.family.occupation.input" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth />
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
          <TextField id="family-percentage" size="small" label={t("field_nominee_percentage", "Nominee percentage")} placeholder={t("family_percentage_placeholder", "Enter percentage")} value={dicValues.decNomineePercentage} onChange={(event) => fnOnChange("decNomineePercentage", event.target.value)} error={Boolean(dicErrors.decNomineePercentage || dicErrors.blnIsNominee)} helperText={dicErrors.decNomineePercentage || dicErrors.blnIsNominee || t("family_percentage_help", "Enabled when Nominee is selected.")} disabled={!dicValues.blnIsNominee} inputProps={{ "data-controlid": "employee.family.nominee-percentage.input", inputMode: "decimal" }} InputProps={{ endAdornment: <span className={styles.percentSign}>%</span> }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth />
        </Box>
        <Box className={`${styles.field} ${styles.addressField}`}>
          <TextField id="family-address" size="small" label={t("field_address", "Address")} placeholder={t("family_address_placeholder", "Enter address (optional)")} value={dicValues.strAddress} onChange={(event) => fnOnChange("strAddress", event.target.value)} inputProps={{ "data-controlid": "employee.family.address.input" }} InputLabelProps={inputLabelProps} sx={fieldSx} fullWidth />
        </Box>
      </Box>
      <Box className={styles.infoLine}>
        <span className={styles.infoIcon}>i</span>
        <span>{t("family_nominee_limit_help", "Total nominee allocation across all family members cannot exceed 100%.")}</span>
      </Box>
      <Box className={styles.formFooter}>
        <Typography className={styles.requiredNote}>{t("family_required_note", "Required fields are marked")} <span className={styles.required}>*</span></Typography>
        <Box className={styles.formActions}>
          <Button
            variant="outlined"
            size="small"
            className={buttonStyles.secondaryButton}
            onClick={fnOnClose}
            data-controlid="employee.family.cancel.button"
            sx={{ height: 32, minHeight: 32, py: 0, px: "12px !important", minWidth: 0, fontSize: "0.8125rem !important", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            size="small"
            className={buttonStyles.primaryButton}
            startIcon={<SaveRoundedIcon />}
            onClick={fnOnSubmit}
            disabled={blnSaving}
            data-controlid="employee.family.save.button"
            sx={{
              height: 32,
              minHeight: 32,
              py: 0,
              px: "12px !important",
              minWidth: 0,
              fontSize: "0.8125rem !important",
              whiteSpace: "nowrap",
              flexShrink: 0,
              "& .MuiButton-startIcon": { mr: 0.75, "& svg": { color: "#fff", fontSize: "1rem" } }
            }}
          >
            {blnSaving ? t("saving", "Saving...") : t("qualification_save_line", "Save line")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
