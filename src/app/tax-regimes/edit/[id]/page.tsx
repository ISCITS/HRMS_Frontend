import TaxRegimeEditorPage from "@/features/tax-regimes/components/TaxRegimeEditorPage";

type EditTaxRegimePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTaxRegimePage({ params }: EditTaxRegimePageProps) {
  const { id } = await params;
  return (
    <TaxRegimeEditorPage
      strMode={"edit"}
      intTaxRegimeID={Number(id)}
    />
  );
}
