"use client";

import { Box } from "@mui/material";

type Form16HtmlPreviewProps = {
  strHtml: string;
};

export default function Form16HtmlPreview({ strHtml }: Form16HtmlPreviewProps) {
  return (
    <Box
      component="iframe"
      srcDoc={strHtml}
      title="Form 16 Preview"
      sx={{
        border: 0,
        display: "block",
        height: { xs: "72vh", md: "82vh" },
        width: "100%",
      }}
    />
  );
}
