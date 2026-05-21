import { redirect } from "next/navigation";

type PayslipDetailAliasRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
};

export default async function PayslipDetailAliasRoute({ params }: PayslipDetailAliasRouteProps) {
  const { intResultID } = await params;
  redirect(`/reports/payslips/${intResultID}`);
}

