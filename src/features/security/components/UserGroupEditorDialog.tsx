"use client";

import {
  Box,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import CommonMasterDialog from "@/components/master/CommonMasterDialog";
import { authHelpers } from "@/lib/auth";
import type { UserGroupFormPayload } from "@/models/SecurityModels";

type FormMode = "add" | "edit" | "view";

type UserGroupEditorDialogProps = {
  blnOpen: boolean;
  strMode: FormMode;
  objForm: UserGroupFormPayload;
  blnSaving: boolean;
  onClose: () => void;
  onChange: (objNextForm: UserGroupFormPayload) => void;
  onSave: () => void;
};

export default function UserGroupEditorDialog({
  blnOpen,
  strMode,
  objForm,
  blnSaving,
  onClose,
  onChange,
  onSave,
}: UserGroupEditorDialogProps) {
  const blnReadOnly = strMode === "view";
  const intCurrentCompanyID = authHelpers.getCompanyID();

  function updateField<TKey extends keyof UserGroupFormPayload>(strKey: TKey, value: UserGroupFormPayload[TKey]) {
    onChange({
      ...objForm,
      [strKey]: value,
    });
  }

  return (
    <CommonMasterDialog
      blnOpen={blnOpen}
      onClose={onClose}
      onDialogClose={blnSaving ? undefined : onClose}
      maxWidth="sm"
      paperClassName=""
      paperSx={{
        borderRadius: 4,
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(250,253,255,1) 0%, rgba(255,255,255,1) 55%, rgba(247,250,252,1) 100%)",
      }}
      strTitle={strMode === "add" ? "Create User Group" : strMode === "edit" ? "Edit User Group" : "View User Group"}
      strSecondaryLabel={blnReadOnly ? "Close" : "Cancel"}
      strPrimaryLabel={strMode === "add" ? "Create Group" : "Save Changes"}
      onPrimaryAction={onSave}
      blnPrimaryDisabled={blnSaving}
      blnHidePrimary={blnReadOnly}
      nodeContent={<Stack spacing={2.25} sx={{ pt: 1 }}>
        <Stack spacing={0.5} sx={{ mb: 0.5 }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
            Maintain the business identity and activation state for this group.
          </Typography>
        </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Group Code"
              value={objForm.strGroupCode}
              onChange={(objEvent) => updateField("strGroupCode", objEvent.target.value)}
              disabled={blnReadOnly}
              required
            />
            <TextField
              label="Group Name"
              value={objForm.strGroupName}
              onChange={(objEvent) => updateField("strGroupName", objEvent.target.value)}
              disabled={blnReadOnly}
              required
            />
          </Box>

          <TextField
            label="Group Description"
            value={objForm.strGroupDescription ?? ""}
            onChange={(objEvent) => updateField("strGroupDescription", objEvent.target.value)}
            disabled={blnReadOnly}
            multiline
            minRows={3}
          />

          <TextField
            select
            label="Group Scope"
            value={objForm.intCompanyID == null ? "tenant" : "company"}
            onChange={(objEvent) =>
              updateField("intCompanyID", objEvent.target.value === "tenant" ? null : intCurrentCompanyID)
            }
            disabled={blnReadOnly || intCurrentCompanyID == null}
            helperText={
              intCurrentCompanyID == null
                ? "No company context is available in the current session."
                : objForm.intCompanyID == null
                  ? "This group is available tenant-wide."
                  : `This group is scoped to company ${objForm.intCompanyID}.`
            }
          >
            <MenuItem value="tenant">Tenant-wide</MenuItem>
            <MenuItem value="company">Current company only</MenuItem>
          </TextField>

            <Box
              sx={{
                display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.5,
              py: 1.25,
              borderRadius: 3,
              border: "1px solid #dbe7f0",
              background: "rgba(248,250,252,0.9)",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>Is Active</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                Inactive groups are excluded from current user-group resolution.
              </Typography>
            </Box>
            <Switch
              checked={objForm.blnIsActive}
              onChange={(objEvent) => updateField("blnIsActive", objEvent.target.checked)}
              disabled={blnReadOnly}
              />
            </Box>
        </Stack>}
    />
  );
}
