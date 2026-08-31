import TaxRegimeWorkspaceTabs from "@/features/tax-regimes/components/TaxRegimeWorkspaceTabs";

type EditTaxRegimePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTaxRegimePage({ params }: EditTaxRegimePageProps) {
  const { id } = await params;
  return (
    <TaxRegimeWorkspaceTabs
      strMode={"edit"}
      intTaxRegimeID={Number(id)}
    />
  );
}
