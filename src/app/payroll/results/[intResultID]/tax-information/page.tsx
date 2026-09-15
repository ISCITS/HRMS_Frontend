import TaxCalculationDetailPage from "@/features/payroll/components/TaxCalculationDetailPage";

type PayrollResultTaxInformationRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function PayrollResultTaxInformationRoute({
  params,
  searchParams,
}: PayrollResultTaxInformationRouteProps) {
  const { intResultID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <TaxCalculationDetailPage
      strResultID={intResultID}
      strBackRoute={objSearchParams?.backRoute}
    />
  );
}
