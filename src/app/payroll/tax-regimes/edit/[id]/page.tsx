import TaxRegimeWorkspaceTabs from "@/features/tax-regimes/components/TaxRegimeWorkspaceTabs";

type EditTaxRegimePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function EditTaxRegimePage({ params, searchParams }: EditTaxRegimePageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <TaxRegimeWorkspaceTabs
      strMode={objSearchParams?.mode === "view" ? "view" : "edit"}
      intTaxRegimeID={Number(id)}
    />
  );
}
