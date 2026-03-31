import EmployeeSalaryDetailPage from "@/features/employee-salary/components/EmployeeSalaryDetailPage";

type EmployeeSalaryDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function EmployeeSalaryDetailRoute({ params, searchParams }: EmployeeSalaryDetailRouteProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return <EmployeeSalaryDetailPage intEmployeeID={Number(id)} blnViewMode={objSearchParams?.mode === "view"} />;
}
