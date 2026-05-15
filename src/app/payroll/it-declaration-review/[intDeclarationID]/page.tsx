import ITDeclarationReviewDetailPage from "@/features/it-declaration/components/ITDeclarationReviewDetailPage";

type RouteProps = {
  params: Promise<{ intDeclarationID: string }>;
};

export default async function PayrollItDeclarationReviewDetailRoute({ params }: RouteProps) {
  const { intDeclarationID } = await params;
  return <ITDeclarationReviewDetailPage intDeclarationID={Number(intDeclarationID)} />;
}

