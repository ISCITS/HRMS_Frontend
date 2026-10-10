"use client";

import { useEffect, useMemo, useState } from "react";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Alert, IconButton, Stack, TextField, Tooltip } from "@mui/material";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import {
  separatePayEntitlementService,
  type SeparatePayComponentEntitlementRecord,
} from "@/features/employee-salary-allocation/services/separatePayEntitlementService";

type AddEmployeeSalaryComponentRowProps = {
  strEmployeeID: string;
  onCancel: () => void;
  onSaved: () => void;
};

// Inline "Add Line" row on Employee Salary Detail's Salary Structure grid - same one-row,
// fill-in-place pattern as the Salary Structure editor's own Add Line, not a popup. Assigns any
// active component (Regular or Separate Payroll) directly to this employee without touching the
// assigned Salary Structure, reusing the generalized direct-entitlement mechanism.
export default function AddEmployeeSalaryComponentRow({
  strEmployeeID,
  onCancel,
  onSaved,
}: AddEmployeeSalaryComponentRowProps) {
  const { t } = useEmployeeSalaryLabels();

  const [lstEligibleComponents, setLstEligibleComponents] = useState<SeparatePayComponentEntitlementRecord[]>([]);
  const [blnLoadingOptions, setBlnLoadingOptions] = useState(false);
  const [intSalaryComponentID, setIntSalaryComponentID] = useState<number | "">("");
  const [strAmountMonthly, setStrAmountMonthly] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);

  useEffect(() => {
    setBlnLoadingOptions(true);
    separatePayEntitlementService
      .listEntitlements(strEmployeeID)
      .then((lstFetched) => {
        // Every active component not already assigned to this employee (structure line or a
        // prior direct entitlement) is a valid Add Line target.
        setLstEligibleComponents(lstFetched.filter((dicRow) => dicRow.intEmployeeSalaryComponentID == null));
      })
      .catch((objErr) => {
        setStrError(
          (objErr as Error)?.message ?? t("employee_salary_add_line_load_failed", "Unable to load components."),
        );
        setLstEligibleComponents([]);
      })
      .finally(() => setBlnLoadingOptions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strEmployeeID]);

  const decAmountAnnualPreview = useMemo(() => {
    const decMonthly = Number(strAmountMonthly);
    return strAmountMonthly.trim() && Number.isFinite(decMonthly) ? decMonthly * 12 : null;
  }, [strAmountMonthly]);

  async function handleSave() {
    if (!intSalaryComponentID) {
      setStrError(t("employee_salary_add_line_select_component", "Select a component."));
      return;
    }
    const decAmountMonthly = Number(strAmountMonthly);
    if (!strAmountMonthly.trim() || !Number.isFinite(decAmountMonthly) || decAmountMonthly < 0) {
      setStrError(t("employee_salary_add_line_invalid_amount", "Enter a valid monthly amount."));
      return;
    }
    setBlnSaving(true);
    setStrError(null);
    try {
      await separatePayEntitlementService.saveEntitlement(strEmployeeID, intSalaryComponentID, {
        decAmountMonthly,
        strRemarks: strRemarks.trim() || null,
      });
      onSaved();
    } catch (objErr) {
      setStrError(
        (objErr as Error)?.message ?? t("employee_salary_add_line_save_failed", "Unable to add this component."),
      );
      setBlnSaving(false);
    }
  }

  return (
    <Stack spacing={1} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
      {strError ? <Alert severity="error" sx={{ py: 0.25 }}>{strError}</Alert> : null}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
        <CommonSearchableSelect
          controlId="employee-salary.add-line.component.select"
          label={t("employee_salary_add_line_component", "Component")}
          value={intSalaryComponentID}
          options={lstEligibleComponents.map((dicRow) => ({
            intID: dicRow.intSalaryComponentID,
            strLabel: dicRow.strComponentName,
            strCode: dicRow.strComponentCode,
          }))}
          onChange={(value) => setIntSalaryComponentID(value === "" ? "" : Number(value))}
          placeholder={t("employee_salary_select", "Select")}
          disabled={blnLoadingOptions || blnSaving}
          sx={{ minWidth: 220, maxWidth: 280 }}
          required
        />
        <TextField
          data-controlid="employee-salary.add-line.amount-monthly.input"
          label={t("employee_salary_monthly", "Monthly")}
          size="small"
          type="number"
          value={strAmountMonthly}
          onChange={(objEvent) => setStrAmountMonthly(objEvent.target.value)}
          inputProps={{ min: 0, step: "0.01" }}
          disabled={blnSaving}
          sx={{ width: 150 }}
          required
        />
        <TextField
          data-controlid="employee-salary.add-line.annual-amount.display"
          label={t("employee_salary_annual", "Annual")}
          size="small"
          value={
            decAmountAnnualPreview != null
              ? decAmountAnnualPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : "-"
          }
          disabled
          sx={{ width: 150 }}
        />
        <TextField
          data-controlid="employee-salary.add-line.remarks.input"
          label={t("employee_salary_remarks", "Remarks")}
          size="small"
          value={strRemarks}
          onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
          disabled={blnSaving}
          sx={{ flex: 1, minWidth: 180 }}
        />
        <Stack direction="row" spacing={0.5} sx={{ pt: { md: 0.75 } }}>
          <Tooltip arrow title={t("save", "Save")}>
            <span>
              <IconButton
                data-controlid="employee-salary.add-line.save.button"
                color="primary"
                onClick={() => void handleSave()}
                disabled={blnSaving || blnLoadingOptions}
              >
                <CheckRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip arrow title={t("cancel", "Cancel")}>
            <span>
              <IconButton
                data-controlid="employee-salary.add-line.cancel.button"
                onClick={onCancel}
                disabled={blnSaving}
              >
                <CloseRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Stack>
  );
}
