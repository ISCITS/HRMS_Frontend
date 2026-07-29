import LeavePlanEditorPage from "@/features/leave-plan/components/LeavePlanEditorPage";

type LeavePlanDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[]; returnTo?: string | string[] }>;
};

export default async function LeavePlanDetailPage({ params, searchParams }: LeavePlanDetailPageProps) {
  const { id } = await params;
  const { mode, returnTo } = await searchParams;
  const strModeValue = Array.isArray(mode) ? mode[0] : mode;
  return <LeavePlanEditorPage strMode={strModeValue === "view" ? "view" : "edit"} intPlanID={Number(id)} strReturnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />;
}
