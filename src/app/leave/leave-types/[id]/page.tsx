import LeaveTypeEditorPage from "@/features/leave/components/LeaveTypeEditorPage";

type LeaveTypePageProps = {
  params: Promise<{ id: string }>;
};

// No mode in the URL. The editor opens read-only and enables editing from the capabilities the
// server returns with the record, so there is nothing here for a user to flip.
export default async function LeaveTypeEditPage({ params }: LeaveTypePageProps) {
  const { id } = await params;
  return <LeaveTypeEditorPage strMode="edit" intLeaveTypeID={Number(id)} />;
}
