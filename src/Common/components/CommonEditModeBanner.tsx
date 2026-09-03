"use client";

import { Alert } from "@mui/material";

type CommonEditModeBannerProps = {
  /** True while the screen is showing the record without allowing changes. */
  blnReadOnly: boolean;
  /** Explains why the record cannot be changed. */
  strReadOnlyMessage: string;
};

/**
 * The view-only notice shown when a record is open but not editable.
 *
 * Editors open in the mode the caller's rights allow: straight into edit for someone who holds the
 * edit right, read-only for someone who only holds view. There is no intermediate "click Edit"
 * step, and no mode in the URL - the server's rights decide, so there is nothing for a user to
 * flip. This banner only explains the read-only case.
 */
export default function CommonEditModeBanner({
  blnReadOnly,
  strReadOnlyMessage,
}: CommonEditModeBannerProps) {
  if (!blnReadOnly) {
    return null;
  }

  return <Alert severity="info">{strReadOnlyMessage}</Alert>;
}
