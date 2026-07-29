import PayrollRunDetailDashboardPage from "@/features/payroll/components/PayrollRunDetailDashboardPage";

type PayrollRunDetailRouteProps = {
  params: Promise<{ intRunID: string }>;
};

export default async function PayrollRunDetailRoute({
  params,
}: PayrollRunDetailRouteProps) {
  const { intRunID } = await params;
  return <PayrollRunDetailDashboardPage intRunID={Number(intRunID)} />;
}
