import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";

type EditEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    backRoute?: string | string[];
  }>;
};

function resolveBackRoute(strRoute?: string | string[]) {
  const strCandidate = Array.isArray(strRoute) ? strRoute[0] : strRoute;
  if (!strCandidate || !strCandidate.startsWith("/")) {
    return "/employees";
  }
  return strCandidate;
}

export default async function EditEmployeePage({ params, searchParams }: EditEmployeePageProps) {
  const { id } = await params;
  const { backRoute } = await searchParams;
  // The segment is the record's public identifier (record_uuid), not the internal row id.
  return <EmployeeEditorScreen strMode="edit" strEmployeeID={id} strBackRoute={resolveBackRoute(backRoute)} />;
}
