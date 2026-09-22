"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Alert,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  separatePayEntitlementService,
  type SeparatePayComponentEntitlementRecord,
} from "@/features/employee-salary-allocation/services/separatePayEntitlementService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SeparatePayEntitlementPanelProps = {
  strEmployeeID: string;
};

const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE_SALARIES"];

// Developer Guide s6, last bullet: keeps the Salary Structure master focused on Regular
// components; a Separate-Payroll component's employee-specific CTC/Variable Pay entitlement is
// assigned here instead, directly against the employee's current salary structure period.
export default function SeparatePayEntitlementPanel({ strEmployeeID }: SeparatePayEntitlementPanelProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee-salary-allocation", "Unable to load Separate Payroll entitlement labels.");
  const objAccess = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const blnCanEdit = objAccess.canDoAny("edit") || objAccess.canDoAny("add") || objAccess.canDoAny("save");

  const [lstRecords, setLstRecords] = useState<SeparatePayComponentEntitlementRecord[]>([]);
  const [dicAmountByComponentID, setDicAmountByComponentID] = useState<Record<number, string>>({});
  const [blnBusy, setBlnBusy] = useState(false);
  const [intSavingComponentID, setIntSavingComponentID] = useState<number | null>(null);
  const [strError, setStrError] = useState<string | null>(null);
  const [strSuccess, setStrSuccess] = useState<string | null>(null);

  async function loadEntitlements() {
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const lstFetched = await separatePayEntitlementService.listEntitlements(strEmployeeID);
      setLstRecords(lstFetched);
      const dicAmount: Record<number, string> = {};
      for (const dicRow of lstFetched) {
        dicAmount[dicRow.intSalaryComponentID] =
          dicRow.decAmountMonthly != null ? String(dicRow.decAmountMonthly) : "";
      }
      setDicAmountByComponentID(dicAmount);
    } catch (objErr) {
      setStrError(
        (objErr as Error)?.message ??
          t("separate_pay_load_failed", "Unable to load Separate Payroll component entitlements."),
      );
      setLstRecords([]);
    } finally {
      setBlnBusy(false);
    }
  }

  useEffect(() => {
    if (objAccess.blnLoading) {
      return;
    }
    void loadEntitlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objAccess.blnLoading, strEmployeeID]);

  async function handleSave(dicRow: SeparatePayComponentEntitlementRecord) {
    const strAmount = dicAmountByComponentID[dicRow.intSalaryComponentID] ?? "";
    const decAmount = Number(strAmount);
    if (!strAmount.trim() || !Number.isFinite(decAmount) || decAmount < 0) {
      setStrError(t("separate_pay_invalid_amount", "Enter a valid monthly amount before saving."));
      return;
    }
    setIntSavingComponentID(dicRow.intSalaryComponentID);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objSaved = await separatePayEntitlementService.saveEntitlement(strEmployeeID, dicRow.intSalaryComponentID, {
        decAmountMonthly: decAmount,
      });
      setLstRecords((lstPrevious) =>
        lstPrevious.map((dicPreviousRow) =>
          dicPreviousRow.intSalaryComponentID === dicRow.intSalaryComponentID
            ? {
                ...dicPreviousRow,
                intEmployeeSalaryComponentID: objSaved.intEmployeeSalaryComponentID,
                decAmountMonthly: objSaved.decAmountMonthly,
                decAmountAnnual: objSaved.decAmountAnnual,
              }
            : dicPreviousRow,
        ),
      );
      setStrSuccess(
        t("separate_pay_save_success", "{component} entitlement saved successfully.").replace(
          "{component}",
          dicRow.strComponentName,
        ),
      );
    } catch (objErr) {
      setStrError(
        (objErr as Error)?.message ?? t("separate_pay_save_failed", "Unable to save this entitlement."),
      );
    } finally {
      setIntSavingComponentID(null);
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={800}>
          {t("separate_pay_page_title", "Separate Payroll Entitlements")}
        </Typography>
        <Button
          data-control-id="separate-pay-entitlement.header.back.button"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push(`/employee-salary/${strEmployeeID}`)}
        >
          {t("back_button", "Back")}
        </Button>
      </Stack>

      <Alert severity="info">
        {t(
          "separate_pay_help_text",
          "These salary components use Separate Payroll processing and are intentionally kept off the Salary Structure line list. Assign the employee's monthly entitlement here; it feeds Variable Pay Calculation and the regular payroll tax projection.",
        )}
      </Alert>

      {strError ? (
        <Alert severity="error" onClose={() => setStrError(null)}>
          {strError}
        </Alert>
      ) : null}
      {strSuccess ? (
        <Alert severity="success" onClose={() => setStrSuccess(null)}>
          {strSuccess}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
          <Typography variant="h6">{t("separate_pay_grid_title", "Components")}</Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => void loadEntitlements()}
            disabled={blnBusy}
            data-control-id="separate-pay-entitlement.grid.refresh.button"
          >
            {t("refresh", "Refresh")}
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("component_code", "Code")}</TableCell>
                <TableCell>{t("component_name", "Component")}</TableCell>
                <TableCell>{t("calculation_method", "Calculation Method")}</TableCell>
                <TableCell align="right">{t("monthly_amount", "Monthly Amount")}</TableCell>
                <TableCell align="right">{t("annual_amount", "Annual Amount")}</TableCell>
                <TableCell align="center">{t("actions", "Actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstRecords.map((dicRow) => (
                <TableRow key={dicRow.intSalaryComponentID} hover>
                  <TableCell>{dicRow.strComponentCode}</TableCell>
                  <TableCell>{dicRow.strComponentName}</TableCell>
                  <TableCell>{dicRow.strVariablePayCalculationMethodCode}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={dicAmountByComponentID[dicRow.intSalaryComponentID] ?? ""}
                      onChange={(objEvent) =>
                        setDicAmountByComponentID((dicPrevious) => ({
                          ...dicPrevious,
                          [dicRow.intSalaryComponentID]: objEvent.target.value,
                        }))
                      }
                      disabled={!blnCanEdit || intSavingComponentID === dicRow.intSalaryComponentID}
                      inputProps={{
                        controlId: `separate-pay-entitlement.grid.amount-${dicRow.intSalaryComponentID}.input`,
                        min: 0,
                        step: "0.01",
                        style: { textAlign: "right" },
                      }}
                      sx={{ width: 160 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {dicRow.decAmountAnnual != null
                      ? dicRow.decAmountAnnual.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {blnCanEdit ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SaveRoundedIcon />}
                          onClick={() => void handleSave(dicRow)}
                          disabled={intSavingComponentID === dicRow.intSalaryComponentID}
                          data-control-id={`separate-pay-entitlement.grid.save-${dicRow.intSalaryComponentID}.button`}
                        >
                          {t("save", "Save")}
                        </Button>
                      ) : null}
                      {dicRow.intEmployeeSalaryComponentID && dicRow.strVariablePayCalculationMethodCode === "ALLOCATION_BASED" ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<TuneRoundedIcon />}
                          onClick={() =>
                            objRouter.push(`/employee-salary/allocation/${dicRow.intEmployeeSalaryComponentID}`)
                          }
                          data-control-id={`separate-pay-entitlement.grid.allocate-${dicRow.intSalaryComponentID}.button`}
                        >
                          {t("configure_allocation", "Configure Allocation")}
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {lstRecords.length === 0 && !blnBusy ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    {t(
                      "separate_pay_no_components",
                      "No Separate Payroll salary components are configured yet.",
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
