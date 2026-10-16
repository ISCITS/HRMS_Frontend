import { Suspense } from "react";

import { DottedLoader } from "@/components/shared/BlockingLoader";
import AttendanceRegularizationPage from "@/features/attendance-regularization/components/AttendanceRegularizationPage";

export default function EssAttendanceRegularizationRoute() {
  return <Suspense fallback={<DottedLoader />}><AttendanceRegularizationPage /></Suspense>;
}
