import LeaveTypeEditorPage from "@/features/leave/components/LeaveTypeEditorPage";

type LeaveTypePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
};

export default async function LeaveTypeEditPage({ params, searchParams }: LeaveTypePageProps) {
  const { id } = await params;
  const { mode } = await searchParams;
  const strMode = (Array.isArray(mode) ? mode[0] : mode) === "view" ? "view" : "edit";
  return <LeaveTypeEditorPage strMode={strMode} intLeaveTypeID={Number(id)} />;
}
