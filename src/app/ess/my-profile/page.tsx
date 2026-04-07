"use client";

import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";
import { authApiService } from "@/services";

export default function EssMyProfilePage() {
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnMounted = true;

    authApiService.getCurrentUser()
      .then((objResult) => {
        if (!blnMounted) {
          return;
        }

        const intCurrentEmployeeID = objResult.Data.objUser.intEmployeeID ?? null;
        if (!intCurrentEmployeeID) {
          setStrError("No employee is linked to the current user.");
          return;
        }

        setIntEmployeeID(intCurrentEmployeeID);
      })
      .catch((objError: unknown) => {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load your profile.");
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoading(false);
        }
      });

    return () => {
      blnMounted = false;
    };
  }, []);

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Loading your employee profile...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!intEmployeeID) {
    return (
      <Paper sx={{ p: 3, borderRadius: "24px" }}>
        <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>My Profile</Typography>
        <Typography color="error">{strError || "Unable to resolve employee profile."}</Typography>
      </Paper>
    );
  }

  return (
    <EmployeeEditorScreen
      strMode="edit"
      intEmployeeID={intEmployeeID}
      blnHideSalaryOpenPageButton
      blnHidePageHeading
      strBackRoute="/dashboard"
    />
  );
}
