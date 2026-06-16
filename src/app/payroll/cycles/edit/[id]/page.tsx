import PayrollCycleEditorPage from "@/features/payroll-cycles/components/PayrollCycleEditorPage";

type EditPayrollCyclePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function EditPayrollCyclePage({ params, searchParams }: EditPayrollCyclePageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <PayrollCycleEditorPage
      strMode={objSearchParams?.mode === "view" ? "view" : "edit"}
      intPayrollCycleID={Number(id)}
    />
  );
}
