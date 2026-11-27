import EmployeeAllocationPanel from "@/features/employee-salary-allocation/components/EmployeeAllocationPanel";

type EmployeeAllocationPageProps = {
  params: Promise<{
    componentId: string;
  }>;
};

export default async function EmployeeAllocationPage({ params }: EmployeeAllocationPageProps) {
  const { componentId } = await params;
  return <EmployeeAllocationPanel intEmployeeSalaryComponentID={Number(componentId)} />;
}
