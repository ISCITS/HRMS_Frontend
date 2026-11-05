"use client";

import { useEffect, useState } from "react";

import { Box, Button, Stack, Typography } from "@mui/material";

import RoleBasedDashboard from "../../components/dashboard/RoleBasedDashboard";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useDashboardBootstrapData, useSetDashboardContentLoading } from "@/components/layout/DashboardHeaderModeContext";
import dicConstant from "@/constants/Constant.json";
import { useDashboardLabels } from "@/features/dashboard/hooks/useDashboardLabels";
import type { CurrentUserContext, DashboardResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

export default function DashboardPage() {
  const { t } = useDashboardLabels();
  const setShellDashboardContentLoading = useSetDashboardContentLoading();
  const objBootstrappedData = useDashboardBootstrapData();
  const [blnLoading, setBlnLoading] = useState(!objBootstrappedData?.objUserContext || !objBootstrappedData?.objDashboard);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(objBootstrappedData?.objUserContext ?? null);
  const [objDashboard, setObjDashboard] = useState<DashboardResponse | null>(objBootstrappedData?.objDashboard ?? null);
  const [strError, setStrError] = useState("");
  const [strSelectedPayrollMonth, setStrSelectedPayrollMonth] = useState<string | null>(null);
  const [intReloadKey, setIntReloadKey] = useState(0);

  useEffect(() => {
    let blnMounted = true;
    if (intReloadKey === 0 && strSelectedPayrollMonth === null && objBootstrappedData?.objUserContext && objBootstrappedData.objDashboard) {
      setObjUserContext(objBootstrappedData.objUserContext);
      setObjDashboard(objBootstrappedData.objDashboard);
      setBlnLoading(false);
      setStrError("");
      return () => {
        blnMounted = false;
      };
    }

    setBlnLoading(true);
    setStrError("");

    Promise.all([authApiService.getCurrentUser(), authApiService.getDashboard(strSelectedPayrollMonth ?? null)])
      .then(([objUserResult, objDashboardResult]) => {
        if (!blnMounted) {
          return;
        }
        setObjUserContext(objUserResult.Data);
        setObjDashboard(objDashboardResult.Data);
      })
      .catch((objError: unknown) => {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("load_error", dicConstant.dashboard.loadError));
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoading(false);
        }
      });

    return () => {
      blnMounted = false;
    };
  }, [intReloadKey, objBootstrappedData, strSelectedPayrollMonth, t]);

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

  useEffect(() => {
    const blnWaitingForInitialDashboard = blnLoading && (!objUserContext || !objDashboard);
    setShellDashboardContentLoading?.(blnWaitingForInitialDashboard);
    return () => setShellDashboardContentLoading?.(false);
  }, [blnLoading, objDashboard, objUserContext, setShellDashboardContentLoading]);

  if ((!objUserContext || !objDashboard) && blnLoading) {
    if (setShellDashboardContentLoading) {
      return null;
    }

    return (
      <BlockingLoader blnOpen strLabel={t("loading", dicConstant.dashboard.loading)} blnLocal />
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
      onPayrollMonthChange={setStrSelectedPayrollMonth}
      onRefresh={() => setIntReloadKey((intValue) => intValue + 1)}
      blnRefreshing={blnLoading}
      strError={strError}
    />
  );
}
