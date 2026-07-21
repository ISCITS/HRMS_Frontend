"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, MenuItem, Snackbar,
  Switch, TextField, Typography,
} from "@mui/material";
import { useMemo, useState, type InputHTMLAttributes } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import * as yup from "yup";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useHolidayMaster } from "@/features/holiday-master/hooks/useHolidayMaster";
import { holidayMasterService } from "@/features/holiday-master/services/holidayMasterService";
import type { HolidayFilters, HolidayFormValues, HolidayRecord } from "@/features/holiday-master/types/HolidayTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";

type HolidayMode = "add" | "edit" | "view";
type HolidaySearchDraft = HolidayFilters & { intYear: number };
type ConfirmDialogState = { strTitle: string; strMessage: string; fnOnConfirm: () => Promise<void> };
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

// Holiday Master intentionally reuses the shared master grid and dialog patterns.
const objHolidaySchema: yup.ObjectSchema<HolidayFormValues> = yup.object({
  intHolidayYear: yup.number().integer().min(1900).max(9999).required(),
  dtHolidayDate: yup.string().required("Holiday date is required."),
  strHolidayCode: yup.string().trim().matches(/^[A-Za-z0-9][A-Za-z0-9._-]{1,49}$/, "Use 2-50 letters, numbers, dot, underscore, or hyphen.").required("Holiday code is required."),
  strHolidayName: yup.string().trim().min(2).max(150).required("Holiday name is required."),
  strHolidayDescription: yup.string().max(500).required(),
  strHolidayTypeCode: yup.string().required("Holiday type is required."),
  blnIsPaid: yup.boolean().required(),
  blnIsOptional: yup.boolean().required(),
  blnIsWorkOnHoliday: yup.boolean().required(),
  blnIsCompensatoryOffApplicable: yup.boolean().required(),
  blnIsActive: yup.boolean().required(),
  lstTexts: yup.array().of(yup.object({
    intLanguageID: yup.number().positive().required(),
    strLanguageName: yup.string().required(),
    strHolidayName: yup.string().trim().max(150).required(),
    strHolidayDescription: yup.string().max(500).required(),
  })).required(),
});

function createHolidayForm(intYear: number): HolidayFormValues {
  return {
    intHolidayYear: intYear,
    dtHolidayDate: "",
    strHolidayCode: "",
    strHolidayName: "",
    strHolidayDescription: "",
    strHolidayTypeCode: "COMPANY",
    blnIsPaid: true,
    blnIsOptional: false,
    blnIsWorkOnHoliday: false,
    blnIsCompensatoryOffApplicable: false,
    blnIsActive: true,
    lstTexts: [],
  };
}

export default function HolidayMasterPanel() {
  const { t, strLanguageCode } = useModuleLabels("holiday", "Unable to load holiday labels.");
  const {
    canViewAny, canDoAny, isReadOnly, blnLoading: blnRightsLoading, strError: strRightsError,
  } = useModuleActionAccess(["HOLIDAY", "HOLIDAYS", "MASTER_HOLIDAY", "HOLIDAY_MASTER"]);
  const {
    intYear, setIntYear, objFilters, setObjFilters, lstHolidays, objOptions,
    blnLoading, strError, load,
  } = useHolidayMaster();
  const [objSearchDraft, setObjSearchDraft] = useState<HolidaySearchDraft>({ intYear, ...objFilters });
  const [strMode, setStrMode] = useState<HolidayMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [lstSelectedIDs, setLstSelectedIDs] = useState<number[]>([]);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnTranslating, setBlnTranslating] = useState(false);
  const [strSubmitError, setStrSubmitError] = useState("");
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const {
    control, register, reset, handleSubmit, getValues, setValue, watch,
    formState: { errors },
  } = useForm<HolidayFormValues>({ resolver: yupResolver(objHolidaySchema), defaultValues: createHolidayForm(intYear) });
  const { fields: lstTextFields } = useFieldArray({ control, name: "lstTexts" });
  const intPrimaryLanguageID = authHelpers.getLanguageID() ?? objOptions.lstLanguages[0]?.intID;
  const intPrimaryTextIndex = lstTextFields.findIndex((objText) => objText.intLanguageID === intPrimaryLanguageID);
  const blnFormActive = watch("blnIsActive");
  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function buildTranslations(objRecord?: HolidayRecord) {
    const intCurrentLanguageID = authHelpers.getLanguageID() ?? objOptions.lstLanguages[0]?.intID;
    return objOptions.lstLanguages.map((objLanguage) => {
      const objText = objRecord?.lstTexts?.find((objCandidate) => objCandidate.intLanguageID === objLanguage.intID);
      return {
        intLanguageID: objLanguage.intID,
        strLanguageName: objLanguage.strLabel,
        strHolidayName: objText?.strHolidayName ?? (objLanguage.intID === intCurrentLanguageID ? objRecord?.strHolidayName ?? "" : ""),
        strHolidayDescription: objText?.strHolidayDescription ?? (objLanguage.intID === intCurrentLanguageID ? objRecord?.strHolidayDescription ?? "" : ""),
      };
    });
  }

  function openAdd() {
    setStrMode("add");
    setIntEditingID(null);
    setStrSubmitError("");
    reset({ ...createHolidayForm(objSearchDraft.intYear), lstTexts: buildTranslations() });
    setBlnDialogOpen(true);
  }

  async function openHoliday(strNextMode: HolidayMode, intHolidayID: number) {
    setBlnSubmitting(true);
    setStrSubmitError("");
    try {
      const objRecord = await holidayMasterService.detail(intHolidayID);
      setStrMode(strNextMode);
      setIntEditingID(intHolidayID);
      reset({
        intHolidayYear: objRecord.intHolidayYear,
        dtHolidayDate: objRecord.dtHolidayDate,
        strHolidayCode: objRecord.strHolidayCode,
        strHolidayName: objRecord.strHolidayName,
        strHolidayDescription: objRecord.strHolidayDescription ?? "",
        strHolidayTypeCode: objRecord.strHolidayTypeCode,
        blnIsPaid: objRecord.blnIsPaid,
        blnIsOptional: objRecord.blnIsOptional,
        blnIsWorkOnHoliday: objRecord.blnIsWorkOnHoliday,
        blnIsCompensatoryOffApplicable: objRecord.blnIsCompensatoryOffApplicable,
        blnIsActive: objRecord.blnIsActive,
        lstTexts: buildTranslations(objRecord),
      });
      setBlnDialogOpen(true);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("load_failed", "Unable to load holiday."), "error");
    } finally {
      setBlnSubmitting(false);
    }
  }

  async function translateHolidayFields() {
    const objValues = getValues();
    const intSourceLanguageID = authHelpers.getLanguageID() ?? objOptions.lstLanguages[0]?.intID;
    const intTargetLanguageID = authHelpers.getSecondaryLanguageID()
      ?? objOptions.lstLanguages.find((objLanguage) => objLanguage.intID !== intSourceLanguageID)?.intID;
    const intTargetIndex = objValues.lstTexts.findIndex((objText) => objText.intLanguageID === intTargetLanguageID);
    if (!intSourceLanguageID || !intTargetLanguageID || intSourceLanguageID === intTargetLanguageID || intTargetIndex < 0) {
      showToast(t("translation_language_unavailable", "A secondary tenant language is not configured."), "error");
      return;
    }
    if (!objValues.strHolidayName.trim()) {
      showToast(t("translation_name_required", "Enter the Holiday Name before translating."), "error");
      return;
    }
    setBlnTranslating(true);
    try {
      const strTranslatedName = await holidayMasterService.translateText(
        objValues.strHolidayName.trim(), intSourceLanguageID, intTargetLanguageID,
      );
      setValue(`lstTexts.${intTargetIndex}.strHolidayName`, strTranslatedName, { shouldValidate: true });
      if (objValues.strHolidayDescription.trim()) {
        const strTranslatedDescription = await holidayMasterService.translateText(
          objValues.strHolidayDescription.trim(), intSourceLanguageID, intTargetLanguageID,
        );
        setValue(`lstTexts.${intTargetIndex}.strHolidayDescription`, strTranslatedDescription, { shouldValidate: true });
      }
      showToast(t("translation_success", "Holiday translation generated successfully."));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("translation_failed", "Unable to translate Holiday."), "error");
    } finally {
      setBlnTranslating(false);
    }
  }

  const submitHoliday = handleSubmit(async (objValues) => {
    setBlnSubmitting(true);
    setStrSubmitError("");
    try {
      if (intEditingID) {
        await holidayMasterService.update(intEditingID, objValues);
      } else {
        await holidayMasterService.create(objValues);
      }
      setBlnDialogOpen(false);
      await load();
      showToast(intEditingID ? t("update_success", "Holiday updated successfully.") : t("save_success", "Holiday saved successfully."));
    } catch (objError) {
      setStrSubmitError(objError instanceof Error ? objError.message : t("save_failed", "Unable to save holiday."));
    } finally {
      setBlnSubmitting(false);
    }
  });

  function applySearch() {
    setIntYear(objSearchDraft.intYear);
    setObjFilters({
      strSearchName: objSearchDraft.strSearchName,
      strSearchCode: objSearchDraft.strSearchCode,
      strHolidayTypeCode: objSearchDraft.strHolidayTypeCode,
      strStatus: objSearchDraft.strStatus,
      dtFromDate: objSearchDraft.dtFromDate,
      dtToDate: objSearchDraft.dtToDate,
    });
  }

  function clearSearch() {
    const intCurrentYear = new Date().getFullYear();
    const objClearedFilters: HolidayFilters = {
      strSearchName: "", strSearchCode: "", strHolidayTypeCode: "", strStatus: "", dtFromDate: "", dtToDate: "",
    };
    setObjSearchDraft({ intYear: intCurrentYear, ...objClearedFilters });
    setIntYear(intCurrentYear);
    setObjFilters(objClearedFilters);
  }

  async function updateSelectedStatus(blnIsActive: boolean) {
    await Promise.all(lstSelectedIDs.map((intID) => holidayMasterService.setStatus(intID, blnIsActive)));
    setLstSelectedIDs([]);
    await load();
    showToast(blnIsActive ? t("activate_success", "Holiday activated successfully.") : t("deactivate_success", "Holiday deactivated successfully."));
  }

  function requestBulkStatus(blnIsActive: boolean) {
    setObjConfirmDialog({
      strTitle: blnIsActive ? t("confirm_activate_title", "Activate Holidays") : t("confirm_deactivate_title", "Deactivate Holidays"),
      strMessage: blnIsActive
        ? t("confirm_activate_message", "Activate the selected holidays?")
        : t("confirm_deactivate_message", "Deactivate the selected holidays?"),
      fnOnConfirm: () => updateSelectedStatus(blnIsActive),
    });
  }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) return;
    setBlnSubmitting(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("request_failed", "Request failed."), "error");
    } finally {
      setBlnSubmitting(false);
      setObjConfirmDialog(null);
    }
  }

  const blnAllSelected = lstHolidays.length > 0 && lstHolidays.every((objHoliday) => lstSelectedIDs.includes(objHoliday.intID));
  const blnSomeSelected = !blnAllSelected && lstHolidays.some((objHoliday) => lstSelectedIDs.includes(objHoliday.intID));

  function toggleSelection(intHolidayID: number) {
    setLstSelectedIDs((lstPrevious) => lstPrevious.includes(intHolidayID)
      ? lstPrevious.filter((intID) => intID !== intHolidayID)
      : [...lstPrevious, intHolidayID]);
  }

  function toggleSelectAll() {
    setLstSelectedIDs(blnAllSelected ? [] : lstHolidays.map((objHoliday) => objHoliday.intID));
  }

  const lstTableRows = useMemo(() => lstHolidays.map((objHoliday) => {
    const fnBooleanLabel = (blnValue: boolean) => blnValue ? t("yes", "Yes") : t("no", "No");
    return {
      id: String(objHoliday.intID),
      select: <Checkbox controlId={`holiday-master.list.row.${objHoliday.intID}.select.checkbox`} checked={lstSelectedIDs.includes(objHoliday.intID)} onChange={() => toggleSelection(objHoliday.intID)} inputProps={{ "data-control-id": `holiday-master.list.row.${objHoliday.intID}.select.checkbox` } as InputHTMLAttributes<HTMLInputElement>} />,
      action: <CommonRowActions testIdPrefix="holiday-master.list.row" rowKey={String(objHoliday.intID)} blnCanView={blnCanView} blnCanEdit={blnCanEdit} blnCanDelete={false} onView={() => void openHoliday("view", objHoliday.intID)} onEdit={() => void openHoliday("edit", objHoliday.intID)} />,
      date: new Intl.DateTimeFormat(strLanguageCode === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium" }).format(new Date(`${objHoliday.dtHolidayDate}T00:00:00`)),
      code: objHoliday.strHolidayCode,
      name: objHoliday.strHolidayName,
      type: objOptions.lstHolidayTypes.find((objType) => objType.strCode === objHoliday.strHolidayTypeCode)?.strLabel ?? objHoliday.strHolidayTypeCode,
      paid: fnBooleanLabel(objHoliday.blnIsPaid),
      workOnHoliday: fnBooleanLabel(objHoliday.blnIsWorkOnHoliday),
      compOffEligible: fnBooleanLabel(objHoliday.blnIsCompensatoryOffApplicable),
      status: <span className={`${styles.statusPill} ${objHoliday.blnIsActive ? styles.statusActive : styles.statusInactive}`}>{objHoliday.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}</span>,
    };
  }), [blnCanEdit, blnCanView, lstHolidays, lstSelectedIDs, objOptions.lstHolidayTypes, strLanguageCode, t]);

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(() => [
    { field: "select", headerName: <Checkbox controlId="holiday-master.list.select-all.checkbox" checked={blnAllSelected} indeterminate={blnSomeSelected} onChange={toggleSelectAll} inputProps={{ "data-control-id": "holiday-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />, sortable: false, filterable: false, exportable: false, width: 56 },
    { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 100 },
    { field: "date", headerName: t("date", "Date"), width: 150 },
    { field: "name", headerName: t("name", "Holiday Name") },
    { field: "code", headerName: t("code", "Holiday Code"), width: 150 },
    { field: "type", headerName: t("type", "Holiday Type"), width: 170 },
    { field: "paid", headerName: t("paid_holiday", "Paid Holiday"), width: 140 },
    { field: "workOnHoliday", headerName: t("can_work_on_holiday", "Can Work on Holiday"), width: 190 },
    { field: "compOffEligible", headerName: t("comp_off_eligible", "Comp-Off Eligible"), width: 170 },
    { field: "status", headerName: t("status", "Status"), sortable: false, width: 120 },
  ], [blnAllSelected, blnSomeSelected, lstTableRows, t]);

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error">{strError}</Alert> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", "You have view-only access for Holiday.")}</Typography> : null}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "110px minmax(220px, 1.2fr) minmax(190px, 0.9fr) minmax(170px, 0.8fr) 140px 108px 108px",
          },
          alignItems: "stretch",
          gap: 1.25,
          mt: 0.5,
          "& .MuiInputBase-root": { minHeight: 48 },
          "& .MuiButton-root": { minHeight: 48, whiteSpace: "nowrap" },
        }}>
          <TextField controlId="holiday-master.list.search-year.input" label={t("year", "Year")} type="number" value={objSearchDraft.intYear} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, intYear: Number(objEvent.target.value) }))} inputProps={{ min: 1900, max: 9999, "data-control-id": "holiday-master.list.search-year.input" }} />
          <TextField controlId="holiday-master.list.search-name.input" placeholder={t("search_name", "Search Holiday Name")} value={objSearchDraft.strSearchName} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strSearchName: objEvent.target.value }))} />
          <TextField controlId="holiday-master.list.search-code.input" placeholder={t("search_code", "Search Holiday Code")} value={objSearchDraft.strSearchCode} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strSearchCode: objEvent.target.value.toUpperCase() }))} />
          <TextField controlId="holiday-master.list.search-type.select" select label={t("type", "Holiday Type")} value={objSearchDraft.strHolidayTypeCode} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strHolidayTypeCode: objEvent.target.value }))}><MenuItem value="">{t("all", "All")}</MenuItem>{objOptions.lstHolidayTypes.map((objType) => <MenuItem key={objType.strCode} value={objType.strCode}>{objType.strLabel}</MenuItem>)}</TextField>
          <TextField controlId="holiday-master.list.search-status.select" select label={t("status", "Status")} value={objSearchDraft.strStatus} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strStatus: objEvent.target.value }))}><MenuItem value="">{t("all", "All")}</MenuItem><MenuItem value="Active">{t("active", "Active")}</MenuItem><MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem></TextField>
          <Button controlId="holiday-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch}>{t("search", "Search")}</Button>
          <Button controlId="holiday-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearSearch}>{t("clear", "Clear")}</Button>
        </Box>
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(220px, 280px))" },
          gap: 1.25,
          justifyContent: "start",
          mt: 1.25,
          "& .MuiInputBase-root": { minHeight: 48 },
        }}>
          <TextField controlId="holiday-master.list.from-date.input" label={t("from_date", "From Date")} type="date" value={objSearchDraft.dtFromDate} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, dtFromDate: objEvent.target.value }))} InputLabelProps={{ shrink: true }} />
          <TextField controlId="holiday-master.list.to-date.input" label={t("to_date", "To Date")} type="date" value={objSearchDraft.dtToDate} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, dtToDate: objEvent.target.value }))} InputLabelProps={{ shrink: true }} />
        </Box>
        {lstSelectedIDs.length > 0 && blnCanEdit ? <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{lstSelectedIDs.length} {t("rows_selected", "rows selected")}</Typography><Button controlId="holiday-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => requestBulkStatus(true)}>{t("activate", "Activate")}</Button><Button controlId="holiday-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => requestBulkStatus(false)}>{t("deactivate", "Deactivate")}</Button></Box> : null}
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !blnRightsLoading ? <Box className={styles.emptyState}><Typography>{t("access_denied", "Holiday access is not available for your user group.")}</Typography></Box> : <CommonTable columns={lstTableColumns} rows={lstTableRows} rowIdField="id" defaultPageSize={10} pageSizeOptions={[10, 20, 50]} exportFileName="holiday" showExportOptions={blnCanExport} showPaginationSummary testIdPrefix="holiday-master.list" emptyMessage={t("empty", "No holidays found for the selected filters.")} toolbarLeft={blnCanAdd ? <Button controlId="holiday-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={openAdd}>{t("add_button", "Add Holiday")}</Button> : null} sx={{ p: 0, boxShadow: "none", background: "transparent" }} />}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={() => setBlnDialogOpen(false)}
        rootControlId="holiday-master.dialog"
        cancelButtonControlId="holiday-master.dialog.cancel.button"
        primaryButtonControlId="holiday-master.dialog.save.button"
        strTitle={strMode === "add" ? t("add_title", "Add Holiday") : strMode === "edit" ? t("edit_title", "Edit Holiday") : t("view_title", "View Holiday")}
        strSecondaryLabel={strMode === "view" ? t("close", "Close") : t("cancel", "Cancel")}
        strPrimaryLabel={blnSubmitting ? t("saving", "Saving...") : t("save", "Save")}
        onPrimaryAction={() => void submitHoliday()}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view"}
        maxWidth={false}
        paperClassName={styles.dialogPaper}
        paperSx={{ width: "min(1280px, calc(100vw - 32px))", maxWidth: "1280px", m: 2 }}
        nodeTitleAction={<Box className={styles.switchRow}><Typography className={styles.switchLabel}>{t("active", "Active")}</Typography><ActiveStatusSwitch testId="holiday-master.dialog.active.switch" blnIsActive={blnFormActive} disabled={strMode === "view"} onChange={(blnChecked) => setValue("blnIsActive", blnChecked)} /></Box>}
        nodeContent={<Box sx={{ display: "grid", gap: 1.5, pt: 0.5 }}>
          {strSubmitError ? <Alert severity="error">{strSubmitError}</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
            <TextField {...register("dtHolidayDate", { onChange: (objEvent) => setValue("intHolidayYear", Number(String(objEvent.target.value).slice(0, 4))) })} inputProps={{ "data-control-id": "holiday-master.dialog.date.input" }} label={t("date", "Holiday Date")} type="date" InputLabelProps={{ shrink: true }} disabled={strMode === "view"} error={Boolean(errors.dtHolidayDate)} helperText={errors.dtHolidayDate?.message} required />
            <TextField {...register("intHolidayYear", { valueAsNumber: true })} inputProps={{ "data-control-id": "holiday-master.dialog.year.input" }} label={t("year", "Holiday Year")} type="number" disabled helperText={t("year_derived", "Derived automatically from Holiday Date")} />
            <TextField {...register("strHolidayCode")} inputProps={{ "data-control-id": "holiday-master.dialog.code.input" }} label={t("code", "Holiday Code")} disabled={strMode !== "add"} error={Boolean(errors.strHolidayCode)} helperText={errors.strHolidayCode?.message ?? (strMode === "edit" ? t("code_immutable", "Holiday Code cannot be changed after creation.") : undefined)} required />
            <Controller control={control} name="strHolidayTypeCode" render={({ field }) => <TextField {...field} inputProps={{ "data-control-id": "holiday-master.dialog.type.select" }} select label={t("type", "Holiday Type")} disabled={strMode === "view"} error={Boolean(errors.strHolidayTypeCode)} required>{objOptions.lstHolidayTypes.map((objType) => <MenuItem key={objType.strCode} value={objType.strCode}>{objType.strLabel}</MenuItem>)}</TextField>} />
            <Box sx={{ gridColumn: { xs: "auto", md: "span 2" } }}><TextField {...register("strHolidayName", { onChange: (objEvent) => { if (intPrimaryTextIndex >= 0) setValue(`lstTexts.${intPrimaryTextIndex}.strHolidayName`, objEvent.target.value, { shouldValidate: true }); } })} inputProps={{ "data-control-id": "holiday-master.dialog.name.input" }} label={t("name", "Holiday Name")} disabled={strMode === "view"} error={Boolean(errors.strHolidayName)} helperText={errors.strHolidayName?.message} required fullWidth /></Box>
          </Box>
          <TextField {...register("strHolidayDescription", { onChange: (objEvent) => { if (intPrimaryTextIndex >= 0) setValue(`lstTexts.${intPrimaryTextIndex}.strHolidayDescription`, objEvent.target.value, { shouldValidate: true }); } })} inputProps={{ "data-control-id": "holiday-master.dialog.description.input" }} label={t("description", "Description")} disabled={strMode === "view"} error={Boolean(errors.strHolidayDescription)} helperText={errors.strHolidayDescription?.message} multiline minRows={2} fullWidth />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, max-content)", lg: "repeat(4, max-content)" }, columnGap: 3, rowGap: 1, alignItems: "center" }}>{([ ["blnIsPaid", "paid", "Paid"], ["blnIsOptional", "optional", "Optional"], ["blnIsWorkOnHoliday", "work_on_holiday", "Work on Holiday"], ["blnIsCompensatoryOffApplicable", "comp_off_short_label", "Comp-Off"] ] as const).map(([strName, strKey, strFallback]) => <Controller key={strName} control={control} name={strName} render={({ field }) => <FormControlLabel sx={{ m: 0 }} control={<Switch data-control-id={`holiday-master.dialog.${strName}.switch`} checked={field.value} disabled={strMode === "view"} onChange={(_, blnChecked) => field.onChange(blnChecked)} />} label={t(strKey, strFallback)} />} />)}</Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>{t("multilingual_text_help", "Add translated holiday names and descriptions for supported languages.")}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
              <Button controlId="holiday-master.dialog.add-language.button" className={styles.secondaryButton} startIcon={<AddRoundedIcon />} disabled sx={{ minHeight: 34 }}>{t("add_language", "Add Language")}</Button>
              <Button controlId="holiday-master.dialog.ai-translate.button" className={styles.primaryButton} onClick={() => void translateHolidayFields()} disabled={strMode === "view" || blnSubmitting || blnTranslating || objOptions.lstLanguages.length < 2} sx={{ minWidth: 108, minHeight: 34, boxShadow: "none", "&:hover": { boxShadow: "none" } }}>{blnTranslating ? <CircularProgress size={18} sx={{ color: "#ffffff" }} /> : t("ai_translate", "AI Translate")}</Button>
            </Box>
          </Box>
          <Box sx={{ display: "grid", gap: 1.2 }}>
            {lstTextFields.map((objText, intIndex) => {
              const blnPrimaryLanguage = objText.intLanguageID === intPrimaryLanguageID;
              return (
                <Box key={objText.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 0.9fr) minmax(0, 1.25fr) minmax(0, 1.5fr)" }, gap: 1.2, alignItems: "start", border: "1px solid rgba(203,213,225,0.8)", borderRadius: "16px", p: 1.2, background: "#f8fafc" }}>
                  <TextField select label={t("language", "Language")} value={objText.intLanguageID} InputLabelProps={{ shrink: true }} disabled controlId={`holiday-master.dialog.translation.${objText.intLanguageID}.language.select`} fullWidth>
                    {objOptions.lstLanguages.map((objLanguage) => <MenuItem key={objLanguage.intID} value={objLanguage.intID}>{objLanguage.strLabel}</MenuItem>)}
                  </TextField>
                  <TextField {...register(`lstTexts.${intIndex}.strHolidayName`)} inputProps={{ "data-control-id": `holiday-master.dialog.translation.${objText.intLanguageID}.name.input` }} label={t("name", "Holiday Name")} disabled={strMode === "view" || blnPrimaryLanguage} error={Boolean(errors.lstTexts?.[intIndex]?.strHolidayName)} helperText={errors.lstTexts?.[intIndex]?.strHolidayName?.message} fullWidth />
                  <TextField {...register(`lstTexts.${intIndex}.strHolidayDescription`)} inputProps={{ "data-control-id": `holiday-master.dialog.translation.${objText.intLanguageID}.description.input` }} label={t("description", "Description")} disabled multiline minRows={1} fullWidth />
                </Box>
              );
            })}
          </Box>
        </Box>}
      />

      <CommonConfirmDialog blnOpen={Boolean(objConfirmDialog)} strTitle={objConfirmDialog?.strTitle} strMessage={objConfirmDialog?.strMessage} strCancelLabel={t("cancel", "Cancel")} strConfirmLabel={t("confirm", "Confirm")} blnConfirmDisabled={blnSubmitting} onClose={() => setObjConfirmDialog(null)} onConfirm={() => void executeConfirmedAction()} />
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={t("loading", "Loading...")} intZIndex={1400} />
      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}>{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
