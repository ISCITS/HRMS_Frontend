import PayrollGroupEditorPage from "@/features/payroll-groups/components/PayrollGroupEditorPage";

type EditPayrollGroupPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPayrollGroupPage({ params }: EditPayrollGroupPageProps) {
  const { id } = await params;
  return (
    <PayrollGroupEditorPage
      strMode={"edit"}
      intPayrollGroupID={Number(id)}
    />
  );
}
