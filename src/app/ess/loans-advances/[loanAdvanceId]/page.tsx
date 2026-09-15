import LoanAdvanceDetailPage from "@/features/payroll/components/LoanAdvanceDetailPage";

type EssLoanAdvanceDetailRouteProps = {
  params: Promise<{ loanAdvanceId: string }>;
};

export default async function EssLoanAdvanceDetailRoute({ params }: EssLoanAdvanceDetailRouteProps) {
  const { loanAdvanceId } = await params;
  return <LoanAdvanceDetailPage strLoanAdvanceID={loanAdvanceId} strMode="ess" />;
}
