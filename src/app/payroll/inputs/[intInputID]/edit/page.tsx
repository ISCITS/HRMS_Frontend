import EmployeePayrollInputEditorPage from "@/features/payroll/components/EmployeePayrollInputEditorPage";

type PayrollInputEditPageProps = {
  params: Promise<{
    intInputID: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function PayrollInputEditPage({
  params,
  searchParams,
}: PayrollInputEditPageProps) {
  const { intInputID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  const strMode = "edit" as const;

  return (
    <EmployeePayrollInputEditorPage
      strMode={strMode}
      strInputID={intInputID}
      strBackRoute={objSearchParams?.backRoute}
    />
  );
}
