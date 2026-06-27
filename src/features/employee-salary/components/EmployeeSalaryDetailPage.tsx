"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import styles from "@/components/master/MasterScreen.module.css";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationContextRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";
import type {
  EmployeeSalaryComponentLine,
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFlexiAllocationFormValue,
  EmployeeSalaryFlexiAllocationSummary,
  EmployeeSalaryFormOptions,
  EmployeeSalaryHistoryRecord,
  EmployeeSalaryOverrideFormValue,
  EmployeeSalaryRevisionFormValues
} from "@/features/employee-salary/types";

type EmployeeSalaryDetailPageProps = {
  intEmployeeID: number;
  blnViewMode?: boolean;
  blnRevisionMode?: boolean;
  strReturnTo?: string;
};

type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
};

const lstRowsPerPageOptions = [10, 20, 50];
const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE-SALARY", "EMPLOYEE_SALARIES"];

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function formatCurrency(decValue: number | null, strCurrencyCode = "INR") {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0
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

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${String(intFyStartYear + 1).slice(-2)}`;
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

const objSummaryValueRowSx = {
  alignItems: "center",
  columnGap: 2,
  display: "grid",
  gridTemplateColumns: { xs: "minmax(120px, 42%) minmax(0, 1fr)", sm: "minmax(132px, 44%) minmax(0, 1fr)" },
};

type ComponentGridRow = {
  intEmployeeSalaryComponentID: number;
  strComponentName: string;
  strCategory: string;
  strValueType: string;
  strMonthly: string;
  strAnnual: string;
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
  blnIsCurrent: boolean;
  strCurrent: string;
  strReason: string;
};

type FlexiGridRow = {
  intSalaryComponentID: number;
  strComponentName: string;
  strAnnualLimit: string;
  strMonthlyLimit: string;
  strAllocationAnnual: string;
  strAllocationMonthly: string;
  strApprovedAnnual: string;
  strApprovedMonthly: string;
  strUtilizedAnnual: string;
  strProofRequired: string;
  strTaxTreatment: string;
  strRemainingAnnualBalance: string;
  strStatus: string;
  strSource: string;
  strRemarks: string;
};

type RevisionBreakdownComponentRow = {
  intSalaryComponentID: number;
  strComponentName: string;
  decAnnualAmount: number;
  decPercentOfCtc: number | null;
};

type OverrideSourceLine = {
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName?: string | null;
  blnAllowManualOverride: boolean;
  decAmountMonthly?: number | null;
  decAmountAnnual?: number | null;
  decFixedAmount?: number | null;
  decPercentageValue?: number | null;
  decDefaultAmountMonthly?: number | null;
  decDefaultAmountAnnual?: number | null;
  decDefaultPercentageValue?: number | null;
};

type ExistingOverrideLine = {
  intSalaryComponentID: number;
  decAmountMonthly?: number | string | null;
  decAmountAnnual?: number | string | null;
  decPercentageValue?: number | string | null;
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

type SnapshotWithAssignmentSource = NonNullable<EmployeeSalaryDetailRecord["objCurrentSalarySnapshot"]> & {
  strAssignmentSource?: string | null;
  strRevisionStatus?: string | null;
  strSource?: string | null;
};

type FlexiAllocationLineWithStatus = EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"][number] & {
  decApprovedAnnualAmount?: number | string | null;
  decApprovedMonthlyAmount?: number | string | null;
  decUtilizedAnnualAmount?: number | string | null;
  strStatus?: string | null;
  strSource?: string | null;
  strRemarks?: string | null;
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
  return Number.isFinite(decValue) ? String(decValue) : "";
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

function getNumberValue(objValue: number | string | null | undefined) {
  if (objValue === null || typeof objValue === "undefined" || objValue === "") {
    return 0;
  }
  const decValue = typeof objValue === "number" ? objValue : Number(String(objValue).replace(/,/g, ""));
  return Number.isFinite(decValue) ? decValue : 0;
}

function normalizeAmountText(strValue: string) {
  return strValue.replace(/,/g, "");
}

function normalizeAmountTextOrDefault(strValue: string, objDefaultValue: number | string | null | undefined) {
  const strNormalizedValue = normalizeAmountText(strValue);
  return strNormalizedValue.trim() ? strNormalizedValue : normalizeAmountText(formatOptionalDefaultValue(objDefaultValue));
}

function formatPercentValue(decValue: number | null) {
  return decValue === null || !Number.isFinite(decValue) ? "" : `(${decValue.toFixed(2)}%)`;
}

function isFlexiPayComponentName(strValue: string) {
  return normalizeSelectToken(strValue) === "flexipay";
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

function normalizeAssignmentSource(strSource: string | null | undefined) {
  const strToken = normalizeSelectToken(strSource ?? "");
  if (strToken === "hroverride" || strToken === "override") {
    return "HR Override";
  }
  if (strToken === "imported" || strToken === "import") {
    return "Imported";
  }
  if (strToken === "revised" || strToken === "revision") {
    return "Revised";
  }
  return "Structure";
}

function normalizeFlexiSource(strSource: string | null | undefined) {
  const strToken = normalizeSelectToken(strSource ?? "");
  if (strToken === "hroverride" || strToken === "override") return "HR Override";
  if (strToken === "essdeclaration" || strToken === "declaration") return "ESS Declaration";
  if (strToken === "payrolllock" || strToken === "locked") return "Payroll Lock";
  if (strToken === "imported" || strToken === "import") return "Imported";
  return "Structure Default";
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
  return (
    getNumberValue(dicLine.decAllocationAnnual) > 0 ||
    getNumberValue(dicLine.decAllocationMonthly) > 0 ||
    getNumberValue(dicLine.decApprovedAnnualAmount) > 0 ||
    getNumberValue(dicLine.decApprovedMonthlyAmount) > 0 ||
    getNumberValue(dicLine.decUtilizedAnnualAmount) > 0
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
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryOverrideFormValue[] {
  const dicExistingOverrideByComponentID = new Map(
    lstExistingOverrides
      .filter((dicOverride) => dicOverride.blnIsOverride !== false)
      .map((dicOverride) => [dicOverride.intSalaryComponentID, dicOverride])
  );

  return lstSourceLines.map((dicLine) => {
    const dicExistingOverride = dicExistingOverrideByComponentID.get(dicLine.intSalaryComponentID);
    const dicReusableOverride = dicLine.blnAllowManualOverride ? dicExistingOverride : null;
    const decDefaultMonthly = dicLine.decDefaultAmountMonthly ?? dicLine.decAmountMonthly ?? dicLine.decFixedAmount;
    const strDefaultMonthly = formatOptionalDefaultValue(
      decDefaultMonthly
    );
    const strDefaultAnnual = formatOptionalDefaultValue(
      dicLine.decDefaultAmountAnnual ??
      dicLine.decAmountAnnual ??
      (decDefaultMonthly != null ? Number(decDefaultMonthly) * 12 : null)
    );
    return {
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentName:
        dicLine.strComponentName ??
        dicLine.strComponentCode ??
        `${fnTranslate?.("employee_salary_component", "Component") ?? "Component"} ${dicLine.intSalaryComponentID}`,
      blnAllowManualOverride: dicLine.blnAllowManualOverride,
      decAmountMonthly: formatOptionalDefaultValue(dicReusableOverride?.decAmountMonthly),
      decAmountAnnual: formatOptionalDefaultValue(dicReusableOverride?.decAmountAnnual),
      decPercentageValue: formatOptionalDefaultValue(dicReusableOverride?.decPercentageValue),
      strDefaultMonthly,
      strDefaultAnnual,
      strDefaultPercentage: formatOptionalDefaultValue(dicLine.decDefaultPercentageValue ?? dicLine.decPercentageValue),
      strRemarks: dicReusableOverride?.strRemarks ?? ""
    };
  });
}

function buildFlexiAllocationRows(
  lstSourceLines: FlexiSourceLine[],
  _lstExistingAllocations: EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"] = [],
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryFlexiAllocationFormValue[] {
  void _lstExistingAllocations;
  return lstSourceLines.map((dicLine) => {
    const decAnnualLimit =
      dicLine.decAnnualLimit ??
      dicLine.decFlexiMaxYearlyAmount ??
      dicLine.decAnnualLimitAmount ??
      dicLine.decReimbursementMaxClaimYearlyLimit ??
      null;
    const decMonthlyLimit =
      dicLine.decMonthlyLimit ??
      dicLine.decFlexiMaxMonthlyAmount ??
      dicLine.decMonthlyLimitAmount ??
      dicLine.decReimbursementMaxClaimMonthlyLimit ??
      (decAnnualLimit != null ? decAnnualLimit / 12 : null);
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
      decAllocationMonthly: "",
      decAllocationAnnual: ""
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
    blnProofRequired: dicLine.blnProofRequired ?? dicComponent.blnProofRequired,
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
    blnProofRequired: dicComponent.blnProofRequired,
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

export default function EmployeeSalaryDetailPage({ intEmployeeID, blnViewMode = false, blnRevisionMode = false, strReturnTo = "/employee-salary" }: EmployeeSalaryDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeSalaryLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objFlexiDeclarationContext, setObjFlexiDeclarationContext] = useState<FlexiDeclarationContextRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeSalaryFormOptions | null>(null);
  const [lstSalaryComponents, setLstSalaryComponents] = useState<SalaryComponentApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [blnIsRevisionMode, setBlnIsRevisionMode] = useState(blnRevisionMode);
  const [dicRevisionForm, setDicRevisionForm] = useState<EmployeeSalaryRevisionFormValues>(buildRevisionForm(null));
  const [intComponentPage, setIntComponentPage] = useState(1);
  const [intComponentRowsPerPage, setIntComponentRowsPerPage] = useState(10);
  const [intHistoryPage, setIntHistoryPage] = useState(1);
  const [intHistoryRowsPerPage, setIntHistoryRowsPerPage] = useState(10);
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanSubmit = canDoAny("submit") || canDoAny("save");
  const blnCanMutate = blnCanAdd || blnCanEdit || blnCanSubmit;
  const blnEffectiveViewMode = blnViewMode || isReadOnly() || (blnCanView && !blnCanMutate);
  const blnCanLoadWorkspace = blnCanView;
  const blnHasAssignedSalary = Boolean(objDetail?.objAssignedStructure);
  const strFinancialYearCode = getCurrentFinancialYearCode();

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
        const [dicDetail, dicFormOptions, dicSalaryComponents, dicFlexiDeclarationContext] = await Promise.all([
          employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID),
          employeeSalaryService.getFormOptions(),
          masterApiService.getSalaryComponents().catch(() => ({ Data: [] as SalaryComponentApiRecord[] })),
          flexiPayDeclarationService.getCurrentDeclaration(strFinancialYearCode).catch(() => null),
        ]);
        if (!blnMounted) {
          return;
        }
        setObjDetail(dicDetail);
        setObjFlexiDeclarationContext(dicFlexiDeclarationContext);
        setObjFormOptions(dicFormOptions);
        setLstSalaryComponents(dicSalaryComponents.Data);
        setDicRevisionForm(buildRevisionForm(dicDetail, dicFormOptions, dicSalaryComponents.Data, t));
      } catch (objError) {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : t("employee_salary_load_detail_failed", "Unable to load employee salary detail.")
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intEmployeeID, strFinancialYearCode, t]);

  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";

  const lstComponentRows: ComponentGridRow[] = useMemo(() => {
    const dicFlexiBucketAmounts = getEmployeeFlexiBucketAmounts(objDetail);
    return (objDetail?.lstComponentLines ?? []).map((dicLine: EmployeeSalaryComponentLine) => {
      const blnIsFlexiBucket = isFlexiBucketLine(dicLine);
      const decLineMonthlyAmount = getNumberValue(dicLine.decAmountMonthly);
      const decLineAnnualAmount = getNumberValue(dicLine.decAmountAnnual);
      const decMonthlyAmount = blnIsFlexiBucket && decLineMonthlyAmount <= 0
        ? dicFlexiBucketAmounts.decMonthlyAmount
        : dicLine.decAmountMonthly;
      const decAnnualAmount = blnIsFlexiBucket && decLineAnnualAmount <= 0
        ? dicFlexiBucketAmounts.decAnnualAmount
        : dicLine.decAmountAnnual;

      return {
        intEmployeeSalaryComponentID: dicLine.intEmployeeSalaryComponentID,
        strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
        strCategory: dicLine.strComponentCategory ?? "-",
        strValueType: dicLine.strComponentValueType,
        strMonthly: formatCurrency(decMonthlyAmount, strCurrencyCode),
        strAnnual: formatCurrency(decAnnualAmount, strCurrencyCode),
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
    return (objDetail?.lstRevisionHistory ?? []).map((dicRow: EmployeeSalaryHistoryRecord) => ({
      intEmployeeSalaryStructureID: dicRow.intEmployeeSalaryStructureID,
      strStructure: dicRow.strStructureName ?? dicRow.strStructureCode ?? "-",
      strEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
      strEffectiveTo: formatDate(dicRow.dtEffectiveTo),
      strGrossMonthly: formatCurrency(dicRow.decGrossMonthly, strCurrencyCode),
      strCtcAnnual: formatCurrency(dicRow.decCtcAnnual, strCurrencyCode),
      blnIsCurrent: dicRow.blnIsCurrent,
      strCurrent: dicRow.blnIsCurrent
        ? t("employee_salary_current", "Current")
        : t("employee_salary_history", "History"),
      strReason: dicRow.strRevisionReason ?? "-"
    }));
  }, [objDetail, t]);

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
  const dicCurrentSalarySnapshot = objDetail?.objCurrentSalarySnapshot as SnapshotWithAssignmentSource | null | undefined;
  const strAssignmentSource = normalizeAssignmentSource(dicCurrentSalarySnapshot?.strAssignmentSource ?? dicCurrentSalarySnapshot?.strSource);
  const strRevisionStatus = dicCurrentSalarySnapshot?.strRevisionStatus ?? (objDetail?.objCurrentSalarySnapshot ? t("employee_salary_current", "Current") : "-");
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
  const decRevisionCurrentCtcAnnual = useMemo(() => {
    const decSnapshotCtcAnnual = objDetail?.objCurrentSalarySnapshot?.decCtcAnnual;
    if (typeof decSnapshotCtcAnnual === "number" && Number.isFinite(decSnapshotCtcAnnual) && decSnapshotCtcAnnual > 0) {
      return decSnapshotCtcAnnual;
    }

    const decCurrentLineTotal = (objDetail?.lstComponentLines ?? []).reduce((decTotal, dicLine) => {
      const decAnnualAmount = Number(dicLine.decAmountAnnual ?? 0);
      return decTotal + (Number.isFinite(decAnnualAmount) && decAnnualAmount > 0 ? decAnnualAmount : 0);
    }, 0);
    if (decCurrentLineTotal > 0) {
      return decCurrentLineTotal;
    }

    return dicRevisionForm.lstOverrides.reduce((decTotal, dicOverride) => {
      const decAnnualAmount = getOverrideAnnualAmount(dicOverride);
      return decTotal + (Number.isFinite(decAnnualAmount) && decAnnualAmount > 0 ? decAnnualAmount : 0);
    }, 0);
  }, [dicRevisionForm.lstOverrides, objDetail]);
  const lstRevisionCurrentBreakdownComponentRows: RevisionBreakdownComponentRow[] = useMemo(() => {
    return (objDetail?.lstComponentLines ?? [])
      .filter((dicLine) =>
        !isFlexiPayComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "") &&
        Number(dicLine.decAmountAnnual ?? 0) > 0
      )
      .map((dicLine) => {
        const decAnnualAmount = Number(dicLine.decAmountAnnual ?? 0);
        return {
          intSalaryComponentID: dicLine.intSalaryComponentID,
          strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
          decAnnualAmount,
          decPercentOfCtc: decRevisionCurrentCtcAnnual > 0 ? (decAnnualAmount / decRevisionCurrentCtcAnnual) * 100 : null
        };
      });
  }, [decRevisionCurrentCtcAnnual, objDetail]);
  const lstRevisionLiveBreakdownComponentRows: RevisionBreakdownComponentRow[] = useMemo(() => {
    const setFlexiAllocationComponentIDs = new Set(
      dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => dicAllocation.intSalaryComponentID)
    );
    return dicRevisionForm.lstOverrides
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
          decPercentOfCtc: decRevisionCurrentCtcAnnual > 0 ? (decAnnualAmount / decRevisionCurrentCtcAnnual) * 100 : null
        };
      })
      .filter((dicRow) => dicRow.decAnnualAmount > 0);
  }, [decRevisionCurrentCtcAnnual, dicRevisionForm.lstFlexiAllocations, dicRevisionForm.lstOverrides]);
  const decRevisionFlexiBalanceAnnual = Math.max(decFlexiPayAllocationAnnual - decDialogFlexiAllocated, 0);
  const decRevisionNetPayrollImpactMonthly = decDialogFlexiAllocated > 0 ? -(decDialogFlexiAllocated / 12) : 0;
  const lstRevisionOverrideRows = useMemo(() => {
    const setFlexiAllocationComponentIDs = new Set(
      dicRevisionForm.lstFlexiAllocations.map((dicAllocation) => dicAllocation.intSalaryComponentID)
    );
    return dicRevisionForm.lstOverrides
      .map((dicOverride, intOverrideIndex) => ({ dicOverride, intOverrideIndex }))
      .filter(({ dicOverride }) => !setFlexiAllocationComponentIDs.has(dicOverride.intSalaryComponentID));
  }, [dicRevisionForm.lstFlexiAllocations, dicRevisionForm.lstOverrides]);

  const lstFlexiRows: FlexiGridRow[] = useMemo(() => {
    const mapDeclarationLinesByComponentID = new Map(
      (objFlexiDeclarationContext?.lstDeclarationLines ?? []).map((dicLine) => [dicLine.intSalaryComponentID, dicLine])
    );
    return objFlexiAllocation.lstAllocationLines
      .filter((dicLine) => !isFlexiBucketAllocationLine(dicLine, objFlexiAllocation))
      .filter((dicLine) => {
        const dicDeclarationLine = mapDeclarationLinesByComponentID.get(dicLine.intSalaryComponentID);
        if (dicDeclarationLine) {
          return getNumberValue(dicDeclarationLine.decDraftDeclaredAnnual) > 0 || getNumberValue(dicDeclarationLine.decMonthlyImpact) > 0;
        }
        return hasEmployeeFlexiAllocation(dicLine as FlexiAllocationLineWithStatus);
      })
      .map((dicLine) => {
        const dicAllocationLine = dicLine as FlexiAllocationLineWithStatus;
        const dicDeclarationLine = mapDeclarationLinesByComponentID.get(dicLine.intSalaryComponentID);
        const decAllocatedAnnual = dicDeclarationLine?.decDraftDeclaredAnnual ?? getNumberValue(dicLine.decAllocationAnnual);
        const decAllocatedMonthly = dicDeclarationLine?.decMonthlyImpact ?? getNumberValue(dicLine.decAllocationMonthly);
        const decApprovedAnnual = dicDeclarationLine?.decDraftApprovedAnnual != null
          ? dicDeclarationLine.decDraftApprovedAnnual
          : (getNumberValue(dicAllocationLine.decApprovedAnnualAmount) || getNumberValue(dicLine.decAllocationAnnual));
        const decApprovedMonthly = dicDeclarationLine?.decDraftApprovedAnnual != null
          ? dicDeclarationLine.decDraftApprovedAnnual / 12
          : (getNumberValue(dicAllocationLine.decApprovedMonthlyAmount) || getNumberValue(dicLine.decAllocationMonthly));
        return {
          intSalaryComponentID: dicLine.intSalaryComponentID,
          strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
          strAnnualLimit: formatOptionalCurrencyValue(dicLine.decAnnualLimit, strCurrencyCode),
          strMonthlyLimit: formatOptionalCurrencyValue(getFlexiMonthlyCap(dicLine), strCurrencyCode),
          strAllocationAnnual: formatCurrency(decAllocatedAnnual, strCurrencyCode),
          strAllocationMonthly: formatCurrency(decAllocatedMonthly, strCurrencyCode),
          strApprovedAnnual: formatCurrency(decApprovedAnnual, strCurrencyCode),
          strApprovedMonthly: formatCurrency(decApprovedMonthly, strCurrencyCode),
          strUtilizedAnnual: formatCurrency(getNumberValue(dicAllocationLine.decUtilizedAnnualAmount), strCurrencyCode),
          strProofRequired: (dicDeclarationLine?.blnProofRequired ?? dicLine.blnProofRequired)
            ? t("employee_salary_yes", "Yes")
            : t("employee_salary_no", "No"),
          strTaxTreatment: dicDeclarationLine?.strTaxTreatment || dicLine.strTaxTreatment || "-",
          strRemainingAnnualBalance: formatOptionalCurrencyValue(dicLine.decBalanceAnnual, strCurrencyCode),
          strStatus: dicDeclarationLine?.strDeclarationItemStatus ?? dicAllocationLine.strStatus ?? t("employee_salary_approved", "Approved"),
          strSource: normalizeFlexiSource(dicDeclarationLine ? "ESS Declaration" : (dicAllocationLine.strSource ?? "Structure Default")),
          strRemarks: dicAllocationLine.strRemarks ?? "-"
        };
      });
  }, [objFlexiAllocation, objFlexiDeclarationContext?.lstDeclarationLines, strCurrencyCode, t]);

  const lstFilteredComponentRows = useMemo(
    () => lstComponentRows.filter((dicRow) => {
      if (dicRow.blnIsFlexiBucket) return true;
      if (dicRow.blnIsFlexiReimbursementOption) return false;
      if (dicRow.blnIsNonCtcReimbursement) return false;
      return true;
    }),
    [lstComponentRows]
  );

  const intComponentPageCount = Math.max(1, Math.ceil(lstFilteredComponentRows.length / intComponentRowsPerPage));
  const intResolvedComponentPage = Math.min(intComponentPage, intComponentPageCount);
  const intComponentStartIndex = (intResolvedComponentPage - 1) * intComponentRowsPerPage;
  const lstVisibleComponentRows = lstFilteredComponentRows.slice(intComponentStartIndex, intComponentStartIndex + intComponentRowsPerPage);

  const intHistoryPageCount = Math.max(1, Math.ceil(lstHistoryRows.length / intHistoryRowsPerPage));
  const intResolvedHistoryPage = Math.min(intHistoryPage, intHistoryPageCount);
  const intHistoryStartIndex = (intResolvedHistoryPage - 1) * intHistoryRowsPerPage;
  const lstVisibleHistoryRows = lstHistoryRows.slice(intHistoryStartIndex, intHistoryStartIndex + intHistoryRowsPerPage);
  const strMinRevisionEffectiveDate = getRevisionMinEffectiveDate(objDetail);

  function handleSalaryStructureChange(strSalaryStructureID: string) {
    const intSalaryStructureID = strSalaryStructureID ? Number(strSalaryStructureID) : "";
    setDicRevisionForm((dicPrev) => {
      if (intSalaryStructureID === "") {
        return {
          ...dicPrev,
          intSalaryStructureID,
          lstOverrides: [],
          lstFlexiAllocations: []
        };
      }

      const dicSelectedStructure = objFormOptions?.lstSalaryStructures.find(
        (dicStructure) => dicStructure.intID === intSalaryStructureID
      );
      const lstStructureComponents = dicSelectedStructure?.lstComponents ?? [];
      const lstFallbackCurrentLines =
        intSalaryStructureID === objDetail?.objAssignedStructure?.intSalaryStructureID
          ? objDetail?.lstComponentLines ?? []
          : [];

      return {
        ...dicPrev,
        intSalaryStructureID,
        lstOverrides: buildOverrideRows(
          lstStructureComponents.length > 0 ? lstStructureComponents : lstFallbackCurrentLines,
          dicPrev.lstOverrides,
          t
        ),
        lstFlexiAllocations: buildFlexiAllocationRows(
          resolveFlexiBenefitAllocationSourceLines(
            lstStructureComponents,
            lstFallbackCurrentLines,
            lstSalaryComponents
          ),
          intSalaryStructureID === objDetail?.objAssignedStructure?.intSalaryStructureID
            ? objFlexiAllocation.lstAllocationLines
            : [],
          t
        )
      };
    });
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
      const dicSavedDetail = await employeeSalaryService.createRevision(intEmployeeID, {
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
      setObjDetail(dicSavedDetail);
      setDicRevisionForm(buildRevisionForm(dicSavedDetail, objFormOptions, lstSalaryComponents, t));
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
      const dicSavedDetail = await employeeSalaryService.unassignSalary(intEmployeeID);
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
      <Stack spacing={2.5} className={styles.revisionContent}>
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
                data-testid="employee-salary.revision.back.button"
                className={styles.secondaryButton}
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push(strReturnTo)}
                disabled={blnSaving}
              >
                {t("employee_salary_back_button", "Back")}
              </Button>
              <Button
                data-testid="employee-salary.revision.save.button"
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
              data-testid="employee-salary.revision.salary-structure.select"
              inputProps={{ "data-testid": "employee-salary.revision.salary-structure.select" }}
              select
              label={t("employee_salary_structure_field", "Salary structure")}
              value={dicRevisionForm.intSalaryStructureID}
              onChange={(objEvent) => handleSalaryStructureChange(objEvent.target.value)}
            >
              <MenuItem data-testid="employee-salary.revision.salary-structure.select.option" value="">{t("employee_salary_select", "Select")}</MenuItem>
              {(objFormOptions?.lstSalaryStructures ?? []).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-testid={`employee-salary.revision.salary-structure.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                  {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              data-testid="employee-salary.revision.effective-from.input"
              inputProps={{ "data-testid": "employee-salary.revision.effective-from.input" }}
              type="date"
              label={t("employee_salary_effective_from_field", "Effective from")}
              value={dicRevisionForm.dtEffectiveFrom}
              onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            data-testid="employee-salary.revision.revision-reason.input"
            inputProps={{ "data-testid": "employee-salary.revision.revision-reason.input" }}
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
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_component", "Component")}</th>
                  <th>{t("employee_salary_default_monthly", "Default Monthly")}</th>
                  <th>{t("employee_salary_monthly", "Monthly")}</th>
                  <th>{t("employee_salary_default_annual", "Default Annual")}</th>
                  <th>{t("employee_salary_annual", "Annual")}</th>
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
                      <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultMonthly || "-"}</Typography>
                    </td>
                    <td>
                      <TextField
                        data-testid="employee-salary.revision.override.monthly.input"
                        inputProps={{ "data-testid": "employee-salary.revision.override.monthly.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decAmountMonthly}
                        placeholder={dicOverride.strDefaultMonthly}
                        size="small"
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => {
                            if (intRowIndex !== intOverrideIndex) {
                              return dicRow;
                            }
                            const decMonthly = parseOptionalAmount(objEvent.target.value);
                            return {
                              ...dicRow,
                              decAmountMonthly: objEvent.target.value,
                              decAmountAnnual: decMonthly !== null ? String(decMonthly * 12) : ""
                            };
                          })
                        }))}
                      />
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
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intOverrideIndex ? { ...dicRow, decAmountAnnual: objEvent.target.value } : dicRow)
                        }))}
                      />
                    </td>
                    <td>
                      <TextField
                        data-testid="employee-salary.revision.override.percentage.input"
                        inputProps={{ "data-testid": "employee-salary.revision.override.percentage.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        value={dicOverride.decPercentageValue}
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
                        data-testid="employee-salary.revision.override.remarks.input"
                        inputProps={{ "data-testid": "employee-salary.revision.override.remarks.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
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
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {t("employee_salary_flexi_benefit_allocation", "Flexi Allocation and Benefits")}
                </Typography>
              </Stack>
              <Box className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("employee_salary_flexi_component", "Flexi Component")}</th>
                      <th>{t("employee_salary_monthly_limit", "Monthly Limit")}</th>
                      <th>{t("employee_salary_annual_limit", "Annual Limit")}</th>
                      <th>{t("employee_salary_employee_allocation_monthly", "Allocated Monthly")}</th>
                      <th>{t("employee_salary_employee_allocation_annual", "Allocated Annual")}</th>
                      <th>{t("employee_salary_tax_treatment", "Tax Treatment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dicRevisionForm.lstFlexiAllocations.length === 0 ? (
                      <tr>
                        <td className={styles.emptyState} colSpan={6}>{t("employee_salary_no_flexi_allocations_found", "No flexi allocation lines found.")}</td>
                      </tr>
                    ) : dicRevisionForm.lstFlexiAllocations.map((dicAllocation, intIndex) => (
                      <tr key={dicAllocation.intSalaryComponentID}>
                        <td>
                          <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>{dicAllocation.strComponentName}</Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>
                            {`${t("employee_salary_proof_required", "Proof Required")}: ${dicAllocation.blnProofRequired ? t("employee_salary_yes", "Yes") : t("employee_salary_no", "No")}`}
                          </Typography>
                        </td>
                        <td>{formatOptionalCurrencyValue(dicAllocation.decMonthlyLimit, strCurrencyCode)}</td>
                        <td>{formatOptionalCurrencyValue(dicAllocation.decAnnualLimit, strCurrencyCode)}</td>
                        <td>
                          <TextField
                            value={dicAllocation.decAllocationMonthly}
                            placeholder={dicAllocation.decMonthlyLimit != null ? String(dicAllocation.decMonthlyLimit) : ""}
                            size="small"
                            sx={objOverrideValueFieldSx}
                            onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                              ...dicPrev,
                              lstFlexiAllocations: dicPrev.lstFlexiAllocations.map((dicRow, intRowIndex) => {
                                if (intRowIndex !== intIndex) {
                                  return dicRow;
                                }
                                const decMonthly = parseOptionalAmount(objEvent.target.value);
                                return {
                                  ...dicRow,
                                  decAllocationMonthly: objEvent.target.value,
                                  decAllocationAnnual: decMonthly !== null ? String(decMonthly * 12) : ""
                                };
                              })
                            }))}
                          />
                        </td>
                        <td>
                          <TextField
                            value={dicAllocation.decAllocationAnnual}
                            placeholder={dicAllocation.decAnnualLimit != null ? String(dicAllocation.decAnnualLimit) : ""}
                            size="small"
                            sx={objOverrideValueFieldSx}
                            onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                              ...dicPrev,
                              lstFlexiAllocations: dicPrev.lstFlexiAllocations.map((dicRow, intRowIndex) => {
                                if (intRowIndex !== intIndex) {
                                  return dicRow;
                                }
                                const decAnnual = parseOptionalAmount(objEvent.target.value);
                                return {
                                  ...dicRow,
                                  decAllocationAnnual: objEvent.target.value,
                                  decAllocationMonthly: decAnnual !== null ? String(decAnnual / 12) : ""
                                };
                              })
                            }))}
                          />
                        </td>
                        <td style={{ textTransform: "capitalize" }}>{dicAllocation.strTaxTreatment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
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
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {blnEffectiveViewMode
                  ? t("employee_salary_view_title", "View Employee Salary Detail")
                  : t("employee_salary_detail_title", "Employee Salary Detail")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.25, maxWidth: 820 }}>
                {t(
                  "employee_salary_detail_help",
                  "Manage employee compensation from a single screen."
                  )}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                data-testid="employee-salary.detail.back.button"
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
                    data-testid="employee-salary.revision.cancel.button"
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
                    data-testid="employee-salary.revision.save.button"
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
                      data-testid="employee-salary.detail.unassign.button"
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
                      data-testid="employee-salary.detail.assign-revise.button"
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
          {blnEffectiveViewMode ? <Alert severity="info">{t("employee_salary_read_only_mode", "You have view-only access for Employee Salary.")}</Alert> : null}
          {strPayrollLockMessage ? <Alert severity="warning">{strPayrollLockMessage}</Alert> : null}
          {lstValidationMessages.map((strMessage) => (
            <Alert key={strMessage} severity="error">{strMessage}</Alert>
          ))}
        </Stack>
      </Paper>

      <Paper
        sx={{
          border: "1px solid rgba(187, 213, 232, 0.7)",
          borderRadius: "var(--app-card-radius)",
          boxShadow: "var(--app-shadow-soft)",
          p: { xs: 2, md: 2.35 },
        }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" } }}>
          <Box sx={{ pr: { lg: 4 }, pb: { xs: 2, lg: 0 }, borderRight: { lg: "1px solid #dbe7f0" }, borderBottom: { xs: "1px solid #dbe7f0", lg: "none" } }}>
            <Stack direction="row" spacing={1.15} alignItems="center" sx={{ mb: 2.2 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "#eaf3ff", color: "#1677ff", display: "grid", placeItems: "center" }}>
                <BadgeRoundedIcon sx={{ fontSize: "1.05rem" }} />
              </Box>
              <Typography sx={{ color: "#07163b", fontSize: "0.95rem", fontWeight: 800 }}>
                {t("employee_salary_employee_summary", "Employee Summary")}
              </Typography>
            </Stack>
            <Box sx={{ display: "grid", gap: 1.65 }}>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_employee", "Employee")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmployeeName}</Typography>
              </Box>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_code", "Employee Code")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmployeeCode}</Typography>
              </Box>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_employment_status", "Employment Status")}</Typography>
                <Box sx={{ bgcolor: "#dcfce7", borderRadius: "8px", color: "#15803d", fontSize: "0.75rem", fontWeight: 700, px: 1, py: 0.25 }}>
                  {objDetail?.objEmployeeSummary.strEmploymentStatus}
                </Box>
              </Box>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_email", "Email")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objDetail?.objEmployeeSummary.strWorkEmail ?? "-"}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ px: { lg: 4 }, py: { xs: 2, lg: 0 }, borderRight: { lg: "1px solid #dbe7f0" }, borderBottom: { xs: "1px solid #dbe7f0", lg: "none" } }}>
            <Stack direction="row" spacing={1.15} alignItems="center" sx={{ mb: 2.2 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "#eaf3ff", color: "#1677ff", display: "grid", placeItems: "center" }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: "1.05rem" }} />
              </Box>
              <Typography sx={{ color: "#07163b", fontSize: "0.95rem", fontWeight: 800 }}>
                {t("employee_salary_current_salary_snapshot", "Current Salary Snapshot")}
              </Typography>
            </Stack>
            <Box sx={{ display: "grid", gap: 1.65 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1px 1fr" }, gap: { xs: 1.5, sm: 2 }, alignItems: "center" }}>
                <Stack direction="row" spacing={1.4} alignItems="center">
                  <Box sx={{ width: 54, height: 54, borderRadius: "50%", bgcolor: "#eaf3ff", color: "#1677ff", display: "grid", flexShrink: 0, placeItems: "center" }}>
                    <AccountBalanceWalletRoundedIcon sx={{ fontSize: "1.65rem" }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_monthly_salary_gross", "Monthly Salary (Gross)")}</Typography>
                    <Typography sx={{ color: "#1473e6", fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.15 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decGrossMonthly ?? null, strCurrencyCode)}</Typography>
                  </Box>
                </Stack>
                <Box sx={{ alignSelf: "stretch", bgcolor: "#dbe7f0", display: { xs: "none", sm: "block" } }} />
                <Stack direction="row" spacing={1.4} alignItems="center">
                  <Box sx={{ width: 54, height: 54, borderRadius: "50%", bgcolor: "#dcfce7", color: "#15803d", display: "grid", flexShrink: 0, placeItems: "center" }}>
                    <CalendarMonthRoundedIcon sx={{ fontSize: "1.65rem" }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_ctc_annual", "Annual CTC")}</Typography>
                    <Typography sx={{ color: "#15803d", fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.15 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decCtcAnnual ?? null, strCurrencyCode)}</Typography>
                  </Box>
                </Stack>
              </Box>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_current_since", "Current Since")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700, textAlign: "right" }}>{formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom ?? null)}</Typography>
              </Stack>
              {/* <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_effective_from", "Salary Effective Date")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700, textAlign: "right" }}>{formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom ?? null)}</Typography>
              </Stack> */}
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_revision_status", "Revision Status")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700, textAlign: "right" }}>{strRevisionStatus}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_assignment_source", "Source of Salary Assignment")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700, textAlign: "right" }}>{strAssignmentSource}</Typography>
              </Stack>
            </Box>
          </Box>

          <Box sx={{ pl: { lg: 4 }, pt: { xs: 2, lg: 0 } }}>
            <Stack direction="row" spacing={1.15} alignItems="center" sx={{ mb: 2.2 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: "#eaf3ff", color: "#1677ff", display: "grid", placeItems: "center" }}>
                <ApartmentRoundedIcon sx={{ fontSize: "1.05rem" }} />
              </Box>
              <Typography sx={{ color: "#07163b", fontSize: "0.95rem", fontWeight: 800 }}>
                {t("employee_salary_assigned_structure", "Assigned Structure")}
              </Typography>
            </Stack>
            <Box sx={{ display: "grid", gap: 1.65 }}>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_structure", "Structure")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objDetail?.objAssignedStructure?.strStructureName ?? t("employee_salary_not_assigned", "Not assigned")}</Typography>
              </Box>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_structure_code", "Structure Code")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strStructureCode ?? "-"}</Typography>
              </Box>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_effective_from", "Effective From")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700 }}>{formatDate(objDetail?.objAssignedStructure?.dtEffectiveFrom ?? null)}</Typography>
              </Box>
              <Box sx={objSummaryValueRowSx}>
                <Typography sx={{ color: "#586987", fontSize: "0.78rem", fontWeight: 700 }}>{t("employee_salary_currency", "Currency")}</Typography>
                <Typography sx={{ color: "#07163b", fontSize: "0.82rem", fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strCurrencyCode === "INR" ? "\u20B9" : objDetail?.objAssignedStructure?.strCurrencyCode ?? "-"}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

    {blnIsRevisionMode ? (
        <Box className={`${styles.tableCard} ${styles.revisionCard}`} sx={{ px: 2.25, py: 3 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <TextField
              data-testid="employee-salary.revision.salary-structure.select"
              inputProps={{ "data-testid": "employee-salary.revision.salary-structure.select" }}
              select
              label={t("employee_salary_structure_field", "Salary structure")}
              value={dicRevisionForm.intSalaryStructureID}
              onChange={(objEvent) => handleSalaryStructureChange(objEvent.target.value)}
              required
            >
              <MenuItem data-testid="employee-salary.revision.salary-structure.select.option" value="">{t("employee_salary_select", "Select")}</MenuItem>
              {(objFormOptions?.lstSalaryStructures ?? []).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-testid={`employee-salary.revision.salary-structure.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                  {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              data-testid="employee-salary.revision.effective-from.input"
              inputProps={{ "data-testid": "employee-salary.revision.effective-from.input" }}
              type="date"
              label={t("employee_salary_effective_from_field", "Effective from")}
              value={dicRevisionForm.dtEffectiveFrom}
              onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            data-testid="employee-salary.revision.revision-reason.input"
            inputProps={{ "data-testid": "employee-salary.revision.revision-reason.input" }}
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
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("employee_salary_component", "Component")}</th>
                    <th>{t("employee_salary_default_monthly", "Default Monthly")}</th>
                    <th>{t("employee_salary_monthly", "Monthly")}</th>
                    <th>{t("employee_salary_default_annual", "Default Annual")}</th>
                    <th>{t("employee_salary_annual", "Annual")}</th>
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
                        <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 700 }}>{dicOverride.strDefaultMonthly || "-"}</Typography>
                      </td>
                      <td>
                        <TextField
                          data-testid="employee-salary.revision.override.monthly.input"
                          inputProps={{ "data-testid": "employee-salary.revision.override.monthly.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                          value={dicOverride.decAmountMonthly}
                          placeholder={dicOverride.strDefaultMonthly}
                          size="small"
                          sx={objOverrideValueFieldSx}
                          disabled={!dicOverride.blnAllowManualOverride}
                          onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                            ...dicPrev,
                            lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => {
                              if (intRowIndex !== intOverrideIndex) {
                                return dicRow;
                              }
                              const decMonthly = parseOptionalAmount(objEvent.target.value);
                              return {
                                ...dicRow,
                                decAmountMonthly: objEvent.target.value,
                                decAmountAnnual: decMonthly !== null ? String(decMonthly * 12) : ""
                              };
                            })
                          }))}
                        />
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
                          onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                            ...dicPrev,
                            lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intOverrideIndex ? { ...dicRow, decAmountAnnual: objEvent.target.value } : dicRow)
                          }))}
                        />
                      </td>
                      <td>
                        <TextField
                          data-testid="employee-salary.revision.override.percentage.input"
                          inputProps={{ "data-testid": "employee-salary.revision.override.percentage.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                          value={dicOverride.decPercentageValue}
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
                          data-testid="employee-salary.revision.override.remarks.input"
                          inputProps={{ "data-testid": "employee-salary.revision.override.remarks.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
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
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {t("employee_salary_flexi_benefit_allocation", "Flexi Allocation and Benefits")}
                </Typography>
              </Stack>
              <Box className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("employee_salary_flexi_component", "Flexi Component")}</th>
                      <th>{t("employee_salary_monthly_limit", "Monthly Limit")}</th>
                      <th>{t("employee_salary_annual_limit", "Annual Limit")}</th>
                      <th>{t("employee_salary_employee_allocation_monthly", "Allocated Monthly")}</th>
                      <th>{t("employee_salary_employee_allocation_annual", "Allocated Annual")}</th>
                      <th>{t("employee_salary_tax_treatment", "Tax Treatment")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dicRevisionForm.lstFlexiAllocations.length === 0 ? (
                      <tr>
                        <td className={styles.emptyState} colSpan={6}>{t("employee_salary_no_flexi_allocations_found", "No flexi allocation lines found.")}</td>
                      </tr>
                    ) : dicRevisionForm.lstFlexiAllocations.map((dicAllocation, intIndex) => (
                      <tr key={dicAllocation.intSalaryComponentID}>
                        <td>
                          <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 700 }}>{dicAllocation.strComponentName}</Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>
                            {`${t("employee_salary_proof_required", "Proof Required")}: ${dicAllocation.blnProofRequired ? t("employee_salary_yes", "Yes") : t("employee_salary_no", "No")}`}
                          </Typography>
                        </td>
                        <td>{formatOptionalCurrencyValue(dicAllocation.decMonthlyLimit, strCurrencyCode)}</td>
                        <td>{formatOptionalCurrencyValue(dicAllocation.decAnnualLimit, strCurrencyCode)}</td>
                        <td>
                          <TextField
                            value={dicAllocation.decAllocationMonthly}
                            placeholder={dicAllocation.decMonthlyLimit != null ? String(dicAllocation.decMonthlyLimit) : ""}
                            size="small"
                            sx={objOverrideValueFieldSx}
                            onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                              ...dicPrev,
                              lstFlexiAllocations: dicPrev.lstFlexiAllocations.map((dicRow, intRowIndex) => {
                                if (intRowIndex !== intIndex) {
                                  return dicRow;
                                }
                                const decMonthly = parseOptionalAmount(objEvent.target.value);
                                return {
                                  ...dicRow,
                                  decAllocationMonthly: objEvent.target.value,
                                  decAllocationAnnual: decMonthly !== null ? String(decMonthly * 12) : ""
                                };
                              })
                            }))}
                          />
                        </td>
                        <td>
                          <TextField
                            value={dicAllocation.decAllocationAnnual}
                            placeholder={dicAllocation.decAnnualLimit != null ? String(dicAllocation.decAnnualLimit) : ""}
                            size="small"
                            sx={objOverrideValueFieldSx}
                            onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                              ...dicPrev,
                              lstFlexiAllocations: dicPrev.lstFlexiAllocations.map((dicRow, intRowIndex) => {
                                if (intRowIndex !== intIndex) {
                                  return dicRow;
                                }
                                const decAnnual = parseOptionalAmount(objEvent.target.value);
                                return {
                                  ...dicRow,
                                  decAllocationAnnual: objEvent.target.value,
                                  decAllocationMonthly: decAnnual !== null ? String(decAnnual / 12) : ""
                                };
                              })
                            }))}
                          />
                        </td>
                        <td style={{ textTransform: "capitalize" }}>{dicAllocation.strTaxTreatment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          ) : null}
        </Stack>
        {dicRevisionForm.intSalaryStructureID !== "" ? (
        <Paper variant="outlined" sx={{ alignSelf: "start", border: "1px solid rgba(187, 213, 232, 0.7)", borderRadius: "var(--app-card-radius)", boxShadow: "var(--app-shadow-soft)", p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
            <Typography sx={{ color: "#172554", fontSize: "0.95rem", fontWeight: 800 }}>
              {t("employee_salary_breakdown_impact", "Salary Breakdown Impact")}
            </Typography>
            <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 17 }} />
          </Stack>

          <Box sx={{ background: "#eef3fb", borderRadius: "6px", px: 1.25, py: 1, mb: 1.5 }}>
            <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
              {t("employee_salary_current_before_declaration", "Current (Before Declaration)")}
            </Typography>
          </Box>

          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_annual_ctc", "Annual CTC")}</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionCurrentCtcAnnual, strCurrencyCode)}</Typography>
            </Stack>

            {lstRevisionCurrentBreakdownComponentRows.map((dicRow) => (
              <Stack key={dicRow.intSalaryComponentID} direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700, minWidth: 0 }}>{dicRow.strComponentName}</Typography>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicRow.decAnnualAmount, strCurrencyCode)}</Typography>
                  {dicRow.decPercentOfCtc !== null ? (
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{formatPercentValue(dicRow.decPercentOfCtc)}</Typography>
                  ) : null}
                </Stack>
              </Stack>
            ))}

            <Box sx={{ background: "#e7f8ed", borderRadius: "6px", px: 1.25, py: 1, mt: 1 }}>
              <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
                {t("employee_salary_after_declaration_live_impact", "After Declaration (Live Impact)")}
              </Typography>
            </Box>

            {lstRevisionLiveBreakdownComponentRows.map((dicRow) => (
              <Stack key={dicRow.intSalaryComponentID} direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700, minWidth: 0 }}>{dicRow.strComponentName}</Typography>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicRow.decAnnualAmount, strCurrencyCode)}</Typography>
                  {dicRow.decPercentOfCtc !== null ? (
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{formatPercentValue(dicRow.decPercentOfCtc)}</Typography>
                  ) : null}
                </Stack>
              </Stack>
            ))}

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_flexi_basket_available", "Flexi Bucket Available")}</Typography>
              <Typography sx={{ color: "#172554", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decFlexiPayAllocationAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_declared_flexi", "Declared Flexi")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#dc2626", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(-decDialogFlexiAllocated, strCurrencyCode)}</Typography>
                <KeyboardArrowDownRoundedIcon sx={{ color: "#dc2626", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_remaining_balance", "Remaining Balance")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionFlexiBalanceAnnual, strCurrencyCode)}</Typography>
                <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
              </Stack>
            </Stack>

            <Box sx={{ borderTop: "1px solid #d9e6ef", mt: 0.25, pt: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_residual_taxable_allowance", "Residual Taxable Component")}</Typography>
                  <InfoOutlinedIcon sx={{ color: "#64748b", fontSize: 15 }} />
                </Stack>
                <Typography sx={{ color: "#172554", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionFlexiBalanceAnnual, strCurrencyCode)}</Typography>
              </Stack>
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_net_payroll_impact_monthly", "Estimated Monthly Payroll Impact")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: decRevisionNetPayrollImpactMonthly < 0 ? "#dc2626" : "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionNetPayrollImpactMonthly, strCurrencyCode)}</Typography>
                {decRevisionNetPayrollImpactMonthly < 0 ? (
                  <KeyboardArrowDownRoundedIcon sx={{ color: "#dc2626", fontSize: 18 }} />
                ) : (
                  <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
                )}
              </Stack>
            </Stack>

            <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1.35, mt: 0.5 }}>
              <Stack direction="row" spacing={0.8} alignItems="flex-start">
                <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                <Typography sx={{ color: "#172554", fontSize: "0.76rem", lineHeight: 1.45 }}>
                  {t("employee_salary_breakdown_impact_help", "Amounts are recalculated in real time based on your declarations. Final impact will be reflected in employee payslip.")}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
        ) : null}
        </Box>
      ) : null}

      {!blnIsRevisionMode && blnHasAssignedSalary ? (
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 4fr) minmax(260px, 1fr)" }, alignItems: "start" }}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Box className={styles.tableCard}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("employee_salary_component_lines", "Component Lines")}
            </Typography>
            {lstFilteredComponentRows.length > 0 ? (
              <Box className={styles.paginationBar}>
                <Box className={styles.paginationInfo}>
                  <Typography className={styles.paginationLabel}>{t("employee_salary_rows_per_page", "Rows per page")}</Typography>
                  <TextField
                    data-testid="employee-salary.detail.components.rows-per-page.select"
                    inputProps={{ "data-testid": "employee-salary.detail.components.rows-per-page.select" }}
                    select
                    size="small"
                    value={String(intComponentRowsPerPage)}
                    onChange={(objEvent) => {
                      setIntComponentRowsPerPage(Number(objEvent.target.value));
                      setIntComponentPage(1);
                    }}
                    className={styles.rowsPerPageSelect}
                  >
                    {lstRowsPerPageOptions.map((intOption) => (
                      <MenuItem key={intOption} value={String(intOption)} data-testid={`employee-salary.detail.components.rows-per-page.${intOption}.option`}>{intOption}</MenuItem>
                    ))}
                  </TextField>
                  <Typography className={styles.paginationRange}>
                    {intComponentStartIndex + 1}-{Math.min(intComponentStartIndex + intComponentRowsPerPage, lstFilteredComponentRows.length)} of {lstFilteredComponentRows.length}
                  </Typography>
                </Box>
                <Pagination
                  data-testid="employee-salary.detail.components.pagination"
                  count={intComponentPageCount}
                  page={intResolvedComponentPage}
                  onChange={(_, intNextPage) => setIntComponentPage(intNextPage)}
                  size="small"
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            ) : null}
          </Stack>

          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_component", "Component")}</th>
                  <th>{t("employee_salary_category", "Category")}</th>
                  <th>{t("employee_salary_value_type", "Value Type")}</th>
                  <th>{t("employee_salary_monthly", "Monthly")}</th>
                  <th>{t("employee_salary_annual", "Annual")}</th>
                  <th>{t("employee_salary_source", "Source")}</th>
                  <th>{t("employee_salary_remarks", "Remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredComponentRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>{t("employee_salary_no_component_lines_found", "No salary component lines found.")}</td>
                  </tr>
                ) : lstVisibleComponentRows.map((dicRow) => (
                  <tr key={dicRow.intEmployeeSalaryComponentID}>
                    <td>{dicRow.strComponentName}</td>
                    <td>{dicRow.strCategory}</td>
                    <td>{dicRow.strValueType}</td>
                    <td>{dicRow.strMonthly}</td>
                    <td>{dicRow.strAnnual}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsOverride ? styles.statusInactive : styles.statusActive}`}>
                        {dicRow.strOverride}
                      </span>
                    </td>
                    <td>{dicRow.strRemarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>

        {(
          <Box className={styles.tableCard}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                {t("employee_salary_flexi_benefit_allocation", "Flexi Allocation and Benefits")}
              </Typography>
            </Stack>
            {!blnHasFlexiBucket ? (
              <Alert severity={blnHasFlexiAllocations ? "error" : "info"} sx={{ mb: 1.25 }}>
                {blnHasFlexiAllocations
                  ? t("employee_salary_flexi_allocation_without_bucket", "Flexi allocation cannot exist without Flexi Bucket amount.")
                  : t("employee_salary_flexi_not_enabled", "Flexi Pay is not enabled for this employee's salary structure.")}
              </Alert>
            ) : null}
            {blnHasFlexiBucket || lstFlexiRows.length > 0 ? (
            <Box className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("employee_salary_flexi_component", "Flexi Component")}</th>
                    <th>{t("employee_salary_monthly_limit", "Monthly Cap")}</th>
                    <th>{t("employee_salary_annual_limit", "Annual Cap")}</th>
                    <th>{t("employee_salary_employee_allocation_monthly", "Allocated Monthly")}</th>
                    <th>{t("employee_salary_employee_allocation_annual", "Allocated Annual")}</th>
                    <th>{t("employee_salary_approved_monthly", "Approved Monthly")}</th>
                    <th>{t("employee_salary_approved_annual", "Approved Annual")}</th>
                    <th>{t("employee_salary_utilized_annual", "Utilized Annual")}</th>
                    <th>{t("employee_salary_balance", "Remaining Annual Balance")}</th>
                    <th>{t("employee_salary_proof_required", "Proof Required")}</th>
                    <th>{t("employee_salary_tax_treatment", "Tax Treatment")}</th>
                    <th>{t("employee_salary_status", "Status")}</th>
                    <th>{t("employee_salary_source", "Source")}</th>
                    <th>{t("employee_salary_remarks", "Remarks")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lstFlexiRows.length === 0 ? (
                    <tr>
                      <td className={styles.emptyState} colSpan={14}>{t("employee_salary_no_flexi_allocations_found", "No flexi allocation lines found.")}</td>
                    </tr>
                  ) : lstFlexiRows.map((dicRow) => (
                    <tr key={dicRow.intSalaryComponentID}>
                      <td>{dicRow.strComponentName}</td>
                      <td>{dicRow.strMonthlyLimit}</td>
                      <td>{dicRow.strAnnualLimit}</td>
                      <td>{dicRow.strAllocationMonthly}</td>
                      <td>{dicRow.strAllocationAnnual}</td>
                      <td>{dicRow.strApprovedMonthly}</td>
                      <td>{dicRow.strApprovedAnnual}</td>
                      <td>{dicRow.strUtilizedAnnual}</td>
                      <td>{dicRow.strRemainingAnnualBalance}</td>
                      <td>{dicRow.strProofRequired}</td>
                      <td style={{ textTransform: "capitalize" }}>{dicRow.strTaxTreatment}</td>
                      <td>{dicRow.strStatus}</td>
                      <td>{dicRow.strSource}</td>
                      <td>{dicRow.strRemarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
            ) : null}
          </Box>
        )}
        </Stack>
        <Paper variant="outlined" sx={{ alignSelf: "start", border: "1px solid rgba(187, 213, 232, 0.7)", borderRadius: "var(--app-card-radius)", boxShadow: "var(--app-shadow-soft)", p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
            <Typography sx={{ color: "#172554", fontSize: "0.95rem", fontWeight: 800 }}>
              {t("employee_salary_breakdown_impact", "Salary Breakdown Impact")}
            </Typography>
            <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 17 }} />
          </Stack>

          <Box sx={{ background: "#eef3fb", borderRadius: "6px", px: 1.25, py: 1, mb: 1.5 }}>
            <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
              {t("employee_salary_current_before_declaration", "Flexi Declaration Status")}
            </Typography>
          </Box>

          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_annual_ctc", "Annual CTC")}</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(decRevisionCurrentCtcAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_gross_monthly", "Gross Monthly")}</Typography>
              <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decGrossMonthly ?? null, strCurrencyCode)}</Typography>
            </Stack>

            {lstRevisionCurrentBreakdownComponentRows.map((dicRow) => (
              <Stack key={dicRow.intSalaryComponentID} direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700, minWidth: 0 }}>{dicRow.strComponentName}</Typography>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Typography sx={{ color: "#07163b", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicRow.decAnnualAmount, strCurrencyCode)}</Typography>
                  {dicRow.decPercentOfCtc !== null ? (
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{formatPercentValue(dicRow.decPercentOfCtc)}</Typography>
                  ) : null}
                </Stack>
              </Stack>
            ))}

            <Box sx={{ background: "#e7f8ed", borderRadius: "6px", px: 1.25, py: 1, mt: 1 }}>
              <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 800 }}>
                {t("employee_salary_after_declaration_live_impact", "Flexi Pay Declaration")}
              </Typography>
            </Box>

            {blnHasFlexiBucket ? (
            <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_flexi_basket_available", "Flexi Bucket Available")}</Typography>
              <Typography sx={{ color: "#172554", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicFlexiTotals.decFlexiBucketAvailableAnnual, strCurrencyCode)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_declared_flexi", "Approved / Declared Flexi")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: "#dc2626", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicFlexiTotals.decApprovedFlexiAnnual || dicFlexiTotals.decDeclaredFlexiAnnual, strCurrencyCode)}</Typography>
                <KeyboardArrowDownRoundedIcon sx={{ color: "#dc2626", fontSize: 18 }} />
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_remaining_balance", "Remaining Balance")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: dicFlexiTotals.decRemainingAnnualBalance < 0 ? "#dc2626" : "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicFlexiTotals.decRemainingAnnualBalance, strCurrencyCode)}</Typography>
                <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
              </Stack>
            </Stack>

            <Box sx={{ borderTop: "1px solid #d9e6ef", mt: 0.25, pt: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_residual_taxable_allowance", "Residual Taxable Component")}</Typography>
                  <InfoOutlinedIcon sx={{ color: "#64748b", fontSize: 15 }} />
                </Stack>
                <Typography sx={{ color: "#172554", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicFlexiTotals.decRemainingAnnualBalance, strCurrencyCode)}</Typography>
              </Stack>
            </Box>

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.25}>
              <Typography sx={{ color: "#172554", fontSize: "0.82rem", fontWeight: 700 }}>{t("employee_salary_net_payroll_impact_monthly", "Estimated Monthly Payroll Impact")}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ color: dicFlexiTotals.decResidualMonthlyAmount < 0 ? "#dc2626" : "#059669", fontSize: "0.84rem", fontWeight: 800 }}>{formatCurrency(dicFlexiTotals.decResidualMonthlyAmount, strCurrencyCode)}</Typography>
                {decRevisionNetPayrollImpactMonthly < 0 ? (
                  <KeyboardArrowDownRoundedIcon sx={{ color: "#dc2626", fontSize: 18 }} />
                ) : (
                  <KeyboardArrowUpRoundedIcon sx={{ color: "#059669", fontSize: 18 }} />
                )}
              </Stack>
            </Stack>
            </>
            ) : (
              <Alert severity="info">{t("employee_salary_no_flexi_bucket_available", "No Flexi Bucket is available for this employee.")}</Alert>
            )}

            <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1.35, mt: 0.5 }}>
              <Stack direction="row" spacing={0.8} alignItems="flex-start">
                <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                <Typography sx={{ color: "#172554", fontSize: "0.76rem", lineHeight: 1.45 }}>
                  {t("employee_salary_breakdown_impact_help", "Amounts are recalculated in real time based on your declarations. Final impact will be reflected in employee payslip.")}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
      ) : null}

      {lstHistoryRows.length > 0 ? (
      <Box>
        <Box className={styles.tableCard}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1.5} sx={{ pb: 1, pl: "10px" }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("employee_salary_revision_history", "Revision History")}
            </Typography>
            {lstHistoryRows.length > 0 ? (
              <Box className={styles.paginationBar}>
                <Box className={styles.paginationInfo}>
                  <Typography className={styles.paginationLabel}>{t("employee_salary_rows_per_page", "Rows per page")}</Typography>
                  <TextField
                    data-testid="employee-salary.detail.history.rows-per-page.select"
                    inputProps={{ "data-testid": "employee-salary.detail.history.rows-per-page.select" }}
                    select
                    size="small"
                    value={String(intHistoryRowsPerPage)}
                    onChange={(objEvent) => {
                      setIntHistoryRowsPerPage(Number(objEvent.target.value));
                      setIntHistoryPage(1);
                    }}
                    className={styles.rowsPerPageSelect}
                  >
                    {lstRowsPerPageOptions.map((intOption) => (
                      <MenuItem key={intOption} value={String(intOption)} data-testid={`employee-salary.detail.history.rows-per-page.${intOption}.option`}>{intOption}</MenuItem>
                    ))}
                  </TextField>
                  <Typography className={styles.paginationRange}>
                    {intHistoryStartIndex + 1}-{Math.min(intHistoryStartIndex + intHistoryRowsPerPage, lstHistoryRows.length)} of {lstHistoryRows.length}
                  </Typography>
                </Box>
                <Pagination
                  data-testid="employee-salary.detail.history.pagination"
                  count={intHistoryPageCount}
                  page={intResolvedHistoryPage}
                  onChange={(_, intNextPage) => setIntHistoryPage(intNextPage)}
                  size="small"
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            ) : null}
          </Stack>

          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_structure", "Structure")}</th>
                  <th>{t("employee_salary_effective_from", "Effective From")}</th>
                  <th>{t("employee_salary_effective_to", "Effective To")}</th>
                  <th>{t("employee_salary_gross_monthly", "Gross Monthly")}</th>
                  <th>{t("employee_salary_ctc_annual", "CTC Annual")}</th>
                  <th>{t("employee_salary_record_type", "Record Type")}</th>
                  <th>{t("employee_salary_revision_reason", "Revision Reason")}</th>
                </tr>
              </thead>
              <tbody>
                {lstHistoryRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>{t("employee_salary_no_revisions_found", "No salary revisions found.")}</td>
                  </tr>
                ) : lstVisibleHistoryRows.map((dicRow) => (
                  <tr key={dicRow.intEmployeeSalaryStructureID}>
                    <td>{dicRow.strStructure}</td>
                    <td>{dicRow.strEffectiveFrom}</td>
                    <td>{dicRow.strEffectiveTo}</td>
                    <td>{dicRow.strGrossMonthly}</td>
                    <td>{dicRow.strCtcAnnual}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsCurrent ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.blnIsCurrent
                          ? t("employee_salary_current", "Current")
                          : t("employee_salary_history", "History")}
                      </span>
                    </td>
                    <td>{dicRow.strReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
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
