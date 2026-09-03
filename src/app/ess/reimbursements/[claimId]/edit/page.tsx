import ReimbursementClaimEditorPage from "@/features/reimbursements/components/ReimbursementClaimEditorPage";

type ReimbursementClaimEditRouteProps = {
  params: Promise<{
    claimId: string;
  }>;
};

export default async function EssReimbursementClaimEditRoute({ params }: ReimbursementClaimEditRouteProps) {
  const { claimId } = await params;
  return <ReimbursementClaimEditorPage strClaimID={claimId} strMode="edit" />;
}
