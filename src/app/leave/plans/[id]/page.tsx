import LeavePlanEditorPage from "@/features/leave-plan/components/LeavePlanEditorPage";

type LeavePlanDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

// The segment is the plan's public identifier (record_uuid), not the internal row id, and no mode
// travels in the URL - the editor opens read-only and offers Edit from the caller's rights.
export default async function LeavePlanDetailPage({ params, searchParams }: LeavePlanDetailPageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  return (
    <LeavePlanEditorPage
      strMode="edit"
      strPlanID={id}
      strReturnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo}
    />
  );
}
