import AuthLoginExperience from "@/components/auth/AuthLoginExperience";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const objSearchParams = (await searchParams) ?? {};
  const objTenantParam = objSearchParams.tenant;
  const strTenantHint = Array.isArray(objTenantParam) ? objTenantParam[0] : objTenantParam;

  return <AuthLoginExperience strMode="generic" strTenantHint={strTenantHint} />;
}
