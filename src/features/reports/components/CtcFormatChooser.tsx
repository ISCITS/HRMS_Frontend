"use client";

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useCallback, useRef, useState } from "react";

import type { CtcLayout, CtcPeriod } from "@/features/reports/services/ctcReportService";

export type CtcFormatChoice = { layout: CtcLayout; period: CtcPeriod };

export const CTC_LAYOUT_OPTIONS: Array<{ layout: CtcLayout; label: string; description: string }> = [
  { layout: "ours", label: "Our format", description: "The application's CTC statement for the salary in force that month." },
  { layout: "format1", label: "Format I", description: "The client's CTC statement: the previous salary next to the current one, grouped A to E." },
];

export const CTC_PERIOD_OPTIONS: Array<{ period: CtcPeriod; label: string; description: string }> = [
  { period: "monthly", label: "Monthly", description: "Amounts per month." },
  { period: "annual", label: "Annual", description: "Amounts per year." },
];

export function ctcFormatLabel(choice: CtcFormatChoice) {
  const layout = CTC_LAYOUT_OPTIONS.find(option => option.layout === choice.layout)?.label ?? choice.layout;
  const period = CTC_PERIOD_OPTIONS.find(option => option.period === choice.period)?.label ?? choice.period;
  return `${layout} - ${period}`;
}

/**
 * Asks in which format to open the CTC statement - Our format or Format I - and whether monthly or
 * annual, like the payslip and F&F format choosers. Render objFormatChooser once on the page.
 */
export function useCtcFormatChooser() {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<CtcLayout>("ours");
  const refResolve = useRef<((choice: CtcFormatChoice | null) => void) | null>(null);

  /** Resolves the chosen format, or null when the user closes the question. */
  const chooseFormat = useCallback((initial?: CtcFormatChoice | null): Promise<CtcFormatChoice | null> => {
    refResolve.current?.(null);
    return new Promise<CtcFormatChoice | null>((resolve) => {
      refResolve.current = resolve;
      setLayout(initial?.layout ?? "ours");
      setOpen(true);
    });
  }, []);

  function finish(choice: CtcFormatChoice | null) {
    setOpen(false);
    refResolve.current?.(choice);
    refResolve.current = null;
  }

  const objFormatChooser = (
    <Dialog open={open} onClose={() => finish(null)} maxWidth="xs" fullWidth data-testid="ctc.format-chooser">
      <DialogTitle sx={{ fontWeight: 800 }}>Open CTC statement</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          In which format do you want the CTC statement?
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={layout}
          onChange={(_event, next: CtcLayout | null) => next && setLayout(next)}
          sx={{ mb: 1 }}
          data-controlid="ctc.format-chooser.layout"
        >
          {CTC_LAYOUT_OPTIONS.map(option => (
            <ToggleButton key={option.layout} value={option.layout} sx={{ fontWeight: 700, textTransform: "none" }} data-controlid={`ctc.format-chooser.layout.${option.layout}`}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
          {CTC_LAYOUT_OPTIONS.find(option => option.layout === layout)?.description}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Monthly or annual?
        </Typography>
        <Box sx={{ display: "grid", gap: 1 }}>
          {CTC_PERIOD_OPTIONS.map((option, index) => (
            <Button
              key={option.period}
              variant={index === 0 ? "contained" : "outlined"}
              autoFocus={index === 0}
              onClick={() => finish({ layout, period: option.period })}
              sx={{ alignItems: "flex-start", flexDirection: "column", px: 2, py: 1.25, textAlign: "left", textTransform: "none" }}
              data-controlid={`ctc.format-chooser.${option.period}`}
            >
              <Typography component="span" sx={{ fontWeight: 800 }}>{option.label}</Typography>
              <Typography component="span" variant="caption" sx={{ opacity: 0.85 }}>{option.description}</Typography>
            </Button>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => finish(null)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );

  return { chooseFormat, objFormatChooser };
}
