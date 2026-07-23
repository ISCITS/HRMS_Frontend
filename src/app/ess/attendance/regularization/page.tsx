import { Suspense } from "react";

import { CircularProgress } from "@mui/material";

import AttendanceRegularizationPage from "@/features/attendance-regularization/components/AttendanceRegularizationPage";

export default function EssAttendanceRegularizationRoute() {
  return <Suspense fallback={<CircularProgress />}><AttendanceRegularizationPage /></Suspense>;
}
