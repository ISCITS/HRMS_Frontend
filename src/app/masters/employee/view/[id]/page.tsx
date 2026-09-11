import { redirect } from "next/navigation";

type ViewEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ViewEmployeePage({ params }: ViewEmployeePageProps) {
  const { id } = await params;
  redirect(`/employees/view/${id}`);
}
