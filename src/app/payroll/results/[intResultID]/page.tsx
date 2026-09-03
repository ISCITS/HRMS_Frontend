import PayrollResultDetailPage from "@/features/payroll/components/PayrollResultDetailPage";

type PayrollResultAliasDetailRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
};

export default async function PayrollResultAliasDetailRoute({
  params,
}: PayrollResultAliasDetailRouteProps) {
  const { intResultID } = await params;
  return <PayrollResultDetailPage strResultID={intResultID} />;
}
