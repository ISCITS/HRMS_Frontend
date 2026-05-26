"use client";

import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box } from "@mui/material";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";

type CommonRowActionsProps = {
  blnCanView?: boolean;
  blnCanEdit?: boolean;
  blnCanDelete?: boolean;
  blnCanToggle?: boolean;
  blnToggleActive?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
};

export default function CommonRowActions({
  blnCanView = false,
  blnCanEdit = false,
  blnCanDelete = false,
  blnCanToggle = false,
  blnToggleActive = true,
  onView,
  onEdit,
  onDelete,
  onToggle,
}: CommonRowActionsProps) {
  return (
    <Box className={styles.actionCell}>
      {blnCanView && onView ? (
        <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={onView}>
          <VisibilityRoundedIcon fontSize="small" />
        </button>
      ) : null}
      {blnCanEdit && onEdit ? (
        <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={onEdit}>
          <EditRoundedIcon fontSize="small" />
        </button>
      ) : null}
      {blnCanDelete && onDelete ? (
        <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={onDelete}>
          <DeleteRoundedIcon fontSize="small" />
        </button>
      ) : null}
      {blnCanToggle && onToggle ? (
        <ActiveStatusSwitch blnIsActive={blnToggleActive} onChange={onToggle} />
      ) : null}
    </Box>
  );
}
