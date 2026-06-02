"use client";

import type { ReactNode } from "react";
import type { DialogProps } from "@mui/material";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import styles from "@/features/payroll/components/PayrollScreen.module.css";

type CommonPayrollDialogProps = {
  blnOpen: boolean;
  strTitle: string;
  nodeContent: ReactNode;
  strSecondaryLabel: string;
  onClose: () => void;
  strPrimaryLabel?: string;
  onPrimaryAction?: () => void;
  blnPrimaryDisabled?: boolean;
  blnHidePrimary?: boolean;
  maxWidth?: DialogProps["maxWidth"];
  fullWidth?: boolean;
  paperClassName?: string;
  paperSx?: object;
  onDialogClose?: DialogProps["onClose"];
  rootTestId?: string;
  cancelButtonTestId?: string;
  primaryButtonTestId?: string;
};

export default function CommonPayrollDialog({
  blnOpen,
  strTitle,
  nodeContent,
  strSecondaryLabel,
  onClose,
  strPrimaryLabel,
  onPrimaryAction,
  blnPrimaryDisabled = false,
  blnHidePrimary = false,
  maxWidth = "sm",
  fullWidth = true,
  paperClassName = styles.compactDialogPaper,
  paperSx,
  onDialogClose,
  rootTestId,
  cancelButtonTestId,
  primaryButtonTestId,
}: CommonPayrollDialogProps) {
  return (
    <CommonMasterDialog
      blnOpen={blnOpen}
      strTitle={strTitle}
      nodeContent={nodeContent}
      strSecondaryLabel={strSecondaryLabel}
      onClose={onClose}
      strPrimaryLabel={strPrimaryLabel}
      onPrimaryAction={onPrimaryAction}
      blnPrimaryDisabled={blnPrimaryDisabled}
      blnHidePrimary={blnHidePrimary}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      paperClassName={paperClassName}
      paperSx={paperSx}
      onDialogClose={onDialogClose}
      strSecondaryButtonClassName={styles.secondaryButton}
      strPrimaryButtonClassName={styles.primaryButton}
      rootTestId={rootTestId}
      cancelButtonTestId={cancelButtonTestId}
      primaryButtonTestId={primaryButtonTestId}
    />
  );
}
