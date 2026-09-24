"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import {
  separatePayEntitlementService,
  type SeparatePayComponentEntitlementRecord,
} from "@/features/employee-salary-allocation/services/separatePayEntitlementService";

type AddEmployeeSalaryComponentDialogProps = {
  strEmployeeID: string;
  blnOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

// "Add Line" on Employee Salary Detail - assigns any active component (Regular or Separate
// Payroll) directly to this employee without touching the assigned Salary Structure, reusing the
// same generalized direct-entitlement mechanism as separatePayEntitlementService.
export default function AddEmployeeSalaryComponentDialog({
  strEmployeeID,
  blnOpen,
  onClose,
  onSaved,
}: AddEmployeeSalaryComponentDialogProps) {
  const { t } = useEmployeeSalaryLabels();

  const [lstEligibleComponents, setLstEligibleComponents] = useState<SeparatePayComponentEntitlementRecord[]>([]);
  const [blnLoadingOptions, setBlnLoadingOptions] = useState(false);
  const [intSalaryComponentID, setIntSalaryComponentID] = useState<number | "">("");
  const [strAmountMonthly, setStrAmountMonthly] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);

  useEffect(() => {
    if (!blnOpen) {
      return;
    }
    setIntSalaryComponentID("");
    setStrAmountMonthly("");
    setStrRemarks("");
    setStrError(null);
    setBlnLoadingOptions(true);
    separatePayEntitlementService
      .listEntitlements(strEmployeeID)
      .then((lstFetched) => {
        setLstEligibleComponents(lstFetched.filter((dicRow) => dicRow.intEmployeeSalaryComponentID == null));
      })
      .catch((objErr) => {
        setStrError(
          (objErr as Error)?.message ?? t("employee_salary_add_line_load_failed", "Unable to load components."),
        );
        setLstEligibleComponents([]);
      })
      .finally(() => setBlnLoadingOptions(false));
  }, [blnOpen, strEmployeeID, t]);

  const objSelectedComponent = useMemo(
    () => lstEligibleComponents.find((dicRow) => dicRow.intSalaryComponentID === intSalaryComponentID) ?? null,
    [lstEligibleComponents, intSalaryComponentID],
  );

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
      onClose();
    } catch (objErr) {
      setStrError(
        (objErr as Error)?.message ?? t("employee_salary_add_line_save_failed", "Unable to add this component."),
      );
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Dialog open={blnOpen} onClose={blnSaving ? undefined : onClose} maxWidth="xs" fullWidth>
      <BlockingLoader blnOpen={blnSaving} strLabel={t("working", "Please wait...")} />
      <DialogTitle>{t("employee_salary_add_line_title", "Add Component")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {strError ? <Alert severity="error">{strError}</Alert> : null}
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
            disabled={blnLoadingOptions}
            required
          />
          <TextField
            data-controlid="employee-salary.add-line.amount-monthly.input"
            label={t("employee_salary_add_line_monthly_amount", "Monthly Amount")}
            type="number"
            value={strAmountMonthly}
            onChange={(objEvent) => setStrAmountMonthly(objEvent.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            fullWidth
            required
          />
          <TextField
            data-controlid="employee-salary.add-line.annual-amount.display"
            label={t("employee_salary_annual", "Annual")}
            value={
              decAmountAnnualPreview != null
                ? decAmountAnnualPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "-"
            }
            fullWidth
            disabled
          />
          <TextField
            data-controlid="employee-salary.add-line.remarks.input"
            label={t("employee_salary_remarks", "Remarks")}
            value={strRemarks}
            onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          {objSelectedComponent?.strVariablePayCalculationMethodCode === "ALLOCATION_BASED" ? (
            <Typography sx={{ fontSize: "0.8rem", color: "#61738b" }}>
              {t(
                "employee_salary_add_line_allocation_hint",
                "This component splits by entity - configure the allocation from the grid once saved.",
              )}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button data-controlid="employee-salary.add-line.cancel.button" onClick={onClose} disabled={blnSaving}>
          {t("cancel", "Cancel")}
        </Button>
        <Button
          data-controlid="employee-salary.add-line.save.button"
          variant="contained"
          onClick={() => void handleSave()}
          disabled={blnSaving || blnLoadingOptions}
        >
          {t("save", "Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
