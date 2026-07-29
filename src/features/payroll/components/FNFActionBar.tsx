"use client";

import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import TextSnippetRoundedIcon from "@mui/icons-material/TextSnippetRounded";
import { Button, Stack } from "@mui/material";
import type { FNFSettlementRecord } from "@/features/payroll/types";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const dicActionButtonSx = {
  calculate: { backgroundColor: "#f59e0b", "&:hover": { backgroundColor: "#d97706" } },
  submitReview: { backgroundColor: "#7c3aed", "&:hover": { backgroundColor: "#6d28d9" } },
  approve: { backgroundColor: "#16a34a", "&:hover": { backgroundColor: "#15803d" } },
  release: { backgroundColor: "#0ea5e9", "&:hover": { backgroundColor: "#0284c7" } },
  lock: { backgroundColor: "#475569", "&:hover": { backgroundColor: "#334155" } },
  markPaid: { backgroundColor: "#059669", "&:hover": { backgroundColor: "#047857" } },
  statement: { backgroundColor: "#2563eb", "&:hover": { backgroundColor: "#1d4ed8" } }
};
const lstModuleCodes = ["PAYROLL_FNF_SETTLEMENTS", "PAYROLL_FNF", "FNF_SETTLEMENTS"];

export default function FNFActionBar({ objSettlement, blnBusy, onAction }: { objSettlement: FNFSettlementRecord; blnBusy: boolean; onAction: (strAction: string) => void }) {
  const { canDoAny } = useModuleActionAccess(lstModuleCodes);
  const strStatus = objSettlement.strSettlementStatus;
  const blnEditable = ["draft", "calculated", "released"].includes(strStatus);
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {blnEditable && canDoAny("calculate") ? <Button controlId="payroll.fnf.action.calculate.button" className={styles.primaryButton} variant="contained" startIcon={<CalculateRoundedIcon />} disabled={blnBusy} onClick={() => onAction("calculate")}>Calculate</Button> : null}
      {["calculated", "released"].includes(strStatus) && canDoAny("submit-review") ? <Button controlId="payroll.fnf.action.submit-review.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.submitReview} startIcon={<SendRoundedIcon />} disabled={blnBusy} onClick={() => onAction("submit-review")}>Submit Review</Button> : null}
      {strStatus === "under_review" && canDoAny("approve") ? <Button controlId="payroll.fnf.action.approve.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.approve} startIcon={<CheckCircleRoundedIcon />} disabled={blnBusy} onClick={() => onAction("approve")}>Approve</Button> : null}
      {["under_review", "approved"].includes(strStatus) && canDoAny("release") ? <Button controlId="payroll.fnf.action.release.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.release} startIcon={<ReplyRoundedIcon />} disabled={blnBusy} onClick={() => onAction("release")}>Release</Button> : null}
      {strStatus === "approved" && canDoAny("lock") ? <Button controlId="payroll.fnf.action.lock.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.lock} startIcon={<LockRoundedIcon />} disabled={blnBusy} onClick={() => onAction("lock")}>Lock</Button> : null}
      {strStatus === "locked" && (objSettlement.decNetPayableAmount || 0) > 0 && canDoAny("mark-paid") ? <Button controlId="payroll.fnf.action.mark-paid.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.markPaid} startIcon={<PaymentsRoundedIcon />} disabled={blnBusy} onClick={() => onAction("mark-paid")}>Mark Paid</Button> : null}
      {strStatus === "locked" && (objSettlement.decNetRecoverableAmount || 0) > 0 && canDoAny("mark-recovered") ? <Button controlId="payroll.fnf.action.mark-recovered.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.markPaid} startIcon={<PaymentsRoundedIcon />} disabled={blnBusy} onClick={() => onAction("mark-recovered")}>Mark Recovered</Button> : null}
      {["locked", "paid", "recovered"].includes(strStatus) && canDoAny("statement") ? <Button controlId="payroll.fnf.action.statement.button" className={styles.fnfActionButton} variant="contained" sx={dicActionButtonSx.statement} startIcon={<TextSnippetRoundedIcon />} disabled={blnBusy} onClick={() => onAction("statement")}>Statement</Button> : null}
      {!["locked", "paid", "recovered", "cancelled"].includes(strStatus) && canDoAny("cancel") ? <Button controlId="payroll.fnf.action.cancel.button" className={styles.secondaryButton} variant="outlined" startIcon={<CancelRoundedIcon />} disabled={blnBusy} onClick={() => onAction("cancel")}>Cancel</Button> : null}
    </Stack>
  );
}
