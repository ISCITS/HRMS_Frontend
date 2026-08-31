"use client";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Alert, Box, Button } from "@mui/material";

type CommonEditModeBannerProps = {
  /** True while the screen is showing the record without allowing changes. */
  blnReadOnly: boolean;
  /** Server-granted edit right for this module. */
  blnCanEdit: boolean;
  /** Switches the screen into edit mode. Local state only — nothing goes into the URL. */
  fnOnEdit: () => void;
  /** Shown when the caller may not edit at all. */
  strReadOnlyMessage: string;
  /** Shown when the caller may edit but has not switched into it yet. */
  strViewingMessage?: string;
  strEditLabel?: string;
};

/**
 * Replaces `?mode=view` in the address bar.
 *
 * An editor opens read-only and offers Edit only when the server says the caller holds the right,
 * so the mode is a property of the record and the caller rather than something a user can type
 * into the URL. Someone with no edit right sees the explanation instead of a control that would
 * fail on save.
 */
export default function CommonEditModeBanner({
  blnReadOnly,
  blnCanEdit,
  fnOnEdit,
  strReadOnlyMessage,
  strViewingMessage = "You are viewing this record. Select Edit to make changes.",
  strEditLabel = "Edit",
}: CommonEditModeBannerProps) {
  if (!blnReadOnly) {
    return null;
  }

  if (!blnCanEdit) {
    return <Alert severity="info">{strReadOnlyMessage}</Alert>;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      {/* Someone who may edit is not lacking access - they simply have not switched into it yet,
          so they get the neutral wording rather than the access-denied one. */}
      <Alert severity="info" sx={{ flex: 1, minWidth: 220 }}>
        {strViewingMessage}
      </Alert>
      <Button
        data-control-id="common.edit-mode.enable.button"
        variant="outlined"
        startIcon={<EditRoundedIcon />}
        onClick={fnOnEdit}
      >
        {strEditLabel}
      </Button>
    </Box>
  );
}
