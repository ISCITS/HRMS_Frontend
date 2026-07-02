import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";

type EssMyProfileEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EssMyProfileEditPage({ params }: EssMyProfileEditPageProps) {
  const { id } = await params;

  return (
    <EmployeeEditorScreen
      strMode="edit"
      intEmployeeID={Number(id)}
      strBackRoute="/ess/my-profile"
      lstAccessModuleCodes={["MY_PROFILE"]}
      strMenuActionOverride="MY_PROFILE"
      strPageTitleOverride="Edit My Profile"
    />
  );
}
