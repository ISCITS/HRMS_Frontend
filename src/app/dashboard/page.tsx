"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardLanding from "@/components/dashboard/DashboardLanding";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { authHelpers } from "@/lib/auth";
import { normalizeMenuResponse } from "@/lib/menu";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

export default function DashboardPage() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objMenu, setObjMenu] = useState<MenuResponse | null>(null);

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
      .catch(() => {
        if (blnMounted) {
          objRouter.replace(authHelpers.getLoginUrl());
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
  }, [objRouter]);

  if (blnLoading || !objUserContext || !objMenu) {
    return (
      <BlockingLoader blnOpen strLabel="Loading dashboard..." />
    );
  }

  return <DashboardLanding objUserContext={objUserContext} objMenu={objMenu} />;
}
