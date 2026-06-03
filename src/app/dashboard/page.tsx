"use client";

import { useEffect, useState } from "react";

import RoleBasedDashboard from "@/components/dashboard/RoleBasedDashboard";
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
  const [strSelectedPayrollMonth, setStrSelectedPayrollMonth] = useState<string | null>(null);

  useEffect(() => {
    let blnMounted = true;

    Promise.all([authApiService.getCurrentUser(), authApiService.getDashboard(strSelectedPayrollMonth)])
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
  }, [strSelectedPayrollMonth]);

  if (blnLoading || !objUserContext || !objDashboard) {
    if (!blnLoading && strError) {
      return (
        <div style={{ padding: "24px", color: "#b91c1c" }}>{strError}</div>
      );
    }
    return (
      <BlockingLoader blnOpen strLabel={t("loading", dicConstant.dashboard.loading)} />
    );
  }

  return (
    <RoleBasedDashboard
      objDashboard={objDashboard}
      objUserContext={objUserContext}
      t={t}
      onPayrollMonthChange={setStrSelectedPayrollMonth}
    />
  );
}
