"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import UserGroupRightsMatrix from "@/features/security/components/UserGroupRightsMatrix";
import type { UserGroupRecord } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";

type UserGroupRightsPageProps = {
  intUserGroupID: number;
};

export default function UserGroupRightsPage({ intUserGroupID }: UserGroupRightsPageProps) {
  const objRouter = useRouter();
  const [objGroup, setObjGroup] = useState<UserGroupRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);

  async function loadGroup() {
    setBlnLoading(true);
    try {
      const objResult = await securityApiService.getUserGroup(intUserGroupID);
      setObjGroup(objResult.Data);
    } catch {
      setObjGroup(null);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadGroup().catch(() => undefined);
  }, [intUserGroupID]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <Box
        sx={{
          borderRadius: 4,
          border: "1px solid rgba(187, 213, 232, 0.7)",
          background: "#fff",
          px: 2.5,
          py: 2,
          boxShadow: "var(--app-shadow-soft)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
          <Box>
            <Typography sx={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a" }}>User Group Rights</Typography>
            <Typography sx={{ mt: 0.5, color: "#64748b" }}>
              Configure hierarchical menu, sub-menu, and action visibility for the selected group.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => objRouter.push("/security/user-groups")}
            data-testid="security.user-group-rights.back.button"
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
          >
            Back To User Groups
          </Button>
        </Stack>
      </Box>

      {objGroup ? (
        <UserGroupRightsMatrix
          intUserGroupID={intUserGroupID}
          strGroupCode={objGroup.strGroupCode}
          strGroupName={objGroup.strGroupName}
        />
      ) : null}

      <BlockingLoader blnOpen={blnLoading} strLabel="Preparing user group..." />
    </Box>
  );
}
