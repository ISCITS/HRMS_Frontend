import UserGroupRightsPage from "@/features/security/components/UserGroupRightsPage";

type SecurityUserGroupRightsRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function SecurityUserGroupRightsRoute({ params }: SecurityUserGroupRightsRouteProps) {
  const { id } = await params;
  return <UserGroupRightsPage intUserGroupID={Number(id)} />;
}
