import EmployeeLeavePlanDetailPage from "@/features/leave-plan/components/EmployeeLeavePlanDetailPage";

type EmployeeLeavePlanPageProps = {
  params: Promise<{ employeeId: string }>;
};

// The segment is the employee's public identifier (record_uuid), not the internal row id, and no
// mode travels in the URL - the screen opens read-only and offers Edit from the caller's rights.
export default async function EmployeeLeavePlanPage({ params }: EmployeeLeavePlanPageProps) {
  const { employeeId } = await params;
  return <EmployeeLeavePlanDetailPage strEmployeeID={employeeId} />;
}
