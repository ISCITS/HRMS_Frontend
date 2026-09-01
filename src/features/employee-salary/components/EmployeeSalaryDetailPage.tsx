"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import styles from "@/components/master/MasterScreen.module.css";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import {
  hrFlexiDeclarationReviewService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationLineRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import CommonEditModeBanner from "@/Common/components/CommonEditModeBanner";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService, type EmployeeSalaryRevisionPreviewRecord } from "@/features/employee-salary/services/employeeSalaryService";
import { syncCalculatedOverrideRowsFromPreview, usesAutoCalculatedOverrideValue } from "@/features/employee-salary/utils/overrideRecalculation";
import { calculateEmployeeSalaryBaseSummaryMetrics, calculateEmployeeSalaryWageMetrics } from "@/features/employee-salary/utils/employeeSalarySummary";
import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";
import type {
  EmployeeSalaryComponentLine,
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFlexiAllocationFormValue,
  EmployeeSalaryFlexiAllocationSummary,
  EmployeeSalaryFormOptions,
  EmployeeSalaryHistoryRecord,
  EmployeeSalaryOverrideFormValue,
  EmployeeSalaryStructureComponentOption,
  EmployeeSalaryRevisionFormValues
} from "@/features/employee-salary/types";

type EmployeeSalaryDetailPageProps = {
  /** Employee's public identifier from the URL; the numeric id comes from the loaded record. */
  strEmployeeID: string;
  blnRevisionMode?: boolean;
  strReturnTo?: string;
};

type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
};

const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE-SALARY", "EMPLOYEE_SALARIES"];
const lstFlexiDeclarationStatuses = ["submitted", "approved", "locked", "released", "returned", "rejected"];
function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function hasLookupSnapshot(intValue: number | null | undefined) {
  return Number.isInteger(Number(intValue)) && Number(intValue) > 0;
}

function formatCurrency(decValue: number | null | undefined, strCurrencyCode = "INR") {
  if (decValue === null || typeof decValue === "undefined") {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0
  }).format(decValue);
}

function formatCurrencyWithTwoDecimals(decValue: number | null | undefined, strCurrencyCode = "INR") {
  if (decValue === null || typeof decValue === "undefined") {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(decValue);
}

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(strDate));
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateString(strDate: string, intDays: number) {
  const [intYear, intMonth, intDay] = strDate.split("-").map(Number);
  if (!intYear || !intMonth || !intDay) {
    return getTodayDateString();
  }
  const dtValue = new Date(intYear, intMonth - 1, intDay);
  dtValue.setDate(dtValue.getDate() + intDays);
  return [
    dtValue.getFullYear(),
    String(dtValue.getMonth() + 1).padStart(2, "0"),
    String(dtValue.getDate()).padStart(2, "0")
  ].join("-");
}

function getRevisionMinEffectiveDate(objDetail: EmployeeSalaryDetailRecord | null) {
  const strCurrentEffectiveFrom = objDetail?.objAssignedStructure
    ? objDetail.objCurrentSalarySnapshot?.dtEffectiveFrom
    : null;
  return strCurrentEffectiveFrom ? addDaysToDateString(strCurrentEffectiveFrom, 1) : "";
}

const objOverrideValueFieldSx = {
  "& .MuiInputLabel-root": {
    backgroundColor: "#f8fafc",
    px: 0.5,
  },
  "& .MuiInputBase-input::placeholder": {
    color: "#94a3b8",
    opacity: 1,
  },
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#94a3b8",
  },
};

type ComponentGridRow = {
  intEmployeeSalaryComponentID: number;
  strComponentName: string;
  strCategory: string;
  strValueType: string;
  strPayslipSectionSnapshotCode?: string | null;
  strLwpTreatmentSnapshotCode?: string | null;
  strLwpReducedAmountHandlingSnapshotCode?: string | null;
  strAnnual: string;
  strMonthly: string;
  decAnnualSort: number;
  decMonthlySort: number;
  blnIsOverride: boolean;
  strOverride: string;
  strRemarks: string;
  blnIsFlexiBucket: boolean;
  blnIsFlexiReimbursementOption: boolean;
  blnIsNonCtcReimbursement: boolean;
};

type HistoryGridRow = {
  intEmployeeSalaryStructureID: number;
  strStructure: string;
  strEffectiveFrom: string;
  strEffectiveTo: string;
  strGrossMonthly: string;
  strCtcAnnual: string;
  strEffectiveFromSort: string;
  strEffectiveToSort: string;
  decGrossMonthlySort: number;
  decCtcAnnualSort: number;
  blnIsCurrent: boolean;
  strCurrent: string;
  strReason: string;
};

type ComponentDataGridRow = Omit<ComponentGridRow, "strComponentName" | "strOverride"> & {
  strComponentName: ReactNode;
  strOverride: ReactNode;
};

type HistoryDataGridRow = Omit<HistoryGridRow, "strCurrent"> & {
  strCurrent: ReactNode;
};

type FlexiGridRow = {
  intSalaryComponentID: number;
  strComponentName: string;
  strEligibility: string;
  strAnnualCap: string;
  strApprovedDeclaredAnnual: string;
  strMonthlyImpact: string;
  strProofRequired: string;
  strStatus: string;
  strReasonAction: string;
  decAnnualCap: number;
  decMonthlyImpact: number;
  decApprovedDeclaredAnnual: number;
  strStatusCode?: string | null;
};

type RevisionFlexiDataGridRow = {
  intSalaryComponentID: number;
  strComponentName: ReactNode;
  strEligibility: ReactNode;
  strAnnualCap: ReactNode;
  strApprovedDeclaredAnnual: ReactNode;
  strMonthlyImpact: ReactNode;
  strProofRequired: ReactNode;
  strStatus: ReactNode;
  strReasonAction: ReactNode;
};

type RevisionFlexiCompactDataGridRow = {
  intSalaryComponentID: number;
  strComponentName: ReactNode;
  strAnnualCap: ReactNode;
  strMonthlyCap: ReactNode;
  strApprovedDeclaredAnnual: ReactNode;
  strMonthlyImpact: ReactNode;
  strTaxTreatment: ReactNode;
};

type RevisionBreakdownComponentRow = {
  intSalaryComponentID: number;
  strComponentName: string;
  decAnnualAmount: number;
  decMonthlyAmount?: number;
  decPercentOfCtc?: number | null;
};

type SalarySummaryMetrics = {
  decAnnualCtc: number;
  decGrossMonthly: number;
  decGrossMonthlyAfterDeclaration: number;
  decBasicAnnual: number;
  decHraAnnual: number;
  decEmployerContributionAnnual: number;
  decEmployerContributionMonthly: number;
  decEmployeeDeductionsMonthly: number;
  decFlexiBucketAnnual: number;
  decApprovedFlexiAnnual: number;
  decResidualTaxableAnnual: number;
  decResidualTaxableMonthly: number;
  decWageAnnual: number;
  decNonWageAnnual: number;
  decMinimumRequiredWageAnnual: number;
  decDeemedWageShortfallAnnual: number;
  decDeemedWageAnnual: number;
  decWagePercentOfCtc: number;
  blnUsesSubmittedFlexiPreview: boolean;
};

type OverrideSourceLine = {
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName?: string | null;
  strValueSource?: string | null;
  blnAllowManualOverride: boolean;
  decAmountMonthly?: number | null;
  decAmountAnnual?: number | null;
  decFixedAmount?: number | null;
  decFormulaAmount?: number | null;
  decPercentageValue?: number | null;
  decPercentageAmount?: number | null;
  decDefaultAmountMonthly?: number | null;
  decDefaultAmountAnnual?: number | null;
  decDefaultPercentageValue?: number | null;
  strPayslipSectionSnapshotCode?: string | null;
  strLwpTreatmentSnapshotCode?: string | null;
  strLwpReducedAmountHandlingSnapshotCode?: string | null;
};

type ExistingOverrideLine = {
  intSalaryComponentID: number;
  decAmountMonthly?: number | string | null;
  decAmountAnnual?: number | string | null;
  decPercentageValue?: number | string | null;
  decDefaultAmountMonthly?: number | string | null;
  decDefaultAmountAnnual?: number | string | null;
  decDefaultPercentageValue?: number | string | null;
  strRemarks?: string | null;
  blnIsOverride?: boolean;
};

type FlexiSourceLine = {
  intID?: number;
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName?: string | null;
  decAmountMonthly?: number | null;
  decAmountAnnual?: number | null;
  decFixedAmount?: number | null;
  decDefaultAmountMonthly?: number | null;
  decDefaultAmountAnnual?: number | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decAnnualLimitAmount?: number | null;
  decMonthlyLimitAmount?: number | null;
  decReimbursementMaxClaimYearlyLimit?: number | null;
  decReimbursementMaxClaimMonthlyLimit?: number | null;
  decFlexiMaxYearlyAmount?: number | null;
  decFlexiMaxMonthlyAmount?: number | null;
  strTaxTreatment?: string | null;
  blnProofRequired?: boolean;
  blnRequiresBills?: boolean;
  blnIsFlexiBenefit?: boolean;
  IsFlexiBenefit?: boolean;
  blnIsFlexiBasket?: boolean;
  blnIsFlexiBasketLine?: boolean;
  strFlexiComponentRole?: string | null;
};

type DetailWithPayrollLock = EmployeeSalaryDetailRecord & {
  isPayrollLocked?: boolean;
  isCurrentMonthLocked?: boolean;
  payrollProcessed?: boolean;
  blnIsPayrollLocked?: boolean;
  blnIsCurrentMonthLocked?: boolean;
  blnPayrollProcessed?: boolean;
  lockedPayrollMonth?: string | null;
  strLockedPayrollMonth?: string | null;
};

type FlexiAllocationLineWithStatus = EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"][number] & {
  decDeclaredAnnualAmount?: number | string | null;
  decDeclaredMonthlyAmount?: number | string | null;
  decApprovedAnnualAmount?: number | string | null;
  decApprovedMonthlyAmount?: number | string | null;
  decDeclarationApprovedAnnualAmount?: number | string | null;
  decDeclarationApprovedMonthlyAmount?: number | string | null;
  decUtilizedAnnualAmount?: number | string | null;
  strStatus?: string | null;
  strSource?: string | null;
  strRemarks?: string | null;
  strDeclarationItemStatus?: string | null;
  blnIsActive?: boolean | null;
  blnIsAllowedByStructure?: boolean | null;
  blnIsFlexiBenefit?: boolean | null;
  blnIsFlexiReimbursementOption?: boolean | null;
  strFlexiComponentRole?: string | null;
};

type FlexiTotals = {
  decFlexiBucketAvailableAnnual: number;
  decFlexiBucketAvailableMonthly: number;
  decApprovedFlexiAnnual: number;
  decApprovedFlexiMonthly: number;
  decDeclaredFlexiAnnual: number;
  decDeclaredFlexiMonthly: number;
  decUtilizedFlexiAnnual: number;
  decRemainingAnnualBalance: number;
  decResidualMonthlyAmount: number;
};

function formatOptionalDefaultValue(objValue: number | string | null | undefined) {
  if (objValue === null || typeof objValue === "undefined" || objValue === "") {
    return "";
  }
  const decValue = Number(objValue);
  if (!Number.isFinite(decValue)) {
    return "";
  }
  const decNearestInteger = Math.round(decValue);
  if (Math.abs(decValue - decNearestInteger) < 0.05) {
    return String(decNearestInteger);
  }
  const decRoundedValue = Math.round((decValue + Number.EPSILON) * 100) / 100;
  return decRoundedValue.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

function formatOptionalCurrencyValue(objValue: number | null | undefined, strCurrencyCode = "INR") {
  if (objValue === null || typeof objValue === "undefined") {
    return "-";
  }
  return formatCurrency(objValue, strCurrencyCode);
}

function parseOptionalAmount(strValue: string) {
  const strNormalizedValue = strValue.replace(/,/g, "");
  const decValue = Number(strNormalizedValue);
  return strNormalizedValue.trim() && Number.isFinite(decValue) ? decValue : null;
}

function sanitizeDecimalInput(strValue: string) {
  const strDigitsAndDotsOnly = strValue.replace(/[^\d.]/g, "");
  const arrSegments = strDigitsAndDotsOnly.split(".");
  if (arrSegments.length <= 1) {
    return strDigitsAndDotsOnly;
  }
  return `${arrSegments[0]}.${arrSegments.slice(1).join("")}`;
}

function formatAmountInput(decValue: number | null | undefined) {
  if (decValue === null || typeof decValue === "undefined" || !Number.isFinite(decValue)) {
    return "";
  }
  const decNearestInteger = Math.round(decValue);
  if (Math.abs(decValue - decNearestInteger) < 0.05) {
    return String(decNearestInteger);
  }
  const decRoundedValue = Math.round((decValue + Number.EPSILON) * 100) / 100;
  return decRoundedValue.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

function getNumberValue(objValue: number | string | null | undefined) {
  if (objValue === null || typeof objValue === "undefined" || objValue === "") {
    return 0;
  }
  const decValue = typeof objValue === "number" ? objValue : Number(String(objValue).replace(/,/g, ""));
  return Number.isFinite(decValue) ? decValue : 0;
}

function getPreferredFlexiAnnualAmount(dicRow: {
  decDraftApprovedAnnual?: number | null;
  decApprovedAnnual?: number | null;
  decDraftDeclaredAnnual?: number | null;
  decAllocationAnnual?: number | null;
}) {
  const decApprovedAnnual =
    getNumberValue(dicRow.decDraftApprovedAnnual) ||
    getNumberValue(dicRow.decApprovedAnnual);
  if (decApprovedAnnual > 0) {
    return decApprovedAnnual;
  }
  return getNumberValue(dicRow.decDraftDeclaredAnnual) || getNumberValue(dicRow.decAllocationAnnual);
}

function normalizeAmountText(strValue: string) {
  return strValue.replace(/,/g, "");
}

function normalizeAmountTextOrDefault(strValue: string, objDefaultValue: number | string | null | undefined) {
  const strNormalizedValue = normalizeAmountText(strValue);
  return strNormalizedValue.trim() ? strNormalizedValue : normalizeAmountText(formatOptionalDefaultValue(objDefaultValue));
}

function formatPercentValue(decValue: number | null | undefined) {
  return decValue === null || typeof decValue === "undefined" || !Number.isFinite(decValue) ? "" : `(${decValue.toFixed(2)}%)`;
}

function isFlexiPayComponentName(strValue: string) {
  return normalizeSelectToken(strValue) === "flexipay";
}

function isResidualTaxableComponentName(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  return strToken.includes("residualtaxable");
}

function isBasicComponentName(strValue: string) {
  return normalizeSelectToken(strValue).includes("basic");
}

function isHraComponentName(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  return strToken === "hra" || strToken.includes("houserentallowance");
}

function isEmployeePfComponent(dicLine: Pick<EmployeeSalaryComponentLine, "strComponentName" | "strComponentCode" | "strComponentCategory">) {
  const strName = normalizeSelectToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  const strCategory = normalizeSelectToken(dicLine.strComponentCategory ?? "");
  return strName.includes("pf") && !strName.includes("employer") && strCategory.includes("deduction");
}

function isEmployerPfComponent(dicLine: Pick<EmployeeSalaryComponentLine, "strComponentName" | "strComponentCode" | "strComponentCategory">) {
  const strName = normalizeSelectToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  const strCategory = normalizeSelectToken(dicLine.strComponentCategory ?? "");
  return strName.includes("pf") && (strName.includes("employer") || strCategory.includes("employer"));
}

function isEmployerContributionCategory(strCategory: string | null | undefined) {
  return normalizeSelectToken(strCategory ?? "").includes("employer");
}

function isDeductionCategory(strCategory: string | null | undefined) {
  return normalizeSelectToken(strCategory ?? "").includes("deduction");
}

function isInformationCategory(strCategory: string | null | undefined) {
  const strToken = normalizeSelectToken(strCategory ?? "");
  return strToken.includes("information");
}

function isWageComponent(
  dicLine: { intSalaryComponentID?: number | null; blnIsWages?: boolean | null; strComponentCode?: string | null; strComponentName?: string | null },
  dicSalaryComponentByID?: Map<number, SalaryComponentApiRecord>
) {
  if (typeof dicLine.blnIsWages === "boolean") {
    return dicLine.blnIsWages;
  }
  const dicSalaryComponentByIDLookup =
    dicLine.intSalaryComponentID != null
      ? dicSalaryComponentByID?.get(dicLine.intSalaryComponentID)
      : null;
  if (typeof dicSalaryComponentByIDLookup?.blnIsWages === "boolean") {
    return dicSalaryComponentByIDLookup.blnIsWages;
  }
  const strComponentCodeToken = normalizeSelectToken(dicLine.strComponentCode ?? "");
  const strComponentNameToken = normalizeSelectToken(dicLine.strComponentName ?? "");
  if (!strComponentCodeToken && !strComponentNameToken) {
    return false;
  }
  for (const dicSalaryComponent of dicSalaryComponentByID?.values() ?? []) {
    const strMasterCodeToken = normalizeSelectToken(dicSalaryComponent.strComponentCode ?? "");
    const strMasterNameToken = normalizeSelectToken(dicSalaryComponent.strComponentName ?? "");
    if (
      (strComponentCodeToken && strComponentCodeToken === strMasterCodeToken) ||
      (strComponentNameToken && strComponentNameToken === strMasterNameToken)
    ) {
      return Boolean(dicSalaryComponent.blnIsWages);
    }
  }
  return false;
}

function getApprovedFlexiStatus(strStatus: string | null | undefined) {
  const strToken = normalizeSelectToken(strStatus ?? "");
  if (strToken === "approved" || strToken === "locked") return "approved";
  if (strToken === "submitted") return "submitted";
  return "other";
}

function isFlexiDeclarationDisplayComponent(strComponentName?: string | null, strComponentCode?: string | null) {
  return !isFlexiPayComponentName(strComponentName ?? strComponentCode ?? "");
}

function isFlexiBucketLine(dicLine: EmployeeSalaryComponentLine | FlexiSourceLine) {
  const strRole = normalizeSelectToken("strFlexiComponentRole" in dicLine ? dicLine.strFlexiComponentRole ?? "" : "");
  const strName = normalizeSelectToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  return Boolean(
    dicLine.blnIsFlexiBasket ||
    ("blnIsFlexiBasketLine" in dicLine && dicLine.blnIsFlexiBasketLine) ||
    strRole === "basket" ||
    strName === "flexipay" ||
    strName === "flexibucket"
  );
}

function isFlexiBucketAllocationLine(
  dicLine: EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"][number] | FlexiAllocationLineWithStatus,
  objFlexiAllocation?: EmployeeSalaryFlexiAllocationSummary
) {
  const strName = normalizeSelectToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  return Boolean(
    (objFlexiAllocation?.intFlexiBasketComponentID &&
      dicLine.intSalaryComponentID === objFlexiAllocation.intFlexiBasketComponentID) ||
    strName === "flexipay" ||
    strName === "flexibucket"
  );
}

function isFlexiAllocationLine(dicLine: EmployeeSalaryComponentLine | FlexiSourceLine | FlexiAllocationLineWithStatus) {
  const strRole = normalizeSelectToken("strFlexiComponentRole" in dicLine ? dicLine.strFlexiComponentRole ?? "" : "");
  const strCategory = normalizeSelectToken("strComponentCategory" in dicLine ? dicLine.strComponentCategory ?? "" : "");
  const strCode = normalizeSelectToken(dicLine.strComponentCode ?? "");
  return Boolean(
    ("blnIsFlexiReimbursementOption" in dicLine && dicLine.blnIsFlexiReimbursementOption) ||
    dicLine.blnIsFlexiBenefit ||
    strRole === "option" ||
    strRole === "reimbursementoption" ||
    strCategory.includes("reimbursement") ||
    strCode.includes("flexi")
  ) && !("decBalanceAnnual" in dicLine ? false : isFlexiBucketLine(dicLine));
}

function isNonCtcReimbursementLine(dicLine: EmployeeSalaryComponentLine) {
  const strCategory = normalizeSelectToken(dicLine.strComponentCategory ?? "");
  return strCategory.includes("reimbursement") && dicLine.blnIncludedInCtc === false && !isFlexiBucketLine(dicLine);
}

function normalizeFlexiSource(strSource: string | null | undefined) {
  const strToken = normalizeSelectToken(strSource ?? "");
  if (strToken === "hroverride" || strToken === "override") return "HR Override";
  if (strToken === "essdeclaration" || strToken === "declaration") return "ESS Declaration";
  if (strToken === "payrolllock" || strToken === "locked") return "Payroll Lock";
  if (strToken === "imported" || strToken === "import") return "Imported";
  return "Structure Default";
}

function formatTaxRegime(strTaxRegime: string | null | undefined) {
  const strValue = strTaxRegime?.trim() ?? "";
  const strToken = normalizeSelectToken(strValue);
  if (strToken === "old" || strToken === "oldregime") {
    return "Old Regime";
  }
  if (strToken === "new" || strToken === "newregime") {
    return "New Regime";
  }
  return strValue;
}

function formatFlexiDeclarationStatus(strStatus: string | null | undefined) {
  const strValue = String(strStatus || "draft").trim();
  if (!strValue) {
    return "-";
  }
  return strValue
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function getPreferredFlexiDisplayAmount(
  dicLine: FlexiAllocationLineWithStatus,
  strDeclarationStatus: string | null | undefined
) {
  const strStatusType = getApprovedFlexiStatus(strDeclarationStatus);
  const decApprovedAnnual =
    getNumberValue(dicLine.decApprovedAnnualAmount) ||
    getNumberValue(dicLine.decDeclarationApprovedAnnualAmount);
  const decDeclaredAnnual =
    getNumberValue(dicLine.decDeclaredAnnualAmount) ||
    getNumberValue(dicLine.decAllocationAnnual);

  if (strStatusType === "approved") {
    return decApprovedAnnual;
  }
  if (strStatusType === "submitted") {
    return decDeclaredAnnual;
  }
  return 0;
}

function shouldDisplayFlexiDeclarationStatus(
  strStatus: string | null | undefined,
  decPreviewAnnual: number
) {
  const strNormalizedStatus = normalizeSelectToken(strStatus ?? "");
  const strStatusType = getApprovedFlexiStatus(strStatus);
  // Submitted declarations should stay visible after reload even before approval rows exist.
  if (strNormalizedStatus === "submitted") {
    return true;
  }
  return strStatusType === "approved" ? decPreviewAnnual > 0 : false;
}

function formatFlexiApplicableRegime(objLine: FlexiDeclarationLineRecord) {
  return (
    objLine.strEligibilityApplicableRegimeLabel ||
    objLine.strComponentApplicableRegimeLabel ||
    objLine.strEligibilityApplicableRegime ||
    objLine.strComponentApplicableRegime ||
    "-"
  );
}

function formatFlexiEligibilityText(objLine: FlexiDeclarationLineRecord) {
  if (objLine.blnEligible === false) {
    return "Ineligible";
  }
  if (objLine.blnRegimeEligible === false) {
    return "Regime Mismatch";
  }
  return "Eligible";
}

function getFlexiMonthlyCap(dicLine: EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"][number]) {
  const decMonthlyLimit = getNumberValue(dicLine.decMonthlyLimit);
  if (decMonthlyLimit > 0) {
    return decMonthlyLimit;
  }
  const decAnnualLimit = getNumberValue(dicLine.decAnnualLimit);
  return decAnnualLimit > 0 ? decAnnualLimit / 12 : null;
}

function hasEmployeeFlexiAllocation(
  dicLine: EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"][number] | FlexiAllocationLineWithStatus
) {
  const dicLineWithStatus = dicLine as FlexiAllocationLineWithStatus;
  return (
    getNumberValue(dicLine.decAllocationAnnual) > 0 ||
    getNumberValue(dicLine.decAllocationMonthly) > 0 ||
    getNumberValue(dicLineWithStatus.decApprovedAnnualAmount) > 0 ||
    getNumberValue(dicLineWithStatus.decApprovedMonthlyAmount) > 0 ||
    getNumberValue(dicLineWithStatus.decUtilizedAnnualAmount) > 0
  );
}

function getEmployeeFlexiBucketAmounts(objDetail: EmployeeSalaryDetailRecord | null) {
  const objFlexiAllocation = getFlexiAllocationSummary(objDetail);
  const decAnnualAmount =
    getNumberValue(objFlexiAllocation.decFlexiBasketAvailableAnnual) ||
    getNumberValue(objDetail?.objCurrentSalarySnapshot?.decFlexiBasketAnnualAmount) ||
    getNumberValue(objFlexiAllocation.decBalanceFlexiAnnual) + getNumberValue(objFlexiAllocation.decAllocatedFlexiAnnual) ||
    getNumberValue(objDetail?.objCurrentSalarySnapshot?.decFlexiBalanceAnnualAmount) + getNumberValue(objDetail?.objCurrentSalarySnapshot?.decFlexiAllocatedAnnualAmount);
  const decMonthlyAmount =
    getNumberValue(objFlexiAllocation.decFlexiBasketAvailableMonthly) ||
    (decAnnualAmount > 0 ? decAnnualAmount / 12 : 0);

  return {
    decAnnualAmount,
    decMonthlyAmount
  };
}

function calculateFlexiTotals(objFlexiAllocation: EmployeeSalaryFlexiAllocationSummary): FlexiTotals {
  const decFlexiBucketAvailableAnnual =
    getNumberValue(objFlexiAllocation.decFlexiBasketAvailableAnnual) ||
    getNumberValue(objFlexiAllocation.decBalanceFlexiAnnual) + getNumberValue(objFlexiAllocation.decAllocatedFlexiAnnual);
  const decFlexiBucketAvailableMonthly =
    getNumberValue(objFlexiAllocation.decFlexiBasketAvailableMonthly) ||
    decFlexiBucketAvailableAnnual / 12;
  const decApprovedFlexiAnnual = objFlexiAllocation.lstAllocationLines.reduce(
    (decTotal, dicLine) => decTotal + (getNumberValue((dicLine as FlexiAllocationLineWithStatus).decApprovedAnnualAmount) || getNumberValue(dicLine.decAllocationAnnual)),
    0
  );
  const decApprovedFlexiMonthly = objFlexiAllocation.lstAllocationLines.reduce(
    (decTotal, dicLine) => decTotal + (getNumberValue((dicLine as FlexiAllocationLineWithStatus).decApprovedMonthlyAmount) || getNumberValue(dicLine.decAllocationMonthly)),
    0
  );
  const decDeclaredFlexiAnnual = objFlexiAllocation.lstAllocationLines.reduce(
    (decTotal, dicLine) => decTotal + getNumberValue(dicLine.decAllocationAnnual),
    0
  );
  const decDeclaredFlexiMonthly = objFlexiAllocation.lstAllocationLines.reduce(
    (decTotal, dicLine) => decTotal + getNumberValue(dicLine.decAllocationMonthly),
    0
  );
  const decUtilizedFlexiAnnual = objFlexiAllocation.lstAllocationLines.reduce(
    (decTotal, dicLine) => decTotal + getNumberValue((dicLine as FlexiAllocationLineWithStatus).decUtilizedAnnualAmount),
    0
  );
  const decRemainingAnnualBalance =
    typeof objFlexiAllocation.decBalanceFlexiAnnual === "number"
      ? objFlexiAllocation.decBalanceFlexiAnnual
      : decFlexiBucketAvailableAnnual - decApprovedFlexiAnnual;

  return {
    decFlexiBucketAvailableAnnual,
    decFlexiBucketAvailableMonthly,
    decApprovedFlexiAnnual,
    decApprovedFlexiMonthly,
    decDeclaredFlexiAnnual,
    decDeclaredFlexiMonthly,
    decUtilizedFlexiAnnual,
    decRemainingAnnualBalance,
    decResidualMonthlyAmount: decRemainingAnnualBalance / 12
  };
}

function calculateSalarySummaryMetrics(
  objDetail: EmployeeSalaryDetailRecord | null,
  dicFlexiTotals: FlexiTotals,
  lstFlexiRows: FlexiGridRow[],
  dicSalaryComponentByID: Map<number, SalaryComponentApiRecord>
): SalarySummaryMetrics {
  const dicBaseSummaryMetrics = calculateEmployeeSalaryBaseSummaryMetrics(objDetail);
  const lstComponentLines = objDetail?.lstComponentLines ?? [];
  const decFlexiBucketAnnual = dicBaseSummaryMetrics.decFlexiBucketAnnual;
  const strDeclarationStatus = objDetail?.objFlexiDeclaration?.strStatus ?? null;
  const strFlexiStatusType = getApprovedFlexiStatus(strDeclarationStatus);
  const lstApprovedFlexiRows = lstFlexiRows.filter((dicRow) => dicRow.decApprovedDeclaredAnnual > 0);
  const decApprovedFlexiAnnual = lstApprovedFlexiRows.reduce((decTotal, dicRow) => decTotal + dicRow.decApprovedDeclaredAnnual, 0);
  const decResidualTaxableAnnual = Math.max(decFlexiBucketAnnual - decApprovedFlexiAnnual, 0);
  const decEmployeeDeductionsMonthly = lstComponentLines.reduce((decTotal, dicLine) => {
    if (!isDeductionCategory(dicLine.strComponentCategory) && !isEmployeePfComponent(dicLine)) {
      return decTotal;
    }
    return decTotal + getNumberValue(dicLine.decAmountMonthly);
  }, 0);
  const decAnnualCtc = dicBaseSummaryMetrics.decAnnualCtc;
  const dicWageMetrics = calculateEmployeeSalaryWageMetrics(
    lstComponentLines
      .filter((dicLine) => !isFlexiAllocationLine(dicLine) && dicLine.blnIncludedInCtc !== false)
      .map((dicLine) => ({
        blnIsWages: isWageComponent(dicLine, dicSalaryComponentByID),
        blnIncludedInCtc: dicLine.blnIncludedInCtc,
        decAmountAnnual: getNumberValue(dicLine.decAmountAnnual ?? (getNumberValue(dicLine.decAmountMonthly) * 12)),
      })),
    decAnnualCtc
  );
  return {
    decGrossMonthly: dicBaseSummaryMetrics.decGrossMonthly,
    decGrossMonthlyAfterDeclaration: Math.max(
      dicBaseSummaryMetrics.decGrossMonthly - (decApprovedFlexiAnnual / 12),
      0
    ),
    decAnnualCtc,
    decBasicAnnual: dicBaseSummaryMetrics.decBasicAnnual,
    decHraAnnual: dicBaseSummaryMetrics.decHraAnnual,
    decEmployerContributionAnnual: dicBaseSummaryMetrics.decEmployerContributionAnnual,
    decEmployerContributionMonthly: dicBaseSummaryMetrics.decEmployerContributionAnnual / 12,
    decEmployeeDeductionsMonthly,
    decFlexiBucketAnnual,
    decApprovedFlexiAnnual,
    decResidualTaxableAnnual,
    decResidualTaxableMonthly: decResidualTaxableAnnual / 12,
    ...dicWageMetrics,
    blnUsesSubmittedFlexiPreview: decFlexiBucketAnnual > 0 && strFlexiStatusType === "submitted"
  };
}

function calculateRevisionSalarySummaryMetrics(
  lstStructureComponents: EmployeeSalaryStructureComponentOption[],
  dicRevisionForm: EmployeeSalaryRevisionFormValues,
  dicSalaryComponentByID: Map<number, SalaryComponentApiRecord>,
  mapPreviewComponentByID?: Map<number, EmployeeSalaryRevisionPreviewRecord["lstComponentLines"][number]>
): SalarySummaryMetrics {
  const setFlexiAllocationComponentIDs = new Set(
    dicRevisionForm.lstFlexiAllocations
      .filter((dicAllocation) => getNumberValue(dicAllocation.decAllocationAnnual) > 0 || getNumberValue(dicAllocation.decAllocationMonthly) > 0)
      .map((dicAllocation) => dicAllocation.intSalaryComponentID)
  );
  const mapOverridesByComponentID = new Map(
    dicRevisionForm.lstOverrides.map((dicOverride) => [dicOverride.intSalaryComponentID, dicOverride])
  );
  const decFlexiBucketAnnual = dicRevisionForm.lstOverrides.reduce((decTotal, dicOverride) => (
    isFlexiPayComponentName(dicOverride.strComponentName) ? decTotal + getOverrideAnnualAmount(dicOverride) : decTotal
  ), 0);
  const decApprovedFlexiAnnual = dicRevisionForm.lstFlexiAllocations.reduce((decTotal, dicAllocation) => {
    const decAnnual = parseOptionalAmount(dicAllocation.decAllocationAnnual);
    if (decAnnual !== null) {
      return decTotal + decAnnual;
    }
    const decMonthly = parseOptionalAmount(dicAllocation.decAllocationMonthly);
    return decTotal + (decMonthly !== null ? decMonthly * 12 : 0);
  }, 0);
  const decResidualTaxableAnnual = Math.max(decFlexiBucketAnnual - decApprovedFlexiAnnual, 0);
  const lstResolvedComponentLines = lstStructureComponents.map((dicComponent) => {
    const dicOverride = mapOverridesByComponentID.get(dicComponent.intSalaryComponentID);
    const decAnnualAmount = dicOverride
      ? getOverrideAnnualAmount(dicOverride)
      : getNumberValue(dicComponent.decAmountAnnual ?? (getNumberValue(dicComponent.decAmountMonthly) * 12));
    const decMonthlyAmount = dicOverride
      ? (parseOptionalAmount(dicOverride.decAmountMonthly) ?? (decAnnualAmount / 12))
      : getNumberValue(dicComponent.decAmountMonthly ?? (decAnnualAmount / 12));
    const dicPreviewComponent = mapPreviewComponentByID?.get(dicComponent.intSalaryComponentID);
    return {
      ...dicComponent,
      blnIsWages: dicPreviewComponent?.blnIsWages ?? dicComponent.blnIsWages,
      strComponentCode: dicPreviewComponent?.strComponentCode ?? dicComponent.strComponentCode,
      strComponentName: dicPreviewComponent?.strComponentName ?? dicComponent.strComponentName,
      decAmountAnnual: decAnnualAmount,
      decAmountMonthly: decMonthlyAmount,
      blnIsFlexiBenefit:
        setFlexiAllocationComponentIDs.has(dicComponent.intSalaryComponentID) ||
        Boolean(dicComponent.blnIsFlexiBenefit || hasLookupSnapshot(dicComponent.intReimbursementTypeSnapshotID)),
    };
  });
  const dicBaseSummaryMetrics = calculateEmployeeSalaryBaseSummaryMetrics({
    lstComponentLines: lstResolvedComponentLines,
    objFlexiAllocation: {
      blnHasFlexiBasket: decFlexiBucketAnnual > 0,
      decFlexiBasketAvailableAnnual: decFlexiBucketAnnual,
      decFlexiBasketAvailableMonthly: decFlexiBucketAnnual / 12,
      decBalanceFlexiAnnual: decFlexiBucketAnnual,
      decAllocatedFlexiAnnual: 0,
    },
  });
  const decEmployeeDeductionsMonthly = lstResolvedComponentLines.reduce((decTotal, dicLine) => {
    if (!isDeductionCategory(dicLine.strComponentCategory) && !isEmployeePfComponent(dicLine)) {
      return decTotal;
    }
    return decTotal + getNumberValue(dicLine.decAmountMonthly);
  }, 0);
  const dicWageMetrics = calculateEmployeeSalaryWageMetrics(
    lstResolvedComponentLines
      .filter((dicLine) => !isFlexiAllocationLine(dicLine) && dicLine.blnIncludedInCtc !== false)
      .map((dicLine) => ({
        blnIsWages: isWageComponent(dicLine, dicSalaryComponentByID),
        blnIncludedInCtc: dicLine.blnIncludedInCtc,
        decAmountAnnual: getNumberValue(dicLine.decAmountAnnual ?? (getNumberValue(dicLine.decAmountMonthly) * 12)),
      })),
    dicBaseSummaryMetrics.decAnnualCtc
  );

  return {
    decAnnualCtc: dicBaseSummaryMetrics.decAnnualCtc,
    decGrossMonthly: dicBaseSummaryMetrics.decGrossMonthly,
    decGrossMonthlyAfterDeclaration: Math.max(dicBaseSummaryMetrics.decGrossMonthly - (decApprovedFlexiAnnual / 12), 0),
    decBasicAnnual: dicBaseSummaryMetrics.decBasicAnnual,
    decHraAnnual: dicBaseSummaryMetrics.decHraAnnual,
    decEmployerContributionAnnual: dicBaseSummaryMetrics.decEmployerContributionAnnual,
    decEmployerContributionMonthly: dicBaseSummaryMetrics.decEmployerContributionAnnual / 12,
    decEmployeeDeductionsMonthly,
    decFlexiBucketAnnual,
    decApprovedFlexiAnnual,
    decResidualTaxableAnnual,
    decResidualTaxableMonthly: decResidualTaxableAnnual / 12,
    ...dicWageMetrics,
    blnUsesSubmittedFlexiPreview: decFlexiBucketAnnual > 0 && decApprovedFlexiAnnual > 0
  };
}

function getHistorySalaryDisplayAmounts(dicRow: EmployeeSalaryHistoryRecord) {
  const decFlexiBasketAnnual =
    getNumberValue(dicRow.decFlexiBasketAnnualAmount) ||
    (getNumberValue(dicRow.decFlexiBalanceAnnualAmount) + getNumberValue(dicRow.decFlexiAllocatedAnnualAmount));

  return {
    decGrossMonthly: getNumberValue(dicRow.decGrossMonthly),
    decCtcAnnual: getNumberValue(dicRow.decCtcAnnual) + decFlexiBasketAnnual
  };
}

function getPayrollLockMessage(objDetail: EmployeeSalaryDetailRecord | null) {
  const dicDetail = objDetail as DetailWithPayrollLock | null;
  const blnLocked = Boolean(
    dicDetail?.isPayrollLocked ||
    dicDetail?.isCurrentMonthLocked ||
    dicDetail?.payrollProcessed ||
    dicDetail?.blnIsPayrollLocked ||
    dicDetail?.blnIsCurrentMonthLocked ||
    dicDetail?.blnPayrollProcessed
  );
  if (!blnLocked) {
    return "";
  }
  const strLockedMonth = dicDetail?.lockedPayrollMonth ?? dicDetail?.strLockedPayrollMonth;
  return strLockedMonth
    ? `Payroll for ${strLockedMonth} is processed or locked. Approved allocations and HR overrides cannot be changed for this month.`
    : "Payroll for the current month is processed or locked. Approved allocations and HR overrides cannot be changed for this month.";
}

function getValidationMessages(
  objFlexiAllocation: EmployeeSalaryFlexiAllocationSummary,
  dicFlexiTotals: FlexiTotals,
  lstComponentLines: EmployeeSalaryComponentLine[]
) {
  const lstMessages: string[] = [];
  const blnHasFlexiBucket = dicFlexiTotals.decFlexiBucketAvailableAnnual > 0;
  const blnHasFlexiAllocations = objFlexiAllocation.lstAllocationLines.some(
    (dicLine) => !isFlexiBucketAllocationLine(dicLine, objFlexiAllocation)
  );
  if (!blnHasFlexiBucket && blnHasFlexiAllocations) {
    lstMessages.push("Flexi allocation cannot exist without Flexi Bucket amount.");
  }
  if (dicFlexiTotals.decDeclaredFlexiAnnual - dicFlexiTotals.decFlexiBucketAvailableAnnual > 0.01) {
    lstMessages.push("Total allocated annual amount exceeds Flexi Bucket annual amount.");
  }
  if (dicFlexiTotals.decDeclaredFlexiMonthly - dicFlexiTotals.decFlexiBucketAvailableMonthly > 0.01) {
    lstMessages.push("Total allocated monthly amount exceeds Flexi Bucket monthly amount.");
  }
  if (dicFlexiTotals.decRemainingAnnualBalance < -0.01) {
    lstMessages.push("Residual amount is negative.");
  }
  objFlexiAllocation.lstAllocationLines.forEach((dicLine) => {
    if (isFlexiBucketAllocationLine(dicLine, objFlexiAllocation)) {
      return;
    }
    const dicAllocationLine = dicLine as FlexiAllocationLineWithStatus;
    const strComponentName = dicLine.strComponentName ?? dicLine.strComponentCode ?? "Flexi component";
    if (getNumberValue(dicLine.decAllocationAnnual) - getNumberValue(dicLine.decAnnualLimit) > 0.01) {
      lstMessages.push(`${strComponentName} allocation exceeds annual component cap.`);
    }
    if (getNumberValue(dicLine.decAllocationMonthly) - getNumberValue(getFlexiMonthlyCap(dicLine)) > 0.01) {
      lstMessages.push(`${strComponentName} allocation exceeds monthly component cap.`);
    }
    if (dicAllocationLine.blnIsActive === false) {
      lstMessages.push(`${strComponentName} is inactive.`);
    }
    if (dicAllocationLine.blnIsAllowedByStructure === false) {
      lstMessages.push(`${strComponentName} is not allowed by the assigned salary structure.`);
    }
    if (dicAllocationLine.blnIsFlexiBenefit === false && dicAllocationLine.blnIsFlexiReimbursementOption === false) {
      lstMessages.push(`${strComponentName} is not a Flexi Reimbursement/Option.`);
    }
  });
  lstComponentLines.forEach((dicLine) => {
    if (isNonCtcReimbursementLine(dicLine)) {
      lstMessages.push(`${dicLine.strComponentName ?? dicLine.strComponentCode ?? "Component"} is a Non-CTC reimbursement component and should not exist in employee salary component lines.`);
    }
  });
  return Array.from(new Set(lstMessages));
}

function getOverrideAnnualAmount(dicOverride: EmployeeSalaryOverrideFormValue | undefined) {
  if (!dicOverride) {
    return 0;
  }
  const decAnnual = parseOptionalAmount(dicOverride.decAmountAnnual);
  if (decAnnual !== null) {
    return decAnnual;
  }
  const decMonthly = parseOptionalAmount(dicOverride.decAmountMonthly);
  if (decMonthly !== null) {
    return decMonthly * 12;
  }
  const decDefaultAnnual = parseOptionalAmount(dicOverride.strDefaultAnnual);
  if (decDefaultAnnual !== null) {
    return decDefaultAnnual;
  }
  const decDefaultMonthly = parseOptionalAmount(dicOverride.strDefaultMonthly);
  return decDefaultMonthly !== null ? decDefaultMonthly * 12 : 0;
}

function getFlexiAllocationSummary(
  objDetail: EmployeeSalaryDetailRecord | null
): EmployeeSalaryFlexiAllocationSummary {
  return objDetail?.objFlexiAllocation ?? { blnHasFlexiBasket: false, lstAllocationLines: [] };
}

function buildOverrideRows(
  lstSourceLines: OverrideSourceLine[],
  lstExistingOverrides: ExistingOverrideLine[] = [],
  objFlexiAllocation?: EmployeeSalaryFlexiAllocationSummary | null,
  dicSalaryComponentByID?: Map<number, SalaryComponentApiRecord>,
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryOverrideFormValue[] {
  const dicCurrentLineByComponentID = new Map(
    lstExistingOverrides.map((dicLine) => [dicLine.intSalaryComponentID, dicLine])
  );
  const dicExistingOverrideByComponentID = new Map(
    lstExistingOverrides
      .filter((dicOverride) => dicOverride.blnIsOverride !== false)
      .map((dicOverride) => [dicOverride.intSalaryComponentID, dicOverride])
  );
  const dicCurrentLineByComponent = new Map(
    lstExistingOverrides.map((dicLine) => [dicLine.intSalaryComponentID, dicLine])
  );

  return lstSourceLines.map((dicLine) => {
    const dicCurrentLine = dicCurrentLineByComponentID.get(dicLine.intSalaryComponentID);
    const dicExistingOverride = dicExistingOverrideByComponentID.get(dicLine.intSalaryComponentID);
    const dicReferenceLine = dicCurrentLineByComponent.get(dicLine.intSalaryComponentID) as (EmployeeSalaryComponentLine | ExistingOverrideLine | undefined);
    const dicSalaryComponent = dicSalaryComponentByID?.get(dicLine.intSalaryComponentID);
    const dicReusableOverride = dicLine.blnAllowManualOverride ? dicExistingOverride : null;
    const blnIsFlexiPayLine = isFlexiPayComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
    const strValueSource = String(dicLine.strValueSource ?? "").trim().toLowerCase();
    const decStoredDefaultMonthly =
      strValueSource.includes("formula")
        ? dicLine.decFormulaAmount
        : strValueSource.includes("percent")
          ? dicLine.decPercentageAmount
          : null;
    const decResolvedDefaultMonthly =
      decStoredDefaultMonthly ??
      dicLine.decDefaultAmountMonthly ??
      dicLine.decAmountMonthly ??
      dicCurrentLine?.decDefaultAmountMonthly ??
      dicCurrentLine?.decAmountMonthly ??
      (dicLine.decDefaultAmountAnnual != null
        ? Number(dicLine.decDefaultAmountAnnual) / 12
        : dicLine.decAmountAnnual != null
          ? Number(dicLine.decAmountAnnual) / 12
          : dicCurrentLine?.decDefaultAmountAnnual != null
            ? Number(dicCurrentLine.decDefaultAmountAnnual) / 12
          : dicCurrentLine?.decAmountAnnual != null
              ? Number(dicCurrentLine.decAmountAnnual) / 12
          : dicLine.decFixedAmount);
    const decResolvedDefaultAnnual =
      decResolvedDefaultMonthly != null ? Number(decResolvedDefaultMonthly) * 12 : null;
    const decDefaultMonthly =
      blnIsFlexiPayLine && getNumberValue(objFlexiAllocation?.decFlexiBasketAvailableMonthly) > 0
        ? getNumberValue(objFlexiAllocation?.decFlexiBasketAvailableMonthly)
        : decResolvedDefaultMonthly;
    const decDefaultAnnual =
      decDefaultMonthly != null ? Number(decDefaultMonthly) * 12 : decResolvedDefaultAnnual;
    const strDefaultMonthly = formatOptionalDefaultValue(
      decDefaultMonthly
    );
    const strDefaultAnnual = formatOptionalDefaultValue(
      decDefaultAnnual
    );
    const strDefaultPercentage = formatOptionalDefaultValue(
      dicLine.decDefaultPercentageValue ??
      dicLine.decPercentageValue ??
      dicCurrentLine?.decDefaultPercentageValue ??
      dicCurrentLine?.decPercentageValue
    );
    const decInputMonthly =
      blnIsFlexiPayLine && getNumberValue(dicReusableOverride?.decAmountMonthly) <= 0
        ? decDefaultMonthly
        : dicReusableOverride?.decAmountMonthly ?? decDefaultMonthly;
    const decInputAnnual =
      blnIsFlexiPayLine && getNumberValue(dicReusableOverride?.decAmountAnnual) <= 0
        ? decDefaultAnnual
        : dicReusableOverride?.decAmountAnnual ?? decDefaultAnnual;
    const strExplicitBasisComponentName =
      "strBasisComponentName" in dicLine && typeof dicLine.strBasisComponentName === "string"
        ? dicLine.strBasisComponentName
        : "";
    const intLineBasisComponentID =
      "intBasisComponentID" in dicLine && typeof dicLine.intBasisComponentID === "number"
        ? dicLine.intBasisComponentID
        : null;
    const intResolvedBasisComponentID =
      intLineBasisComponentID ??
      ("intBasisComponentID" in (dicReferenceLine ?? {}) && typeof (dicReferenceLine as EmployeeSalaryComponentLine).intBasisComponentID === "number"
        ? (dicReferenceLine as EmployeeSalaryComponentLine).intBasisComponentID
        : null) ??
      dicSalaryComponent?.intDefaultBasisComponentID ??
      null;
    const strResolvedBasisComponentName =
      strExplicitBasisComponentName ||
      (intResolvedBasisComponentID
        ? (dicSalaryComponentByID?.get(intResolvedBasisComponentID)?.strComponentName ??
          dicSalaryComponentByID?.get(intResolvedBasisComponentID)?.strComponentCode ??
          "")
        : "") ||
      "";
    return {
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentName:
        dicLine.strComponentName ??
        dicLine.strComponentCode ??
        `${fnTranslate?.("employee_salary_component", "Component") ?? "Component"} ${dicLine.intSalaryComponentID}`,
      blnAllowManualOverride: dicLine.blnAllowManualOverride,
      strValueSource: dicLine.strValueSource ?? "",
      strFormulaExpression:
        "strFormulaExpression" in dicLine && typeof dicLine.strFormulaExpression === "string"
          ? dicLine.strFormulaExpression
          : dicSalaryComponent?.strFormulaExpression ?? "",
      strBasisComponentName: strResolvedBasisComponentName,
      strPayslipSectionSnapshotCode: dicLine.strPayslipSectionSnapshotCode,
      strLwpTreatmentSnapshotCode: dicLine.strLwpTreatmentSnapshotCode,
      strLwpReducedAmountHandlingSnapshotCode: dicLine.strLwpReducedAmountHandlingSnapshotCode,
      decAmountMonthly: formatOptionalDefaultValue(decInputMonthly),
      decAmountAnnual: formatOptionalDefaultValue(decInputAnnual),
      decPercentageValue: formatOptionalDefaultValue(
        dicReusableOverride?.decPercentageValue ??
        dicLine.decDefaultPercentageValue ??
        dicLine.decPercentageValue ??
        dicCurrentLine?.decDefaultPercentageValue ??
        dicCurrentLine?.decPercentageValue ??
        dicSalaryComponent?.decDefaultPercentageValue
      ),
      strDefaultMonthly,
      strDefaultAnnual,
      strDefaultPercentage,
      strRemarks: dicReusableOverride?.strRemarks ?? ""
    };
  });
}

function buildFlexiAllocationRows(
  lstSourceLines: FlexiSourceLine[],
  lstExistingAllocations: EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"] = [],
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryFlexiAllocationFormValue[] {
  const mapExistingAllocationByComponentID = new Map(
    lstExistingAllocations.map((dicLine) => [dicLine.intSalaryComponentID, dicLine as FlexiAllocationLineWithStatus])
  );
  return lstSourceLines.map((dicLine) => {
    const dicExistingAllocation = mapExistingAllocationByComponentID.get(dicLine.intSalaryComponentID);
    const decAnnualLimit =
      dicLine.decAnnualLimit ??
      dicExistingAllocation?.decAnnualLimit ??
      dicLine.decFlexiMaxYearlyAmount ??
      dicLine.decAnnualLimitAmount ??
      dicLine.decReimbursementMaxClaimYearlyLimit ??
      null;
    const decMonthlyLimit =
      dicLine.decMonthlyLimit ??
      dicExistingAllocation?.decMonthlyLimit ??
      dicLine.decFlexiMaxMonthlyAmount ??
      dicLine.decMonthlyLimitAmount ??
      dicLine.decReimbursementMaxClaimMonthlyLimit ??
      (decAnnualLimit != null ? decAnnualLimit / 12 : null);
    const decApprovedAnnual =
      getNumberValue(dicExistingAllocation?.decApprovedAnnualAmount) ||
      getNumberValue(dicExistingAllocation?.decDeclarationApprovedAnnualAmount);
    const decDeclaredAnnual =
      getNumberValue(dicExistingAllocation?.decDeclaredAnnualAmount) ||
      getNumberValue(dicExistingAllocation?.decAllocationAnnual);
    const decDisplayAnnual = decApprovedAnnual > 0 ? decApprovedAnnual : decDeclaredAnnual;
    const strStatus = formatFlexiDeclarationStatus(dicExistingAllocation?.strStatus ?? dicExistingAllocation?.strDeclarationItemStatus ?? "Not Declared");
    return {
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentName:
        dicLine.strComponentName ??
        dicLine.strComponentCode ??
        `${fnTranslate?.("employee_salary_component", "Component") ?? "Component"} ${dicLine.intSalaryComponentID}`,
      strComponentCode: dicLine.strComponentCode ?? "",
      strTaxTreatment: dicLine.strTaxTreatment ?? "",
      blnProofRequired: Boolean(dicLine.blnProofRequired),
      decAnnualLimit,
      decMonthlyLimit,
      decAllocationMonthly: decDisplayAnnual > 0 ? formatOptionalDefaultValue(decDisplayAnnual / 12) : "",
      decAllocationAnnual: decDisplayAnnual > 0 ? formatOptionalDefaultValue(decDisplayAnnual) : "",
      strStatus,
      strReasonAction: dicExistingAllocation?.strRemarks ?? normalizeFlexiSource(dicExistingAllocation?.strSource ?? "Structure Default")
    };
  });
}

function getFlexiBenefitAllocationLines(lstSourceLines: FlexiSourceLine[]) {
  return lstSourceLines.filter((dicLine) =>
    (dicLine.blnIsFlexiBenefit === true || dicLine.IsFlexiBenefit === true) &&
    !dicLine.blnIsFlexiBasket &&
    !dicLine.blnIsFlexiBasketLine &&
    dicLine.strFlexiComponentRole !== "basket" &&
    normalizeSelectToken(dicLine.strComponentCode ?? "") !== "flexipay"
  );
}

function buildSalaryComponentMap(lstSalaryComponents: SalaryComponentApiRecord[] = []) {
  return new Map(lstSalaryComponents.map((dicComponent) => [dicComponent.intID, dicComponent]));
}

function mergeFlexiMetadata(
  dicLine: FlexiSourceLine,
  dicSalaryComponentByID: Map<number, SalaryComponentApiRecord>
): FlexiSourceLine {
  const dicComponent = dicSalaryComponentByID.get(dicLine.intSalaryComponentID);
  if (!dicComponent) {
    return dicLine;
  }
  return {
    ...dicLine,
    strComponentCode: dicLine.strComponentCode ?? dicComponent.strComponentCode,
    strComponentName: dicLine.strComponentName ?? dicComponent.strComponentName,
    strTaxTreatment: dicLine.strTaxTreatment ?? dicComponent.strTaxTreatment,
    blnProofRequired: dicLine.blnProofRequired ?? dicLine.blnRequiresBills ?? dicComponent.blnRequiresBills,
    blnRequiresBills: dicLine.blnRequiresBills ?? dicComponent.blnRequiresBills,
    blnIsFlexiBenefit: dicLine.blnIsFlexiBenefit ?? dicComponent.blnIsFlexiBenefit,
    decAnnualLimitAmount: dicLine.decAnnualLimitAmount ?? dicComponent.decAnnualLimitAmount,
    decMonthlyLimitAmount: dicLine.decMonthlyLimitAmount ?? dicComponent.decMonthlyLimitAmount,
    decReimbursementMaxClaimYearlyLimit: dicLine.decReimbursementMaxClaimYearlyLimit ?? dicComponent.decReimbursementMaxClaimYearlyLimit,
    decReimbursementMaxClaimMonthlyLimit: dicLine.decReimbursementMaxClaimMonthlyLimit ?? dicComponent.decReimbursementMaxClaimMonthlyLimit
  };
}

function buildFlexiSourceFromSalaryComponents(lstSalaryComponents: SalaryComponentApiRecord[] = []): FlexiSourceLine[] {
  return lstSalaryComponents.map((dicComponent) => ({
    intID: dicComponent.intID,
    intSalaryComponentID: dicComponent.intID,
    strComponentCode: dicComponent.strComponentCode,
    strComponentName: dicComponent.strComponentName,
    strTaxTreatment: dicComponent.strTaxTreatment,
    blnProofRequired: dicComponent.blnRequiresBills,
    blnRequiresBills: dicComponent.blnRequiresBills,
    blnIsFlexiBenefit: dicComponent.blnIsFlexiBenefit,
    decAnnualLimitAmount: dicComponent.decAnnualLimitAmount,
    decMonthlyLimitAmount: dicComponent.decMonthlyLimitAmount,
    decReimbursementMaxClaimYearlyLimit: dicComponent.decReimbursementMaxClaimYearlyLimit,
    decReimbursementMaxClaimMonthlyLimit: dicComponent.decReimbursementMaxClaimMonthlyLimit
  }));
}

function resolveFlexiBenefitAllocationSourceLines(
  lstStructureComponents: FlexiSourceLine[],
  lstCurrentComponentLines: FlexiSourceLine[] = [],
  lstSalaryComponents: SalaryComponentApiRecord[] = []
) {
  const dicSalaryComponentByID = buildSalaryComponentMap(lstSalaryComponents);
  const lstStructureFlexiBenefitLines = getFlexiBenefitAllocationLines(
    lstStructureComponents.map((dicLine) => mergeFlexiMetadata(dicLine, dicSalaryComponentByID))
  );
  const lstCurrentFlexiBenefitLines = getFlexiBenefitAllocationLines(
    lstCurrentComponentLines.map((dicLine) => mergeFlexiMetadata(dicLine, dicSalaryComponentByID))
  );

  const lstMergedFlexiBenefitLines = [...lstStructureFlexiBenefitLines, ...lstCurrentFlexiBenefitLines];
  if (lstMergedFlexiBenefitLines.length > 0) {
    const dicResolvedByComponentID = new Map<number, FlexiSourceLine>();
    for (const dicLine of lstMergedFlexiBenefitLines) {
      const dicExistingLine = dicResolvedByComponentID.get(dicLine.intSalaryComponentID);
      if (!dicExistingLine) {
        dicResolvedByComponentID.set(dicLine.intSalaryComponentID, dicLine);
        continue;
      }
      dicResolvedByComponentID.set(dicLine.intSalaryComponentID, {
        ...dicExistingLine,
        ...dicLine,
        strComponentCode: dicExistingLine.strComponentCode ?? dicLine.strComponentCode,
        strComponentName: dicExistingLine.strComponentName ?? dicLine.strComponentName,
        strTaxTreatment: dicExistingLine.strTaxTreatment ?? dicLine.strTaxTreatment,
        blnProofRequired: dicExistingLine.blnProofRequired ?? dicLine.blnProofRequired,
        blnIsFlexiBenefit: dicExistingLine.blnIsFlexiBenefit ?? dicLine.blnIsFlexiBenefit,
        decAnnualLimit: dicExistingLine.decAnnualLimit ?? dicLine.decAnnualLimit,
        decMonthlyLimit: dicExistingLine.decMonthlyLimit ?? dicLine.decMonthlyLimit,
        decAnnualLimitAmount: dicExistingLine.decAnnualLimitAmount ?? dicLine.decAnnualLimitAmount,
        decMonthlyLimitAmount: dicExistingLine.decMonthlyLimitAmount ?? dicLine.decMonthlyLimitAmount,
        decReimbursementMaxClaimYearlyLimit:
          dicExistingLine.decReimbursementMaxClaimYearlyLimit ?? dicLine.decReimbursementMaxClaimYearlyLimit,
        decReimbursementMaxClaimMonthlyLimit:
          dicExistingLine.decReimbursementMaxClaimMonthlyLimit ?? dicLine.decReimbursementMaxClaimMonthlyLimit,
        decFlexiMaxYearlyAmount: dicExistingLine.decFlexiMaxYearlyAmount ?? dicLine.decFlexiMaxYearlyAmount,
        decFlexiMaxMonthlyAmount: dicExistingLine.decFlexiMaxMonthlyAmount ?? dicLine.decFlexiMaxMonthlyAmount
      });
    }
    return [...dicResolvedByComponentID.values()];
  }
  return getFlexiBenefitAllocationLines(buildFlexiSourceFromSalaryComponents(lstSalaryComponents));
}

function getEmployeeSalaryErrorMessage(
  objError: unknown,
  strFallback: string,
  fnTranslate: (strKey: string, strFallback: string) => string
) {
  const strMessage = objError instanceof Error ? objError.message : strFallback;
  return strMessage.toLowerCase().includes("flexi allocation component is not eligible")
    ? fnTranslate(
        "employee_salary_flexi_allocation_component_not_eligible",
        "Flexi allocation component is not eligible for the selected salary structure. Select a structure that contains this flexi benefit component, or leave that allocation blank before saving."
      )
    : strMessage;
}

function buildRevisionForm(
  objDetail: EmployeeSalaryDetailRecord | null,
  objFormOptions?: EmployeeSalaryFormOptions | null,
  lstSalaryComponents: SalaryComponentApiRecord[] = [],
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryRevisionFormValues {
  const intSalaryStructureID = objDetail?.objAssignedStructure?.intSalaryStructureID ?? "";
  const lstStructureComponents = intSalaryStructureID === ""
    ? []
    : objFormOptions?.lstSalaryStructures.find((dicStructure) => dicStructure.intID === intSalaryStructureID)?.lstComponents ?? [];

  return {
    intSalaryStructureID,
    dtEffectiveFrom: getRevisionMinEffectiveDate(objDetail) || getTodayDateString(),
    strRevisionReason: "",
    lstOverrides: buildOverrideRows(
      lstStructureComponents.length > 0 ? lstStructureComponents : objDetail?.lstComponentLines ?? [],
      objDetail?.lstComponentLines ?? [],
      getFlexiAllocationSummary(objDetail),
      buildSalaryComponentMap(lstSalaryComponents),
      fnTranslate
    ),
    lstFlexiAllocations: buildFlexiAllocationRows(
      resolveFlexiBenefitAllocationSourceLines(
        lstStructureComponents,
        objDetail?.lstComponentLines ?? [],
        lstSalaryComponents
      ),
      getFlexiAllocationSummary(objDetail).lstAllocationLines,
      fnTranslate
    )
  };
}

export default function EmployeeSalaryDetailPage({ strEmployeeID, blnRevisionMode = false, strReturnTo = "/employee-salary" }: EmployeeSalaryDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeSalaryLabels();
  const refTranslate = useRef(t);
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly, objRights } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objFlexiDeclarationContext, setObjFlexiDeclarationContext] = useState<FlexiDeclarationContextRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeSalaryFormOptions | null>(null);
  const [lstSalaryComponents, setLstSalaryComponents] = useState<SalaryComponentApiRecord[]>([]);
  const [objRevisionPreview, setObjRevisionPreview] = useState<EmployeeSalaryRevisionPreviewRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const refRevisionPreviewRequest = useRef(0);
  const [blnIsRevisionMode, setBlnIsRevisionMode] = useState(blnRevisionMode);
  const [dicRevisionForm, setDicRevisionForm] = useState<EmployeeSalaryRevisionFormValues>(buildRevisionForm(null));
  function hasPermissionCode(strCode: string) {
    const strNormalizedCode = strCode.trim().toUpperCase();
    return Object.entries(objRights.dicAllowedActions || {}).some(([strModuleCode, lstActions]) =>
      strModuleCode.trim().toUpperCase() === strNormalizedCode ||
      lstActions.some((strAction) => strAction.trim().toUpperCase() === strNormalizedCode)
    );
  }
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanSubmit = canDoAny("submit") || canDoAny("save");
  const blnCanMutate = blnCanAdd || blnCanEdit || blnCanSubmit;
  // Opens read-only; Edit appears only when the server grants a mutating right, so no mode is in
  // the URL for a user to change.
  const blnEffectiveViewMode = isReadOnly() || (blnCanView && !blnCanMutate);
  const blnCanLoadWorkspace = blnCanView;
  const blnHasAssignedSalary = Boolean(objDetail?.objAssignedStructure);
  const blnCanViewWageBreakdownPreview = hasPermissionCode("WAGES_VIEW") && !blnIsRevisionMode;

  useEffect(() => {
    refTranslate.current = t;
  }, [t]);

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      if (blnRightsLoading) {
        return;
      }
      if (!blnCanLoadWorkspace) {
        if (blnMounted) {
          setBlnLoading(false);
        }
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const dicDetail = await employeeSalaryService.getEmployeeSalaryDetail(strEmployeeID);
        const [dicFormOptions, dicSalaryComponents] = await Promise.all([
          employeeSalaryService.getFormOptions().catch(() => ({
            lstEmployees: [],
            lstSalaryStructures: [],
          })),
          masterApiService.getSalaryComponents().catch(() => ({ Data: [] as SalaryComponentApiRecord[] })),
        ]);
        let intDeclarationID = dicDetail.objFlexiDeclaration?.intDeclarationID ?? null;
        if (!intDeclarationID) {
          const lstDeclarationHistoryGroups = await Promise.all(
            lstFlexiDeclarationStatuses.map((strStatus) =>
              hrFlexiDeclarationReviewService.getList(strStatus).catch(() => [])
            )
          );
          const lstDeclarationHistory = lstDeclarationHistoryGroups.flat();
          const strFinancialYearCode = dicDetail.objFlexiDeclaration?.strFinancialYearCode ?? "";
          const dicMatchedDeclaration =
            lstDeclarationHistory.find(
              (dicRow) =>
                dicRow.intEmployeeID === dicDetail.objEmployeeSummary.intEmployeeID &&
                (!strFinancialYearCode || dicRow.strFinancialYearCode === strFinancialYearCode)
            ) ??
            lstDeclarationHistory.find((dicRow) => dicRow.intEmployeeID === dicDetail.objEmployeeSummary.intEmployeeID);
          intDeclarationID = dicMatchedDeclaration?.intDeclarationID ?? null;
        }
        const dicFlexiDeclarationContext = intDeclarationID
          ? await hrFlexiDeclarationReviewService.getDetail(intDeclarationID).catch(() => null)
          : null;
        if (!blnMounted) {
          return;
        }
        setObjDetail(dicDetail);
        setObjFlexiDeclarationContext(dicFlexiDeclarationContext);
        setObjFormOptions(dicFormOptions);
        setLstSalaryComponents(dicSalaryComponents.Data);
        setObjRevisionPreview(null);
        setDicRevisionForm(buildRevisionForm(dicDetail, dicFormOptions, dicSalaryComponents.Data, refTranslate.current));
      } catch (objError) {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : refTranslate.current("employee_salary_load_detail_failed", "Unable to load employee salary detail.")
          );
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
  }, [blnCanLoadWorkspace, blnRightsLoading, strEmployeeID]);

  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";
  const intFlexiDeclarationID =
    objFlexiDeclarationContext?.objDeclaration?.intDeclarationID ??
    objDetail?.objFlexiDeclaration?.intDeclarationID ??
    null;
  const strFlexiDeclarationStatusNormalized = normalizeSelectToken(
    objFlexiDeclarationContext?.objDeclaration?.strWorkflowStatus ??
    objDetail?.objFlexiDeclaration?.strStatus ??
    ""
  );
  const blnHasDeclaredFlexiAmounts = useMemo(() => {
    if ((objFlexiDeclarationContext?.lstDeclarationLines ?? []).some((dicLine) => getPreferredFlexiAnnualAmount(dicLine) > 0)) {
      return true;
    }
    return (objDetail?.objFlexiAllocation?.lstAllocationLines ?? []).some(
      (dicLine) =>
        !isFlexiBucketAllocationLine(dicLine, objDetail?.objFlexiAllocation) &&
        (
          getNumberValue(dicLine.decDeclaredAnnualAmount) > 0 ||
          getNumberValue(dicLine.decAllocationAnnual) > 0
        )
    );
  }, [objDetail?.objFlexiAllocation, objFlexiDeclarationContext?.lstDeclarationLines]);
  const blnCanApproveFlexiDeclaration =
    Boolean(intFlexiDeclarationID) &&
    strFlexiDeclarationStatusNormalized === "submitted" &&
    blnHasDeclaredFlexiAmounts;
  const strFlexiActionLabel = blnCanApproveFlexiDeclaration
    ? t("employee_salary_review_approve", "Review / Approve")
    : t("employee_salary_view", "View");

  const lstComponentRows: ComponentGridRow[] = useMemo(() => {
    const dicFlexiBucketAmounts = getEmployeeFlexiBucketAmounts(objDetail);
    return (objDetail?.lstComponentLines ?? []).map((dicLine: EmployeeSalaryComponentLine) => {
      const blnIsFlexiBucket = isFlexiBucketLine(dicLine);
      const decLineMonthlyAmount = getNumberValue(dicLine.decAmountMonthly);
      const decLineAnnualAmount = getNumberValue(dicLine.decAmountAnnual);
      const decResolvedMonthlyAmount = blnIsFlexiBucket && decLineMonthlyAmount <= 0
        ? dicFlexiBucketAmounts.decMonthlyAmount
        : dicLine.decAmountMonthly;
      const decFallbackAnnualAmount = blnIsFlexiBucket && decLineAnnualAmount <= 0
        ? dicFlexiBucketAmounts.decAnnualAmount
        : dicLine.decAmountAnnual;
      const decMonthlyAmount = decResolvedMonthlyAmount ?? (
        decFallbackAnnualAmount != null ? Number(decFallbackAnnualAmount) / 12 : null
      );
      const decAnnualAmount = decMonthlyAmount != null
        ? Number(decMonthlyAmount) * 12
        : decFallbackAnnualAmount;

      return {
        intEmployeeSalaryComponentID: dicLine.intEmployeeSalaryComponentID,
        strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
        strCategory: dicLine.strComponentCategory ?? "-",
        strValueType: dicLine.strComponentValueType,
        strPayslipSectionSnapshotCode: dicLine.strPayslipSectionSnapshotCode,
        strLwpTreatmentSnapshotCode: dicLine.strLwpTreatmentSnapshotCode,
        strLwpReducedAmountHandlingSnapshotCode: dicLine.strLwpReducedAmountHandlingSnapshotCode,
        strAnnual: formatCurrency(decAnnualAmount, strCurrencyCode),
        strMonthly: formatCurrency(decMonthlyAmount, strCurrencyCode),
        decAnnualSort: Number(decAnnualAmount ?? 0),
        decMonthlySort: Number(decMonthlyAmount ?? 0),
        blnIsOverride: dicLine.blnIsOverride,
        strOverride: dicLine.blnIsOverride
          ? t("employee_salary_override", "HR Override")
          : t("employee_salary_structure_source", "Structure"),
        strRemarks: dicLine.strRemarks ?? "-",
        blnIsFlexiBucket,
        blnIsFlexiReimbursementOption: isFlexiAllocationLine(dicLine),
        blnIsNonCtcReimbursement: isNonCtcReimbursementLine(dicLine)
      };
    });
  }, [objDetail, strCurrencyCode, t]);

  const lstHistoryRows: HistoryGridRow[] = useMemo(() => {
    return (objDetail?.lstRevisionHistory ?? []).map((dicRow: EmployeeSalaryHistoryRecord) => {
      const dicDisplayAmounts = getHistorySalaryDisplayAmounts(dicRow);
      return {
        intEmployeeSalaryStructureID: dicRow.intEmployeeSalaryStructureID,
        strStructure: dicRow.strStructureName ?? dicRow.strStructureCode ?? "-",
        strEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
        strEffectiveTo: formatDate(dicRow.dtEffectiveTo),
        strGrossMonthly: formatCurrency(dicDisplayAmounts.decGrossMonthly, strCurrencyCode),
        strCtcAnnual: formatCurrency(dicDisplayAmounts.decCtcAnnual, strCurrencyCode),
        strEffectiveFromSort: dicRow.dtEffectiveFrom ?? "",
        strEffectiveToSort: dicRow.dtEffectiveTo ?? "",
        decGrossMonthlySort: Number(dicDisplayAmounts.decGrossMonthly ?? 0),
        decCtcAnnualSort: Number(dicDisplayAmounts.decCtcAnnual ?? 0),
        blnIsCurrent: dicRow.blnIsCurrent,
        strCurrent: dicRow.blnIsCurrent
          ? t("employee_salary_current", "Current")
          : t("employee_salary_history", "History"),
        strReason: dicRow.strRevisionReason ?? "-"
      };
    });
  }, [objDetail, strCurrencyCode, t]);

  const objFlexiAllocation = useMemo(
    () => getFlexiAllocationSummary(objDetail),
    [objDetail]
  );
  const dicFlexiTotals = useMemo(
    () => calculateFlexiTotals(objFlexiAllocation),
    [objFlexiAllocation]
  );
  const blnHasFlexiBucket = dicFlexiTotals.decFlexiBucketAvailableAnnual > 0;
  const blnHasFlexiAllocations = objFlexiAllocation.lstAllocationLines.some(
    (dicLine) => !isFlexiBucketAllocationLine(dicLine, objFlexiAllocation)
  );
  const strPayrollLockMessage = useMemo(() => getPayrollLockMessage(objDetail), [objDetail]);
  const lstValidationMessages = useMemo(
    () => getValidationMessages(objFlexiAllocation, dicFlexiTotals, objDetail?.lstComponentLines ?? []),
    [dicFlexiTotals, objDetail, objFlexiAllocation]
  );
  const dicSalaryComponentByID = useMemo(
    () => buildSalaryComponentMap(lstSalaryComponents),
    [lstSalaryComponents]
  );
  const dicFlexiPayOverride = useMemo(
    () => dicRevisionForm.lstOverrides.find((dicOverride) => isFlexiPayComponentName(dicOverride.strComponentName)),
    [dicRevisionForm.lstOverrides]
  );
  const decFlexiPayAllocationAnnual = useMemo(
    () => getOverrideAnnualAmount(dicFlexiPayOverride),
    [dicFlexiPayOverride]
  );
  const decDialogFlexiAllocated = useMemo(
    () =>
      dicRevisionForm.lstFlexiAllocations.reduce((decTotal, dicAllocation) => {
        const decAnnual = parseOptionalAmount(dicAllocation.decAllocationAnnual) ?? 0;
        const decMonthly = parseOptionalAmount(dicAllocation.decAllocationMonthly) ?? 0;
        return decTotal + (Number.isFinite(decAnnual) && decAnnual > 0 ? decAnnual : (Number.isFinite(decMonthly) ? decMonthly * 12 : 0));
      }, 0),
    [dicRevisionForm.lstFlexiAllocations]
  );
  const blnShowFlexiBenefitAllocation = useMemo(
    () =>
      dicRevisionForm.lstFlexiAllocations.length > 0 &&
      Boolean(dicFlexiPayOverride),
    [dicFlexiPayOverride, dicRevisionForm.lstFlexiAllocations.length]
  );
  const lstSelectedRevisionStructureComponents = useMemo(
    () => objFormOptions?.lstSalaryStructures.find((dicStructure) => dicStructure.intID === dicRevisionForm.intSalaryStructureID)?.lstComponents ?? [],
    [dicRevisionForm.intSalaryStructureID, objFormOptions?.lstSalaryStructures]
  );
  const mapRevisionPreviewComponentByID = useMemo(
    () => new Map((objRevisionPreview?.lstComponentLines ?? []).map((dicLine) => [dicLine.intSalaryComponentID, dicLine])),
    [objRevisionPreview]
  );
  const lstResolvedRevisionOverrides = useMemo(
    () => syncCalculatedOverrideRowsFromPreview(
      dicRevisionForm.lstOverrides,
      objRevisionPreview?.lstComponentLines ?? [],
      lstSelectedRevisionStructureComponents
    ),
    [dicRevisionForm.lstOverrides, lstSelectedRevisionStructureComponents, objRevisionPreview]
  );
  const dicResolvedRevisionForm = useMemo(
    () => ({
      ...dicRevisionForm,
      lstOverrides: lstResolvedRevisionOverrides,
    }),
    [dicRevisionForm, lstResolvedRevisionOverrides]
  );
  const dicResolvedRevisionSalarySummaryMetrics = useMemo(
    () => calculateRevisionSalarySummaryMetrics(
      lstSelectedRevisionStructureComponents,
      dicResolvedRevisionForm,
      dicSalaryComponentByID,
      mapRevisionPreviewComponentByID
    ),
    [dicResolvedRevisionForm, dicSalaryComponentByID, lstSelectedRevisionStructureComponents, mapRevisionPreviewComponentByID]
  );
  const decRevisionFlexiBalanceAnnual = Math.max(decFlexiPayAllocationAnnual - decDialogFlexiAllocated, 0);
  const decRevisionNetPayrollImpactMonthly = decRevisionFlexiBalanceAnnual / 12;
  const lstRevisionLiveBreakdownComponentRows: RevisionBreakdownComponentRow[] = useMemo(() => {
    const setFlexiAllocationComponentIDs = new Set(
      dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => dicAllocation.intSalaryComponentID)
    );
    const lstNonFlexiRows = lstResolvedRevisionOverrides
      .filter((dicOverride) =>
        !setFlexiAllocationComponentIDs.has(dicOverride.intSalaryComponentID) &&
        !isFlexiPayComponentName(dicOverride.strComponentName)
      )
      .map((dicOverride) => {
        const decAnnualAmount = getOverrideAnnualAmount(dicOverride);
        return {
          intSalaryComponentID: dicOverride.intSalaryComponentID,
          strComponentName: dicOverride.strComponentName,
          decAnnualAmount,
          decPercentOfCtc: dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc > 0 ? (decAnnualAmount / dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc) * 100 : null
        };
      })
      .filter((dicRow) => dicRow.decAnnualAmount > 0);
    const lstDeclaredFlexiRows = dicRevisionForm.lstFlexiAllocations
      .map((dicAllocation) => {
        const decAnnualAmount =
          parseOptionalAmount(dicAllocation.decAllocationAnnual) ??
          ((parseOptionalAmount(dicAllocation.decAllocationMonthly) ?? 0) * 12);
        return {
          intSalaryComponentID: dicAllocation.intSalaryComponentID,
          strComponentName: dicAllocation.strComponentName,
          decAnnualAmount,
          decPercentOfCtc: dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc > 0 ? (decAnnualAmount / dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc) * 100 : null
        };
      })
      .filter((dicRow) => dicRow.decAnnualAmount > 0);
    const lstResidualRows = decRevisionFlexiBalanceAnnual > 0
      ? [{
          intSalaryComponentID: -1,
          strComponentName: t("employee_salary_residual_taxable_allowance", "Residual Taxable Component"),
          decAnnualAmount: decRevisionFlexiBalanceAnnual,
          decPercentOfCtc: dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc > 0 ? (decRevisionFlexiBalanceAnnual / dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc) * 100 : null
        }]
      : [];
    return [...lstNonFlexiRows, ...lstDeclaredFlexiRows, ...lstResidualRows];
  }, [decRevisionFlexiBalanceAnnual, dicResolvedRevisionSalarySummaryMetrics.decAnnualCtc, dicRevisionForm.lstFlexiAllocations, lstResolvedRevisionOverrides, t]);
  const lstRevisionOverrideRows = useMemo(() => {
    const setFlexiAllocationComponentIDs = new Set(
      dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => dicAllocation.intSalaryComponentID)
    );
    return lstResolvedRevisionOverrides
      .map((dicOverride, intOverrideIndex) => ({ dicOverride, intOverrideIndex }))
      .filter(({ dicOverride }) => !setFlexiAllocationComponentIDs.has(dicOverride.intSalaryComponentID));
  }, [dicRevisionForm.lstFlexiAllocations, lstResolvedRevisionOverrides]);

  async function refreshCalculatedRevisionOverrides(dicNextForm: EmployeeSalaryRevisionFormValues) {
    const intRequestID = refRevisionPreviewRequest.current + 1;
    refRevisionPreviewRequest.current = intRequestID;
    try {
      const dicPreview = await employeeSalaryService.previewRevision(strEmployeeID, dicNextForm);
      if (refRevisionPreviewRequest.current !== intRequestID) {
        return;
      }
      setObjRevisionPreview(dicPreview);
    } catch {
      // Keep the user's manual edits even if preview recalculation is temporarily unavailable.
    }
  }

  function updateRevisionOverrides(
    fnUpdateOverrides: (lstOverrides: EmployeeSalaryRevisionFormValues["lstOverrides"]) => EmployeeSalaryRevisionFormValues["lstOverrides"],
    blnRefreshCalculatedRows = false
  ) {
    const lstNextOverrides = fnUpdateOverrides(dicRevisionForm.lstOverrides);
    const dicNextForm = {
      ...dicRevisionForm,
      lstOverrides: blnRefreshCalculatedRows
        ? syncCalculatedOverrideRowsFromPreview(
            lstNextOverrides,
            [],
            lstSelectedRevisionStructureComponents
          )
        : lstNextOverrides,
    };
    if (blnRefreshCalculatedRows) {
      setObjRevisionPreview(null);
    }
    setDicRevisionForm(dicNextForm);
    if (blnRefreshCalculatedRows) {
      void refreshCalculatedRevisionOverrides(dicNextForm);
    }
  }

  const lstFlexiRows: FlexiGridRow[] = useMemo(() => {
    const mapDeclarationLinesByComponentID = new Map<number, FlexiDeclarationLineRecord>(
      (objFlexiDeclarationContext?.lstDeclarationLines ?? []).map((dicLine) => [dicLine.intSalaryComponentID, dicLine])
    );
    const strDeclarationStatusCode =
      objFlexiDeclarationContext?.objDeclaration?.strWorkflowStatus ??
      objDetail?.objFlexiDeclaration?.strStatus ??
      null;
    const strOverallDeclarationStatus = formatFlexiDeclarationStatus(strDeclarationStatusCode);
    const mapAllocationLinesByComponentID = new Map<number, FlexiAllocationLineWithStatus>(
      objFlexiAllocation.lstAllocationLines
        .filter((dicLine) => !isFlexiBucketAllocationLine(dicLine, objFlexiAllocation))
        .map((dicLine) => [dicLine.intSalaryComponentID, dicLine as FlexiAllocationLineWithStatus])
    );
    const setAllComponentIDs = new Set<number>([...mapAllocationLinesByComponentID.keys()]);

    const lstRows = [...setAllComponentIDs]
      .map((intSalaryComponentID): FlexiGridRow | null => {
        const dicLine = mapAllocationLinesByComponentID.get(intSalaryComponentID);
        if (!dicLine) {
          return null;
        }
        const strComponentName =
          dicLine?.strComponentName ??
          dicLine?.strComponentCode ??
          "-";
        const dicDeclarationLine = mapDeclarationLinesByComponentID.get(intSalaryComponentID);
        const decPreviewAnnual = getPreferredFlexiDisplayAmount(dicLine, strDeclarationStatusCode);
        const strLineStatusCode =
          dicDeclarationLine?.strDeclarationItemStatus ??
          dicLine.strStatus ??
          dicLine.strDeclarationItemStatus ??
          strDeclarationStatusCode ??
          "Not Declared";
        const blnShowDeclarationStatus = shouldDisplayFlexiDeclarationStatus(
          strLineStatusCode,
          decPreviewAnnual
        );
        const strStatus = formatFlexiDeclarationStatus(
          (blnShowDeclarationStatus && strOverallDeclarationStatus !== "-" ? strLineStatusCode : "Not Declared")
        );
        const strReasonAction = dicDeclarationLine?.strDeclarationItemRemarks
          ?? dicLine.strRemarks
          ?? (blnShowDeclarationStatus && strOverallDeclarationStatus !== "-" ? "ESS Declaration" : normalizeFlexiSource(dicLine.strSource ?? "Structure Default"));

        return {
          intSalaryComponentID,
          strComponentName,
          strEligibility: t("employee_salary_eligible", "Eligible"),
          strAnnualCap: formatOptionalCurrencyValue(dicLine.decAnnualLimit ?? null, strCurrencyCode),
          strApprovedDeclaredAnnual: formatCurrencyWithTwoDecimals(decPreviewAnnual, strCurrencyCode),
          strMonthlyImpact: formatCurrencyWithTwoDecimals(decPreviewAnnual / 12, strCurrencyCode),
          strProofRequired: dicLine.blnProofRequired
            ? t("employee_salary_yes", "Yes")
            : t("employee_salary_no", "No"),
          strStatus,
          strReasonAction,
          decAnnualCap: Number(dicLine.decAnnualLimit ?? 0),
          decMonthlyImpact: decPreviewAnnual / 12,
          decApprovedDeclaredAnnual: decPreviewAnnual,
          strStatusCode: strLineStatusCode
        };
      });
    return lstRows.reduce<FlexiGridRow[]>((lstResolvedRows, dicRow) => {
      if (dicRow && dicRow.strComponentName !== "-") {
        lstResolvedRows.push(dicRow);
      }
      return lstResolvedRows;
    }, []);
  }, [objDetail?.objFlexiDeclaration?.strStatus, objFlexiAllocation, objFlexiDeclarationContext, strCurrencyCode, t]);
  const dicSalarySummaryMetrics = useMemo(
    () => calculateSalarySummaryMetrics(objDetail, dicFlexiTotals, lstFlexiRows, dicSalaryComponentByID),
    [dicFlexiTotals, dicSalaryComponentByID, lstFlexiRows, objDetail]
  );
  const decGrossAnnual = dicSalarySummaryMetrics.decGrossMonthly * 12;
  const decNetMonthly = Math.max(
    dicSalarySummaryMetrics.decGrossMonthly - dicSalarySummaryMetrics.decEmployeeDeductionsMonthly,
    0
  );
  const decNetAnnual = decNetMonthly * 12;
  const objItDeclarationDashboard = objDetail?.objItDeclarationDashboard;
  const objItDeclarationSummary = objItDeclarationDashboard
    ? objItDeclarationDashboard.lstDeclarations.find(
        (dicCard) => dicCard.strFinancialYearCode === objItDeclarationDashboard.strCurrentFinancialYearCode
      ) ?? objItDeclarationDashboard.lstDeclarations[0] ?? null
    : null;
  const lstRevisionCurrentBreakdownComponentRows: RevisionBreakdownComponentRow[] = useMemo(() => {
    return (objDetail?.lstComponentLines ?? [])
      .filter((dicLine) =>
        !isFlexiPayComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "") &&
        !isFlexiAllocationLine(dicLine) &&
        !isResidualTaxableComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "") &&
        Number(dicLine.decAmountAnnual ?? 0) > 0
      )
      .map((dicLine) => {
        const decAnnualAmount = Number(dicLine.decAmountAnnual ?? 0);
        return {
          intSalaryComponentID: dicLine.intSalaryComponentID,
          strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
          decAnnualAmount,
          decPercentOfCtc: dicSalarySummaryMetrics.decAnnualCtc > 0 ? (decAnnualAmount / dicSalarySummaryMetrics.decAnnualCtc) * 100 : null
        };
      });
  }, [dicSalarySummaryMetrics.decAnnualCtc, objDetail]);

  const lstFilteredComponentRows = useMemo(
    () => lstComponentRows.filter((dicRow) => {
      if (dicRow.blnIsFlexiBucket) return true;
      if (dicRow.blnIsFlexiReimbursementOption) return false;
      if (dicRow.blnIsNonCtcReimbursement) return false;
      return true;
    }),
    [lstComponentRows]
  );
  const lstComponentDataGridRows = useMemo<ComponentDataGridRow[]>(
    () => lstFilteredComponentRows.map((dicRow) => ({
      ...dicRow,
      strComponentName: (
        <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>
          {dicRow.strComponentName}
        </Typography>
      ),
      strOverride: (
        <span className={`${styles.statusPill} ${dicRow.blnIsOverride ? styles.statusInactive : styles.statusActive}`}>
          {dicRow.strOverride}
        </span>
      )
    })),
    [lstFilteredComponentRows]
  );
  const lstComponentColumns = useMemo<DataGridColumn<ComponentDataGridRow>[]>(() => [
    { field: "strComponentName", headerName: t("employee_salary_component", "Component"), width: 180, sortable: false },
    { field: "strCategory", headerName: t("employee_salary_category", "Category"), width: 130 },
    { field: "strValueType", headerName: t("employee_salary_value_type", "Value Type"), width: 130 },
    { field: "strAnnual", headerName: t("employee_salary_annual", "Annual"), width: 130, align: "right", sortAccessor: (dicRow) => dicRow.decAnnualSort },
    { field: "strMonthly", headerName: t("employee_salary_monthly", "Monthly"), width: 130, align: "right", sortAccessor: (dicRow) => dicRow.decMonthlySort },
    { field: "strOverride", headerName: t("employee_salary_source", "Source"), width: 130, sortable: false },
    { field: "strRemarks", headerName: t("employee_salary_remarks", "Remarks"), width: 180 }
  ], [t]);
  const lstFlexiColumns = useMemo<DataGridColumn<FlexiGridRow>[]>(() => [
    { field: "strComponentName", headerName: t("employee_salary_flexi_component", "Component"), width: 170, sortable: false },
    { field: "strEligibility", headerName: t("employee_salary_eligibility", "Eligibility"), width: 120 },
    { field: "strAnnualCap", headerName: t("employee_salary_annual_limit", "Annual Cap"), width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decAnnualCap },
    { field: "strApprovedDeclaredAnnual", headerName: t("employee_salary_approved_declared_annual", "Approved / Declared Annual"), width: 190, align: "right", sortAccessor: (dicRow) => dicRow.decApprovedDeclaredAnnual },
    { field: "strMonthlyImpact", headerName: t("employee_salary_monthly_impact", "Monthly Impact"), width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decMonthlyImpact },
    { field: "strProofRequired", headerName: t("employee_salary_proof_required", "Proof Required"), width: 140 },
    { field: "strStatus", headerName: t("employee_salary_status", "Status"), width: 130 },
    { field: "strReasonAction", headerName: t("employee_salary_reason_action", "Reason / Action"), width: 190 }
  ], [t]);
  const lstHistoryDataGridRows = useMemo<HistoryDataGridRow[]>(
    () => lstHistoryRows.map((dicRow) => ({
      ...dicRow,
      strCurrent: (
        <span className={`${styles.statusPill} ${dicRow.blnIsCurrent ? styles.statusActive : styles.statusInactive}`}>
          {dicRow.strCurrent}
        </span>
      )
    })),
    [lstHistoryRows]
  );
  const lstHistoryColumns = useMemo<DataGridColumn<HistoryDataGridRow>[]>(() => [
    { field: "strStructure", headerName: t("employee_salary_structure", "Structure"), width: 180 },
    { field: "strEffectiveFrom", headerName: t("employee_salary_effective_from", "Effective From"), width: 145, sortAccessor: (dicRow) => dicRow.strEffectiveFromSort },
    { field: "strEffectiveTo", headerName: t("employee_salary_effective_to", "Effective To"), width: 145, sortAccessor: (dicRow) => dicRow.strEffectiveToSort },
    { field: "strGrossMonthly", headerName: t("employee_salary_gross_monthly", "Gross Monthly"), width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decGrossMonthlySort },
    { field: "strCtcAnnual", headerName: t("employee_salary_ctc_annual", "CTC Annual"), width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decCtcAnnualSort },
    { field: "strCurrent", headerName: t("employee_salary_record_type", "Record Type"), width: 130, sortable: false },
    { field: "strReason", headerName: t("employee_salary_revision_reason", "Revision Reason"), width: 210 }
  ], [t]);
  const lstRevisionFlexiDataGridRows = useMemo<RevisionFlexiDataGridRow[]>(
    () => dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => ({
      intSalaryComponentID: dicAllocation.intSalaryComponentID,
      strComponentName: (
        <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>
          {dicAllocation.strComponentName}
        </Typography>
      ),
      strEligibility: t("employee_salary_eligible", "Eligible"),
      strAnnualCap: formatOptionalCurrencyValue(dicAllocation.decAnnualLimit, strCurrencyCode),
      strApprovedDeclaredAnnual: (
        <TextField
          data-controlid={`employee-salary.revision.flexi.${dicAllocation.intSalaryComponentID}.annual.input`}
          value={dicAllocation.decAllocationAnnual}
          placeholder={dicAllocation.decAnnualLimit != null ? String(dicAllocation.decAnnualLimit) : ""}
          size="small"
          sx={objOverrideValueFieldSx}
          disabled
        />
      ),
      strMonthlyImpact: (
        <TextField
          data-controlid={`employee-salary.revision.flexi.${dicAllocation.intSalaryComponentID}.monthly.input`}
          value={dicAllocation.decAllocationMonthly}
          placeholder={dicAllocation.decMonthlyLimit != null ? String(dicAllocation.decMonthlyLimit) : ""}
          size="small"
          sx={objOverrideValueFieldSx}
          disabled
        />
      ),
      strProofRequired: dicAllocation.blnProofRequired ? t("employee_salary_yes", "Yes") : t("employee_salary_no", "No"),
      strStatus: dicAllocation.strStatus || t("employee_salary_not_declared", "Not Declared"),
      strReasonAction: dicAllocation.strReasonAction || "-"
    })),
    [dicRevisionForm.lstFlexiAllocations, strCurrencyCode, t]
  );
  const lstRevisionFlexiColumns = useMemo<DataGridColumn<RevisionFlexiDataGridRow>[]>(() => [
    { field: "strComponentName", headerName: t("employee_salary_flexi_component", "Component"), width: 170, sortable: false },
    { field: "strEligibility", headerName: t("employee_salary_eligibility", "Eligibility"), width: 120 },
    { field: "strAnnualCap", headerName: t("employee_salary_annual_limit", "Annual Cap"), width: 140, align: "right" },
    { field: "strApprovedDeclaredAnnual", headerName: t("employee_salary_approved_declared_annual", "Approved / Declared Annual"), width: 200, sortable: false },
    { field: "strMonthlyImpact", headerName: t("employee_salary_monthly_impact", "Monthly Impact"), width: 170, sortable: false },
    { field: "strProofRequired", headerName: t("employee_salary_proof_required", "Proof Required"), width: 140 },
    { field: "strStatus", headerName: t("employee_salary_status", "Status"), width: 130 },
    { field: "strReasonAction", headerName: t("employee_salary_reason_action", "Reason / Action"), width: 190 }
  ], [t]);
  const lstRevisionFlexiCompactDataGridRows = useMemo<RevisionFlexiCompactDataGridRow[]>(
    () => dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => ({
      intSalaryComponentID: dicAllocation.intSalaryComponentID,
      strComponentName: (
        <Box>
          <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>{dicAllocation.strComponentName}</Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>
            {`${t("employee_salary_proof_required", "Proof Required")}: ${dicAllocation.blnProofRequired ? t("employee_salary_yes", "Yes") : t("employee_salary_no", "No")}`}
          </Typography>
        </Box>
      ),
      strAnnualCap: formatOptionalCurrencyValue(dicAllocation.decAnnualLimit, strCurrencyCode),
      strMonthlyCap: formatOptionalCurrencyValue(dicAllocation.decMonthlyLimit, strCurrencyCode),
      strApprovedDeclaredAnnual: (
        <TextField
          data-controlid={`employee-salary.revision.flexi-compact.${dicAllocation.intSalaryComponentID}.annual.input`}
          value={dicAllocation.decAllocationAnnual}
          placeholder={dicAllocation.decAnnualLimit != null ? String(dicAllocation.decAnnualLimit) : ""}
          size="small"
          sx={objOverrideValueFieldSx}
          disabled
        />
      ),
      strMonthlyImpact: (
        <TextField
          data-controlid={`employee-salary.revision.flexi-compact.${dicAllocation.intSalaryComponentID}.monthly.input`}
          value={dicAllocation.decAllocationMonthly}
          placeholder={dicAllocation.decMonthlyLimit != null ? String(dicAllocation.decMonthlyLimit) : ""}
          size="small"
          sx={objOverrideValueFieldSx}
          disabled
        />
      ),
      strTaxTreatment: <span style={{ textTransform: "capitalize" }}>{dicAllocation.strTaxTreatment || "-"}</span>
    })),
    [dicRevisionForm.lstFlexiAllocations, strCurrencyCode, t]
  );
  const lstRevisionFlexiCompactColumns = useMemo<DataGridColumn<RevisionFlexiCompactDataGridRow>[]>(() => [
    { field: "strComponentName", headerName: t("employee_salary_flexi_component", "Flexi Component"), width: 210, sortable: false },
    { field: "strAnnualCap", headerName: t("employee_salary_annual_limit", "Annual Cap"), width: 145, align: "right" },
    { field: "strMonthlyCap", headerName: t("employee_salary_monthly_limit", "Monthly Cap"), width: 145, align: "right" },
    { field: "strApprovedDeclaredAnnual", headerName: t("employee_salary_approved_declared_annual", "Approved / Declared Annual"), width: 200, sortable: false },
    { field: "strMonthlyImpact", headerName: t("employee_salary_monthly_impact", "Monthly Impact"), width: 170, sortable: false },
    { field: "strTaxTreatment", headerName: t("employee_salary_tax_treatment", "Tax Treatment"), width: 150, sortable: false }
  ], [t]);
  const strMinRevisionEffectiveDate = getRevisionMinEffectiveDate(objDetail);

  async function handleSalaryStructureChange(strSalaryStructureID: string) {
    const intSalaryStructureID = strSalaryStructureID ? Number(strSalaryStructureID) : "";
    if (intSalaryStructureID === "") {
      setDicRevisionForm((dicPrev) => ({
        ...dicPrev,
        intSalaryStructureID,
        lstOverrides: [],
        lstFlexiAllocations: []
      }));
      return;
    }

    const intRequestID = refRevisionPreviewRequest.current + 1;
    refRevisionPreviewRequest.current = intRequestID;

    const dicSelectedStructure = objFormOptions?.lstSalaryStructures.find(
      (dicStructure) => dicStructure.intID === intSalaryStructureID
    );
    const lstStructureComponents = dicSelectedStructure?.lstComponents ?? [];
    const blnIsCurrentAssignedStructure =
      intSalaryStructureID === objDetail?.objAssignedStructure?.intSalaryStructureID;
    const lstFallbackCurrentLines =
      blnIsCurrentAssignedStructure
        ? objDetail?.lstComponentLines ?? []
        : [];
    const dicNextForm = {
      ...dicRevisionForm,
      intSalaryStructureID,
      lstOverrides: buildOverrideRows(
        lstStructureComponents.length > 0 ? lstStructureComponents : lstFallbackCurrentLines,
        [],
        blnIsCurrentAssignedStructure ? objFlexiAllocation : null,
        dicSalaryComponentByID,
        t
      ),
      lstFlexiAllocations: buildFlexiAllocationRows(
        resolveFlexiBenefitAllocationSourceLines(
          lstStructureComponents,
          lstFallbackCurrentLines,
          lstSalaryComponents
        ),
        blnIsCurrentAssignedStructure
          ? objFlexiAllocation.lstAllocationLines
          : [],
        t
      )
    };

    setDicRevisionForm(dicNextForm);

    try {
      const dicPreview = await employeeSalaryService.previewRevision(strEmployeeID, dicNextForm);
      if (refRevisionPreviewRequest.current !== intRequestID) {
        return;
      }
      setObjRevisionPreview(dicPreview);
      setDicRevisionForm((dicPrev) => {
        if (dicPrev.intSalaryStructureID !== intSalaryStructureID) {
          return dicPrev;
        }
        return {
          ...dicPrev,
          lstOverrides: buildOverrideRows(
            lstStructureComponents.length > 0 ? lstStructureComponents : lstFallbackCurrentLines,
            [],
            dicPreview.objFlexiAllocation,
            dicSalaryComponentByID,
            t
          ),
          lstFlexiAllocations: buildFlexiAllocationRows(
            resolveFlexiBenefitAllocationSourceLines(
              lstStructureComponents,
              dicPreview.lstComponentLines,
              lstSalaryComponents
            ),
            dicPreview.objFlexiAllocation?.lstAllocationLines ?? [],
            t
          )
        };
      });
    } catch {
      // Keep the structure metadata rows visible even if preview fails.
    }
  }

  async function handleSaveRevision() {
    if (dicRevisionForm.intSalaryStructureID === "") {
      setStrError(t("employee_salary_structure_required", "Salary structure is required."));
      return;
    }
    if (!dicRevisionForm.dtEffectiveFrom) {
      setStrError(t("employee_salary_effective_from_required", "Effective from date is required."));
      return;
    }
    if (strMinRevisionEffectiveDate && dicRevisionForm.dtEffectiveFrom < strMinRevisionEffectiveDate) {
      setStrError(
        t(
          "employee_salary_effective_from_after_current_required",
          `Effective from date must be on or after ${formatDate(strMinRevisionEffectiveDate)}.`
        )
      );
      return;
    }
    if (blnShowFlexiBenefitAllocation && decDialogFlexiAllocated - decFlexiPayAllocationAnnual > 0.01) {
      setStrError(
        t(
          "employee_salary_flexi_total_cannot_exceed_flexi_pay",
          `Total flexi allocation cannot exceed Flexi Pay allocation (${formatCurrency(decFlexiPayAllocationAnnual, strCurrencyCode)}).`
        )
      );
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      await employeeSalaryService.createRevision(strEmployeeID, {
        ...dicRevisionForm,
        lstOverrides: dicRevisionForm.lstOverrides.map((dicOverride) => ({
          ...dicOverride,
          decAmountMonthly: normalizeAmountTextOrDefault(dicOverride.decAmountMonthly, dicOverride.strDefaultMonthly),
          decAmountAnnual: normalizeAmountTextOrDefault(dicOverride.decAmountAnnual, dicOverride.strDefaultAnnual),
          decPercentageValue: normalizeAmountText(dicOverride.decPercentageValue)
        })),
        lstFlexiAllocations: blnShowFlexiBenefitAllocation
          ? dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => ({
              ...dicAllocation,
              decAllocationMonthly: normalizeAmountText(dicAllocation.decAllocationMonthly),
              decAllocationAnnual: normalizeAmountText(dicAllocation.decAllocationAnnual)
            }))
          : []
      });
      const dicRefreshedDetail = await employeeSalaryService.getEmployeeSalaryDetail(strEmployeeID);
      setObjDetail(dicRefreshedDetail);
      setDicRevisionForm(buildRevisionForm(dicRefreshedDetail, objFormOptions, lstSalaryComponents, t));
      setStrSuccess(
        t("employee_salary_revision_saved_success", "Employee salary revision saved successfully.")
      );
      setBlnIsRevisionMode(blnRevisionMode);
    } catch (objError) {
      setStrError(
        getEmployeeSalaryErrorMessage(
          objError,
          t("employee_salary_save_revision_failed", "Unable to save salary revision."),
          t
        )
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleConfirmUnassign() {
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedDetail = await employeeSalaryService.unassignSalary(strEmployeeID);
      setObjDetail(dicSavedDetail);
      setDicRevisionForm(buildRevisionForm(dicSavedDetail, objFormOptions, lstSalaryComponents, t));
      setStrSuccess(
        t("employee_salary_unassign_success", "Employee salary assignment removed successfully.")
      );
      setObjConfirmDialog(null);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : t("employee_salary_unassign_failed", "Unable to unassign employee salary.")
      );
    } finally {
      setBlnSaving(false);
    }
  }

  function handleOpenRevisionDialog() {
    setStrError("");
    setStrSuccess("");
    setDicRevisionForm(buildRevisionForm(objDetail, objFormOptions, lstSalaryComponents, t));
    setBlnIsRevisionMode(true);
  }

  function handleCancelRevision() {
    setStrError("");
    setStrSuccess("");
    setDicRevisionForm(buildRevisionForm(objDetail, objFormOptions, lstSalaryComponents, t));
    setBlnIsRevisionMode(false);
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>
            {t("employee_salary_loading_workspace", "Loading employee salary workspace...")}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("employee_salary_access_denied", "Employee salary access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("employee_salary_access_denied_help", "Contact your administrator if you need employee salary access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  const blnCanOpenAssignRevise =
    !blnEffectiveViewMode &&
    (blnHasAssignedSalary ? (blnCanEdit || blnCanSubmit) : (blnCanAdd || blnCanSubmit));
  const blnCanUnassignSalary =
    !blnEffectiveViewMode && blnHasAssignedSalary && (blnCanEdit || blnCanSubmit);

  if (blnIsRevisionMode && !blnCanOpenAssignRevise) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("employee_salary_revision_access_denied", "Salary revision is not available for your user group.")}
        </Typography>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={handleCancelRevision}
          sx={{ mt: 2 }}
        >
          {t("employee_salary_back_button", "Back")}
        </Button>
      </Box>
    );
  }

  if (false && blnRevisionMode) {
    if (!blnCanOpenAssignRevise) {
      return (
        <Box className={styles.emptyState}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
            {t("employee_salary_revision_access_denied", "Salary revision is not available for your user group.")}
          </Typography>
          <Button
            className={styles.secondaryButton}
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => objRouter.push(strReturnTo)}
            sx={{ mt: 2 }}
          >
            {t("employee_salary_back_button", "Back")}
          </Button>
        </Box>
      );
    }

    return (
      <Stack spacing={1.5} className={styles.revisionContent}>
        <Paper
          sx={{
            borderRadius: "22px",
            p: { xs: 1.5, md: 2 },
            border: "1px solid rgba(148,163,184,0.18)",
            background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 46%, #f8fafc 100%)"
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
                {t("employee_salary_dialog_title", "Assign / Revise Salary")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.25 }}>
                {objDetail?.objEmployeeSummary.strEmployeeName} ({objDetail?.objEmployeeSummary.strEmployeeCode})
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                data-controlid="employee-salary.revision.back.button"
                className={styles.secondaryButton}
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push(strReturnTo)}
                disabled={blnSaving}
              >
                {t("employee_salary_back_button", "Back")}
              </Button>
              <Button
                data-controlid="employee-salary.revision.save.button"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={handleSaveRevision}
                disabled={blnSaving}
              >
                {blnSaving
                  ? t("employee_salary_saving", "Saving...")
                  : t("employee_salary_save_revision", "Save Revision")}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}

        <Box className={`${styles.tableCard} ${styles.revisionCard}`} sx={{ px: 2.25, py: 3 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <TextField
              data-controlid="employee-salary.revision.salary-structure.select"
              inputProps={{ "data-controlid": "employee-salary.revision.salary-structure.select" }}
              select
              label={t("employee_salary_structure_field", "Salary structure")}
              value={dicRevisionForm.intSalaryStructureID}
              onChange={(objEvent) => handleSalaryStructureChange(objEvent.target.value)}
            >
              <MenuItem data-controlid="employee-salary.revision.salary-structure.select.option" value="">{t("employee_salary_select", "Select")}</MenuItem>
              {(objFormOptions?.lstSalaryStructures ?? []).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`employee-salary.revision.salary-structure.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                  {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              data-controlid="employee-salary.revision.effective-from.input"
              inputProps={{ "data-controlid": "employee-salary.revision.effective-from.input" }}
              type="date"
              label={t("employee_salary_effective_from_field", "Effective from")}
              value={dicRevisionForm.dtEffectiveFrom}
              onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            data-controlid="employee-salary.revision.revision-reason.input"
            inputProps={{ "data-controlid": "employee-salary.revision.revision-reason.input" }}
            label={t("employee_salary_revision_reason_field", "Revision reason")}
            value={dicRevisionForm.strRevisionReason}
            onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, strRevisionReason: objEvent.target.value }))}
            multiline
            minRows={2}
            sx={{ mt: 1.5, mb: 1 }}
            fullWidth
          />
        </Box>

        <Box className={`${styles.tableCard} ${styles.revisionCard}`}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                {t("employee_salary_override_handling", "Override handling")}
              </Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem", mt: 0.25 }}>
                {t(
                  "employee_salary_override_help",
                  "Only components marked for manual override can be edited here. Leave values unchanged if the revision should inherit structure defaults."
                )}
              </Typography>
            </Box>
          </Stack>
          <Box className={`${styles.tableWrap} ${styles.revisionTableWrap}`}>
            <table className={`${styles.table} ${styles.overrideSimpleAmountTable}`}>
              <thead>
                <tr>
                  <th>{t("employee_salary_component", "Component")}</th>
                  <th>{t("employee_salary_default_annual", "Default Annual")}</th>
                  <th>{t("employee_salary_annual", "Annual")}</th>
                  <th>{t("employee_salary_default_monthly", "Default Monthly")}</th>
                  <th>{t("employee_salary_monthly", "Monthly")}</th>
                  <th>{t("employee_salary_percentage_value", "% Value")}</th>
                  <th>{t("employee_salary_remarks", "Remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {lstRevisionOverrideRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>{t("employee_salary_no_component_lines_found", "No salary component lines found.")}</td>
                  </tr>
                ) : lstRevisionOverrideRows.map(({ dicOverride, intOverrideIndex }) => (
                  <tr key={dicOverride.intSalaryComponentID}>
                    <td>
                      <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strComponentName}</Typography>
                    </td>
                    <td>
                      <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultAnnual || "-"}</Typography>
                    </td>
                    <td>
                      <TextField
                        data-testid="employee-salary.revision.override.annual.input"
                        inputProps={{ "data-testid": "employee-salary.revision.override.annual.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decAmountAnnual}
                        placeholder={dicOverride.strDefaultAnnual}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => updateRevisionOverrides(
                          (lstOverrides) => lstOverrides.map((dicRow, intRowIndex) => (
                            intRowIndex === intOverrideIndex
                              ? { ...dicRow, decAmountAnnual: objEvent.target.value }
                              : dicRow
                          )),
                          true
                        )}
                      />
                    </td>
                    <td>
                      <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultMonthly || "-"}</Typography>
                    </td>
                    <td>
                      <TextField
                        data-controlid="employee-salary.revision.override.monthly.input"
                        inputProps={{ "data-controlid": "employee-salary.revision.override.monthly.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decAmountMonthly}
                        placeholder={dicOverride.strDefaultMonthly}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => updateRevisionOverrides(
                          (lstOverrides) => lstOverrides.map((dicRow, intRowIndex) => {
                            if (intRowIndex !== intOverrideIndex) {
                              return dicRow;
                            }
                            const decMonthly = parseOptionalAmount(objEvent.target.value);
                            return {
                              ...dicRow,
                              decAmountMonthly: objEvent.target.value,
                              decAmountAnnual: decMonthly !== null ? formatAmountInput(decMonthly * 12) : ""
                            };
                          }),
                          true
                        )}
                      />
                    </td>
                    <td>
                      <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultAnnual || "-"}</Typography>
                    </td>
                    <td>
                      <TextField
                        data-controlid="employee-salary.revision.override.annual.input"
                        inputProps={{ "data-controlid": "employee-salary.revision.override.annual.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decAmountAnnual}
                        placeholder={dicOverride.strDefaultAnnual}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => updateRevisionOverrides(
                          (lstOverrides) => lstOverrides.map((dicRow, intRowIndex) => (
                            intRowIndex === intOverrideIndex
                              ? { ...dicRow, decAmountAnnual: objEvent.target.value }
                              : dicRow
                          )),
                          true
                        )}
                      />
                    </td>
                    <td>
                      <TextField
                        data-controlid="employee-salary.revision.override.percentage.input"
                        inputProps={{ "data-controlid": "employee-salary.revision.override.percentage.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decPercentageValue}
                        placeholder={dicOverride.strDefaultPercentage}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intOverrideIndex ? { ...dicRow, decPercentageValue: objEvent.target.value } : dicRow)
                        }))}
                      />
                    </td>
                    <td>
                      <TextField
                        data-controlid="employee-salary.revision.override.remarks.input"
                        inputProps={{ "data-controlid": "employee-salary.revision.override.remarks.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.strRemarks}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intOverrideIndex ? { ...dicRow, strRemarks: objEvent.target.value } : dicRow)
                        }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>

        {blnShowFlexiBenefitAllocation ? (
          <Box>
            <Box className={`${styles.tableCard} ${styles.revisionCard}`}>
              <CommonDataGrid
                columns={lstRevisionFlexiColumns}
                rows={lstRevisionFlexiDataGridRows}
                rowIdField="intSalaryComponentID"
                showPaginationSummary
                hideToolbar
                toolbarLeft={(
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                    {t("employee_salary_flexi_benefit_allocation", "Flexi Allocation and Benefits")}
                  </Typography>
                )}
                minTableWidth={1260}
                emptyMessage={t("employee_salary_no_flexi_allocations_found", "No flexi allocation lines found.")}
                testIdPrefix="employee-salary.revision.flexi-allocation-benefits"
                withPaper={false}
              />
            </Box>
          </Box>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "22px",
          p: { xs: 1.5, md: 2 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 46%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography component="h1" sx={{ color: "#0f172a", fontSize: "1.25rem", fontWeight: 800 }}>
                {t("employee_salary_detail_title", "Employee Salary Detail")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                data-controlid="employee-salary.detail.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push(strReturnTo)}
                sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 100,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {t("employee_salary_back_button", "Back")}
              </Button>
              {blnIsRevisionMode ? (
                <>
                  <Button
                    data-controlid="employee-salary.revision.cancel.button"
                    className={styles.secondaryButton}
                    variant="outlined"
                    onClick={handleCancelRevision}
                    disabled={blnSaving}
                    sx={{
                      borderRadius: "14px",
                      height: 38,
                      minHeight: 38,
                      py: 0,
                      px: 2.25,
                      minWidth: 100,
                      fontSize: "0.9rem",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}
                  >
                    {t("cancel", "Cancel")}
                  </Button>
                  <Button
                    data-controlid="employee-salary.revision.save.button"
                    className={styles.primaryButton}
                    startIcon={<SaveRoundedIcon />}
                    onClick={handleSaveRevision}
                    disabled={blnSaving}
                    sx={{
                      borderRadius: "14px",
                      height: 38,
                      minHeight: 38,
                      py: 0,
                      px: 2.25,
                      minWidth: 100,
                      fontSize: "0.9rem",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}
                  >
                    {blnSaving
                      ? t("employee_salary_saving", "Saving...")
                      : t("employee_salary_save_revision", "Save Revision")}
                  </Button>
                </>
              ) : !blnEffectiveViewMode ? (
                <>
                  {blnCanUnassignSalary ? (
                    <Button
                      data-controlid="employee-salary.detail.unassign.button"
                      className={styles.secondaryButton}
                      variant="outlined"
                      color="warning"
                      startIcon={<RemoveCircleOutlineRoundedIcon />}
                      sx={{
                        borderRadius: "14px",
                        height: 38,
                        minHeight: 38,
                        py: 0,
                        px: 2.25,
                        minWidth: 100,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        "& .MuiButton-startIcon": {
                          mr: 0.75,
                          "& svg": {
                            fontSize: "1rem"
                          }
                        }
                      }}
                      onClick={() =>
                        setObjConfirmDialog({
                          strTitle: t("employee_salary_unassign_title", "Unassign Salary"),
                          strMessage: t(
                            "employee_salary_unassign_message",
                            "Are you sure you want to remove the current salary assignment for this employee?"
                          ),
                          strConfirmLabel: t("employee_salary_unassign_button", "Unassign Salary")
                        })
                      }
                    >
                      {t("employee_salary_unassign_button", "Unassign Salary")}
                    </Button>
                  ) : null}
                  {blnCanOpenAssignRevise ? (
                    <Button
                      data-controlid="employee-salary.detail.assign-revise.button"
                      className={styles.primaryButton}
                      startIcon={<HistoryRoundedIcon />}
                      onClick={handleOpenRevisionDialog}
                      disabled={blnSaving}
                      sx={{
                        borderRadius: "14px",
                        height: 38,
                        minHeight: 38,
                        py: 0,
                        px: 2.25,
                        minWidth: 100,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        "& .MuiButton-startIcon": {
                          mr: 0.75,
                          "& svg": {
                            fontSize: "1rem"
                          }
                        }
                      }}
                    >
                      {t("employee_salary_assign_revise_salary", "Assign / Revise Salary")}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </Stack>
          </Stack>

          {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
          <CommonEditModeBanner
            blnReadOnly={blnEffectiveViewMode}
            strReadOnlyMessage={t("employee_salary_read_only_mode", "You have view-only access for Employee Salary.")}
          />
          {strPayrollLockMessage ? <Alert severity="warning">{strPayrollLockMessage}</Alert> : null}
          {(objDetail?.lstWarnings ?? []).map((strWarning, intIndex) => (
            <Alert key={`${strWarning}-${intIndex}`} severity="warning">{strWarning}</Alert>
          ))}
          {lstValidationMessages.map((strMessage) => (
            <Alert key={strMessage} severity="error">{strMessage}</Alert>
          ))}
        </Stack>
      </Paper>

      <Paper
        sx={{
          background: "#fff",
          border: "1px solid rgba(187, 213, 232, 0.7)",
          borderRadius: "var(--app-card-radius)",
          boxShadow: "var(--app-shadow-soft)",
          flexShrink: 0,
          overflow: "hidden",
          p: 1.1,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.5, md: 1 },
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          }}
        >
          <Stack spacing={1.2} sx={{ order: 4 }}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#e7f5ec", color: "#15803d", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <CalendarMonthOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_ctc_annual", "CTC Annual")}</Typography>
                <Typography sx={{ color: "#155eef", fontSize: "1.02rem", fontWeight: 900, whiteSpace: "nowrap" }}>{formatCurrency(dicSalarySummaryMetrics.decAnnualCtc, strCurrencyCode)}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#fff4e5", color: "#b45309", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <CalendarMonthOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_salary_revised_on", "Salary Revised On")}</Typography>
                <Typography sx={{ color: "#172b4d", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom ?? objDetail?.objAssignedStructure?.dtEffectiveFrom ?? null)}
                </Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack spacing={1.2} sx={{ order: 2 }}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#eaf0ff", color: "#155eef", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_gross_annual", "Gross Annual")}</Typography>
                <Typography sx={{ color: "#155eef", fontSize: "1.02rem", fontWeight: 900, whiteSpace: "nowrap" }}>{formatCurrency(decGrossAnnual, strCurrencyCode)}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#eaf0ff", color: "#155eef", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_gross_monthly", "Gross Monthly")}</Typography>
                <Typography sx={{ color: "#172b4d", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(dicSalarySummaryMetrics.decGrossMonthly, strCurrencyCode)}</Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack spacing={1.2} sx={{ order: 3 }}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#f1eafe", color: "#7c3aed", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <SavingsOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_net_annual", "Net Annual")}</Typography>
                <Typography sx={{ color: "#155eef", fontSize: "1.02rem", fontWeight: 900, whiteSpace: "nowrap" }}>{formatCurrency(decNetAnnual, strCurrencyCode)}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#f1eafe", color: "#7c3aed", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <SavingsOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_net_monthly", "Net Monthly")}</Typography>
                <Typography sx={{ color: "#172b4d", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(decNetMonthly, strCurrencyCode)}</Typography>
              </Box>
            </Stack>
          </Stack>

          <Stack spacing={1.2} sx={{ order: 1 }}>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#eaf3ff", color: "#1677ff", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <BadgeOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_employee_and_code", "Employee - Code")}</Typography>
                <Typography sx={{ color: "#172b4d", fontSize: "0.9rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {objDetail?.objEmployeeSummary
                    ? `${objDetail.objEmployeeSummary.strEmployeeName} - ${objDetail.objEmployeeSummary.strEmployeeCode}`
                    : "-"}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#eef2ff", color: "#4f46e5", display: "grid", flexShrink: 0, placeItems: "center" }}>
                <ApartmentOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>{t("employee_salary_assigned_salary_structure", "Assigned Salary Structure")}</Typography>
                <Typography sx={{ color: "#172b4d", fontSize: "0.9rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {objDetail?.objAssignedStructure?.strStructureName ?? t("employee_salary_not_assigned", "Not assigned")}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Paper>

    {blnIsRevisionMode ? (
        <Box className={`${styles.tableCard} ${styles.revisionCard}`} sx={{ px: 2.25, py: 3 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <TextField
              data-controlid="employee-salary.revision.salary-structure.select"
              inputProps={{ "data-controlid": "employee-salary.revision.salary-structure.select" }}
              select
              label={t("employee_salary_structure_field", "Salary structure")}
              value={dicRevisionForm.intSalaryStructureID}
              onChange={(objEvent) => handleSalaryStructureChange(objEvent.target.value)}
              required
            >
              <MenuItem data-controlid="employee-salary.revision.salary-structure.select.option" value="">{t("employee_salary_select", "Select")}</MenuItem>
              {(objFormOptions?.lstSalaryStructures ?? []).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`employee-salary.revision.salary-structure.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                  {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              data-controlid="employee-salary.revision.effective-from.input"
              inputProps={{ "data-controlid": "employee-salary.revision.effective-from.input" }}
              type="date"
              label={t("employee_salary_effective_from_field", "Effective from")}
              value={dicRevisionForm.dtEffectiveFrom}
              onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            data-controlid="employee-salary.revision.revision-reason.input"
            inputProps={{ "data-controlid": "employee-salary.revision.revision-reason.input" }}
            label={t("employee_salary_revision_reason_field", "Revision reason")}
            value={dicRevisionForm.strRevisionReason}
            onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, strRevisionReason: objEvent.target.value }))}
            multiline
            sx={{ mt: 1.5, mb: 1 }}
            fullWidth
          />
        </Box>
      ) : null}

      {blnIsRevisionMode ? (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 4fr) minmax(0, 1fr)" } }}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Box className={`${styles.tableCard} ${styles.revisionCard}`}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {t("employee_salary_override_handling", "Employee Salary Overrides")}
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem", mt: 0.25 }}>
                  {t(
                    "employee_salary_override_help",
                    "Only employee-specific value overrides can be edited here. Structure-driven category, CTC treatment, tax treatment, reimbursement setup, wage type, and flexi role remain read-only."
                  )}
                </Typography>
              </Box>
            </Stack>
            <Box className={`${styles.tableWrap} ${styles.revisionTableWrap}`}>
              <table className={`${styles.table} ${styles.overrideDetailedAmountTable}`}>
                <thead>
                  <tr>
                    <th>{t("employee_salary_component", "Component")}</th>
                    <th>{t("employee_salary_value_source", "Value Source")}</th>
                    <th>{t("employee_salary_formula", "Formula")}</th>
                    <th>{t("employee_salary_default_annual", "Default Annual")}</th>
                    <th>{t("employee_salary_revised_annual", "Revised Annual")}</th>
                    <th>{t("employee_salary_default_monthly", "Default Monthly")}</th>
                    <th>{t("employee_salary_revised_monthly", "Revised Monthly")}</th>
                    <th>{t("employee_salary_percentage_value", "% Value")}</th>
                    <th>{t("employee_salary_basis_component", "Basis Component")}</th>
                    <th>{t("employee_salary_remarks", "Remarks")}</th>
                  </tr>
                </thead>
              <tbody>
                {lstRevisionOverrideRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={10}>{t("employee_salary_no_component_lines_found", "No salary component lines found.")}</td>
                  </tr>
                ) : lstRevisionOverrideRows.map(({ dicOverride, intOverrideIndex }) => (
                    <tr key={dicOverride.intSalaryComponentID}>
                      <td>
                        <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strComponentName}</Typography>
                      </td>
                      <td>
                        <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strValueSource || "-"}</Typography>
                      </td>
                      <td>
                        <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strFormulaExpression || "-"}</Typography>
                      </td>
                      <td>
                        <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultAnnual || "-"}</Typography>
                      </td>
                      <td>
                        <TextField
                          data-testid="employee-salary.revision.override.annual.input"
                          inputProps={{ "data-testid": "employee-salary.revision.override.annual.input", "data-row-key": String(dicOverride.intSalaryComponentID), inputMode: "decimal" }}
                        value={dicOverride.decAmountAnnual}
                        placeholder={dicOverride.strDefaultAnnual}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride || usesAutoCalculatedOverrideValue(dicOverride.strValueSource)}
                        onChange={(objEvent) => updateRevisionOverrides(
                          (lstOverrides) => lstOverrides.map((dicRow, intRowIndex) => {
                            if (intRowIndex !== intOverrideIndex) {
                              return dicRow;
                            }
                            const strSanitizedAnnualValue = sanitizeDecimalInput(objEvent.target.value);
                            const decAnnual = parseOptionalAmount(strSanitizedAnnualValue);
                            return {
                              ...dicRow,
                              decAmountAnnual: strSanitizedAnnualValue,
                              decAmountMonthly: decAnnual !== null ? formatAmountInput(decAnnual / 12) : ""
                            };
                          }),
                          true
                        )}
                      />
                    </td>
                      <td>
                        <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultMonthly || "-"}</Typography>
                      </td>
                      <td>
                        <TextField
                          data-controlid="employee-salary.revision.override.monthly.input"
                          inputProps={{ "data-controlid": "employee-salary.revision.override.monthly.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decAmountMonthly}
                        placeholder={dicOverride.strDefaultMonthly}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled
                      />
                    </td>
                    <td>
                      <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.decPercentageValue || dicOverride.strDefaultPercentage || "-"}</Typography>
                    </td>
                    <td>
                      <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strBasisComponentName || "-"}</Typography>
                    </td>
                    <td>
                      <TextField
                          data-controlid="employee-salary.revision.override.remarks.input"
                          inputProps={{ "data-controlid": "employee-salary.revision.override.remarks.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                          value={dicOverride.strRemarks}
                          size="small"
                          sx={objOverrideValueFieldSx}
                          disabled={!dicOverride.blnAllowManualOverride}
                          onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                            ...dicPrev,
                            lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intOverrideIndex ? { ...dicRow, strRemarks: objEvent.target.value } : dicRow)
                          }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
          {blnShowFlexiBenefitAllocation ? (
            <Box className={`${styles.tableCard} ${styles.revisionCard}`}>
              <CommonDataGrid
                columns={lstRevisionFlexiCompactColumns}
                rows={lstRevisionFlexiCompactDataGridRows}
                rowIdField="intSalaryComponentID"
                showPaginationSummary
                hideToolbar
                toolbarLeft={(
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                    {t("employee_salary_flexi_benefit_allocation", "Flexi Allocation and Benefits")}
                  </Typography>
                )}
                minTableWidth={1020}
                emptyMessage={t("employee_salary_no_flexi_allocations_found", "No flexi allocation lines found.")}
                testIdPrefix="employee-salary.revision.flexi-allocation-benefits-compact"
                withPaper={false}
              />
            </Box>
          ) : null}
        </Stack>
        <Stack spacing={1.5} sx={{ alignSelf: "start", minWidth: 0 }}>
        <Paper variant="outlined" sx={{ alignSelf: "start", border: "1px solid rgba(187, 213, 232, 0.7)", borderRadius: "var(--app-card-radius)", boxShadow: "var(--app-shadow-soft)", p: 2 }}>
          <Stack spacing={1.25}>
            {dicRevisionForm.intSalaryStructureID !== "" ? (
            <>
            <Box sx={{ background: "#e7f8ed", borderRadius: "6px", px: 1.25, py: 1, mt: 1 }}>
              <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
                {t("employee_salary_flexi_pay_declaration", "Flexi Pay Declaration")}
              </Typography>
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_flexi_basket_available", "Flexi Bucket Available")}</Typography>
              <Typography sx={{ color: "#172554", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decFlexiPayAllocationAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_declared_flexi", "Approved / Declared Flexi")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#dc2626", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decDialogFlexiAllocated, strCurrencyCode)}</Typography>
                <KeyboardArrowDownRoundedIcon sx={{ color: "#dc2626", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_remaining_balance", "Residual Taxable")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionFlexiBalanceAnnual, strCurrencyCode)}</Typography>
                <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_net_payroll_impact_monthly", "Estimated Monthly Payroll Impact")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionNetPayrollImpactMonthly, strCurrencyCode)}</Typography>
                <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Box sx={{ background: "#fff7ed", borderRadius: "6px", px: 1.25, py: 1, mt: 1 }}>
              <Typography sx={{ color: "#9a3412", fontSize: "0.82rem", fontWeight: 800 }}>
                {t("employee_salary_wage_breakdown_preview", "Wage Breakdown Preview")}
              </Typography>
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Wage Components Total</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicResolvedRevisionSalarySummaryMetrics.decWageAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Non-Wage Components Total</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicResolvedRevisionSalarySummaryMetrics.decNonWageAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Wage % of CTC</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{dicResolvedRevisionSalarySummaryMetrics.decWagePercentOfCtc.toFixed(2)}%</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Minimum Required Wage</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicResolvedRevisionSalarySummaryMetrics.decMinimumRequiredWageAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Deemed Wage Shortfall</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicResolvedRevisionSalarySummaryMetrics.decDeemedWageShortfallAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Deemed Wage for Statutory Calculation</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicResolvedRevisionSalarySummaryMetrics.decDeemedWageAnnual, strCurrencyCode)}</Typography>
            </Stack>
            </>
            ) : null}
            <Box sx={{ alignItems: "center", background: "#e8f1ff", borderRadius: "6px", display: "flex", justifyContent: "space-between", gap: 1, px: 1.25, py: 1 }}>
              <Box sx={{ alignItems: "center", display: "flex", gap: 0.6, minWidth: 0 }}>
                <Typography sx={{ color: "#172554", fontSize: "0.95rem", fontWeight: 800 }}>
                  {t("employee_salary_it_declaration", "IT Declaration")}
                </Typography>
                <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16 }} />
              </Box>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 800, flexShrink: 0, textAlign: "right" }}>
                {formatTaxRegime(objItDeclarationSummary?.strTaxRegime)}
              </Typography>
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>
                {t("employee_salary_declared_it_declaration", "Declared IT Declaration")}
              </Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>
                {formatCurrency(objItDeclarationSummary?.decDeclaredAmount ?? 0, strCurrencyCode)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>
                {t("employee_salary_approved_it_declaration", "Approved IT Declaration")}
              </Typography>
              <Typography sx={{ color: "#059669", fontSize: "0.84rem", fontWeight: 800 }}>
                {formatCurrency(objItDeclarationSummary?.decApprovedAmount ?? 0, strCurrencyCode)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
        </Stack>
        </Box>
      ) : null}

      {!blnIsRevisionMode && blnHasAssignedSalary ? (
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 4fr) minmax(260px, 1fr)" }, alignItems: "start" }}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Box className={styles.tableCard} id="flexi-component">
          <CommonDataGrid
            columns={lstComponentColumns}
            rows={lstComponentDataGridRows}
            rowIdField="intEmployeeSalaryComponentID"
            showPaginationSummary
            hideToolbar
            toolbarLeft={(
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                {t("employee_salary_salary_structure", "Salary Structure")}
              </Typography>
            )}
            minTableWidth={980}
            emptyMessage={t("employee_salary_no_component_lines_found", "No salary component lines found.")}
            testIdPrefix="employee-salary.detail.salary-structure"
            withPaper={false}
          />
        </Box>

        {(
          <Box className={styles.tableCard}>
            {!blnHasFlexiBucket ? (
              <>
                <Typography sx={{ fontWeight: 800, color: "#0f172a", px: 1.5, pt: 1.25, minHeight: 40, display: "flex", alignItems: "center" }}>
                  {t("employee_salary_flexi_benefit_allocation", "Flexi Allocation and Benefits")}
                </Typography>
                <Alert severity={blnHasFlexiAllocations ? "error" : "info"} sx={{ mb: 1.25 }}>
                  {blnHasFlexiAllocations
                    ? t("employee_salary_flexi_allocation_without_bucket", "Flexi allocation cannot exist without Flexi Bucket amount.")
                    : t("employee_salary_flexi_not_enabled", "Flexi Pay is not enabled for this employee's salary structure.")}
                </Alert>
              </>
            ) : null}
            {blnHasFlexiBucket ? (
            <CommonDataGrid
              columns={lstFlexiColumns}
              rows={lstFlexiRows}
              rowIdField="intSalaryComponentID"
              showPaginationSummary
              hideToolbar
              toolbarLeft={(
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                    {t("employee_salary_eligible_flexi_components", "Flexi Allocation and Benefits")}
                  </Typography>
                  <Button
                    data-controlid="employee-salary.detail.flexi-allocation-benefits.review.button"
                    size="small"
                    variant="contained"
                    className={styles.primaryButton}
                    disabled={!intFlexiDeclarationID}
                    onClick={() => {
                      if (!intFlexiDeclarationID) {
                        return;
                      }
                      const objParams = new URLSearchParams();
                      objParams.set("intDeclarationID", String(intFlexiDeclarationID));
                      objParams.set("source", "employee_salary");
                      objParams.set("returnTo", `/employee-salary/${strEmployeeID}`);
                      objRouter.push(`/salary/flexi-pay-declaration?${objParams.toString()}`);
                    }}
                  >
                    {strFlexiActionLabel}
                  </Button>
                </Stack>
              )}
              minTableWidth={1130}
              emptyMessage={t("employee_salary_no_flexi_components_found", "No flexi components found.")}
              testIdPrefix="employee-salary.detail.flexi-allocation-benefits"
              withPaper={false}
            />
            ) : null}
          </Box>
        )}
        </Stack>
        <Paper variant="outlined" sx={{ alignSelf: "start", border: "1px solid rgba(187, 213, 232, 0.7)", borderRadius: "var(--app-card-radius)", boxShadow: "var(--app-shadow-soft)", p: 2 }}>
          {/* <Box sx={{ background: "#eef3fb", borderRadius: "6px", px: 1.25, py: 1, mb: 1.5 }}>
            <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
              {t("employee_salary_current_before_declaration", "Flexi Declaration Status")}
            </Typography>
          </Box> */}

          <Stack spacing={1.25}>
            <Box sx={{ background: "#e7f8ed", borderRadius: "6px", px: 1.25, py: 1, mt: 1 }}>
              <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
                {t("employee_salary_flexi_pay_declaration", "Flexi Pay Declaration")}
              </Typography>
            </Box>

            {blnHasFlexiBucket ? (
            <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_flexi_basket_available", "Flexi Bucket Available")}</Typography>
              <Typography sx={{ color: "#172554", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decFlexiBucketAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_declared_flexi", "Approved / Declared Flexi")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#dc2626", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decApprovedFlexiAnnual, strCurrencyCode)}</Typography>
                <KeyboardArrowDownRoundedIcon sx={{ color: "#dc2626", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_remaining_balance", "Residual Taxable")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: dicSalarySummaryMetrics.decResidualTaxableAnnual < 0 ? "#dc2626" : "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decResidualTaxableAnnual, strCurrencyCode)}</Typography>
                <KeyboardArrowUpRoundedIcon sx={{ color: dicSalarySummaryMetrics.decResidualTaxableAnnual < 0 ? "#dc2626" : "#059669", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_net_payroll_impact_monthly", "Estimated Monthly Payroll Impact")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decResidualTaxableMonthly, strCurrencyCode)}</Typography>
                <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
              </Stack>
            </Stack>
            </>
            ) : (
              <Alert severity="info">{t("employee_salary_no_flexi_bucket_available", "No Flexi Bucket is available for this employee.")}</Alert>
            )}
            {blnCanViewWageBreakdownPreview ? (
              <>
                <Box sx={{ background: "#fff7ed", borderRadius: "6px", px: 1.25, py: 1, mt: 1 }}>
                  <Typography sx={{ color: "#9a3412", fontSize: "0.82rem", fontWeight: 800 }}>
                    Wage Breakdown Preview
                  </Typography>
                </Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Wage Total</Typography>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decWageAnnual, strCurrencyCode)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Non-Wage Total</Typography>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decNonWageAnnual, strCurrencyCode)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Wage % of CTC</Typography>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{dicSalarySummaryMetrics.decWagePercentOfCtc.toFixed(2)}%</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Minimum Required Wage</Typography>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decMinimumRequiredWageAnnual, strCurrencyCode)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Deemed Wage Shortfall</Typography>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decDeemedWageShortfallAnnual, strCurrencyCode)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>Deemed Wage Base</Typography>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicSalarySummaryMetrics.decDeemedWageAnnual, strCurrencyCode)}</Typography>
                </Stack>
              </>
            ) : null}

            <Box sx={{ alignItems: "center", background: "#e8f1ff", borderRadius: "6px", display: "flex", justifyContent: "space-between", gap: 1, mt: 1, px: 1.25, py: 1 }}>
              <Box sx={{ alignItems: "center", display: "flex", gap: 0.6, minWidth: 0 }}>
                <Typography sx={{ color: "#172554", fontSize: "0.95rem", fontWeight: 800 }}>
                  {t("employee_salary_it_declaration", "IT Declaration")}
                </Typography>
                <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16 }} />
              </Box>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 800, flexShrink: 0, textAlign: "right" }}>
                {formatTaxRegime(objItDeclarationSummary?.strTaxRegime)}
              </Typography>
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>
                {t("employee_salary_declared_it_declaration", "Declared IT Declaration")}
              </Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>
                {formatCurrency(objItDeclarationSummary?.decDeclaredAmount ?? 0, strCurrencyCode)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>
                {t("employee_salary_approved_it_declaration", "Approved IT Declaration")}
              </Typography>
              <Typography sx={{ color: "#059669", fontSize: "0.84rem", fontWeight: 800 }}>
                {formatCurrency(objItDeclarationSummary?.decApprovedAmount ?? 0, strCurrencyCode)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>
      ) : null}

      {lstHistoryRows.length > 0 ? (
      <Box>
        <Box className={styles.tableCard}>
          <CommonDataGrid
            columns={lstHistoryColumns}
            rows={lstHistoryDataGridRows}
            rowIdField="intEmployeeSalaryStructureID"
            showPaginationSummary
            hideToolbar
            toolbarLeft={(
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                {t("employee_salary_revision_history", "Revision History")}
              </Typography>
            )}
            minTableWidth={1110}
            emptyMessage={t("employee_salary_no_revisions_found", "No salary revisions found.")}
            testIdPrefix="employee-salary.detail.revision-history"
            withPaper={false}
          />
        </Box>
      </Box>
      ) : null}

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle ?? ""}
        strMessage={objConfirmDialog?.strMessage ?? ""}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? t("confirm", "Confirm")}
        blnConfirmDisabled={blnSaving}
        blnCancelDisabled={blnSaving}
        onClose={() => setObjConfirmDialog(null)}
        onConfirm={handleConfirmUnassign}
      />
    </Stack>
  );
}



