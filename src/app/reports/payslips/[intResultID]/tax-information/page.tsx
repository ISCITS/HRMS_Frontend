import TaxCalculationDetailPage from "@/features/payroll/components/TaxCalculationDetailPage";

type ReportPayslipTaxInformationRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function ReportPayslipTaxInformationRoute({
  params,
  searchParams,
}: ReportPayslipTaxInformationRouteProps) {
  const { intResultID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <TaxCalculationDetailPage
      strResultID={intResultID}
      blnPayslipScreen
      strBackRoute={objSearchParams?.backRoute}
    />
  );
}
