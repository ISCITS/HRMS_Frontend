export type VersionLogListRecord = {
  intID: number;
  strVersionCode: string;
  strVersionName: string;
  dtReleaseDate: string | null;
  strReleaseNotes: string | null;
  blnIsActive: boolean;
  dtAddedOn: string;
  dtUpdatedOn: string;
};

export type VersionLogDetailRecord = VersionLogListRecord;

export type VersionLogFormValues = {
  strVersionCode: string;
  strVersionName: string;
  dtReleaseDate: string;
  strReleaseNotes: string;
  blnIsActive: boolean;
};
