"use client";

import { Button, Stack } from "@mui/material";

type ActionBarProps = {
  blnLocked: boolean;
  blnCanRelease: boolean;
  blnCanLock: boolean;
  blnCanApprove: boolean;
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
  fnApproveAll,
  fnRejectHeader,
  fnRelease,
  fnLock,
}: ActionBarProps) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Button variant="contained" disabled={blnLocked || !blnCanApprove} onClick={fnApproveAll}>Approve All</Button>
      <Button variant="outlined" color="error" disabled={blnLocked || !blnCanApprove} onClick={fnRejectHeader}>Reject</Button>
      <Button variant="contained" color="success" disabled={blnLocked || !blnCanRelease} onClick={fnRelease}>Release</Button>
      <Button variant="outlined" disabled={blnLocked || !blnCanLock} onClick={fnLock}>Lock</Button>
    </Stack>
  );
}

