"use client";

import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GroupWorkOutlinedIcon from "@mui/icons-material/GroupWorkOutlined";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import UserGroupEditorDialog from "@/features/security/components/UserGroupEditorDialog";
import UserGroupRightsMatrix from "@/features/security/components/UserGroupRightsMatrix";
import { authHelpers } from "@/lib/auth";
import type { UserGroupAuthorizationMetadata, UserGroupFormPayload, UserGroupRecord } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";

type FormMode = "add" | "edit" | "view";

const objEmptyForm: UserGroupFormPayload = {
  strGroupCode: "",
  strGroupName: "",
  strGroupDescription: "",
  intCompanyID: authHelpers.getCompanyID(),
  blnIsActive: true,
  intLanguageID: authHelpers.getLanguageID() ?? 1,
};

export default function UserGroupAdminPage() {
  const [lstRecords, setLstRecords] = useState<UserGroupRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strSearch, setStrSearch] = useState("");
  const [intSelectedID, setIntSelectedID] = useState<number | null>(null);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strMode, setStrMode] = useState<FormMode>("add");
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [objForm, setObjForm] = useState<UserGroupFormPayload>(objEmptyForm);
  const [intActiveTab, setIntActiveTab] = useState(0);
  const [objAuthorizationMetadata, setObjAuthorizationMetadata] = useState<UserGroupAuthorizationMetadata | null>(null);
  const [blnMetadataLoading, setBlnMetadataLoading] = useState(false);
  const [objToast, setObjToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  async function loadUserGroups() {
    setBlnLoading(true);
    try {
      const objResult = await securityApiService.listUserGroups();
      setLstRecords(objResult.Data);
      setIntSelectedID((intPrevious) => intPrevious ?? objResult.Data[0]?.intID ?? null);
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to load user groups.",
        severity: "error",
      });
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadUserGroups().catch(() => undefined);
  }, []);

  const lstFilteredRecords = lstRecords.filter((objRecord) => {
    const strNeedle = strSearch.trim().toLowerCase();
    if (!strNeedle) {
      return true;
    }

    return [objRecord.strGroupCode, objRecord.strGroupName, objRecord.strGroupDescription ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(strNeedle);
  });

  const objSelectedRecord =
    lstFilteredRecords.find((objRecord) => objRecord.intID === intSelectedID) ??
    lstRecords.find((objRecord) => objRecord.intID === intSelectedID) ??
    lstFilteredRecords[0] ??
    null;

  useEffect(() => {
    if (!objSelectedRecord && lstFilteredRecords[0]) {
      setIntSelectedID(lstFilteredRecords[0].intID);
    }
  }, [objSelectedRecord, lstFilteredRecords]);

  useEffect(() => {
    let blnMounted = true;

    async function loadAuthorizationMetadata() {
      if (!objSelectedRecord) {
        setObjAuthorizationMetadata(null);
        return;
      }

      setBlnMetadataLoading(true);
      try {
        const objResult = await securityApiService.getUserGroupAuthorizationMetadata(objSelectedRecord.intID);
        if (!blnMounted) {
          return;
        }
        setObjAuthorizationMetadata(objResult.Data);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setObjAuthorizationMetadata(null);
        setObjToast({
          open: true,
          message: objError instanceof Error ? objError.message : "Unable to load authorization metadata.",
          severity: "error",
        });
      } finally {
        if (blnMounted) {
          setBlnMetadataLoading(false);
        }
      }
    }

    loadAuthorizationMetadata().catch(() => undefined);

    return () => {
      blnMounted = false;
    };
  }, [objSelectedRecord?.intID]);

  function openDialog(strNextMode: FormMode, objRecord?: UserGroupRecord) {
    setStrMode(strNextMode);
    setIntEditingID(objRecord?.intID ?? null);
    setIntActiveTab(0);
    setObjForm(
      objRecord
        ? {
            strGroupCode: objRecord.strGroupCode,
            strGroupName: objRecord.strGroupName,
            strGroupDescription: objRecord.strGroupDescription ?? "",
            intCompanyID: objRecord.intCompanyID,
            blnIsActive: objRecord.blnIsActive,
            intLanguageID: authHelpers.getLanguageID() ?? 1,
          }
        : { ...objEmptyForm }
    );
    setBlnDialogOpen(true);
  }

  async function saveRecord() {
    setBlnSaving(true);
    try {
      if (strMode === "add") {
        await securityApiService.createUserGroup(objForm);
      } else if (intEditingID) {
        await securityApiService.updateUserGroup(intEditingID, objForm);
      }
      setBlnDialogOpen(false);
      await loadUserGroups();
      setObjToast({
        open: true,
        message: strMode === "add" ? "User group saved successfully." : "User group updated successfully.",
        severity: "success",
      });
      if (intEditingID || strMode === "add") {
        const objLatestRecord = await securityApiService.listUserGroups();
        const objSavedRecord = objLatestRecord.Data.find((objRecord) => objRecord.strGroupCode === objForm.strGroupCode) ?? null;
        if (objSavedRecord) {
          setIntSelectedID(objSavedRecord.intID);
        }
      }
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to save user group.",
        severity: "error",
      });
    } finally {
      setBlnSaving(false);
    }
  }

  async function toggleStatus(objRecord: UserGroupRecord) {
    setBlnSaving(true);
    try {
      await securityApiService.updateUserGroupStatus(objRecord.intID, !objRecord.blnIsActive);
      await loadUserGroups();
      setObjToast({
        open: true,
        message: "User group status updated successfully.",
        severity: "success",
      });
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to update status.",
        severity: "error",
      });
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Box sx={{ display: "flex", gap: 1.5, height: "100%", minHeight: 0 }}>
      <Box
        sx={{
          width: { xs: "100%", xl: 340 },
          flexShrink: 0,
          display: { xs: objSelectedRecord ? "none" : "flex", xl: "flex" },
          flexDirection: "column",
          gap: 1.5,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            borderRadius: 4,
            border: "1px solid rgba(187, 213, 232, 0.7)",
            background: "linear-gradient(145deg, rgba(14,116,144,0.95) 0%, rgba(29,78,216,0.9) 100%)",
            boxShadow: "var(--app-shadow-soft)",
            p: 2.25,
            color: "#eff6ff",
          }}
        >
          <Stack spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>
                Security Administration
              </Typography>
              <Typography sx={{ mt: 0.6, fontSize: "1.55rem", fontWeight: 800, lineHeight: 1.1 }}>
                User Groups
              </Typography>
              <Typography sx={{ mt: 0.8, fontSize: "0.9rem", color: "rgba(239,246,255,0.88)" }}>
                Manage group identity, menu hierarchy, and action rights from one workspace.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => openDialog("add")}
              sx={{
                alignSelf: "flex-start",
                borderRadius: 2.5,
                px: 2.25,
                textTransform: "none",
                fontWeight: 800,
                bgcolor: "#fff",
                color: "#1d4ed8",
                "&:hover": { bgcolor: "#eff6ff" },
              }}
            >
              Create User Group
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            borderRadius: 4,
            border: "1px solid rgba(187, 213, 232, 0.7)",
            backgroundColor: "#fff",
            boxShadow: "var(--app-shadow-soft)",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            minHeight: 0,
            flex: 1,
          }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <Box sx={{ borderRadius: 3, bgcolor: "rgba(37,99,235,0.08)", p: 1.25 }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase" }}>Total</Typography>
              <Typography sx={{ mt: 0.45, color: "#0f172a", fontSize: "1.3rem", fontWeight: 800 }}>{lstRecords.length}</Typography>
            </Box>
            <Box sx={{ borderRadius: 3, bgcolor: "rgba(16,185,129,0.08)", p: 1.25 }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 800, textTransform: "uppercase" }}>Active</Typography>
              <Typography sx={{ mt: 0.45, color: "#0f172a", fontSize: "1.3rem", fontWeight: 800 }}>
                {lstRecords.filter((objRecord) => objRecord.blnIsActive).length}
              </Typography>
            </Box>
          </Box>

          <TextField
            placeholder="Search groups"
            value={strSearch}
            onChange={(objEvent) => setStrSearch(objEvent.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: "#64748b" }} />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
            <Stack spacing={1}>
              {lstFilteredRecords.map((objRecord) => {
                const blnSelected = objSelectedRecord?.intID === objRecord.intID;
                return (
                  <Box
                    key={objRecord.intID}
                    onClick={() => setIntSelectedID(objRecord.intID)}
                    sx={{
                      cursor: "pointer",
                      borderRadius: 3,
                      border: blnSelected ? "1px solid rgba(29,78,216,0.35)" : "1px solid #e2e8f0",
                      background: blnSelected
                        ? "linear-gradient(180deg, rgba(239,246,255,0.95), rgba(248,250,252,0.96))"
                        : "#fff",
                      p: 1.4,
                      transition: "all 180ms ease",
                      "&:hover": {
                        borderColor: "rgba(29,78,216,0.3)",
                        backgroundColor: "rgba(248,250,252,0.9)",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{objRecord.strGroupName}</Typography>
                        <Typography sx={{ mt: 0.25, color: "#64748b", fontSize: "0.82rem" }}>{objRecord.strGroupCode}</Typography>
                      </Box>
                      <Chip
                        label={objRecord.blnIsActive ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: objRecord.blnIsActive ? "rgba(16,185,129,0.12)" : "rgba(251,146,60,0.14)",
                          color: objRecord.blnIsActive ? "#047857" : "#c2410c",
                        }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "#475569",
                        fontSize: "0.84rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {objRecord.strGroupDescription || "No description configured yet."}
                    </Typography>
                  </Box>
                );
              })}

              {lstFilteredRecords.length === 0 ? (
                <Box sx={{ borderRadius: 3, border: "1px dashed #cbd5e1", p: 2, textAlign: "center" }}>
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>No user groups found</Typography>
                  <Typography sx={{ mt: 0.5, color: "#64748b", fontSize: "0.85rem" }}>
                    Adjust the search or create the first user group.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            borderRadius: 4,
            border: "1px solid rgba(187, 213, 232, 0.7)",
            backgroundColor: "#fff",
            boxShadow: "var(--app-shadow-soft)",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2.5, py: 2.25 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BadgeRoundedIcon sx={{ color: "#1d4ed8" }} />
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
                    {objAuthorizationMetadata?.objGroup.strGroupName || objSelectedRecord?.strGroupName || "Select a user group"}
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 0.65, color: "#64748b" }}>
                  {objAuthorizationMetadata?.objGroup.strGroupDescription || objSelectedRecord?.strGroupDescription || "Choose a group from the left to manage overview and rights."}
                </Typography>
              </Box>

              {objSelectedRecord ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityOutlinedIcon />}
                    onClick={() => openDialog("view", objSelectedRecord)}
                    sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
                  >
                    View
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => openDialog("edit", objSelectedRecord)}
                    sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ToggleOnRoundedIcon />}
                    onClick={() => toggleStatus(objSelectedRecord)}
                    sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
                  >
                    {objSelectedRecord.blnIsActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    component={Link}
                    href={`/security/user-groups/${objSelectedRecord.intID}/rights`}
                    variant="contained"
                    startIcon={<GroupWorkOutlinedIcon />}
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
                  >
                    Full Rights Screen
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </Box>

          <Divider />

          <Tabs
            value={intActiveTab}
            onChange={(_, intNextValue) => setIntActiveTab(intNextValue)}
            sx={{ px: 1.5, borderBottom: "1px solid #e2e8f0", minHeight: 56 }}
          >
            <Tab label="Overview" sx={{ textTransform: "none", fontWeight: 800, minHeight: 56 }} />
            <Tab label="Menu & Action Rights" sx={{ textTransform: "none", fontWeight: 800, minHeight: 56 }} />
          </Tabs>
        </Box>

        {intActiveTab === 0 ? (
          <Box
            sx={{
              borderRadius: 4,
              border: "1px solid rgba(187, 213, 232, 0.7)",
              backgroundColor: "#fff",
              boxShadow: "var(--app-shadow-soft)",
              p: 2.25,
              flex: 1,
              minHeight: 0,
            }}
          >
            {objSelectedRecord ? (
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                    gap: 1.25,
                  }}
                >
                  <Box sx={{ borderRadius: 3, border: "1px solid #dbe7f0", p: 1.5 }}>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Group Code</Typography>
                    <Typography sx={{ mt: 0.65, color: "#0f172a", fontWeight: 800 }}>
                      {objAuthorizationMetadata?.objGroup.strGroupCode || objSelectedRecord.strGroupCode}
                    </Typography>
                  </Box>
                  <Box sx={{ borderRadius: 3, border: "1px solid #dbe7f0", p: 1.5 }}>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Scope</Typography>
                    <Typography sx={{ mt: 0.65, color: "#0f172a", fontWeight: 800 }}>
                      {(objAuthorizationMetadata?.objGroup.intCompanyID ?? objSelectedRecord.intCompanyID) == null ? "Tenant-wide" : `Company ${objAuthorizationMetadata?.objGroup.intCompanyID ?? objSelectedRecord.intCompanyID}`}
                    </Typography>
                  </Box>
                  <Box sx={{ borderRadius: 3, border: "1px solid #dbe7f0", p: 1.5 }}>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Status</Typography>
                    <Typography sx={{ mt: 0.65, color: objSelectedRecord.blnIsActive ? "#047857" : "#c2410c", fontWeight: 800 }}>
                      {objSelectedRecord.blnIsActive ? "Active" : "Inactive"}
                    </Typography>
                  </Box>
                  <Box sx={{ borderRadius: 3, border: "1px solid #dbe7f0", p: 1.5 }}>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Assigned Users</Typography>
                    <Typography sx={{ mt: 0.65, color: "#0f172a", fontWeight: 800 }}>
                      {objAuthorizationMetadata?.objSummary.intAssignedUserCount ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ borderRadius: 3, border: "1px solid #dbe7f0", p: 1.5 }}>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Visible Menus</Typography>
                    <Typography sx={{ mt: 0.65, color: "#0f172a", fontWeight: 800 }}>
                      {objAuthorizationMetadata?.objSummary.intVisibleMenuCount ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ borderRadius: 3, border: "1px solid #dbe7f0", p: 1.5 }}>
                    <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Allowed Actions</Typography>
                    <Typography sx={{ mt: 0.65, color: "#0f172a", fontWeight: 800 }}>
                      {objAuthorizationMetadata?.objSummary.intAllowedActionCount ?? 0}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid #dbe7f0",
                    background: "linear-gradient(180deg, rgba(248,250,252,0.88), rgba(255,255,255,1))",
                    p: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>How this group works</Typography>
                  <Stack spacing={1} sx={{ mt: 1.25 }}>
                    <Typography sx={{ color: "#475569" }}>
                      This group controls menu visibility, module visibility, and fine-grain action access for linked users.
                    </Typography>
                    <Typography sx={{ color: "#475569" }}>
                      Use the rights tab to configure main menus, sub-menus, page actions, and future-ready access scopes.
                    </Typography>
                    <Typography sx={{ color: "#475569" }}>
                      Current metadata includes assigned users, available users for linking, and the group's effective authorization summary.
                    </Typography>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid #dbe7f0",
                    backgroundColor: "#fff",
                    p: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Assigned Users Preview</Typography>
                  {objAuthorizationMetadata?.lstAssignedUsers.length ? (
                    <Stack spacing={1} sx={{ mt: 1.25 }}>
                      {objAuthorizationMetadata.lstAssignedUsers.slice(0, 5).map((objAssignment) => (
                        <Box key={objAssignment.intID} sx={{ display: "flex", justifyContent: "space-between", gap: 1, color: "#475569" }}>
                          <Typography sx={{ fontWeight: 700 }}>{objAssignment.strGroupName}</Typography>
                          <Typography sx={{ fontSize: "0.84rem" }}>
                            {objAssignment.dtEffectiveFrom} {objAssignment.blnIsActive ? "Active" : "Inactive"}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography sx={{ mt: 1.25, color: "#64748b" }}>No users are currently linked to this group.</Typography>
                  )}
                </Box>
              </Stack>
            ) : (
              <Box sx={{ display: "grid", placeItems: "center", minHeight: 220 }}>
                <Stack spacing={1} alignItems="center">
                  <HubRoundedIcon sx={{ fontSize: 34, color: "#64748b" }} />
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Select a user group</Typography>
                  <Typography sx={{ color: "#64748b" }}>
                    The overview and rights workspace will appear here once a group is selected.
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {objSelectedRecord ? (
              <UserGroupRightsMatrix
                intUserGroupID={objSelectedRecord.intID}
                strGroupCode={objSelectedRecord.strGroupCode}
                strGroupName={objSelectedRecord.strGroupName}
              />
            ) : (
              <Box
                sx={{
                  borderRadius: 4,
                  border: "1px solid rgba(187, 213, 232, 0.7)",
                  backgroundColor: "#fff",
                  boxShadow: "var(--app-shadow-soft)",
                  display: "grid",
                  placeItems: "center",
                  minHeight: 260,
                }}
              >
                <Typography sx={{ color: "#64748b" }}>Select a group to configure rights.</Typography>
              </Box>
            )}
          </Box>
        )}

        {blnLoading || blnMetadataLoading ? <LinearProgress sx={{ borderRadius: 999 }} /> : null}
      </Box>

      <UserGroupEditorDialog
        blnOpen={blnDialogOpen}
        strMode={strMode}
        objForm={objForm}
        blnSaving={blnSaving}
        onClose={() => setBlnDialogOpen(false)}
        onChange={setObjForm}
        onSave={saveRecord}
      />

      <BlockingLoader blnOpen={blnLoading || blnMetadataLoading || blnSaving} strLabel={blnLoading || blnMetadataLoading ? "Loading workspace..." : "Processing..."} />
      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">
          {objToast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
