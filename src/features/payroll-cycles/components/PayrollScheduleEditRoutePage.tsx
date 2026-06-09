"use client";

import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayrollCycleEditorPage from "@/features/payroll-cycles/components/PayrollCycleEditorPage";
import { getPayrollScheduleSelectedID } from "@/features/payroll-cycles/utils/payrollScheduleRouteState";

type PayrollScheduleEditRoutePageProps = {
  intPayrollCycleID?: number | null;
};

export default function PayrollScheduleEditRoutePage({
  intPayrollCycleID = null,
}: PayrollScheduleEditRoutePageProps) {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { t } = useModuleLabels("payroll-cycles");
  const [intResolvedPayrollCycleID, setIntResolvedPayrollCycleID] = useState<number | null>(
    intPayrollCycleID
  );

  useEffect(() => {
    if (intPayrollCycleID) {
      setIntResolvedPayrollCycleID(intPayrollCycleID);
      return;
    }
    setIntResolvedPayrollCycleID(getPayrollScheduleSelectedID());
  }, [intPayrollCycleID]);

  if (!intResolvedPayrollCycleID) {
    return (
      <Box sx={{ minHeight: 320, display: "grid", placeItems: "center", px: 2 }}>
        <Stack spacing={2} sx={{ width: "100%", maxWidth: 540 }}>
          <Alert severity="warning">{t("schedule_missing_selection", "No payroll schedule is selected for editing.")}</Alert>
          <Typography sx={{ color: "#64748b" }}>
            {t("schedule_missing_selection_help", "Open edit from the payroll schedules list to load the selected record without exposing the id in the URL.")}
          </Typography>
          <Box>
            <Button variant="contained" onClick={() => objRouter.push("/payroll/schedules")}>
              {t("schedule_back_to_list", "Back to Payroll Schedules")}
            </Button>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <PayrollCycleEditorPage
      strMode={objSearchParams.get("mode") === "view" ? "view" : "edit"}
      intPayrollCycleID={intResolvedPayrollCycleID}
    />
  );
}
