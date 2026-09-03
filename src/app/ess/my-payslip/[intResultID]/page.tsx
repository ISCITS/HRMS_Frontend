import { redirect } from "next/navigation";

type EssMyPayslipDetailAliasRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
};

export default async function EssMyPayslipDetailAliasRoute({
  params,
}: EssMyPayslipDetailAliasRouteProps) {
  const { intResultID } = await params;
  redirect(`/ess/my-payslips/${intResultID}`);
}
