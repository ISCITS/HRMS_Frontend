"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useEffect, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import type { UserGroupAssignmentRecord, UserGroupAssignmentSaveItem, UserGroupRecord } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";

type UserGroupAssignmentsPageProps = {
  intUserID: number;
};

function toEditableAssignment(objRecord: UserGroupAssignmentRecord): UserGroupAssignmentSaveItem {
  return {
    intUserGroupID: objRecord.intUserGroupID,
    dtEffectiveFrom: objRecord.dtEffectiveFrom,
    dtEffectiveTo: objRecord.dtEffectiveTo,
    blnIsActive: objRecord.blnIsActive,
  };
}

export default function UserGroupAssignmentsPage({ intUserID }: UserGroupAssignmentsPageProps) {
  const [lstAssignments, setLstAssignments] = useState<UserGroupAssignmentSaveItem[]>([]);
  const [lstUserGroups, setLstUserGroups] = useState<UserGroupRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  async function loadData() {
    setBlnLoading(true);
    try {
      const [objAssignments, objGroups] = await Promise.all([
        securityApiService.getUserAssignments(intUserID),
        securityApiService.listUserGroups(),
      ]);
      setLstAssignments(objAssignments.Data.map(toEditableAssignment));
      setLstUserGroups(objGroups.Data.filter((objGroup) => objGroup.blnIsActive));
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to load user group assignments.",
        severity: "error",
      });
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [intUserID]);

  function addAssignment() {
    setLstAssignments((lstPrevious) => [
      ...lstPrevious,
      {
        intUserGroupID: lstUserGroups[0]?.intID ?? 0,
        dtEffectiveFrom: new Date().toISOString().slice(0, 10),
        dtEffectiveTo: null,
        blnIsActive: true,
      },
    ]);
  }

  async function saveAssignments() {
    setBlnSaving(true);
    try {
      await securityApiService.saveUserAssignments(intUserID, lstAssignments.filter((objItem) => objItem.intUserGroupID > 0));
      setObjToast({ open: true, message: "User group assignments saved successfully.", severity: "success" });
      await loadData();
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to save assignments.",
        severity: "error",
      });
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>User Group Assignments</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={addAssignment} controlId="security.user-group-assignments.add.button">
              Add Assignment
            </Button>
            <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={saveAssignments} controlId="security.user-group-assignments.save.button">
              Save
            </Button>
          </Box>
        </Box>
      </Box>
      <Box className={styles.tableCard} sx={{ overflowY: "auto", p: 2 }}>
        <Stack spacing={1.5}>
          {lstAssignments.length === 0 ? (
            <Typography className={styles.emptyState}>No user group assignments found.</Typography>
          ) : (
            lstAssignments.map((objAssignment, intIndex) => (
              <Box
                key={`${objAssignment.intUserGroupID}-${intIndex}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1.2fr 180px 180px 120px auto" },
                  gap: 1.5,
                  alignItems: "center",
                  border: "1px solid #d9e6ef",
                  borderRadius: 3,
                  p: 1.5,
                }}
              >
                <TextField
                  select
                  label="User Group"
                  value={objAssignment.intUserGroupID}
                  controlId="security.user-group-assignments.user-group.select"
                  onChange={(objEvent) =>
                    setLstAssignments((lstPrevious) =>
                      lstPrevious.map((objItem, intItemIndex) =>
                        intItemIndex === intIndex
                          ? { ...objItem, intUserGroupID: Number(objEvent.target.value) }
                          : objItem
                      )
                    )
                  }
                >
                  {lstUserGroups.map((objGroup) => (
                    <MenuItem key={objGroup.intID} value={objGroup.intID}>
                      {objGroup.strGroupCode} - {objGroup.strGroupName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Effective From"
                  type="date"
                  value={objAssignment.dtEffectiveFrom}
                  controlId="security.user-group-assignments.effective-from.input"
                  onChange={(objEvent) =>
                    setLstAssignments((lstPrevious) =>
                      lstPrevious.map((objItem, intItemIndex) =>
                        intItemIndex === intIndex
                          ? { ...objItem, dtEffectiveFrom: objEvent.target.value }
                          : objItem
                      )
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Effective To"
                  type="date"
                  value={objAssignment.dtEffectiveTo ?? ""}
                  controlId="security.user-group-assignments.effective-to.input"
                  onChange={(objEvent) =>
                    setLstAssignments((lstPrevious) =>
                      lstPrevious.map((objItem, intItemIndex) =>
                        intItemIndex === intIndex
                          ? { ...objItem, dtEffectiveTo: objEvent.target.value || null }
                          : objItem
                      )
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  label="Status"
                  value={objAssignment.blnIsActive ? "active" : "inactive"}
                  controlId="security.user-group-assignments.status.select"
                  onChange={(objEvent) =>
                    setLstAssignments((lstPrevious) =>
                      lstPrevious.map((objItem, intItemIndex) =>
                        intItemIndex === intIndex
                          ? { ...objItem, blnIsActive: objEvent.target.value === "active" }
                          : objItem
                      )
                    )
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
                <IconButton
                  color="error"
                  onClick={() => setLstAssignments((lstPrevious) => lstPrevious.filter((_, intItemIndex) => intItemIndex !== intIndex))}
                  controlId="security.user-group-assignments.delete.icon-button"
                  data-row-key={intIndex}
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Box>
            ))
          )}
        </Stack>
      </Box>
      <BlockingLoader blnOpen={blnLoading || blnSaving} strLabel={blnLoading ? "Loading..." : "Saving..."} />
      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">{objToast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
