import TaxRegimeEditorPage from "@/features/tax-regimes/components/TaxRegimeEditorPage";

type EditTaxRegimePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function EditTaxRegimePage({ params, searchParams }: EditTaxRegimePageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <TaxRegimeEditorPage
      strMode={objSearchParams?.mode === "view" ? "view" : "edit"}
      intTaxRegimeID={Number(id)}
    />
  );
}
