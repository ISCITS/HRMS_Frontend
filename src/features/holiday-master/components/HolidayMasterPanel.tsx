"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Breadcrumbs, Button, Checkbox, CircularProgress, IconButton, InputAdornment, Link, MenuItem,
  Popover, Skeleton, Snackbar, TextField, Tooltip, Typography,
} from "@mui/material";
import { useMemo, useState, type InputHTMLAttributes } from "react";
import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
import * as yup from "yup";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import { onSearchEnter } from "@/components/master/MasterListUi";
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
const objHolidaySchema = yup.object({
  intHolidayYear: yup.number().integer().min(1900).max(9999).required(),
  dtHolidayDate: yup.string().required("Holiday date is required."),
  strHolidayCode: yup.string().trim().matches(/^[A-Za-z0-9][A-Za-z0-9._-]{1,49}$/, "Use 2-50 letters, numbers, dot, underscore, or hyphen.").required("Holiday code is required."),
  strHolidayName: yup.string().trim().max(150).required("Holiday name is required."),
  strHolidayDescription: yup.string().max(500).defined(),
  strHolidayTypeCode: yup.string().required("Holiday type is required."),
  blnIsPaid: yup.boolean().required(),
  blnIsOptional: yup.boolean().required(),
  blnIsWorkOnHoliday: yup.boolean().required(),
  blnIsCompensatoryOffApplicable: yup.boolean().required(),
  blnIsActive: yup.boolean().required(),
  lstTexts: yup.array().of(yup.object({
    intLanguageID: yup.number().positive().required().defined(),
    strLanguageName: yup.string().required().defined(),
    strHolidayName: yup.string().trim().max(150).defined(),
    strHolidayDescription: yup.string().max(500).defined(),
  }).required().defined()).required().defined(),
});

function createHolidayForm(intYear: number, strHolidayTypeCode = ""): HolidayFormValues {
  return {
    intHolidayYear: intYear,
    dtHolidayDate: "",
    strHolidayCode: "",
    strHolidayName: "",
    strHolidayDescription: "",
    strHolidayTypeCode,
    blnIsPaid: true,
    blnIsOptional: false,
    blnIsWorkOnHoliday: false,
    blnIsCompensatoryOffApplicable: false,
    blnIsActive: true,
    lstTexts: [],
  };
}

const strHolidaySkeletonColumns = "48px 0.9fr 1.4fr 1fr 1fr 0.7fr";
const intHolidaySkeletonRows = 8;

function HolidayGridSkeleton() {
  return (
    <Box
      data-control-id="holiday-master.list.skeleton"
      sx={{ border: "1px solid #e8eef5", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={142} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 800 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: strHolidaySkeletonColumns, bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2, 3, 4, 5].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 0 ? 18 : intColumn === 5 ? 60 : 96} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intHolidaySkeletonRows }).map((_, intIndex) => (
          <Box key={intIndex} sx={{ display: "grid", gridTemplateColumns: strHolidaySkeletonColumns, borderBottom: "1px solid #edf1f6", minHeight: 40, alignItems: "center" }}>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={18} height={18} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="70%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${52 + (intIndex % 3) * 12}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${46 + (intIndex % 2) * 14}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="60%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={64} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
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
  const [elMoreFiltersAnchor, setElMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const {
    control, register, reset, handleSubmit, getValues, setValue, watch,
    formState: { errors },
  } = useForm<HolidayFormValues>({
    resolver: yupResolver(objHolidaySchema) as Resolver<HolidayFormValues>,
    defaultValues: createHolidayForm(intYear)
  });
  const { fields: lstTextFields } = useFieldArray({ control, name: "lstTexts" });
  const intPrimaryLanguageID = authHelpers.getLanguageID() ?? objOptions.lstLanguages[0]?.intID;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();
  const intPrimaryTextIndex = lstTextFields.findIndex((objText) => objText.intLanguageID === intPrimaryLanguageID);
  const blnFormActive = watch("blnIsActive");
  const blnCanView = canViewAny();
  // Older HR groups use EDIT as the Holiday Master maintenance right for both add and update.
  const blnCanAdd = canDoAny("add") || canDoAny("create") || canDoAny("edit");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnSearchPanelFrozen = blnLoading || blnSubmitting || blnRightsLoading;
  const intActiveMoreFilters = (objFilters.dtFromDate ? 1 : 0) + (objFilters.dtToDate ? 1 : 0);

  // Discards unapplied date edits so the popover always reopens on the applied filters.
  function cancelMoreFilters() {
    setElMoreFiltersAnchor(null);
    setObjSearchDraft((objPrevious) => ({ ...objPrevious, dtFromDate: objFilters.dtFromDate, dtToDate: objFilters.dtToDate }));
  }

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
    reset({
      ...createHolidayForm(
        objSearchDraft.intYear,
        objOptions.lstHolidayTypes[0]?.strCode ?? "",
      ),
      lstTexts: buildTranslations(),
    });
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
    const intTargetLanguageID = intSecondaryLanguageID;
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

  // Send the user straight to the first field that failed validation.
  function focusFirstInvalidField(objFormErrors: typeof errors) {
    const lstFieldOrder: Array<[keyof HolidayFormValues, string]> = [
      ["dtHolidayDate", "holiday-master.dialog.date.input"],
      ["strHolidayCode", "holiday-master.dialog.code.input"],
      ["strHolidayTypeCode", "holiday-master.dialog.type.select"],
      ["strHolidayName", "holiday-master.dialog.name.input"],
      ["strHolidayDescription", "holiday-master.dialog.description.input"],
    ];
    const lstMatch = lstFieldOrder.find(([strField]) => objFormErrors[strField]);
    if (!lstMatch) return;
    document.querySelector<HTMLElement>(`[data-control-id="${lstMatch[1]}"]:is(input, textarea)`)?.focus();
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
  }, focusFirstInvalidField);

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
    return {
      id: String(objHoliday.intID),
      select: <Checkbox controlId={`holiday-master.list.row.${objHoliday.intID}.select.checkbox`} checked={lstSelectedIDs.includes(objHoliday.intID)} onChange={() => toggleSelection(objHoliday.intID)} inputProps={{ "data-control-id": `holiday-master.list.row.${objHoliday.intID}.select.checkbox` } as InputHTMLAttributes<HTMLInputElement>} />,
      dateRaw: objHoliday.dtHolidayDate,
      date: new Intl.DateTimeFormat(strLanguageCode === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium" }).format(new Date(`${objHoliday.dtHolidayDate}T00:00:00`)),
      code: objHoliday.strHolidayCode,
      nameText: objHoliday.strHolidayName,
      name: (
        <Link
          component="button"
          type="button"
          underline="none"
          disabled={!blnCanView && !blnCanEdit}
          className="app-master-first-column-link" data-control-id="holiday-master.list.row.name.button"
          onClick={(objEvent) => {
            if (window.getSelection()?.toString()) {
              objEvent.stopPropagation();
              return;
            }
            void openHoliday(blnCanEdit ? "edit" : "view", objHoliday.intID);
          }}
          sx={{ cursor: "pointer", textAlign: "left", textUnderlineOffset: "3px", userSelect: "text", WebkitUserSelect: "text", "&&:hover": { color: "#0066df", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}
        >
          {objHoliday.strHolidayName}
        </Link>
      ),
      statusText: objHoliday.blnIsActive ? "Active" : "Inactive",
      type: objOptions.lstHolidayTypes.find((objType) => objType.strCode === objHoliday.strHolidayTypeCode)?.strLabel ?? objHoliday.strHolidayTypeCode,
      status: <span className={`app-master-status-pill ${objHoliday.blnIsActive ? "app-master-status-active" : "app-master-status-inactive"}`}>{objHoliday.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}</span>,
    };
  }), [blnCanEdit, blnCanView, lstHolidays, lstSelectedIDs, objOptions.lstHolidayTypes, strLanguageCode, t]);

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(() => [
    { field: "select", headerName: <Checkbox controlId="holiday-master.list.select-all.checkbox" checked={blnAllSelected} indeterminate={blnSomeSelected} onChange={toggleSelectAll} inputProps={{ "data-control-id": "holiday-master.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />, sortable: false, filterable: false, exportable: false, width: 56 },
    { field: "date", headerName: t("date", "Date"), width: 150, sortAccessor: (row) => row.dateRaw },
    { field: "name", headerName: t("name", "Holiday Name"), sortAccessor: (row) => row.nameText },
    { field: "code", headerName: t("code", "Holiday Code"), width: 150 },
    { field: "type", headerName: t("type", "Holiday Type"), width: 170 },
    { field: "status", headerName: t("status", "Status"), width: 120, sortAccessor: (row) => row.statusText },
  ], [blnAllSelected, blnSomeSelected, lstTableRows, t]);

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_holidays", "Holiday Master")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error">{strError}</Alert> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? <Typography sx={{ color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>{t("read_only_mode", "You have view-only access for Holiday.")}</Typography> : null}
        <Box
          className={styles.searchRow}
          onKeyDown={onSearchEnter(() => { if (!blnSearchPanelFrozen) applySearch(); })}
          aria-busy={blnSearchPanelFrozen}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "110px minmax(160px, 1.2fr) minmax(160px, 1fr) minmax(140px, 0.8fr) minmax(120px, 0.6fr) auto auto auto 1fr" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField className="app-mui-text-field" id="holiday-search-year" controlId="holiday-master.list.search-year.input" label={t("year", "Year")} type="number" size="small" value={objSearchDraft.intYear} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, intYear: Number(objEvent.target.value) }))} inputProps={{ min: 1900, max: 9999, "data-control-id": "holiday-master.list.search-year.input" }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="holiday-search-name" label={t("name", "Holiday Name")} placeholder={t("search_name", "Search holiday name")} size="small" value={objSearchDraft.strSearchName} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strSearchName: objEvent.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} inputProps={{ "data-control-id": "holiday-master.list.search-name.input" }} disabled={blnSearchPanelFrozen} fullWidth />
          <TextField className="app-mui-text-field" id="holiday-search-code" label={t("code", "Holiday Code")} placeholder={t("search_code", "Search holiday code")} size="small" value={objSearchDraft.strSearchCode} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strSearchCode: objEvent.target.value.toUpperCase() }))} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} inputProps={{ "data-control-id": "holiday-master.list.search-code.input" }} disabled={blnSearchPanelFrozen} fullWidth />
          <CommonSearchableSelect className="app-mui-text-field" controlId="holiday-master.list.search-type.select" label={t("type", "Holiday Type")} placeholder={t("all", "All")} showSearchIcon={false} value={objSearchDraft.strHolidayTypeCode} options={objOptions.lstHolidayTypes.map((objType) => ({ intID: objType.strCode, strLabel: objType.strLabel }))} onChange={(strValue) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strHolidayTypeCode: strValue === "" ? "" : String(strValue) }))} disabled={blnSearchPanelFrozen} />
          <TextField className="app-mui-text-field" id="holiday-search-status" select label={t("status", "Status")} size="small" value={objSearchDraft.strStatus} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strStatus: objEvent.target.value }))} inputProps={{ "data-control-id": "holiday-master.list.search-status.select" }} disabled={blnSearchPanelFrozen} fullWidth>
            <MenuItem value="">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Button data-control-id="holiday-master.list.more-filters.button" className={styles.secondaryButton} startIcon={<FilterAltOutlinedIcon />} onClick={(objEvent) => setElMoreFiltersAnchor(objEvent.currentTarget)} disabled={blnSearchPanelFrozen}>
            {t("more_filters", "More filters")}{intActiveMoreFilters > 0 ? ` (${intActiveMoreFilters})` : ""}
          </Button>
          <Button data-control-id="holiday-master.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch} disabled={blnSearchPanelFrozen}>{t("search", "Search")}</Button>
          <Button data-control-id="holiday-master.list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearSearch} disabled={blnSearchPanelFrozen}>{t("clear", "Clear")}</Button>
        </Box>
        <Popover
          open={Boolean(elMoreFiltersAnchor)}
          anchorEl={elMoreFiltersAnchor}
          onClose={cancelMoreFilters}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1, p: 2, width: 340, borderRadius: "10px" } } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{t("more_filters", "More Filters")}</Typography>
            <IconButton aria-label={t("close", "Close")} onClick={cancelMoreFilters} size="small" sx={{ color: "#94a3b8" }}><CloseRoundedIcon fontSize="small" /></IconButton>
          </Box>
          <Box onKeyDown={onSearchEnter(() => { setElMoreFiltersAnchor(null); applySearch(); })} sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
            <TextField className="app-mui-text-field" label={t("from_date", "From Date")} type="date" size="small" value={objSearchDraft.dtFromDate} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, dtFromDate: objEvent.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ "data-control-id": "holiday-master.list.from-date.input" }} fullWidth />
            <TextField className="app-mui-text-field" label={t("to_date", "To Date")} type="date" size="small" value={objSearchDraft.dtToDate} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, dtToDate: objEvent.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ "data-control-id": "holiday-master.list.to-date.input" }} fullWidth />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2 }}>
            <Link component="button" type="button" underline="hover" onClick={() => setObjSearchDraft((objPrevious) => ({ ...objPrevious, dtFromDate: "", dtToDate: "" }))} sx={{ fontSize: "12px", fontWeight: 600 }}>{t("clear_all", "Clear all")}</Link>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button data-control-id="holiday-master.list.more-filters.cancel.button" className={styles.secondaryButton} onClick={cancelMoreFilters}>{t("cancel", "Cancel")}</Button>
              <Button data-control-id="holiday-master.list.more-filters.apply.button" className={styles.primaryButton} onClick={() => { setElMoreFiltersAnchor(null); applySearch(); }}>{t("apply", "Apply")}</Button>
            </Box>
          </Box>
        </Popover>
        {lstSelectedIDs.length > 0 && blnCanEdit ? <Box className={styles.bulkBar}><Typography className={styles.bulkCount}>{lstSelectedIDs.length} {t("rows_selected", "rows selected")}</Typography><Button data-control-id="holiday-master.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => requestBulkStatus(true)}>{t("activate", "Activate")}</Button><Button data-control-id="holiday-master.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => requestBulkStatus(false)}>{t("deactivate", "Deactivate")}</Button></Box> : null}
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {(blnLoading || blnRightsLoading) && !blnDialogOpen ? (
          <HolidayGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}><Typography>{t("access_denied", "Holiday access is not available for your user group.")}</Typography></Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="holiday"
            showExportOptions={blnCanExport}
            showPaginationSummary
            hideRowClickHint
            testIdPrefix="holiday-master.list"
            emptyMessage={t("empty", "No holidays found for the selected filters.")}
            onRowClick={(objRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || !blnCanView) return;
              void openHoliday(blnCanEdit ? "edit" : "view", Number(objRow.id));
            }}
            toolbarLeft={blnCanAdd ? <Button data-control-id="holiday-master.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={openAdd}>{t("add_button", "Add Holiday")}</Button> : null}
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover .MuiLink-root": { textDecoration: "underline", color: "#0066df" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={() => setBlnDialogOpen(false)}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") setBlnDialogOpen(false);
        }}
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
        fullWidth={false}
        paperClassName={styles.departmentDialogPaper}
        paperSx={{
          width: "min(760px, calc(100vw - 32px)) !important",
          maxWidth: "760px !important",
          "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" },
        }}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>{t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch
              testId="holiday-master.dialog.active.switch"
              blnIsActive={blnFormActive}
              disabled={strMode === "view"}
              sx={{
                width: 40,
                height: 22,
                p: 0,
                overflow: "visible",
                "& .MuiSwitch-switchBase": {
                  p: "3px",
                  color: "#fff",
                  transitionDuration: "180ms",
                  "&.Mui-checked": {
                    transform: "translateX(18px)",
                    color: "#fff",
                    "& + .MuiSwitch-track": { backgroundColor: "#00b86b", opacity: 1 },
                  },
                  "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
                },
                "& .MuiSwitch-thumb": { width: 16, height: 16, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)" },
                "& .MuiSwitch-track": { borderRadius: "11px", backgroundColor: "#98a2b3", opacity: 1, transition: "background-color 180ms" },
              }}
              onChange={(blnChecked) => setValue("blnIsActive", blnChecked)}
            />
            <Typography className={styles.switchLabel} sx={{ fontSize: "12px !important", fontWeight: "600 !important", whiteSpace: "nowrap" }}>{t("active", "Active")}</Typography>
            <IconButton aria-label={t("close", "Close")} onClick={() => setBlnDialogOpen(false)} size="small" sx={{ ml: 1, color: "#94a3b8" }}><CloseRoundedIcon fontSize="small" /></IconButton>
          </Box>
        }
        nodeContent={<Box sx={{ display: "grid", gap: "12px" }}>
          {strSubmitError ? <Alert severity="error">{strSubmitError}</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, columnGap: 1.6, rowGap: "12px", alignItems: "start" }}>
            <TextField className="app-mui-text-field" {...register("dtHolidayDate", { onChange: (objEvent) => setValue("intHolidayYear", Number(String(objEvent.target.value).slice(0, 4))) })} inputProps={{ "data-control-id": "holiday-master.dialog.date.input" }} label={t("date", "Holiday Date")} type="date" size="small" InputLabelProps={{ shrink: true }} disabled={strMode === "view"} error={Boolean(errors.dtHolidayDate)} helperText={errors.dtHolidayDate?.message} required fullWidth />
            <TextField className="app-mui-text-field" {...register("intHolidayYear", { valueAsNumber: true })} inputProps={{ "data-control-id": "holiday-master.dialog.year.input" }} label={t("year", "Holiday Year")} type="number" size="small" disabled helperText={t("year_derived", "Derived automatically from Holiday Date")} fullWidth />
            <TextField className="app-mui-text-field" {...register("strHolidayCode")} inputProps={{ "data-control-id": "holiday-master.dialog.code.input" }} label={t("code", "Holiday Code")} size="small" disabled={strMode !== "add"} error={Boolean(errors.strHolidayCode)} helperText={errors.strHolidayCode?.message ?? (strMode === "edit" ? t("code_immutable", "Holiday Code cannot be changed after creation.") : undefined)} required fullWidth />
            <Box sx={{ gridColumn: { xs: "auto", sm: "span 1" } }}>
              <Controller control={control} name="strHolidayTypeCode" render={({ field }) => <CommonSearchableSelect className="app-mui-text-field" controlId="holiday-master.dialog.type.select" label={t("type", "Holiday Type")} value={field.value} options={objOptions.lstHolidayTypes.map((objType) => ({ intID: objType.strCode, strLabel: objType.strLabel }))} onChange={(strValue) => field.onChange(strValue === "" ? "" : String(strValue))} disabled={strMode === "view"} error={Boolean(errors.strHolidayTypeCode)} helperText={errors.strHolidayTypeCode?.message} required />} />
            </Box>
            <Box sx={{ gridColumn: { xs: "auto", sm: "span 2" } }}>
              <TextField className="app-mui-text-field" {...register("strHolidayName", { onChange: (objEvent) => { if (intPrimaryTextIndex >= 0) setValue(`lstTexts.${intPrimaryTextIndex}.strHolidayName`, objEvent.target.value, { shouldValidate: true }); } })} inputProps={{ "data-control-id": "holiday-master.dialog.name.input" }} label={t("name", "Holiday Name")} placeholder={t("dialog_name_placeholder", "Enter holiday name")} size="small" disabled={strMode === "view"} error={Boolean(errors.strHolidayName)} helperText={errors.strHolidayName?.message} required fullWidth />
            </Box>
          </Box>
          <TextField className="app-mui-text-field" {...register("strHolidayDescription", { onChange: (objEvent) => { if (intPrimaryTextIndex >= 0) setValue(`lstTexts.${intPrimaryTextIndex}.strHolidayDescription`, objEvent.target.value, { shouldValidate: true }); } })} inputProps={{ "data-control-id": "holiday-master.dialog.description.input" }} label={t("description", "Description")} size="small" disabled={strMode === "view"} error={Boolean(errors.strHolidayDescription)} helperText={errors.strHolidayDescription?.message} multiline minRows={2} fullWidth />
          {intSecondaryLanguageID && lstTextFields.some((objText) => objText.intLanguageID !== intPrimaryLanguageID) ? (
            <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
                <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("language_translations", "Language Translations")}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>{t("multilingual_text_help", "Add translated holiday names and descriptions for supported languages.")}</Typography>
                </Box>
                <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                  <span>
                    <Button data-control-id="holiday-master.dialog.ai-translate.button" className={styles.secondaryButton} variant="outlined" startIcon={blnTranslating ? <CircularProgress size={16} /> : <AutoAwesomeRoundedIcon />} onClick={() => void translateHolidayFields()} disabled={strMode === "view" || blnSubmitting || blnTranslating || objOptions.lstLanguages.length < 2} sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}>{t("ai_translate", "AI Translate")}</Button>
                  </span>
                </Tooltip>
              </Box>
              <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
                {lstTextFields.map((objText, intIndex) => {
                  if (objText.intLanguageID === intPrimaryLanguageID) return null;
                  return (
                    <Box key={objText.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(90px, 0.3fr) minmax(0, 1fr) minmax(0, 1.2fr)" }, alignItems: "center", gap: 1.5 }}>
                      <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{objText.strLanguageName}</Typography>
                      <TextField className="app-mui-text-field" {...register(`lstTexts.${intIndex}.strHolidayName`)} inputProps={{ "data-control-id": `holiday-master.dialog.translation.${objText.intLanguageID}.name.input` }} placeholder={t("dialog_translated_name_placeholder", "Holiday name in {language}").replace("{language}", objText.strLanguageName)} size="small" disabled={strMode === "view"} error={Boolean(errors.lstTexts?.[intIndex]?.strHolidayName)} helperText={errors.lstTexts?.[intIndex]?.strHolidayName?.message} fullWidth />
                      <TextField className="app-mui-text-field" {...register(`lstTexts.${intIndex}.strHolidayDescription`)} inputProps={{ "data-control-id": `holiday-master.dialog.translation.${objText.intLanguageID}.description.input` }} placeholder={t("dialog_translated_description_placeholder", "Description in {language}").replace("{language}", objText.strLanguageName)} size="small" disabled={strMode === "view"} error={Boolean(errors.lstTexts?.[intIndex]?.strHolidayDescription)} helperText={errors.lstTexts?.[intIndex]?.strHolidayDescription?.message} fullWidth />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : null}
        </Box>}
      />

      <CommonConfirmDialog blnOpen={Boolean(objConfirmDialog)} strTitle={objConfirmDialog?.strTitle} strMessage={objConfirmDialog?.strMessage} strCancelLabel={t("cancel", "Cancel")} strConfirmLabel={t("confirm", "Confirm")} blnConfirmDisabled={blnSubmitting} onClose={() => setObjConfirmDialog(null)} onConfirm={() => void executeConfirmedAction()} />
      <BlockingLoader blnOpen={blnSubmitting} strLabel={t("loading", "Loading...")} intZIndex={1400} />
      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}>{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
