import { Suspense } from "react";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import RegularizationRequestsPage from "@/features/attendance-regularization/components/RegularizationRequestsPage";

export default function AttendanceRegularizationRequestsRoute() {
  return <Suspense fallback={<DottedLoader />}><RegularizationRequestsPage /></Suspense>;
}
