import { redirect } from "next/navigation";

type MastersEditTaxRegimePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function MastersEditTaxRegimePage({ params, searchParams }: MastersEditTaxRegimePageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  const strQuery = objSearchParams?.mode ? `?mode=${encodeURIComponent(objSearchParams.mode)}` : "";
  redirect(`/payroll/tax-regimes/edit/${id}${strQuery}`);
}
