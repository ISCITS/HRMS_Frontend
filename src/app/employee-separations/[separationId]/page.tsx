import EmployeeSeparationDetailPage from "@/features/employeeSeparation/components/EmployeeSeparationDetailPage";

type EmployeeSeparationDetailRouteProps = {
  params: Promise<{ separationId: string }>;
};

export default async function EmployeeSeparationDetailRoute({ params }: EmployeeSeparationDetailRouteProps) {
  const { separationId } = await params;
  return <EmployeeSeparationDetailPage strSeparationID={separationId} />;
}
