"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import EditOffRoundedIcon from "@mui/icons-material/EditOffRounded";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import LunchDiningRoundedIcon from "@mui/icons-material/LunchDiningRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import { useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type {
  EmployeeSalaryComponentLine,
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFlexiAllocationLine,
  EmployeeSalaryFormOptions,
} from "@/features/employee-salary/types";
import { flexiPayDeclarationService } from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { masterApiService, type SalaryStructureApiRecord } from "@/services/master/MasterApiService";
import { authApiService } from "@/services/auth/AuthApiService";

type EmployeeContext = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartmentName: string;
  strDesignationName: string;
  strBandName: string;
};

type EligibilityAnswers = {
  blnHasCar: boolean;
  blnMealVoucherRequired: boolean;
  intChildrenCount: number;
  blnHostelApplicable: boolean;
};

type SalaryBreakdownRow = {
  strLabel: string;
  decBeforeAnnual: number;
  decAfterAnnual: number;
};

type ImpactMetricRow = {
  strLabel: string;
  decValue: number;
  strColor?: string;
};

type FlexiDraftRow = {
  intSalaryComponentID: number;
  strComponentCode: string;
  strComponentName: string;
  decAnnualLimit: number | null;
  decMonthlyLimit: number | null;
  decCurrentAnnual: number;
  decCurrentMonthly: number;
  decDeclaredAnnual: number;
  decDeclaredMonthly: number;
  blnProofRequired: boolean;
  strTaxTreatment: string;
  blnEligible: boolean;
  strEligibilityReason: string;
};

type FlexiSelectionRow = {
  strRowID: string;
  intSalaryComponentID: number | null;
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

function getComponentLabel(strComponentName?: string | null, strComponentCode?: string | null) {
  return strComponentName?.trim() || strComponentCode?.trim() || "Flexi Component";
}

function normalizeText(strValue?: string | null) {
  return String(strValue || "").trim().toLowerCase();
}

function deriveEmployeeContext(objDetail: EmployeeSalaryDetailRecord): EmployeeContext {
  const objSummary = objDetail.objEmployeeSummary;
  return {
    intEmployeeID: objSummary.intEmployeeID,
    strEmployeeCode: objSummary.strEmployeeCode || "-",
    strEmployeeName: objSummary.strEmployeeName || "Employee",
    strDepartmentName: "-",
    strDesignationName: "-",
    strBandName: "-",
  };
}

function deriveEligibility(
  objLine: EmployeeSalaryFlexiAllocationLine,
  objAnswers: EligibilityAnswers,
) {
  const strName = normalizeText(objLine.strComponentName);
  const strCode = normalizeText(objLine.strComponentCode);
  const strLookup = `${strName} ${strCode}`;

  if (strLookup.includes("car fuel") || strLookup.includes("fuel reimbursement") || strLookup.includes("driver") || strLookup.includes("car lease")) {
    return objAnswers.blnHasCar
      ? { blnEligible: true, strEligibilityReason: "Eligible from car ownership." }
      : { blnEligible: false, strEligibilityReason: "Enable only when employee has car." };
  }

  if (strLookup.includes("meal")) {
    return objAnswers.blnMealVoucherRequired
      ? { blnEligible: true, strEligibilityReason: "Meal voucher selected." }
      : { blnEligible: false, strEligibilityReason: "Enable only when meal voucher is opted." };
  }

  if (strLookup.includes("children education")) {
    return objAnswers.intChildrenCount > 0
      ? { blnEligible: true, strEligibilityReason: `Eligible for ${objAnswers.intChildrenCount} child${objAnswers.intChildrenCount > 1 ? "ren" : ""}.` }
      : { blnEligible: false, strEligibilityReason: "Enable only when employee has children." };
  }

  if (strLookup.includes("hostel")) {
    return objAnswers.intChildrenCount > 0 && objAnswers.blnHostelApplicable
      ? { blnEligible: true, strEligibilityReason: "Hostel benefit enabled from dependent declaration." }
      : { blnEligible: false, strEligibilityReason: "Enable only for children with hostel applicability." };
  }

  return { blnEligible: true, strEligibilityReason: "Available from salary structure." };
}

function buildDraftRows(
  objDetail: EmployeeSalaryDetailRecord,
  objAnswers: EligibilityAnswers,
): FlexiDraftRow[] {
  const dicAllocationByComponentID = new Map(
    (objDetail.objFlexiAllocation?.lstAllocationLines || []).map((objLine) => [objLine.intSalaryComponentID, objLine])
  );

  return (objDetail.lstComponentLines || [])
    .filter((objLine) => Boolean(objLine.blnIsFlexiBenefit) && !Boolean(objLine.blnIsFlexiBasket))
    .map((objComponentLine) => {
      const objAllocationLine = dicAllocationByComponentID.get(objComponentLine.intSalaryComponentID) ?? null;
      const objEligibility = deriveEligibility({
        intSalaryComponentID: objComponentLine.intSalaryComponentID,
        strComponentCode: objComponentLine.strComponentCode,
        strComponentName: objComponentLine.strComponentName,
        decAnnualLimit: objAllocationLine?.decAnnualLimit ?? objComponentLine.decDefaultAmountAnnual ?? objComponentLine.decAmountAnnual ?? null,
        decMonthlyLimit: objAllocationLine?.decMonthlyLimit ?? objComponentLine.decDefaultAmountMonthly ?? objComponentLine.decAmountMonthly ?? null,
        decAllocationAnnual: objAllocationLine?.decAllocationAnnual ?? objComponentLine.decAmountAnnual ?? 0,
        decAllocationMonthly: objAllocationLine?.decAllocationMonthly ?? objComponentLine.decAmountMonthly ?? 0,
        blnProofRequired: Boolean(objAllocationLine?.blnProofRequired ?? objComponentLine.blnProofRequired),
        strTaxTreatment: objAllocationLine?.strTaxTreatment ?? objComponentLine.strTaxTreatment ?? null,
        decBalanceAnnual: objAllocationLine?.decBalanceAnnual ?? null,
      }, objAnswers);
      const decCurrentAnnual = Number(objAllocationLine?.decAllocationAnnual ?? objComponentLine.decAmountAnnual ?? 0);
      const decCurrentMonthlySource = objAllocationLine?.decAllocationMonthly ?? objComponentLine.decAmountMonthly ?? (decCurrentAnnual / 12);
      const decCurrentMonthly = Number(decCurrentMonthlySource || 0);
      const decAnnualLimit = objAllocationLine?.decAnnualLimit ?? objComponentLine.decDefaultAmountAnnual ?? objComponentLine.decAmountAnnual ?? null;
      const decMonthlyLimit = objAllocationLine?.decMonthlyLimit ?? objComponentLine.decDefaultAmountMonthly ?? objComponentLine.decAmountMonthly ?? null;
      const decDeclaredAnnual = objEligibility.blnEligible ? decCurrentAnnual : 0;
      const decDeclaredMonthly = objEligibility.blnEligible ? decCurrentMonthly : 0;

      return {
        intSalaryComponentID: objComponentLine.intSalaryComponentID,
        strComponentCode: String(objComponentLine.strComponentCode || ""),
        strComponentName: getComponentLabel(objComponentLine.strComponentName, objComponentLine.strComponentCode),
        decAnnualLimit,
        decMonthlyLimit,
        decCurrentAnnual,
        decCurrentMonthly,
        decDeclaredAnnual,
        decDeclaredMonthly,
        blnProofRequired: Boolean(objAllocationLine?.blnProofRequired ?? objComponentLine.blnProofRequired),
        strTaxTreatment: objAllocationLine?.strTaxTreatment || objComponentLine.strTaxTreatment || "as per payroll rule",
        blnEligible: objEligibility.blnEligible,
        strEligibilityReason: objEligibility.strEligibilityReason,
      };
    });
}

function mapCurrentComponentAmounts(lstComponents: EmployeeSalaryComponentLine[]) {
  const dicBase = {
    basic: 0,
    hra: 0,
    special: 0,
    fixed: 0,
    flexi: 0,
  };

  for (const objLine of lstComponents) {
    const decAnnualAmount = Number(objLine.decAmountAnnual || 0);
    const strName = normalizeText(objLine.strComponentName);
    const strCode = normalizeText(objLine.strComponentCode);
    const blnFlexiLine = Boolean(objLine.blnIsFlexiBenefit);

    if (blnFlexiLine) {
      dicBase.flexi += decAnnualAmount;
      continue;
    }
    if (strName.includes("basic") || strCode === "basic") {
      dicBase.basic += decAnnualAmount;
      continue;
    }
    if (strName.includes("house rent") || strName === "hra" || strCode === "hra") {
      dicBase.hra += decAnnualAmount;
      continue;
    }
    if (strName.includes("special") || strName.includes("compensatory") || strCode.includes("special")) {
      dicBase.special += decAnnualAmount;
      continue;
    }
    dicBase.fixed += decAnnualAmount;
  }

  return dicBase;
}

function toAnnualInputValue(strValue: string) {
  const decValue = Number(strValue);
  return Number.isFinite(decValue) && decValue >= 0 ? decValue : 0;
}

function toChildrenCount(strValue: string) {
  const intValue = Number(strValue);
  if (!Number.isFinite(intValue) || intValue < 0) {
    return 0;
  }
  return Math.min(20, Math.floor(intValue));
}

function createSelectionRow(intSalaryComponentID: number | null = null): FlexiSelectionRow {
  return {
    strRowID: `${intSalaryComponentID ?? "new"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    intSalaryComponentID,
  };
}

function deriveAnswersFromDeclaration(objDetail: EmployeeSalaryDetailRecord): EligibilityAnswers {
  const dicAnswers = new Map(
    (objDetail.objFlexiDeclaration?.lstAnswers || []).map((objAnswer) => [
      normalizeText(objAnswer.strAnswerCode),
      String(objAnswer.strAnswerValue || ""),
    ]),
  );
  const getBooleanAnswer = (strCode: string, blnDefault: boolean) => {
    const strValue = normalizeText(dicAnswers.get(normalizeText(strCode)));
    if (!strValue) return blnDefault;
    return ["1", "true", "yes", "y"].includes(strValue);
  };

  return {
    blnHasCar: getBooleanAnswer("HAS_CAR", false),
    blnMealVoucherRequired: getBooleanAnswer("MEAL_VOUCHER_REQUIRED", true),
    intChildrenCount: toChildrenCount(dicAnswers.get("children_count") || "1"),
    blnHostelApplicable: getBooleanAnswer("HOSTEL_APPLICABLE", false),
  };
}

export default function FlexiPayDeclarationPage() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeSalaryFormOptions | null>(null);
  const [objSalaryStructureDetail, setObjSalaryStructureDetail] = useState<SalaryStructureApiRecord | null>(null);
  const [objEmployeeContext, setObjEmployeeContext] = useState<EmployeeContext | null>(null);
  const [objAnswers, setObjAnswers] = useState<EligibilityAnswers>({
    blnHasCar: false,
    blnMealVoucherRequired: true,
    intChildrenCount: 1,
    blnHostelApplicable: false,
  });
  const [dicDraftInputs, setDicDraftInputs] = useState<Record<number, string>>({});
  const [lstSelectedFlexiRows, setLstSelectedFlexiRows] = useState<FlexiSelectionRow[]>([]);
  const [strToast, setStrToast] = useState("");

  function applyDetailState(objSalaryDetail: EmployeeSalaryDetailRecord) {
    const objInitialAnswers = deriveAnswersFromDeclaration(objSalaryDetail);
    const lstInitialDraftRows = buildDraftRows(objSalaryDetail, objInitialAnswers);
    const dicDeclaredAmounts = new Map(
      (objSalaryDetail.objFlexiDeclaration?.lstItems || []).map((objItem) => [
        objItem.intSalaryComponentID,
        Number(objItem.decDeclaredAnnual || 0),
      ]),
    );
    const dicInitialInputs = lstInitialDraftRows.reduce<Record<number, string>>((dicAcc, objRow) => {
      const decDeclaredAmount = dicDeclaredAmounts.has(objRow.intSalaryComponentID)
        ? Number(dicDeclaredAmounts.get(objRow.intSalaryComponentID) || 0)
        : Number(objRow.decCurrentAnnual || 0);
      dicAcc[objRow.intSalaryComponentID] = decDeclaredAmount > 0 ? String(decDeclaredAmount) : "";
      return dicAcc;
    }, {});
    const lstDeclaredSelections = (objSalaryDetail.objFlexiDeclaration?.lstItems || [])
      .sort((a, b) => a.intDisplayOrder - b.intDisplayOrder)
      .map((objItem) => createSelectionRow(objItem.intSalaryComponentID));
    const lstAllocatedSelections = lstInitialDraftRows
      .filter((objRow) => Number(objRow.decCurrentAnnual || 0) > 0)
      .map((objRow) => createSelectionRow(objRow.intSalaryComponentID));

    setObjDetail(objSalaryDetail);
    setObjEmployeeContext(deriveEmployeeContext(objSalaryDetail));
    setObjAnswers(objInitialAnswers);
    setDicDraftInputs(dicInitialInputs);
    setLstSelectedFlexiRows(
      lstDeclaredSelections.length > 0
        ? lstDeclaredSelections
        : lstAllocatedSelections.length > 0
          ? lstAllocatedSelections
          : [createSelectionRow(null)],
    );
  }

  useEffect(() => {
    let blnMounted = true;

    async function loadScreen() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objCurrentUserResult = await authApiService.getCurrentUser();
        const intEmployeeID = objCurrentUserResult.Data.objUser.intEmployeeID ?? null;
        if (!intEmployeeID) {
          throw new Error("Current login is not linked to an employee record.");
        }

        const [objSalaryDetail, objSalaryFormOptions] = await Promise.all([
          flexiPayDeclarationService.getDetail(intEmployeeID),
          employeeSalaryService.getFormOptions().catch(() => null),
        ]);
        if (!blnMounted) return;

        setObjFormOptions(objSalaryFormOptions);
        applyDetailState(objSalaryDetail);

        const intSalaryStructureID = objSalaryDetail?.objAssignedStructure?.intSalaryStructureID ?? null;
        if (intSalaryStructureID) {
          const objStructureDetail = await masterApiService.getSalaryStructure(intSalaryStructureID).catch(() => null);
          if (blnMounted) {
            setObjSalaryStructureDetail(objStructureDetail?.Data ?? null);
          }
        }
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(objError instanceof Error ? objError.message : "Unable to load Flexi Pay Declaration.");
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    void loadScreen();
    return () => {
      blnMounted = false;
    };
  }, []);

  const blnHasAssignedStructure = Boolean(objDetail?.objAssignedStructure);
  const blnHasFlexiBasket = Boolean(objDetail?.objFlexiAllocation?.blnHasFlexiBasket);
  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode || "INR";
  const objDeclarationState = objDetail?.objFlexiDeclaration || null;

  const lstDraftRows = useMemo(() => {
    if (!objDetail) return [];
    return buildDraftRows(objDetail, objAnswers).map((objRow) => {
      const strDraftValue = dicDraftInputs[objRow.intSalaryComponentID] ?? "";
      const decDeclaredAnnual = objRow.blnEligible ? toAnnualInputValue(strDraftValue) : 0;
      const decAnnualCap = objRow.decAnnualLimit ?? Number.POSITIVE_INFINITY;
      const decSanitizedAnnual = Math.min(decDeclaredAnnual, decAnnualCap);
      return {
        ...objRow,
        decDeclaredAnnual: decSanitizedAnnual,
        decDeclaredMonthly: decSanitizedAnnual / 12,
      };
    });
  }, [objDetail, objAnswers, dicDraftInputs]);

  const lstSelectedComponentIDs = useMemo(
    () => Array.from(new Set(lstSelectedFlexiRows.map((objRow) => objRow.intSalaryComponentID).filter((intID): intID is number => Number.isFinite(intID)))),
    [lstSelectedFlexiRows]
  );

  const lstActiveDraftRows = useMemo(
    () => lstDraftRows.filter((objRow) => lstSelectedComponentIDs.includes(objRow.intSalaryComponentID)),
    [lstDraftRows, lstSelectedComponentIDs]
  );

  const decFlexiBasketAnnual = Number(objDetail?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
  const decDeclaredFlexiAnnual = useMemo(
    () => lstActiveDraftRows.reduce((decTotal, objRow) => decTotal + objRow.decDeclaredAnnual, 0),
    [lstActiveDraftRows]
  );
  const decRemainingAnnual = Math.max(decFlexiBasketAnnual - decDeclaredFlexiAnnual, 0);
  const decResidualAnnual = decRemainingAnnual;

  const dicComponentSummary = useMemo(
    () => mapCurrentComponentAmounts(objDetail?.lstComponentLines || []),
    [objDetail?.lstComponentLines]
  );

  const decAnnualCtc = Number(objDetail?.objCurrentSalarySnapshot?.decCtcAnnual || 0);
  const decEmployeeContributionAnnual = useMemo(
    () => (objDetail?.lstComponentLines || []).reduce((decTotal, objLine) => {
      const strCategory = normalizeText(objLine.strComponentCategory);
      if (strCategory === "deduction" || strCategory === "recovery") {
        return decTotal + Number(objLine.decAmountAnnual || 0);
      }
      return decTotal;
    }, 0),
    [objDetail?.lstComponentLines]
  );
  const decVariablePayAnnual = decDeclaredFlexiAnnual;
  const decFixedPayAnnual = Math.max(decAnnualCtc - decVariablePayAnnual, 0);

  const lstSalaryBreakdown = useMemo<SalaryBreakdownRow[]>(() => ([
    { strLabel: "Basic", decBeforeAnnual: dicComponentSummary.basic, decAfterAnnual: dicComponentSummary.basic },
    { strLabel: "HRA", decBeforeAnnual: dicComponentSummary.hra, decAfterAnnual: dicComponentSummary.hra },
    { strLabel: "Special / Other Fixed", decBeforeAnnual: dicComponentSummary.special + dicComponentSummary.fixed, decAfterAnnual: dicComponentSummary.special + dicComponentSummary.fixed - decDeclaredFlexiAnnual },
    { strLabel: "Declared Flexi", decBeforeAnnual: dicComponentSummary.flexi, decAfterAnnual: decDeclaredFlexiAnnual },
    { strLabel: "Residual Taxable Allowance", decBeforeAnnual: Number(objDetail?.objFlexiAllocation?.decResidualTaxableAllowanceAnnual || 0), decAfterAnnual: decResidualAnnual },
  ]), [dicComponentSummary, decDeclaredFlexiAnnual, decResidualAnnual, objDetail?.objFlexiAllocation?.decResidualTaxableAllowanceAnnual]);

  const lstImpactMetrics = useMemo<ImpactMetricRow[]>(() => ([
    { strLabel: "Annual CTC", decValue: decAnnualCtc, strColor: "#0f172a" },
    { strLabel: "Fixed Pay", decValue: decFixedPayAnnual, strColor: "#0f172a" },
    { strLabel: "Variable Pay", decValue: decVariablePayAnnual, strColor: decVariablePayAnnual > 0 ? "#0f766e" : "#0f172a" },
    { strLabel: "Flexi Basket", decValue: decFlexiBasketAnnual, strColor: "#0f766e" },
    { strLabel: "Employee Contribution", decValue: decEmployeeContributionAnnual, strColor: "#0f172a" },
  ]), [decAnnualCtc, decEmployeeContributionAnnual, decFixedPayAnnual, decFlexiBasketAnnual, decVariablePayAnnual]);

  const blnAllocationExceeded = decDeclaredFlexiAnnual > decFlexiBasketAnnual;
  const lstStructureFlexiOptions = useMemo(() => {
    const lstEssAvailableComponents = ((objDetail?.objFlexiAllocation as { lstAvailableComponents?: Array<{
      intSalaryComponentID: number;
      strComponentCode?: string | null;
      strComponentName?: string | null;
    }> | undefined } | undefined)?.lstAvailableComponents ?? [])
      .map((objComponent) => ({
        intSalaryComponentID: objComponent.intSalaryComponentID,
        strComponentName: getComponentLabel(objComponent.strComponentName, objComponent.strComponentCode),
      }));

    if (lstEssAvailableComponents.length > 0) {
      return lstEssAvailableComponents;
    }

    const lstDetailComponents = objSalaryStructureDetail?.lstComponents
      ?.flatMap((objComponent) => {
        if (objComponent.lstFlexiMappings?.length) {
          return objComponent.lstFlexiMappings
            .filter((objMapping) => objMapping.blnIsActive !== false)
            .map((objMapping) => ({
              intSalaryComponentID: objMapping.intFlexiComponentID,
              strComponentName: getComponentLabel(objMapping.strFlexiComponentName, objMapping.strFlexiComponentCode),
            }));
        }
        const blnFlexiLine = Boolean(objComponent.strFlexiComponentRole) && !Boolean(objComponent.blnIsFlexiBasketLine);
        return blnFlexiLine
          ? [{
              intSalaryComponentID: objComponent.intSalaryComponentID,
              strComponentName: getComponentLabel(objComponent.strComponentName, objComponent.strComponentCode),
            }]
          : [];
      }) ?? [];

    if (lstDetailComponents.length > 0) {
      return lstDetailComponents;
    }

    const intSalaryStructureID = objDetail?.objAssignedStructure?.intSalaryStructureID ?? null;
    if (!intSalaryStructureID) {
      return [];
    }

    return (
      objFormOptions?.lstSalaryStructures
        .find((dicStructure) => dicStructure.intID === intSalaryStructureID)
        ?.lstComponents?.filter((objComponent) => Boolean(objComponent.blnIsFlexiBenefit) && !Boolean(objComponent.blnIsFlexiBasket))
        .map((objComponent) => ({
          intSalaryComponentID: objComponent.intSalaryComponentID,
          strComponentName: getComponentLabel(objComponent.strComponentName, objComponent.strComponentCode),
        })) ?? []
    );
  }, [objDetail?.objAssignedStructure?.intSalaryStructureID, objDetail?.objFlexiAllocation, objFormOptions, objSalaryStructureDetail]);

  const lstAvailableFlexiOptions = lstStructureFlexiOptions.length > 0
    ? lstStructureFlexiOptions
    : lstDraftRows.map((objRow) => ({
        intSalaryComponentID: objRow.intSalaryComponentID,
        strComponentName: objRow.strComponentName,
      }));
  const intConfiguredFlexiOptionCount = lstAvailableFlexiOptions.length;
  const blnHasAllowedOptions = intConfiguredFlexiOptionCount > 0;
  const blnDeclarationEditable = Boolean(
    objDeclarationState?.blnCanEdit ?? (blnHasAssignedStructure && blnHasFlexiBasket && blnHasAllowedOptions),
  );
  const strDeclarationStatus = objDeclarationState?.strStatus || (blnHasFlexiBasket ? "Draft" : "View Only");
  const strReadOnlyReason =
    objDeclarationState?.strReadOnlyReason ||
    (!blnHasAssignedStructure
      ? "No active salary structure is assigned to this employee."
      : !blnHasFlexiBasket
        ? "No flexi pay is configured in your salary structure."
        : !blnHasAllowedOptions
          ? "No flexi components are configured in the assigned salary structure."
          : "");
  const lstRenderedFlexiRows = lstSelectedFlexiRows
    .map((objSelectedRow) => ({
      objSelectedRow,
      objDraftRow: lstDraftRows.find((objRow) => objRow.intSalaryComponentID === objSelectedRow.intSalaryComponentID) ?? null,
    }))
    .filter((objRow) => objRow.objSelectedRow.intSalaryComponentID == null || objRow.objDraftRow);

  function buildDeclarationPayload() {
    return {
      strFinancialYearCode: objDeclarationState?.strFinancialYearCode || getCurrentFinancialYearCode(),
      strEmployeeRemarks: objDeclarationState?.strEmployeeRemarks || null,
      lstItems: lstRenderedFlexiRows
        .filter((objRow): objRow is { objSelectedRow: FlexiSelectionRow; objDraftRow: FlexiDraftRow } => Boolean(objRow.objDraftRow))
        .map(({ objDraftRow }) => ({
          intSalaryComponentID: objDraftRow.intSalaryComponentID,
          decDeclaredAnnual: objDraftRow.decDeclaredAnnual,
          decDeclaredMonthly: objDraftRow.decDeclaredMonthly,
        })),
      lstAnswers: [
        { strAnswerCode: "HAS_CAR", strAnswerValue: objAnswers.blnHasCar ? "true" : "false" },
        { strAnswerCode: "MEAL_VOUCHER_REQUIRED", strAnswerValue: objAnswers.blnMealVoucherRequired ? "true" : "false" },
        { strAnswerCode: "CHILDREN_COUNT", strAnswerValue: String(objAnswers.intChildrenCount) },
        { strAnswerCode: "HOSTEL_APPLICABLE", strAnswerValue: objAnswers.blnHostelApplicable ? "true" : "false" },
      ],
    };
  }

  function handleAddFlexiRow() {
    if (!blnDeclarationEditable) return;
    setLstSelectedFlexiRows((lstPrev) => [...lstPrev, createSelectionRow(null)]);
  }

  function handleDeleteFlexiRow(strRowID: string) {
    if (!blnDeclarationEditable) return;
    setLstSelectedFlexiRows((lstPrev) => {
      const lstNext = lstPrev.filter((objRow) => objRow.strRowID !== strRowID);
      return lstNext.length > 0 ? lstNext : [createSelectionRow(null)];
    });
  }

  function handleSelectFlexiComponent(strRowID: string, intSalaryComponentID: number) {
    if (!blnDeclarationEditable) return;
    setLstSelectedFlexiRows((lstPrev) =>
      lstPrev.map((objRow) =>
        objRow.strRowID === strRowID ? { ...objRow, intSalaryComponentID } : objRow
      )
    );
  }

  async function handleSaveDraft() {
    if (!objDetail || !blnDeclarationEditable || blnAllocationExceeded) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const objUpdatedDetail = await flexiPayDeclarationService.saveDraft(
        objDetail.objEmployeeSummary.intEmployeeID,
        buildDeclarationPayload(),
      );
      applyDetailState(objUpdatedDetail);
      setStrToast("Flexi declaration draft saved.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save flexi declaration draft.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleSubmitDeclaration() {
    if (!objDetail || !blnDeclarationEditable || blnAllocationExceeded) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const objUpdatedDetail = await flexiPayDeclarationService.submit(
        objDetail.objEmployeeSummary.intEmployeeID,
        buildDeclarationPayload(),
      );
      applyDetailState(objUpdatedDetail);
      setStrToast("Flexi declaration submitted successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to submit flexi declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (strError) {
    return <Alert severity="error">{strError}</Alert>;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.3,
        height: "calc(100vh - 110px)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Paper
        sx={{
          flex: "0 0 auto",
          p: 1.45,
          borderRadius: "12px",
          border: "1px solid #1e3a8a !important",
          background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%) !important",
          boxShadow: "0 6px 16px rgba(11, 47, 99, 0.18)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: "#f8fcff", lineHeight: 1.15 }}>Flexi Pay Declaration</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem", lineHeight: 1.15 }}>
              Eligibility-based declaration with live salary impact
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`FY ${getCurrentFinancialYearCode()}`} sx={{ height: 24, bgcolor: "rgba(255,255,255,0.16)", color: "#fff", fontWeight: 700 }} />
            <Chip size="small" label={strDeclarationStatus} sx={{ height: 24, bgcolor: blnDeclarationEditable ? "#fef3c7" : "#e2e8f0", color: "#0f172a", fontWeight: 800 }} />
          </Stack>
        </Stack>
      </Paper>

      {!blnHasAssignedStructure ? (
        <Alert severity="info">
          No active salary structure is assigned to this employee. Flexi pay declaration cannot be created or edited until salary assignment is available.
        </Alert>
      ) : null}

      {!blnHasFlexiBasket ? (
        <Alert severity="info" icon={<EditOffRoundedIcon fontSize="inherit" />}>
          No flexi pay is configured in your salary structure. You can view your salary breakdown, but add or edit is not available.
        </Alert>
      ) : null}

      {blnHasAssignedStructure && blnHasFlexiBasket && !blnHasAllowedOptions ? (
        <Alert severity="warning">
          No flexi components are currently configured in the assigned salary structure, so the declaration list cannot be populated yet.
        </Alert>
      ) : null}

      {!blnDeclarationEditable && strReadOnlyReason ? (
        <Alert severity="info">{strReadOnlyReason}</Alert>
      ) : null}

      {blnAllocationExceeded ? (
        <Alert severity="error">
          Declared flexi amount exceeds the available flexi basket. Reduce component declarations before submit.
        </Alert>
      ) : null}

      <Paper className={styles.controlsCard} sx={{ p: 1.3, borderRadius: "14px", border: "1px solid #dbe3ef" }}>
        <Box sx={{ display: "grid", gap: 1.35, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
          <Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.71rem", lineHeight: 1.28, mb: 0.28 }}>Employee</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "0.94rem", lineHeight: 1.28 }}>{objEmployeeContext?.strEmployeeName || "Employee"}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.72rem", lineHeight: 1.24, mt: 0.16 }}>{objEmployeeContext?.strEmployeeCode || "-"}</Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.71rem", lineHeight: 1.28, mb: 0.28 }}>Salary Structure</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "0.94rem", lineHeight: 1.28 }}>{objDetail?.objAssignedStructure?.strStructureName || "Not assigned"}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.72rem", lineHeight: 1.24, mt: 0.16 }}>{objDetail?.objAssignedStructure?.strStructureCode || "-"}</Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.71rem", lineHeight: 1.28, mb: 0.28 }}>Effective From</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "0.94rem", lineHeight: 1.28 }}>{formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom || null)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.71rem", lineHeight: 1.28, mb: 0.28 }}>Residual Component</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "0.94rem", lineHeight: 1.28 }}>{objDetail?.objFlexiAllocation?.strResidualComponentName || "Auto calculated"}</Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", pr: 0.9, pb: 1.4 }}>
        <Stack spacing={1.55}>
          <Box
            sx={{
              display: "grid",
              gap: 1.45,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.9fr) minmax(280px, 0.95fr)" },
              alignItems: "start",
            }}
          >
            <Stack spacing={1.45}>
              <Paper className={styles.controlsCard} sx={{ p: 1.15, borderRadius: "14px", border: "1px solid #dbe3ef" }}>
                <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1, fontSize: "0.92rem", lineHeight: 1.22 }}>Eligibility Conditions</Typography>
                <Box sx={{ display: "grid", gap: 1.05, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                  <Paper variant="outlined" sx={{ p: 0.95, borderRadius: "10px", borderColor: "#dbe3ef" }}>
                    <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <DirectionsCarFilledRoundedIcon sx={{ color: "#0f4c81", fontSize: 16 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.81rem", lineHeight: 1.22 }}>Employee has car</Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1.22, mt: 0.14 }}>Enables car-linked flexi</Typography>
                        </Box>
                      </Stack>
                      <Switch size="small" checked={objAnswers.blnHasCar} disabled={!blnDeclarationEditable} onChange={(e) => setObjAnswers((d) => ({ ...d, blnHasCar: e.target.checked }))} />
                    </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 0.95, borderRadius: "10px", borderColor: "#dbe3ef" }}>
                    <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <LunchDiningRoundedIcon sx={{ color: "#0f4c81", fontSize: 16 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.81rem", lineHeight: 1.22 }}>Meal voucher required</Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1.22, mt: 0.14 }}>Controls meal voucher flexi</Typography>
                        </Box>
                      </Stack>
                      <Switch size="small" checked={objAnswers.blnMealVoucherRequired} disabled={!blnDeclarationEditable} onChange={(e) => setObjAnswers((d) => ({ ...d, blnMealVoucherRequired: e.target.checked }))} />
                    </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 0.95, borderRadius: "10px", borderColor: "#dbe3ef" }}>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <FamilyRestroomRoundedIcon sx={{ color: "#0f4c81", fontSize: 16 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, mb: 0.35, fontSize: "0.81rem", lineHeight: 1.22 }}>Dependent children count</Typography>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={String(objAnswers.intChildrenCount)}
                          disabled={!blnDeclarationEditable}
                          onChange={(e) => setObjAnswers((d) => ({ ...d, intChildrenCount: toChildrenCount(e.target.value) }))}
                          inputProps={{ min: 0, max: 20, step: 1 }}
                          sx={{ "& .MuiInputBase-root": { minHeight: 36 }, "& .MuiInputBase-input": { py: 0.62, fontSize: "0.82rem" } }}
                        />
                      </Box>
                    </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 0.95, borderRadius: "10px", borderColor: "#dbe3ef" }}>
                    <Stack direction="row" spacing={0.7} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.81rem", lineHeight: 1.22 }}>Hostel applicable</Typography>
                        <Typography sx={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1.22, mt: 0.14 }}>For eligible dependent cases</Typography>
                      </Box>
                      <Switch size="small" checked={objAnswers.blnHostelApplicable} disabled={!blnDeclarationEditable || objAnswers.intChildrenCount === 0} onChange={(e) => setObjAnswers((d) => ({ ...d, blnHostelApplicable: e.target.checked }))} />
                    </Stack>
                  </Paper>
                </Box>
              </Paper>

              <Paper className={styles.tableCard} sx={{ borderRadius: "14px", overflow: "hidden" }}>
                <Box sx={{ p: 1.18, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.89rem", lineHeight: 1.2 }}>Eligible Flexi Components</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.72rem", lineHeight: 1.28, mt: 0.18 }}>
                        Showing {intConfiguredFlexiOptionCount} component{intConfiguredFlexiOptionCount === 1 ? "" : "s"} configured in the assigned salary structure.
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddRoundedIcon />}
                      sx={{ minHeight: 32, px: 1.15, fontSize: "0.74rem", "& .MuiButton-startIcon": { mr: 0.45 } }}
                      disabled={!blnDeclarationEditable}
                      onClick={handleAddFlexiRow}
                    >
                      Add
                    </Button>
                  </Stack>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.72, fontSize: "0.73rem" }}>Component</TableCell>
                        <TableCell align="right" sx={{ py: 0.72, fontSize: "0.73rem" }}>Monthly Equivalent</TableCell>
                        <TableCell align="right" sx={{ py: 0.72, fontSize: "0.73rem" }}>Declared Annual</TableCell>
                        <TableCell sx={{ py: 0.72, fontSize: "0.73rem" }}>Proof</TableCell>
                        <TableCell sx={{ py: 0.72, fontSize: "0.73rem" }}>Status</TableCell>
                        <TableCell align="center" sx={{ py: 0.72, fontSize: "0.73rem" }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lstRenderedFlexiRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                            No flexi components are available for this employee.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lstRenderedFlexiRows.map(({ objSelectedRow, objDraftRow }) => {
                          const blnDisabled = !blnDeclarationEditable || !objDraftRow?.blnEligible;
                          return (
                            <TableRow key={objSelectedRow.strRowID} sx={{ opacity: objDraftRow && blnDisabled ? 0.62 : 1 }}>
                              <TableCell sx={{ py: 0.75 }}>
                                <Select
                                  size="small"
                                  fullWidth
                                  displayEmpty
                                  value={objSelectedRow.intSalaryComponentID ?? ""}
                                  disabled={!blnDeclarationEditable}
                                  onChange={(e) => handleSelectFlexiComponent(objSelectedRow.strRowID, Number(e.target.value))}
                                  MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                                  sx={{ minWidth: 240, "& .MuiSelect-select": { py: 0.72, fontSize: "0.79rem" } }}
                                >
                                  <MenuItem value="" disabled>Select component</MenuItem>
                                  {lstAvailableFlexiOptions
                                    .filter((objOption) => objOption.intSalaryComponentID === objSelectedRow.intSalaryComponentID || !lstSelectedComponentIDs.includes(objOption.intSalaryComponentID))
                                    .map((objOption) => (
                                      <MenuItem key={objOption.intSalaryComponentID} value={objOption.intSalaryComponentID}>
                                        {objOption.strComponentName}
                                      </MenuItem>
                                    ))}
                                </Select>
                                {objDraftRow ? (
                                  <Typography sx={{ color: "#64748b", fontSize: "0.67rem", lineHeight: 1.22, mt: 0.42 }}>
                                    {objDraftRow.strEligibilityReason}
                                  </Typography>
                                ) : null}
                              </TableCell>
                              <TableCell align="right" sx={{ minWidth: 118, py: 0.75 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={objDraftRow ? String(Math.round(objDraftRow.decDeclaredMonthly || 0)) : ""}
                                  disabled={!objDraftRow || blnDisabled}
                                  onChange={(e) => {
                                    if (!objDraftRow) return;
                                    const decMonthlyValue = toAnnualInputValue(e.target.value);
                                    setDicDraftInputs((dicPrev) => ({
                                      ...dicPrev,
                                      [objDraftRow.intSalaryComponentID]: String(decMonthlyValue * 12),
                                    }));
                                  }}
                                  inputProps={{ min: 0, max: objDraftRow?.decMonthlyLimit ?? undefined }}
                                  sx={{ width: 104, "& .MuiInputBase-root": { minHeight: 32 }, "& .MuiInputBase-input": { py: 0.5, fontSize: "0.77rem" } }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.75, fontSize: "0.77rem" }}>
                                {objDraftRow ? formatCurrency(objDraftRow.decDeclaredAnnual, strCurrencyCode) : "-"}
                              </TableCell>
                              <TableCell sx={{ py: 0.75, fontSize: "0.77rem" }}>{objDraftRow?.blnProofRequired ? "Yes" : "No"}</TableCell>
                              <TableCell sx={{ py: 0.75 }}>
                                {objDraftRow?.decDeclaredAnnual ? (
                                  <Chip size="small" icon={<CheckCircleRoundedIcon />} label="Allocated" color="success" sx={{ height: 20, fontSize: "0.66rem" }} />
                                ) : objDraftRow?.blnEligible ? (
                                  <Chip size="small" label="Pending" sx={{ height: 20, fontSize: "0.66rem" }} />
                                ) : (
                                  <Chip size="small" label={objDraftRow ? "Locked" : "Select"} sx={{ height: 20, fontSize: "0.66rem" }} />
                                )}
                              </TableCell>
                              <TableCell align="center" sx={{ py: 0.75 }}>
                                <IconButton
                                  size="small"
                                  disabled={!blnDeclarationEditable}
                                  onClick={() => handleDeleteFlexiRow(objSelectedRow.strRowID)}
                                  sx={{ color: "#dc2626" }}
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Stack>

            <Paper className={styles.controlsCard} sx={{ p: 1.3, borderRadius: "14px", border: "1px solid #dbe3ef", height: "fit-content" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.15, fontSize: "0.92rem", lineHeight: 1.24 }}>Salary Breakdown Impact</Typography>
              <Stack spacing={1.2}>
                {lstImpactMetrics.map((objMetric) => (
                  <Stack key={objMetric.strLabel} direction="row" justifyContent="space-between" alignItems="center" spacing={1.2}>
                    <Typography sx={{ color: "#334155", fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.4 }}>{objMetric.strLabel}</Typography>
                    <Typography sx={{ fontWeight: 800, color: objMetric.strColor || "#0f172a", fontSize: "0.9rem", lineHeight: 1.28 }}>{formatCurrency(objMetric.decValue, strCurrencyCode)}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Alert severity="info" sx={{ mt: 1.15, py: 0.35, px: 0.65, "& .MuiAlert-icon": { py: 0.4, mr: 0.75 }, "& .MuiAlert-message": { fontSize: "0.72rem", lineHeight: 1.3 } }}>
                Amounts are recalculated in real time based on your declarations. Final impact will be reflected in employee payslip.
              </Alert>
            </Paper>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 1.4,
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              alignItems: "start",
            }}
          >
            <Paper className={styles.tableCard} sx={{ borderRadius: "14px", overflow: "hidden" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.87rem", lineHeight: 1.18 }}>Fixed Salary Components</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.72, fontSize: "0.73rem" }}>Component</TableCell>
                      <TableCell align="right" sx={{ py: 0.72, fontSize: "0.73rem" }}>Annual</TableCell>
                      <TableCell align="right" sx={{ py: 0.72, fontSize: "0.73rem" }}>Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstSalaryBreakdown.slice(0, 3).map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell sx={{ py: 0.72, fontSize: "0.77rem" }}>{objRow.strLabel}</TableCell>
                        <TableCell align="right" sx={{ py: 0.72, fontSize: "0.77rem" }}>{formatCurrency(objRow.decBeforeAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.72, fontSize: "0.77rem" }}>{formatCurrency(objRow.decBeforeAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper className={styles.tableCard} sx={{ borderRadius: "14px", overflow: "hidden" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.87rem", lineHeight: 1.18 }}>Post Declaration Salary Split</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.72, fontSize: "0.73rem" }}>Bucket</TableCell>
                      <TableCell align="right" sx={{ py: 0.72, fontSize: "0.73rem" }}>Annual</TableCell>
                      <TableCell align="right" sx={{ py: 0.72, fontSize: "0.73rem" }}>Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstSalaryBreakdown.map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell sx={{ py: 0.72, fontSize: "0.77rem" }}>{objRow.strLabel}</TableCell>
                        <TableCell align="right" sx={{ py: 0.72, fontSize: "0.77rem" }}>{formatCurrency(objRow.decAfterAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.72, fontSize: "0.77rem" }}>{formatCurrency(objRow.decAfterAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Stack>
      </Box>

      <Paper
        sx={{
          flex: "0 0 auto",
          position: "sticky",
          bottom: 0,
          zIndex: 3,
          borderRadius: "12px",
          border: "1px solid #dbe3ef",
          px: 1.1,
          py: 0.7,
          backgroundColor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 -6px 14px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Stack direction="row" spacing={0.55} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ minHeight: 30, px: 1, fontSize: "0.74rem", "& .MuiButton-startIcon": { mr: 0.5 } }} onClick={() => objRouter.push("/salary/flexi-pay-declarations")}>Back</Button>
          <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} sx={{ minHeight: 30, px: 1, fontSize: "0.74rem", "& .MuiButton-startIcon": { mr: 0.5 } }} disabled={!blnDeclarationEditable || blnSaving} onClick={() => setStrToast("Previous year copy flow is not available yet for flexi declarations.")}>Copy Previous Year</Button>
          <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} sx={{ minHeight: 30, px: 1.1, fontSize: "0.74rem", "& .MuiButton-startIcon": { mr: 0.5 } }} disabled={!blnDeclarationEditable || blnAllocationExceeded || blnSaving} onClick={handleSaveDraft}>{blnSaving ? "Saving..." : "Save Draft"}</Button>
          <Button size="small" variant="contained" color="warning" startIcon={<SendRoundedIcon />} sx={{ minHeight: 30, px: 1.1, fontSize: "0.74rem", "& .MuiButton-startIcon": { mr: 0.5 } }} disabled={!blnDeclarationEditable || blnAllocationExceeded || blnSaving} onClick={handleSubmitDeclaration}>{blnSaving ? "Submitting..." : "Submit"}</Button>
        </Stack>
      </Paper>

      <Snackbar open={Boolean(strToast)} autoHideDuration={3200} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
