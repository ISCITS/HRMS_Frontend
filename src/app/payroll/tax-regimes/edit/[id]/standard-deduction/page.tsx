import { redirect } from "next/navigation";

type TaxRulePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayrollTaxRegimeStandardDeductionPage({ params }: TaxRulePageProps) {
  const { id } = await params;
  redirect(`/payroll/tax-regimes/edit/${id}?tab=rules`);
}
