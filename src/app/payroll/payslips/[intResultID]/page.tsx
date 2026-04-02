import PayrollResultDetailPage from "@/features/payroll/components/PayrollResultDetailPage";

type PayrollResultDetailRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
};

export default async function PayrollResultDetailRoute({
  params,
}: PayrollResultDetailRouteProps) {
  const { intResultID } = await params;
  return <PayrollResultDetailPage intResultID={Number(intResultID)} />;
}
