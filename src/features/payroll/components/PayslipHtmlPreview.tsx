"use client";

import { Box } from "@mui/material";

type PayslipHtmlPreviewProps = {
  strHtml: string;
  strTaxInformationUrl?: string;
};

const TAX_SUMMARY_HEADING = "<h3>Tax Summary</h3>";

function injectTaxInformationIcon(strHtml: string, strTaxInformationUrl?: string) {
  if (!strTaxInformationUrl || !strHtml.includes(TAX_SUMMARY_HEADING)) {
    return strHtml;
  }
  const strReplacement = `<h3 style="display:flex;align-items:center;justify-content:space-between;gap:8px;">Tax Summary <a href="${strTaxInformationUrl}" target="_blank" rel="noopener noreferrer" title="Tax Information" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex-shrink:0;border-radius:8px;background:#1d4ed8;border:1px solid #1d4ed8;color:#fff;text-decoration:none;font-size:18px;font-weight:800;font-family:inherit;box-shadow:0 2px 6px rgba(29, 78, 216, 0.35);">&#9432;</a></h3>`;
  return strHtml.replace(TAX_SUMMARY_HEADING, strReplacement);
}

export default function PayslipHtmlPreview({ strHtml, strTaxInformationUrl }: PayslipHtmlPreviewProps) {
  return (
    <Box
      component="iframe"
      srcDoc={injectTaxInformationIcon(strHtml, strTaxInformationUrl)}
      title="Payslip Preview"
      sx={{
        border: 0,
        display: "block",
        height: { xs: "72vh", md: "78vh" },
        width: "100%",
      }}
    />
  );
}
