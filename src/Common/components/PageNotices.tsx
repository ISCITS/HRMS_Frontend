"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Alert, Badge, Box, ClickAwayListener, IconButton, Snackbar, Stack, Tooltip, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type PageNoticeSeverity = "error" | "warning" | "info" | "success";

export type PageNotice = {
  /** Stable key, e.g. "rights", "error", "run-locked". */
  strKey: string;
  strSeverity: PageNoticeSeverity;
  /** Empty / null message = notice not shown, so callers can pass their state directly. */
  objMessage: ReactNode;
  /** Optional bold heading shown above the message. */
  strTitle?: string;
  /** Clears the notice (e.g. setStrError("")). Shows an × on the row; success toasts call it on close. */
  fnDismiss?: () => void;
  /**
   * Also flash the message as a toast when it appears. Defaults to true for "error" (result of an
   * action the user just took, which must not go unnoticed) and always true for "success".
   */
  blnToast?: boolean;
};

export type PageNoticeInput = PageNotice | null | undefined | false;

type PageNoticesProps = {
  lstNotices: PageNoticeInput[];
  /** Hover label / aria-label of the icon. */
  strLabel?: string;
  strControlId?: string;
  /** Smaller icon for use next to a section title. */
  blnSmall?: boolean;
};

const SEVERITY_RANK: Record<PageNoticeSeverity, number> = { error: 3, warning: 2, info: 1, success: 0 };
const SEVERITY_COLOR: Record<PageNoticeSeverity, string> = {
  error: "#d32f2f",
  warning: "#ed6c02",
  info: "#0288d1",
  success: "#2e7d32",
};

const pulse = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(1.25); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
`;

function hasMessage(objMessage: ReactNode): boolean {
  if (objMessage === null || objMessage === undefined || objMessage === false) return false;
  if (typeof objMessage === "string") return objMessage.trim().length > 0;
  if (Array.isArray(objMessage)) return objMessage.length > 0;
  return true;
}

function toastText(objMessage: ReactNode): string {
  return typeof objMessage === "string" || typeof objMessage === "number" ? String(objMessage) : "";
}

function SeverityIcon({ strSeverity }: { strSeverity: PageNoticeSeverity }) {
  const sx = { fontSize: 18, color: SEVERITY_COLOR[strSeverity], mt: "1px", flexShrink: 0 };
  if (strSeverity === "error") return <ErrorOutlineRoundedIcon sx={sx} />;
  if (strSeverity === "warning") return <WarningAmberRoundedIcon sx={sx} />;
  return <InfoOutlinedIcon sx={sx} />;
}

/**
 * Page validation messages, warnings and hints collected behind one "i" icon instead of a stack of
 * banners. Hover shows them; click pins the panel open (touch screens, copying text). The icon takes
 * the colour of the most serious notice and shows a count. Errors and successes from an action the
 * user just took are also flashed once as a toast so they are never missed.
 */
export default function PageNotices({ lstNotices, strLabel = "Validations & warnings", strControlId, blnSmall = false }: PageNoticesProps) {
  const lstActive = useMemo(
    () => lstNotices.filter((objNotice): objNotice is PageNotice => Boolean(objNotice) && hasMessage((objNotice as PageNotice).objMessage)),
    [lstNotices],
  );
  const lstListed = lstActive
    .filter((objNotice) => objNotice.strSeverity !== "success")
    .sort((objA, objB) => SEVERITY_RANK[objB.strSeverity] - SEVERITY_RANK[objA.strSeverity]);

  const [blnHover, setBlnHover] = useState(false);
  const [blnPinned, setBlnPinned] = useState(false);
  const [objToast, setObjToast] = useState<{ strKey: string; strSeverity: PageNoticeSeverity; strMessage: string } | null>(null);
  const [intPulse, setIntPulse] = useState(0);
  const dicToasted = useRef<Map<string, string>>(new Map());
  const setSeen = useRef<Set<string>>(new Set());
  const blnMounted = useRef(false);

  // Toast new action results; pulse the icon when a new error / warning arrives after first render.
  useEffect(() => {
    let blnNewAttention = false;
    for (const objNotice of lstActive) {
      const strText = toastText(objNotice.objMessage);
      const blnToast = objNotice.strSeverity === "success" || (objNotice.blnToast ?? objNotice.strSeverity === "error");
      if (blnToast && strText && dicToasted.current.get(objNotice.strKey) !== strText) {
        dicToasted.current.set(objNotice.strKey, strText);
        setObjToast({ strKey: objNotice.strKey, strSeverity: objNotice.strSeverity, strMessage: strText });
      }
      const strSeenKey = `${objNotice.strKey}|${strText}`;
      if (!setSeen.current.has(strSeenKey)) {
        setSeen.current.add(strSeenKey);
        if (blnMounted.current && (objNotice.strSeverity === "error" || objNotice.strSeverity === "warning")) blnNewAttention = true;
      }
    }
    // Forget cleared notices so the same message can toast again next time.
    const setActiveKeys = new Set(lstActive.map((objNotice) => objNotice.strKey));
    for (const strKey of Array.from(dicToasted.current.keys())) {
      if (!setActiveKeys.has(strKey)) dicToasted.current.delete(strKey);
    }
    if (blnNewAttention) setIntPulse((intValue) => intValue + 1);
    blnMounted.current = true;
  }, [lstActive]);

  useEffect(() => {
    if (!lstListed.length) setBlnPinned(false);
  }, [lstListed.length]);

  function closeToast() {
    if (objToast?.strSeverity === "success") {
      lstActive.find((objNotice) => objNotice.strKey === objToast.strKey)?.fnDismiss?.();
    }
    setObjToast(null);
  }

  const strTopSeverity: PageNoticeSeverity = lstListed[0]?.strSeverity ?? "info";
  const strColor = SEVERITY_COLOR[strTopSeverity];

  const objPanel = (
    <Box sx={{ maxWidth: 440, maxHeight: 380, overflowY: "auto", p: 0.5 }}>
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", px: 0.5, pb: 0.75 }}>
        {strLabel} ({lstListed.length})
      </Typography>
      <Stack spacing={0.75}>
        {lstListed.map((objNotice) => (
          <Stack
            key={objNotice.strKey}
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{ borderLeft: `3px solid ${SEVERITY_COLOR[objNotice.strSeverity]}`, bgcolor: "#f8fafc", borderRadius: "6px", px: 1, py: 0.75 }}
          >
            <SeverityIcon strSeverity={objNotice.strSeverity} />
            <Box sx={{ flex: 1, minWidth: 0, fontSize: "0.82rem", color: "#0f172a", lineHeight: 1.45, wordBreak: "break-word" }}>
              {objNotice.strTitle ? <Typography sx={{ fontWeight: 800, fontSize: "0.82rem" }}>{objNotice.strTitle}</Typography> : null}
              {objNotice.objMessage}
            </Box>
            {objNotice.fnDismiss ? (
              <IconButton size="small" aria-label="Dismiss" onClick={objNotice.fnDismiss} sx={{ p: 0.25, mt: "-2px" }}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : null}
          </Stack>
        ))}
      </Stack>
    </Box>
  );

  return (
    <>
      {lstListed.length ? (
        <ClickAwayListener onClickAway={() => setBlnPinned(false)}>
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
            <Tooltip
              title={objPanel}
              open={blnPinned || blnHover}
              onOpen={() => setBlnHover(true)}
              onClose={() => setBlnHover(false)}
              placement="bottom-start"
              componentsProps={{
                tooltip: { sx: { bgcolor: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 12px 32px rgba(15,23,42,0.16)", borderRadius: "10px", p: 1, maxWidth: 460 } },
              }}
            >
              <IconButton
                size="small"
                aria-label={`${strLabel} (${lstListed.length})`}
                data-controlid={strControlId}
                onClick={() => setBlnPinned((blnValue) => !blnValue)}
                sx={{ color: strColor, p: blnSmall ? 0.25 : 0.5 }}
              >
                <Badge
                  badgeContent={lstListed.length}
                  invisible={lstListed.length < 2 && strTopSeverity === "info"}
                  sx={{ "& .MuiBadge-badge": { bgcolor: strColor, color: "#fff", fontSize: "0.65rem", height: 16, minWidth: 16, px: 0.4 } }}
                >
                  <InfoOutlinedIcon
                    key={intPulse}
                    sx={{ fontSize: blnSmall ? 18 : 22, animation: intPulse ? `${pulse} 0.6s ease-in-out 2` : "none" }}
                  />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>
        </ClickAwayListener>
      ) : null}
      <Snackbar open={Boolean(objToast)} autoHideDuration={objToast?.strSeverity === "error" ? 6000 : 3500} onClose={(_, strReason) => { if (strReason !== "clickaway") closeToast(); }} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        {objToast ? (
          <Alert severity={objToast.strSeverity} variant="filled" onClose={closeToast} sx={{ maxWidth: 520 }}>
            {objToast.strMessage}
          </Alert>
        ) : <span />}
      </Snackbar>
    </>
  );
}
