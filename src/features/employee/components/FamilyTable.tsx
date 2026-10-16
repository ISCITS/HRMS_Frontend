"use client";

import type { ReactNode } from "react";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { Box, IconButton, Typography } from "@mui/material";
import type { EmployeeFamilyDetailRecord } from "@/features/employee/types";
import styles from "./FamilyDetailsTab.module.css";

type FamilyTableProps = {
  lstRows: EmployeeFamilyDetailRecord[];
  blnViewOnly: boolean;
  blnCanDelete?: boolean;
  blnAdding: boolean;
  intEditingFamilyID: number | null;
  objEditor: ReactNode;
  fnOnAddToggle: () => void;
  fnOnEdit: (objRecord: EmployeeFamilyDetailRecord) => void;
  fnOnDelete: (intFamilyID: number) => void;
  fnTranslate: (strKey: string, strFallback?: string) => string;
};

export default function FamilyTable({ lstRows, blnViewOnly, blnCanDelete = false, blnAdding, intEditingFamilyID, objEditor, fnOnAddToggle, fnOnEdit, fnOnDelete, fnTranslate: t }: FamilyTableProps) {
  const value = (strValue: string | null) => strValue || "—";
  return (
    <Box className={styles.tableShell}>
      <Box className={styles.tableScroll}>
        <Box className={styles.tableHead}>
          <span>{t("field_name", "Name")}</span>
          <span>{t("field_relationship", "Relationship")}</span>
          <span>{t("field_date_of_birth", "Date of birth")}</span>
          <span>{t("field_contact_number", "Contact number")}</span>
          <span>{t("field_dependent", "Dependent")}</span>
          <span>{t("field_nominee", "Nominee")}</span>
          <span>{t("field_nominee_percentage_short", "Nominee %")}</span>
        </Box>
        {!blnViewOnly && blnAdding && (
          <Box className={styles.activeBlock}>
            <button type="button" className={styles.summaryRow} onClick={fnOnAddToggle} aria-expanded="true" data-controlid="employee.family.new.row">
              <span className={styles.nameCell}><KeyboardArrowDownRoundedIcon fontSize="small" />{t("family_new_member", "New family member")}</span>
              <span>—</span><span>—</span><span>—</span><span>{t("no", "No")}</span><span>{t("no", "No")}</span><span>—</span>
            </button>
            {objEditor}
          </Box>
        )}
        {lstRows.map((record) => (
          <Box key={record.intID} className={intEditingFamilyID === record.intID ? styles.activeBlock : styles.savedBlock}>
            <Box className={styles.summaryRow}>
              <span className={styles.nameCell}>
                {!blnViewOnly && <IconButton size="small" aria-label={t("edit_family_member", "Edit family member")} onClick={() => fnOnEdit(record)} data-controlid="employee.family.row.edit.button"><KeyboardArrowRightRoundedIcon fontSize="small" /></IconButton>}
                {record.strName}
                {!blnViewOnly && <Box className={styles.rowActions}>
                  <IconButton size="small" aria-label={t("edit_family_member", "Edit family member")} onClick={() => fnOnEdit(record)}><EditRoundedIcon fontSize="small" /></IconButton>
                  {blnCanDelete && <IconButton size="small" aria-label={t("delete_family_member", "Delete family member")} onClick={() => fnOnDelete(record.intID)} data-controlid="employee.family.row.delete.button"><DeleteRoundedIcon fontSize="small" /></IconButton>}
                </Box>}
              </span>
              <span>{value(record.strRelationship)}</span>
              <span>{value(record.dtDateOfBirth)}</span>
              <span>{value(record.strContactNumber)}</span>
              <span>{record.blnIsDependent ? t("yes", "Yes") : t("no", "No")}</span>
              <span>{record.blnIsNominee ? t("yes", "Yes") : t("no", "No")}</span>
              <span>{record.blnIsNominee && record.decNomineePercentage != null ? `${record.decNomineePercentage}%` : "—"}</span>
            </Box>
            {intEditingFamilyID === record.intID && objEditor}
          </Box>
        ))}
      </Box>
      {lstRows.length === 0 && (
        <Box className={styles.emptyState}>
          <span className={styles.emptyIcon}><GroupsRoundedIcon fontSize="small" /></span>
          <Typography>{t("family_empty", "No saved family members yet.")}</Typography>
        </Box>
      )}
    </Box>
  );
}
