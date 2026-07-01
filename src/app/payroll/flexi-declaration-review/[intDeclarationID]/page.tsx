import FlexiDeclarationReviewDetailPage from "@/features/flexi-pay-declaration/components/FlexiDeclarationReviewDetailPage";

type RouteProps = {
  params: {
    intDeclarationID: string;
  };
};

export default function PayrollFlexiDeclarationReviewDetailRoute({
  params,
}: RouteProps) {
  return (
    <FlexiDeclarationReviewDetailPage
      intDeclarationID={Number(params.intDeclarationID)}
    />
  );
}
