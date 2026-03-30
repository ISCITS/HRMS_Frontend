"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import UserGroupRightsEditor, { clearMenuTreeRights, serializeRights } from "@/features/security/components/UserGroupRightsEditor";
import { authHelpers } from "@/lib/auth";
import type { SecurityMenuNode, UserGroupAuthorizationMetadata, UserGroupFormPayload, UserGroupRightSaveItem } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";

type FormMode = "add" | "edit" | "view";

type UserGroupMasterDialogProps = {
  blnOpen: boolean;
  strMode: FormMode;
  intUserGroupID: number | null;
  objForm: UserGroupFormPayload;
  blnSaving: boolean;
  onClose: () => void;
  onChange: (objNextForm: UserGroupFormPayload) => void;
  onSave: (lstRights: UserGroupRightSaveItem[]) => void;
};

export default function UserGroupMasterDialog({
  blnOpen,
  strMode,
  intUserGroupID,
  objForm,
  blnSaving,
  onClose,
  onChange,
  onSave,
}: UserGroupMasterDialogProps) {
  const { t } = useModuleLabels("user_group");
  const blnReadOnly = strMode === "view";
  const intCurrentCompanyID = authHelpers.getCompanyID();
  const [intActiveTab, setIntActiveTab] = useState(0);
  const [objMetadata, setObjMetadata] = useState<UserGroupAuthorizationMetadata | null>(null);
  const [blnMetadataLoading, setBlnMetadataLoading] = useState(false);
  const [lstRightsNodes, setLstRightsNodes] = useState<SecurityMenuNode[]>([]);

  useEffect(() => {
    if (!blnOpen) {
      setIntActiveTab(0);
    }
  }, [blnOpen]);

  useEffect(() => {
    let blnMounted = true;

    async function loadMetadata() {
      setBlnMetadataLoading(true);
      try {
        if (!blnOpen) {
          setObjMetadata(null);
          setLstRightsNodes([]);
          return;
        }

        if (intUserGroupID) {
          const objResult = await securityApiService.getUserGroupAuthorizationMetadata(intUserGroupID);
          if (blnMounted) {
            setObjMetadata(objResult.Data);
            setLstRightsNodes(objResult.Data.lstMenuTree);
          }
          return;
        }

        const objUserGroups = await securityApiService.listUserGroups();
        const intTemplateGroupID = objUserGroups.Data[0]?.intID ?? null;
        if (!intTemplateGroupID) {
          if (blnMounted) {
            setObjMetadata(null);
            setLstRightsNodes([]);
          }
          return;
        }

        const objResult = await securityApiService.getUserGroupAuthorizationMetadata(intTemplateGroupID);
        if (blnMounted) {
          setObjMetadata(null);
          setLstRightsNodes(clearMenuTreeRights(objResult.Data.lstMenuTree));
        }
      } catch {
        if (blnMounted) {
          setObjMetadata(null);
          setLstRightsNodes([]);
        }
      } finally {
        if (blnMounted) {
          setBlnMetadataLoading(false);
        }
      }
    }

    loadMetadata().catch(() => undefined);

    return () => {
      blnMounted = false;
    };
  }, [blnOpen, intUserGroupID]);

  function updateField<TKey extends keyof UserGroupFormPayload>(strKey: TKey, value: UserGroupFormPayload[TKey]) {
    onChange({
      ...objForm,
      [strKey]: value,
    });
  }

  const dicLabels = {
    dialogAddTitle: t("dialog_add_title", "Add User Group"),
    dialogEditTitle: t("dialog_edit_title", "Edit User Group"),
    dialogViewTitle: t("dialog_view_title", "View User Group"),
    tabBasicDetails: t("tab_basic_details", "Basic Details"),
    tabRights: t("tab_rights", "Menu & Action Rights"),
    fieldGroupCode: t("field_group_code", "Group Code"),
    fieldGroupName: t("field_group_name", "Group Name"),
    fieldGroupDescription: t("field_group_description", "Group Description"),
    fieldGroupScope: t("field_group_scope", "Group Scope"),
    scopeNoCompany: t("scope_no_company", "No company context is available in the current session."),
    scopeTenantWide: t("scope_tenant_wide", "This group is available tenant-wide."),
    scopeCompanyScoped: t("scope_company_scoped", "This group is scoped to company {companyId}."),
    scopeTenantOption: t("scope_tenant_option", "Tenant-wide"),
    scopeCompanyOption: t("scope_company_option", "Current company only"),
    fieldIsActive: t("field_is_active", "Is Active"),
    fieldIsActiveHelp: t("field_is_active_help", "Inactive groups are excluded from permission resolution."),
    summaryVisibleMenus: t("summary_visible_menus", "Visible Menus"),
    summaryAllowedActions: t("summary_allowed_actions", "Allowed Actions"),
    summaryAssignedUsers: t("summary_assigned_users", "Assigned Users"),
    rightsMetadataEmpty: t("rights_metadata_empty", "Dynamic menu metadata is not available yet. Create at least one user group seed record or refresh the backend data."),
    closeButton: t("close_button", "Close"),
    cancelButton: t("cancel_button", "Cancel"),
    saveButton: t("save_button", "Save User Group"),
    saveChangesButton: t("save_changes_button", "Save Changes"),
  };

  return (
    <Dialog
      open={blnOpen}
      onClose={blnSaving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 0,
          overflow: "hidden",
          maxHeight: "86vh",
          minHeight: "auto",
          background: "linear-gradient(180deg, rgba(250,253,255,1) 0%, rgba(255,255,255,1) 55%, rgba(247,250,252,1) 100%)",
        },
      }}
    >
      <DialogTitle sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e2e8f0" }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a" }}>
          {strMode === "add" ? dicLabels.dialogAddTitle : strMode === "edit" ? dicLabels.dialogEditTitle : dicLabels.dialogViewTitle}
        </Typography>
      </DialogTitle>

      <Tabs
        value={intActiveTab}
        onChange={(_, intNextValue) => setIntActiveTab(intNextValue)}
        sx={{ px: 1.5, borderBottom: "1px solid #e2e8f0", minHeight: 54 }}
      >
        <Tab label={dicLabels.tabBasicDetails} sx={{ textTransform: "none", fontWeight: 800, minHeight: 54 }} />
        <Tab label={dicLabels.tabRights} sx={{ textTransform: "none", fontWeight: 800, minHeight: 54 }} />
      </Tabs>

      <DialogContent sx={{ px: 2.5, py: 2.5, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {intActiveTab === 0 ? (
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label={dicLabels.fieldGroupCode}
                value={objForm.strGroupCode}
                onChange={(objEvent) => updateField("strGroupCode", objEvent.target.value)}
                disabled={blnReadOnly}
                required
              />
              <TextField
                label={dicLabels.fieldGroupName}
                value={objForm.strGroupName}
                onChange={(objEvent) => updateField("strGroupName", objEvent.target.value)}
                disabled={blnReadOnly}
                required
              />
            </Box>

            <TextField
              label={dicLabels.fieldGroupDescription}
              value={objForm.strGroupDescription ?? ""}
              onChange={(objEvent) => updateField("strGroupDescription", objEvent.target.value)}
              disabled={blnReadOnly}
              multiline
              minRows={3}
            />

            <TextField
              select
              label={dicLabels.fieldGroupScope}
              value={objForm.intCompanyID == null ? "tenant" : "company"}
              onChange={(objEvent) => updateField("intCompanyID", objEvent.target.value === "tenant" ? null : intCurrentCompanyID)}
              disabled={blnReadOnly || intCurrentCompanyID == null}
              helperText={
                intCurrentCompanyID == null
                  ? dicLabels.scopeNoCompany
                  : objForm.intCompanyID == null
                    ? dicLabels.scopeTenantWide
                    : dicLabels.scopeCompanyScoped.replace("{companyId}", String(objForm.intCompanyID))
              }
            >
              <MenuItem value="tenant">{dicLabels.scopeTenantOption}</MenuItem>
              <MenuItem value="company">{dicLabels.scopeCompanyOption}</MenuItem>
            </TextField>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.5,
                py: 1.25,
                borderRadius: 0,
                border: "1px solid #dbe7f0",
                background: "rgba(248,250,252,0.9)",
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{dicLabels.fieldIsActive}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {dicLabels.fieldIsActiveHelp}
                </Typography>
              </Box>
              <Switch
                checked={objForm.blnIsActive}
                onChange={(objEvent) => updateField("blnIsActive", objEvent.target.checked)}
                disabled={blnReadOnly}
              />
            </Box>

            {objMetadata ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                <Box sx={{ borderRadius: 0, border: "1px solid #dbe7f0", p: 1.2 }}>
                  <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>{dicLabels.summaryVisibleMenus}</Typography>
                  <Typography sx={{ mt: 0.55, color: "#0f172a", fontWeight: 800 }}>{objMetadata.objSummary.intVisibleMenuCount}</Typography>
                </Box>
                <Box sx={{ borderRadius: 0, border: "1px solid #dbe7f0", p: 1.2 }}>
                  <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>{dicLabels.summaryAllowedActions}</Typography>
                  <Typography sx={{ mt: 0.55, color: "#0f172a", fontWeight: 800 }}>{objMetadata.objSummary.intAllowedActionCount}</Typography>
                </Box>
                <Box sx={{ borderRadius: 0, border: "1px solid #dbe7f0", p: 1.2 }}>
                  <Typography sx={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>{dicLabels.summaryAssignedUsers}</Typography>
                  <Typography sx={{ mt: 0.55, color: "#0f172a", fontWeight: 800 }}>{objMetadata.objSummary.intAssignedUserCount}</Typography>
                </Box>
              </Box>
            ) : null}
          </Stack>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, pt: 1 }}>
            {lstRightsNodes.length > 0 ? (
              <UserGroupRightsEditor
                lstNodes={lstRightsNodes}
                blnReadOnly={blnReadOnly}
                blnEmbedded
                onChange={setLstRightsNodes}
              />
            ) : (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 0 }}>
                {dicLabels.rightsMetadataEmpty}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2, borderTop: "1px solid #e2e8f0", gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={blnSaving} sx={{ borderRadius: 0, textTransform: "none", fontWeight: 700 }}>
          {blnReadOnly ? dicLabels.closeButton : dicLabels.cancelButton}
        </Button>
        {!blnReadOnly ? (
          <Button
            variant="contained"
            onClick={() => onSave(serializeRights(lstRightsNodes))}
            disabled={blnSaving || blnMetadataLoading}
            sx={{ borderRadius: 0, textTransform: "none", fontWeight: 700, px: 2.5 }}
          >
            {strMode === "add" ? dicLabels.saveButton : dicLabels.saveChangesButton}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
