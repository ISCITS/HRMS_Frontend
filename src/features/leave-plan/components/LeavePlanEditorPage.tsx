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
import type { LeavePlanItem, LeavePlanSaveRequest, LeavePlanText, LeavePolicyOption } from "@/features/leave-plan/types/LeavePlanTypes";
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
  const strOverrideReasonRequired = fnT("validation_override_reason", "Enter a reason for the entitlement override.");
  const objItemSchema = yup.object({
    intLeaveTypeID: yup.number().integer().positive(strRequired).required(strRequired),
    // Policy is resolved server-side from Leave Type + plan effective date; the UI does not select it.
    intLeavePolicyID: yup.number().integer().positive().nullable().defined(),
    decAnnualEntitlement: yup.number().min(0, strNonNegative).required(strRequired),
    // Entitlement inheritance/override: a reason is mandatory only when the override is enabled.
    blnIsEntitlementOverride: yup.boolean().required(),
    decBaseEntitlementSnapshot: yup.number().nullable().notRequired(),
    strOverrideReason: yup.string().nullable().when("blnIsEntitlementOverride", {
      is: true,
      then: (objSchema) => objSchema.trim().min(1, strOverrideReasonRequired).max(500, strMaxLength).required(strOverrideReasonRequired),
      otherwise: (objSchema) => objSchema.max(500, strMaxLength).nullable().notRequired(),
    }),
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
  return { intLeaveTypeID: 0, intLeavePolicyID: null, decAnnualEntitlement: 0, blnIsEntitlementOverride: false, decBaseEntitlementSnapshot: null, strOverrideReason: null, blnOpeningBalanceAllowed: true, decNegativeBalanceLimit: 0, intDisplayOrder, blnIsMandatory: true, blnIsActive: true };
}

// Mirror the backend policy resolver (LeavePlanService._resolveEffectivePolicy) for the read-only
// inherited-entitlement preview: prefer a policy already covering the plan date (latest such start),
// else the earliest not-yet-expired policy. Returns the inherited entitlement (0 when none resolves).
function resolveInheritedEntitlement(lstPolicies: LeavePolicyOption[], strEffectiveFrom: string): number {
  if (!lstPolicies.length) return 0;
  const fnFrom = (objPolicy: LeavePolicyOption) => objPolicy.dtEffectiveFrom ?? "";
  const lstCovering = lstPolicies.filter((objPolicy) => fnFrom(objPolicy) <= strEffectiveFrom);
  const objChosen = lstCovering.length
    ? lstCovering.reduce((objA, objB) => (fnFrom(objA) >= fnFrom(objB) ? objA : objB))
    : lstPolicies.reduce((objA, objB) => (fnFrom(objA) <= fnFrom(objB) ? objA : objB));
  return Number(objChosen.decEntitlementQty ?? 0);
}

function emptyForm(): PlanForm {
  return { strPlanCode: "", strPlanName: "", strDescription: "", strCountryCode: "IN", dtEffectiveFrom: new Date().toISOString().slice(0, 10), dtEffectiveTo: "", blnIsDefault: false, blnIsActive: true, intVersionNo: 1, strRemarks: "", lstItems: [emptyItem(10)], lstText: [] };
}

function automationInputProps(strControlID: string): InputHTMLAttributes<HTMLInputElement> {
  return { "data-control-id": strControlID } as InputHTMLAttributes<HTMLInputElement>;
}

// Walk the react-hook-form error tree (incl. nested items/text arrays) and return the first
// human-readable message, so a validation failure surfaces instead of the Save button "doing nothing".
function collectFirstErrorMessage(objErrors: unknown): string | undefined {
  if (!objErrors || typeof objErrors !== "object") return undefined;
  const objRecord = objErrors as Record<string, unknown>;
  if (typeof objRecord.message === "string" && objRecord.message.trim()) return objRecord.message;
  for (const objValue of Object.values(objRecord)) {
    const strFound = collectFirstErrorMessage(objValue);
    if (strFound) return strFound;
  }
  return undefined;
}

// The URL carries the plan's public identifier (record_uuid), not the internal row id.
export default function LeavePlanEditorPage({ strMode, strPlanID, strReturnTo }: { strMode: "new" | "edit"; strPlanID?: string; strReturnTo?: string }) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const { objPlan, lstLeaveTypes, objLanguages, dicPolicies, blnLoading, blnSaving, strError, loadPolicies, savePlan } = useLeavePlanEditor(strPlanID);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "error" });
  const objSchema = useMemo(() => buildPlanSchema(t), [t]);
  const objForm = useForm<PlanForm>({ resolver: yupResolver(objSchema) as Resolver<PlanForm>, defaultValues: emptyForm(), mode: "onBlur" });
  const { control, handleSubmit, reset, setError, formState: { errors } } = objForm;
  const objItems = useFieldArray({ control, name: "lstItems" });
  const objTexts = useFieldArray({ control, name: "lstText" });
  const strEffectiveFrom = useWatch({ control, name: "dtEffectiveFrom" });
  // Whether each Leave Type permits a negative balance — gates the plan's Negative Balance Limit column.
  const dicTypeAllowNeg = useMemo(() => Object.fromEntries(lstLeaveTypes.map((objType) => [objType.intID, Boolean(objType.blnAllowNegativeBalance)])), [lstLeaveTypes]);
  const lstWatchedItems = useWatch({ control, name: "lstItems" });
  const lstWatchedTexts = useWatch({ control, name: "lstText" });
  const blnCanManage = canDo("LEAVE_PLANS", "EDIT") || canDo("LEAVE_PLANS", "ADD") || canDo("LEAVE_PLANS", "LEAVE_MANAGE");
  // Opens read-only; Edit appears only when the server grants it, so no mode is in the URL.
  const [blnEditRequested, setBlnEditRequested] = useState(strMode === "new");
  const blnReadOnly = !blnEditRequested || !blnCanManage;
  const strBackPath = strReturnTo?.startsWith("/leave/plans") ? strReturnTo : "/leave/plans";

  useEffect(() => {
    if (blnLoading || !objLanguages.intDefaultLanguageID) return;
    if (objPlan) {
      // A plan can exist with no translation rows; the save requires a default-language name,
      // so seed one from the plan name when it is missing (otherwise Save silently does nothing).
      const lstLoadedText = (objPlan.lstText ?? []).map((objText) => ({ ...objText, strDescription: objText.strDescription ?? "" }));
      const blnHasDefaultText = lstLoadedText.some((objText) => Number(objText.intLanguageID) === objLanguages.intDefaultLanguageID);
      const lstText = blnHasDefaultText ? lstLoadedText : [
        { intLanguageID: objLanguages.intDefaultLanguageID, strPlanName: objPlan.strPlanName, strDescription: objPlan.strDescription ?? "" },
        ...lstLoadedText,
      ];
      reset({
        strPlanCode: objPlan.strPlanCode, strPlanName: objPlan.strPlanName, strDescription: objPlan.strDescription ?? "",
        strCountryCode: objPlan.strCountryCode, dtEffectiveFrom: objPlan.dtEffectiveFrom, dtEffectiveTo: objPlan.dtEffectiveTo ?? "",
        blnIsDefault: objPlan.blnIsDefault, blnIsActive: objPlan.blnIsActive, intVersionNo: objPlan.intVersionNo,
        strRemarks: objPlan.strRemarks ?? "", lstItems: objPlan.lstItems ?? [emptyItem(10)],
        lstText,
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
      // Strip the DB-row intID and the server-computed base snapshot from items — the backend item
      // schema forbids extra inputs (policy is resolved server-side, snapshot captured on save).
      lstItems: objValues.lstItems.map(({ intID: _intItemID, decBaseEntitlementSnapshot: _decBaseSnapshot, ...objItem }) => ({ ...objItem, intLeavePolicyID: objItem.intLeavePolicyID || null })),
      lstText: objValues.lstText.map(({ intID: _intTextID, ...objText }) => ({ ...objText, strPlanName: objText.strPlanName.trim(), strDescription: objText.strDescription.trim() || null })),
    };
    try {
      await savePlan(objPayload);
      objRouter.push(strBackPath);
    } catch (objError) {
      const strMessage = (await createApiRequestError(objError)).message;
      setObjToast({ blnOpen: true, strMessage, strSeverity: "error" });
    }
  }

  function onInvalidForm(objErrors: unknown) {
    const strMessage = collectFirstErrorMessage(objErrors) ?? t("validation_fix_fields", "Please fix the highlighted fields before saving.");
    setObjToast({ blnOpen: true, strMessage, strSeverity: "error" });
  }

  function fieldError(strPath: keyof PlanForm): string | undefined { return errors[strPath]?.message as string | undefined; }

  // Keep each non-override item's Annual Entitlement inherited from its Leave Type's effective policy.
  // Runs on edit-load once the preloaded policies arrive (and when the plan effective date changes), so
  // an existing item shows the Leave Type entitlement instead of a stale stored value. Override items are
  // left untouched (the user owns that value).
  useEffect(() => {
    const lstCurrentItems = objForm.getValues("lstItems") ?? [];
    lstCurrentItems.forEach((objItem, intIndex) => {
      if (objItem.blnIsEntitlementOverride) return;
      const intTypeID = Number(objItem.intLeaveTypeID || 0);
      const lstPolicies = dicPolicies[intTypeID];
      if (!intTypeID || !lstPolicies?.length) return;
      const decInherited = resolveInheritedEntitlement(lstPolicies, strEffectiveFrom || new Date().toISOString().slice(0, 10));
      if (Number(objItem.decBaseEntitlementSnapshot ?? -1) !== decInherited || Number(objItem.decAnnualEntitlement ?? -1) !== decInherited) {
        objForm.setValue(`lstItems.${intIndex}.decBaseEntitlementSnapshot`, decInherited);
        objForm.setValue(`lstItems.${intIndex}.decAnnualEntitlement`, decInherited, { shouldValidate: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dicPolicies, strEffectiveFrom]);

  if (blnLoading || blnRightsLoading) return <Box sx={{ py: 10, textAlign: "center" }}><CircularProgress /><Typography sx={{ mt: 1 }}>{t("editor_loading", "Loading Leave Plan...")}</Typography></Box>;

  return (
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5, pb: 4 }} component="form" onSubmit={handleSubmit(submitForm, onInvalidForm)}>
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
          {/* The page title lives here rather than in the app-shell header (see blnLeavePlanEditorRoute). */}
          <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: "1.1rem", md: "1.28rem" }, color: "#0f172a" }}>
            {strMode === "new"
              ? t("editor_title_new", "New Leave Plan")
              : blnReadOnly
                ? t("editor_title_view", "View Leave Plan")
                : t("editor_title_edit", "Edit Leave Plan")}
          </Typography>
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

      {/* The 12px top margin is set here rather than left to the Stack: an inline margin outranks the
          Stack's spacing class, so relying on it would leave this one seam flush. */}
      <fieldset disabled={blnReadOnly || blnSaving} style={{ border: 0, padding: 0, margin: "12px 0 0 0", minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* A. Basic Information */}
        <Paper sx={objSectionSx}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{t("section_basic_information", "Basic Information")}</Typography>
          <Box>
            <Box sx={objGridSx}>
              <Controller name="strPlanCode" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth label={t("field_plan_code", "Plan Code")} disabled={strMode !== "new"} error={Boolean(errors.strPlanCode)} helperText={errors.strPlanCode?.message} inputProps={{ "data-control-id": "leave-plan.editor.plan-code.input", maxLength: 50 }} />} />
              <Controller name="strPlanName" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth label={t("field_plan_name", "Plan Name")} error={Boolean(errors.strPlanName)} helperText={errors.strPlanName?.message} inputProps={{ "data-control-id": "leave-plan.editor.plan-name.input", maxLength: 150 }} />} />
              {/* POC: Country Code hidden (derived from company; value preserved) and Version hidden in
                  Add/Edit (system-controlled; shown in Usage below). Both remain in the submitted payload. */}
              <Controller name="dtEffectiveFrom" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth type="date" label={t("field_effective_from", "Effective From")} InputLabelProps={{ shrink: true }} error={Boolean(errors.dtEffectiveFrom)} helperText={errors.dtEffectiveFrom?.message} inputProps={{ "data-control-id": "leave-plan.editor.effective-from.input" }} />} />
              <Controller name="dtEffectiveTo" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth type="date" label={t("field_effective_to", "Effective To")} InputLabelProps={{ shrink: true }} error={Boolean(errors.dtEffectiveTo)} helperText={errors.dtEffectiveTo?.message} inputProps={{ "data-control-id": "leave-plan.editor.effective-to.input" }} />} />
              {/* Description occupies a single grid cell (was span 2) so it sits on the same row as
                  the other Basic Information fields. */}
              <Controller name="strDescription" control={control} render={({ field }) => <TextField {...field} size="small" fullWidth multiline minRows={1} label={t("field_description", "Description")} error={Boolean(errors.strDescription)} helperText={errors.strDescription?.message} inputProps={{ "data-control-id": "leave-plan.editor.description.input", maxLength: 500 }} />} />
              {/* POC: Remarks removed from the main form; existing value is preserved in the payload. */}
              <Box sx={objFullCellSx}>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  <Controller name="blnIsDefault" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps("leave-plan.editor.default.checkbox")} />} label={t("field_default", "Default Plan for New Employees")} />} />
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
            <TableContainer><Table size="small" sx={{ minWidth: 1200, "& tbody td": { verticalAlign: "top", pt: 1.5 } }}><TableHead><TableRow>{["leave_type", "annual_entitlement", "override", "override_reason", "opening_balance_allowed", "negative_balance_limit", "display_order", "active", "actions"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800, textTransform: "capitalize" }}>{t(`item_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>
              {objItems.fields.map((objField, intIndex) => {
                const intTypeID = Number(lstWatchedItems?.[intIndex]?.intLeaveTypeID ?? 0);
                const blnOverride = Boolean(lstWatchedItems?.[intIndex]?.blnIsEntitlementOverride);
                const blnAllowNeg = Boolean(dicTypeAllowNeg[intTypeID]);
                return <TableRow key={objField.id}>
                  {/* Leave Type: equal fixed width; selecting one resolves the inherited entitlement and clamps
                      the negative limit. Policy is resolved on the server (not shown). */}
                  <TableCell><Controller name={`lstItems.${intIndex}.intLeaveTypeID`} control={control} render={({ field }) => <TextField select size="small" value={field.value || ""} onChange={async (objEvent) => { const intValue = Number(objEvent.target.value); field.onChange(intValue); objForm.setValue(`lstItems.${intIndex}.intLeavePolicyID`, null); objForm.setValue(`lstItems.${intIndex}.blnIsEntitlementOverride`, false); objForm.setValue(`lstItems.${intIndex}.strOverrideReason`, null); const lstLoaded = await loadPolicies(intValue, strEffectiveFrom); const decInherited = resolveInheritedEntitlement(lstLoaded, strEffectiveFrom || new Date().toISOString().slice(0, 10)); objForm.setValue(`lstItems.${intIndex}.decBaseEntitlementSnapshot`, decInherited); objForm.setValue(`lstItems.${intIndex}.decAnnualEntitlement`, decInherited, { shouldValidate: true }); if (!dicTypeAllowNeg[intValue]) objForm.setValue(`lstItems.${intIndex}.decNegativeBalanceLimit`, 0); }} error={Boolean(errors.lstItems?.[intIndex]?.intLeaveTypeID)} inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.leave-type.select` }} sx={{ width: 200 }}><MenuItem value="" data-control-id={`leave-plan.editor.item.${intIndex}.leave-type.empty.option`}>{t("select_leave_type", "Select Leave Type")}</MenuItem>{lstLeaveTypes.map((objType) => <MenuItem key={objType.intID} value={objType.intID} data-control-id={`leave-plan.editor.item.${intIndex}.leave-type.${objType.intID}.option`}>{objType.strTypeCode} - {objType.strTypeName}</MenuItem>)}</TextField>} /></TableCell>
                  {/* Annual Entitlement: read-only (inherited) unless override is enabled. */}
                  <TableCell><Controller name={`lstItems.${intIndex}.decAnnualEntitlement`} control={control} render={({ field }) => <TextField {...field} type="number" size="small" disabled={!blnOverride} inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.annual-entitlement.input`, min: 0, step: .5 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} sx={{ width: 110 }} helperText={blnOverride ? t("entitlement_overridden", "Overridden") : undefined} />} /></TableCell>
                  {/* Override toggle: turning it off restores the inherited value and clears the reason. */}
                  <TableCell><Controller name={`lstItems.${intIndex}.blnIsEntitlementOverride`} control={control} render={({ field }) => <Checkbox checked={Boolean(field.value)} onChange={(_, blnValue) => { field.onChange(blnValue); if (!blnValue) { const decBase = Number(lstWatchedItems?.[intIndex]?.decBaseEntitlementSnapshot ?? 0); objForm.setValue(`lstItems.${intIndex}.decAnnualEntitlement`, decBase, { shouldValidate: true }); objForm.setValue(`lstItems.${intIndex}.strOverrideReason`, null, { shouldValidate: true }); } }} inputProps={automationInputProps(`leave-plan.editor.item.${intIndex}.override.checkbox`)} />} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.strOverrideReason`} control={control} render={({ field }) => <TextField size="small" value={field.value ?? ""} disabled={!blnOverride} onChange={(objEvent) => field.onChange(objEvent.target.value || null)} error={Boolean(errors.lstItems?.[intIndex]?.strOverrideReason)} helperText={errors.lstItems?.[intIndex]?.strOverrideReason?.message} placeholder={t("override_reason_placeholder", "Reason for override")} inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.override-reason.input`, maxLength: 500 }} sx={{ minWidth: 180 }} />} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.blnOpeningBalanceAllowed`} control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps(`leave-plan.editor.item.${intIndex}.opening-allowed.checkbox`)} />} /></TableCell>
                  {/* Negative Balance Limit only where the Leave Type permits it; otherwise "Not Allowed" (persists 0). */}
                  <TableCell>{blnAllowNeg ? <Controller name={`lstItems.${intIndex}.decNegativeBalanceLimit`} control={control} render={({ field }) => <TextField {...field} type="number" size="small" inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.negative-limit.input`, min: 0, step: .5 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} sx={{ width: 110 }} />} /> : <Typography variant="caption" sx={{ color: "#94a3b8" }} data-control-id={`leave-plan.editor.item.${intIndex}.negative-limit.not-allowed`}>{t("negative_not_allowed", "Not Allowed")}</Typography>}</TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.intDisplayOrder`} control={control} render={({ field }) => <TextField {...field} type="number" size="small" inputProps={{ "data-control-id": `leave-plan.editor.item.${intIndex}.display-order.input`, min: 0, step: 1 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} sx={{ width: 110 }} />} /></TableCell>
                  <TableCell><Controller name={`lstItems.${intIndex}.blnIsActive`} control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(_, blnValue) => field.onChange(blnValue)} inputProps={automationInputProps(`leave-plan.editor.item.${intIndex}.blnIsActive.checkbox`)} />} /></TableCell>
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
