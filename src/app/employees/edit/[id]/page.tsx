import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";

type EditEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { id } = await params;
  return <EmployeeEditorScreen strMode="edit" intEmployeeID={Number(id)} />;
}
