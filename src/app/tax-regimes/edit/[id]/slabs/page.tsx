import TaxSlabMaintenancePage from "@/features/tax-regimes/components/TaxSlabMaintenancePage";

type EditTaxSlabsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTaxSlabsPage({ params }: EditTaxSlabsPageProps) {
  const { id } = await params;
  return <TaxSlabMaintenancePage intTaxRegimeID={Number(id)} />;
}
