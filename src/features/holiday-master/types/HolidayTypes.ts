import type { HolidayApiRecord } from "@/services/master/MasterApiService";

export type HolidayTranslationForm = {
  intLanguageID: number;
  strLanguageName: string;
  strHolidayName: string;
  strHolidayDescription: string;
};

export type HolidayFormValues = {
  intHolidayYear: number;
  dtHolidayDate: string;
  strHolidayCode: string;
  strHolidayName: string;
  strHolidayDescription: string;
  strHolidayTypeCode: string;
  blnIsPaid: boolean;
  blnIsOptional: boolean;
  blnIsWorkOnHoliday: boolean;
  blnIsCompensatoryOffApplicable: boolean;
  blnIsActive: boolean;
  lstTexts: HolidayTranslationForm[];
};

export type HolidayFilters = {
  strSearchName: string;
  strSearchCode: string;
  strHolidayTypeCode: string;
  strStatus: string;
  dtFromDate: string;
  dtToDate: string;
};

export type HolidayRecord = HolidayApiRecord;
