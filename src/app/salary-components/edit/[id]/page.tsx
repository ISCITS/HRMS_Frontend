import SalaryComponentEditorPage from "@/features/salary-components/components/SalaryComponentEditorPage";

type EditSalaryComponentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSalaryComponentPage({ params }: EditSalaryComponentPageProps) {
  const { id } = await params;
  return <SalaryComponentEditorPage strMode="edit" intSalaryComponentID={Number(id)} />;
}
