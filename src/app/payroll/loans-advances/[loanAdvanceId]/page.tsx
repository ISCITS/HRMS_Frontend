import LoanAdvanceDetailPage from "@/features/payroll/components/LoanAdvanceDetailPage";

type PayrollLoanAdvanceDetailRouteProps = {
  params: Promise<{ loanAdvanceId: string }>;
};

export default async function PayrollLoanAdvanceDetailRoute({ params }: PayrollLoanAdvanceDetailRouteProps) {
  const { loanAdvanceId } = await params;
  return <LoanAdvanceDetailPage strLoanAdvanceID={loanAdvanceId} />;
}
