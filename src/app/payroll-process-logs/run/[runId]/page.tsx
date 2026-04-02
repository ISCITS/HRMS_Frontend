import PayrollProcessLogPage from "@/features/payroll-process-logs/components/PayrollProcessLogPage";

type PayrollProcessLogRunPageProps = {
  params: Promise<{ runId: string }>;
};

export default async function PayrollProcessLogRunPage({ params }: PayrollProcessLogRunPageProps) {
  const { runId } = await params;
  return <PayrollProcessLogPage intInitialPayrollRunID={Number(runId)} />;
}
