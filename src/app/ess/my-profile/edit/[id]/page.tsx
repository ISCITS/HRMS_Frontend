import MyProfileEditClient from "./MyProfileEditClient";

type EssMyProfileEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EssMyProfileEditPage({ params }: EssMyProfileEditPageProps) {
  const { id } = await params;

  return <MyProfileEditClient intEmployeeID={Number(id)} />;
}
