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
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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
import { objTaxRegimeCommonTableSx, TaxRegimeActionGroup, TaxRegimeWorkspaceHeader, type TaxRegimeSaveBridge } from "@/features/tax-regimes/components/TaxRegimeWorkspace";

export type RuleType = "standard-deduction" | "rebate" | "surcharge" | "cess";

type TaxRuleMaintenancePageProps = {
  intTaxRegimeID: number;
  blnEmbedded?: boolean;
  onSaveBridgeChange?: (objBridge: TaxRegimeSaveBridge) => void;
};

const lstRuleTypes: RuleType[] = ["standard-deduction", "rebate", "surcharge", "cess"];

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];

// A single row shape that covers all four rule types. Only the fields relevant
// to a row's own strRuleType are editable; the rest stay disabled/blank and are
// dropped when the row is mapped back to its type-specific shape on save.
type UnifiedRuleRow = {
  strRowID: string;
  strRuleType: RuleType;
  strTaxYearCode: string;
  strCode: string;
  strName: string;
  strTaxpayerTypeCode: string;
  strResidentialStatusCode: string;
  strModeCode: string;
  strFromAmount: string;
  strToAmount: string;
  strAmount: string;
  strRatePercent: string;
  strCapAmount: string;
  strMaxCapPercent: string;
  blnMarginalReliefEnabled: boolean;
  blnExcludesSpecialRateIncome: boolean;
  strDisplayOrder: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
};

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createUnifiedRow(strRuleType: RuleType, strTaxYearCode: string, strDefaultEffectiveFrom?: string): UnifiedRuleRow {
  return {
    strRowID: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strRuleType,
    strTaxYearCode,
    strCode: "",
    strName: "",
    strTaxpayerTypeCode: strRuleType === "standard-deduction" || strRuleType === "rebate" ? "INDIVIDUAL" : "",
    strResidentialStatusCode: strRuleType === "standard-deduction" ? "ANY" : strRuleType === "rebate" ? "RESIDENT" : "",
    strModeCode: strRuleType === "standard-deduction" ? "FIXED" : strRuleType === "rebate" ? "LOWER_OF_TAX_OR_CAP" : strRuleType === "cess" ? "TAX_PLUS_SURCHARGE" : "",
    strFromAmount: strRuleType === "rebate" || strRuleType === "surcharge" ? "0" : "",
    strToAmount: "",
    strAmount: strRuleType === "standard-deduction" ? "0" : "",
    strRatePercent: strRuleType === "rebate" ? "100" : strRuleType === "surcharge" || strRuleType === "cess" ? "0" : "",
    strCapAmount: "",
    strMaxCapPercent: "",
    blnMarginalReliefEnabled: strRuleType === "surcharge",
    blnExcludesSpecialRateIncome: strRuleType === "rebate",
    strDisplayOrder: strRuleType === "surcharge" || strRuleType === "cess" ? "10" : "",
    dtEffectiveFrom: strDefaultEffectiveFrom || getTodayDateInputValue(),
    dtEffectiveTo: "",
    blnIsActive: true,
  };
}

function fromStandardDeductionRow(dic: TaxStandardDeductionRuleFormValue): UnifiedRuleRow {
  return {
    strRowID: dic.strRowID, strRuleType: "standard-deduction", strTaxYearCode: dic.strTaxYearCode,
    strCode: dic.strIncomeSourceCode, strName: "", strTaxpayerTypeCode: dic.strTaxpayerTypeCode,
    strResidentialStatusCode: dic.strResidentialStatusCode, strModeCode: dic.strDeductionModeCode,
    strFromAmount: "", strToAmount: "", strAmount: dic.decDeductionAmount, strRatePercent: dic.decDeductionPercent,
    strCapAmount: dic.decMaximumDeductionAmount, strMaxCapPercent: "", blnMarginalReliefEnabled: false,
    blnExcludesSpecialRateIncome: false, strDisplayOrder: "", dtEffectiveFrom: dic.dtEffectiveFrom,
    dtEffectiveTo: dic.dtEffectiveTo, blnIsActive: dic.blnIsActive,
  };
}

function fromRebateRow(dic: TaxRebateRuleFormValue): UnifiedRuleRow {
  return {
    strRowID: dic.strRowID, strRuleType: "rebate", strTaxYearCode: dic.strTaxYearCode,
    strCode: dic.strRebateCode, strName: "", strTaxpayerTypeCode: dic.strTaxpayerTypeCode,
    strResidentialStatusCode: dic.strResidentialStatusCode, strModeCode: dic.strRebateModeCode,
    strFromAmount: dic.decMinimumTotalIncome, strToAmount: dic.decMaximumTotalIncome, strAmount: "",
    strRatePercent: dic.decRebatePercent, strCapAmount: dic.decMaximumRebateAmount, strMaxCapPercent: "",
    blnMarginalReliefEnabled: dic.blnMarginalReliefEnabled, blnExcludesSpecialRateIncome: dic.blnExcludesSpecialRateIncome,
    strDisplayOrder: "", dtEffectiveFrom: dic.dtEffectiveFrom, dtEffectiveTo: dic.dtEffectiveTo, blnIsActive: dic.blnIsActive,
  };
}

function fromSurchargeRow(dic: TaxSurchargeSlabFormValue): UnifiedRuleRow {
  return {
    strRowID: dic.strRowID, strRuleType: "surcharge", strTaxYearCode: dic.strTaxYearCode,
    strCode: dic.strSurchargeProfileCode, strName: "", strTaxpayerTypeCode: "", strResidentialStatusCode: "",
    strModeCode: "", strFromAmount: dic.decIncomeFromAmount, strToAmount: dic.decIncomeToAmount, strAmount: "",
    strRatePercent: dic.decSurchargeRatePercent, strCapAmount: "", strMaxCapPercent: dic.decMaximumRateCapPercent,
    blnMarginalReliefEnabled: dic.blnMarginalReliefEnabled, blnExcludesSpecialRateIncome: false,
    strDisplayOrder: dic.intDisplayOrder, dtEffectiveFrom: dic.dtEffectiveFrom, dtEffectiveTo: dic.dtEffectiveTo, blnIsActive: dic.blnIsActive,
  };
}

function fromCessRow(dic: TaxCessRuleFormValue): UnifiedRuleRow {
  return {
    strRowID: dic.strRowID, strRuleType: "cess", strTaxYearCode: dic.strTaxYearCode,
    strCode: dic.strCessCode, strName: dic.strCessName, strTaxpayerTypeCode: "", strResidentialStatusCode: "",
    strModeCode: dic.strCalculationBaseCode, strFromAmount: "", strToAmount: "", strAmount: "",
    strRatePercent: dic.decCessRatePercent, strCapAmount: "", strMaxCapPercent: "", blnMarginalReliefEnabled: false,
    blnExcludesSpecialRateIncome: false, strDisplayOrder: dic.intDisplayOrder, dtEffectiveFrom: dic.dtEffectiveFrom,
    dtEffectiveTo: dic.dtEffectiveTo, blnIsActive: dic.blnIsActive,
  };
}

function toStandardDeductionRow(dic: UnifiedRuleRow): TaxStandardDeductionRuleFormValue {
  return {
    strRowID: dic.strRowID, strTaxYearCode: dic.strTaxYearCode, strIncomeSourceCode: dic.strCode,
    strTaxpayerTypeCode: dic.strTaxpayerTypeCode, strResidentialStatusCode: dic.strResidentialStatusCode,
    strDeductionModeCode: dic.strModeCode, decDeductionAmount: dic.strAmount, decDeductionPercent: dic.strRatePercent,
    decMaximumDeductionAmount: dic.strCapAmount, dtEffectiveFrom: dic.dtEffectiveFrom, dtEffectiveTo: dic.dtEffectiveTo,
    blnIsActive: dic.blnIsActive, strLegalReference: "", strRemarks: "",
  };
}

function toRebateRow(dic: UnifiedRuleRow): TaxRebateRuleFormValue {
  return {
    strRowID: dic.strRowID, strTaxYearCode: dic.strTaxYearCode, strRebateCode: dic.strCode,
    strTaxpayerTypeCode: dic.strTaxpayerTypeCode, strResidentialStatusCode: dic.strResidentialStatusCode,
    decMinimumTotalIncome: dic.strFromAmount, decMaximumTotalIncome: dic.strToAmount, strRebateModeCode: dic.strModeCode,
    decMaximumRebateAmount: dic.strCapAmount, decRebatePercent: dic.strRatePercent,
    blnMarginalReliefEnabled: dic.blnMarginalReliefEnabled, blnExcludesSpecialRateIncome: dic.blnExcludesSpecialRateIncome,
    dtEffectiveFrom: dic.dtEffectiveFrom, dtEffectiveTo: dic.dtEffectiveTo, blnIsActive: dic.blnIsActive, strLegalReference: "",
  };
}

function toSurchargeRow(dic: UnifiedRuleRow): TaxSurchargeSlabFormValue {
  return {
    strRowID: dic.strRowID, strTaxYearCode: dic.strTaxYearCode, strSurchargeProfileCode: dic.strCode,
    decIncomeFromAmount: dic.strFromAmount, decIncomeToAmount: dic.strToAmount, decSurchargeRatePercent: dic.strRatePercent,
    blnMarginalReliefEnabled: dic.blnMarginalReliefEnabled, decMaximumRateCapPercent: dic.strMaxCapPercent,
    intDisplayOrder: dic.strDisplayOrder, dtEffectiveFrom: dic.dtEffectiveFrom, dtEffectiveTo: dic.dtEffectiveTo,
    blnIsActive: dic.blnIsActive, strLegalReference: "",
  };
}

function toCessRow(dic: UnifiedRuleRow): TaxCessRuleFormValue {
  return {
    strRowID: dic.strRowID, strTaxYearCode: dic.strTaxYearCode, strCessCode: dic.strCode, strCessName: dic.strName,
    decCessRatePercent: dic.strRatePercent, strCalculationBaseCode: dic.strModeCode, intDisplayOrder: dic.strDisplayOrder,
    dtEffectiveFrom: dic.dtEffectiveFrom, dtEffectiveTo: dic.dtEffectiveTo, blnIsActive: dic.blnIsActive, strLegalReference: "",
  };
}

const dicFieldEnabledByType: Record<RuleType, Partial<Record<keyof UnifiedRuleRow, boolean>>> = {
  "standard-deduction": { strCode: true, strTaxpayerTypeCode: true, strResidentialStatusCode: true, strModeCode: true, strAmount: true, strRatePercent: true, strCapAmount: true },
  rebate: { strCode: true, strTaxpayerTypeCode: true, strResidentialStatusCode: true, strModeCode: true, strFromAmount: true, strToAmount: true, strRatePercent: true, strCapAmount: true, blnMarginalReliefEnabled: true, blnExcludesSpecialRateIncome: true },
  surcharge: { strCode: true, strFromAmount: true, strToAmount: true, strRatePercent: true, strMaxCapPercent: true, blnMarginalReliefEnabled: true, strDisplayOrder: true },
  cess: { strCode: true, strName: true, strModeCode: true, strRatePercent: true, strDisplayOrder: true },
};

function isFieldEnabled(strRuleType: RuleType, strField: keyof UnifiedRuleRow) {
  return dicFieldEnabledByType[strRuleType][strField] === true;
}

const dicCodePlaceholderByType: Record<RuleType, string> = {
  "standard-deduction": "Income Source",
  rebate: "Rebate Code",
  surcharge: "Surcharge Profile",
  cess: "Cess Code",
};

export default function TaxRuleMaintenancePage({ intTaxRegimeID, blnEmbedded, onSaveBridgeChange }: TaxRuleMaintenancePageProps) {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [objRegime, setObjRegime] = useState<TaxRegimeDetailRecord | null>(null);
  const [lstFinancialYears, setLstFinancialYears] = useState<string[]>([]);
  const [lstRows, setLstRows] = useState<UnifiedRuleRow[]>([]);
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

        const [dicStandardDeduction, dicRebate, dicSurcharge, dicCess] = await Promise.all([
          taxRegimeService.getTaxStandardDeductionRules(intTaxRegimeID),
          taxRegimeService.getTaxRebateRules(intTaxRegimeID),
          taxRegimeService.getTaxSurchargeSlabs(intTaxRegimeID),
          taxRegimeService.getTaxCessRules(intTaxRegimeID),
        ]);
        if (!blnMounted) {
          return;
        }

        const lstMergedRows: UnifiedRuleRow[] = [
          ...(dicStandardDeduction.lstRecords.length > 0 ? dicStandardDeduction.lstRecords.map(fromStandardDeductionRow) : [createUnifiedRow("standard-deduction", dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]),
          ...(dicRebate.lstRecords.length > 0 ? dicRebate.lstRecords.map(fromRebateRow) : [createUnifiedRow("rebate", dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]),
          ...(dicSurcharge.lstRecords.length > 0 ? dicSurcharge.lstRecords.map(fromSurchargeRow) : [createUnifiedRow("surcharge", dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]),
          ...(dicCess.lstRecords.length > 0 ? dicCess.lstRecords.map(fromCessRow) : [createUnifiedRow("cess", dicRegime.strTaxYearCode, strDefaultEffectiveFrom)]),
        ];
        setLstRows(lstMergedRows);
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
  }, [blnCanView, blnRightsLoading, intTaxRegimeID]);

  function handleAddRow() {
    const strTaxYearCode = objRegime?.strTaxYearCode || lstFinancialYears[0] || "";
    const strDefaultEffectiveFrom = objRegime?.dtEffectiveFrom || undefined;
    setLstRows((lstPrevious) => [...lstPrevious, createUnifiedRow("standard-deduction", strTaxYearCode, strDefaultEffectiveFrom)]);
  }

  function handleDeleteRow(strRowID: string) {
    setLstRows((lstPrevious) => lstPrevious.filter((dicRow) => dicRow.strRowID !== strRowID));
  }

  function updateRow(strRowID: string, strField: keyof UnifiedRuleRow, objValue: string | boolean) {
    setLstRows((lstPrevious) => lstPrevious.map((dicRow) => dicRow.strRowID === strRowID ? { ...dicRow, [strField]: objValue } : dicRow));
  }

  async function handleSave() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const lstStandardDeductionRows = lstRows.filter((dicRow) => dicRow.strRuleType === "standard-deduction").map(toStandardDeductionRow);
      const lstRebateRows = lstRows.filter((dicRow) => dicRow.strRuleType === "rebate").map(toRebateRow);
      const lstSurchargeRows = lstRows.filter((dicRow) => dicRow.strRuleType === "surcharge").map(toSurchargeRow);
      const lstCessRows = lstRows.filter((dicRow) => dicRow.strRuleType === "cess").map(toCessRow);

      const [dicStandardDeduction, dicRebate, dicSurcharge, dicCess] = await Promise.all([
        taxRegimeService.saveTaxStandardDeductionRules(intTaxRegimeID, lstStandardDeductionRows),
        taxRegimeService.saveTaxRebateRules(intTaxRegimeID, lstRebateRows),
        taxRegimeService.saveTaxSurchargeSlabs(intTaxRegimeID, lstSurchargeRows),
        taxRegimeService.saveTaxCessRules(intTaxRegimeID, lstCessRows),
      ]);

      setLstRows([
        ...dicStandardDeduction.lstRecords.map(fromStandardDeductionRow),
        ...dicRebate.lstRecords.map(fromRebateRow),
        ...dicSurcharge.lstRecords.map(fromSurchargeRow),
        ...dicCess.lstRecords.map(fromCessRow),
      ]);
      setStrSuccess(t("save_tax_rules_success", "Tax rules saved successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("save_tax_rules_failed", "Unable to save tax rules."));
    } finally {
      setBlnSaving(false);
    }
  }

  const objHandleSaveRef = useRef(handleSave);
  objHandleSaveRef.current = handleSave;

  useEffect(() => {
    if (!onSaveBridgeChange) {
      return;
    }
    onSaveBridgeChange({
      strLabel: blnSaving ? t("saving", "Saving...") : t("save", "Save"),
      blnVisible: blnCanEdit && !blnLoading && blnCanView,
      blnDisabled: blnSaving,
      fnSave: () => objHandleSaveRef.current(),
    });
    return () => onSaveBridgeChange(null);
  }, [onSaveBridgeChange, blnCanEdit, blnSaving, blnLoading, blnCanView]);

  const objColumn = (field: string, headerName: string, width: number, align?: "left" | "right" | "center"): CommonTableColumn<Record<string, ReactNode>> => ({
    field,
    headerName,
    width,
    align,
    sortable: false,
    exportable: field !== "action",
  });

  const nodeYearSelect = (strRowID: string, strValue: string, fnUpdate: (strValue: string) => void) => (
    <TextField select size="small" fullWidth value={strValue} onChange={(objEvent) => fnUpdate(objEvent.target.value)} disabled={blnReadOnly}>
      {lstFinancialYears.map((strYear) => <MenuItem key={`${strRowID}-${strYear}`} value={strYear}>{strYear}</MenuItem>)}
    </TextField>
  );
  const nodeRuleTypeSelect = (strRowID: string, strValue: RuleType, fnUpdate: (strValue: RuleType) => void) => (
    <TextField select size="small" fullWidth value={strValue} onChange={(objEvent) => fnUpdate(objEvent.target.value as RuleType)} disabled={blnReadOnly}>
      {lstRuleTypes.map((strType) => (
        <MenuItem key={`${strRowID}-${strType}`} value={strType}>
          {t(`rule_type_${strType.replaceAll("-", "_")}`, strType === "standard-deduction" ? "Standard Deduction" : strType.charAt(0).toUpperCase() + strType.slice(1))}
        </MenuItem>
      ))}
    </TextField>
  );
  const nodeTextField = (strValue: string, fnUpdate: (strValue: string) => void, blnFieldEnabled: boolean, strType?: string, blnAlignRight?: boolean, strPlaceholder?: string) => (
    <TextField size="small" fullWidth type={strType} value={strValue} placeholder={strPlaceholder} onChange={(objEvent) => fnUpdate(objEvent.target.value)} disabled={blnReadOnly || !blnFieldEnabled} inputProps={blnAlignRight ? { style: { textAlign: "right" } } : undefined} />
  );
  const nodeSwitch = (blnValue: boolean, fnUpdate: (blnValue: boolean) => void, blnFieldEnabled: boolean) => (
    <Switch checked={blnValue} onChange={(objEvent) => fnUpdate(objEvent.target.checked)} disabled={blnReadOnly || !blnFieldEnabled} />
  );
  const nodeRemoveButton = (strRowID: string) => (
    <Tooltip title={t("remove_button", "Remove")}>
      <span><IconButton color="error" size="small" aria-label={t("remove_button", "Remove")} onClick={() => handleDeleteRow(strRowID)} disabled={blnReadOnly}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></span>
    </Tooltip>
  );

  const lstTableColumns: CommonTableColumn<Record<string, ReactNode>>[] = [
    objColumn("action", t("action", "Action"), 60, "center"),
    objColumn("ruleType", t("rule_type", "Rule Type"), 160),
    objColumn("taxYear", t("tax_year", "Tax Year"), 110),
    objColumn("code", t("code", "Code / Profile"), 150),
    objColumn("name", t("name", "Name"), 140),
    objColumn("taxpayerType", t("taxpayer_type", "Taxpayer Type"), 120),
    objColumn("residentialStatus", t("residential_status", "Residential Status"), 140),
    objColumn("mode", t("mode_basis", "Mode / Basis"), 150),
    objColumn("fromAmount", t("from_amount", "From Amount"), 120, "right"),
    objColumn("toAmount", t("to_amount", "To Amount"), 120, "right"),
    objColumn("amount", t("amount", "Amount"), 110, "right"),
    objColumn("ratePercent", t("rate_percent", "Rate %"), 90, "right"),
    objColumn("capAmount", t("cap_amount", "Cap Amount"), 120, "right"),
    objColumn("maxCapPercent", t("max_cap_percent", "Max Cap %"), 110, "right"),
    objColumn("marginalRelief", t("marginal_relief", "Marginal Relief"), 130, "center"),
    objColumn("excludeSpecialRate", t("exclude_special_rate", "Exclude Special Rate"), 150, "center"),
    objColumn("displayOrder", t("display_order", "Display Order"), 110, "right"),
    objColumn("effectiveFrom", t("effective_from", "Effective From"), 140),
    objColumn("effectiveTo", t("effective_to", "Effective To"), 140),
    objColumn("active", t("active", "Active"), 75, "center"),
  ];
  const intMinimumTableWidth = 2450;

  const lstTableRows: Record<string, ReactNode>[] = lstRows.map((dicRow) => {
    const strRuleType = dicRow.strRuleType;
    return {
      id: dicRow.strRowID,
      action: nodeRemoveButton(dicRow.strRowID),
      ruleType: nodeRuleTypeSelect(dicRow.strRowID, strRuleType, (strValue) => updateRow(dicRow.strRowID, "strRuleType", strValue)),
      taxYear: nodeYearSelect(dicRow.strRowID, dicRow.strTaxYearCode, (strValue) => updateRow(dicRow.strRowID, "strTaxYearCode", strValue)),
      code: nodeTextField(dicRow.strCode, (strValue) => updateRow(dicRow.strRowID, "strCode", strValue.toUpperCase()), isFieldEnabled(strRuleType, "strCode"), undefined, false, dicCodePlaceholderByType[strRuleType]),
      name: nodeTextField(dicRow.strName, (strValue) => updateRow(dicRow.strRowID, "strName", strValue), isFieldEnabled(strRuleType, "strName"), undefined, false, t("cess_name", "Cess Name")),
      taxpayerType: nodeTextField(dicRow.strTaxpayerTypeCode, (strValue) => updateRow(dicRow.strRowID, "strTaxpayerTypeCode", strValue.toUpperCase()), isFieldEnabled(strRuleType, "strTaxpayerTypeCode")),
      residentialStatus: nodeTextField(dicRow.strResidentialStatusCode, (strValue) => updateRow(dicRow.strRowID, "strResidentialStatusCode", strValue.toUpperCase()), isFieldEnabled(strRuleType, "strResidentialStatusCode")),
      mode: nodeTextField(dicRow.strModeCode, (strValue) => updateRow(dicRow.strRowID, "strModeCode", strValue.toUpperCase()), isFieldEnabled(strRuleType, "strModeCode")),
      fromAmount: nodeTextField(dicRow.strFromAmount, (strValue) => updateRow(dicRow.strRowID, "strFromAmount", strValue), isFieldEnabled(strRuleType, "strFromAmount"), undefined, true),
      toAmount: nodeTextField(dicRow.strToAmount, (strValue) => updateRow(dicRow.strRowID, "strToAmount", strValue), isFieldEnabled(strRuleType, "strToAmount"), undefined, true),
      amount: nodeTextField(dicRow.strAmount, (strValue) => updateRow(dicRow.strRowID, "strAmount", strValue), isFieldEnabled(strRuleType, "strAmount"), undefined, true),
      ratePercent: nodeTextField(dicRow.strRatePercent, (strValue) => updateRow(dicRow.strRowID, "strRatePercent", strValue), isFieldEnabled(strRuleType, "strRatePercent"), undefined, true),
      capAmount: nodeTextField(dicRow.strCapAmount, (strValue) => updateRow(dicRow.strRowID, "strCapAmount", strValue), isFieldEnabled(strRuleType, "strCapAmount"), undefined, true),
      maxCapPercent: nodeTextField(dicRow.strMaxCapPercent, (strValue) => updateRow(dicRow.strRowID, "strMaxCapPercent", strValue), isFieldEnabled(strRuleType, "strMaxCapPercent"), undefined, true),
      marginalRelief: nodeSwitch(dicRow.blnMarginalReliefEnabled, (blnValue) => updateRow(dicRow.strRowID, "blnMarginalReliefEnabled", blnValue), isFieldEnabled(strRuleType, "blnMarginalReliefEnabled")),
      excludeSpecialRate: nodeSwitch(dicRow.blnExcludesSpecialRateIncome, (blnValue) => updateRow(dicRow.strRowID, "blnExcludesSpecialRateIncome", blnValue), isFieldEnabled(strRuleType, "blnExcludesSpecialRateIncome")),
      displayOrder: nodeTextField(dicRow.strDisplayOrder, (strValue) => updateRow(dicRow.strRowID, "strDisplayOrder", strValue), isFieldEnabled(strRuleType, "strDisplayOrder"), undefined, true),
      effectiveFrom: nodeTextField(dicRow.dtEffectiveFrom, (strValue) => updateRow(dicRow.strRowID, "dtEffectiveFrom", strValue), true, "date"),
      effectiveTo: nodeTextField(dicRow.dtEffectiveTo, (strValue) => updateRow(dicRow.strRowID, "dtEffectiveTo", strValue), true, "date"),
      active: nodeSwitch(dicRow.blnIsActive, (blnValue) => updateRow(dicRow.strRowID, "blnIsActive", blnValue), true),
    };
  });

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
      {!blnEmbedded ? (
        <TaxRegimeWorkspaceHeader
          strTitle={t("manage_tax_rules", "Manage Tax Rules")}
          strSubtitle={`${objRegime.strRegimeCode} | ${objRegime.strRegimeName} | ${objRegime.strTaxYearCode}`}
          nodeActions={(
            <TaxRegimeActionGroup>
                <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes")}>
                  {t("back_to_list", "Back")}
                </Button>
                {blnCanEdit ? (
                  <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>{blnSaving ? t("saving", "Saving...") : t("save", "Save")}</Button>
                ) : null}
            </TaxRegimeActionGroup>
          )}
        />
      ) : null}

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Rules.")}</Alert> : null}

      <CommonTable<Record<string, ReactNode>>
        columns={lstTableColumns}
        rows={lstTableRows}
        rowIdField="id"
        minTableWidth={intMinimumTableWidth}
        defaultPageSize={20}
        pageSizeOptions={[10, 20, 50]}
        emptyMessage={t("no_tax_rule_rows", "No tax rule rows found.")}
        testIdPrefix="tax-regimes.rules"
        hideRowClickHint
        wrapColumnHeaders={false}
        toolbarLeft={blnCanEdit ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddRow}>{t("add_row", "Add Row")}</Button> : undefined}
        sx={objTaxRegimeCommonTableSx}
      />
    </Stack>
  );
}
