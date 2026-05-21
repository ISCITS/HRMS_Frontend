import EmployeePayrollInputEditorPage from "@/features/payroll/components/EmployeePayrollInputEditorPage";

type PayrollInputEditPageProps = {
  params: Promise<{
    intInputID: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
    backRoute?: string;
  }>;
};

export default async function PayrollInputEditPage({
  params,
  searchParams,
}: PayrollInputEditPageProps) {
  const { intInputID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  const strMode = objSearchParams?.mode === "view" ? "view" : "edit";

  return (
    <EmployeePayrollInputEditorPage
      strMode={strMode}
      intInputID={Number(intInputID)}
      strBackRoute={objSearchParams?.backRoute}
    />
  );
}
