import ApprovalFlowEditorPage from "@/features/approval-flows/components/ApprovalFlowEditorPage";

type EditApprovalFlowPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// No mode in the URL: the editor opens read-only and offers Edit from the caller's rights.
export default async function EditApprovalFlowPage({ params }: EditApprovalFlowPageProps) {
  const { id } = await params;
  return <ApprovalFlowEditorPage intApprovalFlowID={Number(id)} />;
}
