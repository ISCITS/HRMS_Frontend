import { NextResponse } from "next/server";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Logical flow:
// - Echo back updated record for UI optimistic flow.
// Inputs:
// - route param id and JSON payload fields.
// Output:
// - 200 with updated user object.
export async function PUT(request: Request, context: RouteContext) {
  let dicBody: Partial<UserRecord> = {};
  const { id: strId } = await context.params;

  try {
    dicBody = (await request.json()) as Partial<UserRecord>;
  } catch {
    dicBody = {};
  }

  const dicUpdatedUser: UserRecord = {
    id: strId,
    name: String(dicBody.name ?? ""),
    email: String(dicBody.email ?? ""),
    role: String(dicBody.role ?? "")
  };

  return NextResponse.json(dicUpdatedUser, { status: 200 });
}

// Functional responsibility:
// - Return success response for delete requests.
// Inputs:
// - route param id.
// Output:
// - 200 with deleted id payload.
export async function DELETE(_: Request, context: RouteContext) {
  const { id: strId } = await context.params;
  return NextResponse.json({ id: strId, intIsDeleted: 1 }, { status: 200 });
}
