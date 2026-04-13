"use client";

import { useEffect, useState } from "react";

import DashboardLanding from "@/components/dashboard/DashboardLanding";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { normalizeMenuResponse } from "@/lib/menu";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

export default function DashboardPage() {
  const [blnLoading, setBlnLoading] = useState(true);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objMenu, setObjMenu] = useState<MenuResponse | null>(null);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnMounted = true;

    Promise.all([authApiService.getCurrentUser(), authApiService.getMenu()])
      .then(([objUserResult, objMenuResult]) => {
        if (!blnMounted) {
          return;
        }
        setObjUserContext(objUserResult.Data);
        setObjMenu(normalizeMenuResponse(objMenuResult.Data));
      })
      .catch((objError: unknown) => {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load dashboard.");
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
  }, []);

  if (blnLoading || !objUserContext || !objMenu) {
    if (!blnLoading && strError) {
      return (
        <div style={{ padding: "24px", color: "#b91c1c" }}>{strError}</div>
      );
    }
    return (
      <BlockingLoader blnOpen strLabel="Loading dashboard..." />
    );
  }

  return <DashboardLanding objUserContext={objUserContext} objMenu={objMenu} />;
}
