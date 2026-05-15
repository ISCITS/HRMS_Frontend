"use client";

import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import { hrItDeclarationReviewService, type HrItDeclarationListRecord } from "@/features/it-declaration/services/itDeclarationService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

export default function ITDeclarationReviewListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny, objRights } = useModuleActionAccess(["PAYROLL_IT_DECLARATION"]);
  const [lstRows, setLstRows] = useState<HrItDeclarationListRecord[]>([]);
  const [objSummary, setObjSummary] = useState<Record<string, number>>({});
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicFilters, setDicFilters] = useState<Record<string, string>>({
    strFinancialYearCode: "",
    strCompany: "",
    strEmployee: "",
    strTaxRegime: "",
    strStatus: "",
    strProofPending: "",
    strDepartment: "",
    strLocation: "",
  });

  function hasPermissionCode(strCode: string) {
    const strNormalized = strCode.trim().toUpperCase();
    return Object.entries(objRights.dicAllowedActions || {}).some(([strModuleCode, lstActions]) =>
      strModuleCode.trim().toUpperCase() === strNormalized ||
      lstActions.some((strAction) => strAction.trim().toUpperCase() === strNormalized),
    );
  }

  async function loadData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await hrItDeclarationReviewService.getList(dicFilters);
      setLstRows(objData.lstRows || []);
      setObjSummary(objData.objSummary || {});
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load IT declaration review list.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadData();
  }, [blnRightsLoading]);

  const lstSummary = useMemo(() => [
    ["Submitted", objSummary.submitted || 0],
    ["Under Review", objSummary.under_review || 0],
    ["Approved", objSummary.approved || 0],
    ["Released", objSummary.released || 0],
    ["Locked", objSummary.locked || 0],
    ["Proof Pending", objSummary.proof_pending || 0],
  ], [objSummary]);

  if (blnLoading || blnRightsLoading) return <BlockingLoader blnOpen strLabel="Loading IT declaration review..." />;

  return (
    <Stack spacing={2}>
      <Typography sx={{ fontSize: "1.3rem", fontWeight: 800 }}>IT Declaration Proof Review</Typography>
      {!canViewAny() ? <Alert severity="warning">You do not have permission to view this screen.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        <TextField size="small" label="Financial Year" value={dicFilters.strFinancialYearCode || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strFinancialYearCode: e.target.value }))} />
        <TextField size="small" label="Company" value={dicFilters.strCompany || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strCompany: e.target.value }))} />
        <TextField size="small" label="Employee Code/Name" value={dicFilters.strEmployee || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strEmployee: e.target.value }))} />
        <TextField size="small" label="Department" value={dicFilters.strDepartment || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strDepartment: e.target.value }))} />
        <TextField size="small" label="Location" value={dicFilters.strLocation || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strLocation: e.target.value }))} />
        <TextField select size="small" label="Tax Regime" value={dicFilters.strTaxRegime || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strTaxRegime: e.target.value }))} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem><MenuItem value="old">Old</MenuItem><MenuItem value="new">New</MenuItem>
        </TextField>
        <TextField select size="small" label="Status" value={dicFilters.strStatus || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strStatus: e.target.value }))} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem><MenuItem value="submitted">Submitted</MenuItem><MenuItem value="under_review">Under Review</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="released">Released</MenuItem><MenuItem value="locked">Locked</MenuItem>
        </TextField>
        <TextField select size="small" label="Proof Pending" value={dicFilters.strProofPending || ""} onChange={(e) => setDicFilters((d) => ({ ...d, strProofPending: e.target.value }))} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem><MenuItem value="true">Yes</MenuItem><MenuItem value="false">No</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => void loadData()}>Search</Button>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        {lstSummary.map(([strLabel, intCount]) => (
          <Box key={strLabel} sx={{ border: "1px solid #dbe3ef", borderRadius: 2, px: 1.2, py: 0.8, minWidth: 130 }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{strLabel}</Typography>
            <Typography sx={{ fontWeight: 800 }}>{intCount}</Typography>
          </Box>
        ))}
      </Stack>

      <Box sx={{ border: "1px solid #dbe3ef", borderRadius: 2, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th>Employee Code</th><th>Employee Name</th><th>Financial Year</th><th>Tax Regime</th><th>Declared Total</th><th>Approved Total</th><th>Proof Pending</th><th>Status</th><th>Submitted On</th><th>Last Updated</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {lstRows.length === 0 ? <tr><td colSpan={11} style={{ textAlign: "center", padding: 16 }}>No records found.</td></tr> : null}
            {lstRows.map((objRow) => (
              <tr key={objRow.strDeclarationCode}>
                <td>{objRow.strEmployeeCode}</td><td>{objRow.strEmployeeName}</td><td>{objRow.strFinancialYearCode}</td><td>{objRow.strTaxRegime}</td><td>{objRow.decDeclaredTotalAmount}</td><td>{objRow.decApprovedTotalAmount}</td><td>{objRow.intProofPendingCount}</td><td><ITDeclarationStatusBadge strStatus={objRow.strStatus} /></td><td>{objRow.strSubmittedOn || "-"}</td><td>{objRow.strLastUpdated || "-"}</td>
                <td><Button size="small" disabled={!(canDoAny("view") || hasPermissionCode("PAYROLL_IT_DECLARATION_VIEW"))} onClick={() => objRouter.push(`/payroll/it-declaration-review/${objRow.intDeclarationID}`)}>View</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Stack>
  );
}
