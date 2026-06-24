"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LunchDiningRoundedIcon from "@mui/icons-material/LunchDiningRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Switch,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type {
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFormOptions,
  EmployeeSalaryFlexiAllocationLine,
} from "@/features/employee-salary/types";
import { salaryComponentService } from "@/features/salary-components/services/salaryComponentService";
import type { SalaryComponentListRecord } from "@/features/salary-components/types";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationLineRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { salaryStructureService } from "@/features/salary-structures/services/salaryStructureService";
import type { SalaryStructureDetailRecord, SalaryStructureFormOptions } from "@/features/salary-structures/types";
import { authApiService } from "@/services";

type DraftInputMap = Record<number, string>;

type FlexiComponentOption = {
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName?: string | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decAllocationAnnual?: number | null;
  decAllocationMonthly?: number | null;
  blnProofRequired?: boolean | null;
  strTaxTreatment?: string | null;
  strSource: string;
};

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${String(intFyStartYear + 1).slice(-2)}`;
}

function formatCurrency(decValue: number | null | undefined, strCurrencyCode = "INR") {
  if (decValue == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0,
  }).format(decValue);
}

function formatDate(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function normalizeAmount(strValue: string) {
  const decValue = Number(strValue);
  if (!Number.isFinite(decValue) || decValue < 0) return 0;
  return decValue;
}

function getStatusTone(strStatus?: string | null): "default" | "success" | "warning" | "error" {
  const strValue = String(strStatus || "").trim().toLowerCase();
  if (["approved", "locked"].includes(strValue)) return "success";
  if (["submitted"].includes(strValue)) return "warning";
  if (["rejected", "returned", "cancelled"].includes(strValue)) return "error";
  return "default";
}

function formatPercent(decValue: number, decTotal: number | null | undefined) {
  const decBase = Number(decTotal || 0);
  if (!decBase) return "";
  return `${((decValue / decBase) * 100).toFixed(2)}%`;
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function getSnapshotNumber(objSnapshot: Record<string, unknown> | null | undefined, lstKeys: string[]) {
  for (const strKey of lstKeys) {
    const decValue = Number(objSnapshot?.[strKey]);
    if (Number.isFinite(decValue)) return decValue;
  }
  return null;
}

function normalizeText(strValue?: string | null) {
  return String(strValue || "").trim().toLowerCase();
}

function normalizeSelectToken(strValue?: string | null) {
  return String(strValue || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function toChildrenCount(strValue: string | number | boolean | null | undefined) {
  const intValue = Number(strValue);
  if (!Number.isFinite(intValue) || intValue < 0) return 0;
  return Math.min(20, Math.floor(intValue));
}

function getBooleanAnswer(dicAnswers: Record<string, string | number | boolean | null>, strCode: string, blnDefault: boolean) {
  const objValue = dicAnswers[strCode];
  if (objValue == null || objValue === "") return blnDefault;
  if (typeof objValue === "boolean") return objValue;
  return ["1", "true", "yes", "y"].includes(normalizeText(String(objValue)));
}

function getFlexiRoleForOption(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  const strFlexiType = normalizeSelectToken(dicComponent?.strFlexiComponentType);
  const strCategory = normalizeSelectToken(dicComponent?.strComponentCategory);
  const strGroup = normalizeSelectToken(dicComponent?.strComponentGroup);
  if (dicComponent?.blnIsFlexiBasket || strFlexiType === "basket" || strFlexiType === "flexibucket" || strCategory === "flexibucket" || strCategory === "flexibasket") {
    return "Flexi Bucket";
  }
  if (dicComponent?.blnIsEmployerContribution || strCategory === "employercontribution" || strGroup === "employercontribution" || strGroup === "contribution") {
    return "Employer Contribution";
  }
  if (dicComponent?.blnIsEmployeeDeduction || strCategory === "deduction" || strGroup === "deduction") {
    return "Deduction";
  }
  if (strCategory === "information" || strGroup === "information") {
    return "Information";
  }
  return "Normal";
}

function isSalaryStructureFlexiEligibleComponent(dicOption: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  const strReimbursementType = normalizeSelectToken(dicOption.strReimbursementType);
  const strSettlementMode = normalizeSelectToken(dicOption.strReimbursementSettlementMode);
  return Boolean(
    dicOption.blnIsActive !== false &&
    dicOption.blnIsReimbursement &&
    dicOption.blnIsFlexiBenefit &&
    strReimbursementType === "ctcbased" &&
    strSettlementMode === "payroll" &&
    getFlexiRoleForOption(dicOption) === "Normal" &&
    normalizeSelectToken(dicOption.strCode) !== "flexipay"
  );
}

function getComponentAnnualAmount(objLine: Record<string, unknown>) {
  return getSnapshotNumber(objLine, ["decAmountAnnual", "decAnnualAmount", "decDefaultAmountAnnual", "decAllocationAnnual"]) || 0;
}

function getComponentName(objLine: Record<string, unknown>) {
  return String(objLine.strComponentName || objLine.strComponentCode || "");
}

function getComponentID(objLine: Record<string, unknown>) {
  return Number(objLine.intSalaryComponentID || objLine.intFlexiComponentID || objLine.intID || 0);
}

function buildLineFromOption(objOption: FlexiComponentOption): FlexiDeclarationLineRecord {
  return {
    intSalaryComponentID: objOption.intSalaryComponentID,
    strComponentCode: objOption.strComponentCode,
    strComponentName: objOption.strComponentName,
    decAnnualLimit: objOption.decAnnualLimit ?? null,
    decMonthlyLimit: objOption.decMonthlyLimit ?? null,
    decAllocationAnnual: objOption.decAllocationAnnual ?? 0,
    decAllocationMonthly: objOption.decAllocationMonthly ?? 0,
    blnProofRequired: objOption.blnProofRequired ?? false,
    strTaxTreatment: objOption.strTaxTreatment ?? null,
    decBalanceAnnual: null,
    decDraftDeclaredAnnual: objOption.decAllocationAnnual ?? 0,
    decDraftApprovedAnnual: null,
    strDeclarationItemStatus: null,
    strDeclarationItemRemarks: null,
    blnEligible: true,
    strEligibilityReason: `${objOption.strSource}.`,
  };
}

function isFlexiBucketCode(strComponentCode?: string | null) {
  return normalizeSelectToken(strComponentCode) === "flexipay";
}

function isFlexiBucketLike(strComponentCode?: string | null, strComponentName?: string | null) {
  return isFlexiBucketCode(strComponentCode) || normalizeSelectToken(strComponentName) === "flexipay";
}

function mapSalaryFlexiLineToDeclarationLine(
  objLine: EmployeeSalaryFlexiAllocationLine,
  dicDeclaredByComponentID: Map<number, number>,
): FlexiDeclarationLineRecord {
  const decDeclaredAnnual = dicDeclaredByComponentID.get(objLine.intSalaryComponentID);
  return {
    intSalaryComponentID: objLine.intSalaryComponentID,
    strComponentCode: objLine.strComponentCode,
    strComponentName: objLine.strComponentName,
    decAnnualLimit: objLine.decAnnualLimit,
    decMonthlyLimit: objLine.decMonthlyLimit,
    decAllocationAnnual: objLine.decAllocationAnnual,
    decAllocationMonthly: objLine.decAllocationMonthly,
    blnProofRequired: objLine.blnProofRequired,
    strTaxTreatment: objLine.strTaxTreatment,
    decBalanceAnnual: objLine.decBalanceAnnual,
    decDraftDeclaredAnnual: decDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0,
    decDraftApprovedAnnual: null,
    strDeclarationItemStatus: decDeclaredAnnual != null && decDeclaredAnnual > 0 ? "draft" : null,
    strDeclarationItemRemarks: null,
    blnEligible: true,
    strEligibilityReason: "Eligible for declaration.",
  };
}

function mergeEmployeeSalaryDetailIntoContext(
  objContext: FlexiDeclarationContextRecord,
  objDetail: EmployeeSalaryDetailRecord,
): FlexiDeclarationContextRecord {
  const lstDeclaredItems = objDetail.objFlexiDeclaration?.lstItems || [];
  const dicDeclaredByComponentID = new Map(
    lstDeclaredItems.map((objItem) => [objItem.intSalaryComponentID, Number(objItem.decDeclaredAnnual || 0)]),
  );
  const lstSalaryFlexiLines = (
    objDetail.objFlexiAllocation?.lstAvailableComponents?.length
      ? objDetail.objFlexiAllocation.lstAvailableComponents
      : objDetail.objFlexiAllocation?.lstAllocationLines || []
  ).filter((objLine) => Boolean(objLine?.intSalaryComponentID));
  const lstDeclarationLines = objContext.lstDeclarationLines?.length
    ? objContext.lstDeclarationLines
    : lstSalaryFlexiLines.map((objLine) => mapSalaryFlexiLineToDeclarationLine(objLine, dicDeclaredByComponentID));
  const objSalaryDeclaration = objDetail.objFlexiDeclaration;

  return {
    ...objContext,
    blnCanDeclare: objContext.blnCanDeclare || Boolean(objDetail.objFlexiAllocation?.blnHasFlexiBasket),
    strIneligibilityReason: objContext.blnCanDeclare || objDetail.objFlexiAllocation?.blnHasFlexiBasket
      ? null
      : objContext.strIneligibilityReason,
    objEmployeeSummary: objContext.objEmployeeSummary || {
      intEmployeeID: objDetail.objEmployeeSummary.intEmployeeID,
      strEmployeeCode: objDetail.objEmployeeSummary.strEmployeeCode,
      strEmployeeName: objDetail.objEmployeeSummary.strEmployeeName,
    },
    objAssignedStructure: objDetail.objAssignedStructure ? {
      intSalaryStructureID: objDetail.objAssignedStructure.intSalaryStructureID,
      strSalaryStructureName: objDetail.objAssignedStructure.strStructureName,
      strCurrencyCode: objDetail.objAssignedStructure.strCurrencyCode,
    } : objContext.objAssignedStructure,
    objCurrentSalarySnapshot: (objDetail.objCurrentSalarySnapshot as Record<string, unknown> | null) ?? objContext.objCurrentSalarySnapshot,
    objFlexiAllocation: {
      ...objContext.objFlexiAllocation,
      blnHasFlexiBasket: objDetail.objFlexiAllocation?.blnHasFlexiBasket ?? objContext.objFlexiAllocation?.blnHasFlexiBasket ?? false,
      decFlexiBasketAvailableAnnual: objDetail.objFlexiAllocation?.decFlexiBasketAvailableAnnual ?? objContext.objFlexiAllocation?.decFlexiBasketAvailableAnnual ?? 0,
      decResidualTaxableAllowanceAnnual: objDetail.objFlexiAllocation?.decResidualTaxableAllowanceAnnual ?? objContext.objFlexiAllocation?.decResidualTaxableAllowanceAnnual ?? 0,
      strResidualComponentName: objDetail.objFlexiAllocation?.strResidualComponentName ?? objContext.objFlexiAllocation?.strResidualComponentName ?? null,
      lstAvailableComponents: objDetail.objFlexiAllocation?.lstAvailableComponents?.length
        ? objDetail.objFlexiAllocation.lstAvailableComponents.map((objLine) => ({
          intSalaryComponentID: objLine.intSalaryComponentID,
          strComponentCode: objLine.strComponentCode,
          strComponentName: objLine.strComponentName,
        }))
        : objContext.objFlexiAllocation?.lstAvailableComponents?.length
        ? objContext.objFlexiAllocation.lstAvailableComponents
        : lstSalaryFlexiLines.map((objLine) => ({
          intSalaryComponentID: objLine.intSalaryComponentID,
          strComponentCode: objLine.strComponentCode,
          strComponentName: objLine.strComponentName,
        })),
    },
    objDeclaration: objContext.objDeclaration || (objSalaryDeclaration ? {
      intDeclarationID: objSalaryDeclaration.intDeclarationID || 0,
      strFinancialYearCode: objSalaryDeclaration.strFinancialYearCode || objContext.strFinancialYearCode,
      strDeclarationKind: "FLEXI_PAY",
      strWorkflowStatus: objSalaryDeclaration.strStatus || "draft",
      dtSubmittedOn: objSalaryDeclaration.dtSubmittedOn,
      dtApprovedOn: objSalaryDeclaration.dtApprovedOn,
      strRemarks: objSalaryDeclaration.strEmployeeRemarks,
    } : objContext.objDeclaration),
    lstComponentLines: objDetail.lstComponentLines?.length
      ? objDetail.lstComponentLines as unknown as Array<Record<string, unknown>>
      : objContext.lstComponentLines,
    objEligibilityAnswers: objContext.objEligibilityAnswers || {},
    lstDeclarationLines,
  };
}

function buildFallbackContext(strFinancialYearCode: string): FlexiDeclarationContextRecord {
  return {
    strFinancialYearCode,
    blnCanDeclare: false,
    strIneligibilityReason: "Flexi declaration details are taking longer than expected. Please try again after the backend responds.",
    objDeclaration: null,
    objEmployeeSummary: null,
    objAssignedStructure: null,
    objCurrentSalarySnapshot: null,
    objFlexiAllocation: {
      blnHasFlexiBasket: false,
      decFlexiBasketAvailableAnnual: 0,
      decResidualTaxableAllowanceAnnual: 0,
      strResidualComponentName: null,
      lstAvailableComponents: [],
    },
    lstComponentLines: [],
    lstEligibilityQuestions: [],
    objEligibilityAnswers: {},
    lstDeclarationLines: [],
  };
}

async function withTimeout<TData>(objPromise: Promise<TData>, intTimeoutMs: number): Promise<TData> {
  let intTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      objPromise,
      new Promise<TData>((_, reject) => {
        intTimer = setTimeout(() => reject(new Error("Flexi declaration request timed out.")), intTimeoutMs);
      }),
    ]);
  } finally {
    if (intTimer) clearTimeout(intTimer);
  }
}

function buildInitialDraftInputs(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<DraftInputMap>((dicAcc, objLine) => {
    dicAcc[objLine.intSalaryComponentID] = String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0);
    return dicAcc;
  }, {});
}

function getLineDeclaredAmount(objLine: FlexiDeclarationLineRecord, dicDraftInputs: DraftInputMap) {
  return normalizeAmount(dicDraftInputs[objLine.intSalaryComponentID] ?? String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0));
}

async function enrichContextWithLoggedInEmployeeSalary(objContext: FlexiDeclarationContextRecord) {
  const objCurrentUserResult = await withTimeout(authApiService.getCurrentUser(), 8000).catch(() => null);
  const intEmployeeID = objCurrentUserResult?.Data?.objUser?.intEmployeeID ?? objCurrentUserResult?.Data?.objEmployee?.intEmployeeID ?? null;
  if (!intEmployeeID) return objContext;

  const objSalaryDetail = await withTimeout(employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID), 10000).catch(() => null);
  if (!objSalaryDetail) return objContext;
  return mergeEmployeeSalaryDetailIntoContext(objContext, objSalaryDetail);
}

export default function FlexiPayDeclarationPage() {
  const objRouter = useRouter();
  const strFinancialYearCode = getCurrentFinancialYearCode();
  const intLoadSequenceRef = useRef(0);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(() => buildFallbackContext(strFinancialYearCode));
  const [dicDraftInputs, setDicDraftInputs] = useState<DraftInputMap>(() => buildInitialDraftInputs(buildFallbackContext(strFinancialYearCode)));
  const [dicEligibilityAnswers, setDicEligibilityAnswers] = useState<Record<string, string | number | boolean | null>>({});
  const [objSalaryStructureFormOptions, setObjSalaryStructureFormOptions] = useState<SalaryStructureFormOptions | null>(null);
  const [objAssignedSalaryStructureDetail, setObjAssignedSalaryStructureDetail] = useState<SalaryStructureDetailRecord | null>(null);
  const [blnAssignedStructureDetailResolved, setBlnAssignedStructureDetailResolved] = useState(false);
  const [objEmployeeSalaryFormOptions, setObjEmployeeSalaryFormOptions] = useState<EmployeeSalaryFormOptions | null>(null);
  const [lstSalaryComponents, setLstSalaryComponents] = useState<SalaryComponentListRecord[]>([]);

  const loadContext = useCallback(async function loadContext() {
    const intLoadSequence = ++intLoadSequenceRef.current;
    setBlnLoading(true);
    setStrError("");
    const objFallbackContext = buildFallbackContext(strFinancialYearCode);
    setObjContext(objFallbackContext);
    setDicDraftInputs(buildInitialDraftInputs(objFallbackContext));
    setStrRemarks("");
    setDicEligibilityAnswers({});
    setObjAssignedSalaryStructureDetail(null);
    setBlnAssignedStructureDetailResolved(false);
    try {
      const objSalaryStructureOptionsPromise = withTimeout(salaryStructureService.getFormOptions(), 10000).catch(() => null);
      const objEmployeeSalaryOptionsPromise = withTimeout(employeeSalaryService.getFormOptions(), 10000).catch(() => null);
      const lstSalaryComponentsPromise = withTimeout(salaryComponentService.getSalaryComponents(), 10000).catch(() => []);
      const objData = await withTimeout(
        flexiPayDeclarationService.getCurrentDeclaration(strFinancialYearCode),
        10000,
      ).catch(() => buildFallbackContext(strFinancialYearCode));
      const [objEnrichedData, objFormOptions, objEmployeeFormOptions, lstSalaryComponentRows] = await Promise.all([
        enrichContextWithLoggedInEmployeeSalary(objData),
        objSalaryStructureOptionsPromise,
        objEmployeeSalaryOptionsPromise,
        lstSalaryComponentsPromise,
      ]);
      const intAssignedStructureID = Number(objEnrichedData.objAssignedStructure?.intSalaryStructureID || 0);
      const objAssignedStructureDetail = intAssignedStructureID
        ? await withTimeout(salaryStructureService.getSalaryStructureById(intAssignedStructureID), 10000).catch(() => null)
        : null;
      if (intLoadSequenceRef.current !== intLoadSequence) {
        return;
      }
      setObjContext(objEnrichedData);
      setObjSalaryStructureFormOptions(objFormOptions);
      setObjAssignedSalaryStructureDetail(objAssignedStructureDetail);
      setBlnAssignedStructureDetailResolved(true);
      setObjEmployeeSalaryFormOptions(objEmployeeFormOptions);
      setLstSalaryComponents(lstSalaryComponentRows);
      setDicDraftInputs(buildInitialDraftInputs(objEnrichedData));
      setStrRemarks(objEnrichedData.objDeclaration?.strRemarks || "");
      setDicEligibilityAnswers(objEnrichedData.objEligibilityAnswers || {});
      setBlnLoading(false);
    } catch (objError) {
      if (intLoadSequenceRef.current !== intLoadSequence) {
        return;
      }
      setStrError(objError instanceof Error ? objError.message : "Unable to load flexi declaration.");
      setBlnLoading(false);
    }
  }, [strFinancialYearCode]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";
  const blnCompulsoryDataPending = blnLoading || (
    Number(objContext?.objAssignedStructure?.intSalaryStructureID || 0) > 0
    && !blnAssignedStructureDetailResolved
  );
  const decBasketAnnual = Number(objContext?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || "draft";
  const blnWorkflowEditable = ["draft", "returned", "rejected"].includes(strWorkflowStatus);
  const blnCanCancel = ["draft", "returned", "rejected"].includes(strWorkflowStatus);
  const lstFlexiComponentOptions = useMemo(() => {
    const dicOptions = new Map<number, FlexiComponentOption>();
    const lstMasterEligibleOptions = (objSalaryStructureFormOptions?.lstSalaryComponents || [])
      .filter(isSalaryStructureFlexiEligibleComponent);
    const lstFallbackEligibleSalaryComponents = lstSalaryComponents
      .filter((objComponent) =>
        objComponent.blnIsActive !== false &&
        objComponent.blnIsReimbursement &&
        objComponent.blnIsFlexiBenefit &&
        normalizeSelectToken(objComponent.strReimbursementType) === "ctcbased" &&
        normalizeSelectToken(objComponent.strSettlementMethod) === "payroll" &&
        !Boolean(objComponent.blnIsFlexiBasket) &&
        !isFlexiBucketLike(objComponent.strComponentCode, objComponent.strComponentName),
      );
    const setMasterEligibleComponentIDs = new Set(lstMasterEligibleOptions.map((objOption) => Number(objOption.intID)));
    const addOption = (objOption: FlexiComponentOption) => {
      if (!objOption.intSalaryComponentID) return;
      if (isFlexiBucketLike(objOption.strComponentCode, objOption.strComponentName)) return;
      const objExisting = dicOptions.get(objOption.intSalaryComponentID);
      dicOptions.set(objOption.intSalaryComponentID, {
        ...objExisting,
        ...objOption,
        decAnnualLimit: objOption.decAnnualLimit ?? objExisting?.decAnnualLimit ?? null,
        decMonthlyLimit: objOption.decMonthlyLimit ?? objExisting?.decMonthlyLimit ?? null,
        decAllocationAnnual: objOption.decAllocationAnnual ?? objExisting?.decAllocationAnnual ?? 0,
        decAllocationMonthly: objOption.decAllocationMonthly ?? objExisting?.decAllocationMonthly ?? 0,
        blnProofRequired: objOption.blnProofRequired ?? objExisting?.blnProofRequired ?? false,
        strTaxTreatment: objOption.strTaxTreatment ?? objExisting?.strTaxTreatment ?? null,
      });
    };

    lstMasterEligibleOptions.forEach((objOption) => addOption({
      intSalaryComponentID: Number(objOption.intID),
      strComponentCode: objOption.strCode,
      strComponentName: objOption.strLabel,
      decAnnualLimit: objOption.decReimbursementMaxClaimYearlyLimit ?? objOption.decAnnualLimit ?? objOption.decFlexiMaxYearlyAmount ?? objOption.decAnnualLimitAmount ?? null,
      decMonthlyLimit: objOption.decReimbursementMaxClaimMonthlyLimit ?? objOption.decMonthlyLimit ?? objOption.decFlexiMaxMonthlyAmount ?? objOption.decMonthlyLimitAmount ?? null,
      decAllocationAnnual: 0,
      decAllocationMonthly: 0,
      blnProofRequired: Boolean(objOption.blnProofRequired),
      strTaxTreatment: null,
      strSource: "Salary structure dropdown",
    }));
    if (lstMasterEligibleOptions.length === 0) {
      lstFallbackEligibleSalaryComponents.forEach((objComponent) => addOption({
        intSalaryComponentID: objComponent.intID,
        strComponentCode: objComponent.strComponentCode,
        strComponentName: objComponent.strComponentName,
        decAnnualLimit: objComponent.decAnnualLimitAmount,
        decMonthlyLimit: objComponent.decMonthlyLimitAmount,
        decAllocationAnnual: 0,
        decAllocationMonthly: 0,
        blnProofRequired: objComponent.blnProofRequired,
        strTaxTreatment: objComponent.strTaxTreatment,
        strSource: "Salary component master",
      }));
    }

    (objContext?.lstDeclarationLines || []).forEach((objLine) => addOption({
      intSalaryComponentID: objLine.intSalaryComponentID,
      strComponentCode: objLine.strComponentCode,
      strComponentName: objLine.strComponentName,
      decAnnualLimit: objLine.decAnnualLimit,
      decMonthlyLimit: objLine.decMonthlyLimit,
      decAllocationAnnual: objLine.decAllocationAnnual,
      decAllocationMonthly: objLine.decAllocationMonthly,
      blnProofRequired: objLine.blnProofRequired,
      strTaxTreatment: objLine.strTaxTreatment,
      strSource: "Declaration row",
    }));

    (objContext?.objFlexiAllocation?.lstAvailableComponents || [])
      .filter((objLine) => setMasterEligibleComponentIDs.size === 0 || setMasterEligibleComponentIDs.has(Number(objLine.intSalaryComponentID)))
      .forEach((objLine) => addOption({
        intSalaryComponentID: objLine.intSalaryComponentID,
        strComponentCode: objLine.strComponentCode,
        strComponentName: objLine.strComponentName,
        decAnnualLimit: null,
        decMonthlyLimit: null,
        decAllocationAnnual: 0,
        decAllocationMonthly: 0,
        blnProofRequired: false,
        strTaxTreatment: null,
        strSource: "Salary structure flexi cap",
      }));

    (objContext?.lstComponentLines || []).forEach((objLine) => {
      const blnFlexiLine = Boolean(
        objLine.blnIsFlexiBenefit
        && !objLine.blnIsFlexiBasketLine
        && !objLine.blnIsFlexiBasket
        && !isFlexiBucketLike(String(objLine.strComponentCode || ""), String(objLine.strComponentName || "")),
      );
      if (!blnFlexiLine) return;
      const intSalaryComponentID = getComponentID(objLine);
      if (setMasterEligibleComponentIDs.size > 0 && !setMasterEligibleComponentIDs.has(intSalaryComponentID)) return;
      addOption({
        intSalaryComponentID,
        strComponentCode: String(objLine.strComponentCode || ""),
        strComponentName: String(objLine.strComponentName || objLine.strComponentCode || ""),
        decAnnualLimit: getSnapshotNumber(objLine, ["decAnnualLimit", "decAnnualLimitAmount", "decFlexiMaxYearlyAmount", "decReimbursementMaxClaimYearlyLimit"]),
        decMonthlyLimit: getSnapshotNumber(objLine, ["decMonthlyLimit", "decMonthlyLimitAmount", "decFlexiMaxMonthlyAmount", "decReimbursementMaxClaimMonthlyLimit"]),
        decAllocationAnnual: getSnapshotNumber(objLine, ["decAllocationAnnual", "decAmountAnnual", "decDefaultAmountAnnual"]),
        decAllocationMonthly: getSnapshotNumber(objLine, ["decAllocationMonthly", "decAmountMonthly", "decDefaultAmountMonthly"]),
        blnProofRequired: Boolean(objLine.blnProofRequired),
        strTaxTreatment: String(objLine.strTaxTreatment || ""),
        strSource: "Salary structure flexi cap",
      });
    });

    const dicSalaryStructureComponentByID = new Map(
      (objSalaryStructureFormOptions?.lstSalaryComponents || []).map((objComponent) => [Number(objComponent.intID), objComponent]),
    );
    const dicAssignedStructureLineByComponentID = new Map(
      (objAssignedSalaryStructureDetail?.lstComponents || [])
        .filter((objLine) => Number(objLine.intSalaryComponentID) > 0)
        .map((objLine) => [Number(objLine.intSalaryComponentID), objLine]),
    );
    (objAssignedSalaryStructureDetail?.lstComponents || []).forEach((objLine) => {
      const lstMappedOptions = (objLine.lstFlexiMappings || [])
        .filter((objMapping) => objMapping.blnIsActive !== false && Number(objMapping.intFlexiComponentID) > 0)
        .map((objMapping) => {
          const intSalaryComponentID = Number(objMapping.intFlexiComponentID);
          const objComponent = dicSalaryStructureComponentByID.get(intSalaryComponentID);
          const objAssignedLine = dicAssignedStructureLineByComponentID.get(intSalaryComponentID);
          return {
            intSalaryComponentID,
            strComponentCode: objComponent?.strCode || objAssignedLine?.strComponentCode || objMapping.strFlexiComponentCode,
            strComponentName: objComponent?.strLabel || objAssignedLine?.strComponentName || objMapping.strFlexiComponentName,
            decAnnualLimit: objMapping.fltMaxAmount ?? objAssignedLine?.fltMaxAmount ?? objComponent?.decReimbursementMaxClaimYearlyLimit ?? objComponent?.decAnnualLimit ?? objComponent?.decFlexiMaxYearlyAmount ?? objComponent?.decAnnualLimitAmount ?? null,
            decMonthlyLimit: objMapping.fltDefaultAmount ?? objAssignedLine?.fltFixedAmount ?? objComponent?.decReimbursementMaxClaimMonthlyLimit ?? objComponent?.decMonthlyLimit ?? objComponent?.decFlexiMaxMonthlyAmount ?? objComponent?.decMonthlyLimitAmount ?? null,
            decAllocationAnnual: objMapping.fltMaxAmount ?? (objMapping.fltDefaultAmount != null ? objMapping.fltDefaultAmount * 12 : 0),
            decAllocationMonthly: objMapping.fltDefaultAmount ?? 0,
            blnProofRequired: Boolean(objComponent?.blnProofRequired),
            strTaxTreatment: null,
            strSource: "Assigned salary structure flexi mapping",
          } satisfies FlexiComponentOption;
        });

      if (lstMappedOptions.length > 0) {
        lstMappedOptions.forEach(addOption);
        return;
      }

      const blnLooksLikeFlexiStructureLine = Boolean(
        objLine.blnIsActive
        && !objLine.blnIsFlexiBasketLine
        && !isFlexiBucketLike(objLine.strComponentCode, objLine.strComponentName)
        && (
          normalizeText(objLine.strFlexiComponentRole) !== ""
          || normalizeText(objLine.strComponentCategory).includes("reimbursement")
          || Number(objLine.fltFixedAmount || 0) > 0
          || Number(objLine.fltMaxAmount || 0) > 0
        ),
      );
      if (!blnLooksLikeFlexiStructureLine) return;

      const blnStandaloneFlexiLine = Boolean(
        objLine.blnIsActive
        && !objLine.blnIsFlexiBasketLine
        && !isFlexiBucketLike(objLine.strComponentCode, objLine.strComponentName)
      );
      if (!blnStandaloneFlexiLine) return;
      if (setMasterEligibleComponentIDs.size > 0 && !setMasterEligibleComponentIDs.has(Number(objLine.intSalaryComponentID))) return;
      addOption({
        intSalaryComponentID: objLine.intSalaryComponentID,
        strComponentCode: objLine.strComponentCode,
        strComponentName: objLine.strComponentName,
        decAnnualLimit: objLine.fltMaxAmount ?? null,
        decMonthlyLimit: objLine.fltFixedAmount ?? null,
        decAllocationAnnual: objLine.fltMaxAmount ?? 0,
        decAllocationMonthly: objLine.fltFixedAmount ?? 0,
        blnProofRequired: false,
        strTaxTreatment: null,
        strSource: "Assigned salary structure detail",
      });
    });

    const intAssignedStructureID = Number(objContext?.objAssignedStructure?.intSalaryStructureID || 0);
    const lstSalaryStructureOptions = objEmployeeSalaryFormOptions?.lstSalaryStructures || [];
    const objAssignedStructureOption = lstSalaryStructureOptions.find((objStructure) => Number(objStructure.intID) === intAssignedStructureID);
    const lstEmployeeSalaryStructureComponents = objAssignedStructureOption?.lstComponents?.length
      ? objAssignedStructureOption.lstComponents
      : lstSalaryStructureOptions.flatMap((objStructure) => objStructure.lstComponents || []);
    lstEmployeeSalaryStructureComponents
      .filter((objLine) =>
        Boolean(objLine.blnIsFlexiBenefit || objLine.blnProofRequired || objLine.decAnnualLimit || objLine.decAnnualLimitAmount)
        && !Boolean(objLine.blnIsFlexiBasket)
        && !isFlexiBucketLike(objLine.strComponentCode, objLine.strComponentName)
        && (setMasterEligibleComponentIDs.size === 0 || setMasterEligibleComponentIDs.has(Number(objLine.intSalaryComponentID)))
      )
      .forEach((objLine) => addOption({
        intSalaryComponentID: objLine.intSalaryComponentID,
        strComponentCode: objLine.strComponentCode,
        strComponentName: objLine.strComponentName,
        decAnnualLimit: objLine.decReimbursementMaxClaimYearlyLimit ?? objLine.decAnnualLimit ?? objLine.decFlexiMaxYearlyAmount ?? objLine.decAnnualLimitAmount ?? null,
        decMonthlyLimit: objLine.decReimbursementMaxClaimMonthlyLimit ?? objLine.decMonthlyLimit ?? objLine.decFlexiMaxMonthlyAmount ?? objLine.decMonthlyLimitAmount ?? null,
        decAllocationAnnual: objLine.decDefaultAmountAnnual ?? objLine.decAmountAnnual ?? 0,
        decAllocationMonthly: objLine.decDefaultAmountMonthly ?? objLine.decAmountMonthly ?? 0,
        blnProofRequired: Boolean(objLine.blnProofRequired),
        strTaxTreatment: objLine.strTaxTreatment,
        strSource: "Assigned salary structure",
      }));

    lstFallbackEligibleSalaryComponents
      .filter((objComponent) =>
        setMasterEligibleComponentIDs.size === 0 || setMasterEligibleComponentIDs.has(Number(objComponent.intID))
      )
      .forEach((objComponent) => addOption({
        intSalaryComponentID: objComponent.intID,
        strComponentCode: objComponent.strComponentCode,
        strComponentName: objComponent.strComponentName,
        decAnnualLimit: objComponent.decAnnualLimitAmount,
        decMonthlyLimit: objComponent.decMonthlyLimitAmount,
        decAllocationAnnual: 0,
        decAllocationMonthly: 0,
        blnProofRequired: objComponent.blnProofRequired,
        strTaxTreatment: objComponent.strTaxTreatment,
        strSource: "Salary component master",
      }));

    return Array.from(dicOptions.values()).sort((objA, objB) =>
      String(objA.strComponentName || objA.strComponentCode || "").localeCompare(String(objB.strComponentName || objB.strComponentCode || "")),
    );
  }, [lstSalaryComponents, objAssignedSalaryStructureDetail?.lstComponents, objContext?.lstComponentLines, objContext?.lstDeclarationLines, objContext?.objAssignedStructure?.intSalaryStructureID, objContext?.objFlexiAllocation?.lstAvailableComponents, objSalaryStructureFormOptions?.lstSalaryComponents, objEmployeeSalaryFormOptions?.lstSalaryStructures]);

  const dicExistingDeclarationLinesByID = useMemo(
    () => new Map((objContext?.lstDeclarationLines || []).map((objLine) => [objLine.intSalaryComponentID, objLine])),
    [objContext?.lstDeclarationLines],
  );

  const lstRows = useMemo(
    () =>
      lstFlexiComponentOptions.map((objOption) => {
        const objLine = dicExistingDeclarationLinesByID.get(objOption.intSalaryComponentID) || buildLineFromOption(objOption);
        const decDeclaredAnnual = getLineDeclaredAmount(objLine, dicDraftInputs);
        const decAnnualLimit = objLine.decAnnualLimit ?? Number.POSITIVE_INFINITY;
        const decSanitizedAnnual = objLine.blnEligible === false ? 0 : Math.min(decDeclaredAnnual, decAnnualLimit);
        return {
          ...objLine,
          decDeclaredAnnual: decSanitizedAnnual,
          decDeclaredMonthly: decSanitizedAnnual / 12,
        };
      }),
    [dicDraftInputs, dicExistingDeclarationLinesByID, lstFlexiComponentOptions],
  );
  const blnCanEditDeclaration = Boolean(blnWorkflowEditable && (lstFlexiComponentOptions.length > 0 || lstRows.length > 0 || objContext?.blnCanDeclare));

  const decDeclaredAnnual = useMemo(
    () => lstRows.reduce((decTotal, objRow) => decTotal + objRow.decDeclaredAnnual, 0),
    [lstRows],
  );
  const decResidualAnnual = Math.max(decBasketAnnual - decDeclaredAnnual, 0);
  const blnAllocationExceeded = decDeclaredAnnual > decBasketAnnual;
  const blnCanAttemptSave = Boolean(blnCanEditDeclaration && !blnSaving && !blnAllocationExceeded);
  const objSalarySnapshot = objContext?.objCurrentSalarySnapshot as Record<string, unknown> | null | undefined;
  const decAnnualCtc = getSnapshotNumber(objSalarySnapshot, ["decCtcAnnual", "decAnnualCtc", "decCTCAnnual"]);
  const decGrossMonthly = getSnapshotNumber(objSalarySnapshot, ["decGrossMonthly", "decMonthlyGross", "decGrossSalaryMonthly"]);
  const blnHasCar = getBooleanAnswer(dicEligibilityAnswers, "HAS_CAR", false);
  const blnMealVoucherRequired = getBooleanAnswer(dicEligibilityAnswers, "MEAL_VOUCHER_REQUIRED", true);
  const intChildrenCount = toChildrenCount(dicEligibilityAnswers.CHILDREN_COUNT ?? dicEligibilityAnswers.children_count ?? 1);
  const blnHostelApplicable = getBooleanAnswer(dicEligibilityAnswers, "HOSTEL_APPLICABLE", false);
  const dicComponentSummary = (objContext?.lstComponentLines || []).reduce(
    (dicAcc, objLine) => {
      const decAnnualAmount = getComponentAnnualAmount(objLine);
      const strLookup = normalizeText(getComponentName(objLine));
      const blnFlexiLine = Boolean(objLine.blnIsFlexiBenefit || objLine.blnIsFlexiBasket || objLine.blnIsFlexiBasketLine);
      if (blnFlexiLine) {
        dicAcc.flexi += decAnnualAmount;
      } else if (strLookup.includes("basic")) {
        dicAcc.basic += decAnnualAmount;
      } else if (strLookup.includes("hra") || strLookup.includes("house rent")) {
        dicAcc.hra += decAnnualAmount;
      } else {
        dicAcc.other += decAnnualAmount;
      }
      return dicAcc;
    },
    { basic: 0, hra: 0, other: 0, flexi: 0 },
  );
  const lstBreakdownComponentRows = (objContext?.lstComponentLines || [])
    .map((objLine) => ({
      strLabel: getComponentName(objLine),
      decValue: getComponentAnnualAmount(objLine),
      blnDeduction: Boolean(objLine.blnIsEmployeeDeduction) || normalizeText(getComponentName(objLine)).includes("tax"),
    }))
    .filter((objRow) => objRow.strLabel && objRow.decValue > 0)
    .slice(0, 6);
  const lstSalarySplitRows = [
    { strLabel: "Basic", decBeforeAnnual: dicComponentSummary.basic, decAfterAnnual: dicComponentSummary.basic },
    { strLabel: "HRA", decBeforeAnnual: dicComponentSummary.hra, decAfterAnnual: dicComponentSummary.hra },
    { strLabel: "Other Fixed Pay", decBeforeAnnual: dicComponentSummary.other || Math.max((decAnnualCtc || 0) - decBasketAnnual, 0), decAfterAnnual: dicComponentSummary.other || Math.max((decAnnualCtc || 0) - decBasketAnnual, 0) },
    { strLabel: "Declared Flexi", decBeforeAnnual: dicComponentSummary.flexi || decBasketAnnual, decAfterAnnual: decDeclaredAnnual },
    { strLabel: "Residual Taxable", decBeforeAnnual: 0, decAfterAnnual: decResidualAnnual },
  ];
  const decEstimatedMonthlyPayrollImpact = decResidualAnnual / 12;

  function buildPayloadRows() {
    return lstRows
      .filter((objRow) => objRow.decDeclaredAnnual > 0)
      .map((objRow) => ({
        intSalaryComponentID: objRow.intSalaryComponentID,
        decDeclaredAmountAnnual: objRow.decDeclaredAnnual,
        strRemarks: objRow.strDeclarationItemRemarks || null,
      }));
  }

  function validateDeclarationForSave() {
    if (lstRows.length === 0) {
      setStrError("No flexi components are available for this salary structure.");
      return false;
    }
    if (blnAllocationExceeded) {
      setStrError("Declared flexi amount exceeds the available basket.");
      return false;
    }
    if (buildPayloadRows().length === 0) {
      setStrError("Enter a declared annual amount for at least one flexi component.");
      return false;
    }
    return true;
  }

  function handleClearFlexiComponent(intSalaryComponentID: number) {
    setDicDraftInputs((dicPrevious) => ({
      ...dicPrevious,
      [intSalaryComponentID]: "0",
    }));
  }

  async function refreshFromContext(objData: FlexiDeclarationContextRecord, strMessage: string) {
    setBlnLoading(true);
    setBlnAssignedStructureDetailResolved(false);
    const objEnrichedData = await enrichContextWithLoggedInEmployeeSalary(objData);
    const intAssignedStructureID = Number(objEnrichedData.objAssignedStructure?.intSalaryStructureID || 0);
    const objAssignedStructureDetail = intAssignedStructureID
      ? await withTimeout(salaryStructureService.getSalaryStructureById(intAssignedStructureID), 10000).catch(() => null)
      : null;
    setObjContext(objEnrichedData);
    setObjAssignedSalaryStructureDetail(objAssignedStructureDetail);
    setBlnAssignedStructureDetailResolved(true);
    setDicDraftInputs(buildInitialDraftInputs(objEnrichedData));
    setDicEligibilityAnswers(objEnrichedData.objEligibilityAnswers || {});
    setStrRemarks(objEnrichedData.objDeclaration?.strRemarks || "");
    setStrToast(strMessage);
    setBlnLoading(false);
  }

  if (blnCompulsoryDataPending) {
    return (
      <BlockingLoader
        blnOpen
        strLabel="Loading flexi declaration details..."
      />
    );
  }

  async function handleSaveDraft() {
    if (!validateDeclarationForSave()) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.saveDraft(strFinancialYearCode, buildPayloadRows(), strRemarks, dicEligibilityAnswers);
      await refreshFromContext(objData, "Draft saved successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save draft.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleSubmit() {
    if (!validateDeclarationForSave()) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.submit(strFinancialYearCode, buildPayloadRows(), strRemarks, dicEligibilityAnswers);
      await refreshFromContext(objData, "Declaration submitted successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to submit declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.2,
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        pb: 2,
        pr: 0.5,
      }}
    >
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!objContext?.blnCanDeclare && lstFlexiComponentOptions.length === 0 ? (
        <Alert severity="info">{objContext?.strIneligibilityReason || "Flexi declaration is not available for this employee."}</Alert>
      ) : null}
      {blnAllocationExceeded ? <Alert severity="error">Declared flexi amount exceeds the available basket.</Alert> : null}

      <Paper sx={{ p: 1.35, borderRadius: "12px", border: "1px solid #1e3a8a", background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%)", boxShadow: "0 8px 20px rgba(11, 47, 99, 0.18)", position: "sticky", top: 0, zIndex: 8 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#f8fcff", fontSize: "1.05rem" }}>
              {objContext?.objEmployeeSummary?.strEmployeeName || "Employee"}
              {objContext?.objEmployeeSummary?.strEmployeeCode ? ` (${objContext.objEmployeeSummary.strEmployeeCode})` : ""}
            </Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              FY {strFinancialYearCode} declaration workflow | Submitted {formatDate(objContext?.objDeclaration?.dtSubmittedOn)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} />
            <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.72)", "&:hover": { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)" } }} onClick={() => objRouter.push("/salary/flexi-pay-declarations")}>
              Back
            </Button>
            <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnCanAttemptSave} onClick={() => void handleSaveDraft()}>
              Save Draft
            </Button>
            <Button size="small" variant="contained" color="warning" startIcon={<SendRoundedIcon />} disabled={!blnCanAttemptSave} onClick={() => void handleSubmit()}>
              Submit
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Flexi Basket</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Declared Total</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Residual Balance</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Structure</Typography>
          <Typography sx={{ fontWeight: 800 }}>{objContext?.objAssignedStructure?.strSalaryStructureName || "-"}</Typography>
        </Paper>
      </Box>

      <Box sx={{ display: "grid", gap: 1.2, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" } }}>
        <Stack spacing={1.2}>
          <Paper sx={{ p: 1.2, borderRadius: "12px", border: "1px solid #dbe3ef" }}>
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Meal / Car / Mandatory Details</Typography>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                <Paper variant="outlined" sx={{ p: 1, borderRadius: "10px" }}>
                  <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <DirectionsCarFilledRoundedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.81rem" }}>Employee has car</Typography>
                        <Typography sx={{ color: "#64748b", fontSize: "0.7rem" }}>Enables car-linked flexi</Typography>
                      </Box>
                    </Stack>
                    <Switch size="small" checked={blnHasCar} disabled={!blnCanEditDeclaration || blnSaving} onChange={(objEvent) => setDicEligibilityAnswers((dicPrev) => ({ ...dicPrev, HAS_CAR: objEvent.target.checked }))} />
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1, borderRadius: "10px" }}>
                  <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <LunchDiningRoundedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.81rem" }}>Meal voucher required</Typography>
                        <Typography sx={{ color: "#64748b", fontSize: "0.7rem" }}>Controls meal voucher flexi</Typography>
                      </Box>
                    </Stack>
                    <Switch size="small" checked={blnMealVoucherRequired} disabled={!blnCanEditDeclaration || blnSaving} onChange={(objEvent) => setDicEligibilityAnswers((dicPrev) => ({ ...dicPrev, MEAL_VOUCHER_REQUIRED: objEvent.target.checked }))} />
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1, borderRadius: "10px" }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <FamilyRestroomRoundedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.81rem", mb: 0.45 }}>Dependent children count</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        value={String(intChildrenCount)}
                        disabled={!blnCanEditDeclaration || blnSaving}
                        onChange={(objEvent) => setDicEligibilityAnswers((dicPrev) => ({ ...dicPrev, CHILDREN_COUNT: toChildrenCount(objEvent.target.value) }))}
                        inputProps={{ min: 0, max: 20, step: 1 }}
                      />
                    </Box>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1, borderRadius: "10px" }}>
                  <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.81rem" }}>Hostel applicable</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.7rem" }}>For eligible dependent cases</Typography>
                    </Box>
                    <Switch size="small" checked={blnHostelApplicable} disabled={!blnCanEditDeclaration || blnSaving || intChildrenCount === 0} onChange={(objEvent) => setDicEligibilityAnswers((dicPrev) => ({ ...dicPrev, HOSTEL_APPLICABLE: objEvent.target.checked }))} />
                  </Stack>
                </Paper>
              </Box>
            </Stack>
          </Paper>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Flexi Components and Declaration</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
                    Declare eligible components against salary structure flexi caps. Enter annual amounts directly against each available component.
                  </Typography>
                </Box>
                <Chip label={`${lstRows.length} available`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 700 }} />
              </Stack>
            </Box>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table size="small">
            <TableHead sx={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#ffffff" }}>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell align="right">Annual Cap</TableCell>
                <TableCell align="right">Declared Annual</TableCell>
                <TableCell align="right">Monthly</TableCell>
                <TableCell>Proof</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                    No flexi components are available.
                  </TableCell>
                </TableRow>
              ) : (
                lstRows.map((objRow) => (
                  <TableRow key={objRow.intSalaryComponentID}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.84rem" }}>{objRow.strComponentName || objRow.strComponentCode || "Component"}</Typography>
                      {objRow.strEligibilityReason ? <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>{objRow.strEligibilityReason}</Typography> : null}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(objRow.decAnnualLimit, strCurrencyCode)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={dicDraftInputs[objRow.intSalaryComponentID] ?? String(objRow.decDraftDeclaredAnnual ?? objRow.decAllocationAnnual ?? 0)}
                        disabled={!blnCanEditDeclaration || objRow.blnEligible === false || blnSaving}
                        onChange={(e) =>
                          setDicDraftInputs((dicPrev) => ({
                            ...dicPrev,
                            [objRow.intSalaryComponentID]: e.target.value,
                          }))
                        }
                        inputProps={{ min: 0, max: objRow.decAnnualLimit ?? undefined }}
                        sx={{ width: 140 }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(objRow.decDeclaredMonthly, strCurrencyCode)}</TableCell>
                    <TableCell>{objRow.blnProofRequired ? "Required" : "Not Required"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={objRow.strDeclarationItemStatus || (objRow.blnEligible === false ? "Not Eligible" : "Draft")} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        disabled={!blnCanEditDeclaration || blnSaving}
                        onClick={() => handleClearFlexiComponent(objRow.intSalaryComponentID)}
                        sx={{ color: "#dc2626" }}
                        aria-label={`Clear ${objRow.strComponentName || objRow.strComponentCode || "component"} amount`}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 1.2, borderRadius: "12px" }}>
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 800 }}>Declaration Remarks</Typography>
              <TextField multiline minRows={3} value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} disabled={(!blnCanEditDeclaration && !blnCanCancel) || blnSaving} />
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Declared: ${formatCurrency(decDeclaredAnnual, strCurrencyCode)}`} />
                  <Chip label={`Residual: ${formatCurrency(decResidualAnnual, strCurrencyCode)}`} />
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
            <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Fixed Salary Components</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell align="right">Annual</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstSalarySplitRows.slice(0, 3).map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{objRow.strLabel}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decBeforeAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decBeforeAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Post Declaration Salary Split</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Bucket</TableCell>
                      <TableCell align="right">Annual</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstSalarySplitRows.map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{objRow.strLabel}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAfterAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAfterAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Stack>

        <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #cfe3ff", position: { lg: "sticky" }, top: { lg: 82 }, alignSelf: "start" }}>
          <Stack spacing={1.15}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography sx={{ fontWeight: 900, color: "#172554", fontSize: "0.95rem" }}>Salary Breakdown Impact</Typography>
              <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16 }} />
            </Stack>

            <Box sx={{ borderRadius: "6px", backgroundColor: "#eaf1fb", px: 1.15, py: 0.8 }}>
              <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.82rem" }}>Flexi Declaration Status</Typography>
            </Box>

            <Stack spacing={0.9}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Annual CTC</Typography>
                <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decAnnualCtc, strCurrencyCode)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Gross Monthly</Typography>
                <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decGrossMonthly, strCurrencyCode)}</Typography>
              </Box>
              {lstBreakdownComponentRows.map((objRow) => (
                <Box key={objRow.strLabel} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{objRow.strLabel}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem", textAlign: "right" }}>
                    {formatCurrency(objRow.decValue, strCurrencyCode)}
                    <Box component="span" sx={{ color: "#64748b", fontSize: "0.68rem", ml: 0.5 }}>
                      {formatPercent(objRow.decValue, decAnnualCtc)}
                    </Box>
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Box sx={{ borderRadius: "6px", backgroundColor: "#e4f7ea", px: 1.15, py: 0.8 }}>
              <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.82rem" }}>Flexi Pay Declaration</Typography>
            </Box>

            <Stack spacing={0.9}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Flexi Bucket Available</Typography>
                <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Approved / Declared Flexi</Typography>
                <Typography sx={{ color: "#dc2626", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Remaining Balance</Typography>
                <Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
              </Box>
            </Stack>

            <Box sx={{ borderTop: "1px solid #dbe3ef", pt: 1 }}>
              <Stack spacing={0.9}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Stack direction="row" spacing={0.4} alignItems="center">
                    <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Residual Taxable Component</Typography>
                    <InfoOutlinedIcon sx={{ color: "#64748b", fontSize: 14 }} />
                  </Stack>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Estimated Monthly Payroll Impact</Typography>
                  <Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decEstimatedMonthlyPayrollImpact, strCurrencyCode)}</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="flex-start">
                <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                <Typography sx={{ color: "#172554", fontSize: "0.75rem", lineHeight: 1.45 }}>
                  Amounts are recalculated in real time based on your declarations. Final impact will be reflected in employee payslip.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2500} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
