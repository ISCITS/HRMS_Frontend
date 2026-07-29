import VersionLogEditorPage from "@/features/version-logs/components/VersionLogEditorPage";

type EditVersionLogPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function EditVersionLogPage({
  params,
  searchParams
}: EditVersionLogPageProps) {
  const { id } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  const intVersionLogID = Number(id);
  const strMode = objSearchParams?.mode === "view" ? "view" : "edit";

  if (!Number.isFinite(intVersionLogID) || intVersionLogID <= 0) {
    return <VersionLogEditorPage strMode="view" />;
  }

  return <VersionLogEditorPage strMode={strMode} intVersionLogID={intVersionLogID} />;
}
