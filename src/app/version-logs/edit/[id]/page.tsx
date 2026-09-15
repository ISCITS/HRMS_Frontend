import VersionLogEditorPage from "@/features/version-logs/components/VersionLogEditorPage";

type EditVersionLogPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVersionLogPage({ params }: EditVersionLogPageProps) {
  const { id } = await params;
  const intVersionLogID = Number(id);
  const strMode = "edit";

  if (!Number.isFinite(intVersionLogID) || intVersionLogID <= 0) {
    return <VersionLogEditorPage strMode="view" />;
  }

  return <VersionLogEditorPage strMode={strMode} intVersionLogID={intVersionLogID} />;
}
