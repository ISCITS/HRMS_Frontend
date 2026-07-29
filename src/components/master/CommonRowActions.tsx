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
  viewButtonControlId?: string;
  editButtonControlId?: string;
  deleteButtonControlId?: string;
  statusSwitchControlId?: string;
  testIdPrefix?: string;
  rowKey?: string | number;
  viewIconColor?: string;
  editIconColor?: string;
  deleteIconColor?: string;
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
  viewButtonControlId = "common-row-actions.view.button",
  editButtonControlId = "common-row-actions.edit.button",
  deleteButtonControlId = "common-row-actions.delete.button",
  statusSwitchControlId = "common-row-actions.status.switch",
  testIdPrefix,
  rowKey,
  viewIconColor = "#6D6D6D",
  editIconColor = "var(--app-primary-color)",
  deleteIconColor = "#DC2626",
  onView,
  onEdit,
  onDelete,
  onToggle,
}: CommonRowActionsProps) {
  const objRowDataProps = rowKey === undefined ? {} : { "data-row-key": String(rowKey) };
  const strViewButtonControlId = testIdPrefix ? `${testIdPrefix}.view.button` : viewButtonControlId;
  const strEditButtonControlId = testIdPrefix ? `${testIdPrefix}.edit.button` : editButtonControlId;
  const strDeleteButtonControlId = testIdPrefix ? `${testIdPrefix}.delete.button` : deleteButtonControlId;
  const strStatusSwitchControlId = testIdPrefix ? `${testIdPrefix}.status.switch` : statusSwitchControlId;

  return (
    <Box className={styles.actionCell}>
      {blnCanView && onView ? (
        <button {...objRowDataProps} data-controlid={strViewButtonControlId} className={`${styles.iconButton} ${styles.viewIcon}`} style={{ color: viewIconColor }} type="button" onClick={onView}>
          <VisibilityRoundedIcon data-testid={undefined} data-controlid={`${strViewButtonControlId}.icon`} fontSize="small" />
        </button>
      ) : null}
      {blnCanEdit && onEdit ? (
        <button {...objRowDataProps} data-controlid={strEditButtonControlId} className={`${styles.iconButton} ${styles.editIcon}`} style={{ color: editIconColor }} type="button" onClick={onEdit}>
          <EditRoundedIcon data-testid={undefined} data-controlid={`${strEditButtonControlId}.icon`} fontSize="small" />
        </button>
      ) : null}
      {blnCanDelete && onDelete ? (
        <button {...objRowDataProps} data-controlid={strDeleteButtonControlId} className={`${styles.iconButton} ${styles.deleteIcon}`} style={{ color: deleteIconColor }} type="button" onClick={onDelete}>
          <DeleteRoundedIcon data-testid={undefined} data-controlid={`${strDeleteButtonControlId}.icon`} fontSize="small" />
        </button>
      ) : null}
      {blnCanToggle && onToggle ? (
        <ActiveStatusSwitch blnIsActive={blnToggleActive} onChange={onToggle} controlId={strStatusSwitchControlId} />
      ) : null}
    </Box>
  );
}
