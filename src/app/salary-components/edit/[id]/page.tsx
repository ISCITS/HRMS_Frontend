import SalaryComponentEditorPage from "@/features/salary-components/components/SalaryComponentEditorPage";

type EditSalaryComponentPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function EditSalaryComponentPage({ params, searchParams }: EditSalaryComponentPageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return <SalaryComponentEditorPage strMode="edit" intSalaryComponentID={Number(id)} strBackRoute={objSearchParams?.backRoute} />;
}
