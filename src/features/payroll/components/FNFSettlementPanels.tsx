"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { FNFAuditRecord, FNFSettlementLineRecord, FNFSettlementRecord, FNFStatementRecord } from "@/features/payroll/types";
import styles from "@/features/payroll/components/PayrollScreen.module.css";

export function formatCurrency(decValue?: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(decValue || 0);
}

function formatAuditDateTime(strDate?: string | null) {
  if (!strDate) return "";
  const strUtcDate = strDate.trim().replace(/([zZ]|[+-]\d{2}:?\d{2})$/, "");
  const objDate = new Date(`${strUtcDate}Z`);
  if (Number.isNaN(objDate.getTime())) return strDate;
  return objDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function Section({ strTitle, children, action }: { strTitle: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 2, mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ color: "#0f172a", fontWeight: 800 }}>{strTitle}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function formatStatementHTML(strHTML: string) {
  const addRupeeSymbol = (strLabel: string, strValue: string, strClassName: string) => {
    const strTrimmedValue = strValue.trim();
    const strFormattedValue = strTrimmedValue.startsWith("₹") ? strTrimmedValue : `₹${strTrimmedValue}`;
    return `${strLabel}<span class="${strClassName}">${strFormattedValue}</span>`;
  };
  return strHTML
    .replace(/(<strong>\s*Net payable:\s*<\/strong>\s*)([^<]+)/i, (_strMatch, strLabel, strValue) => addRupeeSymbol(strLabel, strValue, styles.fnfStatementNetPayable))
    .replace(/(<strong>\s*Net recoverable:\s*<\/strong>\s*)([^<]+)/i, (_strMatch, strLabel, strValue) => addRupeeSymbol(strLabel, strValue, styles.fnfStatementNetRecoverable));
}

function LineTable({ lstLines, blnReadOnly, onEdit, onDelete }: { lstLines: FNFSettlementLineRecord[]; blnReadOnly: boolean; onEdit?: (line: FNFSettlementLineRecord) => void; onDelete?: (line: FNFSettlementLineRecord) => void }) {
  return (
    <Box className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.fnfDenseTable}`}>
        <thead><tr><th>Code</th><th>Name</th><th>Basis</th><th>Amount</th><th>Source</th><th className={styles.actionsColumn}>Actions</th></tr></thead>
        <tbody>
          {lstLines.length ? lstLines.map((line) => (
            <tr key={line.intID}>
              <td>{line.strLineCode}</td><td>{line.strLineName}</td><td>{line.strCalculationBasis || "-"}</td><td>{formatCurrency(line.decAmount)}</td><td>{line.strSourceType || (line.blnIsSystemCalculated ? "system" : "manual")}</td>
              <td className={styles.actionsColumn}>
                {!blnReadOnly && !line.blnIsSystemCalculated ? <Box className={styles.actionCell}><Button size="small" startIcon={<EditRoundedIcon />} onClick={() => onEdit?.(line)}>Edit</Button><Button color="error" size="small" startIcon={<DeleteRoundedIcon />} onClick={() => onDelete?.(line)}>Delete</Button></Box> : "-"}
              </td>
            </tr>
          )) : <tr><td colSpan={6} className={styles.emptyState}>No settlement lines yet.</td></tr>}
        </tbody>
      </table>
    </Box>
  );
}

export function FNFSettlementCalculationPanel({ objSettlement, blnReadOnly, onAdd, onEdit, onDelete }: { objSettlement: FNFSettlementRecord; blnReadOnly: boolean; onAdd: () => void; onEdit: (line: FNFSettlementLineRecord) => void; onDelete: (line: FNFSettlementLineRecord) => void }) {
  const lstLines = objSettlement.lstLines || [];
  return <Section strTitle="Earnings, Deductions & Recoveries" action={!blnReadOnly ? <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={onAdd}>Add Line</Button> : null}><LineTable lstLines={lstLines} blnReadOnly={blnReadOnly} onEdit={onEdit} onDelete={onDelete} /></Section>;
}

export function FNFLeaveEncashmentPanel({ objSettlement }: { objSettlement: FNFSettlementRecord }) {
  const lstLines = (objSettlement.lstLines || []).filter((line) => line.strCalculationBasis?.includes("leave") || line.strLineCode.includes("LEAVE"));
  return <Section strTitle="Leave Encashment"><LineTable lstLines={lstLines} blnReadOnly /></Section>;
}

export function FNFNoticePayPanel({ objSettlement }: { objSettlement: FNFSettlementRecord }) {
  return <Section strTitle="Notice Pay / Recovery"><Stack direction={{ xs: "column", sm: "row" }} spacing={3}><Typography>Notice period: {objSettlement.decNoticePeriodDays || 0} days</Typography><Typography>Served: {objSettlement.decNoticeServedDays || 0} days</Typography><Typography>Shortfall: {objSettlement.decNoticeShortfallDays || 0} days</Typography></Stack></Section>;
}

export function FNFGratuityPanel({ objSettlement }: { objSettlement: FNFSettlementRecord }) {
  const lstLines = (objSettlement.lstLines || []).filter((line) => line.strLineCode.includes("GRATUITY"));
  return <Section strTitle="Gratuity"><LineTable lstLines={lstLines} blnReadOnly /></Section>;
}

export function FNFRecoveryPanel({ objSettlement }: { objSettlement: FNFSettlementRecord }) {
  const lstLines = (objSettlement.lstLines || []).filter((line) => line.strLineType === "RECOVERY");
  return <Section strTitle="Recoveries"><LineTable lstLines={lstLines} blnReadOnly /></Section>;
}

export function FNFReimbursementPanel({ objSettlement }: { objSettlement: FNFSettlementRecord }) {
  const lstLines = (objSettlement.lstLines || []).filter((line) => line.strSourceType === "reimbursement_claim");
  return <Section strTitle="Pending Reimbursements"><LineTable lstLines={lstLines} blnReadOnly /></Section>;
}

export function FNFStatementPreview({ objStatement }: { objStatement: FNFStatementRecord | null }) {
  return <Section strTitle="Statement Preview">{objStatement?.strStatementHTML ? <Box className={styles.fnfStatementPreview} sx={{ border: "1px solid #d9e6ef", p: 2 }} dangerouslySetInnerHTML={{ __html: formatStatementHTML(objStatement.strStatementHTML) }} /> : <Typography sx={{ color: "#64748b" }}>No statement generated yet.</Typography>}</Section>;
}

export function FNFAuditTimeline({ lstAudit }: { lstAudit: FNFAuditRecord[] }) {
  return <Section strTitle="Audit Timeline"><Stack spacing={1}>{lstAudit.length ? lstAudit.map((audit) => <Box key={audit.intID} sx={{ borderLeft: "3px solid #2563eb", pl: 1.5 }}><Typography sx={{ fontWeight: 800 }}>{audit.strActionCode}</Typography><Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>{audit.strFromStatus || "-"} to {audit.strToStatus || "-"} {audit.dtActionOn ? `on ${formatAuditDateTime(audit.dtActionOn)}` : ""}</Typography><Typography>{audit.strRemarks || ""}</Typography></Box>) : <Typography sx={{ color: "#64748b" }}>No audit entries yet.</Typography>}</Stack></Section>;
}
