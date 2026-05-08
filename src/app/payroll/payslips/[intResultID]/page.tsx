import PayrollResultDetailPage from "@/features/payroll/components/PayrollResultDetailPage";

type PayrollResultDetailRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function PayrollResultDetailRoute({
  params,
  searchParams,
}: PayrollResultDetailRouteProps) {
  const { intResultID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <PayrollResultDetailPage
      intResultID={Number(intResultID)}
      blnPayslipScreen
      strBackRoute={objSearchParams?.backRoute}
    />
  );
}
