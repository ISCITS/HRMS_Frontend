import { redirect } from "next/navigation";

type EditEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    backRoute?: string;
  }>;
};

export default async function EditEmployeePage({ params, searchParams }: EditEmployeePageProps) {
  const { id } = await params;
  const { backRoute } = await searchParams;
  const strQuery = backRoute ? `?backRoute=${encodeURIComponent(backRoute)}` : "";
  redirect(`/employees/edit/${id}${strQuery}`);
}
