import FlexiDeclarationReviewDetailPage from "@/features/flexi-pay-declaration/components/FlexiDeclarationReviewDetailPage";

export default function PayrollFlexiDeclarationReviewDetailRoute() {
  return <FlexiDeclarationReviewDetailPage />;
type RouteProps = {
  params: Promise<{ intDeclarationID: string }>;
};

export default async function PayrollFlexiDeclarationReviewDetailRoute({ params }: RouteProps) {
  const { intDeclarationID } = await params;
  return <FlexiDeclarationReviewDetailPage intDeclarationID={Number(intDeclarationID)} />;
}
