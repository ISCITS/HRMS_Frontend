import EmployeePayrollInputEditorPage from "@/features/payroll/components/EmployeePayrollInputEditorPage";

type PayrollEmployeePayrollInputEditPageProps = {
  params: Promise<{
    intInputID: string;
  }>;
};

export default async function PayrollEmployeePayrollInputEditPage({
  params,
}: PayrollEmployeePayrollInputEditPageProps) {
  const { intInputID } = await params;
  return (
    <EmployeePayrollInputEditorPage
      strMode="edit"
      intInputID={Number(intInputID)}
    />
  );
}
