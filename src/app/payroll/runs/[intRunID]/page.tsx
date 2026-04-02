import PayrollRunDetailPage from "@/features/payroll/components/PayrollRunDetailPage";

type PayrollRunDetailRouteProps = {
  params: Promise<{ intRunID: string }>;
};

export default async function PayrollRunDetailRoute({
  params,
}: PayrollRunDetailRouteProps) {
  const { intRunID } = await params;
  return <PayrollRunDetailPage intRunID={Number(intRunID)} />;
}
