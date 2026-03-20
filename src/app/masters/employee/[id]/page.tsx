import EmployeeProfileWorkspace from "@/features/employeeMaster/EmployeeProfileWorkspace";

export default async function EmployeeMasterDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const dicParams = await params;
  return <EmployeeProfileWorkspace intEmployeeID={Number(dicParams.id)} />;
}
