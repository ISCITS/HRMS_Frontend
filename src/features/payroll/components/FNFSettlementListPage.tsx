"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BlockingLoader from "@/components/shared/BlockingLoader";
import FNFStatusBadge from "@/features/payroll/components/FNFStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFSettlementRecord, FNFSettlementStatus } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";

const lstModuleCodes = ["PAYROLL_FNF_SETTLEMENTS", "PAYROLL_FNF", "FNF_SETTLEMENTS"];
const lstStatuses: Array<"All" | FNFSettlementStatus> = ["All", "draft", "calculated", "under_review", "released", "approved", "locked", "paid", "recovered", "cancelled"];

export default function FNFSettlementListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [lstRows, setLstRows] = useState<FNFSettlementRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicFilters, setDicFilters] = useState({ employee_id: "", company: "", department: "", location: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "" });
  const blnCanView = canViewAny() || canDoAny("view");
  const blnCanCreate = canDoAny("create") || canDoAny("add");

  async function loadRows() {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await fnfSettlementService.listSettlements({ status: dicFilters.status, employee_id: dicFilters.employee_id }));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load FNF settlements.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { if (!blnRightsLoading) loadRows().catch(() => undefined); }, [blnRightsLoading, blnCanView]);

  const lstFiltered = useMemo(() => lstRows.filter((row) => {
    const strLwd = row.dtLastWorkingDate || "";
    return (!dicFilters.exit_type || row.strExitType.toLowerCase().includes(dicFilters.exit_type.toLowerCase()))
      && (!dicFilters.settlement_month || (row.dtSettlementMonth || "").startsWith(dicFilters.settlement_month))
      && (!dicFilters.lwd_from || strLwd >= dicFilters.lwd_from)
      && (!dicFilters.lwd_to || strLwd <= dicFilters.lwd_to);
  }), [lstRows, dicFilters]);

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box><Typography className={styles.breadcrumbs}>Payroll / Full and Final</Typography><Typography className={styles.title}>Full and Final Settlement</Typography></Box>
          {blnCanCreate ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements/new")}>New Settlement</Button> : null}
        </Box>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(4, minmax(150px, 1fr)) auto auto", mt: 1 }}>
          <TextField size="small" label="Employee Code" value={dicFilters.employee_id} onChange={(e) => setDicFilters((d) => ({ ...d, employee_id: e.target.value }))} />
          <TextField size="small" label="Company" value={dicFilters.company} onChange={(e) => setDicFilters((d) => ({ ...d, company: e.target.value }))} />
          <TextField size="small" label="Department" value={dicFilters.department} onChange={(e) => setDicFilters((d) => ({ ...d, department: e.target.value }))} />
          <TextField size="small" label="Location" value={dicFilters.location} onChange={(e) => setDicFilters((d) => ({ ...d, location: e.target.value }))} />
          <TextField size="small" type="month" label="Settlement Month" InputLabelProps={{ shrink: true }} value={dicFilters.settlement_month} onChange={(e) => setDicFilters((d) => ({ ...d, settlement_month: e.target.value }))} />
          <TextField size="small" select label="Status" value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))}>{lstStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField size="small" label="Exit Type" value={dicFilters.exit_type} onChange={(e) => setDicFilters((d) => ({ ...d, exit_type: e.target.value }))} />
          <TextField size="small" type="date" label="LWD From" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} />
          <TextField size="small" type="date" label="LWD To" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} />
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(4, minmax(150px, 1fr)) auto auto", mt: 1 }}>
            <Button className={styles.primaryButton} size="small" startIcon={<SearchRoundedIcon />} onClick={() => loadRows()}>Search</Button>
            <Button className={styles.secondaryButton} size="small" startIcon={<ClearRoundedIcon />} onClick={() => setDicFilters({ employee_id: "", company: "", department: "", location: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "" })}>Clear</Button>
          </Box>
        </Box>
      </Box>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.tableCard}>
        <Box className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Settlement</th><th>Employee</th><th>Exit Type</th><th>LWD</th><th>Status</th><th>Net Payable</th><th>Net Recoverable</th><th className={styles.actionsColumn}>Actions</th></tr></thead><tbody>
          {lstFiltered.length ? lstFiltered.map((row) => <tr key={row.intID}><td>{row.strSettlementNumber || row.intID}</td><td>{row.intEmployeeID}</td><td>{row.strExitType}</td><td>{row.dtLastWorkingDate}</td><td><FNFStatusBadge strStatus={row.strSettlementStatus} /></td><td>{formatCurrency(row.decNetPayableAmount)}</td><td>{formatCurrency(row.decNetRecoverableAmount)}</td><td className={styles.actionsColumn}><Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => objRouter.push(`/payroll/fnf-settlements/${row.intID}`)}>Open</Button></td></tr>) : <tr><td colSpan={8} className={styles.emptyState}>No FNF settlements found.</td></tr>}
        </tbody></table></Box>
      </Box>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading FNF settlements..." />
    </Box>
  );
}
