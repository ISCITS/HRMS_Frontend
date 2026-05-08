import { redirect } from "next/navigation";

type PayslipsDetailAliasRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
};

export default async function PayslipsDetailAliasRoute({ params }: PayslipsDetailAliasRouteProps) {
  const { intResultID } = await params;
  redirect(`/payroll/payslips/${intResultID}`);
}

