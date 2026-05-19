import EmployeeSalaryDetailPage from "@/features/employee-salary/components/EmployeeSalaryDetailPage";

type EmployeeSalaryDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
    returnTo?: string | string[];
  }>;
};

function resolveReturnTo(strRoute?: string | string[]) {
  const strCandidate = Array.isArray(strRoute) ? strRoute[0] : strRoute;
  if (!strCandidate || !strCandidate.startsWith("/") || strCandidate.startsWith("//")) {
    return "/employee-salary";
  }
  return strCandidate;
}

export default async function EmployeeSalaryDetailRoute({ params, searchParams }: EmployeeSalaryDetailRouteProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <EmployeeSalaryDetailPage
      intEmployeeID={Number(id)}
      blnViewMode={objSearchParams?.mode === "view"}
      strReturnTo={resolveReturnTo(objSearchParams?.returnTo)}
    />
  );
}
