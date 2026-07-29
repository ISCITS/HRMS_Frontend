import ReimbursementClaimDetailPage from "@/features/reimbursements/components/ReimbursementClaimDetailPage";

type ReimbursementClaimRouteProps = {
  params: Promise<{
    claimId: string;
  }>;
};

export default async function EssReimbursementClaimDetailRoute({ params }: ReimbursementClaimRouteProps) {
  const { claimId } = await params;
  return <ReimbursementClaimDetailPage intClaimID={Number(claimId)} />;
}
