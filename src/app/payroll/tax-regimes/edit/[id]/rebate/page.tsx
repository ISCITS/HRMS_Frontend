import TaxRuleMaintenancePage from "@/features/tax-regimes/components/TaxRuleMaintenancePage";

type TaxRulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayrollTaxRegimeRebatePage({ params }: TaxRulePageProps) {
  const { id } = await params;
  return <TaxRuleMaintenancePage intTaxRegimeID={Number(id)} strRuleType="rebate" />;
}
