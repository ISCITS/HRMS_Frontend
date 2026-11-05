"use client";

import { Box, Skeleton } from "@mui/material";

// Shared UI pieces for the Allocation Entity / Allocation Entity Type masters so both follow the
// Department master look (compact title-bar switch, skeleton grid, focus-on-first-error).

export const dicActiveSwitchSx = {
  width: 40,
  height: 22,
  p: 0,
  overflow: "visible",
  "& .MuiSwitch-switchBase": {
    p: "3px",
    color: "#fff",
    transitionDuration: "180ms",
    "&.Mui-checked": {
      transform: "translateX(18px)",
      color: "#fff",
      "& + .MuiSwitch-track": { backgroundColor: "#00b86b", opacity: 1 },
    },
    "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
  },
  "& .MuiSwitch-thumb": { width: 16, height: 16, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)" },
  "& .MuiSwitch-track": { borderRadius: "11px", backgroundColor: "#98a2b3", opacity: 1, transition: "background-color 180ms" },
};

// Focuses a field given its TextField root (or input) element.
export function focusField(objElement: HTMLElement | null | undefined) {
  if (!objElement) return;
  if (objElement instanceof HTMLInputElement || objElement instanceof HTMLTextAreaElement) {
    objElement.focus();
    return;
  }
  objElement.querySelector<HTMLElement>('[role="combobox"], input, textarea')?.focus();
}

type AllocationGridSkeletonProps = {
  strControlId: string;
  intColumns: number;
};

export function AllocationGridSkeleton({ strControlId, intColumns }: AllocationGridSkeletonProps) {
  const strTemplate = `repeat(${intColumns}, 1fr)`;
  return (
    <Box
      data-control-id={strControlId}
      sx={{ border: "1px solid #e8eef5", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={164} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 800 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: strTemplate, bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {Array.from({ length: intColumns }).map((_, intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === intColumns - 1 ? 60 : 100} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: 8 }).map((_, intRow) => (
          <Box key={intRow} sx={{ display: "grid", gridTemplateColumns: strTemplate, borderBottom: "1px solid #edf1f6", minHeight: 40, alignItems: "center" }}>
            {Array.from({ length: intColumns }).map((__, intColumn) => (
              <Box key={intColumn} sx={{ px: 2, py: 0.75 }}>
                {intColumn === intColumns - 1
                  ? <Skeleton variant="rounded" width={64} height={22} />
                  : <Skeleton variant="text" width={`${46 + ((intRow + intColumn) % 3) * 14}%`} height={20} />}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
