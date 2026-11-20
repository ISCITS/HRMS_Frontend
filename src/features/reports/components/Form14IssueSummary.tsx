"use client";

import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Box, Button, Collapse, Typography } from "@mui/material";
import { useState } from "react";

import { countBySeverity, summarizeIssues, type Form14IssueLike } from "@/features/reports/utils/form14Issues";

export type Form14IssueGroup = {
  strKey: string;
  strLabel?: string;
  lstItems: Form14IssueLike[];
};

type Props = {
  lstGroups: Form14IssueGroup[];
  strControlId: string;
};

// One compact bar ("12 checks need attention – Show details") that opens a short, scrollable list.
// Issues never block the register or the exports, so the list starts collapsed.
export default function Form14IssueSummary({ lstGroups, strControlId }: Props) {
  const [blnOpen, setBlnOpen] = useState(false);
  const lstAll = lstGroups.flatMap((dicGroup) => dicGroup.lstItems);
  if (lstAll.length === 0) {
    return null;
  }
  const { intErrors, intWarnings } = countBySeverity(lstAll);
  const lstParts = [intErrors ? `${intErrors} error${intErrors === 1 ? "" : "s"}` : "", intWarnings ? `${intWarnings} warning${intWarnings === 1 ? "" : "s"}` : ""].filter(Boolean);
  const blnMultiple = lstGroups.length > 1;

  return (
    <Box sx={{ border: "1px solid #fde68a", backgroundColor: "#fffbeb", borderRadius: "10px", px: 1.5, py: 0.5 }}>
      <Box sx={{ alignItems: "center", display: "flex", gap: 1, minHeight: 36 }}>
        <WarningAmberRoundedIcon fontSize="small" sx={{ color: "#b45309" }} />
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
          {lstAll.length} check{lstAll.length === 1 ? "" : "s"} need attention ({lstParts.join(", ")})
          {blnMultiple ? ` across ${lstGroups.length} workers` : ""}
          <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontWeight: 400 }}> · these never block printing</Typography>
        </Typography>
        <Button
          size="small"
          onClick={() => setBlnOpen((blnPrevious) => !blnPrevious)}
          endIcon={blnOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          aria-expanded={blnOpen}
          controlId={`${strControlId}.toggle.button`}
        >
          {blnOpen ? "Hide details" : "Show details"}
        </Button>
      </Box>
      <Collapse in={blnOpen} unmountOnExit>
        <Box sx={{ maxHeight: 200, overflowY: "auto", pb: 1, pt: 0.5 }}>
          {lstGroups.map((dicGroup) => (
            <Box key={dicGroup.strKey} sx={{ mb: 0.75 }}>
              {dicGroup.strLabel ? <Typography variant="body2" sx={{ fontWeight: 600 }}>{dicGroup.strLabel}</Typography> : null}
              {summarizeIssues(dicGroup.lstItems).map((dicLine) => (
                <Box key={dicLine.strCode} sx={{ alignItems: "flex-start", display: "flex", gap: 0.75, py: 0.25 }}>
                  {dicLine.strSeverity === "error" ? (
                    <ErrorOutlineRoundedIcon sx={{ color: "#b91c1c", fontSize: 16, mt: "3px" }} />
                  ) : (
                    <WarningAmberRoundedIcon sx={{ color: "#b45309", fontSize: 16, mt: "3px" }} />
                  )}
                  <Typography variant="body2">
                    {dicLine.strText}
                    {dicLine.strMonths ? <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}> — {dicLine.strMonths}</Typography> : null}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
