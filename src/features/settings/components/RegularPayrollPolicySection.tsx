"use client";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Button, FormControlLabel, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { employeeSeparationService } from "@/features/employeeSeparation/services/employeeSeparationService";
import type { RegularPayrollPolicyCode, RegularPayrollPolicyResponse } from "@/features/employeeSeparation/types";
import { formatDisplayDate, todayText } from "@/features/employeeSeparation/utils";

const dicPolicyHelp: Record<RegularPayrollPolicyCode, string> = {
  ACTIVATION_MONTH: "Left out of regular payroll from the month the separation is activated.",
  LWD_MONTH: "Left out from the month containing the last working date (recommended).",
  POST_LWD_MONTH: "Paid by regular payroll up to the last working date (prorated); left out from the next month.",
};

type Props = {
  blnReadOnly: boolean;
  onMessage: (strMessage: string, strSeverity: "success" | "error") => void;
};

/** F&F Rules > Regular Payroll Processing: from which month an employee with an activated Employee
 * Separation is left out of regular payroll. Saved as a new effective-dated version; separations
 * already activated keep the month worked out when they were activated. */
export default function RegularPayrollPolicySection({ blnReadOnly, onMessage }: Props) {
  const [objData, setObjData] = useState<RegularPayrollPolicyResponse | null>(null);
  const [strPolicyCode, setStrPolicyCode] = useState<RegularPayrollPolicyCode>("LWD_MONTH");
  const [blnAllowOverride, setBlnAllowOverride] = useState(false);
  const [dtEffectiveFrom, setDtEffectiveFrom] = useState(todayText());
  const [blnCompanyOverride, setBlnCompanyOverride] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);

  function apply(objResponse: RegularPayrollPolicyResponse) {
    setObjData(objResponse);
    setStrPolicyCode(objResponse.objEffective.strPolicyCode);
    setBlnAllowOverride(objResponse.objEffective.blnAllowHrOverride);
    setBlnCompanyOverride(objResponse.objEffective.strSource === "COMPANY");
  }

  useEffect(() => {
    employeeSeparationService.getRegularPayrollPolicy()
      .then(apply)
      .catch(async (objError) => onMessage((await createApiRequestError(objError)).message || "Unable to load the regular payroll policy.", "error"));
  }, []);

  async function handleSave() {
    setBlnSaving(true);
    try {
      apply(await employeeSeparationService.saveRegularPayrollPolicy({ strPolicyCode, blnAllowHrOverride: blnAllowOverride, dtEffectiveFrom, blnCompanyOverride }));
      onMessage("Regular payroll policy saved. It applies to separations activated from its effective date; active separations are not changed.", "success");
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message || "Unable to save the regular payroll policy.", "error");
    } finally {
      setBlnSaving(false);
    }
  }

  const sxCard = { p: { xs: 2, md: 2.25 }, borderRadius: "8px", border: "1px solid #dfe9f5", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)", backgroundColor: "#fff" } as const;
  const objEffective = objData?.objEffective;

  return (
    <Paper id="settings-section-fnf-regular-payroll" variant="outlined" sx={sxCard} data-controlid="settings.fnf-rules.regular-payroll.section">
      <Typography sx={{ fontWeight: 800, color: "#172033", fontSize: "0.98rem", lineHeight: 1.2 }}>Regular Payroll Processing</Typography>
      {objEffective ? (
        <Typography sx={{ color: "#48638d", fontSize: "0.82rem", mt: 0.5 }}>
          In force today: <b>{objEffective.strPolicyLabel}</b>
          {objEffective.strSource === "DEFAULT" ? " (built-in default)" : ` (${objEffective.strSource === "COMPANY" ? "this company" : "all companies"}, from ${formatDisplayDate(objEffective.dtEffectiveFrom)})`}
        </Typography>
      ) : null}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(240px, 1fr))" }, gap: 1.5, mt: 1.25 }}>
        <TextField select size="small" label="Exclude from regular payroll" value={strPolicyCode} disabled={blnReadOnly} onChange={(e) => setStrPolicyCode(e.target.value as RegularPayrollPolicyCode)} helperText={dicPolicyHelp[strPolicyCode]} fullWidth inputProps={{ "data-controlid": "settings.fnf-rules.regular-payroll.policy" }}>
          {(objData?.lstPolicyOptions || []).map((objOption) => <MenuItem key={objOption.strCode} value={objOption.strCode}>{objOption.strLabel}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="Effective from" value={dtEffectiveFrom} disabled={blnReadOnly} onChange={(e) => setDtEffectiveFrom(e.target.value)} InputLabelProps={{ shrink: true }} helperText="A new version starts on this date; earlier dates keep their version." fullWidth inputProps={{ "data-controlid": "settings.fnf-rules.regular-payroll.effective-from" }} />
        <FormControlLabel control={<Switch checked={blnAllowOverride} disabled={blnReadOnly} onChange={(_, blnChecked) => setBlnAllowOverride(blnChecked)} />} label={<Typography sx={{ fontSize: "0.85rem" }}>Allow HR to override the policy per separation (reason required)</Typography>} />
        <FormControlLabel control={<Switch checked={blnCompanyOverride} disabled={blnReadOnly} onChange={(_, blnChecked) => setBlnCompanyOverride(blnChecked)} />} label={<Typography sx={{ fontSize: "0.85rem" }}>Applies to this company only (otherwise all companies)</Typography>} />
      </Box>
      {objData?.lstVersions.length ? (
        <Table size="small" sx={{ mt: 1.5 }} data-controlid="settings.fnf-rules.regular-payroll.versions">
          <TableHead>
            <TableRow><TableCell>Scope</TableCell><TableCell>Policy</TableCell><TableCell>HR override</TableCell><TableCell>From</TableCell><TableCell>To</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {objData.lstVersions.map((objVersion) => (
              <TableRow key={objVersion.intID}>
                <TableCell>{objVersion.strScope === "COMPANY" ? "This company" : "All companies"}</TableCell>
                <TableCell>{objVersion.strPolicyLabel}</TableCell>
                <TableCell>{objVersion.blnAllowHrOverride ? "Allowed" : "No"}</TableCell>
                <TableCell>{formatDisplayDate(objVersion.dtEffectiveFrom)}</TableCell>
                <TableCell>{objVersion.dtEffectiveTo ? formatDisplayDate(objVersion.dtEffectiveTo) : "Open"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {!blnReadOnly ? (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
          <Button className="app-btn app-btn-primary" startIcon={<SaveRoundedIcon />} onClick={() => void handleSave()} disabled={blnSaving || !dtEffectiveFrom} controlId="settings.fnf-rules.regular-payroll.save.button">
            {blnSaving ? "Saving..." : "Save Regular Payroll Policy"}
          </Button>
        </Stack>
      ) : null}
    </Paper>
  );
}
