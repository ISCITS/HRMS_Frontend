import { redirect } from "next/navigation";

type MastersEditTaxRegimePageProps = {
  params: Promise<{ id: string }>;
};

export default async function MastersEditTaxRegimePage({ params }: MastersEditTaxRegimePageProps) {
  const { id } = await params;
  const strQuery = "";
  redirect(`/payroll/tax-regimes/edit/${id}${strQuery}`);
}
