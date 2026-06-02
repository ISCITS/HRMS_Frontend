"use client";

import { Button, Stack } from "@mui/material";

type ActionBarProps = {
  blnLocked: boolean;
  blnCanRelease: boolean;
  blnCanLock: boolean;
  blnCanApprove: boolean;
  blnCanReject: boolean;
  blnHeaderMode?: boolean;
  fnApproveAll: () => void;
  fnRejectHeader: () => void;
  fnRelease: () => void;
  fnLock: () => void;
};

export default function ITDeclarationActionBar({
  blnLocked,
  blnCanRelease,
  blnCanLock,
  blnCanApprove,
  blnCanReject,
  blnHeaderMode = false,
  fnApproveAll,
  fnRejectHeader,
  fnRelease,
  fnLock,
}: ActionBarProps) {
  const objContainedPrimarySx = {
    minHeight: 30,
    borderRadius: "8px",
    px: 1.8,
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.76rem",
    boxShadow: "none",
    backgroundColor: "#0b3f73",
    "&:hover": { backgroundColor: "#0a355f", boxShadow: "none" },
    "&.Mui-disabled": { backgroundColor: "rgba(148,163,184,0.35)", color: "rgba(226,232,240,0.92)" },
  } as const;
  const objOutlinedSx = {
    minHeight: 30,
    borderRadius: "8px",
    px: 1.8,
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.76rem",
    borderColor: blnHeaderMode ? "rgba(255,255,255,0.65)" : "#b6c2d2",
    color: blnHeaderMode ? "#f8fcff" : "#16324f",
    "&:hover": {
      borderColor: blnHeaderMode ? "#ffffff" : "#8ea3bc",
      backgroundColor: blnHeaderMode ? "rgba(255,255,255,0.08)" : "rgba(14,61,109,0.04)",
    },
    "&.Mui-disabled": { borderColor: blnHeaderMode ? "rgba(255,255,255,0.32)" : "#d1d5db", color: blnHeaderMode ? "rgba(226,232,240,0.8)" : "#9ca3af" },
  } as const;

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
      {blnCanApprove ? <Button variant="contained" sx={objContainedPrimarySx} disabled={blnLocked} onClick={fnApproveAll} data-testid="it-declaration.review.approve-all.button">Approve All</Button> : null}
      {blnCanReject ? <Button variant="outlined" sx={objOutlinedSx} disabled={blnLocked} onClick={fnRejectHeader} data-testid="it-declaration.review.reject.button">Reject</Button> : null}
      {blnCanRelease ? <Button variant="outlined" sx={objOutlinedSx} disabled={blnLocked} onClick={fnRelease} data-testid="it-declaration.review.release.button">Release</Button> : null}
      {blnCanLock ? <Button variant="outlined" sx={objOutlinedSx} disabled={blnLocked} onClick={fnLock} data-testid="it-declaration.review.lock.button">Lock</Button> : null}
    </Stack>
  );
}
