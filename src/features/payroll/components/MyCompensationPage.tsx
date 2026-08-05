"use client";

import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
import { useEffect, useMemo, useState } from "react";

import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalaryDetailRecord } from "@/features/employee-salary/types";
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

function DetailCell({
  strLabel,
  strValue,
  blnHighlight = false,
}: {
  strLabel: string;
  strValue: string;
  blnHighlight?: boolean;
}) {
  return (
    <Box sx={{ display: "grid", gap: 0.2 }}>
      <Typography sx={{ color: "#61738b", fontSize: "0.73rem", fontWeight: 700 }}>
        {strLabel}
      </Typography>
      <Typography
        sx={{
          color: blnHighlight ? "#155eef" : "#172b4d",
          fontSize: blnHighlight ? "1.02rem" : "0.9rem",
          fontWeight: blnHighlight ? 900 : 700,
        }}
      >
        {strValue}
      </Typography>
    </Box>
  );
}

function SnapshotMetric({
  strLabel,
  strValue,
  strTone,
}: {
  strLabel: string;
  strValue: string;
  strTone: "blue" | "green";
}) {
  const dicTone = strTone === "green"
    ? { bg: "#e7f8ee", fg: "#15803d" }
    : { bg: "#e8f1ff", fg: "#155eef" };

  return (
    <Box sx={{ alignItems: "center", display: "flex", gap: 1.2 }}>
      <Box
        sx={{
          alignItems: "center",
          background: dicTone.bg,
          borderRadius: 0,
          color: dicTone.fg,
          display: "grid",
          fontSize: "1.2rem",
          fontWeight: 900,
          height: 54,
          placeItems: "center",
          width: 54,
        }}
      >
        {strTone === "green" ? "CTC" : "Rs"}
      </Box>
      <DetailCell strLabel={strLabel} strValue={strValue} blnHighlight />
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
        const dicDetail = await employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID);
        if (!blnCancelled) {
          setObjDetail(dicDetail);
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

  const intTotalPages = Math.max(1, Math.ceil(lstVisibleComponentLines.length / intRowsPerPage));
  const intSafePage = Math.min(intPage, intTotalPages);

  useEffect(() => {
    if (intPage !== intSafePage) {
      setIntPage(intSafePage);
    }
  }, [intPage, intSafePage]);

  const lstPagedComponentLines = useMemo(() => {
    const intStartIndex = (intSafePage - 1) * intRowsPerPage;
    return lstVisibleComponentLines.slice(intStartIndex, intStartIndex + intRowsPerPage);
  }, [intRowsPerPage, intSafePage, lstVisibleComponentLines]);

  if (blnRightsLoading || blnLoading) {
    return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  }

  if (!blnCanView) {
    return <Alert severity="warning">My Compensation access is not available for your user group.</Alert>;
  }

  if (!objDetail) {
    return <Alert severity={strError ? "error" : "info"}>{strError || "No compensation detail is available."}</Alert>;
  }

  const objEmployeeSummary = objDetail.objEmployeeSummary;
  const objCurrentSalarySnapshot = objDetail.objCurrentSalarySnapshot;
  const objAssignedStructure = objDetail.objAssignedStructure;
  const objSalarySummary = objDetail.objSalarySummary;
  const objFlexiAllocation = objDetail.objFlexiAllocation;

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
        }}
      >
        <Box sx={{ alignItems: "center", display: "flex", gap: 0.8, px: 1.5, py: 1.2 }}>
          <Box sx={{ alignItems: "center", background: "#e8f1ff", borderRadius: 0, color: "#155eef", display: "grid", height: 26, placeItems: "center", width: 26 }}>
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />
          </Box>
          <Typography sx={{ color: "#172b4d", fontSize: "0.98rem", fontWeight: 900 }}>
            {t("current_salary_snapshot", "Current Salary Snapshot")}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1fr 1.4fr" },
            px: 1.5,
            pb: 1.5,
          }}
        >
          <Box sx={{ alignItems: "center", display: "flex", minHeight: 72 }}>
            <SnapshotMetric strLabel={t("gross_monthly", "Gross Monthly")} strValue={formatCurrency(objCurrentSalarySnapshot?.decGrossMonthly, strCurrencyCode)} strTone="blue" />
          </Box>
          <Box sx={{ alignItems: "center", borderLeft: { lg: "1px solid #d8e4f0" }, display: "flex", minHeight: 72, pl: { lg: 2 } }}>
            <SnapshotMetric strLabel={t("annual_ctc", "CTC Annual")} strValue={formatCurrency(objCurrentSalarySnapshot?.decCtcAnnual, strCurrencyCode)} strTone="green" />
          </Box>
          <Box sx={{ borderLeft: { lg: "1px solid #d8e4f0" }, display: "grid", gap: 0.9, pl: { lg: 2 } }}>
            <Box sx={{ display: "grid", gap: 0.2, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <Typography sx={{ color: "#61738b", fontSize: "0.82rem", fontWeight: 700 }}>{t("current_since", "Current Since")}</Typography>
              <Typography sx={{ color: "#172b4d", fontSize: "0.88rem", fontWeight: 900 }}>{formatDate(objCurrentSalarySnapshot?.dtEffectiveFrom || objAssignedStructure?.dtEffectiveFrom)}</Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 0.2, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <Typography sx={{ color: "#61738b", fontSize: "0.82rem", fontWeight: 700 }}>{t("revision_status", "Revision Status")}</Typography>
              <Typography sx={{ color: "#172b4d", fontSize: "0.88rem", fontWeight: 900 }}>{t("current", "Current")}</Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 0.2, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <Typography sx={{ color: "#61738b", fontSize: "0.82rem", fontWeight: 700 }}>{t("source_of_salary_assignment", "Source of Salary Assignment")}</Typography>
              <Typography sx={{ color: "#172b4d", fontSize: "0.88rem", fontWeight: 900 }}>{objAssignedStructure?.strStructureName ? t("structure", "Structure") : "-"}</Typography>
            </Box>
          </Box>
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
              {t("component_lines", "Component Lines")}
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
                {lstVisibleComponentLines.length ? `${(intSafePage - 1) * intRowsPerPage + 1}-${Math.min(intSafePage * intRowsPerPage, lstVisibleComponentLines.length)} of ${lstVisibleComponentLines.length}` : "0-0 of 0"}
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

          {lstVisibleComponentLines.length > intRowsPerPage ? (
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
              {t("salary_breakdown_impact", "Salary Breakdown Impact")}
            </Typography>
            <InfoOutlinedIcon sx={{ color: "#155eef", fontSize: 16 }} />
          </Box>

          <Stack spacing={0.55}>
            <ImpactRow strLabel={t("annual_ctc", "Annual CTC")} strValue={formatCurrency(objSalarySummary?.decAnnualCtc ?? objCurrentSalarySnapshot?.decCtcAnnual, strCurrencyCode)} />
            <ImpactRow strLabel={t("gross_monthly", "Gross Monthly")} strValue={formatCurrency(objSalarySummary?.decGrossMonthly ?? objCurrentSalarySnapshot?.decGrossMonthly, strCurrencyCode)} />
            <ImpactRow strLabel={t("basic_salary", "Basic Salary")} strValue={formatCurrency(lstVisibleComponentLines.find((dicLine) => (dicLine.strComponentName || "").trim().toLowerCase() === "basic salary")?.decAmountAnnual, strCurrencyCode)} />
            <ImpactRow strLabel={t("hra", "HRA")} strValue={formatCurrency(lstVisibleComponentLines.find((dicLine) => (dicLine.strComponentName || "").trim().toLowerCase().includes("house rent allowance") || (dicLine.strComponentCode || "").trim().toLowerCase() === "hra")?.decAmountAnnual, strCurrencyCode)} />
            <ImpactRow strLabel={t("flexi_pay_declaration", "Flexi Pay Declaration")} strValue="" blnSection />
            <ImpactRow strLabel={t("flexi_bucket_available", "Flexi Bucket Available")} strValue={formatCurrency(objSalarySummary?.decFlexiBucketAnnual ?? objFlexiAllocation?.decFlexiBasketAvailableAnnual, strCurrencyCode)} />
            <ImpactRow strLabel={t("approved_declared_flexi", "Approved / Declared Flexi")} strValue={formatCurrency(objSalarySummary?.decApprovedFlexiAnnual ?? objFlexiAllocation?.decAllocatedFlexiAnnual, strCurrencyCode)} strTone={Number(objSalarySummary?.decApprovedFlexiAnnual ?? objFlexiAllocation?.decAllocatedFlexiAnnual ?? 0) > 0 ? "default" : "danger"} />
            <ImpactRow strLabel={t("residual_taxable", "Residual Taxable")} strValue={formatCurrency(objSalarySummary?.decResidualTaxableAnnual ?? objFlexiAllocation?.decResidualTaxableAllowanceAnnual, strCurrencyCode)} strTone="success" />
            <ImpactRow strLabel={t("estimated_monthly_payroll_impact", "Estimated Monthly Payroll Impact")} strValue={formatCurrency(objSalarySummary?.decResidualTaxableAnnual != null ? (objSalarySummary.decResidualTaxableAnnual || 0) / 12 : objFlexiAllocation?.decResidualTaxableAllowanceMonthly, strCurrencyCode)} strTone="success" />
          </Stack>
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
