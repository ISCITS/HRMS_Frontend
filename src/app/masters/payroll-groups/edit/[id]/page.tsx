import PayrollGroupEditorPage from "@/features/payroll-groups/components/PayrollGroupEditorPage";

type EditPayrollGroupPageProps = {
  params: Promise<{ id: string }>;
};

// The segment is the record's public identifier (record_uuid), not the internal row id, and no
// mode travels in the URL — the editor opens read-only and offers Edit from the caller's rights.
export default async function EditPayrollGroupPage({ params }: EditPayrollGroupPageProps) {
  const { id } = await params;
  return <PayrollGroupEditorPage strMode="edit" strPayrollGroupID={id} />;
}
