import PayrollGroupEditorPage from "@/features/payroll-groups/components/PayrollGroupEditorPage";

type EditPayrollGroupPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function EditPayrollGroupPage({ params, searchParams }: EditPayrollGroupPageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <PayrollGroupEditorPage
      strMode={objSearchParams?.mode === "view" ? "view" : "edit"}
      intPayrollGroupID={Number(id)}
    />
  );
}
