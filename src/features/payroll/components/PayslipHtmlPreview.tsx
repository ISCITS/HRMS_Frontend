"use client";

import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import type { PayslipView } from "@/features/payroll/services/payslipService";

type PayslipHtmlPreviewProps = {
  strHtml: string;
  strTaxInformationUrl?: string;
  /** With onViewChange: shows the Monthly / Detailed switch above the payslip. */
  strView?: PayslipView;
  onViewChange?: (strView: PayslipView) => void;
  blnViewChanging?: boolean;
};

const TAX_SUMMARY_HEADING = "<h3>Tax Summary</h3>";

function injectTaxInformationIcon(strHtml: string, strTaxInformationUrl?: string) {
  if (!strTaxInformationUrl || !strHtml.includes(TAX_SUMMARY_HEADING)) {
    return strHtml;
  }
  const strReplacement = `<h3 style="display:flex;align-items:center;justify-content:space-between;gap:8px;">Tax Summary <a href="${strTaxInformationUrl}" target="_blank" rel="noopener noreferrer" title="Tax Information" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex-shrink:0;border-radius:8px;background:#1d4ed8;border:1px solid #1d4ed8;color:#fff;text-decoration:none;font-size:18px;font-weight:800;font-family:inherit;box-shadow:0 2px 6px rgba(29, 78, 216, 0.35);">&#9432;</a></h3>`;
  return strHtml.replace(TAX_SUMMARY_HEADING, strReplacement);
}

/** Monthly / Detailed switch for a payslip (also usable on its own, e.g. next to print buttons). */
export function PayslipViewSwitch({
  strView,
  onViewChange,
  blnDisabled = false,
}: {
  strView: PayslipView;
  onViewChange: (strView: PayslipView) => void;
  blnDisabled?: boolean;
}) {
  return (
    <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={strView}
        disabled={blnDisabled}
        onChange={(_, strNext: PayslipView | null) => {
          if (strNext && strNext !== strView) {
            onViewChange(strNext);
          }
        }}
        aria-label="Payslip view"
        data-testid="payslip.view"
      >
        <ToggleButton value="monthly" sx={{ px: 1.5, textTransform: "none", fontWeight: 700 }}>Monthly</ToggleButton>
        <ToggleButton value="detailed" sx={{ px: 1.5, textTransform: "none", fontWeight: 700 }}>Detailed (YTD &amp; annual)</ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary">
        {strView === "monthly" ? "This month's earnings, deductions and net pay." : "Adds year-to-date totals and the annual tax summary."}
      </Typography>
    </Box>
  );
}

export default function PayslipHtmlPreview({
  strHtml,
  strTaxInformationUrl,
  strView,
  onViewChange,
  blnViewChanging = false,
}: PayslipHtmlPreviewProps) {
  return (
    <Box>
      {strView && onViewChange ? (
        <Box sx={{ mb: 1 }}>
          <PayslipViewSwitch strView={strView} onViewChange={onViewChange} blnDisabled={blnViewChanging} />
        </Box>
      ) : null}
      <Box
        component="iframe"
        srcDoc={injectTaxInformationIcon(strHtml, strTaxInformationUrl)}
        title="Payslip Preview"
        sx={{
          border: 0,
          display: "block",
          height: { xs: "72vh", md: "78vh" },
          opacity: blnViewChanging ? 0.5 : 1,
          transition: "opacity 120ms ease",
          width: "100%",
        }}
      />
    </Box>
  );
}
