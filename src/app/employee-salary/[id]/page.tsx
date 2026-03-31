import EmployeeSalaryDetailPage from "@/features/employee-salary/components/EmployeeSalaryDetailPage";

type EmployeeSalaryDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeSalaryDetailRoute({ params }: EmployeeSalaryDetailRouteProps) {
  const { id } = await params;
  return <EmployeeSalaryDetailPage intEmployeeID={Number(id)} />;
}
