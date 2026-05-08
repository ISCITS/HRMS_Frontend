import { redirect } from "next/navigation";

type EssMyPayslipsDetailAliasRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
};

export default async function EssMyPayslipsDetailAliasRoute({
  params,
}: EssMyPayslipsDetailAliasRouteProps) {
  const { intResultID } = await params;
  redirect(`/payroll/payslips/${intResultID}?backRoute=${encodeURIComponent("/ess/my-payslips")}`);
}
