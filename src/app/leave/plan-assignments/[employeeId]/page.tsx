import EmployeeLeavePlanDetailPage from "@/features/leave-plan/components/EmployeeLeavePlanDetailPage";

type EmployeeLeavePlanPageProps = { params: Promise<{ employeeId: string }> };

export default async function EmployeeLeavePlanPage({ params }: EmployeeLeavePlanPageProps) {
  const { employeeId } = await params;
  return <EmployeeLeavePlanDetailPage intEmployeeID={Number(employeeId)} />;
}
