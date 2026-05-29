import FNFSettlementDetailPage from "@/features/payroll/components/FNFSettlementDetailPage";

type PayrollFNFSettlementDetailRouteProps = {
  params: Promise<{ settlementId: string }>;
};

export default async function PayrollFNFSettlementDetailRoute({ params }: PayrollFNFSettlementDetailRouteProps) {
  const { settlementId } = await params;
  return <FNFSettlementDetailPage intSettlementID={Number(settlementId)} />;
}
