import LeavePlanEditorPage from "@/features/leave-plan/components/LeavePlanEditorPage";

type NewLeavePlanPageProps = { searchParams: Promise<{ returnTo?: string | string[] }> };

export default async function NewLeavePlanPage({ searchParams }: NewLeavePlanPageProps) {
  const { returnTo } = await searchParams;
  return <LeavePlanEditorPage strMode="new" strReturnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />;
}
