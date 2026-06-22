import FlexiDeclarationReviewDetailPage from "@/features/flexi-pay-declaration/components/FlexiDeclarationReviewDetailPage";

type Props = {
  params: {
    intDeclarationID: string;
  };
};

export default function PayrollFlexiDeclarationReviewDetailRoute({ params }: Props) {
  return <FlexiDeclarationReviewDetailPage intDeclarationID={Number(params.intDeclarationID)} />;
}
