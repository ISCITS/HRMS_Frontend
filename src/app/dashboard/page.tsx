"use client";

import { useEffect, useState } from "react";

import { Box, Button, Stack, Typography } from "@mui/material";

import RoleBasedDashboard from "../../components/dashboard/RoleBasedDashboard";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useDashboardLabels } from "@/features/dashboard/hooks/useDashboardLabels";
import type { CurrentUserContext, DashboardResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

export default function DashboardPage() {
  const { t } = useDashboardLabels();
  const [blnLoading, setBlnLoading] = useState(true);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objDashboard, setObjDashboard] = useState<DashboardResponse | null>(null);
  const [strError, setStrError] = useState("");
  const [strSelectedPayrollMonth, setStrSelectedPayrollMonth] = useState<string | null | undefined>(undefined);
  const [intReloadKey, setIntReloadKey] = useState(0);

  useEffect(() => {
    let blnMounted = true;
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
  }, [intReloadKey, strSelectedPayrollMonth, t]);

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

  if ((!objUserContext || !objDashboard) && blnLoading) {
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
      onPayrollMonthChange={setStrSelectedPayrollMonth}
      onRefresh={() => setIntReloadKey((intValue) => intValue + 1)}
      blnRefreshing={blnLoading}
      strError={strError}
    />
  );
}
