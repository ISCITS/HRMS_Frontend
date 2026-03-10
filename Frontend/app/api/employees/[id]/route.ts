import { NextResponse } from "next/server";

// API skeleton route for single employee
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return NextResponse.json({ message: `Get employee ${id} placeholder` }, { status: 501 });
}

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return NextResponse.json({ message: `Update employee ${id} placeholder` }, { status: 501 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return NextResponse.json({ message: `Delete employee ${id} placeholder` }, { status: 501 });
}
