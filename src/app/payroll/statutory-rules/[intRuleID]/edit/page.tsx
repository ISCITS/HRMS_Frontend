import StatutoryRuleEditorPage from "@/features/payroll/components/StatutoryRuleEditorPage";

export default async function EditStatutoryRulePage({
  params,
}: {
  params: Promise<{ intRuleID: string }>;
}) {
  const { intRuleID } = await params;
  return <StatutoryRuleEditorPage strMode="edit" intRuleID={Number(intRuleID)} />;
}
