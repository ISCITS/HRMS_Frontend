import SalaryComponentEditorPage from "@/features/salary-components/components/SalaryComponentEditorPage";

type AddSalaryComponentPageProps = {
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function AddSalaryComponentPage({ searchParams }: AddSalaryComponentPageProps) {
  const objSearchParams = searchParams ? await searchParams : undefined;
  return <SalaryComponentEditorPage strMode="add" strBackRoute={objSearchParams?.backRoute} />;
}
