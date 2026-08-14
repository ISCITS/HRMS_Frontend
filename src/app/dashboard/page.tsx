"use client";

import { useCallback, useEffect, useState } from "react";

import { Box, Button, Stack, Typography } from "@mui/material";

import RoleBasedDashboard from "../../components/dashboard/RoleBasedDashboard";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useDashboardLabels } from "@/features/dashboard/hooks/useDashboardLabels";
import type { CurrentUserContext, DashboardResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

function resolveLatestPayrollMonth(objDashboard: DashboardResponse | null): string | null {
  const objRecentRunsWidget = objDashboard?.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "recent_payroll_runs");
  const objPayload = (objRecentRunsWidget?.objPayload || {}) as { lstAvailablePayrollMonths?: unknown[]; lstRows?: Array<{ payroll_month?: unknown }> };
  const lstAvailableMonths = (objPayload.lstAvailablePayrollMonths || [])
    .map((strMonth) => String(strMonth || "").trim())
    .filter(Boolean);
  if (lstAvailableMonths.length) {
    return lstAvailableMonths[0];
  }
  return (objPayload.lstRows || [])
    .map((objRow) => String(objRow.payroll_month || "").trim())
    .find(Boolean) || null;
}

export default function DashboardPage() {
  const { t } = useDashboardLabels();
  const [blnLoading, setBlnLoading] = useState(true);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objDashboard, setObjDashboard] = useState<DashboardResponse | null>(null);
  const [strError, setStrError] = useState("");
  const [strSelectedPayrollMonth, setStrSelectedPayrollMonth] = useState<string | null>(null);
  const [blnPayrollMonthInitialized, setBlnPayrollMonthInitialized] = useState(false);
  const [intReloadKey, setIntReloadKey] = useState(0);
  const strLoadErrorMessage = t("load_error", dicConstant.dashboard.loadError);

  useEffect(() => {
    let blnMounted = true;
    setBlnLoading(true);
    setStrError("");

    async function loadDashboard() {
      try {
        const [objUserResult, objInitialDashboardResult] = await Promise.all([
          authApiService.getCurrentUser(),
          authApiService.getDashboard(strSelectedPayrollMonth),
        ]);
        if (!blnMounted) {
          return;
        }
        let strResolvedPayrollMonth = strSelectedPayrollMonth;
        let objDashboardData = objInitialDashboardResult.Data;
        if (!blnPayrollMonthInitialized && !strSelectedPayrollMonth) {
          const strLatestPayrollMonth = resolveLatestPayrollMonth(objInitialDashboardResult.Data);
          if (strLatestPayrollMonth) {
            strResolvedPayrollMonth = strLatestPayrollMonth;
            const objMonthDashboardResult = await authApiService.getDashboard(strLatestPayrollMonth);
            if (!blnMounted) {
              return;
            }
            objDashboardData = objMonthDashboardResult.Data;
          }
          setBlnPayrollMonthInitialized(true);
          setStrSelectedPayrollMonth(strResolvedPayrollMonth);
        }
        setObjUserContext(objUserResult.Data);
        setObjDashboard(objDashboardData);
      } catch (objError: unknown) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : strLoadErrorMessage);
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      blnMounted = false;
    };
  }, [blnPayrollMonthInitialized, intReloadKey, strLoadErrorMessage, strSelectedPayrollMonth]);

  const handlePayrollMonthChange = useCallback((strPayrollMonth: string | null) => {
    setBlnPayrollMonthInitialized(true);
    setStrSelectedPayrollMonth((strCurrentPayrollMonth) => (
      strCurrentPayrollMonth === strPayrollMonth ? strCurrentPayrollMonth : strPayrollMonth
    ));
  }, []);

  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState === "visible") {
        setIntReloadKey((intValue) => intValue + 1);
      }
    }
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("focus", refreshOnReturn);
    return () => {
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("focus", refreshOnReturn);
    };
  }, []);

  if ((!objUserContext || !objDashboard) && !strError) {
    return (
      <BlockingLoader blnOpen strLabel={t("loading", dicConstant.dashboard.loading)} />
    );
  }

  if (!objUserContext || !objDashboard) {
    if (strError) {
      return (
        <Box sx={{ p: 3 }}>
          <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
            <Typography sx={{ color: "#b91c1c", fontWeight: 800 }}>
              {strError}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setIntReloadKey((intValue) => intValue + 1)}
              sx={{ alignSelf: "flex-start" }}
            >
              {t("retry", "Retry")}
            </Button>
          </Stack>
        </Box>
      );
    }
    return null;
  }

  return (
    <RoleBasedDashboard
      objDashboard={objDashboard}
      objUserContext={objUserContext}
      strSelectedPayrollMonth={strSelectedPayrollMonth}
      t={t}
      onPayrollMonthChange={handlePayrollMonthChange}
      onRefresh={() => setIntReloadKey((intValue) => intValue + 1)}
      blnRefreshing={blnLoading}
      strError={strError}
    />
  );
}
