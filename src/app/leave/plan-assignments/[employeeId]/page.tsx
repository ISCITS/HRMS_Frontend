import EmployeeLeavePlanDetailPage from "@/features/leave-plan/components/EmployeeLeavePlanDetailPage";

type EmployeeLeavePlanPageProps = {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
};

export default async function EmployeeLeavePlanPage({ params, searchParams }: EmployeeLeavePlanPageProps) {
  const { employeeId } = await params;
  const { mode } = await searchParams;
  const strMode = (Array.isArray(mode) ? mode[0] : mode) === "view" ? "view" : "manage";
  return <EmployeeLeavePlanDetailPage intEmployeeID={Number(employeeId)} strMode={strMode} />;
}
