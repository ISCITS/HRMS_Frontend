"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

import type { PayslipHeaderFieldDto, PayslipHeaderLimits, PayslipHeaderLine, PayslipHeaderStyle } from "@/features/settings/types";
import {
  cloneHeaderLines,
  createHeaderLine,
  entityFieldKeys,
  moveHeaderLine,
  resolveHeaderLines,
  usesCustomText,
} from "@/features/settings/utils/payslipHeader";

const DIC_STYLE_LABEL: Record<PayslipHeaderStyle, string> = { heading: "Heading", bold: "Bold", normal: "Normal" };

type Props = {
  /** A logo is chosen: the preview shows where it prints. */
  blnShowLogo?: boolean;
  lstLines: PayslipHeaderLine[];
  lstFields: PayslipHeaderFieldDto[];
  lstStyles: PayslipHeaderStyle[];
  lstDefaultLines: PayslipHeaderLine[];
  objLimits: PayslipHeaderLimits;
  blnReadOnly: boolean;
  strError: string | null;
  onChange: (lstLines: PayslipHeaderLine[]) => void;
};

/** The payslip / F&F report header: lines of fields (company, allocation entity, location, custom
 * text) with a fallback and a style, and a live preview with sample values. */
export default function PayslipHeaderEditor({ blnShowLogo = false, lstLines, lstFields, lstStyles, lstDefaultLines, objLimits, blnReadOnly, strError, onChange }: Props) {
  const [blnPreviewNoEntity, setBlnPreviewNoEntity] = useState(false);
  const dicFieldByKey = useMemo(() => new Map(lstFields.map((objField) => [objField.strKey, objField])), [lstFields]);
  const lstPreview = useMemo(
    () => resolveHeaderLines(lstLines, lstFields, undefined, blnPreviewNoEntity ? entityFieldKeys(lstFields) : []),
    [lstLines, lstFields, blnPreviewNoEntity],
  );

  function updateLine(intIndex: number, objPatch: Partial<PayslipHeaderLine>) {
    onChange(lstLines.map((objLine, intLine) => (intLine === intIndex ? { ...objLine, ...objPatch } : objLine)));
  }

  function renderFieldPicker(intIndex: number, strKind: "lstFields" | "lstFallbackFields", strLabel: string) {
    const lstSelected = lstLines[intIndex][strKind]
      .map((strKey) => dicFieldByKey.get(strKey))
      .filter((objField): objField is PayslipHeaderFieldDto => Boolean(objField));
    return (
      <Autocomplete
        multiple
        size="small"
        disabled={blnReadOnly}
        options={lstFields}
        groupBy={(objField) => objField.strGroup}
        getOptionLabel={(objField) => objField.strLabel}
        isOptionEqualToValue={(objOption, objValue) => objOption.strKey === objValue.strKey}
        getOptionDisabled={(objOption) =>
          lstSelected.length >= objLimits.intMaxFieldsPerLine && !lstSelected.some((objField) => objField.strKey === objOption.strKey)
        }
        value={lstSelected}
        onChange={(_objEvent, lstNext) => updateLine(intIndex, { [strKind]: lstNext.map((objField) => objField.strKey) })}
        renderTags={(lstValue, getTagProps) =>
          lstValue.map((objField, intTag) => {
            const { key, ...objTagProps } = getTagProps({ index: intTag });
            return <Chip key={key} size="small" label={objField.strLabel} {...objTagProps} />;
          })
        }
        renderInput={(objParams) => <TextField {...objParams} className="app-mui-text-field" label={strLabel} />}
        data-controlid={`settings.payslip-header.line-${intIndex + 1}.${strKind === "lstFields" ? "fields" : "fallback"}`}
      />
    );
  }

  return (
    <Box>
      <Stack spacing={1.25}>
        {lstLines.map((objLine, intIndex) => (
          <Box
            key={intIndex}
            sx={{ border: "1px solid #dce8f6", borderRadius: "8px", p: 1.25, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "28px minmax(0, 2fr) minmax(0, 1.5fr) 130px auto" }, alignItems: "start" }}
            data-controlid={`settings.payslip-header.line-${intIndex + 1}`}
          >
            <Typography sx={{ fontWeight: 800, color: "#48638d", pt: 1 }}>{intIndex + 1}</Typography>
            {renderFieldPicker(intIndex, "lstFields", "Print")}
            {renderFieldPicker(intIndex, "lstFallbackFields", "If empty, print")}
            <TextField
              select
              size="small"
              className="app-mui-text-field"
              label="Style"
              value={objLine.strStyle}
              disabled={blnReadOnly}
              onChange={(objEvent) => updateLine(intIndex, { strStyle: objEvent.target.value as PayslipHeaderStyle })}
              inputProps={{ controlId: `settings.payslip-header.line-${intIndex + 1}.style` }}
            >
              {lstStyles.map((strStyle) => (
                <MenuItem key={strStyle} value={strStyle}>{DIC_STYLE_LABEL[strStyle]}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={0.25} sx={{ pt: 0.25 }}>
              <Tooltip title="Move up">
                <span>
                  <IconButton size="small" disabled={blnReadOnly || intIndex === 0} onClick={() => onChange(moveHeaderLine(lstLines, intIndex, -1))} aria-label="Move line up" controlId={`settings.payslip-header.line-${intIndex + 1}.up`}>
                    <ArrowUpwardRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton size="small" disabled={blnReadOnly || intIndex === lstLines.length - 1} onClick={() => onChange(moveHeaderLine(lstLines, intIndex, 1))} aria-label="Move line down" controlId={`settings.payslip-header.line-${intIndex + 1}.down`}>
                    <ArrowDownwardRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Remove line">
                <span>
                  <IconButton size="small" disabled={blnReadOnly || lstLines.length === 1} onClick={() => onChange(lstLines.filter((_objLine, intLine) => intLine !== intIndex))} aria-label="Remove line" controlId={`settings.payslip-header.line-${intIndex + 1}.remove`}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            {usesCustomText(objLine) ? (
              <TextField
                size="small"
                className="app-mui-text-field"
                label="Custom text"
                value={objLine.strCustomText}
                disabled={blnReadOnly}
                onChange={(objEvent) => updateLine(intIndex, { strCustomText: objEvent.target.value })}
                inputProps={{ maxLength: objLimits.intMaxCustomTextLength, controlId: `settings.payslip-header.line-${intIndex + 1}.custom-text` }}
                sx={{ gridColumn: { md: "2 / 4" } }}
              />
            ) : null}
          </Box>
        ))}
      </Stack>

      {!blnReadOnly ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
          <Button
            size="small"
            className="app-btn app-btn-outline"
            startIcon={<AddRoundedIcon />}
            disabled={lstLines.length >= objLimits.intMaxLines}
            onClick={() => onChange([...lstLines, createHeaderLine()])}
            controlId="settings.payslip-header.add-line.button"
          >
            Add line
          </Button>
          <Button
            size="small"
            className="app-btn app-btn-outline"
            startIcon={<RestartAltRoundedIcon />}
            onClick={() => onChange(cloneHeaderLines(lstDefaultLines))}
            controlId="settings.payslip-header.reset.button"
          >
            Company name &amp; address only
          </Button>
        </Stack>
      ) : null}
      {strError ? <Typography sx={{ color: "#c62828", fontSize: "0.8rem", mt: 1 }} data-testid="settings.payslip-header.error">{strError}</Typography> : null}

      <Box sx={{ mt: 2, border: "1px dashed #b7c8df", borderRadius: "8px", p: 2, backgroundColor: "#fbfdff" }} data-testid="settings.payslip-header.preview">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ color: "#48638d", fontSize: "0.75rem", fontWeight: 700 }}>Preview (sample values)</Typography>
          <FormControlLabel
            control={<Switch size="small" checked={blnPreviewNoEntity} onChange={(objEvent) => setBlnPreviewNoEntity(objEvent.target.checked)} />}
            label={<Typography sx={{ fontSize: "0.75rem" }}>Employee without allocation entity</Typography>}
          />
        </Stack>
        {blnShowLogo && !blnPreviewNoEntity ? (
          <Box sx={{ mx: "auto", mb: 1, width: 120, height: 40, borderRadius: "6px", backgroundColor: "#1d5d96", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>
            LOGO
          </Box>
        ) : null}
        {lstPreview.length ? (
          lstPreview.map((objLine, intIndex) => (
            <Typography
              key={intIndex}
              sx={{
                textAlign: "center",
                fontSize: objLine.strStyle === "heading" ? "1.15rem" : "0.85rem",
                fontWeight: objLine.strStyle === "normal" ? 400 : 700,
                mb: objLine.strStyle === "heading" ? 0.75 : 0.25,
              }}
            >
              {objLine.strText}
            </Typography>
          ))
        ) : (
          <Typography sx={{ textAlign: "center", color: "#60749b", fontSize: "0.8rem" }}>Nothing to print - the company name and address are used.</Typography>
        )}
        <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.9rem", mt: 1, color: "#60749b" }}>{"Document title (e.g. Pay Slip of Employee For <Month Year>)"}</Typography>
      </Box>
    </Box>
  );
}
