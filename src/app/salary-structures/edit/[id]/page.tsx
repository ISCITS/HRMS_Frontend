import SalaryStructureEditorPage from "@/features/salary-structures/components/SalaryStructureEditorPage";

type EditSalaryStructurePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSalaryStructurePage({ params }: EditSalaryStructurePageProps) {
  const { id } = await params;
  return <SalaryStructureEditorPage strMode="edit" strSalaryStructureID={id} />;
}
