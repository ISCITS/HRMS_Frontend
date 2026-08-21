"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  border: "1px solid",
  fontWeight: 700,
  "& .MuiChip-label": {
    px: 1.25,
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
        action: (
          <Button
            size="small"
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => objRouter.push("/salary/flexi-pay-declaration")}
            controlId={`flexi-pay-declarations.row.${objListRow.blnCanDeclare ? "edit" : "view"}.button`}
          >
            {objListRow.blnCanDeclare ? t("open", "Open") : t("view", "View")}
          </Button>
        ),
        strEmployeeCode: objListRow.strEmployeeCode,
        strEmployeeName: objListRow.strEmployeeName,
        strFinancialYearCode: objListRow.strFinancialYearCode,
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
      { field: "action", headerName: t("action", "Action"), align: "center", sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 150 },
      { field: "strEmployeeName", headerName: t("employee_name", "Employee Name"), width: 200 },
      { field: "strFinancialYearCode", headerName: t("financial_year", "Financial Year"), width: 140 },
      { field: "strStructureName", headerName: t("assigned_salary_structure", "Assigned Salary Structure"), width: 200 },
      { field: "strStatus", headerName: t("current_status", "Current Status"), filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strStatusSort) },
      { field: "decBasket", headerName: t("flexi_basket_available", "Flexi Basket Available"), align: "right", width: 190 },
      { field: "decDeclared", headerName: t("declared_flexi", "Declared Flexi"), align: "right", width: 160 },
      { field: "decResidual", headerName: t("residual_taxable_balance", "Residual Taxable Balance"), align: "right", width: 200 },
      { field: "intHistoryCount", headerName: t("history_count", "History Count"), align: "right", width: 140 },
    ],
    [t]
  );

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Stack spacing={0} className={styles.page}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ px: 2, py: 1.5 }}>
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

      <Paper className={styles.tableCard} sx={{ mt: "0 !important" }}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          hideToolbar
          minTableWidth={1400}
          emptyMessage={t("flexi_declaration_summary_not_available", "Flexi declaration summary is not available right now.")}
          testIdPrefix="flexi-pay-declarations.list"
          withPaper={false}
        />
      </Paper>
    </Stack>
  );
}
