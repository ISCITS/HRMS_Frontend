import { NextResponse } from "next/server";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const lstUserSeed: UserRecord[] = [
  { id: "USR-1001", name: "Ava Johnson", email: "ava.johnson@hrms.dev", role: "HR Admin" },
  { id: "USR-1002", name: "Noah Smith", email: "noah.smith@hrms.dev", role: "Recruiter" }
];

// Logical flow:
// - Return a predictable list payload for User Master list rendering.
// Functional responsibility:
// - Provide API skeleton for fetching user collection.
// Output:
// - 200 with users array.
export async function GET() {
  return NextResponse.json({ users: lstUserSeed }, { status: 200 });
}

// Logical flow:
// - Accept JSON body and echo back a created-style response.
// Inputs:
// - name/email/role from request JSON.
// Failure behavior:
// - Invalid JSON falls back to defaults.
export async function POST(request: Request) {
  let dicBody: Partial<UserRecord> = {};

  try {
    dicBody = (await request.json()) as Partial<UserRecord>;
  } catch {
    dicBody = {};
  }

  const intTimestamp = Date.now();
  const dicCreatedUser: UserRecord = {
    id: String(dicBody.id ?? `USR-${intTimestamp}`),
    name: String(dicBody.name ?? ""),
    email: String(dicBody.email ?? ""),
    role: String(dicBody.role ?? "")
  };

  return NextResponse.json(dicCreatedUser, { status: 201 });
}
