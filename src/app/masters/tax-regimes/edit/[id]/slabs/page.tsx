import { redirect } from "next/navigation";

type MastersEditTaxSlabsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MastersEditTaxSlabsPage({ params }: MastersEditTaxSlabsPageProps) {
  const { id } = await params;
  redirect(`/payroll/tax-regimes/edit/${id}/slabs`);
}
