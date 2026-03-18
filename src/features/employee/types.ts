export type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
};

export type EmployeeFormValues = Omit<EmployeeRecord, "id"> & {
  id?: string;
};
