"use client";

import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Alert, Badge, Box, IconButton, Popover, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import type { FNFCalculationValidation } from "@/features/payroll/types";

const DIC_SEVERITY_ORDER: Record<string, number> = { blocking: 0, warning: 1, info: 2 };

function toAlertSeverity(strSeverity: string) {
  return strSeverity === "blocking" ? "error" : strSeverity === "warning" ? "warning" : "info";
}

/** Calculation validations behind one corner icon: the icon and badge take the colour of the most
 * serious item, and clicking opens the full list instead of filling the screen with alerts. */
export default function FNFValidationButton({ lstValidations }: { lstValidations: FNFCalculationValidation[] }) {
  const [objAnchor, setObjAnchor] = useState<HTMLElement | null>(null);
  if (!lstValidations.length) return null;

  const lstSorted = [...lstValidations].sort((objA, objB) => (DIC_SEVERITY_ORDER[objA.severity] ?? 3) - (DIC_SEVERITY_ORDER[objB.severity] ?? 3));
  const strWorst = toAlertSeverity(lstSorted[0].severity);
  const intBlocking = lstValidations.filter((dicValidation) => dicValidation.severity === "blocking").length;
  const objIcon = strWorst === "error" ? <ErrorOutlineRoundedIcon fontSize="small" /> : strWorst === "warning" ? <WarningAmberRoundedIcon fontSize="small" /> : <InfoOutlinedIcon fontSize="small" />;

  return (
    <>
      <Tooltip title={`Validations (${lstValidations.length})${intBlocking ? ` - ${intBlocking} blocking` : ""}`}>
        <IconButton size="small" color={strWorst} onClick={(objEvent) => setObjAnchor(objEvent.currentTarget)} aria-label="Show validations" controlId="payroll.fnf-settlement-detail.validations.button">
          <Badge badgeContent={lstValidations.length} color={strWorst} max={99}>{objIcon}</Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(objAnchor)}
        anchorEl={objAnchor}
        onClose={() => setObjAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: 420 } } }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Validations ({lstValidations.length})</Typography>
          <Stack spacing={0.75}>
            {lstSorted.map((dicValidation) => (
              <Alert key={dicValidation.code} severity={toAlertSeverity(dicValidation.severity)} sx={{ py: 0 }}>
                {dicValidation.message}{dicValidation.severity === "blocking" ? " Submitting for review will ask for an override reason." : ""}
              </Alert>
            ))}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
