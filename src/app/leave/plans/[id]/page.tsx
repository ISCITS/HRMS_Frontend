import LeavePlanEditorPage from "@/features/leave-plan/components/LeavePlanEditorPage";

type LeavePlanDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

// No mode in the URL: the editor opens read-only and offers Edit from the caller's rights.
export default async function LeavePlanDetailPage({ params, searchParams }: LeavePlanDetailPageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  return (
    <LeavePlanEditorPage
      strMode="edit"
      intPlanID={Number(id)}
      strReturnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
    />
  );
}
