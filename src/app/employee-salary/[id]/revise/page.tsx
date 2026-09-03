import EmployeeSalaryDetailPage from "@/features/employee-salary/components/EmployeeSalaryDetailPage";

type EmployeeSalaryRevisionRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EmployeeSalaryRevisionRoute({ params }: EmployeeSalaryRevisionRouteProps) {
  const { id } = await params;
  return (
    <EmployeeSalaryDetailPage
      strEmployeeID={id}
      blnRevisionMode
      strReturnTo={`/employee-salary/${id}`}
    />
  );
}
