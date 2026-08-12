"use client";

import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalaryComponentLine, EmployeeSalaryDetailRecord } from "@/features/employee-salary/types";
import { calculateEmployeeSalaryBaseSummaryMetrics } from "@/features/employee-salary/utils/employeeSalarySummary";
import { itDeclarationService, type ItDeclarationDashboardCardDto } from "@/features/it-declaration/services/itDeclarationService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authApiService } from "@/services/auth/AuthApiService";

const lstRowsPerPageOptions = [10, 20, 50] as const;

function formatCurrency(decValue: number | null | undefined, strCurrencyCode = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(decValue || 0));
}

function formatDate(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(strValue));
}

function normalizeCategory(strValue: string | null | undefined) {
  const strTrimmed = String(strValue ?? "").trim();
  return strTrimmed || "-";
}

function normalizeToken(strValue: string | null | undefined) {
  return String(strValue ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Mirrors the Component Lines filter on the admin Employee Salary page (EmployeeSalaryDetailPage):
// keep the flexi bucket total line, drop flexi reimbursement options and non-CTC reimbursements,
// which are surfaced separately in the Flexi Breakdown panel instead.
// Basic Salary is already shown as its own summary tile above the table, so it's dropped here
// to avoid showing the same figure twice on the page.
function isBasicSalaryComponentLine(dicLine: EmployeeSalaryComponentLine) {
  const strName = normalizeToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  return strName.includes("basic");
}

function isFlexiBucketComponentLine(dicLine: EmployeeSalaryComponentLine) {
  const strName = normalizeToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  return Boolean(dicLine.blnIsFlexiBasket) || strName === "flexipay" || strName === "flexibucket";
}

function isFlexiAllocationComponentLine(dicLine: EmployeeSalaryComponentLine) {
  if (isFlexiBucketComponentLine(dicLine)) {
    return false;
  }
  const strCategory = normalizeToken(dicLine.strComponentCategory ?? "");
  return Boolean(dicLine.blnIsFlexiBenefit) || strCategory.includes("reimbursement");
}

function isNonCtcReimbursementComponentLine(dicLine: EmployeeSalaryComponentLine) {
  if (isFlexiBucketComponentLine(dicLine)) {
    return false;
  }
  const strCategory = normalizeToken(dicLine.strComponentCategory ?? "");
  return strCategory.includes("reimbursement") && dicLine.blnIncludedInCtc === false;
}

// Employee-side PF (or similar) deduction lines aren't tagged with a dedicated flag, so this
// mirrors the admin Employee Salary page's isEmployeePfComponent: a "pf" component that isn't
// the employer's share, sitting in a deduction category.
function isEmployeeDeductionComponentLine(dicLine: EmployeeSalaryComponentLine) {
  const strCategory = normalizeToken(dicLine.strComponentCategory ?? "");
  if (strCategory.includes("deduction")) {
    return true;
  }
  const strName = normalizeToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  return strName.includes("pf") && !strName.includes("employer") && strCategory.includes("deduction");
}

function DetailCell({
  strLabel,
  strValue,
  blnHighlight = false,
  objIcon,
  strIconColor,
}: {
  strLabel: string;
  strValue: string;
  blnHighlight?: boolean;
  objIcon?: ReactNode;
  strIconColor?: string;
}) {
  const objTextStack = (
    <Box sx={{ display: "grid", gap: 0.2, minWidth: 0 }}>
      <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700, whiteSpace: "nowrap" }}>
        {strLabel}
      </Typography>
      <Typography
        sx={{
          color: blnHighlight ? "#155eef" : "#172b4d",
          fontSize: blnHighlight ? "1.02rem" : "0.9rem",
          fontWeight: blnHighlight ? 900 : 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {strValue}
      </Typography>
    </Box>
  );

  if (!objIcon) {
    return objTextStack;
  }

  return (
    <Box sx={{ alignItems: "center", display: "flex", gap: 0.8, minWidth: 0 }}>
      <Box
        sx={{
          alignItems: "center",
          background: `${strIconColor}1a`,
          borderRadius: "50%",
          color: strIconColor,
          display: "grid",
          flexShrink: 0,
          height: 28,
          placeItems: "center",
          width: 28,
        }}
      >
        {objIcon}
      </Box>
      {objTextStack}
    </Box>
  );
}

function ImpactRow({
  strLabel,
  strValue,
  strTone = "default",
  blnSection = false,
}: {
  strLabel: string;
  strValue: string;
  strTone?: "default" | "success" | "danger";
  blnSection?: boolean;
}) {
  return (
    <Box
      sx={{
        alignItems: "center",
        background: blnSection ? "#e7f8ee" : "transparent",
        borderRadius: 0,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 0.6,
        px: blnSection ? 1 : 0,
        py: blnSection ? 0.75 : 0.15,
      }}
    >
      <Typography sx={{ color: "#1a2f55", fontSize: "0.88rem", fontWeight: 800 }}>
        {strLabel}
      </Typography>
      <Typography
        sx={{
          color:
            strTone === "success"
              ? "#0f9f6e"
              : strTone === "danger"
                ? "#e11d48"
                : "#13294b",
          fontSize: "0.88rem",
          fontWeight: 900,
        }}
      >
        {strValue}
      </Typography>
    </Box>
  );
}

export default function MyCompensationPage() {
  const { t } = useModuleLabels("my-compensation");
  const { blnLoading: blnRightsLoading, canViewAny, canDoAny } = useModuleActionAccess([
    "ESS_MY_COMPENSATION",
    "MY_COMPENSATION",
    "ESS_FLEXI_PAY_DECLARATION",
    "EMPLOYEE_SALARY",
  ]);
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objItDeclarationCard, setObjItDeclarationCard] = useState<ItDeclarationDashboardCardDto | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [intRowsPerPage, setIntRowsPerPage] = useState<number>(10);
  const [intPage, setIntPage] = useState(1);

  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list") || canDoAny("salary_view");
  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }

    let blnCancelled = false;

    async function loadCompensation() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objUserResult = await authApiService.getCurrentUser();
        const intEmployeeID = objUserResult.Data.objUser.intEmployeeID ?? null;
        if (!intEmployeeID) {
          throw new Error("Employee profile is not linked to this user.");
        }
        const [dicDetail, objItDashboard] = await Promise.all([
          employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID),
          itDeclarationService.getDashboard().catch(() => null),
        ]);
        if (!blnCancelled) {
          setObjDetail(dicDetail);
          const objCurrentItCard = objItDashboard
            ? objItDashboard.lstDeclarations.find(
                (dicCard) => dicCard.strFinancialYearCode === objItDashboard.strCurrentFinancialYearCode
              ) ?? objItDashboard.lstDeclarations[0] ?? null
            : null;
          setObjItDeclarationCard(objCurrentItCard);
          setIntPage(1);
        }
      } catch (objError) {
        if (!blnCancelled) {
          setObjDetail(null);
          setStrError(objError instanceof Error ? objError.message : "Unable to load my compensation.");
        }
      } finally {
        if (!blnCancelled) {
          setBlnLoading(false);
        }
      }
    }

    loadCompensation().catch(() => undefined);

    return () => {
      blnCancelled = true;
    };
  }, [blnCanView, blnRightsLoading]);

  const lstVisibleComponentLines = useMemo(
    () => (objDetail?.lstComponentLines ?? []).filter((dicLine) => Number(dicLine.decAmountAnnual || 0) > 0 || Number(dicLine.decAmountMonthly || 0) > 0),
    [objDetail]
  );

  const lstSalaryStructureRows = useMemo(
    () => lstVisibleComponentLines.filter((dicLine) => {
      if (isFlexiBucketComponentLine(dicLine)) return true;
      if (isFlexiAllocationComponentLine(dicLine)) return false;
      if (isNonCtcReimbursementComponentLine(dicLine)) return false;
      if (isBasicSalaryComponentLine(dicLine)) return false;
      return true;
    }),
    [lstVisibleComponentLines]
  );

  const intTotalPages = Math.max(1, Math.ceil(lstSalaryStructureRows.length / intRowsPerPage));
  const intSafePage = Math.min(intPage, intTotalPages);

  useEffect(() => {
    if (intPage !== intSafePage) {
      setIntPage(intSafePage);
    }
  }, [intPage, intSafePage]);

  const lstPagedComponentLines = useMemo(() => {
    const intStartIndex = (intSafePage - 1) * intRowsPerPage;
    return lstSalaryStructureRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
  }, [intRowsPerPage, intSafePage, lstSalaryStructureRows]);

  if (blnRightsLoading || blnLoading) {
    return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  }

  if (!blnCanView) {
    return <Alert severity="warning">My Compensation access is not available for your user group.</Alert>;
  }

  if (!objDetail) {
    return <Alert severity={strError ? "error" : "info"}>{strError || "No compensation detail is available."}</Alert>;
  }

  const objCurrentSalarySnapshot = objDetail.objCurrentSalarySnapshot;
  const objAssignedStructure = objDetail.objAssignedStructure;
  const objFlexiAllocation = objDetail.objFlexiAllocation;

  // Recomputed live from component lines (same as the admin Employee Salary page), rather than
  // trusted from objSalarySummary/objCurrentSalarySnapshot, which can lag behind an approved
  // flexi declaration and disagree with the admin page's figures.
  const dicBaseSummaryMetrics = calculateEmployeeSalaryBaseSummaryMetrics(objDetail);
  const decCtcAnnual = dicBaseSummaryMetrics.decAnnualCtc;
  const decGrossMonthly = dicBaseSummaryMetrics.decGrossMonthly;
  const decGrossAnnual = decGrossMonthly * 12;
  const decBasicSalaryAnnual = dicBaseSummaryMetrics.decBasicAnnual;
  const decEmployeeDeductionsMonthly = (objDetail.lstComponentLines ?? []).reduce((decSum, dicLine) => (
    isEmployeeDeductionComponentLine(dicLine) ? decSum + Number(dicLine.decAmountMonthly ?? 0) : decSum
  ), 0);
  const decNetMonthly = Math.max(decGrossMonthly - decEmployeeDeductionsMonthly, 0);
  const decNetAnnual = decNetMonthly * 12;

  const strTaxRegime = objItDeclarationCard?.strTaxRegime?.trim() || t("tax_regime_na", "NA");
  const blnHasItDeclaration = Boolean(objItDeclarationCard);
  const decItDeclaredAnnual = objItDeclarationCard?.decDeclaredAmount ?? null;
  const decItApprovedAnnual = objItDeclarationCard?.decApprovedAmount ?? null;

  const lstFlexiAllocationLines = objFlexiAllocation?.lstAllocationLines ?? [];
  const decFlexiBucketAvailableAnnual = dicBaseSummaryMetrics.decFlexiBucketAnnual;
  const blnHasFlexiBucket = dicBaseSummaryMetrics.blnHasFlexiBucket || lstFlexiAllocationLines.length > 0;
  const lstApprovedFlexiLines = lstFlexiAllocationLines.filter((dicLine) => Number(dicLine.decApprovedAnnualAmount ?? 0) > 0);
  const decApprovedFlexiTotalRaw = lstApprovedFlexiLines.reduce((decSum, dicLine) => decSum + Number(dicLine.decApprovedAnnualAmount ?? 0), 0);
  const decApprovedFlexiTotal = decApprovedFlexiTotalRaw > 0
    ? decApprovedFlexiTotalRaw
    : (objFlexiAllocation?.decAllocatedFlexiAnnual ?? 0);

  return (
    <Stack spacing={1}>
      <Box className="pageBanner" data-control-id="ess.my-compensation.header.banner" sx={{ flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">
            {t("page_title", "My Compensation")}
          </Typography>
          <Typography component="p" className="bannerSubTitle">
            {t("page_subtitle", "View your compensation details and how your CTC is structured.")}
          </Typography>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box
        sx={{
          background: "#fff",
          border: "1px solid #d7e6f5",
          borderRadius: 0,
          boxShadow: "0 10px 24px rgba(30, 64, 175, 0.06)",
          overflow: "hidden",
          p: 1.1,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          }}
        >
          <DetailCell
            strLabel={t("annual_ctc", "CTC Annual")}
            strValue={formatCurrency(decCtcAnnual, strCurrencyCode)}
            blnHighlight
            objIcon={<CalendarMonthOutlinedIcon sx={{ fontSize: 15 }} />}
            strIconColor="#15803d"
          />
          <DetailCell
            strLabel={t("gross_annual", "Gross Annual")}
            strValue={formatCurrency(decGrossAnnual, strCurrencyCode)}
            blnHighlight
            objIcon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />}
            strIconColor="#155eef"
          />
          <DetailCell
            strLabel={t("net_annual", "Net Annual")}
            strValue={formatCurrency(decNetAnnual, strCurrencyCode)}
            blnHighlight
            objIcon={<SavingsOutlinedIcon sx={{ fontSize: 15 }} />}
            strIconColor="#7c3aed"
          />
          <DetailCell strLabel={t("salary_revised_on", "Salary Revised On")} strValue={formatDate(objCurrentSalarySnapshot?.dtEffectiveFrom || objAssignedStructure?.dtEffectiveFrom)} />
          <DetailCell
            strLabel={t("basic_salary", "Basic Salary")}
            strValue={formatCurrency(decBasicSalaryAnnual, strCurrencyCode)}
            objIcon={<PaidOutlinedIcon sx={{ fontSize: 15 }} />}
            strIconColor="#b45309"
          />
          <DetailCell
            strLabel={t("gross_monthly", "Gross Monthly")}
            strValue={formatCurrency(decGrossMonthly, strCurrencyCode)}
            objIcon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />}
            strIconColor="#155eef"
          />
          <DetailCell
            strLabel={t("net_monthly", "Net Monthly")}
            strValue={formatCurrency(decNetMonthly, strCurrencyCode)}
            objIcon={<SavingsOutlinedIcon sx={{ fontSize: 15 }} />}
            strIconColor="#7c3aed"
          />
          <DetailCell strLabel={t("tax_regime", "Tax Regime")} strValue={strTaxRegime} />
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 360px" } }}>
        <Box
          sx={{
            background: "#fff",
            border: "1px solid #d7e6f5",
            borderRadius: 0,
            boxShadow: "0 10px 24px rgba(30, 64, 175, 0.06)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 1, px: 1.5, py: 1.2 }}>
            <Typography sx={{ color: "#172b4d", fontSize: "0.96rem", fontWeight: 900 }}>
              {t("salary_structure", "Salary Structure")}
            </Typography>
            <Box sx={{ alignItems: "center", color: "#61738b", display: "flex", flexWrap: "wrap", gap: 0.8, fontSize: "0.84rem" }}>
              <Typography sx={{ fontSize: "0.84rem" }}>{t("rows_per_page", "Rows per page")}</Typography>
              <Select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                sx={{ minWidth: 64, borderRadius: 0, "& .MuiSelect-select": { py: 0.45, fontSize: "0.84rem" } }}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </Select>
              <Typography sx={{ fontSize: "0.84rem" }}>
                {lstSalaryStructureRows.length ? `${(intSafePage - 1) * intRowsPerPage + 1}-${Math.min(intSafePage * intRowsPerPage, lstSalaryStructureRows.length)} of ${lstSalaryStructureRows.length}` : "0-0 of 0"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ overflowX: "auto", px: 0.8, pb: 0.4 }}>
            <table style={{ borderCollapse: "collapse", minWidth: 620, width: "100%" }}>
              <thead>
                <tr>
                  {["Component", "Category", "Annual", "Monthly"].map((strHeader) => (
                    <th
                      key={strHeader}
                      style={{
                        borderBottom: "1px solid #d7e6f5",
                        color: "#172b4d",
                        fontSize: "0.84rem",
                        fontWeight: 800,
                        padding: "9px 10px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {strHeader}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lstPagedComponentLines.map((dicLine) => (
                  <tr key={dicLine.intEmployeeSalaryComponentID}>
                    <td style={{ borderBottom: "1px solid #e7eef7", color: "#172b4d", fontSize: "0.84rem", fontWeight: 800, padding: "8px 10px" }}>
                      {dicLine.strComponentName || dicLine.strComponentCode || "-"}
                    </td>
                    <td style={{ borderBottom: "1px solid #e7eef7", color: "#394b63", fontSize: "0.84rem", padding: "8px 10px" }}>
                      {normalizeCategory(dicLine.strComponentCategory)}
                    </td>
                    <td style={{ borderBottom: "1px solid #e7eef7", color: "#394b63", fontSize: "0.84rem", padding: "8px 10px", whiteSpace: "nowrap" }}>
                      {dicLine.decAmountAnnual != null ? formatCurrency(dicLine.decAmountAnnual, strCurrencyCode) : "-"}
                    </td>
                    <td style={{ borderBottom: "1px solid #e7eef7", color: "#394b63", fontSize: "0.84rem", padding: "8px 10px", whiteSpace: "nowrap" }}>
                      {dicLine.decAmountMonthly != null ? formatCurrency(dicLine.decAmountMonthly, strCurrencyCode) : "-"}
                    </td>
                  </tr>
                ))}
                {!lstPagedComponentLines.length ? (
                  <tr>
                    <td colSpan={4} style={{ color: "#61738b", fontSize: "0.84rem", padding: "14px 10px", textAlign: "center" }}>
                      {t("no_component_lines", "No component lines are available.")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Box>

          {lstSalaryStructureRows.length > intRowsPerPage ? (
            <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1.5, py: 1 }}>
              <Pagination
                count={intTotalPages}
                page={intSafePage}
                onChange={(_objEvent, intNextPage) => setIntPage(intNextPage)}
                color="primary"
                shape="rounded"
              />
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            background: "#fff",
            border: "1px solid #d7e6f5",
            borderRadius: 0,
            boxShadow: "0 10px 24px rgba(30, 64, 175, 0.06)",
            p: 1.4,
          }}
        >
          <Box sx={{ alignItems: "center", display: "flex", gap: 0.6, mb: 1 }}>
            <Typography sx={{ color: "#172b4d", fontSize: "0.96rem", fontWeight: 900 }}>
              {t("flexi_breakdown", "Flexi Breakdown")}
            </Typography>
            <InfoOutlinedIcon sx={{ color: "#155eef", fontSize: 16 }} />
          </Box>

          {blnHasFlexiBucket ? (
            <Stack spacing={0.55}>
              <ImpactRow strLabel={t("flexi_bucket_available", "Flexi Bucket Available")} strValue={formatCurrency(decFlexiBucketAvailableAnnual, strCurrencyCode)} />
              <ImpactRow strLabel={t("approved_flexi", "Approved Flexi")} strValue={formatCurrency(decApprovedFlexiTotal, strCurrencyCode)} strTone="success" blnSection />
              {lstApprovedFlexiLines.length ? (
                lstApprovedFlexiLines.map((dicLine) => (
                  <ImpactRow
                    key={`approved-${dicLine.intSalaryComponentID}`}
                    strLabel={dicLine.strComponentName || dicLine.strComponentCode || "-"}
                    strValue={formatCurrency(dicLine.decApprovedAnnualAmount, strCurrencyCode)}
                    strTone="success"
                  />
                ))
              ) : (
                <ImpactRow strLabel={t("flexi_not_yet_approved", "Not Yet Approved")} strValue="" />
              )}
            </Stack>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 0, fontSize: "0.82rem" }}>
              {t("no_flexi_pay_declared_full", "No Flexi Pay Declared.")}
            </Alert>
          )}

          <Box sx={{ alignItems: "center", display: "flex", gap: 0.6, mb: 1, mt: 2.2 }}>
            <Typography sx={{ color: "#172b4d", fontSize: "0.96rem", fontWeight: 900 }}>
              {t("it_declaration", "IT Declaration")}
            </Typography>
            <InfoOutlinedIcon sx={{ color: "#155eef", fontSize: 16 }} />
          </Box>

          {blnHasItDeclaration ? (
            <Stack spacing={0.55}>
              <ImpactRow strLabel={t("declared_it_declaration", "Declared IT Declaration")} strValue={formatCurrency(decItDeclaredAnnual, strCurrencyCode)} />
              <ImpactRow strLabel={t("approved_it_declaration", "Approved IT Declaration")} strValue={formatCurrency(decItApprovedAnnual, strCurrencyCode)} strTone="success" />
            </Stack>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 0, fontSize: "0.82rem" }}>
              {t("no_it_declaration_declared", "No IT Declaration Declared.")}
            </Alert>
          )}
        </Box>
      </Box>

      <Box sx={{ alignItems: "center", background: "#f4f9ff", border: "1px solid #d7e6f5", borderRadius: 0, color: "#39526e", display: "flex", gap: 0.7, px: 1.4, py: 0.9 }}>
        <InfoOutlinedIcon sx={{ color: "#155eef", fontSize: 18 }} />
        <Typography sx={{ fontSize: "0.84rem" }}>
          {t("amount_note", "All amounts are in INR. Negative values (deductions) reduce your take-home pay.")}
        </Typography>
      </Box>
    </Stack>
  );
}
