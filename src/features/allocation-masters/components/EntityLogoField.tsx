"use client";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useRef } from "react";

import { checkLogoFile, LOGO_ACCEPT } from "@/features/allocation-masters/services/allocationMasterService";

/** A logo change waiting for Save: a new file (with its preview) or removing the saved logo. */
export type EntityLogoChange = { strKind: "upload"; objFile: File; strPreviewUrl: string } | { strKind: "remove" } | null;

type Props = {
  /** The saved logo (data URI), null when there is none or it is still loading. */
  strSavedLogo: string | null;
  blnLoadingSaved: boolean;
  objChange: EntityLogoChange;
  blnReadOnly: boolean;
  onChange: (objChange: EntityLogoChange) => void;
  onError: (strMessage: string) => void;
};

/** Allocation Entity logo: printed on payslips / F&F reports when Settings > Payroll > Payslip
 * Header > Logo is "Allocation entity logo". Applied when the entity is saved. */
export default function EntityLogoField({ strSavedLogo, blnLoadingSaved, objChange, blnReadOnly, onChange, onError }: Props) {
  const objInputRef = useRef<HTMLInputElement | null>(null);
  const strShown = objChange?.strKind === "upload" ? objChange.strPreviewUrl : objChange?.strKind === "remove" ? null : strSavedLogo;

  function chooseFile(objFile: File | undefined) {
    if (!objFile) return;
    const strProblem = checkLogoFile(objFile);
    if (strProblem) {
      onError(strProblem);
      return;
    }
    onChange({ strKind: "upload", objFile, strPreviewUrl: URL.createObjectURL(objFile) });
  }

  return (
    <Box sx={{ gridColumn: "1 / -1", border: "1px solid #c5d3e8", borderRadius: "10px", p: 1.25, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }} data-testid="allocation-entity.dialog.logo">
      <Box sx={{ width: 140, height: 64, border: "1px dashed #b7c8df", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fbfdff", overflow: "hidden", flex: "0 0 auto" }}>
        {strShown ? (
          <Box component="img" src={strShown} alt="Entity logo" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <Stack alignItems="center" sx={{ color: "#94a3b8" }}>
            <ImageOutlinedIcon fontSize="small" />
            <Typography sx={{ fontSize: "0.7rem" }}>{blnLoadingSaved ? "Loading..." : "No logo"}</Typography>
          </Stack>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#172033" }}>Logo</Typography>
        <Typography sx={{ color: "#60749b", fontSize: "0.75rem" }}>
          {objChange?.strKind === "upload"
            ? `${objChange.objFile.name} - uploaded when you save.`
            : objChange?.strKind === "remove"
              ? "The logo is removed when you save."
              : "PNG, JPG or WEBP, up to 512 KB. Printed on payslips when chosen in Settings > Payroll."}
        </Typography>
      </Box>
      {!blnReadOnly ? (
        <Stack direction="row" spacing={1}>
          <input
            ref={objInputRef}
            type="file"
            accept={LOGO_ACCEPT}
            hidden
            onChange={(objEvent) => {
              chooseFile(objEvent.target.files?.[0]);
              objEvent.target.value = "";
            }}
            data-controlid="allocation-entity.dialog.logo.file"
          />
          <Button size="small" className="app-btn app-btn-outline" startIcon={<UploadRoundedIcon />} onClick={() => objInputRef.current?.click()} controlId="allocation-entity.dialog.logo.upload.button">
            {strShown ? "Change" : "Upload logo"}
          </Button>
          {strShown || objChange ? (
            <Button
              size="small"
              className="app-btn app-btn-outline"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={() => onChange(objChange?.strKind === "upload" && !strSavedLogo ? null : { strKind: "remove" })}
              disabled={objChange?.strKind === "remove"}
              controlId="allocation-entity.dialog.logo.remove.button"
            >
              Remove
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
