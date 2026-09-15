import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";

type ViewEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ViewEmployeePage({ params }: ViewEmployeePageProps) {
  const { id } = await params;
  // The segment is the record's public identifier (record_uuid), not the internal row id.
  return <EmployeeEditorScreen strMode="view" strEmployeeID={id} />;
}
