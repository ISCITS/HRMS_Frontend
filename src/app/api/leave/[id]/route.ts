import { NextResponse } from "next/server";

// API skeleton route for individual leave request
export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return NextResponse.json({ message: `Update leave request ${id} placeholder` }, { status: 501 });
}
