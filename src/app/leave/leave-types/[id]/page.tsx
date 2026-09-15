import LeaveTypeEditorPage from "@/features/leave/components/LeaveTypeEditorPage";

type LeaveTypePageProps = {
  params: Promise<{ id: string }>;
};

// The segment is the record's public identifier (record_uuid). No internal id and no mode appear
// in the URL; the editor opens read-only and enables editing from the server's capabilities.
export default async function LeaveTypeEditPage({ params }: LeaveTypePageProps) {
  const { id } = await params;
  return <LeaveTypeEditorPage strMode="edit" strLeaveTypeID={id} />;
}
