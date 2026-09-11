import PayrollCycleEditorPage from "@/features/payroll-cycles/components/PayrollCycleEditorPage";

type EditPayrollCyclePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPayrollCyclePage({
  params
}: EditPayrollCyclePageProps) {
  const { id } = await params;
  return <PayrollCycleEditorPage strMode="edit" intPayrollCycleID={Number(id)} />;
}
