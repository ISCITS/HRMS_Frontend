import SeparatePayEntitlementPanel from "@/features/employee-salary-allocation/components/SeparatePayEntitlementPanel";

type SeparatePayEntitlementPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SeparatePayEntitlementPage({ params }: SeparatePayEntitlementPageProps) {
  const { id } = await params;
  return <SeparatePayEntitlementPanel strEmployeeID={id} />;
}
