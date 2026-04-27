import EmployeePayrollInputEditorPage from "@/features/payroll/components/EmployeePayrollInputEditorPage";

type PayrollEmployeePayrollInputEditPageProps = {
  params: Promise<{
    intInputID: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function PayrollEmployeePayrollInputEditPage({
  params,
  searchParams,
}: PayrollEmployeePayrollInputEditPageProps) {
  const { intInputID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  const strMode = objSearchParams?.mode === "view" ? "view" : "edit";
  return (
    <EmployeePayrollInputEditorPage
      strMode={strMode}
      intInputID={Number(intInputID)}
    />
  );
}
