"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Autocomplete, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BlockingLoader from "@/components/shared/BlockingLoader";
import FNFStatusBadge from "@/features/payroll/components/FNFStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFEmployeeOption, FNFSettlementRecord, FNFSettlementStatus } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";

const lstModuleCodes = ["PAYROLL_FNF_SETTLEMENTS", "PAYROLL_FNF", "FNF_SETTLEMENTS"];
const lstStatuses: Array<"All" | FNFSettlementStatus> = ["All", "draft", "calculated", "under_review", "released", "approved", "locked", "paid", "recovered", "cancelled"];

export default function FNFSettlementListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [lstRows, setLstRows] = useState<FNFSettlementRecord[]>([]);
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<FNFEmployeeOption[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnEmployeeOptionsLoading, setBlnEmployeeOptionsLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicFilters, setDicFilters] = useState({ employee_code: "", department: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "", payable_type: "All" });
  const blnCanView = canViewAny() || canDoAny("view");
  const blnCanCreate = canDoAny("create") || canDoAny("add");
  const objSelectedEmployee = useMemo(() => lstEmployeeOptions.find((objEmployee) => objEmployee.strEmployeeCode === dicFilters.employee_code) || null, [lstEmployeeOptions, dicFilters.employee_code]);

  async function loadRows() {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await fnfSettlementService.listSettlements({ status: dicFilters.status, employee_code: dicFilters.employee_code, department: dicFilters.department, settlement_month: dicFilters.settlement_month, lwd_from: dicFilters.lwd_from, lwd_to: dicFilters.lwd_to, payable_type: dicFilters.payable_type }));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load FNF settlements.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { if (!blnRightsLoading) loadRows().catch(() => undefined); }, [blnRightsLoading, blnCanView]);
  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    setBlnEmployeeOptionsLoading(true);
    fnfSettlementService.listEmployeeOptions()
      .then(setLstEmployeeOptions)
      .catch(() => setLstEmployeeOptions([]))
      .finally(() => setBlnEmployeeOptionsLoading(false));
  }, [blnRightsLoading, blnCanView]);

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
          {blnCanCreate ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements/new")} controlId="payroll.fnf-settlements.new.button">New Settlement</Button> : null}
        </Box>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", mt: 1 }}>
          <Autocomplete
            size="small"
            options={lstEmployeeOptions}
            value={objSelectedEmployee}
            loading={blnEmployeeOptionsLoading}
            getOptionLabel={(objOption) => objOption?.strLabel || ""}
            isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
            onChange={(_, objValue) => setDicFilters((d) => ({ ...d, employee_code: objValue?.strEmployeeCode || "" }))}
            renderInput={(params) => <TextField {...params} label="Employee Code" inputProps={{ ...params.inputProps, "controlId": "payroll.fnf-settlements.employee-code.input" }} controlId="payroll.fnf-settlements.employee-code.input" />}
          />
          <TextField size="small" label="Department" inputProps={{ "controlId": "payroll.fnf-settlements.department.input" }} value={dicFilters.department} onChange={(e) => setDicFilters((d) => ({ ...d, department: e.target.value }))} controlId="payroll.fnf-settlements.department.input" />
          <TextField size="small" type="month" label="Settlement Month" inputProps={{ "controlId": "payroll.fnf-settlements.month.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.settlement_month} onChange={(e) => setDicFilters((d) => ({ ...d, settlement_month: e.target.value }))} controlId="payroll.fnf-settlements.month.input" />
          <TextField size="small" select label="Status" inputProps={{ "controlId": "payroll.fnf-settlements.status.select" }} value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))} controlId="payroll.fnf-settlements.status.select">{lstStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField size="small" select label="Payable / Recoverable" value={dicFilters.payable_type} onChange={(e) => setDicFilters((d) => ({ ...d, payable_type: e.target.value }))} controlId="payroll.fnf-settlements.payable-type.select">{["All", "payable", "recoverable"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField size="small" label="Exit Type" inputProps={{ "controlId": "payroll.fnf-settlements.exit-type.input" }} value={dicFilters.exit_type} onChange={(e) => setDicFilters((d) => ({ ...d, exit_type: e.target.value }))} controlId="payroll.fnf-settlements.exit-type.input" />
          <TextField size="small" type="date" label="LWD From" inputProps={{ "controlId": "payroll.fnf-settlements.lwd-from.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} controlId="payroll.fnf-settlements.lwd-from.input" />
          <TextField size="small" type="date" label="LWD To" inputProps={{ "controlId": "payroll.fnf-settlements.lwd-to.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} controlId="payroll.fnf-settlements.lwd-to.input" />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button className={styles.primaryButton} size="small" startIcon={<SearchRoundedIcon />} onClick={() => loadRows()} controlId="payroll.fnf-settlements.search.button">Search</Button>
            <Button className={styles.secondaryButton} size="small" startIcon={<ClearRoundedIcon />} onClick={() => setDicFilters({ employee_code: "", department: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "", payable_type: "All" })} controlId="payroll.fnf-settlements.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.tableCard}>
        <Box className={styles.tableWrap}><table className={styles.table}><thead><tr><th>FnF ID</th><th>Employee</th><th>Department</th><th>LWD</th><th>Settlement Month</th><th>Net Amount</th><th>Status</th><th>Created</th><th>Updated</th><th className={styles.actionsColumn}>Actions</th></tr></thead><tbody>
          {lstFiltered.length ? lstFiltered.map((row) => <tr key={row.intID}><td>{row.strSettlementNumber || row.intID}</td><td>{row.strEmployeeCode || row.intEmployeeID}</td><td>{row.strDepartmentName || "-"}</td><td>{row.dtLastWorkingDate}</td><td>{row.dtSettlementMonth || "-"}</td><td>{formatCurrency((row.decNetPayableAmount || 0) || -(row.decNetRecoverableAmount || 0))}</td><td><FNFStatusBadge strStatus={row.strSettlementStatus} /></td><td>{row.dtAddedOn || "-"}</td><td>{row.dtLastModifiedOn || "-"}</td><td className={styles.actionsColumn}><Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => objRouter.push(`/payroll/fnf-settlements/${row.intID}`)} controlId="payroll.fnf-settlements.row.open.button" data-row-key={row.intID}>Open</Button></td></tr>) : <tr><td colSpan={10} className={styles.emptyState}>No FNF settlements found.</td></tr>}
        </tbody></table></Box>
      </Box>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading FNF settlements..." />
    </Box>
  );
}
