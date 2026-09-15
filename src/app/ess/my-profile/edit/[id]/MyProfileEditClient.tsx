"use client";

import EmployeeEditorScreen from "@/features/employee/components/EmployeeEditorScreen";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

type MyProfileEditClientProps = {
  intEmployeeID: number;
};

export default function MyProfileEditClient({ intEmployeeID }: MyProfileEditClientProps) {
  const { t } = useModuleLabels("my-profile");

  return (
    <EmployeeEditorScreen
      strMode="edit"
      // ESS still resolves its own employee by internal id; the endpoint dual-accepts, and
      // that use is counted until this flow carries the public identifier too.
      strEmployeeID={String(intEmployeeID)}
      blnHideSalarySummaryCard
      strBackRoute="/ess/my-profile"
      lstAccessModuleCodes={["MY_PROFILE"]}
      strMenuActionOverride="MY_PROFILE"
      strPageTitleOverride={t("edit_page_title", "Edit My Profile")}
    />
  );
}
