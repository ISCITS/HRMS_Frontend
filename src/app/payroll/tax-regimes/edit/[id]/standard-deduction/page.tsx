import TaxRuleMaintenancePage from "@/features/tax-regimes/components/TaxRuleMaintenancePage";

type TaxRulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayrollTaxRegimeStandardDeductionPage({ params }: TaxRulePageProps) {
  const { id } = await params;
  return <TaxRuleMaintenancePage intTaxRegimeID={Number(id)} strRuleType="standard-deduction" />;
}
