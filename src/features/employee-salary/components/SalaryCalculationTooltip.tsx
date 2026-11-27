"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEmployeeSalaryLabels } from "../hooks/useEmployeeSalaryLabels";

type SalaryCalculationTooltipProps = {
  children: ReactNode;
  title: string;
  rows?: Array<{ strName: string; decAmount: number }>;
  total?: number;
  currency?: string;
  percentage?: boolean;
  maskAmounts?: boolean;
};

export default function SalaryCalculationTooltip({ children, title, rows = [], total, currency = "INR", percentage = false, maskAmounts = false }: SalaryCalculationTooltipProps) {
  const { t } = useEmployeeSalaryLabels();
  const formatAmount = (amount: number) => maskAmounts ? "••••••" : new Intl.NumberFormat("en-IN", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
  return (
    <Tooltip
      arrow
      describeChild
      slotProps={{ popper: { sx: { zIndex: 2500 } } }}
      title={(
      <Box sx={{ maxHeight: 420, minWidth: 260, overflowY: "auto", p: 0.5 }}>
        <Typography sx={{ fontSize: "1rem", fontWeight: 800, mb: 0.5 }}>{t("calculation_details", "Calculation details")}</Typography>
        <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.4, mb: 1, opacity: 0.9 }}>{title}</Typography>
        <Stack spacing={0.45}>
          {rows.map((row, index) => (
            <Stack key={`${row.strName}-${index}`} direction="row" justifyContent="space-between" spacing={2}>
              <Typography sx={{ fontSize: "0.875rem", overflowWrap: "anywhere" }}>{row.strName}</Typography>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap" }}>{formatAmount(row.decAmount)}</Typography>
            </Stack>
          ))}
        </Stack>
        {total !== undefined ? (
          <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ borderTop: "1px solid", borderColor: "#dce8f3", mt: 1, pt: 0.75 }}>
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 800 }}>{t("calculated_total", "Calculated total")}</Typography>
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 800, whiteSpace: "nowrap" }}>{percentage && !maskAmounts ? `${total.toFixed(2)}%` : formatAmount(total)}</Typography>
          </Stack>
        ) : null}
      </Box>
    )}
    >
      <Box component="span" tabIndex={0} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "help" }}>
        {children}
        <InfoOutlinedIcon sx={{ fontSize: 14, flexShrink: 0, color: "#61738b" }} />
      </Box>
    </Tooltip>
  );
}
