import ApprovalFlowEditorPage from "@/features/approval-flows/components/ApprovalFlowEditorPage";

type EditApprovalFlowPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function EditApprovalFlowPage({ params, searchParams }: EditApprovalFlowPageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  return (
    <ApprovalFlowEditorPage
      intApprovalFlowID={Number(id)}
      blnReadOnlyView={objSearchParams?.mode === "view"}
    />
  );
}