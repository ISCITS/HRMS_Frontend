"use client";

import { Box } from "@mui/material";

type PayslipHtmlPreviewProps = {
  strHtml: string;
};

export default function PayslipHtmlPreview({ strHtml }: PayslipHtmlPreviewProps) {
  return (
    <Box
      component="iframe"
      srcDoc={strHtml}
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
