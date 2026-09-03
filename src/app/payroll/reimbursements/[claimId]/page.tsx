import ReimbursementReviewDetailPage from "@/features/reimbursements/components/ReimbursementReviewDetailPage";

type PayrollReimbursementDetailRouteProps = {
  params: Promise<{
    claimId: string;
  }>;
};

export default async function PayrollReimbursementDetailRoute({ params }: PayrollReimbursementDetailRouteProps) {
  const { claimId } = await params;
  return <ReimbursementReviewDetailPage strClaimRecordUUID={claimId} />;
}
