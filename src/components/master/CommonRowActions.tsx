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
  testIdPrefix?: string;
  rowKey?: string | number;
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
  testIdPrefix,
  rowKey,
  onView,
  onEdit,
  onDelete,
  onToggle,
}: CommonRowActionsProps) {
  const objRowDataProps = rowKey === undefined ? {} : { "data-row-key": String(rowKey) };

  return (
    <Box className={styles.actionCell}>
      {blnCanView && onView ? (
        <button {...objRowDataProps} data-testid={testIdPrefix ? `${testIdPrefix}.view.button` : undefined} className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={onView}>
          <VisibilityRoundedIcon fontSize="small" />
        </button>
      ) : null}
      {blnCanEdit && onEdit ? (
        <button {...objRowDataProps} data-testid={testIdPrefix ? `${testIdPrefix}.edit.button` : undefined} className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={onEdit}>
          <EditRoundedIcon fontSize="small" />
        </button>
      ) : null}
      {blnCanDelete && onDelete ? (
        <button {...objRowDataProps} data-testid={testIdPrefix ? `${testIdPrefix}.delete.button` : undefined} className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={onDelete}>
          <DeleteRoundedIcon fontSize="small" />
        </button>
      ) : null}
      {blnCanToggle && onToggle ? (
        <ActiveStatusSwitch testId={testIdPrefix ? `${testIdPrefix}.status.switch` : undefined} blnIsActive={blnToggleActive} onChange={onToggle} />
      ) : null}
    </Box>
  );
}
