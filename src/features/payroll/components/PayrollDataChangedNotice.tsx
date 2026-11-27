"use client";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Button } from "@mui/material";

import type { PayrollDataFreshness } from "@/features/payroll/hooks/usePayrollDataFreshness";

export function formatChangedOn(strValue: string | null) {
  if (!strValue) {
    return "";
  }
  // Result timestamps are stored in UTC without a zone suffix.
  const dtValue = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(strValue) ? strValue : `${strValue}Z`);
  if (Number.isNaN(dtValue.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(dtValue);
}

/** "Payroll figures changed after this screen loaded them" with a Refresh button. */
export default function PayrollDataChangedNotice({
  objFreshness,
  onRefresh,
  blnRefreshing = false,
}: {
  objFreshness: PayrollDataFreshness;
  /** Defaults to the reload the screen passed to trackLoad. */
  onRefresh?: () => void;
  blnRefreshing?: boolean;
}) {
  if (!objFreshness.blnStale) {
    return null;
  }
  const strWhen = formatChangedOn(objFreshness.dtChangedOn);
  return (
    <Alert
      severity="warning"
      data-testid="payroll.data-changed.notice"
      action={
        <Button color="inherit" size="small" startIcon={<RefreshRoundedIcon />} onClick={onRefresh ?? objFreshness.reload} disabled={blnRefreshing}>
          Refresh
        </Button>
      }
    >
      {`Payroll was processed or reprocessed${strWhen ? ` at ${strWhen}` : ""} after this screen loaded - the figures shown here are older. Refresh to see the latest.`}
    </Alert>
  );
}
