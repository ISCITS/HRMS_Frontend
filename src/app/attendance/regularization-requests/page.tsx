import { Suspense } from "react";
import { CircularProgress } from "@mui/material";
import RegularizationRequestsPage from "@/features/attendance-regularization/components/RegularizationRequestsPage";

export default function AttendanceRegularizationRequestsRoute() {
  return <Suspense fallback={<CircularProgress />}><RegularizationRequestsPage /></Suspense>;
}
