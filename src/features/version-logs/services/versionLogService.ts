import {
  masterApiService,
  type VersionLogApiRecord
} from "@/services/master/MasterApiService";
import type {
  VersionLogDetailRecord,
  VersionLogFormValues,
  VersionLogListRecord
} from "@/features/version-logs/types";

type VersionLogFilters = {
  strSearchName: string;
  strSearchCode: string;
  strStatus: "All" | "Active" | "Inactive";
};

function mapApiRecord(dicRecord: VersionLogApiRecord): VersionLogDetailRecord {
  return {
    intID: dicRecord.intID,
    strVersionCode: dicRecord.strVersionCode,
    strVersionName: dicRecord.strVersionName,
    dtReleaseDate: dicRecord.dtReleaseDate,
    strReleaseNotes: dicRecord.strReleaseNotes,
    blnIsActive: dicRecord.blnIsActive,
    dtAddedOn: dicRecord.dtAddedOn,
    dtUpdatedOn: dicRecord.dtUpdatedOn
  };
}

function toPayload(dicValues: VersionLogFormValues) {
  return {
    strVersionCode: dicValues.strVersionCode.trim(),
    strVersionName: dicValues.strVersionName.trim(),
    dtReleaseDate: dicValues.dtReleaseDate.trim() || null,
    strReleaseNotes: dicValues.strReleaseNotes.trim() || null,
    blnIsActive: dicValues.blnIsActive
  };
}

function toStatusParam(strStatus: VersionLogFilters["strStatus"]) {
  return strStatus === "All" ? null : strStatus;
}

export function createInitialVersionLogForm(): VersionLogFormValues {
  return {
    strVersionCode: "",
    strVersionName: "",
    dtReleaseDate: "",
    strReleaseNotes: "",
    blnIsActive: true
  };
}

export function createInitialVersionLogFilters(): VersionLogFilters {
  return {
    strSearchName: "",
    strSearchCode: "",
    strStatus: "All"
  };
}

export function toVersionLogFormValues(dicRecord: VersionLogDetailRecord): VersionLogFormValues {
  return {
    strVersionCode: dicRecord.strVersionCode,
    strVersionName: dicRecord.strVersionName,
    dtReleaseDate: dicRecord.dtReleaseDate ?? "",
    strReleaseNotes: dicRecord.strReleaseNotes ?? "",
    blnIsActive: dicRecord.blnIsActive
  };
}

export const versionLogService = {
  async getVersionLogs(dicFilters: VersionLogFilters): Promise<VersionLogListRecord[]> {
    const objResult = await masterApiService.getVersionLogs({
      strSearchName: dicFilters.strSearchName.trim() || null,
      strSearchCode: dicFilters.strSearchCode.trim() || null,
      strStatus: toStatusParam(dicFilters.strStatus)
    });
    return objResult.Data.map(mapApiRecord);
  },

  async getVersionLogById(intVersionLogID: number): Promise<VersionLogDetailRecord> {
    const objResult = await masterApiService.getVersionLog(intVersionLogID);
    return mapApiRecord(objResult.Data);
  },

  async createVersionLog(dicValues: VersionLogFormValues): Promise<VersionLogDetailRecord> {
    const objResult = await masterApiService.createVersionLog(toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updateVersionLog(intVersionLogID: number, dicValues: VersionLogFormValues): Promise<VersionLogDetailRecord> {
    const objResult = await masterApiService.updateVersionLog(intVersionLogID, toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async setVersionLogStatus(intVersionLogID: number, blnIsActive: boolean): Promise<VersionLogDetailRecord> {
    const objResult = await masterApiService.setVersionLogStatus(intVersionLogID, blnIsActive);
    return mapApiRecord(objResult.Data);
  }
};
