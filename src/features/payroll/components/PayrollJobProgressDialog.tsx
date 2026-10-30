"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import { Box, Dialog, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";

import type { PayrollJobStatus } from "@/features/payroll/types";

type Translate = (strKey: string, strDefault: string) => string;

type PayrollJobProgressDialogProps = {
  /** The job being followed; null closes the dialog. */
  objJob: PayrollJobStatus | null;
  strTitle: string;
  strFallbackPhaseLabel: string;
  strEmployeesLabel: string;
  /** Optional label translator (module labels); English defaults are used without it. */
  fnTranslate?: Translate;
};

type StepKey = "syncing" | "validating" | "processing" | "generating" | "finalizing";

const objStripes = keyframes`
  from { background-position: 0 0; }
  to { background-position: 40px 0; }
`;
const objShimmer = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(320%); }
`;
const objPulseRing = keyframes`
  0% { transform: scale(0.9); opacity: 0.55; }
  100% { transform: scale(1.7); opacity: 0; }
`;
const objFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;
const objPop = keyframes`
  0% { transform: scale(0.2); opacity: 0; }
  60% { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1); }
`;
const objBlink = keyframes`
  0%, 20% { opacity: 0.15; }
  50% { opacity: 1; }
  100% { opacity: 0.15; }
`;
const objStepPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
  50% { box-shadow: 0 0 0 7px rgba(37, 99, 235, 0); }
`;
const objConfetti = keyframes`
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; }
`;

const objReducedMotion = "@media (prefers-reduced-motion: reduce)";
const lstConfettiColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

/** Eases the shown number toward the target so jumps from polling look like smooth motion. */
function useEasedNumber(fltTarget: number): number {
  const [fltValue, setFltValue] = useState(0);
  const refValue = useRef(0);

  useEffect(() => {
    let intFrame = 0;
    const fnTick = () => {
      const fltDelta = fltTarget - refValue.current;
      if (Math.abs(fltDelta) < 0.05) {
        refValue.current = fltTarget;
        setFltValue(fltTarget);
        return;
      }
      refValue.current += fltDelta * 0.12;
      setFltValue(refValue.current);
      intFrame = window.requestAnimationFrame(fnTick);
    };
    intFrame = window.requestAnimationFrame(fnTick);
    return () => window.cancelAnimationFrame(intFrame);
  }, [fltTarget]);

  return fltValue;
}

function formatDuration(intSeconds: number): string {
  const intSafe = Math.max(0, Math.round(intSeconds));
  const intMinutes = Math.floor(intSafe / 60);
  const intRest = intSafe % 60;
  return intMinutes > 0 ? `${intMinutes}m ${String(intRest).padStart(2, "0")}s` : `${intRest}s`;
}

/**
 * Blocking, non-dismissable progress for a payroll validate/process/reprocess job. It stays on
 * screen (showing 100% and a success animation) until the page clears objJob after the job ended.
 */
export default function PayrollJobProgressDialog({
  objJob,
  strTitle,
  strFallbackPhaseLabel,
  strEmployeesLabel,
  fnTranslate,
}: PayrollJobProgressDialogProps) {
  const t: Translate = fnTranslate ?? ((_strKey, strDefault) => strDefault);
  const blnOpen = Boolean(objJob);
  const intTargetPercent = Math.max(0, Math.min(100, Math.round(objJob?.intPercent ?? 0)));
  const blnDone = intTargetPercent >= 100 && objJob?.strStatus !== "running";
  const fltShownPercent = useEasedNumber(intTargetPercent);
  const intShownPercent = Math.min(100, Math.round(fltShownPercent));

  const [intElapsedSeconds, setIntElapsedSeconds] = useState(0);
  const refStartedAt = useRef<number | null>(null);
  useEffect(() => {
    if (!blnOpen) {
      return;
    }
    refStartedAt.current = Date.now();
    const intTimer = window.setInterval(() => {
      setIntElapsedSeconds((Date.now() - (refStartedAt.current ?? Date.now())) / 1000);
    }, 500);
    return () => {
      window.clearInterval(intTimer);
      refStartedAt.current = null;
      setIntElapsedSeconds(0);
    };
  }, [blnOpen]);

  const strKind = objJob?.strKind ?? "process";
  const lstSteps: { strKey: StepKey; strLabel: string }[] =
    strKind === "payslips"
      ? [
          { strKey: "generating", strLabel: t("job_step_generate", "Generate payslips") },
          { strKey: "finalizing", strLabel: t("job_step_finalize", "Finalize") },
        ]
      : [
          ...(strKind === "process" ? [] : [{ strKey: "syncing" as StepKey, strLabel: t("job_step_sync", "Sync attendance") }]),
          { strKey: "validating", strLabel: t("job_step_validate", "Validate") },
          ...(strKind === "validate" ? [] : [{ strKey: "processing" as StepKey, strLabel: t("job_step_calculate", "Calculate") }]),
          { strKey: "finalizing", strLabel: t("job_step_finalize", "Finalize") },
        ];
  const strPhase = (objJob?.strPhase ?? "queued") as StepKey | "queued";
  const intActiveStep = blnDone
    ? lstSteps.length
    : Math.max(0, lstSteps.findIndex((objStep) => objStep.strKey === strPhase));

  const intTotal = objJob?.intTotal ?? 0;
  const intDone = objJob?.intDone ?? 0;
  const blnHasCounts = intTotal > 0 && strPhase !== "finalizing" && !blnDone;
  const intRemainingSeconds =
    !blnDone && intTargetPercent >= 6 && intElapsedSeconds > 3
      ? (intElapsedSeconds * (100 - intTargetPercent)) / intTargetPercent
      : null;

  const strBarColor = blnDone
    ? "linear-gradient(90deg, #16a34a, #22c55e, #4ade80)"
    : "linear-gradient(90deg, #2563eb, #06b6d4, #6366f1)";

  return (
    <Dialog
      open={blnOpen}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown
      // Intentionally not closable: the run is being calculated and the screen must not be used.
      onClose={() => undefined}
      slotProps={{ backdrop: { sx: { backdropFilter: "blur(3px)", background: "rgba(15, 23, 42, 0.35)" } } }}
      PaperProps={{
        sx: {
          borderRadius: "28px",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(15, 23, 42, 0.35)",
        },
      }}
      data-controlid="payroll.run-detail.job-progress.dialog"
    >
      {/* Soft animated accent along the top edge */}
      <Box
        aria-hidden="true"
        sx={{
          height: 5,
          background: strBarColor,
          backgroundSize: "200% 100%",
          transition: "background 0.6s ease",
        }}
      />
      <Box sx={{ p: { xs: 2.5, sm: 3.5 }, position: "relative" }}>
        {/* Header: pulsing badge + title + phase */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Box sx={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            {!blnDone ? (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "rgba(37, 99, 235, 0.35)",
                  animation: `${objPulseRing} 1.8s ease-out infinite`,
                  [objReducedMotion]: { animation: "none" },
                }}
              />
            ) : null}
            <Box
              sx={{
                position: "relative",
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: blnDone ? "linear-gradient(135deg, #16a34a, #4ade80)" : "linear-gradient(135deg, #2563eb, #6366f1)",
                boxShadow: blnDone ? "0 8px 20px rgba(22, 163, 74, 0.4)" : "0 8px 20px rgba(37, 99, 235, 0.4)",
                animation: blnDone ? `${objPop} 0.5s ease-out both` : `${objFloat} 2.4s ease-in-out infinite`,
                [objReducedMotion]: { animation: "none" },
              }}
            >
              {blnDone ? <CheckRoundedIcon sx={{ fontSize: 32 }} /> : <PaymentsRoundedIcon sx={{ fontSize: 28 }} />}
            </Box>
            {blnDone
              ? lstConfettiColors.map((strColor, intIndex) => {
                  const fltAngle = (intIndex / lstConfettiColors.length) * Math.PI * 2;
                  return (
                    <Box
                      key={strColor}
                      aria-hidden="true"
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 8,
                        height: 8,
                        borderRadius: intIndex % 2 ? "50%" : "2px",
                        background: strColor,
                        "--dx": `${Math.cos(fltAngle) * 46}px`,
                        "--dy": `${Math.sin(fltAngle) * 46}px`,
                        animation: `${objConfetti} 0.9s ease-out both`,
                        [objReducedMotion]: { display: "none" },
                      }}
                    />
                  );
                })
              : null}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a", lineHeight: 1.25 }}>
              {blnDone ? t("job_all_done", "All done!") : strTitle}
            </Typography>
            <Typography
              sx={{ color: "#475569", mt: 0.25, fontSize: "0.95rem" }}
              data-controlid="payroll.run-detail.job-progress.phase"
            >
              {blnDone
                ? t("job_refreshing", "Refreshing your payroll...")
                : objJob?.strPhaseLabel || strFallbackPhaseLabel}
              {!blnDone ? (
                <Box component="span" aria-hidden="true" sx={{ ml: 0.25 }}>
                  {[0, 1, 2].map((intDot) => (
                    <Box
                      key={intDot}
                      component="span"
                      sx={{
                        animation: `${objBlink} 1.4s infinite`,
                        animationDelay: `${intDot * 0.2}s`,
                        [objReducedMotion]: { animation: "none" },
                      }}
                    >
                      .
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "2.1rem",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: blnDone ? "#16a34a" : "#1d4ed8",
              transition: "color 0.5s ease",
            }}
            data-controlid="payroll.run-detail.job-progress.percent"
          >
            {intShownPercent}
            <Box component="span" sx={{ fontSize: "1.1rem", fontWeight: 700, ml: 0.25 }}>
              %
            </Box>
          </Typography>
        </Box>

        {/* The progress bar: gradient fill, moving stripes, shimmer sweep and a glowing tip */}
        <Box
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={intShownPercent}
          aria-label={strTitle}
          data-controlid="payroll.run-detail.job-progress.bar"
          sx={{
            position: "relative",
            height: 18,
            borderRadius: 9,
            background: "#e2e8f0",
            boxShadow: "inset 0 1px 3px rgba(15, 23, 42, 0.18)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              width: `${fltShownPercent}%`,
              minWidth: fltShownPercent > 0 ? 18 : 0,
              borderRadius: 9,
              background: strBarColor,
              overflow: "hidden",
              transition: "background 0.6s ease",
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(45deg, rgba(255,255,255,0.22) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.22) 75%, transparent 75%, transparent)",
                backgroundSize: "40px 40px",
                animation: blnDone ? "none" : `${objStripes} 0.9s linear infinite`,
                [objReducedMotion]: { animation: "none" },
              }}
            />
            {!blnDone ? (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "35%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                  animation: `${objShimmer} 1.8s ease-in-out infinite`,
                  [objReducedMotion]: { animation: "none" },
                }}
              />
            ) : null}
          </Box>
          {!blnDone && fltShownPercent > 1 && fltShownPercent < 99.5 ? (
            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                top: "50%",
                left: `calc(${fltShownPercent}% - 7px)`,
                width: 14,
                height: 14,
                transform: "translateY(-50%)",
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.35), 0 0 14px 4px rgba(56, 189, 248, 0.8)",
              }}
            />
          ) : null}
        </Box>

        {/* Step tracker */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mt: 3 }}>
          {lstSteps.map((objStep, intIndex) => {
            const blnStepDone = intIndex < intActiveStep;
            const blnStepActive = intIndex === intActiveStep && !blnDone;
            return (
              <Box key={objStep.strKey} sx={{ display: "flex", alignItems: "flex-start", flex: intIndex === lstSteps.length - 1 ? "0 0 auto" : 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 76 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: blnStepDone || blnStepActive ? "#fff" : "#94a3b8",
                      background: blnStepDone ? "#22c55e" : blnStepActive ? "#2563eb" : "#e2e8f0",
                      transition: "background 0.4s ease, color 0.4s ease",
                      animation: blnStepActive ? `${objStepPulse} 1.6s ease-in-out infinite` : "none",
                      [objReducedMotion]: { animation: "none" },
                    }}
                  >
                    {blnStepDone ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : intIndex + 1}
                  </Box>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: blnStepActive ? 700 : 500,
                      color: blnStepActive ? "#1d4ed8" : blnStepDone ? "#15803d" : "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    {objStep.strLabel}
                  </Typography>
                </Box>
                {intIndex < lstSteps.length - 1 ? (
                  <Box
                    aria-hidden="true"
                    sx={{
                      flex: 1,
                      height: 3,
                      mt: "12px",
                      borderRadius: 2,
                      background: blnStepDone ? "#22c55e" : "#e2e8f0",
                      transition: "background 0.4s ease",
                    }}
                  />
                ) : null}
              </Box>
            );
          })}
        </Box>

        {/* Live stats */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 3 }}>
          {blnHasCounts ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, borderRadius: 5, background: "#eff6ff", color: "#1e40af", fontSize: "0.85rem", fontWeight: 600 }}>
              <GroupsRoundedIcon sx={{ fontSize: 18 }} />
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {intDone} / {intTotal}
              </span>{" "}
              {strEmployeesLabel}
            </Box>
          ) : null}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, borderRadius: 5, background: "#f1f5f9", color: "#334155", fontSize: "0.85rem", fontWeight: 600 }}>
            <TimerOutlinedIcon sx={{ fontSize: 18 }} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(intElapsedSeconds)}</span> {t("job_elapsed", "elapsed")}
          </Box>
          {intRemainingSeconds !== null ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75, borderRadius: 5, background: "#f1f5f9", color: "#334155", fontSize: "0.85rem", fontWeight: 600 }}>
              <ScheduleRoundedIcon sx={{ fontSize: 18 }} />
              {t("job_about", "about")} <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(intRemainingSeconds)}</span> {t("job_left", "left")}
            </Box>
          ) : null}
        </Box>

        {!blnDone ? (
          <Typography sx={{ mt: 2, color: "#64748b", fontSize: "0.8rem" }}>
            {t("job_keep_open_hint", "Please keep this page open. It is safe to refresh - progress will resume.")}
          </Typography>
        ) : null}
      </Box>
    </Dialog>
  );
}
