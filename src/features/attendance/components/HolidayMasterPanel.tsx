"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import type { HolidayDto, HolidayFormOptions, HolidayRequest, HolidayTextDto } from "@/features/attendance/dto";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type HolidayMode = "add" | "edit" | "view";
type BooleanFilter = "all" | "true" | "false";
type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type SearchForm = {
  intYear: number;
  strSearch: string;
  strHolidayTypeCode: string;
  strPaid: BooleanFilter;
  strOptional: BooleanFilter;
  strStatus: BooleanFilter;
};

function getLocalDateValue(objDate = new Date()): string {
  const intOffset = objDate.getTimezoneOffset() * 60_000;
  return new Date(objDate.getTime() - intOffset).toISOString().slice(0, 10);
}

function createEmptyHoliday(intYear = new Date().getFullYear(), intLanguageID = 1): HolidayRequest {
  const strToday = getLocalDateValue();
  const strDate = Number(strToday.slice(0, 4)) === intYear ? strToday : `${intYear}-01-01`;
  return {
    intHolidayYear: intYear,
    dtHolidayDate: strDate,
    strHolidayCode: "",
    strHolidayName: "",
    strHolidayTypeCode: "OTHER",
    blnIsPaid: true,
    blnIsOptional: false,
    blnWorkOnHolidayAllowed: false,
    blnCompOffEligible: false,
    blnIsActive: true,
    intLanguageID,
    lstTexts: [{ intLanguageID, strHolidayName: "" }],
  };
}

function toBooleanFilter(strValue: BooleanFilter): boolean | undefined {
  return strValue === "all" ? undefined : strValue === "true";
}

export default function HolidayMasterPanel() {
  const { t } = useModuleLabels("holiday_master", "Unable to load Holiday Master labels.");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDo, canViewModule } = useActionRights();
  const [lstHolidays, setLstHolidays] = useState<HolidayDto[]>([]);
  const [objOptions, setObjOptions] = useState<HolidayFormOptions>({
    lstLanguages: [], lstHolidayTypes: [], intDefaultLanguageID: null, intSecondaryLanguageID: null, lstYears: [],
  });
  const [objSearchDraft, setObjSearchDraft] = useState<SearchForm>({
    intYear: new Date().getFullYear(), strSearch: "", strHolidayTypeCode: "", strPaid: "all", strOptional: "all", strStatus: "all",
  });
  const [objSearchApplied, setObjSearchApplied] = useState<SearchForm>(objSearchDraft);
  const [objForm, setObjForm] = useState<HolidayRequest>(createEmptyHoliday());
  const [strMode, setStrMode] = useState<HolidayMode>("add");
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnTranslating, setBlnTranslating] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const blnCanView = canViewModule("HOLIDAY_MASTER") || canDo("HOLIDAY_MASTER", "HOLIDAY_MASTER_VIEW");
  const blnCanCreate = canDo("HOLIDAY_MASTER", "HOLIDAY_MASTER_CREATE") || canDo("HOLIDAY_MASTER", "create");
  const blnCanEdit = canDo("HOLIDAY_MASTER", "HOLIDAY_MASTER_EDIT") || canDo("HOLIDAY_MASTER", "edit");
  const blnReadOnly = strMode === "view";

  const showToast = useCallback((strMessage: string, strSeverity: ToastState["strSeverity"]) => {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }, []);

  const loadHolidays = useCallback(async (objFilters: SearchForm) => {
    const lstResult = await attendanceService.listHolidays({
      intYear: objFilters.intYear,
      strSearch: objFilters.strSearch.trim() || undefined,
      strHolidayTypeCode: objFilters.strHolidayTypeCode || undefined,
      blnIsPaid: toBooleanFilter(objFilters.strPaid),
      blnIsOptional: toBooleanFilter(objFilters.strOptional),
      blnIsActive: toBooleanFilter(objFilters.strStatus),
    });
    setLstHolidays(lstResult);
  }, []);

  const loadAll = useCallback(async () => {
    setBlnLoading(true);
    try {
      const [objFormOptions] = await Promise.all([
        attendanceService.getHolidayFormOptions(),
        loadHolidays(objSearchApplied),
      ]);
      setObjOptions(objFormOptions);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }, [loadHolidays, objSearchApplied, showToast]);

  useEffect(() => { void loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function buildLanguageRows(strDefaultName = "", lstExisting: HolidayTextDto[] = []): HolidayTextDto[] {
    const intDefaultLanguageID = objOptions.intDefaultLanguageID ?? objOptions.lstLanguages[0]?.intID ?? 1;
    const lstLanguageIDs = [intDefaultLanguageID, objOptions.intSecondaryLanguageID]
      .filter((intLanguageID): intLanguageID is number => Boolean(intLanguageID));
    return Array.from(new Set(lstLanguageIDs)).map((intLanguageID) => ({
      intLanguageID,
      strHolidayName: lstExisting.find((objText) => objText.intLanguageID === intLanguageID)?.strHolidayName
        ?? (intLanguageID === intDefaultLanguageID ? strDefaultName : ""),
    }));
  }

  function openAdd() {
    const intDefaultLanguageID = objOptions.intDefaultLanguageID ?? objOptions.lstLanguages[0]?.intID ?? 1;
    const objNext = createEmptyHoliday(objSearchApplied.intYear, intDefaultLanguageID);
    objNext.lstTexts = buildLanguageRows();
    setObjForm(objNext);
    setIntEditingID(null);
    setStrMode("add");
    setBlnDialogOpen(true);
  }

  async function openExisting(objHoliday: HolidayDto, strNextMode: HolidayMode) {
    setBlnLoading(true);
    try {
      const objDetail = await attendanceService.getHoliday(objHoliday.intID);
      setObjForm({
        intCompanyID: objDetail.intCompanyID,
        intHolidayYear: objDetail.intHolidayYear,
        dtHolidayDate: objDetail.dtHolidayDate,
        strHolidayCode: objDetail.strHolidayCode,
        strHolidayName: objDetail.strHolidayName,
        strHolidayTypeCode: objDetail.strHolidayTypeCode,
        blnIsPaid: objDetail.blnIsPaid,
        blnIsOptional: objDetail.blnIsOptional,
        blnWorkOnHolidayAllowed: objDetail.blnWorkOnHolidayAllowed,
        blnCompOffEligible: objDetail.blnCompOffEligible,
        blnIsActive: objDetail.blnIsActive,
        intLanguageID: objOptions.intDefaultLanguageID,
        lstTexts: buildLanguageRows(objDetail.strHolidayName, objDetail.lstTexts ?? []),
      });
      setIntEditingID(objHoliday.intID);
      setStrMode(strNextMode);
      setBlnDialogOpen(true);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  function updateDefaultName(strName: string) {
    const intDefaultLanguageID = objOptions.intDefaultLanguageID ?? objForm.intLanguageID;
    setObjForm((objPrevious) => ({
      ...objPrevious,
      strHolidayName: strName,
      lstTexts: objPrevious.lstTexts.map((objText) => objText.intLanguageID === intDefaultLanguageID ? { ...objText, strHolidayName: strName } : objText),
    }));
  }

  function validateForm(): string | null {
    if (!objForm.intHolidayYear || !objForm.dtHolidayDate || !objForm.strHolidayCode.trim() || !objForm.strHolidayName.trim() || !objForm.strHolidayTypeCode) {
      return t("validation_required", "Year, date, code, name and type are required.");
    }
    if (Number(objForm.dtHolidayDate.slice(0, 4)) !== objForm.intHolidayYear) {
      return t("validation_year_date", "Holiday year must match the date year.");
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(objForm.strHolidayCode.trim().toUpperCase())) {
      return "Code must contain 2-50 uppercase letters, numbers, underscore or hyphen.";
    }
    if (objForm.blnCompOffEligible && !objForm.blnWorkOnHolidayAllowed) {
      return "Comp-Off eligibility requires Work on Holiday to be allowed.";
    }
    const intDefaultLanguageID = objOptions.intDefaultLanguageID ?? objForm.intLanguageID;
    if (!objForm.lstTexts.some((objText) => objText.intLanguageID === intDefaultLanguageID && objText.strHolidayName.trim())) {
      return "A holiday name is required for the default language.";
    }
    return null;
  }

  async function saveHoliday() {
    const strValidation = validateForm();
    if (strValidation) {
      showToast(strValidation, "error");
      return;
    }
    setBlnSaving(true);
    try {
      const objPayload = {
        ...objForm,
        strHolidayCode: objForm.strHolidayCode.trim().toUpperCase(),
        strHolidayName: objForm.strHolidayName.trim(),
        strHolidayTypeCode: objForm.strHolidayTypeCode.trim().toUpperCase(),
        lstTexts: objForm.lstTexts
          .map((objText) => ({ ...objText, strHolidayName: objText.strHolidayName.trim() }))
          .filter((objText) => Boolean(objText.strHolidayName)),
      };
      if (strMode === "edit" && intEditingID) {
        await attendanceService.updateHoliday(intEditingID, objPayload);
        showToast(t("update_success", "Holiday updated successfully."), "success");
      } else {
        await attendanceService.createHoliday(objPayload);
        showToast(t("save_success", "Holiday saved successfully."), "success");
      }
      setBlnDialogOpen(false);
      await loadHolidays(objSearchApplied);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  async function translateSecondaryName() {
    const intSourceLanguageID = objOptions.intDefaultLanguageID;
    const intTargetLanguageID = objOptions.intSecondaryLanguageID;
    if (!intSourceLanguageID || !intTargetLanguageID || !objForm.strHolidayName.trim()) return;
    setBlnTranslating(true);
    try {
      const strTranslatedName = await attendanceService.translateHolidayText(objForm.strHolidayName.trim(), intSourceLanguageID, intTargetLanguageID);
      setObjForm((objPrevious) => ({
        ...objPrevious,
        lstTexts: objPrevious.lstTexts.map((objText) => objText.intLanguageID === intTargetLanguageID ? { ...objText, strHolidayName: strTranslatedName } : objText),
      }));
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnTranslating(false);
    }
  }

  const lstRows = useMemo(() => lstHolidays.map((objHoliday) => ({
    id: objHoliday.intID,
    actions: <CommonRowActions testIdPrefix="holiday-master.list.row" rowKey={objHoliday.intID} blnCanView={blnCanView} blnCanEdit={blnCanEdit} onView={() => void openExisting(objHoliday, "view")} onEdit={() => void openExisting(objHoliday, "edit")} />,
    date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${objHoliday.dtHolidayDate}T00:00:00`)),
    day: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(`${objHoliday.dtHolidayDate}T00:00:00`)),
    code: objHoliday.strHolidayCode,
    name: objHoliday.strDisplayName || objHoliday.strHolidayName,
    type: objHoliday.strHolidayTypeName || objHoliday.strHolidayTypeCode,
    paid: objHoliday.blnIsPaid ? t("yes", "Yes") : t("no", "No"),
    optional: objHoliday.blnIsOptional ? t("yes", "Yes") : t("no", "No"),
    workAllowed: objHoliday.blnWorkOnHolidayAllowed ? t("yes", "Yes") : t("no", "No"),
    compOff: objHoliday.blnCompOffEligible ? t("yes", "Yes") : t("no", "No"),
    status: <Chip size="small" label={objHoliday.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")} color={objHoliday.blnIsActive ? "success" : "default"} />,
  })), [lstHolidays, blnCanEdit, blnCanView, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const lstColumns = useMemo<CommonTableColumn<(typeof lstRows)[number]>[]>(() => [
    { field: "actions", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
    { field: "date", headerName: t("field_date", "Date"), width: 130 },
    { field: "day", headerName: t("day", "Day"), width: 110 },
    { field: "code", headerName: t("field_code", "Code"), width: 150 },
    { field: "name", headerName: t("field_name", "Name"), width: 190 },
    { field: "type", headerName: t("field_type", "Holiday Type"), width: 150 },
    { field: "paid", headerName: t("field_paid", "Paid"), width: 90 },
    { field: "optional", headerName: t("field_optional", "Optional"), width: 100 },
    { field: "workAllowed", headerName: t("field_work_allowed", "Work Allowed"), width: 130 },
    { field: "compOff", headerName: t("field_comp_off", "Comp-Off"), width: 100 },
    { field: "status", headerName: t("field_is_active", "Status"), sortable: false, width: 110 },
  ], [t]);

  if (!blnRightsLoading && !blnCanView) {
    return <Alert severity="warning">{strRightsError || "You do not have permission to view Holiday Master."}</Alert>;
  }

  return (
    <Stack spacing={1.5} sx={{ pb: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{t("page_title", "Holiday Master")}</Typography>
      <Box className={styles.controlsCard} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.25 }}>
        <TextField controlId="holiday-master.search.year.select" select size="small" label={t("field_year", "Year")} value={objSearchDraft.intYear} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, intYear: Number(objEvent.target.value) }))}>
          {(objOptions.lstYears.length ? objOptions.lstYears : [objSearchDraft.intYear]).map((intYear) => <MenuItem key={intYear} value={intYear}>{intYear}</MenuItem>)}
        </TextField>
        <TextField controlId="holiday-master.search.text.input" size="small" label={t("search", "Search code or name")} value={objSearchDraft.strSearch} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strSearch: objEvent.target.value }))} />
        <TextField controlId="holiday-master.search.type.select" select size="small" label={t("field_type", "Holiday Type")} value={objSearchDraft.strHolidayTypeCode} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strHolidayTypeCode: objEvent.target.value }))}>
          <MenuItem value="">{t("all_types", "All Types")}</MenuItem>
          {objOptions.lstHolidayTypes.map((objType) => <MenuItem key={objType.strValueCode} value={objType.strValueCode}>{objType.strDisplayName}</MenuItem>)}
        </TextField>
        <TextField controlId="holiday-master.search.status.select" select size="small" label={t("field_is_active", "Status")} value={objSearchDraft.strStatus} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strStatus: objEvent.target.value as BooleanFilter }))}>
          <MenuItem value="all">{t("all_status", "All Status")}</MenuItem><MenuItem value="true">{t("status_active", "Active")}</MenuItem><MenuItem value="false">{t("status_inactive", "Inactive")}</MenuItem>
        </TextField>
        <TextField controlId="holiday-master.search.paid.select" select size="small" label={t("field_paid", "Paid")} value={objSearchDraft.strPaid} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strPaid: objEvent.target.value as BooleanFilter }))}>
          <MenuItem value="all">{t("all", "All")}</MenuItem><MenuItem value="true">{t("yes", "Yes")}</MenuItem><MenuItem value="false">{t("no", "No")}</MenuItem>
        </TextField>
        <TextField controlId="holiday-master.search.optional.select" select size="small" label={t("field_optional", "Optional")} value={objSearchDraft.strOptional} onChange={(objEvent) => setObjSearchDraft((objPrevious) => ({ ...objPrevious, strOptional: objEvent.target.value as BooleanFilter }))}>
          <MenuItem value="all">{t("all", "All")}</MenuItem><MenuItem value="true">{t("yes", "Yes")}</MenuItem><MenuItem value="false">{t("no", "No")}</MenuItem>
        </TextField>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", gridColumn: { lg: "span 2" }, justifyContent: { lg: "flex-end" } }}>
          <Button controlId="holiday-master.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setObjSearchApplied(objSearchDraft); void loadHolidays(objSearchDraft); }}>{t("search", "Search")}</Button>
          <Button controlId="holiday-master.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { const objReset = { ...objSearchDraft, strSearch: "", strHolidayTypeCode: "", strPaid: "all" as const, strOptional: "all" as const, strStatus: "all" as const }; setObjSearchDraft(objReset); setObjSearchApplied(objReset); void loadHolidays(objReset); }}>{t("clear", "Clear")}</Button>
        </Box>
      </Box>

      {blnLoading || blnRightsLoading ? <Box sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress /></Box> : (
        <Box className={styles.tableCard}>
          <CommonTable columns={lstColumns} rows={lstRows} rowIdField="id" exportFileName={`holidays_${objSearchApplied.intYear}`} showExportOptions showPaginationSummary minTableWidth={1370} emptyMessage={t("empty_message", "No holidays found.")} toolbarLeft={blnCanCreate ? <Button controlId="holiday-master.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={openAdd}>{t("add_button", "Add Holiday")}</Button> : undefined} testIdPrefix="holiday-master.list" />
        </Box>
      )}

      <CommonMasterDialog
        rootControlId="holiday-master.dialog"
        cancelButtonControlId="holiday-master.dialog.close.button"
        primaryButtonControlId="holiday-master.dialog.save.button"
        blnOpen={blnDialogOpen}
        strTitle={strMode === "add" ? t("dialog_add_title", "Add Holiday") : strMode === "edit" ? t("dialog_edit_title", "Edit Holiday") : t("dialog_view_title", "View Holiday")}
        strSecondaryLabel={t("close", "Close")}
        onClose={() => setBlnDialogOpen(false)}
        strPrimaryLabel={blnSaving ? t("saving", "Saving...") : t("save", "Save")}
        onPrimaryAction={() => void saveHoliday()}
        blnPrimaryDisabled={blnSaving || blnTranslating}
        blnHidePrimary={blnReadOnly}
        maxWidth="md"
        nodeContent={
          <fieldset disabled={blnReadOnly || blnSaving} style={{ border: 0, padding: 0, margin: 0 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5 }}>
              <TextField controlId="holiday-master.form.year.select" select size="small" label={t("field_year", "Year")} value={objForm.intHolidayYear} onChange={(objEvent) => { const intYear = Number(objEvent.target.value); setObjForm((objPrevious) => ({ ...objPrevious, intHolidayYear: intYear, dtHolidayDate: `${intYear}-${objPrevious.dtHolidayDate.slice(5)}` })); }}>
                {(objOptions.lstYears.length ? objOptions.lstYears : [objForm.intHolidayYear]).map((intYear) => <MenuItem key={intYear} value={intYear}>{intYear}</MenuItem>)}
              </TextField>
              <TextField controlId="holiday-master.form.date.input" type="date" size="small" label={t("field_date", "Date")} InputLabelProps={{ shrink: true }} value={objForm.dtHolidayDate} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, dtHolidayDate: objEvent.target.value }))} />
              <TextField controlId="holiday-master.form.code.input" size="small" label={t("field_code", "Code")} value={objForm.strHolidayCode} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, strHolidayCode: objEvent.target.value.toUpperCase() }))} inputProps={{ maxLength: 50 }} />
              <TextField controlId="holiday-master.form.type.select" select size="small" label={t("field_type", "Holiday Type")} value={objForm.strHolidayTypeCode} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, strHolidayTypeCode: objEvent.target.value }))}>
                {objOptions.lstHolidayTypes.map((objType) => <MenuItem key={objType.strValueCode} value={objType.strValueCode}>{objType.strDisplayName}</MenuItem>)}
              </TextField>
              <TextField controlId="holiday-master.form.name.input" size="small" label={t("field_name", "Name")} value={objForm.strHolidayName} onChange={(objEvent) => updateDefaultName(objEvent.target.value)} inputProps={{ maxLength: 150 }} sx={{ gridColumn: { sm: "span 2" } }} />
              <FormControlLabel control={<Switch controlId="holiday-master.form.paid.switch" checked={objForm.blnIsPaid} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, blnIsPaid: objEvent.target.checked }))} />} label={t("field_paid", "Paid")} />
              <FormControlLabel control={<Switch controlId="holiday-master.form.optional.switch" checked={objForm.blnIsOptional} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, blnIsOptional: objEvent.target.checked }))} />} label={t("field_optional", "Optional")} />
              <FormControlLabel control={<Switch controlId="holiday-master.form.work-allowed.switch" checked={objForm.blnWorkOnHolidayAllowed} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, blnWorkOnHolidayAllowed: objEvent.target.checked, blnCompOffEligible: objEvent.target.checked ? objPrevious.blnCompOffEligible : false }))} />} label={t("field_work_allowed", "Work on Holiday Allowed")} />
              <FormControlLabel control={<Switch controlId="holiday-master.form.comp-off.switch" checked={objForm.blnCompOffEligible} disabled={blnReadOnly || !objForm.blnWorkOnHolidayAllowed} onChange={(objEvent) => setObjForm((objPrevious) => ({ ...objPrevious, blnCompOffEligible: objEvent.target.checked }))} />} label={t("field_comp_off", "Comp-Off Eligible")} />
              <Stack direction="row" alignItems="center" spacing={1}><ActiveStatusSwitch controlId="holiday-master.form.active.switch" blnIsActive={objForm.blnIsActive} disabled={blnReadOnly} onChange={(blnIsActive) => setObjForm((objPrevious) => ({ ...objPrevious, blnIsActive }))} /><Typography>{t("field_is_active", "Active")}</Typography></Stack>
              <Box sx={{ gridColumn: { sm: "span 2" }, borderTop: "1px solid #e2e8f0", pt: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Typography sx={{ fontWeight: 800 }}>{t("multilingual_text", "Multilingual Text")}</Typography>{!blnReadOnly && objOptions.intSecondaryLanguageID ? <Button controlId="holiday-master.form.ai-translate.button" size="small" startIcon={<AutoAwesomeRoundedIcon />} disabled={blnTranslating || !objForm.strHolidayName.trim()} onClick={() => void translateSecondaryName()}>{blnTranslating ? t("translating", "Translating...") : t("translate", "AI Translate")}</Button> : null}</Stack>
                <Stack spacing={1}>
                  {objForm.lstTexts.map((objText, intIndex) => <Stack key={objText.intLanguageID} direction={{ xs: "column", sm: "row" }} spacing={1}><TextField controlId={`holiday-master.form.translation.${objText.intLanguageID}.language.input`} size="small" label={t("language", "Language")} value={objOptions.lstLanguages.find((objLanguage) => objLanguage.intID === objText.intLanguageID)?.strLabel ?? String(objText.intLanguageID)} disabled sx={{ width: { sm: 180 } }} /><TextField controlId={`holiday-master.form.translation.${objText.intLanguageID}.name.input`} size="small" fullWidth label={t("field_name", "Name")} value={objText.strHolidayName} onChange={(objEvent) => { const strName = objEvent.target.value; setObjForm((objPrevious) => ({ ...objPrevious, strHolidayName: objText.intLanguageID === objOptions.intDefaultLanguageID ? strName : objPrevious.strHolidayName, lstTexts: objPrevious.lstTexts.map((objRow, intRowIndex) => intRowIndex === intIndex ? { ...objRow, strHolidayName: strName } : objRow) })); }} /></Stack>)}
                </Stack>
              </Box>
            </Box>
          </fieldset>
        }
      />

      <Snackbar controlId="holiday-master.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" action={<Button controlId="holiday-master.notification.close.button" color="inherit" size="small" onClick={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}>{t("close", "Close")}</Button>}>{objToast.strMessage}</Alert></Snackbar>
    </Stack>
  );
}
