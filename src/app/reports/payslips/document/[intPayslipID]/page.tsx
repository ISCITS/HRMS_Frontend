import PayslipDocumentPage from "@/features/payroll/components/PayslipDocumentPage";

type ReportPayslipDocumentRouteProps = {
  params: Promise<{
    intPayslipID: string;
  }>;
};

export default async function ReportPayslipDocumentRoute({ params }: ReportPayslipDocumentRouteProps) {
  const { intPayslipID } = await params;
  return <PayslipDocumentPage strPayslipID={intPayslipID} strBackRoute="/reports/payslips" />;
}
