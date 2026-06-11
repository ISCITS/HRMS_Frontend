"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
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
  strMonthly: string;
  strAnnual: string;
  blnIsOverride: boolean;
  strOverride: string;
  strRemarks: string;
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
  strProofRequired: string;
  strTaxTreatment: string;
  strBalance: string;
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
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName?: string | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  strTaxTreatment?: string | null;
  blnProofRequired?: boolean;
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
  lstExistingAllocations: EmployeeSalaryFlexiAllocationSummary["lstAllocationLines"] = [],
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryFlexiAllocationFormValue[] {
  const dicExistingByComponentID = new Map(
    lstExistingAllocations.map((dicAllocation) => [dicAllocation.intSalaryComponentID, dicAllocation])
  );

  return lstSourceLines.map((dicLine) => {
    const dicExisting = dicExistingByComponentID.get(dicLine.intSalaryComponentID);
    return {
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentName:
        dicLine.strComponentName ??
        dicLine.strComponentCode ??
        `${fnTranslate?.("employee_salary_component", "Component") ?? "Component"} ${dicLine.intSalaryComponentID}`,
      strComponentCode: dicLine.strComponentCode ?? "",
      strTaxTreatment: dicLine.strTaxTreatment ?? "",
      blnProofRequired: Boolean(dicLine.blnProofRequired),
      decAnnualLimit: dicLine.decAnnualLimit ?? null,
      decMonthlyLimit: dicLine.decMonthlyLimit ?? null,
      decAllocationMonthly: formatOptionalDefaultValue(dicExisting?.decAllocationMonthly),
      decAllocationAnnual: formatOptionalDefaultValue(dicExisting?.decAllocationAnnual)
    };
  });
}

function buildRevisionForm(
  objDetail: EmployeeSalaryDetailRecord | null,
  objFormOptions?: EmployeeSalaryFormOptions | null,
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
      getFlexiAllocationSummary(objDetail).lstAllocationLines,
      getFlexiAllocationSummary(objDetail).lstAllocationLines,
      fnTranslate
    )
  };
}

export default function EmployeeSalaryDetailPage({ intEmployeeID, blnViewMode = false, strReturnTo = "/employee-salary" }: EmployeeSalaryDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeSalaryLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeSalaryFormOptions | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
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
        const [dicDetail, dicFormOptions] = await Promise.all([
          employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID),
          employeeSalaryService.getFormOptions()
        ]);
        if (!blnMounted) {
          return;
        }
        setObjDetail(dicDetail);
        setObjFormOptions(dicFormOptions);
        setDicRevisionForm(buildRevisionForm(dicDetail, dicFormOptions, t));
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intEmployeeID]);

  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";

  const lstComponentRows: ComponentGridRow[] = useMemo(() => {
    return (objDetail?.lstComponentLines ?? []).map((dicLine: EmployeeSalaryComponentLine) => ({
      intEmployeeSalaryComponentID: dicLine.intEmployeeSalaryComponentID,
      strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
      strCategory: dicLine.strComponentCategory ?? "-",
      strValueType: dicLine.strComponentValueType,
      strMonthly: formatCurrency(dicLine.decAmountMonthly, strCurrencyCode),
      strAnnual: formatCurrency(dicLine.decAmountAnnual, strCurrencyCode),
      blnIsOverride: dicLine.blnIsOverride,
      strOverride: dicLine.blnIsOverride
        ? t("employee_salary_override", "Override")
        : t("employee_salary_structure_source", "Structure"),
      strRemarks: dicLine.strRemarks ?? "-"
    }));
  }, [objDetail, t]);

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
  const objSelectedStructure = useMemo(
    () =>
      typeof dicRevisionForm.intSalaryStructureID === "number"
        ? objFormOptions?.lstSalaryStructures.find(
            (dicStructure) => dicStructure.intID === dicRevisionForm.intSalaryStructureID
          ) ?? null
        : null,
    [dicRevisionForm.intSalaryStructureID, objFormOptions]
  );
  const decDialogFlexiBasketAvailable = useMemo(() => {
    const dicBasketLine = objSelectedStructure?.lstComponents?.find(
      (dicComponent) => dicComponent.blnIsFlexiBasket || dicComponent.blnIsFlexiBasketLine
    );
    if (!dicBasketLine) {
      return objFlexiAllocation.decFlexiBasketAvailableAnnual ?? 0;
    }
    if (typeof dicBasketLine.decFixedAmount === "number") {
      return dicBasketLine.decFixedAmount * 12;
    }
    return objFlexiAllocation.decFlexiBasketAvailableAnnual ?? 0;
  }, [objFlexiAllocation.decFlexiBasketAvailableAnnual, objSelectedStructure]);
  const decDialogFlexiAllocated = useMemo(
    () =>
      dicRevisionForm.lstFlexiAllocations.reduce((decTotal, dicAllocation) => {
        const decAnnual = Number(dicAllocation.decAllocationAnnual || 0);
        const decMonthly = Number(dicAllocation.decAllocationMonthly || 0);
        return decTotal + (Number.isFinite(decAnnual) && decAnnual > 0 ? decAnnual : (Number.isFinite(decMonthly) ? decMonthly * 12 : 0));
      }, 0),
    [dicRevisionForm.lstFlexiAllocations]
  );

  const lstFlexiRows: FlexiGridRow[] = useMemo(() => {
    return objFlexiAllocation.lstAllocationLines.map((dicLine) => ({
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
      strAnnualLimit: formatOptionalCurrencyValue(dicLine.decAnnualLimit, strCurrencyCode),
      strMonthlyLimit: formatOptionalCurrencyValue(dicLine.decMonthlyLimit, strCurrencyCode),
      strAllocationAnnual: formatCurrency(dicLine.decAllocationAnnual, strCurrencyCode),
      strAllocationMonthly: formatCurrency(dicLine.decAllocationMonthly, strCurrencyCode),
      strProofRequired: dicLine.blnProofRequired
        ? t("employee_salary_yes", "Yes")
        : t("employee_salary_no", "No"),
      strTaxTreatment: dicLine.strTaxTreatment || "-",
      strBalance: formatOptionalCurrencyValue(dicLine.decBalanceAnnual, strCurrencyCode)
    }));
  }, [objFlexiAllocation, strCurrencyCode, t]);

  const intComponentPageCount = Math.max(1, Math.ceil(lstComponentRows.length / intComponentRowsPerPage));
  const intResolvedComponentPage = Math.min(intComponentPage, intComponentPageCount);
  const intComponentStartIndex = (intResolvedComponentPage - 1) * intComponentRowsPerPage;
  const lstVisibleComponentRows = lstComponentRows.slice(intComponentStartIndex, intComponentStartIndex + intComponentRowsPerPage);

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
          lstOverrides: []
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
          lstStructureComponents.filter(
            (dicComponent) => dicComponent.blnIsFlexiBenefit && dicComponent.blnIncludedInCtc
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
    if (dicRevisionForm.lstFlexiAllocations.length > 0 && decDialogFlexiAllocated > decDialogFlexiBasketAvailable) {
      setStrError(t("employee_salary_flexi_total_exceeds_basket", "Total flexi allocation cannot exceed Flexi Basket Available."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedDetail = await employeeSalaryService.createRevision(intEmployeeID, dicRevisionForm);
      setObjDetail(dicSavedDetail);
      setDicRevisionForm(buildRevisionForm(dicSavedDetail, objFormOptions, t));
      setStrSuccess(
        t("employee_salary_revision_saved_success", "Employee salary revision saved successfully.")
      );
      setBlnDialogOpen(false);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : t("employee_salary_save_revision_failed", "Unable to save salary revision.")
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
      setDicRevisionForm(buildRevisionForm(dicSavedDetail, objFormOptions, t));
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
    setBlnDialogOpen(true);
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

  const blnHasAssignedSalary = Boolean(objDetail?.objAssignedStructure);
  const blnCanOpenAssignRevise =
    !blnEffectiveViewMode &&
    (blnHasAssignedSalary ? (blnCanEdit || blnCanSubmit) : (blnCanAdd || blnCanSubmit));
  const blnCanUnassignSalary =
    !blnEffectiveViewMode && blnHasAssignedSalary && (blnCanEdit || blnCanSubmit);

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 46%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {blnEffectiveViewMode
                  ? t("employee_salary_view_title", "View Employee Salary Detail")
                  : t("employee_salary_detail_title", "Employee Salary Detail")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {objDetail?.objEmployeeSummary.strEmployeeName} ({objDetail?.objEmployeeSummary.strEmployeeCode})
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
              {!blnEffectiveViewMode ? (
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
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.3fr 1fr" } }}>
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            1. {t("employee_salary_employee_summary", "Employee Summary")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_employee", "Employee")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmployeeName}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_code", "Code")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmployeeCode}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_email", "Email")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strWorkEmail ?? "-"}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_employment_status", "Employment Status")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmploymentStatus}</Typography></Box>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            2. {t("employee_salary_current_salary_snapshot", "Current Salary Snapshot")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_gross_monthly", "Gross Monthly")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decGrossMonthly ?? null, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_ctc_annual", "CTC Annual")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decCtcAnnual ?? null, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_current_since", "Current Since")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom ?? null)}</Typography></Box>
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          3. {t("employee_salary_assigned_structure", "Assigned Structure")}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_structure", "Structure")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strStructureName ?? t("employee_salary_not_assigned", "Not assigned")}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_code", "Code")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strStructureCode ?? "-"}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_currency", "Currency")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strCurrencyCode ?? "-"}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_effective_from", "Effective From")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatDate(objDetail?.objAssignedStructure?.dtEffectiveFrom ?? null)}</Typography></Box>
        </Box>
      </Paper>

      {objFlexiAllocation.blnHasFlexiBasket ? (
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(180deg, #fffdf8 0%, #fffaf0 100%)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            4. {t("employee_salary_flexi_benefit_allocation", "Flexi Benefit Allocation")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, mb: 2 }}>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_flexi_basket_available", "Flexi Basket Available")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(objFlexiAllocation.decFlexiBasketAvailableAnnual, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_allocated_flexi_amount", "Allocated Flexi Amount")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(objFlexiAllocation.decAllocatedFlexiAnnual, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_balance_flexi_amount", "Balance Flexi Amount")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(objFlexiAllocation.decBalanceFlexiAnnual, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_residual_taxable_allowance", "Residual Taxable Allowance")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(objFlexiAllocation.decResidualTaxableAllowanceAnnual, strCurrencyCode)}</Typography></Box>
          </Box>
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_flexi_component", "Flexi Component")}</th>
                  <th>{t("employee_salary_annual_limit", "Annual Limit")}</th>
                  <th>{t("employee_salary_monthly_limit", "Monthly Limit")}</th>
                  <th>{t("employee_salary_employee_allocation_annual", "Employee Allocation Annual")}</th>
                  <th>{t("employee_salary_employee_allocation_monthly", "Employee Allocation Monthly")}</th>
                  <th>{t("employee_salary_proof_required", "Proof Required")}</th>
                  <th>{t("employee_salary_tax_treatment", "Tax Treatment")}</th>
                  <th>{t("employee_salary_balance", "Balance")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFlexiRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={8}>{t("employee_salary_no_flexi_allocations_found", "No flexi allocation lines found.")}</td>
                  </tr>
                ) : lstFlexiRows.map((dicRow) => (
                  <tr key={dicRow.intSalaryComponentID}>
                    <td>{dicRow.strComponentName}</td>
                    <td>{dicRow.strAnnualLimit}</td>
                    <td>{dicRow.strMonthlyLimit}</td>
                    <td>{dicRow.strAllocationAnnual}</td>
                    <td>{dicRow.strAllocationMonthly}</td>
                    <td>{dicRow.strProofRequired}</td>
                    <td style={{ textTransform: "capitalize" }}>{dicRow.strTaxTreatment}</td>
                    <td>{dicRow.strBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Typography sx={{ mt: 1.25, color: "#64748b", fontSize: "0.82rem" }}>
            {objFlexiAllocation.strResidualComponentName
              ? `${t("employee_salary_residual_component", "Residual component")}: ${objFlexiAllocation.strResidualComponentName}`
              : t("employee_salary_residual_component_not_configured", "Residual component is not configured.")}
          </Typography>
        </Paper>
      ) : null}

      <Box>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.25 }}>
          {objFlexiAllocation.blnHasFlexiBasket ? 5 : 4}. {t("employee_salary_component_lines", "Component Lines")}
        </Typography>
        <Box className={styles.tableCard}>
          {lstComponentRows.length > 0 ? (
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
                  {intComponentStartIndex + 1}-{Math.min(intComponentStartIndex + intComponentRowsPerPage, lstComponentRows.length)} of {lstComponentRows.length}
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
                {lstComponentRows.length === 0 ? (
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
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.25 }}>
          {objFlexiAllocation.blnHasFlexiBasket ? 6 : 5}. {t("employee_salary_revision_history", "Revision History")}
        </Typography>
        <Box className={styles.tableCard}>
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

      <Dialog open={!blnEffectiveViewMode && blnDialogOpen} onClose={() => !blnSaving && setBlnDialogOpen(false)} fullWidth maxWidth="md" data-testid="employee-salary.detail.dialog">
        <DialogTitle>{t("employee_salary_dialog_title", "Assign / Revise Salary")}</DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <TextField
                data-testid="employee-salary.detail.dialog.salary-structure.select"
                inputProps={{ "data-testid": "employee-salary.detail.dialog.salary-structure.select" }}
                select
                label={t("employee_salary_structure_field", "Salary structure")}
                value={dicRevisionForm.intSalaryStructureID}
                onChange={(objEvent) => handleSalaryStructureChange(objEvent.target.value)}
                SelectProps={{ SelectDisplayProps: { "data-testid": "employee-salary.detail.dialog.salary-structure.select" } }}
              >
                <MenuItem data-testid="employee-salary.detail.dialog.salary-structure.select.option" value="">{t("employee_salary_select", "Select")}</MenuItem>
                {(objFormOptions?.lstSalaryStructures ?? []).map((dicOption) => (
                  <MenuItem key={dicOption.intID} value={dicOption.intID} data-testid={`employee-salary.detail.dialog.salary-structure.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                    {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                data-testid="employee-salary.detail.dialog.effective-from.input"
                inputProps={{ "data-testid": "employee-salary.detail.dialog.effective-from.input" }}
                type="date"
                label={t("employee_salary_effective_from_field", "Effective from")}
                value={dicRevisionForm.dtEffectiveFrom}
                onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              data-testid="employee-salary.detail.dialog.revision-reason.input"
              inputProps={{ "data-testid": "employee-salary.detail.dialog.revision-reason.input" }}
              label={t("employee_salary_revision_reason_field", "Revision reason")}
              value={dicRevisionForm.strRevisionReason}
              onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, strRevisionReason: objEvent.target.value }))}
              multiline
              minRows={2}
            />

            {dicRevisionForm.lstFlexiAllocations.length > 0 ? (
              <Paper sx={{ borderRadius: "20px", border: "1px solid rgba(148,163,184,0.18)", p: 2, background: "#fffdf8" }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t("employee_salary_flexi_benefit_allocation", "Flexi Benefit Allocation")}</Typography>
                <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, mb: 1.5 }}>
                  <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{t("employee_salary_flexi_basket_available", "Flexi Basket Available")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(decDialogFlexiBasketAvailable, strCurrencyCode)}</Typography></Box>
                  <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{t("employee_salary_allocated_flexi_amount", "Allocated Flexi Amount")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(decDialogFlexiAllocated, strCurrencyCode)}</Typography></Box>
                  <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{t("employee_salary_balance_flexi_amount", "Balance Flexi Amount")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatOptionalCurrencyValue(decDialogFlexiBasketAvailable - decDialogFlexiAllocated, strCurrencyCode)}</Typography></Box>
                  <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{t("employee_salary_residual_taxable_allowance", "Residual Taxable Allowance")}</Typography><Typography sx={{ fontWeight: 700 }}>{objFlexiAllocation.strResidualComponentName ?? t("employee_salary_auto_calculated", "Auto calculated")}</Typography></Box>
                </Box>
                <Stack spacing={1.25}>
                  {dicRevisionForm.lstFlexiAllocations.map((dicAllocation, intIndex) => (
                    <Box
                      key={dicAllocation.intSalaryComponentID}
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.9fr 0.9fr 1fr 1fr" },
                        p: 1.5,
                        borderRadius: "16px",
                        border: "1px solid rgba(148,163,184,0.14)",
                        bgcolor: "#ffffff"
                      }}
                    >
                      <Stack spacing={0.45}>
                        <TextField label={t("employee_salary_flexi_component", "Flexi Component")} value={dicAllocation.strComponentName} disabled />
                        <Typography sx={{ color: "#64748b", fontSize: "0.75rem", pl: 1.5 }}>
                          {`${t("employee_salary_tax_treatment", "Tax Treatment")}: ${dicAllocation.strTaxTreatment || "-"} | ${t("employee_salary_proof_required", "Proof Required")}: ${dicAllocation.blnProofRequired ? t("employee_salary_yes", "Yes") : t("employee_salary_no", "No")}`}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.45}>
                        <TextField label={t("employee_salary_annual_limit", "Annual Limit")} value={formatOptionalCurrencyValue(dicAllocation.decAnnualLimit, strCurrencyCode)} disabled />
                        <Typography sx={{ color: "#475569", fontSize: "0.75rem", pl: 1.5 }}>{t("employee_salary_limit", "Limit")}</Typography>
                      </Stack>
                      <Stack spacing={0.45}>
                        <TextField label={t("employee_salary_monthly_limit", "Monthly Limit")} value={formatOptionalCurrencyValue(dicAllocation.decMonthlyLimit, strCurrencyCode)} disabled />
                        <Typography sx={{ color: "#475569", fontSize: "0.75rem", pl: 1.5 }}>{t("employee_salary_limit", "Limit")}</Typography>
                      </Stack>
                      <Stack spacing={0.45}>
                        <TextField
                          label={t("employee_salary_employee_allocation_monthly", "Employee Allocation Monthly")}
                          value={dicAllocation.decAllocationMonthly}
                          placeholder={dicAllocation.decMonthlyLimit != null ? String(dicAllocation.decMonthlyLimit) : ""}
                          InputLabelProps={{ shrink: true }}
                          onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                            ...dicPrev,
                            lstFlexiAllocations: dicPrev.lstFlexiAllocations.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decAllocationMonthly: objEvent.target.value } : dicRow)
                          }))}
                        />
                        <Typography sx={{ color: "#475569", fontSize: "0.75rem", pl: 1.5 }}>{formatOptionalCurrencyValue(dicAllocation.decMonthlyLimit, strCurrencyCode)}</Typography>
                      </Stack>
                      <Stack spacing={0.45}>
                        <TextField
                          label={t("employee_salary_employee_allocation_annual", "Employee Allocation Annual")}
                          value={dicAllocation.decAllocationAnnual}
                          placeholder={dicAllocation.decAnnualLimit != null ? String(dicAllocation.decAnnualLimit) : ""}
                          InputLabelProps={{ shrink: true }}
                          onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                            ...dicPrev,
                            lstFlexiAllocations: dicPrev.lstFlexiAllocations.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decAllocationAnnual: objEvent.target.value } : dicRow)
                          }))}
                        />
                        <Typography sx={{ color: "#475569", fontSize: "0.75rem", pl: 1.5 }}>{formatOptionalCurrencyValue(dicAllocation.decAnnualLimit, strCurrencyCode)}</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ) : null}

            <Paper sx={{ borderRadius: "20px", border: "1px solid rgba(148,163,184,0.18)", p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t("employee_salary_override_handling", "Override handling")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem", mb: 1.5 }}>
                {t(
                  "employee_salary_override_help",
                  "Only components marked for manual override can be edited here. Leave values unchanged if the revision should inherit structure defaults."
                )}
              </Typography>
              <Stack spacing={1.5}>
                {dicRevisionForm.lstOverrides.map((dicOverride, intIndex) => (
                  <Box
                    key={dicOverride.intSalaryComponentID}
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr 1fr 1fr 1.2fr" },
                      p: 1.5,
                      borderRadius: "16px",
                      bgcolor: dicOverride.blnAllowManualOverride ? "#f8fafc" : "#f8fafc",
                      border: "1px solid rgba(148,163,184,0.14)"
                    }}
                  >
                    <Stack spacing={0.55}>
                      <TextField data-testid="employee-salary.detail.dialog.override.component.input" inputProps={{ "data-testid": "employee-salary.detail.dialog.override.component.input", "data-row-key": String(dicOverride.intSalaryComponentID) }} label={t("employee_salary_component", "Component")} value={dicOverride.strComponentName} disabled />
                      <Typography sx={{ color: "#64748b", fontSize: "0.78rem", pl: 1.5 }}>
                        {t("employee_salary_structure_default", "Structure default")}:
                      </Typography>
                    </Stack>
                    <Stack spacing={0.55}>
                      <TextField
                        data-testid="employee-salary.detail.dialog.override.monthly.input"
                        inputProps={{ "data-testid": "employee-salary.detail.dialog.override.monthly.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        label={t("employee_salary_monthly", "Monthly")}
                        value={dicOverride.decAmountMonthly}
                        placeholder={dicOverride.strDefaultMonthly}
                        InputLabelProps={{ shrink: true }}
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decAmountMonthly: objEvent.target.value } : dicRow)
                        }))}
                      />
                      <Typography sx={{ color: "#475569", fontSize: "0.78rem", pl: 1.5 }}>
                        {dicOverride.strDefaultMonthly || "-"}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.55}>
                      <TextField
                        data-testid="employee-salary.detail.dialog.override.annual.input"
                        inputProps={{ "data-testid": "employee-salary.detail.dialog.override.annual.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        label={t("employee_salary_annual", "Annual")}
                        value={dicOverride.decAmountAnnual}
                        placeholder={dicOverride.strDefaultAnnual}
                        InputLabelProps={{ shrink: true }}
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decAmountAnnual: objEvent.target.value } : dicRow)
                        }))}
                      />
                      <Typography sx={{ color: "#475569", fontSize: "0.78rem", pl: 1.5 }}>
                        {dicOverride.strDefaultAnnual || "-"}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.55}>
                      <TextField
                        data-testid="employee-salary.detail.dialog.override.percentage.input"
                        inputProps={{ "data-testid": "employee-salary.detail.dialog.override.percentage.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        label={t("employee_salary_percentage_value", "% Value")}
                        value={dicOverride.decPercentageValue}
                        placeholder={dicOverride.strDefaultPercentage}
                        InputLabelProps={{ shrink: true }}
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decPercentageValue: objEvent.target.value } : dicRow)
                        }))}
                      />
                      <Typography sx={{ color: "#475569", fontSize: "0.78rem", pl: 1.5 }}>
                        {dicOverride.strDefaultPercentage || "-"}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.55}>
                      <TextField
                        data-testid="employee-salary.detail.dialog.override.remarks.input"
                        inputProps={{ "data-testid": "employee-salary.detail.dialog.override.remarks.input", "data-row-key": String(dicOverride.intSalaryComponentID) }}
                        label={t("employee_salary_remarks", "Remarks")}
                        value={dicOverride.strRemarks}
                        InputLabelProps={{ shrink: true }}
                        sx={objOverrideValueFieldSx}
                        disabled={!dicOverride.blnAllowManualOverride}
                        onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                          ...dicPrev,
                          lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, strRemarks: objEvent.target.value } : dicRow)
                        }))}
                      />
                      <Typography sx={{ color: "transparent", fontSize: "0.78rem", pl: 1.5 }} aria-hidden="true">
                        -
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button data-testid="employee-salary.detail.dialog.cancel.button" className={styles.secondaryButton} onClick={() => setBlnDialogOpen(false)} disabled={blnSaving}>
                {t("employee_salary_cancel_button", "Cancel")}
              </Button>
              <Button data-testid="employee-salary.detail.dialog.save.button" className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSaveRevision} disabled={blnSaving}>
                {blnSaving
                  ? t("employee_salary_saving", "Saving...")
                  : t("employee_salary_save_revision", "Save Revision")}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

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
