import PayslipDocumentPage from "@/features/payroll/components/PayslipDocumentPage";

type EssPayslipDocumentRouteProps = {
  params: Promise<{
    intPayslipID: string;
  }>;
};

export default async function EssPayslipDocumentRoute({ params }: EssPayslipDocumentRouteProps) {
  const { intPayslipID } = await params;
  return <PayslipDocumentPage strPayslipID={intPayslipID} strBackRoute="/ess/my-payslips" />;
}
