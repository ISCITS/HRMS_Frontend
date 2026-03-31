"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalarySummaryRecord } from "@/features/employee-salary/types";

function formatCurrency(decValue: number | null) {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(decValue);
}

type EmployeeSalarySummaryCardProps = {
  intEmployeeID?: number | null;
};

export default function EmployeeSalarySummaryCard({ intEmployeeID }: EmployeeSalarySummaryCardProps) {
  const objRouter = useRouter();
  const [objSummary, setObjSummary] = useState<EmployeeSalarySummaryRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);

  useEffect(() => {
    let blnMounted = true;
    if (!intEmployeeID) {
      setObjSummary(null);
      return;
    }
    setBlnLoading(true);
    employeeSalaryService.getEmployeeSalarySummary(intEmployeeID)
      .then((objResult) => {
        if (blnMounted) {
          setObjSummary(objResult);
        }
      })
      .catch(() => {
        if (blnMounted) {
          setObjSummary(null);
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
  }, [intEmployeeID]);

  return (
    <Paper
      sx={{
        borderRadius: "26px",
        p: { xs: 2, md: 2.5 },
        border: "1px solid rgba(148,163,184,0.24)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.96) 100%)"
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(14,165,233,0.12)",
                color: "#0369a1"
              }}
            >
              <MonetizationOnRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>Salary Summary</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                Snapshot only. Full maintenance stays on the dedicated salary page.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => intEmployeeID && objRouter.push(`/employee-salary/${intEmployeeID}`)}
            disabled={!intEmployeeID}
            sx={{ borderRadius: "14px", px: 2 }}
          >
            Open Salary Page
          </Button>
        </Stack>

        {!intEmployeeID ? (
          <Typography sx={{ color: "#64748b" }}>
            Save the employee first to view salary information.
          </Typography>
        ) : blnLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "#64748b" }}>
            <CircularProgress size={18} />
            <Typography>Loading salary summary...</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }
            }}
          >
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>Current Structure</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {objSummary?.objAssignedStructure?.strStructureName ?? "Not assigned"}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>Gross Monthly</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {formatCurrency(objSummary?.objCurrentSalarySnapshot?.decGrossMonthly ?? null)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>CTC Annual</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {formatCurrency(objSummary?.objCurrentSalarySnapshot?.decCtcAnnual ?? null)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>Revisions</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {objSummary?.intRevisionCount ?? 0}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
