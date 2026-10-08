"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Box,
  Chip,
  Link,
  Stack,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MasterBreadcrumbs, MasterGridSkeleton, dicMasterRowSx } from "@/components/master/MasterListUi";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import { useFlexiPayDeclarationLabels } from "@/features/flexi-pay-declaration/hooks/useFlexiPayDeclarationLabels";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationSummaryRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";

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

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function getStatusLabelKey(strStatus?: string | null) {
  return String(strStatus || "draft")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getStatusColor(strStatus?: string | null): "default" | "warning" | "success" | "error" {
  const strValue = String(strStatus || "").toLowerCase();
  if (["approved", "locked"].includes(strValue)) return "success";
  if (strValue === "submitted") return "warning";
  if (["returned", "rejected", "cancelled"].includes(strValue)) return "error";
  return "default";
}

const objChipBaseSx = {
  height: 30,
  border: "1px solid",
  fontWeight: 700,
  "& .MuiChip-label": {
    px: 1.5,
    py: 0.5,
  },
};

function getStatusChipSx(strStatus?: string | null) {
  const strValue = String(strStatus || "draft").toLowerCase();
  if (["approved", "locked"].includes(strValue)) {
    return { ...objChipBaseSx, color: "#067647", backgroundColor: "#ecfdf3", borderColor: "#abefc6" };
  }
  if (strValue === "submitted") {
    return { ...objChipBaseSx, color: "#175cd3", backgroundColor: "#eff8ff", borderColor: "#b2ddff" };
  }
  if (["returned", "rejected", "cancelled"].includes(strValue)) {
    return { ...objChipBaseSx, color: "#b42318", backgroundColor: "#fef3f2", borderColor: "#fecdca" };
  }
  return { ...objChipBaseSx, color: "#b54708", backgroundColor: "#fffaeb", borderColor: "#fedf89" };
}

export default function SalaryFlexiPayDeclarationsRoute() {
  const objRouter = useRouter();
  const { t } = useFlexiPayDeclarationLabels();
  const strCurrentFinancialYearCode = getCurrentFinancialYearCode();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objSummary, setObjSummary] = useState<FlexiDeclarationSummaryRecord | null>(null);

  const getTranslatedStatus = useCallback((strStatus?: string | null) => {
    const strStatusKey = getStatusLabelKey(strStatus);
    return t(strStatusKey, formatStatus(strStatus));
  }, [t]);

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objData = await flexiPayDeclarationService.getCurrentSummary(strCurrentFinancialYearCode);
        if (!blnMounted) return;
        setObjSummary(objData);
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(objError instanceof Error ? objError.message : t("unable_load_flexi_pay_declaration", "Unable to load Flexi Pay Declaration."));
        setObjSummary(null);
      } finally {
        if (blnMounted) setBlnLoading(false);
      }
    }

    void loadData();
    return () => {
      blnMounted = false;
    };
  }, [strCurrentFinancialYearCode, t]);

  const objListRow = useMemo(() => {
    const strCurrencyCode = objSummary?.objAssignedStructure?.strCurrencyCode || "INR";
    const decBasket = Number(objSummary?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
    const decDeclared = Number(objSummary?.decDeclaredFlexiAnnual || 0);
    const decResidual = Number(
      objSummary?.decResidualTaxableBalanceAnnual
      ?? objSummary?.objFlexiAllocation?.decResidualTaxableAllowanceAnnual
      ?? 0,
    );
    return {
      strCurrencyCode,
      strEmployeeCode: objSummary?.objEmployeeSummary?.strEmployeeCode || "-",
      strEmployeeName: objSummary?.objEmployeeSummary?.strEmployeeName || "Employee",
      strFinancialYearCode: objSummary?.strFinancialYearCode || strCurrentFinancialYearCode,
      strStatus: objSummary?.objDeclaration?.strWorkflowStatus || "draft",
      strStructureName: objSummary?.objAssignedStructure?.strSalaryStructureName || "-",
      decBasket,
      decDeclared,
      decResidual,
      intHistoryCount: Number(objSummary?.intHistoryCount || 0),
      blnCanDeclare: Boolean(objSummary?.blnCanDeclare),
    };
  }, [objSummary, strCurrentFinancialYearCode]);

  const lstTableRows = useMemo(() => {
    if (!objSummary) {
      return [];
    }
    return [
      {
        id: "current",
        strFinancialYearCode: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            title={objListRow.blnCanDeclare ? t("open", "Open") : t("view", "View")}
            controlId={`flexi-pay-declarations.row.${objListRow.blnCanDeclare ? "edit" : "view"}.link`}
            onClick={(objEvent) => {
              objEvent.stopPropagation();
              objRouter.push("/salary/flexi-pay-declaration");
            }}
          >
            {objListRow.strFinancialYearCode}
          </Link>
        ),
        strFinancialYearCodeSort: objListRow.strFinancialYearCode,
        strEmployeeCode: objListRow.strEmployeeCode,
        strEmployeeName: objListRow.strEmployeeName,
        strStructureName: objListRow.strStructureName,
        strStatus: <Chip size="small" color={getStatusColor(objListRow.strStatus)} label={getTranslatedStatus(objListRow.strStatus)} />,
        strStatusSort: objListRow.strStatus,
        decBasket: formatCurrency(objListRow.decBasket, objListRow.strCurrencyCode),
        decDeclared: formatCurrency(objListRow.decDeclared, objListRow.strCurrencyCode),
        decResidual: formatCurrency(objListRow.decResidual, objListRow.strCurrencyCode),
        intHistoryCount: objListRow.intHistoryCount,
      },
    ];
  }, [getTranslatedStatus, objListRow, objRouter, objSummary, t]);

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strFinancialYearCode", headerName: t("financial_year", "Financial Year"), width: 140, filterable: false, sortAccessor: (objRow) => String(objRow.strFinancialYearCodeSort) },
      { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 150 },
      { field: "strEmployeeName", headerName: t("employee_name", "Employee Name"), width: 200 },
      { field: "strStructureName", headerName: t("assigned_salary_structure", "Assigned Salary Structure"), width: 200 },
      { field: "strStatus", headerName: t("current_status", "Current Status"), filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strStatusSort) },
      { field: "decBasket", headerName: t("flexi_basket_available", "Flexi Basket Available"), align: "right", width: 190 },
      { field: "decDeclared", headerName: t("declared_flexi", "Declared Flexi"), align: "right", width: 160 },
      { field: "decResidual", headerName: t("residual_taxable_balance", "Residual Taxable Balance"), align: "right", width: 200 },
      { field: "intHistoryCount", headerName: t("history_count", "History Count"), align: "right", width: 140 },
    ],
    [t]
  );

  const nodeBreadcrumbs = <MasterBreadcrumbs strSection={t("breadcrumb_payroll_benefits", "Payroll & Benefits")} strTitle={t("breadcrumb_flexi_pay_declaration", "Flexi Pay Declaration")} />;
  const dicTableCardSx = { position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none", mt: "0 !important" } as const;

  if (blnLoading) {
    return (
      <Box className={styles.page} data-controlid="flexi-pay-declarations.loading">
        {nodeBreadcrumbs}
        <Box className={styles.tableCard} sx={dicTableCardSx}>
          <MasterGridSkeleton strControlId="flexi-pay-declarations.skeleton" intColumns={7} intRows={2} />
        </Box>
      </Box>
    );
  }

  return (
    <Stack spacing={0} className={styles.page} sx={{ gap: 0.5 }}>
      {nodeBreadcrumbs}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ px: 2, py: 0.25 }}>
        <Chip
          size="small"
          label={`${t("financial_year", "Financial Year")} ${objListRow.strFinancialYearCode}`}
          sx={{ ...objChipBaseSx, color: "#175cd3", backgroundColor: "#eff8ff", borderColor: "#b2ddff" }}
        />
        <Chip
          size="small"
          label={`${t("history", "History")} ${objListRow.intHistoryCount}`}
          sx={{ ...objChipBaseSx, color: "#6941c6", backgroundColor: "#f4f3ff", borderColor: "#d9d6fe" }}
        />
        <Chip size="small" label={getTranslatedStatus(objListRow.strStatus)} sx={getStatusChipSx(objListRow.strStatus)} />
      </Stack>

      {objSummary && !objSummary.blnCanDeclare ? (
        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
          {objSummary.strIneligibilityReason || t("no_flexi_pay_configured_current_salary_structure", "No flexi pay is configured for the current salary structure.")}
        </Alert>
      ) : null}

      <Box className={styles.tableCard} sx={dicTableCardSx}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          hideToolbar
          minTableWidth={1400}
          emptyMessage={t("flexi_declaration_summary_not_available", "Flexi declaration summary is not available right now.")}
          testIdPrefix="flexi-pay-declarations.list"
          onRowClick={() => objRouter.push("/salary/flexi-pay-declaration")}
          hideRowClickHint
          getRowSx={() => dicMasterRowSx}
          withPaper={false}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Stack>
  );
}
