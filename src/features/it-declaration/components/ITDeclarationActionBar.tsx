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
  const objBaseSx = {
    minHeight: 34,
    borderRadius: "var(--app-btn-radius)",
    px: 1.5,
    py: 0.5,
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.76rem",
    whiteSpace: "nowrap",
    boxShadow: "none",
    alignSelf: "stretch",
  } as const;
  const objApproveSx = {
    ...objBaseSx,
    backgroundColor: "var(--app-success-color)",
    color: "#ffffff",
    "&:hover": { backgroundColor: "#25692f", boxShadow: "none" },
    "&.Mui-disabled": { backgroundColor: "rgba(47,126,61,0.35)", color: "rgba(255,255,255,0.85)" },
  } as const;
  const objRejectSx = {
    ...objBaseSx,
    borderColor: "var(--app-danger-color)",
    color: "var(--app-danger-color)",
    "&:hover": { borderColor: "#c4302f", backgroundColor: "rgba(231,58,58,0.06)" },
    "&.Mui-disabled": { borderColor: "rgba(231,58,58,0.32)", color: "rgba(231,58,58,0.4)" },
  } as const;
  const objNeutralSx = blnHeaderMode
    ? ({
        ...objBaseSx,
        borderColor: "rgba(255,255,255,0.35)",
        color: "#ffffff",
        "&:hover": { borderColor: "rgba(255,255,255,0.6)", backgroundColor: "rgba(255,255,255,0.08)" },
        "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.45)" },
      } as const)
    : ({
        ...objBaseSx,
        borderColor: "var(--app-secondary-border)",
        color: "var(--app-text-color)",
        "&:hover": { borderColor: "var(--app-primary-color)", backgroundColor: "var(--app-primary-soft)" },
        "&.Mui-disabled": { borderColor: "#d1d5db", color: "#9ca3af" },
      } as const);

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="stretch">
      {blnCanReject ? <Button variant="outlined" sx={objRejectSx} disabled={blnLocked} onClick={fnRejectHeader} controlId="it-declaration.review.reject-all.button">Reject All</Button> : null}
      {blnCanRelease ? <Button variant="outlined" sx={objNeutralSx} disabled={blnLocked} onClick={fnRelease} controlId="it-declaration.review.release.button">Release</Button> : null}
      {blnCanLock ? <Button variant="outlined" sx={objNeutralSx} disabled={blnLocked} onClick={fnLock} controlId="it-declaration.review.lock.button">Lock</Button> : null}
      {blnCanApprove ? <Button variant="contained" sx={objApproveSx} disabled={blnLocked} onClick={fnApproveAll} controlId="it-declaration.review.approve-all.button">Approve All</Button> : null}
    </Stack>
  );
}
