"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import { taxRegimeService } from "@/features/tax-regimes/services/taxRegimeService";
import type {
  TaxCessRuleFormValue,
  TaxRegimeDetailRecord,
  TaxRebateRuleFormValue,
  TaxStandardDeductionRuleFormValue,
  TaxSurchargeSlabFormValue,
} from "@/features/tax-regimes/types";

type RuleType = "standard-deduction" | "rebate" | "surcharge" | "cess";

type TaxRuleMaintenancePageProps = {
  intTaxRegimeID: number;
  strRuleType: RuleType;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createStandardDeductionRow(strTaxYearCode: string, strDefaultEffectiveFrom?: string): TaxStandardDeductionRuleFormValue {
  return {
    strRowID: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strTaxYearCode,
    strIncomeSourceCode: "SALARY",
    strTaxpayerTypeCode: "INDIVIDUAL",
    strResidentialStatusCode: "ANY",
    strDeductionModeCode: "FIXED",
    decDeductionAmount: "0",
    decDeductionPercent: "",
    decMaximumDeductionAmount: "",
    dtEffectiveFrom: strDefaultEffectiveFrom || getTodayDateInputValue(),
    dtEffectiveTo: "",
    blnIsActive: true,
    strLegalReference: "",
    strRemarks: "",
  };
}

function createRebateRow(strTaxYearCode: string, strDefaultEffectiveFrom?: string): TaxRebateRuleFormValue {
  return {
    strRowID: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strTaxYearCode,
    strRebateCode: "",
    strTaxpayerTypeCode: "INDIVIDUAL",
    strResidentialStatusCode: "RESIDENT",
    decMinimumTotalIncome: "0",
    decMaximumTotalIncome: "",
    strRebateModeCode: "LOWER_OF_TAX_OR_CAP",
    decMaximumRebateAmount: "",
    decRebatePercent: "100",
    blnMarginalReliefEnabled: false,
    blnExcludesSpecialRateIncome: true,
    dtEffectiveFrom: strDefaultEffectiveFrom || getTodayDateInputValue(),
    dtEffectiveTo: "",
    blnIsActive: true,
    strLegalReference: "",
  };
}

function createSurchargeRow(strTaxYearCode: string, strDefaultEffectiveFrom?: string): TaxSurchargeSlabFormValue {
  return {
    strRowID: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strTaxYearCode,
    strSurchargeProfileCode: "GENERAL",
    decIncomeFromAmount: "0",
    decIncomeToAmount: "",
    decSurchargeRatePercent: "0",
    blnMarginalReliefEnabled: true,
    decMaximumRateCapPercent: "",
    intDisplayOrder: "10",
    dtEffectiveFrom: strDefaultEffectiveFrom || getTodayDateInputValue(),
    dtEffectiveTo: "",
    blnIsActive: true,
    strLegalReference: "",
  };
}

function createCessRow(strTaxYearCode: string, strDefaultEffectiveFrom?: string): TaxCessRuleFormValue {
  return {
    strRowID: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strTaxYearCode,
    strCessCode: "",
    strCessName: "",
    decCessRatePercent: "0",
    strCalculationBaseCode: "TAX_PLUS_SURCHARGE",
    intDisplayOrder: "10",
    dtEffectiveFrom: strDefaultEffectiveFrom || getTodayDateInputValue(),
    dtEffectiveTo: "",
    blnIsActive: true,
    strLegalReference: "",
  };
}

export default function TaxRuleMaintenancePage({ intTaxRegimeID, strRuleType }: TaxRuleMaintenancePageProps) {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [objRegime, setObjRegime] = useState<TaxRegimeDetailRecord | null>(null);
  const [lstFinancialYears, setLstFinancialYears] = useState<string[]>([]);
  const [lstStandardDeductionRules, setLstStandardDeductionRules] = useState<TaxStandardDeductionRuleFormValue[]>([]);
  const [lstRebateRules, setLstRebateRules] = useState<TaxRebateRuleFormValue[]>([]);
  const [lstSurchargeSlabs, setLstSurchargeSlabs] = useState<TaxSurchargeSlabFormValue[]>([]);
  const [lstCessRules, setLstCessRules] = useState<TaxCessRuleFormValue[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  const blnCanView = canViewAny();
  const blnCanEdit = canDoAny("edit");
  const blnReadOnly = blnCanView && !blnCanEdit;

  function getUniqueFinancialYears(...lstYearValues: Array<string | null | undefined>) {
    return [...new Set(lstYearValues.map((strYearValue) => (strYearValue ?? "").trim()).filter(Boolean))];
  }

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      if (blnRightsLoading) {
        return;
      }
      if (!blnCanView) {
        if (blnMounted) {
          setBlnLoading(false);
        }
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const dicRegime = await taxRegimeService.getTaxRegimeById(intTaxRegimeID);
        if (!blnMounted) {
          return;
        }
        setObjRegime(dicRegime);
        setLstFinancialYears(getUniqueFinancialYears(dicRegime.strTaxYearCode, dicRegime.strEffectiveFromYear));
        const strDefaultEffectiveFrom = dicRegime.dtEffectiveFrom || undefined;
        if (strRuleType === "standard-deduction") {
          const dicWorkspace = await taxRegimeService.getTaxStandardDeductionRules(intTaxRegimeID);
          if (!blnMounted) return;
          setLstStandardDeductionRules(dicWorkspace.lstRecords.length > 0 ? dicWorkspace.lstRecords : [createStandardDeductionRow(dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]);
        }
        if (strRuleType === "rebate") {
          const dicWorkspace = await taxRegimeService.getTaxRebateRules(intTaxRegimeID);
          if (!blnMounted) return;
          setLstRebateRules(dicWorkspace.lstRecords.length > 0 ? dicWorkspace.lstRecords : [createRebateRow(dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]);
        }
        if (strRuleType === "surcharge") {
          const dicWorkspace = await taxRegimeService.getTaxSurchargeSlabs(intTaxRegimeID);
          if (!blnMounted) return;
          setLstSurchargeSlabs(dicWorkspace.lstRecords.length > 0 ? dicWorkspace.lstRecords : [createSurchargeRow(dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]);
        }
        if (strRuleType === "cess") {
          const dicWorkspace = await taxRegimeService.getTaxCessRules(intTaxRegimeID);
          if (!blnMounted) return;
          setLstCessRules(dicWorkspace.lstRecords.length > 0 ? dicWorkspace.lstRecords : [createCessRow(dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]);
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("load_tax_rule_workspace_failed", "Unable to load tax rule workspace."));
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }
    loadData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [blnCanView, blnRightsLoading, intTaxRegimeID, strRuleType]);

  function getTitle() {
    if (strRuleType === "standard-deduction") return t("manage_standard_deduction", "Manage Standard Deduction");
    if (strRuleType === "rebate") return t("manage_rebate", "Manage Rebate");
    if (strRuleType === "surcharge") return t("manage_surcharge", "Manage Surcharge");
    return t("manage_cess", "Manage Cess");
  }

  function handleAddRow() {
    const strTaxYearCode = objRegime?.strTaxYearCode || lstFinancialYears[0] || "";
    const strDefaultEffectiveFrom = objRegime?.dtEffectiveFrom || undefined;
    if (strRuleType === "standard-deduction") setLstStandardDeductionRules((lstPrevious) => [...lstPrevious, createStandardDeductionRow(strTaxYearCode, strDefaultEffectiveFrom)]);
    if (strRuleType === "rebate") setLstRebateRules((lstPrevious) => [...lstPrevious, createRebateRow(strTaxYearCode, strDefaultEffectiveFrom)]);
    if (strRuleType === "surcharge") setLstSurchargeSlabs((lstPrevious) => [...lstPrevious, createSurchargeRow(strTaxYearCode, strDefaultEffectiveFrom)]);
    if (strRuleType === "cess") setLstCessRules((lstPrevious) => [...lstPrevious, createCessRow(strTaxYearCode, strDefaultEffectiveFrom)]);
  }

  function handleDeleteRow(strRowID: string) {
    if (strRuleType === "standard-deduction") setLstStandardDeductionRules((lstPrevious) => lstPrevious.length === 1 ? lstPrevious : lstPrevious.filter((dicRow) => dicRow.strRowID !== strRowID));
    if (strRuleType === "rebate") setLstRebateRules((lstPrevious) => lstPrevious.length === 1 ? lstPrevious : lstPrevious.filter((dicRow) => dicRow.strRowID !== strRowID));
    if (strRuleType === "surcharge") setLstSurchargeSlabs((lstPrevious) => lstPrevious.length === 1 ? lstPrevious : lstPrevious.filter((dicRow) => dicRow.strRowID !== strRowID));
    if (strRuleType === "cess") setLstCessRules((lstPrevious) => lstPrevious.length === 1 ? lstPrevious : lstPrevious.filter((dicRow) => dicRow.strRowID !== strRowID));
  }

  function updateRow<T extends { strRowID: string }>(lstRows: T[], strRowID: string, strField: keyof T, objValue: string | boolean) {
    return lstRows.map((dicRow) => dicRow.strRowID === strRowID ? { ...dicRow, [strField]: objValue } : dicRow);
  }

  async function handleSave() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      if (strRuleType === "standard-deduction") {
        await taxRegimeService.saveTaxStandardDeductionRules(intTaxRegimeID, lstStandardDeductionRules);
      }
      if (strRuleType === "rebate") {
        await taxRegimeService.saveTaxRebateRules(intTaxRegimeID, lstRebateRules);
      }
      if (strRuleType === "surcharge") {
        await taxRegimeService.saveTaxSurchargeSlabs(intTaxRegimeID, lstSurchargeSlabs);
      }
      if (strRuleType === "cess") {
        await taxRegimeService.saveTaxCessRules(intTaxRegimeID, lstCessRules);
      }
      setStrSuccess(t("save_tax_rules_success", "Tax rules saved successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("save_tax_rules_failed", "Unable to save tax rules."));
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_tax_rule_workspace", "Loading tax rule workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView || !objRegime) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("access_denied_tax_rules", "Tax rule access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_tax_rules_help", "Contact your administrator if you need tax rule maintenance access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper sx={{ borderRadius: "var(--app-card-radius)", p: "10px", border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(135deg, #fffdf5 0%, #f7fbff 60%, #f8fafc 100%)" }}>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>{getTitle()}</Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>{objRegime.strRegimeCode} | {objRegime.strRegimeName} | {objRegime.strTaxYearCode}</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}`)}>
                {t("back_to_regime", "Back to regime")}
              </Button>
              {blnCanEdit ? (
                <>
                  <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddRow}>{t("add_row", "Add Row")}</Button>
                  <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>{blnSaving ? t("saving", "Saving...") : t("save", "Save")}</Button>
                </>
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Rules.")}</Alert> : null}

      <Box className={styles.tableCard}>
        <Box className={styles.tableWrap}>
          {strRuleType === "standard-deduction" ? (
            <table className={styles.table}>
              <thead><tr><th>Tax Year</th><th>Income Source</th><th>Taxpayer Type</th><th>Residential Status</th><th>Mode</th><th>Amount</th><th>%</th><th>Max Amount</th><th>Effective From</th><th>Effective To</th><th>Active</th><th>Action</th></tr></thead>
              <tbody>{lstStandardDeductionRules.map((dicRow) => (
                <tr key={dicRow.strRowID}>
                  <td><TextField select size="small" value={dicRow.strTaxYearCode} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strTaxYearCode", objEvent.target.value))} disabled={blnReadOnly}>{lstFinancialYears.map((strYear) => <MenuItem key={strYear} value={strYear}>{strYear}</MenuItem>)}</TextField></td>
                  <td><TextField size="small" value={dicRow.strIncomeSourceCode} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strIncomeSourceCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strTaxpayerTypeCode} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strTaxpayerTypeCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strResidentialStatusCode} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strResidentialStatusCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strDeductionModeCode} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strDeductionModeCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decDeductionAmount} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decDeductionAmount", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decDeductionPercent} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decDeductionPercent", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decMaximumDeductionAmount} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decMaximumDeductionAmount", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" type="date" value={dicRow.dtEffectiveFrom} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "dtEffectiveFrom", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" type="date" value={dicRow.dtEffectiveTo} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "dtEffectiveTo", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><Switch checked={dicRow.blnIsActive} onChange={(objEvent) => setLstStandardDeductionRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "blnIsActive", objEvent.target.checked))} disabled={blnReadOnly} /></td>
                  <td><Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDeleteRow(dicRow.strRowID)} disabled={blnReadOnly}>Remove</Button></td>
                </tr>
              ))}</tbody>
            </table>
          ) : null}

          {strRuleType === "rebate" ? (
            <table className={styles.table}>
              <thead><tr><th>Tax Year</th><th>Rebate Code</th><th>Taxpayer Type</th><th>Residential Status</th><th>Min Income</th><th>Max Income</th><th>Mode</th><th>Cap</th><th>%</th><th>Marginal Relief</th><th>Exclude Special Rate</th><th>Action</th></tr></thead>
              <tbody>{lstRebateRules.map((dicRow) => (
                <tr key={dicRow.strRowID}>
                  <td><TextField select size="small" value={dicRow.strTaxYearCode} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strTaxYearCode", objEvent.target.value))} disabled={blnReadOnly}>{lstFinancialYears.map((strYear) => <MenuItem key={strYear} value={strYear}>{strYear}</MenuItem>)}</TextField></td>
                  <td><TextField size="small" value={dicRow.strRebateCode} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strRebateCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strTaxpayerTypeCode} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strTaxpayerTypeCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strResidentialStatusCode} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strResidentialStatusCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decMinimumTotalIncome} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decMinimumTotalIncome", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decMaximumTotalIncome} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decMaximumTotalIncome", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strRebateModeCode} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strRebateModeCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decMaximumRebateAmount} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decMaximumRebateAmount", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decRebatePercent} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decRebatePercent", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><Switch checked={dicRow.blnMarginalReliefEnabled} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "blnMarginalReliefEnabled", objEvent.target.checked))} disabled={blnReadOnly} /></td>
                  <td><Switch checked={dicRow.blnExcludesSpecialRateIncome} onChange={(objEvent) => setLstRebateRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "blnExcludesSpecialRateIncome", objEvent.target.checked))} disabled={blnReadOnly} /></td>
                  <td><Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDeleteRow(dicRow.strRowID)} disabled={blnReadOnly}>Remove</Button></td>
                </tr>
              ))}</tbody>
            </table>
          ) : null}

          {strRuleType === "surcharge" ? (
            <table className={styles.table}>
              <thead><tr><th>Tax Year</th><th>Profile</th><th>Income From</th><th>Income To</th><th>Rate %</th><th>Marginal Relief</th><th>Max Cap %</th><th>Display Order</th><th>Action</th></tr></thead>
              <tbody>{lstSurchargeSlabs.map((dicRow) => (
                <tr key={dicRow.strRowID}>
                  <td><TextField select size="small" value={dicRow.strTaxYearCode} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strTaxYearCode", objEvent.target.value))} disabled={blnReadOnly}>{lstFinancialYears.map((strYear) => <MenuItem key={strYear} value={strYear}>{strYear}</MenuItem>)}</TextField></td>
                  <td><TextField size="small" value={dicRow.strSurchargeProfileCode} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strSurchargeProfileCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decIncomeFromAmount} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decIncomeFromAmount", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decIncomeToAmount} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decIncomeToAmount", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decSurchargeRatePercent} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decSurchargeRatePercent", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><Switch checked={dicRow.blnMarginalReliefEnabled} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "blnMarginalReliefEnabled", objEvent.target.checked))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decMaximumRateCapPercent} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decMaximumRateCapPercent", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.intDisplayOrder} onChange={(objEvent) => setLstSurchargeSlabs((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "intDisplayOrder", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDeleteRow(dicRow.strRowID)} disabled={blnReadOnly}>Remove</Button></td>
                </tr>
              ))}</tbody>
            </table>
          ) : null}

          {strRuleType === "cess" ? (
            <table className={styles.table}>
              <thead><tr><th>Tax Year</th><th>Cess Code</th><th>Cess Name</th><th>Rate %</th><th>Calculation Base</th><th>Display Order</th><th>Action</th></tr></thead>
              <tbody>{lstCessRules.map((dicRow) => (
                <tr key={dicRow.strRowID}>
                  <td><TextField select size="small" value={dicRow.strTaxYearCode} onChange={(objEvent) => setLstCessRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strTaxYearCode", objEvent.target.value))} disabled={blnReadOnly}>{lstFinancialYears.map((strYear) => <MenuItem key={strYear} value={strYear}>{strYear}</MenuItem>)}</TextField></td>
                  <td><TextField size="small" value={dicRow.strCessCode} onChange={(objEvent) => setLstCessRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strCessCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strCessName} onChange={(objEvent) => setLstCessRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strCessName", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.decCessRatePercent} onChange={(objEvent) => setLstCessRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "decCessRatePercent", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.strCalculationBaseCode} onChange={(objEvent) => setLstCessRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "strCalculationBaseCode", objEvent.target.value.toUpperCase()))} disabled={blnReadOnly} /></td>
                  <td><TextField size="small" value={dicRow.intDisplayOrder} onChange={(objEvent) => setLstCessRules((lstPrevious) => updateRow(lstPrevious, dicRow.strRowID, "intDisplayOrder", objEvent.target.value))} disabled={blnReadOnly} /></td>
                  <td><Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDeleteRow(dicRow.strRowID)} disabled={blnReadOnly}>Remove</Button></td>
                </tr>
              ))}</tbody>
            </table>
          ) : null}
        </Box>
      </Box>
    </Stack>
  );
}
