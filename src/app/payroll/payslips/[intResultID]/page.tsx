import { redirect } from "next/navigation";

type PayrollResultDetailRouteProps = {
  params: Promise<{
    intResultID: string;
  }>;
  searchParams?: Promise<{
    backRoute?: string;
  }>;
};

export default async function PayrollResultDetailRoute({
  params,
  searchParams,
}: PayrollResultDetailRouteProps) {
  const { intResultID } = await params;
  const objSearchParams = searchParams ? await searchParams : undefined;
  const strBackRoute = objSearchParams?.backRoute
    ? `?backRoute=${encodeURIComponent(objSearchParams.backRoute)}`
    : "";
  redirect(`/reports/payslips/${intResultID}${strBackRoute}`);
}
