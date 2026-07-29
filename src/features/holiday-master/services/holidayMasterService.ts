import { authHelpers } from "@/lib/auth";
import { masterApiService, type HolidayApiRecord, type HolidayFormOptionsApiRecord } from "@/services/master/MasterApiService";
import type { HolidayFilters, HolidayFormValues } from "@/features/holiday-master/types/HolidayTypes";

function toPayload(objValues: HolidayFormValues) {
  const intLanguageID = authHelpers.getLanguageID() ?? objValues.lstTexts[0]?.intLanguageID ?? 1;
  const lstTexts = objValues.lstTexts
    .filter((objText) => objText.intLanguageID > 0 && objText.strHolidayName.trim())
    .map((objText) => ({
      intLanguageID: objText.intLanguageID,
      strHolidayName: objText.strHolidayName.trim(),
      strHolidayDescription: objText.strHolidayDescription.trim() || null,
    }));
  return {
    ...objValues,
    strHolidayCode: objValues.strHolidayCode.trim().toUpperCase(),
    strHolidayName: objValues.strHolidayName.trim(),
    strHolidayDescription: objValues.strHolidayDescription.trim() || null,
    strHolidayTypeCode: objValues.strHolidayTypeCode.trim().toUpperCase(),
    intLanguageID,
    lstTexts,
  };
}

export const holidayMasterService = {
  async list(intYear: number, objFilters: HolidayFilters): Promise<HolidayApiRecord[]> {
    const objResult = await masterApiService.getHolidays(intYear, {
      strSearchName: objFilters.strSearchName || undefined,
      strSearchCode: objFilters.strSearchCode || undefined,
      strHolidayTypeCode: objFilters.strHolidayTypeCode || undefined,
      strStatus: objFilters.strStatus || undefined,
      dtFromDate: objFilters.dtFromDate || undefined,
      dtToDate: objFilters.dtToDate || undefined,
    });
    return objResult.Data;
  },
  async detail(intID: number): Promise<HolidayApiRecord> {
    return (await masterApiService.getHoliday(intID)).Data;
  },
  async options(): Promise<HolidayFormOptionsApiRecord> {
    return (await masterApiService.getHolidayFormOptions()).Data;
  },
  async create(objValues: HolidayFormValues): Promise<HolidayApiRecord> {
    return (await masterApiService.createHoliday(toPayload(objValues))).Data;
  },
  async update(intID: number, objValues: HolidayFormValues): Promise<HolidayApiRecord> {
    return (await masterApiService.updateHoliday(intID, toPayload(objValues))).Data;
  },
  async setStatus(intID: number, blnIsActive: boolean): Promise<void> {
    await masterApiService.bulkHolidayStatus([intID], blnIsActive);
  },
  async translateText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number): Promise<string> {
    const objResult = await masterApiService.translateHolidayText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
