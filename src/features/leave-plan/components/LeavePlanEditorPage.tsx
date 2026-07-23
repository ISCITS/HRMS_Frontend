"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Checkbox, CircularProgress,
  Chip, FormControlLabel, IconButton, MenuItem, Paper, Snackbar, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import * as yup from "yup";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import { useLeavePlanEditor } from "@/features/leave-plan/hooks/useLeavePlanEditor";
import type { LeavePlanItem, LeavePlanSaveRequest, LeavePlanText } from "@/features/leave-plan/types/LeavePlanTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type PlanForm = {
  strPlanCode: string; strPlanName: string; strDescription: string; strCountryCode: string;
  dtEffectiveFrom: string; dtEffectiveTo: string; blnIsDefault: boolean; blnIsActive: boolean;
  intVersionNo: number; strRemarks: string; lstItems: LeavePlanItem[]; lstText: Array<Omit<LeavePlanText, "strDescription"> & { strDescription: string }>;
};
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

// Every field renders in a uniform fixed-width column (matches the Leave Type editor "Display Order" size).
const objGridSx = { display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 232px))", alignItems: "start" } as const;
const objFullCellSx = { gridColumn: "1 / -1" } as const;
// Shared section-card styling (matches the Salary Component editor's always-open cards).
const objSectionSx = { borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" } as const;

function buildPlanSchema(fnT: (strKey: string, strFallback?: string) => string) {
  const strRequired = fnT("validation_required", "This field is required.");
  const strNonNegative = fnT("validation_non_negative", "Value cannot be negative.");
  const strMaxLength = fnT("validation_max_length", "Value exceeds the allowed length.");
  const objItemSchema = yup.object({
    intLeaveTypeID: yup.number().integer().positive(strRequired).required(strRequired),
    intLeavePolicyID: yup.number().integer().positive().nullable().defined(),
    decAnnualEntitlement: yup.number().min(0, strNonNegative).required(strRequired),
    blnOpeningBalanceAllowed: yup.boolean().required(), decNegativeBalanceLimit: yup.number().min(0, strNonNegative).required(strRequired),
    intDisplayOrder: yup.number().integer().min(0, strNonNegative).required(strRequired), blnIsMandatory: yup.boolean().required(), blnIsActive: yup.boolean().required(),
  });
  return yup.object({
    strPlanCode: yup.string().trim().matches(/^[A-Za-z0-9_/-]+$/, fnT("validation_plan_code", "Use letters, numbers, slash, underscore, or hyphen only.")).max(50, strMaxLength).required(strRequired),
    strPlanName: yup.string().trim().max(150, strMaxLength).required(strRequired), strDescription: yup.string().trim().max(500, strMaxLength).defined(),
    strCountryCode: yup.string().trim().length(2, fnT("validation_country_code", "Country Code must contain two characters.")).required(strRequired), dtEffectiveFrom: yup.string().required(strRequired),
    dtEffectiveTo: yup.string().defined().test("date-order", fnT("validation_effective_dates", "Effective To cannot be before Effective From."), function (strValue) { return !strValue || !this.parent.dtEffectiveFrom || strValue >= this.parent.dtEffectiveFrom; }),
    blnIsDefault: yup.boolean().required(), blnIsActive: yup.boolean().required(), intVersionNo: yup.number().integer().min(1, fnT("validation_version", "Version must be at least 1.")).required(strRequired),
    strRemarks: yup.string().trim().max(500, strMaxLength).defined(),
    lstItems: yup.array().of(objItemSchema).min(1, fnT("validation_item_required", "At least one Leave Plan item is required.")).test("unique-types", fnT("validation_duplicate_leave_type", "A Leave Type can occur only once."), (lstItems) => new Set((lstItems ?? []).map((objItem) => objItem?.intLeaveTypeID)).size === (lstItems ?? []).length).required(),
    lstText: yup.array().of(yup.object({ intLanguageID: yup.number().integer().positive(strRequired).required(strRequired), strPlanName: yup.string().trim().max(150, strMaxLength).required(strRequired), strDescription: yup.string().trim().max(500, strMaxLength).defined() })).required(),
  });
}

function emptyItem(intDisplayOrder: number): LeavePlanItem {
  return { intLeaveTypeID: 0, intLeavePolicyID: null, decAnnualEntitlement: 0, blnOpeningBalanceAllowed: true, decNegativeBalanceLimit: 0, intDisplayOrder, blnIsMandatory: true, blnIsActive: true };
}

function emptyForm(): PlanForm {
  return { strPlanCode: "", strPlanName: "", strDescription: "", strCountryCode: "IN", dtEffectiveFrom: new Date().toISOString().slice(0, 10), dtEffectiveTo: "", blnIsDefault: false, blnIsActive: true, intVersionNo: 1, strRemarks: "", lstItems: [emptyItem(10)], lstText: [] };
}

function automationInputProps(strControlID: string): InputHTMLAttributes<HTMLInputElement> {
  return { "data-control-id": strControlID } as InputHTMLAttributes<HTMLInputElement>;
}

export default function LeavePlanEditorPage({ strMode, intPlanID, strReturnTo }: { strMode: "new" | "edit" | "view"; intPlanID?: number; strReturnTo?: string }) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const { objPlan, lstLeaveTypes, objLanguages, dicPolicies, blnLoading, blnSaving, strError, loadPolicies, savePlan } = useLeavePlanEditor(intPlanID);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "error" });
  const objSchema = useMemo(() => buildPlanSchema(t), [t]);
  const objForm = useForm<PlanForm>({ resolver: yupResolver(objSchema) as Resolver<PlanForm>, defaultValues: emptyForm(), mode: "onBlur" });
  const { control, handleSubmit, reset, setError, formState: { errors } } = objForm;
  const objItems = useFieldArray({ control, name: "lstItems" });
  const objTexts = useFieldArray({ control, name: "lstText" });
  const strEffectiveFrom = useWatch({ control, name: "dtEffectiveFrom" });
  const lstWatchedItems = useWatch({ control, name: "lstItems" });
  const lstWatchedTexts = useWatch({ control, name: "lstText" });
  const blnCanManage = canDo("LEAVE_PLANS", "LEAVE_MANAGE") || canDo("LEAVE_MANAGEMENT", "LEAVE_MANAGE") || canDo("LEAVE", "LEAVE_MANAGE");
  const blnReadOnly = strMode === "view" || !blnCanManage;
  const strBackPath = strReturnTo?.startsWith("/leave/plans") ? strReturnTo : "/leave/plans";

  useEffect(() => {
    if (blnLoading || !objLanguages.intDefaultLanguageID) return;
    if (objPlan) {
      reset({
        strPlanCode: objPlan.strPlanCode, strPlanName: objPlan.strPlanName, strDescription: objPlan.strDescription ?? "",
        strCountryCode: objPlan.strCountryCode, dtEffectiveFrom: objPlan.dtEffectiveFrom, dtEffectiveTo: objPlan.dtEffectiveTo ?? "",
        blnIsDefault: objPlan.blnIsDefault, blnIsActive: objPlan.blnIsActive, intVersionNo: objPlan.intVersionNo,
        strRemarks: objPlan.strRemarks ?? "", lstItems: objPlan.lstItems ?? [emptyItem(10)],
        lstText: (objPlan.lstText ?? []).map((objText) => ({ ...objText, strDescription: objText.strDescription ?? "" })),
      });
    } else {
      reset({ ...emptyForm(), lstText: [{ intLanguageID: objLanguages.intDefaultLanguageID, strPlanName: "", strDescription: "" }] });
    }
  }, [blnLoading, objLanguages.intDefaultLanguageID, objPlan, reset]);

  function addTranslation() {
    const setUsedLanguages = new Set((lstWatchedTexts ?? []).map((objText) => Number(objText.intLanguageID)));
    const objLanguage = objLanguages.lstLanguages.find((objOption) => !setUsedLanguages.has(objOption.intID));
    if (objLanguage) objTexts.append({ intLanguageID: objLanguage.intID, strPlanName: "", strDescription: "" });
  }

  async function submitForm(objValues: PlanForm) {
    const objDefaultText = objValues.lstText.find((objText) => objText.intLanguageID === objLanguages.intDefaultLanguageID);
    if (!objDefaultText?.strPlanName.trim()) {
      setError("lstText", { message: t("validation_default_translation", "The default-language Plan Name is required.") });
      return;
    }
    const objPayload: LeavePlanSaveRequest = {
      strPlanCode: objValues.strPlanCode.trim().toUpperCase(), strPlanName: objValues.strPlanName.trim(), strDescription: objValues.strDescription.trim() || null,
      strCountryCode: objValues.strCountryCode.trim().toUpperCase(), dtEffectiveFrom: objValues.dtEffectiveFrom, dtEffectiveTo: objValues.dtEffectiveTo || null,
      blnIsDefault: objValues.blnIsDefault, blnIsActive: objValues.blnIsActive, intVersionNo: objValues.intVersionNo, strRemarks: objValues.strRemarks.trim() || null,
      lstItems: objValues.lstItems.map((objItem) => ({ ...objItem, intLeavePolicyID: objItem.intLeavePolicyID || null })),
      lstText: objValues.lstText.map((objText) => ({ ...objText, strPlanName: objText.strPlanName.trim(), strDescription: objText.strDescription.trim() || null })),
    };
    try {
      await savePlan(objPayload);
      objRouter.push(strBackPath);
    } catch (objError) {
      const strMessage = (await createApiRequestError(objError)).message;
      setObjToast({ blnOpen: true, strMessage, strSeverity: "error" });
    }
  }

  function fieldError(strPath: keyof PlanForm): string | undefined { return errors[strPath]?.message as string | undefined; }

  if (blnLoading || blnRightsLoading) return <Box sx={{ py: 10, textAlign: "center" }}><CircularProgress /><Typography sx={{ mt: 1 }}>{t("editor_loading", "Loading Leave Plan...")}</Typography></Box>;

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5, pb: 4 }} component="form" onSubmit={handleSubmit(submitForm)}>
      {/* Header (matches the Salary Component editor chrome) */}
      <Paper
        sx={{
          borderRadius: "28px",
          px: { xs: 2, md: 3 },
          py: { xs: 1.5, md: 2 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5}>
          <Typography sx={{ color: "#64748b" }}>{t("editor_subtitle", "Maintain plan rules, entitlements, and translations.")}</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => objRouter.push(strBackPath)}
              sx={{ borderRadius: "14px", height: 38, minHeight: 38, py: 0, px: 2.25, minWidth: 100, fontSize: "0.9rem", whiteSpace: "nowrap", flexShrink: 0, "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } } }}
              data-control-id="leave-plan.editor.back.button"
            >
              {t("back_button", "Back")}
            </Button>
            {!blnReadOnly ? (
              <Button
                type="submit"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                disabled={blnSaving}
                sx={{ borderRadius: "14px", height: 38, minHeight: 38, py: 0, px: 2.25, minWidth: 168, fontSize: "0.9rem", whiteSpace: "nowrap", flexShrink: 0, "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } } }}
                data-control-id="leave-plan.editor.save.button"
              >
                {blnSaving ? t("saving", "Saving...") : t("save_plan", "Save Leave Plan")}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <fieldset disabled={blnReadOnly || blnSaving} style={{ border: 0, padding: 0, margin: "20px 0 0 0", minWidth: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* A. Basic Information */}
        <Paper sx={objSectionSx}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{t("section_basic_information", "Basic Information")}</Typography>
          <Box>
            <Box sx={objGridSx}>
              <Controller name="strPlanCode" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth label={t("field_plan_code", "Plan Code")} disabled={strMode !== "new"} error={Boolean(errors.strPlanCode)} helperText={errors.strPlanCode?.message} inputProps={{ "data-control-id": "leave-plan.editor.plan-code.input", maxLength: 50 }} />} />
              <Controller name="strPlanName" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth label={t("field_plan_name", "Plan Name")} error={Boolean(errors.strPlanName)} helperText={errors.strPlanName?.message} inputProps={{ "data-control-id": "leave-plan.editor.plan-name.input", maxLength: 150 }} />} />
              <Controller name="strCountryCode" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth label={t("field_country", "Country Code")} error={Boolean(errors.strCountryCode)} helperText={errors.strCountryCode?.message} inputProps={{ "data-control-id": "leave-plan.editor.country.input", maxLength: 2 }} />} />
              <Controller name="intVersionNo" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth type="number" label={t("field_version", "Version")} error={Boolean(errors.intVersionNo)} helperText={errors.intVersionNo?.message} inputProps={{ "data-control-id": "leave-plan.editor.version.input", min: 1 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} />} />
              <Controller name="dtEffectiveFrom" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth type="date" label={t("field_effective_from", "Effective From")} InputLabelProps={{ shrink: true }} error={Boolean(errors.dtEffectiveFrom)} helperText={errors.dtEffectiveFrom?.message} inputProps={{ "data-control-id": "leave-plan.editor.effective-from.input" }} />} />
              <Controller name="dtEffectiveTo" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth type="date" label={t("field_effective_to", "Effective To")} InputLabelProps={{ shrink: true }} error={Boolean(errors.dtEffectiveTo)} helperText={errors.dtEffectiveTo?.message} inputProps={{ "data-control-id": "leave-plan.editor.effective-to.input" }} />} />
              <Box sx={{ gridColumn: "span 2" }}>
                <Controller name="strDescription" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth multiline minRows={1} label={t("field_description", "Description")} error={Boolean(errors.strDescription)} helperText={errors.strDescription?.message} inputProps={{ "data-control-id": "leave-plan.editor.description.input", maxLength: 500 }} />} />
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Controller name="strRemarks" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth multiline minRows={1} label={t("field_remarks", "Remarks")} error={Boolean(errors.strRemarks)} helperText={errors.strRemarks?.message} inputProps={{ "data-control-id": "leave-plan.editor.remarks.input", maxLength: 500 }} />} />
              </Box>
              <Box sx={objFullCellSx}>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  <Controller name="blnIsDefault" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps("leave-plan.editor.default.checkbox")} />} label={t("field_default", "Default Plan")} />} />
                  <Controller name="blnIsActive" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps("leave-plan.editor.active.checkbox")} />} label={t("field_is_active", "Is Active")} />} />
                </Stack>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* B. Leave Plan Items */}
        <Paper sx={objSectionSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("section_plan_items", "Leave Plan Items")}</Typography>
            {!blnReadOnly ? <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => objItems.append(emptyItem((objItems.fields.length + 1) * 10))} data-control-id="leave-plan.editor.item.add.button">{t("add_item", "Add Item")}</Button> : null}
          </Stack>
          {errors.lstItems?.message ? <Typography color="error" variant="caption" sx={{ display: "block", mb: 1 }}>{errors.lstItems.message}</Typography> : null}
          <Box>
            <TableContainer><Table size="small" sx={{ minWidth: 1250 }}><TableHead><TableRow>{["leave_type", "leave_policy", "annual_entitlement", "opening_balance_allowed", "negative_balance_limit", "display_order", "mandatory", "active", "actions"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800, textTransform: "capitalize" }}>{t(`item_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>
              {objItems.fields.map((objField, intIndex) => {
                const intTypeID = Number(lstWatchedItems?.[intIndex]?.intLeaveTypeID ?? 0);
                const lstPolicies = dicPolicies[intTypeID] ?? [];
                return <TableRow key={objField.id}>
                  <TableCell><Controller name={`lstItems.${intIndex}.intLeaveTypeID`} control={control} render={({ field }) => <TextField select size="small" value={field.value || ""} onChange={async (objEvent) => { const intValue = Number(objEvent.target.value); field.onChange(intValue); objForm.setValue(`lstItems.${intIndex}.intLeavePolicyID`, null); await loadPolicies(intValue, strEffectiveFrom); }} error={Boolean(errors.lstItems?.[intIndex]?.intLeaveTypeID)} inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.leave-type.select` }} sx={{ minWidth: 180 }}><MenuItem value="" data-control-id={`leave-plan.editor.item.${intIndex}.leave-type.empty.option`}>{t("select_leave_type", "Select Leave Type")}</MenuItem>{lstLeaveTypes.map((objType) => <MenuItem key={objType.intID} value={objType.intID} data-control-id={`leave-plan.editor.item.${intIndex}.leave-type.${objType.intID}.option`}>{objType.strTypeCode} - {objType.strTypeName}</MenuItem>)}</TextField>} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.intLeavePolicyID`} control={control} render={({ field }) => <TextField select size="small" value={field.value ?? ""} onChange={(objEvent) => field.onChange(objEvent.target.value ? Number(objEvent.target.value) : null)} inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.policy.select` }} sx={{ minWidth: 180 }}><MenuItem value="" data-control-id={`leave-plan.editor.item.${intIndex}.policy.empty.option`}>{t("policy_not_selected", "No Policy")}</MenuItem>{lstPolicies.map((objPolicy) => <MenuItem key={objPolicy.intID} value={objPolicy.intID} data-control-id={`leave-plan.editor.item.${intIndex}.policy.${objPolicy.intID}.option`}>{objPolicy.strPolicyCode || objPolicy.strPolicyName || `#${objPolicy.intID}`}</MenuItem>)}</TextField>} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.decAnnualEntitlement`} control={control} render={({ field }) => <TextField {...field} type="number" size="small" inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.annual-entitlement.input`, min: 0, step: .5 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} sx={{ width: 120 }} />} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.blnOpeningBalanceAllowed`} control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps(`leave-plan.editor.item.${intIndex}.opening-allowed.checkbox`)} />} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.decNegativeBalanceLimit`} control={control} render={({ field }) => <TextField {...field} type="number" size="small" inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.negative-limit.input`, min: 0, step: .5 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} sx={{ width: 120 }} />} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.intDisplayOrder`} control={control} render={({ field }) => <TextField {...field} type="number" size="small" inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.display-order.input`, min: 0, step: 1 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} sx={{ width: 110 }} />} /></TableCell>
                  {(["blnIsMandatory", "blnIsActive"] as const).map((strField) => <TableCell key={strField}><Controller name={`lstItems.${intIndex}.${strField}`} control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps(`leave-plan.editor.item.${intIndex}.${strField}.checkbox`)} />} /></TableCell>)}
                  <TableCell>{!blnReadOnly ? <IconButton onClick={() => objItems.remove(intIndex)} disabled={objItems.fields.length === 1} data-control-id={`leave-plan.editor.item.${intIndex}.delete.button`}><DeleteOutlineRoundedIcon /></IconButton> : null}</TableCell>
                </TableRow>;
              })}
            </TableBody></Table></TableContainer>
          </Box>
        </Paper>

        {/* C. Translations */}
        <Paper sx={objSectionSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("section_translation", "Translation")}</Typography>
            {!blnReadOnly ? <Button size="small" startIcon={<AddRoundedIcon />} onClick={addTranslation} disabled={objTexts.fields.length >= objLanguages.lstLanguages.length} data-control-id="leave-plan.editor.translation.add.button">{t("add_language", "Add Language")}</Button> : null}
          </Stack>
          {fieldError("lstText") ? <Typography color="error" variant="caption" sx={{ display: "block", mb: 1 }}>{fieldError("lstText")}</Typography> : null}
          <Box>
            <Box sx={{ display: "grid", gap: 1.5 }}>{objTexts.fields.map((objField, intIndex) => <Box key={objField.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr 2fr auto" }, gap: 1 }}>
              <Controller name={`lstText.${intIndex}.intLanguageID`} control={control} render={({ field }) => <TextField {...field} select size="small" label={t("language", "Language")} inputProps={{ "data-control-id": `leave-plan.editor.translation.${intIndex}.language.select` }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))}>{objLanguages.lstLanguages.map((objLanguage) => <MenuItem key={objLanguage.intID} value={objLanguage.intID} data-control-id={`leave-plan.editor.translation.${intIndex}.language.${objLanguage.intID}.option`}>{objLanguage.strLabel}</MenuItem>)}</TextField>} />
              <Controller name={`lstText.${intIndex}.strPlanName`} control={control} render={({ field }) => <TextField {...field} size="small" label={t("translation_plan_name", "Translated Plan Name")} inputProps={{ "data-control-id": `leave-plan.editor.translation.${intIndex}.name.input`, maxLength: 150 }} />} />
              <Controller name={`lstText.${intIndex}.strDescription`} control={control} render={({ field }) => <TextField {...field} size="small" label={t("translation_description", "Translated Description")} inputProps={{ "data-control-id": `leave-plan.editor.translation.${intIndex}.description.input`, maxLength: 500 }} />} />
              {!blnReadOnly ? <IconButton onClick={() => objTexts.remove(intIndex)} disabled={Number(objForm.getValues(`lstText.${intIndex}.intLanguageID`)) === objLanguages.intDefaultLanguageID} data-control-id={`leave-plan.editor.translation.${intIndex}.delete.button`}><DeleteOutlineRoundedIcon /></IconButton> : null}
            </Box>)}</Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.78rem", mt: 1 }}>{t("translation_hint", "The default-language name is mandatory. Duplicate languages are not allowed.")}</Typography>
          </Box>
        </Paper>

        {/* D. Usage */}
        {objPlan ? (
          <Paper sx={objSectionSx}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{t("section_usage_information", "Usage Information")}</Typography>
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${t("usage_assigned_employees", "Assigned Employees")}: ${objPlan?.objUsage?.intAssignedEmployeeCount ?? objPlan?.intAssignedEmployeeCount ?? 0}`} />
                <Chip label={`${t("usage_assignment_history", "Assignment Records")}: ${objPlan?.objUsage?.intAssignments ?? 0}`} />
                <Chip color={objPlan?.objUsage?.blnInUse ? "warning" : "success"} label={objPlan?.objUsage?.blnInUse ? t("usage_in_use_yes", "In use — deactivate instead of delete") : t("usage_in_use_no", "Not in use")} />
              </Stack>
            </Box>
          </Paper>
        ) : null}

        {!blnReadOnly ? (
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
            <Button onClick={() => objRouter.push(strBackPath)} data-control-id="leave-plan.editor.cancel.button">{t("cancel", "Cancel")}</Button>
            <Button type="submit" variant="contained" startIcon={<SaveRoundedIcon />} disabled={blnSaving} data-control-id="leave-plan.editor.save.bottom.button">{blnSaving ? t("saving", "Saving...") : t("save_plan", "Save Leave Plan")}</Button>
          </Stack>
        ) : null}
      </fieldset>

      <Snackbar open={objToast.blnOpen} autoHideDuration={6000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
