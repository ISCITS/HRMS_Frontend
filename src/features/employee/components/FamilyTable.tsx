"use client";

import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

import styles from "@/components/master/MasterScreen.module.css";
import type { EmployeeFamilyDetailRecord } from "@/features/employee/types";

type FamilyTableProps = {
  lstRows: EmployeeFamilyDetailRecord[];
  blnViewOnly: boolean;
  blnCanDelete?: boolean;
  fnOnEdit: (objRecord: EmployeeFamilyDetailRecord) => void;
  fnOnDelete: (intFamilyID: number) => void;
  fnTranslate: (strKey: string, strFallback?: string) => string;
};

export default function FamilyTable({
  lstRows,
  blnViewOnly,
  blnCanDelete = false,
  fnOnEdit,
  fnOnDelete,
  fnTranslate
}: FamilyTableProps) {
  const t = fnTranslate;

  return (
    <TableContainer component={Paper} sx={{ borderRadius: "18px", border: "1px solid rgba(148,163,184,0.18)" }}>
      <Table size="small" sx={{ minWidth: 1100 }}>
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_name", "Name")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_relationship", "Relationship")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_dob", "DOB")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_gender", "Gender")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_contact_number", "Contact Number")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_occupation", "Occupation")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_dependent", "Dependent")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_nominee", "Nominee")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("field_nominee_percentage_short", "Nominee %")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("actions", "Actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lstRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} sx={{ py: 3 }}>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>
                  {t("family_empty", "No family members added yet.")}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            lstRows.map((objRecord) => (
              <TableRow key={objRecord.intID} hover>
                <TableCell>{objRecord.strName}</TableCell>
                <TableCell>{objRecord.strRelationship || "-"}</TableCell>
                <TableCell>{objRecord.dtDateOfBirth || "-"}</TableCell>
                <TableCell>{objRecord.strGender || "-"}</TableCell>
                <TableCell>{objRecord.strContactNumber || "-"}</TableCell>
                <TableCell>{objRecord.strOccupation || "-"}</TableCell>
                <TableCell>{objRecord.blnIsDependent ? t("yes", "Yes") : t("no", "No")}</TableCell>
                <TableCell>{objRecord.blnIsNominee ? t("yes", "Yes") : t("no", "No")}</TableCell>
                <TableCell>{objRecord.decNomineePercentage != null ? `${objRecord.decNomineePercentage}%` : "-"}</TableCell>
                <TableCell>
                  {!blnViewOnly ? (
                    <Box className={styles.actionCell}>
                      <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => fnOnEdit(objRecord)} aria-label={t("edit_family_member", "Edit family member")} data-testid="employee.family.row.edit.button" data-row-key={objRecord.intID}>
                        <EditRoundedIcon fontSize="small" />
                      </button>
                      {blnCanDelete ? <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => fnOnDelete(objRecord.intID)} aria-label={t("delete_family_member", "Delete family member")} data-testid="employee.family.row.delete.button" data-row-key={objRecord.intID}>
                        <DeleteRoundedIcon fontSize="small" />
                      </button> : null}
                    </Box>
                  ) : (
                    <Typography sx={{ color: "#64748b" }}>-</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
