import Form16DocumentPage from "@/features/payroll/components/Form16DocumentPage";

export default async function ReportsForm16DocumentRoute({
  params,
}: {
  params: Promise<{ intForm16ID: string }>;
}) {
  const { intForm16ID } = await params;
  return <Form16DocumentPage intForm16ID={Number(intForm16ID)} strBackRoute="/reports/form16" />;
}
