import { redirect } from "next/navigation";

type EditTaxSlabsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTaxSlabsPage({ params }: EditTaxSlabsPageProps) {
  const { id } = await params;
  redirect(`/payroll/tax-regimes/edit/${id}?tab=slabs`);
}
