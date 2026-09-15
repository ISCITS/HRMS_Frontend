import UserGroupAssignmentsPage from "@/features/security/components/UserGroupAssignmentsPage";

type UserGroupAssignmentRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function UserGroupAssignmentRoute({ params }: UserGroupAssignmentRouteProps) {
  const { id } = await params;
  return <UserGroupAssignmentsPage intUserID={Number(id)} />;
}
