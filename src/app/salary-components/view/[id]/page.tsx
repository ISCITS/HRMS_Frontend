import SalaryComponentEditorPage from "@/features/salary-components/components/SalaryComponentEditorPage";

type ViewSalaryComponentPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function ViewSalaryComponentPage({ params, searchParams }: ViewSalaryComponentPageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return <SalaryComponentEditorPage strMode="view" strSalaryComponentID={id} strBackRoute={objSearchParams?.backRoute} />;
}
