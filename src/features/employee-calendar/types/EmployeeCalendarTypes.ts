export type EmployeeCalendarEvent = {
  strEventType: "holiday" | "leave" | "attendance" | "roster";
  strStatus: string;
  strLabel: string;
  intSourceID?: number | null;
  blnIsOptional?: boolean;
  blnIsHalfDay?: boolean;
  strHalfDayPart?: string | null;
};

export type EmployeeCalendarDay = {
  dtDate: string;
  strPrimaryStatus?: string | null;
  blnOutsideServicePeriod: boolean;
  lstEvents: EmployeeCalendarEvent[];
};

export type EmployeeCalendarData = {
  intEmployeeID: number;
  dtFromDate: string;
  dtToDate: string;
  objServicePeriod: { dtDateOfJoining: string; dtDateOfExit?: string | null };
  lstDays: EmployeeCalendarDay[];
  lstLegend: string[];
};
