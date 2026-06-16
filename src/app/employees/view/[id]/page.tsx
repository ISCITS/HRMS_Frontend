import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";

type ViewEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ViewEmployeePage({ params }: ViewEmployeePageProps) {
  const { id } = await params;
  return <EmployeeEditorScreen strMode="view" intEmployeeID={Number(id)} />;
}
