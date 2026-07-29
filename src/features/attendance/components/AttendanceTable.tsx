import { Chip } from "@mui/material";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import dicConstant from "@/constants/Constant.json";

const records = [
  { date: "2026-02-23", status: "Present", checkIn: "09:05", checkOut: "18:12" },
  { date: "2026-02-24", status: "Present", checkIn: "09:02", checkOut: "18:01" },
  { date: "2026-02-25", status: "Absent", checkIn: "-", checkOut: "-" }
];

// Displays attendance rows through the common reusable data grid.
export default function AttendanceTable() {
  /*
  Functional responsibility:
  - Define attendance columns and bind attendance rows into the common grid.
  
  Inputs:
  - Uses local mock records (replace with API data later).
  
  Output:
  - Renders attendance grid with filtering/sorting/pagination from CommonTable.
  
  Failure behavior:
  - Empty record list is handled by CommonTable empty-state row.
  */
  const lstRows = records.map((dicRecord) => ({
    ...dicRecord,
    status: (
      <Chip
        size="small"
        label={dicRecord.status}
        color={dicRecord.status === "Present" ? "success" : "error"}
        variant="outlined"
      />
    )
  }));

  const columns: CommonTableColumn<(typeof lstRows)[number]>[] = [
    { field: "date", headerName: dicConstant.attendance.grid.date },
    { field: "status", headerName: dicConstant.attendance.grid.status, sortable: false, filterable: false },
    { field: "checkIn", headerName: dicConstant.attendance.grid.checkIn },
    { field: "checkOut", headerName: dicConstant.attendance.grid.checkOut }
  ];

  return <CommonTable columns={columns} rows={lstRows} rowIdField="date" withPaper={false} />;
}

